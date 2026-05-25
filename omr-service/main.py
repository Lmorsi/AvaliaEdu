"""
Servidor FastAPI para processamento OMR de cartões-resposta.
Versão final: Parâmetros calibrados via diagnóstico para fotos de baixa resolução.
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

def correct_perspective(
    image: np.ndarray,
    corners: List[List[float]],
    target_width: int = 800,
    target_height: int = 1131, # Proporção A4
) -> Optional[np.ndarray]:
    """
    Warp the image so the four corner points become the corners of a rectangle.
    """
    if not corners or len(corners) != 4:
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
        return warped
    except Exception:
        return None

class BubbleGrid(BaseModel):
    row: int
    bubbles: List[Dict[str, Any]]

class BubbleResult(BaseModel):
    found: bool
    grids: List[BubbleGrid]

def _find_checkboxes(gray: np.ndarray, min_area: int = 50, max_area: int = 2000) -> List[Tuple[int, int, int, int]]:
    """
    Find rectangular checkbox regions. Calibrated for ~800px width images.
    """
    thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
    
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=1)

    cnts = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = imutils.grab_contours(cnts)

    checkboxes = []
    for contour in cnts:
        area = cv2.contourArea(contour)
        if not (min_area < area < max_area):
            continue

        x, y, w, h = cv2.boundingRect(contour)
        aspect_ratio = float(w) / h if h > 0 else 0
        
        # Filtros calibrados via diagnóstico
        if 0.6 <= aspect_ratio <= 1.6 and w > 8 and h > 8:
            checkboxes.append((x, y, w, h))

    return checkboxes

def _calculate_fill_percentage(gray: np.ndarray, x: int, y: int, w: int, h: int) -> float:
    roi = gray[y:y+h, x:x+w]
    if roi.size == 0: return 0.0
    
    # Usar Otsu para cada bolha individualmente para maior precisão
    _, thresh = cv2.threshold(roi, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    return float(cv2.countNonZero(thresh)) / float(roi.size)

def _cluster_checkboxes(checkboxes: List[Tuple[int, int, int, int]], tolerance: int = 15) -> List[List[Tuple[int, int, int, int]]]:
    if not checkboxes: return []
    sorted_by_y = sorted(checkboxes, key=lambda b: b[1])
    rows = []
    current_row = [sorted_by_y[0]]
    for i in range(1, len(sorted_by_y)):
        if abs(sorted_by_y[i][1] - current_row[0][1]) <= tolerance:
            current_row.append(sorted_by_y[i])
        else:
            rows.append(sorted(current_row, key=lambda b: b[0]))
            current_row = [sorted_by_y[i]]
    rows.append(sorted(current_row, key=lambda b: b[0]))
    # Filtrar apenas linhas que pareçam questões (3 a 5 alternativas)
    return [r for r in rows if 3 <= len(r) <= 5]

def detect_bubbles(image: np.ndarray) -> BubbleResult:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape
    
    # ROI focada na área de respostas (ajustada para o cartão Avalia.Edu)
    roi_y_start = int(height * 0.4) # Começa após o texto "FOLHA DE RESPOSTAS"
    roi_gray = gray[roi_y_start:, :]
    
    checkboxes_roi = _find_checkboxes(roi_gray)
    if not checkboxes_roi: return BubbleResult(found=False, grids=[])
    
    checkboxes = [(x, y + roi_y_start, w, h) for x, y, w, h in checkboxes_roi]
    rows = _cluster_checkboxes(checkboxes)
    
    grids = []
    for i, row in enumerate(rows):
        bubbles = []
        for j, (x, y, w, h) in enumerate(row):
            fill = _calculate_fill_percentage(gray, x, y, w, h)
            bubbles.append({
                "col": j, "x": x + w//2, "y": y + h//2, "radius": max(w,h)//2,
                "fill_percentage": fill, "marked": fill > 0.5 # 50% de preenchimento
            })
        grids.append(BubbleGrid(row=i, bubbles=bubbles))
    return BubbleResult(found=True, grids=grids)

def find_corner_markers(image: np.ndarray) -> Optional[List[List[float]]]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
    
    cnts = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = imutils.grab_contours(cnts)
    
    markers = []
    for c in cnts:
        area = cv2.contourArea(c)
        if 100 < area < 5000: # Faixa calibrada
            x, y, w, h = cv2.boundingRect(c)
            ratio = float(w)/h
            if 0.7 < ratio < 1.3:
                M = cv2.moments(c)
                if M["m00"] != 0:
                    markers.append([float(M["m10"]/M["m00"]), float(M["m01"]/M["m00"])])
    
    if len(markers) >= 4:
        # Se houver mais de 4, pegar os 4 que formam o maior retângulo (os cantos)
        markers = sorted(markers, key=lambda p: p[0] + p[1]) # Ordenação básica
        # Simplificação: pegar os 4 pontos mais extremos
        pts = np.array(markers)
        s = pts.sum(axis=1)
        tl = pts[np.argmin(s)]
        br = pts[np.argmax(s)]
        diff = np.diff(pts, axis=1)
        tr = pts[np.argmin(diff)]
        bl = pts[np.argmax(diff)]
        return [tl.tolist(), tr.tolist(), br.tolist(), bl.tolist()]
    return None

# --- FastAPI ---
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.post("/api/omr/scan")
async def scan(photo: UploadFile = File(...)):
    contents = await photo.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # 1. Tentar alinhar
    corners = find_corner_markers(img)
    processed = img
    if corners:
        warped = correct_perspective(img, corners)
        if warped is not None: processed = warped
    else:
        # Se não alinhar, apenas redimensiona para manter consistência
        processed = cv2.resize(img, (800, int(img.shape[0]*(800/img.shape[1]))))

    # 2. Detectar
    res = detect_bubbles(processed)
    
    # 3. Gerar imagens de debug
    annotated = processed.copy()
    for g in res.grids:
        for b in g.bubbles:
            color = (0, 255, 0) if b["marked"] else (0, 165, 255)
            cv2.circle(annotated, (b["x"], b["y"]), b["radius"], color, 2)

    _, buf = cv2.imencode(".png", annotated)
    debug_b64 = base64.b64encode(buf).decode()
    
    return {"status": "success", "bubbles": res.dict(), "debug_image": debug_b64}