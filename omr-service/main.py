"""""
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

def correct_perspective(
    image: np.ndarray,
    corners: List[List[float]],
    target_width: int = 700,
    target_height: int = 990,
) -> Optional[np.ndarray]:
    """
    Warp the image so the four corner points become the corners of a rectangle.
    """
    if not corners or len(corners) != 4:
        logger.warning("Cannot correct perspective: need exactly 4 corners")
        return None

    pts = np.array(corners, dtype="float32")
    src_pts = _order_corner_points(pts)

    dst_pts = np.array(
        [
            [0, 0],                          # TL
            [target_width, 0],               # TR
            [target_width, target_height],   # BR
            [0, target_height],              # BL
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
        logger.info("Perspective correction applied: %dx%d", target_width, target_height)
        return warped
    except Exception as e:
        logger.error("Perspective warp failed: %s", str(e))
        return None

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
    
    This version is more robust to finding both filled and unfilled bubbles.
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
        # Filtrar por área - ajuste min_area e max_area conforme o tamanho esperado das suas bolhas
        if not (min_area < area < max_area):
            continue

        # Obter o retângulo delimitador
        x, y, w, h = cv2.boundingRect(contour)

        # Filtrar por tamanho mínimo
        if w < 10 or h < 10:
            continue

        # Filtrar por proporção (aspect ratio) - deve ser próximo de 1 para quadrados/círculos
        aspect_ratio = float(w) / h if h > 0 else 0
        if aspect_ratio < 0.7 or aspect_ratio > 1.3:
            continue

        # Filtrar por circularidade/solidez (ajuda a remover contornos irregulares)
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
        logger.debug(f"Box: x={x}, y={y}, w={w}, h={h}, aspect={aspect_ratio:.2f}, circ={circularity:.3f}, solid={solidity:.3f}, area={area:.0f}")

    logger.info("Total checkboxes found: %d", len(checkboxes))
    return checkboxes

def _calculate_fill_percentage(
    gray: np.ndarray, x: int, y: int, w: int, h: int, threshold: int = 130
) -> float:
    """
    Calculate fill percentage of a checkbox region.
    
    Counts dark pixels inside the checkbox and returns percentage.
    """
    # Extrai a ROI da imagem original em escala de cinza
    y1, y2 = max(0, y), min(gray.shape[0], y + h)
    x1, x2 = max(0, x), min(gray.shape[1], x + w)

    roi = gray[y1:y2, x1:x2]
    if roi.size == 0:
        return 0.0

    # Binariza a ROI para contar pixels escuros
    # Usamos THRESH_BINARY_INV para que pixels escuros se tornem brancos (255)
    # e possam ser contados por cv2.countNonZero
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
    """
    Draw detected checkboxes on a copy of the image (for debugging).
    Also draws the 4 corner markers if provided.
    """
    annotated = image.copy()
    colors = {
        "marked": (0, 255, 0),      # Green
        "unmarked": (0, 165, 255),  # Orange
        "multiple": (0, 0, 255),    # Red para múltiplas marcações (se implementado)
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

def find_corner_markers(image: np.ndarray) -> Optional[List[List[float]]]:
    """
    Detects the four black square corner markers in the image.
    Returns a list of [x, y] coordinates for the corners, or None if not found.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    # Binariza a imagem para realçar os marcadores pretos
    # Ajuste o threshold para o seu tipo de marcador (quadrado preto)
    _, thresh = cv2.threshold(gray, 50, 255, cv2.THRESH_BINARY_INV) # Inverte para preto ser branco

    # Operações morfológicas para fechar pequenos buracos nos marcadores
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=2)
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=1)

    cnts = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = imutils.grab_contours(cnts)

    markers = []
    for c in cnts:
        # Aproxima o contorno para um polígono
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.04 * peri, True)

        # Se o polígono tiver 4 vértices, pode ser um quadrado
        if len(approx) == 4:
            x, y, w, h = cv2.boundingRect(approx)
            aspect_ratio = float(w) / h
            area = cv2.contourArea(c)

            # Filtra por área e proporção para encontrar os marcadores
            # Ajuste esses valores para o tamanho dos seus marcadores
            if 0.8 <= aspect_ratio <= 1.2 and 50 < area < 1000: # Exemplo de área
                markers.append(approx.reshape(4, 2).tolist()) # Pega os 4 pontos do quadrado
    
    # Se encontrar mais de 4 marcadores, tente filtrar os 4 mais externos ou maiores
    if len(markers) == 4:
        # Para cada marcador, pegamos o centro para usar na correção de perspectiva
        # A função correct_perspective espera 4 pontos [x,y], não 4 conjuntos de 4 pontos
        # Então, vamos pegar o centro de cada marcador
        final_corners = []
        for marker in markers:
            marker_np = np.array(marker)
            M = cv2.moments(marker_np)
            if M["m00"] != 0:
                cX = int(M["m10"] / M["m00"])
                cY = int(M["m01"] / M["m00"])
                final_corners.append([float(cX), float(cY)])
        return final_corners
    elif len(markers) > 4:
        logger.warning(f"Found {len(markers)} potential markers. Filtering to find 4.")
        # Se encontrar mais de 4, tente pegar os 4 mais externos
        # Isso é um pouco mais complexo e pode exigir uma lógica de agrupamento espacial
        # Por simplicidade, vamos apenas pegar os 4 primeiros por enquanto, mas isso pode falhar
        # Uma abordagem melhor seria ordenar por posição e pegar os cantos
        final_corners = []
        for marker in markers:
            marker_np = np.array(marker)
            M = cv2.moments(marker_np)
            if M["m00"] != 0:
                cX = int(M["m10"] / M["m00"])
                cY = int(M["m01"] / M["m00"])
                final_corners.append([float(cX), float(cY)])
        
        # Ordenar os marcadores para tentar pegar os cantos
        final_corners_np = np.array(final_corners)
        ordered_corners = _order_corner_points(final_corners_np)
        return ordered_corners.tolist()

    logger.warning(f"Could not find exactly 4 corner markers. Found: {len(markers)}")
    return None

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

        # 1. Detectar os 4 marcadores de canto
        corners = find_corner_markers(image)
        if corners is None:
            raise HTTPException(status_code=400, detail="Não foi possível detectar os 4 marcadores de canto na imagem.")

        # Desenhar os marcadores detectados na imagem original para debug
        debug_markers_image = image.copy()
        for corner_pt in corners:
            cv2.circle(debug_markers_image, (int(corner_pt[0]), int(corner_pt[1])), 10, (0, 255, 255), -1) # Amarelo
        
        _, debug_markers_image_encoded = cv2.imencode(".png", debug_markers_image)
        debug_markers_image_base64 = base64.b64encode(debug_markers_image_encoded).decode("utf-8")

        # 2. Corrigir a Perspectiva
        # target_width e target_height devem ser as dimensões padronizadas do seu gabarito
        target_width = 700 # Largura padrão para processamento
        # A altura será calculada para manter a proporção do gabarito corrigido
        # Para o seu cartão, a proporção é aproximadamente A4 (1:1.414)
        target_height = int(target_width * 1.414) # Ajuste para a proporção do seu cartão

        processed_image = correct_perspective(image, corners, target_width, target_height)
        if processed_image is None:
            raise HTTPException(status_code=500, detail="Falha na correção de perspectiva.")
        
        # Imagem para debug da correção de perspectiva
        _, corrected_image_encoded = cv2.imencode(".png", processed_image)
        corrected_image_base64 = base64.b64encode(corrected_image_encoded).decode("utf-8")

        # 3. Detecção de Bolhas
        bubble_result = detect_bubbles(processed_image)

        # 4. Desenhar bolhas para debug
        annotated_image = draw_bubbles(processed_image, bubble_result)
        _, annotated_image_encoded = cv2.imencode(".png", annotated_image)
        annotated_image_base64 = base64.b64encode(annotated_image_encoded).decode("utf-8")

        response_data = {
            "status": "success",
            "bubbles": bubble_result.dict(),
            "corrected_image": corrected_image_base64, # Imagem corrigida
            "debug_image": annotated_image_base64, # Imagem com bolhas desenhadas
            "markers_debug_image": debug_markers_image_base64, # Imagem com marcadores detectados
        }

        return JSONResponse(content=response_data)

    except HTTPException as e:
        logger.error(f"HTTP Exception: {e.detail}")
        return JSONResponse(status_code=e.status_code, content={"status": "error", "message": e.detail})
    except Exception as e:
        logger.error(f"Erro inesperado no processamento: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno do servidor: {e}")

@app.get("/health")
async def health_check():
    return {"status": "ok"}