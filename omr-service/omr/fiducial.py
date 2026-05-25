import base64
import io
import logging
from typing import List, Optional, Tuple, Dict, Any

import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BubbleGrid(BaseModel):
    row: int
    bubbles: List[Dict[str, Any]]

class BubbleResult(BaseModel):
    found: bool
    grids: List[BubbleGrid]

# --- Detecção Robusta de Marcas Fiduciais ---

def find_fiducial_markers(image: np.ndarray) -> Optional[np.ndarray]:
    """
    Procura as marcas fiduciais com tolerância a marcadores encostados nas bordas da foto.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape
    
    # Binarização adaptativa com bloco maior para lidar com sombras de dobra de papel
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 25, 5
    )
    
    # Expandido para 25% para garantir a captura mesmo que a folha esteja muito próxima
    offset_h = int(height * 0.25)
    offset_w = int(width * 0.25)
    
    corners_rois = {
        "TL": (0, 0, offset_w, offset_h),
        "TR": (width - offset_w, 0, width, offset_h),
        "BR": (width - offset_w, height - offset_h, width, height),
        "BL": (0, height - offset_h, offset_w, height)
    }
    
    final_markers = {}
    
    for corner, (x1, y1, x2, y2) in corners_rois.items():
        roi_thresh = thresh[y1:y2, x1:x2]
        
        # Adiciona uma borda artificial branca de 2px ao redor da ROI para fechar contornos cortados na câmera
        roi_padded = cv2.copyMakeBorder(roi_thresh, 2, 2, 2, 2, cv2.BORDER_CONSTANT, value=0)
        
        contours, _ = cv2.findContours(roi_padded, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        best_candidate = None
        max_score = -1
        
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < 40 or area > (offset_h * offset_w * 0.30):
                continue
                
            perimeter = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, 0.06 * perimeter, True)
            
            # Aceita de 4 a 7 vértices (permite deformação nas quinas causada por perspectiva ou corte)
            if 4 <= len(approx) <= 7:
                x, y, w, h = cv2.boundingRect(approx)
                aspect_ratio = float(w) / h if h > 0 else 0
                
                if 0.6 <= aspect_ratio <= 1.4:
                    score = area / (w * h)
                    if score > max_score:
                        max_score = score
                        M = cv2.moments(contour)
                        if M["m00"] != 0:
                            # Subtrai os 2px do padding na hora de converter para coordenadas globais
                            cX = int(M["m10"] / M["m00"]) - 2 + x1
                            cY = int(M["m01"] / M["m00"]) - 2 + y1
                            best_candidate = [cX, cY]
                            
        if best_candidate:
            final_markers[corner] = best_candidate

    if len(final_markers) == 4:
        return np.array([
            final_markers["TL"], final_markers["TR"],
            final_markers["BR"], final_markers["BL"]
        ], dtype="float32")

    logger.warning(f"Falha na detecção completa. Encontrados apenas: {list(final_markers.keys())}")
    return None

def correct_perspective(image: np.ndarray, corners: np.ndarray, target_width: int = 700, target_height: int = 1000) -> Optional[np.ndarray]:
    dst_pts = np.array([[0, 0], [target_width, 0], [target_width, target_height], [0, target_height]], dtype="float32")
    matrix = cv2.getPerspectiveTransform(corners, dst_pts)
    if matrix is None:
        return None
    return cv2.warpPerspective(image, matrix, (target_width, target_height), flags=cv2.INTER_LINEAR)

# --- Processamento das Bolhas de Resposta ---

def _find_checkboxes(gray: np.ndarray, min_area: int = 80, max_area: int = 2000, is_fallback: bool = False) -> List[Tuple[int, int, int, int]]:
    """Encontra as bolhas flexibilizando o aspecto se a imagem veio esticada via plano B."""
    blurred = cv2.GaussianBlur(gray, (3, 3), 0)
    edges = cv2.Canny(blurred, 35, 110)
    
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    dilated = cv2.dilate(edges, kernel, iterations=1)
    
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Se for fallback (sem perspectiva), abre a margem para aceitar ovais/elipses distorcidas pelo resize plano
    min_ratio = 0.55 if is_fallback else 0.70
    max_ratio = 1.45 if is_fallback else 1.30

    checkboxes = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if not (min_area < area < max_area):
            continue
            
        x, y, w, h = cv2.boundingRect(contour)
        aspect_ratio = float(w) / h if h > 0 else 0
        if aspect_ratio < min_ratio or aspect_ratio > max_ratio:
            continue
            
        if w < 12 or h < 12:
            continue
            
        checkboxes.append((x, y, w, h))
        
    return checkboxes

def _calculate_fill_percentage(gray: np.ndarray, x: int, y: int, w: int, h: int, threshold: int = 145) -> float:
    y1, y2 = max(0, y), min(gray.shape[0], y + h)
    x1, x2 = max(0, x), min(gray.shape[1], x + w)
    roi = gray[y1:y2, x1:x2]
    if roi.size == 0:
        return 0.0
    _, roi_thresh = cv2.threshold(roi, threshold, 255, cv2.THRESH_BINARY_INV)
    return float(cv2.countNonZero(roi_thresh)) / float(roi.size)

def _cluster_checkboxes(checkboxes: List[Tuple[int, int, int, int]], tolerance: int = 22) -> List[List[Tuple[int, int, int, int]]]:
    if not checkboxes:
        return []
    
    sorted_checkboxes = sorted(checkboxes, key=lambda b: b[1])
    rows = []
    current_row = [sorted_checkboxes[0]]
    
    for checkbox in sorted_checkboxes[1:]:
        if abs(checkbox[1] - current_row[-1][1]) <= tolerance:
            current_row.append(checkbox)
        else:
            rows.append(sorted(current_row, key=lambda b: b[0]))
            current_row = [checkbox]
    if current_row:
        rows.append(sorted(current_row, key=lambda b: b[0]))
        
    return [row for row in rows if len(row) >= 3]

def detect_bubbles(image: np.ndarray, is_fallback: bool = False, fill_threshold: int = 145, marked_percentage: float = 0.30) -> BubbleResult:
    if image is None or image.size == 0:
        return BubbleResult(found=False, grids=[])

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape

    # Região expandida para englobar as alternativas com folga extrema de segurança
    roi_x_start_percent = 0.04
    roi_y_start_percent = 0.12  
    roi_x_end_percent = 0.48    
    roi_y_end_percent = 0.88    

    y_start_roi = int(height * roi_y_start_percent)
    y_end_roi = int(height * roi_y_end_percent)
    x_start_roi = int(width * roi_x_start_percent)
    x_end_roi = int(width * roi_x_end_percent)

    roi_gray = gray[y_start_roi:y_end_roi, x_start_roi:x_end_roi]
    
    checkboxes_in_roi = _find_checkboxes(roi_gray, is_fallback=is_fallback)
    if not checkboxes_in_roi:
        return BubbleResult(found=False, grids=[])

    checkboxes = [(x + x_start_roi, y + y_start_roi, w, h) for x, y, w, h in checkboxes_in_roi]
    rows = _cluster_checkboxes(checkboxes, tolerance=24)

    grids = []
    for row_idx, row in enumerate(rows):
        grid_row = []
        for col_idx, (x, y, w, h) in enumerate(row):
            miolo_w, miolo_h = int(w * 0.55), int(h * 0.55)
            miolo_x, miolo_y = x + (w - miolo_w) // 2, y + (h - miolo_h) // 2
            
            fill_pct = _calculate_fill_percentage(gray, miolo_x, miolo_y, miolo_w, miolo_h, fill_threshold)
            is_marked = fill_pct >= marked_percentage

            grid_row.append({
                "col": col_idx,
                "x": x + w // 2,
                "y": y + h // 2,
                "radius": max(w, h) // 2,
                "fill_percentage": fill_pct,
                "marked": is_marked,
            })
        grids.append(BubbleGrid(row=row_idx, bubbles=grid_row))

    return BubbleResult(found=True, grids=grids)

def draw_bubbles(image: np.ndarray, result: BubbleResult) -> np.ndarray:
    annotated = image.copy()
    colors = {"marked": (0, 255, 0), "unmarked": (0, 165, 255)}
    for grid in result.grids:
        for bubble in grid.bubbles:
            cx, cy, radius = bubble["x"], bubble["y"], bubble["radius"]
            color = colors["marked"] if bubble["marked"] else colors["unmarked"]
            cv2.rectangle(annotated, (cx - radius, cy - radius), (cx + radius, cy + radius), color, 2)
            cv2.putText(annotated, f"{bubble['fill_percentage']:.0%}", (cx - 15, cy + 5), cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)
    return annotated

# --- Endpoint FastAPI ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/omr/scan")
async def scan_omr_sheet(photo: UploadFile = File(...)):
    try:
        contents = await photo.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(status_code=400, detail="Imagem inválida.")

        target_width = 700
        target_height = 1000 
        
        corners = find_fiducial_markers(image)
        
        if corners is not None:
            logger.info("Perspectiva corrigida por marcadores.")
            corrected_image = correct_perspective(image, corners, target_width, target_height)
            is_fallback = False
        else:
            logger.warning("Marcadores falharam. Ativando redimensionamento adaptativo.")
            corrected_image = cv2.resize(image, (target_width, target_height), interpolation=cv2.INTER_AREA)
            is_fallback = True

        # Executa a detecção passando a flag que adapta os filtros ao estado da imagem
        bubble_result = detect_bubbles(corrected_image, is_fallback=is_fallback)

        _, corrected_encoded = cv2.imencode('.png', corrected_image)
        corrected_base64 = base64.b64encode(corrected_encoded).decode('utf-8')

        annotated_image = draw_bubbles(corrected_image, bubble_result)
        _, annotated_encoded = cv2.imencode('.png', annotated_image)
        annotated_base64 = base64.b64encode(annotated_encoded).decode('utf-8')

        return JSONResponse(content={
            "status": "success",
            "perspective_corrected": corners is not None,
            "bubbles": bubble_result.model_dump(),
            "corrected_image": corrected_base64,
            "debug_image": annotated_base64,
        })

    except Exception as e:
        logger.error(f"Erro: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))