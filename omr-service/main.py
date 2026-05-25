"""
Servidor FastAPI para processamento OMR de cartões-resposta.
Versão corrigida: Ordenação manual de bolhas para evitar erros de OpenCV/imutils.
"""

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
import imutils

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Funções de Visão Computacional ---

def _order_corner_points(pts: np.ndarray) -> np.ndarray:
    """
    Order four corner points as: top-left, top-right, bottom-right, bottom-left.
    """
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]   # top-left
    rect[2] = pts[np.argmax(s)]   # bottom-right
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]  # top-right
    rect[3] = pts[np.argmax(diff)]  # bottom-left
    return rect

# Mocking the models for demonstration purposes
class BubbleGrid(BaseModel):
    row: int
    bubbles: List[Dict[str, Any]]

class BubbleResult(BaseModel):
    found: bool
    grids: List[BubbleGrid]

def _find_checkboxes(gray: np.ndarray, min_area: int = 50, max_area: int = 2000) -> List[Tuple[int, int, int, int]]:
    """
    Find rectangular checkbox regions in a grayscale image.
    """
    # Usar um thresholding adaptativo para realçar as bordas das bolhas
    thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)

    # Operações morfológicas para fechar pequenos buracos e conectar contornos
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=2)
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=1)

    # Encontrar contornos
    cnts = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = imutils.grab_contours(cnts)

    checkboxes = []
    for contour in cnts:
        area = cv2.contourArea(contour)
        if not (min_area < area < max_area):
            continue

        x, y, w, h = cv2.boundingRect(contour)
        if w < 10 or h < 10:
            continue

        aspect_ratio = float(w) / h if h > 0 else 0
        if aspect_ratio < 0.7 or aspect_ratio > 1.3:
            continue

        perimeter = cv2.arcLength(contour, True)
        if perimeter < 1:
            continue
        circularity = 4 * np.pi * area / (perimeter * perimeter)
        if circularity < 0.5:
            continue

        hull = cv2.convexHull(contour)
        hull_area = cv2.contourArea(hull)
        if hull_area > 0:
            solidity = area / hull_area
            if solidity < 0.6:
                continue

        checkboxes.append((x, y, w, h))

    logger.info("Total checkboxes found: %d", len(checkboxes))
    return checkboxes

def _calculate_fill_percentage(
    gray: np.ndarray, x: int, y: int, w: int, h: int, threshold: int = 130
) -> float:
    """
    Calculate fill percentage of a checkbox region.
    """
    y1, y2 = max(0, y), min(gray.shape[0], y + h)
    x1, x2 = max(0, x), min(gray.shape[1], x + w)
    roi = gray[y1:y2, x1:x2]
    if roi.size == 0:
        return 0.0
    _, roi_thresh = cv2.threshold(roi, threshold, 255, cv2.THRESH_BINARY_INV)
    dark_pixels = cv2.countNonZero(roi_thresh)
    total_pixels = roi.size
    if total_pixels == 0:
        return 0.0
    return float(dark_pixels) / float(total_pixels)

def _cluster_checkboxes(
    checkboxes: List[Tuple[int, int, int, int]], tolerance: int = 20
) -> List[List[Tuple[int, int, int, int]]]:
    """
    Group checkboxes into grid rows based on y-coordinate proximity.
    Substitui imutils.contours.sort_contours por ordenação manual para evitar erros.
    """
    if not checkboxes:
        return []

    # Ordenar todos os checkboxes por Y (de cima para baixo)
    sorted_by_y = sorted(checkboxes, key=lambda b: b[1])

    rows = []
    if len(sorted_by_y) > 0:
        current_row = [sorted_by_y[0]]
        for i in range(1, len(sorted_by_y)):
            # Se o checkbox atual estiver próximo verticalmente do primeiro da linha atual
            if abs(sorted_by_y[i][1] - current_row[0][1]) <= tolerance:
                current_row.append(sorted_by_y[i])
            else:
                # Finaliza a linha atual ordenando por X (da esquerda para a direita)
                rows.append(sorted(current_row, key=lambda b: b[0]))
                current_row = [sorted_by_y[i]]
        
        # Adiciona a última linha
        if len(current_row) > 0:
            rows.append(sorted(current_row, key=lambda b: b[0]))

    # Filtrar linhas: manter apenas linhas com um número razoável de alternativas (ex: 3 a 5)
    filtered_rows = [row for row in rows if len(row) >= 3 and len(row) <= 6]

    logger.info(f"Clustered into {len(rows)} rows, kept {len(filtered_rows)} valid rows.")
    return filtered_rows

def detect_bubbles(
    image: np.ndarray,
    fill_threshold: int = 120, # Ajustado para ser mais sensível a marcações
    marked_percentage: float = 0.35, # Ajustado para 35% de preenchimento
) -> BubbleResult:
    """
    Detect and classify checkboxes as marked or unmarked, with ROI filtering.
    """
    if image is None or image.size == 0:
        logger.error("Image is empty or None")
        return BubbleResult(found=False, grids=[])

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape

    # --- ESTRATÉGIA DE FILTRAGEM DE ROI ---
    # Ajuste estes percentuais para focar na área das respostas do seu cartão.
    roi_x_start_percent = 0.10
    roi_y_start_percent = 0.20 # Pula o cabeçalho
    roi_x_end_percent = 0.90
    roi_y_end_percent = 0.95

    y_start_roi = int(height * roi_y_start_percent)
    y_end_roi = int(height * roi_y_end_percent)
    x_start_roi = int(width * roi_x_start_percent)
    x_end_roi = int(width * roi_x_end_percent)

    roi_gray = gray[y_start_roi:y_end_roi, x_start_roi:x_end_roi]
    
    if roi_gray.size == 0:
        logger.error("ROI is empty.")
        return BubbleResult(found=False, grids=[])

    # Detectar checkboxes na ROI
    checkboxes_in_roi = _find_checkboxes(roi_gray, min_area=100, max_area=1500)
    
    if not checkboxes_in_roi:
        logger.warning("No checkboxes detected in ROI")
        return BubbleResult(found=False, grids=[])

    # Ajustar coordenadas de volta para a imagem original
    checkboxes = []
    for x, y, w, h in checkboxes_in_roi:
        checkboxes.append((x + x_start_roi, y + y_start_roi, w, h))

    # Agrupar em linhas
    rows = _cluster_checkboxes(checkboxes)

    grids = []
    for row_idx, row in enumerate(rows):
        grid_row = []
        for col_idx, (x, y, w, h) in enumerate(row):
            fill_pct = _calculate_fill_percentage(gray, x, y, w, h, threshold=fill_threshold)
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
    """Draw detected checkboxes on a copy of the image (for debugging)."""
    annotated = image.copy()
    colors = {
        "marked": (0, 255, 0),      # Green
        "unmarked": (0, 165, 255),  # Orange
    }

    for grid in result.grids:
        for bubble in grid.bubbles:
            cx, cy, radius = bubble["x"], bubble["y"], bubble["radius"]
            color = colors["marked"] if bubble["marked"] else colors["unmarked"]
            x1, y1 = max(0, cx - radius), max(0, cy - radius)
            x2, y2 = min(annotated.shape[1], cx + radius), min(annotated.shape[0], cy + radius)
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
            fill_pct = bubble["fill_percentage"]
            cv2.putText(annotated, f"{fill_pct:.0%}", (cx - 15, cy + 5), cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)

    return annotated

# --- FastAPI Application ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/omr/scan")
async def scan_omr_sheet(photo: UploadFile = File(...), debug: bool = False):
    try:
        contents = await photo.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(status_code=400, detail="Não foi possível decodificar a imagem.")

        # Redimensionar para tamanho padrão de processamento
        target_width = 700
        target_height = int(image.shape[0] * (target_width / image.shape[1]))
        processed_image = cv2.resize(image, (target_width, target_height), interpolation=cv2.INTER_AREA)
        
        # Detecção de Bolhas
        bubble_result = detect_bubbles(processed_image)

        # Desenhar bolhas para debug
        annotated_image = draw_bubbles(processed_image, bubble_result)
        _, annotated_image_encoded = cv2.imencode(".png", annotated_image)
        annotated_image_base64 = base64.b64encode(annotated_image_encoded).decode("utf-8")

        response_data = {
            "status": "success",
            "bubbles": bubble_result.dict(),
            "corrected_image": annotated_image_base64,
            "debug_image": annotated_image_base64,
        }

        return JSONResponse(content=response_data)

    except Exception as e:
        logger.error(f"Erro no processamento: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno: {e}")

@app.get("/health")
async def health_check():
    return {"status": "ok"}