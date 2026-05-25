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

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Modelos Pydantic (v2) ---
class BubbleGrid(BaseModel):
    row: int
    bubbles: List[Dict[str, Any]]

class BubbleResult(BaseModel):
    found: bool
    grids: List[BubbleGrid]

# --- Detecção de Marcas Fiduciais e Correção de Perspectiva ---

def find_fiducial_markers(image: np.ndarray) -> Optional[np.ndarray]:
    """
    Procura as 4 marcas fiduciais focando especificamente nos 4 quadrantes 
    extremos da imagem para evitar que ruídos externos quebrem a detecção.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape
    
    # Binarização adaptativa agressiva para extrair formas pretas sólidas
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 15, 5
    )
    
    # Define áreas de busca estimadas para cada canto (22% do tamanho da imagem)
    offset_h = int(height * 0.22)
    offset_w = int(width * 0.22)
    
    # Coordenadas [xmin, ymin, xmax, ymax] para recortar cada canto
    corners_rois = {
        "TL": (0, 0, offset_w, offset_h),                        # Top-Left
        "TR": (width - offset_w, 0, width, offset_h),             # Top-Right
        "BR": (width - offset_w, height - offset_h, width, height), # Bottom-Right
        "BL": (0, height - offset_h, offset_w, height)            # Bottom-Left
    }
    
    final_markers = {}
    
    for corner, (x1, y1, x2, y2) in corners_rois.items():
        roi_thresh = thresh[y1:y2, x1:x2]
        contours, _ = cv2.findContours(roi_thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        best_candidate = None
        max_score = -1
        
        for contour in contours:
            area = cv2.contourArea(contour)
            # Ignora ruídos irrelevantes ou poeira muito pequena
            if area < 50 or area > (offset_h * offset_w * 0.25):
                continue
                
            perimeter = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, 0.05 * perimeter, True)
            
            # Aceita polígonos de 4 a 6 vértices para tolerar pequenas imperfeições/rabiscos
            if 4 <= len(approx) <= 6:
                x, y, w, h = cv2.boundingRect(approx)
                aspect_ratio = float(w) / h if h > 0 else 0
                
                # Proporção geométrica próxima a um quadrado ideal
                if 0.7 <= aspect_ratio <= 1.3:
                    score = area / (w * h)
                    if score > max_score:
                        max_score = score
                        M = cv2.moments(contour)
                        if M["m00"] != 0:
                            # Converte a coordenada local da ROI para o espaço global da imagem
                            cX = int(M["m10"] / M["m00"]) + x1
                            cY = int(M["m01"] / M["m00"]) + y1
                            best_candidate = [cX, cY]
                            
        if best_candidate:
            final_markers[corner] = best_candidate

    # Sucesso absoluto: encontrou exatamente os 4 cantos de forma independente
    if len(final_markers) == 4:
        ordered_pts = np.array([
            final_markers["TL"],
            final_markers["TR"],
            final_markers["BR"],
            final_markers["BL"]
        ], dtype="float32")
        return ordered_pts

    logger.warning(f"Marcadores detectados de forma independente: {list(final_markers.keys())}. Falha na perspectiva.")
    return None

def correct_perspective(image: np.ndarray, corners: np.ndarray, target_width: int = 700, target_height: int = 1000) -> Optional[np.ndarray]:
    """Aplica a transformação de perspectiva real na imagem baseando-se nos cantos localizados."""
    dst_pts = np.array(
        [[0, 0], [target_width, 0], [target_width, target_height], [0, target_height]],
        dtype="float32",
    )
    matrix = cv2.getPerspectiveTransform(corners, dst_pts)
    if matrix is None:
        return None
    try:
        return cv2.warpPerspective(
            image, matrix, (target_width, target_height),
            flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(255, 255, 255)
        )
    except Exception as e:
        logger.error(f"Erro no warpPerspective: {e}")
        return None

# --- Processamento das Bolhas de Resposta ---

def _find_checkboxes(gray: np.ndarray, min_area: int = 120, max_area: int = 1500) -> List[Tuple[int, int, int, int]]:
    """Encontra os círculos impressos usando detecção de bordas estável (Canny)."""
    blurred = cv2.GaussianBlur(gray, (3, 3), 0)
    edges = cv2.Canny(blurred, 40, 120)
    
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    dilated = cv2.dilate(edges, kernel, iterations=1)
    
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    checkboxes = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if not (min_area < area < max_area):
            continue
            
        x, y, w, h = cv2.boundingRect(contour)
        aspect_ratio = float(w) / h if h > 0 else 0
        if aspect_ratio < 0.72 or aspect_ratio > 1.28:
            continue
            
        if w < 14 or h < 14:
            continue
            
        checkboxes.append((x, y, w, h))
        
    return checkboxes

def _calculate_fill_percentage(gray: np.ndarray, x: int, y: int, w: int, h: int, threshold: int = 140) -> float:
    """Calcula a densidade de pixels escuros dentro de uma região delimitada."""
    y1, y2 = max(0, y), min(gray.shape[0], y + h)
    x1, x2 = max(0, x), min(gray.shape[1], x + w)
    roi = gray[y1:y2, x1:x2]
    if roi.size == 0:
        return 0.0
    _, roi_thresh = cv2.threshold(roi, threshold, 255, cv2.THRESH_BINARY_INV)
    return float(cv2.countNonZero(roi_thresh)) / float(roi.size)

def _cluster_checkboxes(checkboxes: List[Tuple[int, int, int, int]], tolerance: int = 18) -> List[List[Tuple[int, int, int, int]]]:
    """Agrupa bolhas próximas no eixo Y formando as linhas horizontais."""
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

def detect_bubbles(image: np.ndarray, fill_threshold: int = 145, marked_percentage: float = 0.32) -> BubbleResult:
    if image is None or image.size == 0:
        return BubbleResult(found=False, grids=[])

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape

    # Pós-perspectiva (700x1000), a área de respostas fica RIGIDAMENTE neste quadrante:
    roi_x_start_percent = 0.05
    roi_y_start_percent = 0.15  # Dá uma margem de folga acima da linha 1
    roi_x_end_percent = 0.45    # Corta antes de atingir o QR Code do lado direito
    roi_y_end_percent = 0.85    

    y_start_roi = int(height * roi_y_start_percent)
    y_end_roi = int(height * roi_y_end_percent)
    x_start_roi = int(width * roi_x_start_percent)
    x_end_roi = int(width * roi_x_end_percent)

    roi_gray = gray[y_start_roi:y_end_roi, x_start_roi:x_end_roi]
    
    checkboxes_in_roi = _find_checkboxes(roi_gray)
    if not checkboxes_in_roi:
        return BubbleResult(found=False, grids=[])

    checkboxes = [(x + x_start_roi, y + y_start_roi, w, h) for x, y, w, h in checkboxes_in_roi]
    rows = _cluster_checkboxes(checkboxes, tolerance=20)

    grids = []
    for row_idx, row in enumerate(rows):
        grid_row = []
        for col_idx, (x, y, w, h) in enumerate(row):
            # Analisa um miolo interno reduzido (55%) para desconsiderar o traço circular impresso original
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
    """Aplica marcações gráficas para visualização em debug."""
    annotated = image.copy()
    colors = {"marked": (0, 255, 0), "unmarked": (0, 165, 255)}
    for grid in result.grids:
        for bubble in grid.bubbles:
            cx, cy, radius = bubble["x"], bubble["y"], bubble["radius"]
            color = colors["marked"] if bubble["marked"] else colors["unmarked"]
            cv2.rectangle(annotated, (cx - radius, cy - radius), (cx + radius, cy + radius), color, 2)
            cv2.putText(annotated, f"{bubble['fill_percentage']:.0%}", (cx - 15, cy + 5), cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)
    return annotated

# --- Aplicação FastAPI ---
app = FastAPI()

# Configuração de CORS ativa para integração com o React Frontend
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
            raise HTTPException(status_code=400, detail="Não foi possível decodificar o payload da imagem.")

        target_width = 700
        target_height = 1000 
        
        # 1. Tenta extrair a perspectiva dinamicamente usando as marcas pretas dos cantos
        corners = find_fiducial_markers(image)
        
        if corners is not None:
            logger.info("4 marcas fiduciais encontradas com sucesso. Executando correção geométrica de perspectiva.")
            corrected_image = correct_perspective(image, corners, target_width, target_height)
            perspective_applied = True
        else:
            logger.warning("Marcas indisponíveis na captura. Aplicando fallback de redimensionamento rígido.")
            corrected_image = cv2.resize(image, (target_width, target_height), interpolation=cv2.INTER_AREA)
            perspective_applied = False

        # 2. Executa a leitura das bolhas de resposta na imagem planificada
        bubble_result = detect_bubbles(corrected_image)

        # 3. Transforma as imagens em Base64 para exibição de validação em tela
        _, corrected_image_encoded = cv2.imencode('.png', corrected_image)
        corrected_image_base64 = base64.b64encode(corrected_image_encoded).decode('utf-8')

        annotated_image = draw_bubbles(corrected_image, bubble_result)
        _, annotated_image_encoded = cv2.imencode('.png', annotated_image)
        annotated_image_base64 = base64.b64encode(annotated_image_encoded).decode('utf-8')

        return JSONResponse(content={
            "status": "success",
            "perspective_corrected": perspective_applied,
            "bubbles": bubble_result.model_dump(),
            "corrected_image": corrected_image_base64,
            "debug_image": annotated_image_base64,
        })

    except Exception as e:
        logger.error(f"Falha crítica no processamento OMR: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno do servidor: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "ok"}