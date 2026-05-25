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

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BubbleGrid(BaseModel):
    row: int
    bubbles: List[Dict[str, Any]]

class BubbleResult(BaseModel):
    found: bool
    grids: List[BubbleGrid]

def detect_markers(image: np.ndarray) -> Optional[List[List[float]]]:
    """
    Detecta os 4 marcadores pretos (quadrados) nos cantos do cartão.
    """
    if image is None:
        return None
    
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Aplicar threshold para isolar os marcadores pretos
    _, binary = cv2.threshold(gray, 50, 255, cv2.THRESH_BINARY_INV)
    
    # Encontrar contornos
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    markers = []
    for contour in contours:
        area = cv2.contourArea(contour)
        # Marcadores devem ter área entre 500 e 5000 pixels (ajuste conforme necessário)
        if 500 < area < 5000:
            # Calcular bounding box
            x, y, w, h = cv2.boundingRect(contour)
            
            # Verificar se é aproximadamente quadrado
            aspect_ratio = w / h if h > 0 else 0
            if 0.8 < aspect_ratio < 1.2:
                # Calcular centro
                center_x = x + w // 2
                center_y = y + h // 2
                markers.append((center_x, center_y, area))
    
    # Ordenar marcadores por posição
    if len(markers) >= 4:
        # Encontrar os 4 cantos
        markers.sort(key=lambda p: p[0] + p[1])  # top-left tem menor soma
        tl = markers[0]
        markers.sort(key=lambda p: p[0] - p[1])  # top-right tem maior diferença
        tr = markers[-1]
        markers.sort(key=lambda p: p[1] - p[0])  # bottom-left tem maior diferença negativa
        bl = markers[-1]
        markers.sort(key=lambda p: p[0] + p[1])  # bottom-right tem maior soma
        br = markers[-1]
        
        return [[tl[0], tl[1]], [tr[0], tr[1]], [br[0], br[1]], [bl[0], bl[1]]]
    
    return None

def _order_corner_points(pts: np.ndarray) -> np.ndarray:
    """Ordena os 4 pontos dos cantos."""
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]   # top-left
    rect[2] = pts[np.argmax(s)]   # bottom-right
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]  # top-right
    rect[3] = pts[np.argmax(diff)]  # bottom-left
    return rect

def correct_perspective(
    image: np.ndarray,
    corners: List[List[float]],
    target_width: int = 1200,
    target_height: int = 1600,
) -> Optional[np.ndarray]:
    """Aplica correção de perspectiva usando os 4 marcadores."""
    if not corners or len(corners) != 4:
        logger.warning("Cannot correct perspective: need exactly 4 corners")
        return None

    pts = np.array(corners, dtype="float32")
    src_pts = _order_corner_points(pts)

    dst_pts = np.array(
        [
            [0, 0],
            [target_width, 0],
            [target_width, target_height],
            [0, target_height],
        ],
        dtype="float32",
    )

    matrix = cv2.getPerspectiveTransform(src_pts, dst_pts)
    if matrix is None:
        logger.warning("Could not compute perspective transform matrix")
        return None

    try:
        warped = cv2.warpPerspective(
            image,
            matrix,
            (target_width, target_height),
            flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=(255, 255, 255),
        )
        logger.info(f"Perspective correction applied: {target_width}x{target_height}")
        return warped
    except Exception as e:
        logger.error(f"Perspective warp failed: {str(e)}")
        return None

def enhance_image(gray: np.ndarray) -> np.ndarray:
    """Melhora a imagem para melhor detecção de bolhas."""
    # Aplicar CLAHE para melhorar contraste
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    
    # Suavizar para reduzir ruído
    blurred = cv2.GaussianBlur(enhanced, (3, 3), 0)
    
    return blurred

def find_bubbles_adaptive(gray: np.ndarray, min_area: int = 80, max_area: int = 800) -> List[Tuple[int, int, int, int]]:
    """
    Encontra bolhas usando threshold adaptativo e melhor detecção de formas.
    """
    # Melhorar imagem
    enhanced = enhance_image(gray)
    
    # Usar threshold adaptativo para diferentes condições de iluminação
    binary = cv2.adaptiveThreshold(enhanced, 255, 
                                   cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                   cv2.THRESH_BINARY_INV, 11, 2)
    
    # Operações morfológicas para conectar partes da bolha
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    closed = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)
    
    # Encontrar contornos
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    bubbles = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < min_area or area > max_area:
            continue
        
        # Obter bounding box
        x, y, w, h = cv2.boundingRect(contour)
        
        # Verificar proporção
        aspect_ratio = w / h if h > 0 else 0
        if aspect_ratio < 0.7 or aspect_ratio > 1.3:
            continue
        
        # Calcular solidez
        hull = cv2.convexHull(contour)
        hull_area = cv2.contourArea(hull)
        if hull_area > 0:
            solidity = area / hull_area
            if solidity < 0.5:
                continue
        
        # Expandir ligeiramente
        padding = 2
        x = max(0, x - padding)
        y = max(0, y - padding)
        w = min(gray.shape[1] - x, w + 2 * padding)
        h = min(gray.shape[0] - y, h + 2 * padding)
        
        bubbles.append((x, y, w, h))
    
    return bubbles

def calculate_fill_percentage_adaptive(
    gray: np.ndarray, 
    x: int, 
    y: int, 
    w: int, 
    h: int
) -> float:
    """
    Calcula porcentagem de preenchimento com threshold adaptativo.
    """
    # Extrair ROI
    y1, y2 = max(0, y), min(gray.shape[0], y + h)
    x1, x2 = max(0, x), min(gray.shape[1], x + w)
    roi = gray[y1:y2, x1:x2]
    
    if roi.size == 0:
        return 0.0
    
    # Calcular threshold baseado na média da região
    mean_intensity = np.mean(roi)
    
    # Threshold adaptativo
    if mean_intensity < 80:
        threshold = 100
    elif mean_intensity < 120:
        threshold = 130
    else:
        threshold = 150
    
    # Aplicar threshold
    _, roi_thresh = cv2.threshold(roi, threshold, 255, cv2.THRESH_BINARY_INV)
    
    # Calcular porcentagem
    dark_pixels = cv2.countNonZero(roi_thresh)
    total_pixels = roi.size
    
    if total_pixels == 0:
        return 0.0
    
    return dark_pixels / total_pixels

def cluster_checkboxes_by_rows(
    checkboxes: List[Tuple[int, int, int, int]],
    tolerance: int = 30
) -> List[List[Tuple[int, int, int, int]]]:
    """
    Agrupa checkboxes em linhas baseado na proximidade vertical.
    Versão sem dependência do sklearn.
    """
    if not checkboxes:
        return []
    
    # Calcular centro Y para cada checkbox
    boxes_with_center = []
    for x, y, w, h in checkboxes:
        center_y = y + h // 2
        boxes_with_center.append((x, y, w, h, center_y))
    
    # Ordenar por centro Y
    boxes_with_center.sort(key=lambda b: b[4])
    
    # Agrupar em linhas
    rows = []
    current_row = [boxes_with_center[0]]
    
    for box in boxes_with_center[1:]:
        # Verificar se está na mesma linha (diferença Y dentro da tolerância)
        if abs(box[4] - current_row[0][4]) <= tolerance:
            current_row.append(box)
        else:
            # Finalizar linha atual
            if len(current_row) >= 3:  # Mínimo de 3 bolhas
                # Remover o centro Y antes de adicionar
                row_without_center = [(x, y, w, h) for (x, y, w, h, _) in current_row]
                # Ordenar por X
                row_without_center.sort(key=lambda b: b[0])
                rows.append(row_without_center)
            current_row = [box]
    
    # Adicionar última linha
    if len(current_row) >= 3:
        row_without_center = [(x, y, w, h) for (x, y, w, h, _) in current_row]
        row_without_center.sort(key=lambda b: b[0])
        rows.append(row_without_center)
    
    return rows

def detect_bubbles(
    image: np.ndarray,
    marked_percentage: float = 0.20,
) -> BubbleResult:
    """
    Detecta e classifica bolhas marcadas/não marcadas.
    """
    if image is None or image.size == 0:
        logger.error("Image is empty or None")
        return BubbleResult(found=False, grids=[])
    
    # Converter para grayscale
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    
    height, width = gray.shape
    
    # Definir ROI - pular cabeçalho e rodapé
    roi_y_start = int(height * 0.20)  # Pular topo
    roi_y_end = int(height * 0.90)    # Pular rodapé
    roi_x_start = int(width * 0.10)   # Margem esquerda
    roi_x_end = int(width * 0.90)     # Margem direita
    
    # Garantir que ROI é válida
    roi_y_start = max(0, roi_y_start)
    roi_y_end = min(height, roi_y_end)
    roi_x_start = max(0, roi_x_start)
    roi_x_end = min(width, roi_x_end)
    
    if roi_x_end <= roi_x_start or roi_y_end <= roi_y_start:
        logger.error("Invalid ROI dimensions")
        return BubbleResult(found=False, grids=[])
    
    # Extrair ROI
    roi_gray = gray[roi_y_start:roi_y_end, roi_x_start:roi_x_end]
    
    # Detectar bolhas na ROI
    checkboxes_in_roi = find_bubbles_adaptive(roi_gray)
    
    if not checkboxes_in_roi:
        logger.warning(f"No bubbles detected in ROI (found {len(checkboxes_in_roi)})")
        return BubbleResult(found=False, grids=[])
    
    # Converter coordenadas de volta para imagem original
    checkboxes = []
    for x, y, w, h in checkboxes_in_roi:
        checkboxes.append((x + roi_x_start, y + roi_y_start, w, h))
    
    # Agrupar em linhas
    rows = cluster_checkboxes_by_rows(checkboxes, tolerance=40)
    
    if not rows:
        logger.warning("No rows detected after clustering")
        return BubbleResult(found=False, grids=[])
    
    # Processar cada linha e coluna
    grids = []
    for row_idx, row in enumerate(rows):
        grid_row = []
        for col_idx, (x, y, w, h) in enumerate(row):
            # Calcular porcentagem de preenchimento
            fill_pct = calculate_fill_percentage_adaptive(gray, x, y, w, h)
            
            # Determinar se está marcada
            is_marked = fill_pct >= marked_percentage
            
            logger.debug(f"Row {row_idx}, Col {col_idx}: fill={fill_pct:.2%}, marked={is_marked}")
            
            grid_row.append({
                "col": col_idx,
                "x": x + w // 2,
                "y": y + h // 2,
                "radius": max(w, h) // 2,
                "fill_percentage": fill_pct,
                "marked": is_marked,
            })
        grids.append(BubbleGrid(row=row_idx, bubbles=grid_row))
    
    logger.info(f"Detection complete: {len(grids)} rows, total bubbles: {sum(len(g.bubbles) for g in grids)}")
    
    return BubbleResult(found=len(grids) > 0, grids=grids)

def draw_bubbles(image: np.ndarray, result: BubbleResult) -> np.ndarray:
    """Desenha bolhas detectadas para debug."""
    annotated = image.copy()
    colors = {
        "marked": (0, 255, 0),      # Verde
        "unmarked": (0, 0, 255),    # Vermelho
    }
    
    for grid in result.grids:
        for bubble in grid.bubbles:
            cx = bubble["x"]
            cy = bubble["y"]
            radius = bubble["radius"]
            color = colors["marked"] if bubble["marked"] else colors["unmarked"]
            
            # Desenhar círculo
            cv2.circle(annotated, (cx, cy), radius, color, 2)
            
            # Adicionar texto com porcentagem
            fill_pct = bubble["fill_percentage"]
            text = f"{fill_pct:.0%}"
            cv2.putText(annotated, text, (cx - 15, cy - 5), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)
    
    # Adicionar legenda
    cv2.putText(annotated, "Green: Marked | Red: Unmarked", 
               (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
    
    return annotated

@app.post("/api/omr/scan")
async def scan_omr_sheet(photo: UploadFile = File(...), debug: bool = False):
    try:
        # 1. Ler imagem
        contents = await photo.read()
        nparr = np.frombuffer(contents, np.uint8)
        original_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if original_image is None:
            raise HTTPException(status_code=400, detail="Could not decode image")
        
        logger.info(f"Original image shape: {original_image.shape}")
        
        # 2. Detectar marcadores
        corners = detect_markers(original_image)
        
        if corners:
            logger.info(f"Markers detected: {corners}")
            # 3. Aplicar correção de perspectiva
            corrected_image = correct_perspective(original_image, corners, 1200, 1600)
            if corrected_image is None:
                corrected_image = original_image
        else:
            logger.warning("Markers not detected, using original image")
            corrected_image = original_image
            # Redimensionar para tamanho padrão
            corrected_image = cv2.resize(corrected_image, (1200, 1600))
        
        # 4. Detectar bolhas
        bubble_result = detect_bubbles(corrected_image)
        
        # 5. Preparar resposta
        response_data = {
            "status": "success",
            "bubbles": bubble_result.dict(),
        }
        
        if debug:
            # Adicionar imagem corrigida
            _, corrected_encoded = cv2.imencode('.png', corrected_image)
            response_data["corrected_image"] = base64.b64encode(corrected_encoded).decode('utf-8')
            
            # Adicionar imagem com anotações
            annotated_image = draw_bubbles(corrected_image, bubble_result)
            _, annotated_encoded = cv2.imencode('.png', annotated_image)
            response_data["debug_image"] = base64.b64encode(annotated_encoded).decode('utf-8')
        
        return JSONResponse(content=response_data)
        
    except HTTPException as e:
        logger.error(f"HTTP Exception: {e.detail}")
        return JSONResponse(status_code=e.status_code, content={"status": "error", "message": e.detail})
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")