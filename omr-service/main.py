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

# --- Funções de Visão Computacional (copiadas dos scripts anteriores) ---

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
    target_width: int = 1240,
    target_height: int = 1754,
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

# Mocking the models for demonstration purposes (from detect_bubbles_corrigido.py)
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
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    gray_processed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=1)
    contours, _ = cv2.findContours(gray_processed, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

    checkboxes = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if not (min_area < area < max_area):
            continue
        x, y, w, h = cv2.boundingRect(contour)
        if w < 8 or h < 8:
            continue
        aspect_ratio = float(w) / h if h > 0 else 0
        if aspect_ratio < 0.75 or aspect_ratio > 1.25:
            continue
        perimeter = cv2.arcLength(contour, True)
        if perimeter < 1:
            continue
        circularity = 4 * np.pi * area / (perimeter * perimeter)
        if circularity < 0.6:
            continue
        hull = cv2.convexHull(contour)
        hull_area = cv2.contourArea(hull)
        if hull_area > 0:
            solidity = area / hull_area
            if solidity < 0.7:
                continue
        checkboxes.append((x, y, w, h))
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
    checkboxes: List[Tuple[int, int, int, int]], tolerance: int = 15
) -> List[List[Tuple[int, int, int, int]]]:
    """
    Group checkboxes into grid rows based on y-coordinate proximity.
    """
    if not checkboxes:
        return []
    sorted_checkboxes = sorted(checkboxes, key=lambda b: b[1])
    rows = []
    current_row = [sorted_checkboxes[0]]
    for checkbox in sorted_checkboxes[1:]:
        if abs(checkbox[1] - current_row[0][1]) <= tolerance:
            current_row.append(checkbox)
        else:
            if len(current_row) > 0:
                rows.append(sorted(current_row, key=lambda b: b[0]))
            current_row = [checkbox]
    if len(current_row) > 0:
        rows.append(sorted(current_row, key=lambda b: b[0]))
    filtered_rows = [row for row in rows if len(row) >= 3]
    return filtered_rows

def detect_bubbles(
    image: np.ndarray,
    fill_threshold: int = 150,
    marked_percentage: float = 0.25,
) -> BubbleResult:
    """
    Detect and classify checkboxes as marked or unmarked, with ROI filtering to avoid QR Code.
    """
    if image is None or image.size == 0:
        logger.error("Image is empty or None")
        return BubbleResult(found=False, grids=[])

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape

    # --- ESTRATÉGIA DE FILTRAGEM DE ROI ---
    # Estes valores devem ser calibrados para o seu gabarito padronizado APÓS a correção de perspectiva.
    # Para o cartão Avalia.Edu, o QR Code está no canto superior direito.
    # A ROI deve focar na área das respostas.
    
    # Exemplo de ROI para o cartão Avalia.Edu (ajuste conforme o gabarito corrigido)
    # Assumindo que a imagem já está corrigida para 1240x1754 (target_width x target_height)
    # e que o QR Code está no canto superior direito.
    # Estes são valores percentuais da imagem corrigida.
    
    # O QR Code e o cabeçalho ocupam a parte superior. As respostas começam mais abaixo.
    # Ajuste estes percentuais para cobrir apenas a área das bolhas de resposta.
    roi_x_start_percent = 0.05
    roi_y_start_percent = 0.30 # Ajustado para pular o cabeçalho e QR Code
    roi_x_end_percent = 0.95
    roi_y_end_percent = 0.95

    y_start_roi = int(height * roi_y_start_percent)
    y_end_roi = int(height * roi_y_end_percent)
    x_start_roi = int(width * roi_x_start_percent)
    x_end_roi = int(width * roi_x_end_percent)

    # Garante que a ROI não exceda os limites da imagem
    y_start_roi = max(0, y_start_roi)
    y_end_roi = min(height, y_end_roi)
    x_start_roi = max(0, x_start_roi)
    x_end_roi = min(width, x_end_roi)

    if x_end_roi <= x_start_roi or y_end_roi <= y_start_roi:
        logger.error("ROI dimensions are invalid after calculation.")
        return BubbleResult(found=False, grids=[])

    roi_gray = gray[y_start_roi:y_end_roi, x_start_roi:x_end_roi]
    
    if roi_gray.size == 0:
        logger.error("ROI is empty after cropping.")
        return BubbleResult(found=False, grids=[])

    checkboxes_in_roi = _find_checkboxes(roi_gray)
    
    if not checkboxes_in_roi:
        logger.warning("No checkboxes detected in ROI")
        return BubbleResult(found=False, grids=[])

    checkboxes = []
    for x, y, w, h in checkboxes_in_roi:
        checkboxes.append((x + x_start_roi, y + y_start_roi, w, h))

    rows = _cluster_checkboxes(checkboxes)

    grids = []
    for row_idx, row in enumerate(rows):
        grid_row = []
        for col_idx, (x, y, w, h) in enumerate(row):
            fill_pct = _calculate_fill_percentage(gray, x, y, w, h, fill_threshold)
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
            cx = bubble["x"]
            cy = bubble["y"]
            radius = bubble["radius"]
            color = colors["marked"] if bubble["marked"] else colors["unmarked"]
            x1, y1 = max(0, cx - radius), max(0, cy - radius)
            x2, y2 = min(annotated.shape[1], cx + radius), min(annotated.shape[0], cy + radius)
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
            fill_pct = bubble["fill_percentage"]
            text = f"{fill_pct:.0%}"
            cv2.putText(annotated, text, (cx - 15, cy + 5), cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)

    return annotated

# --- FastAPI Application ---
app = FastAPI()

# Configurar CORS para permitir requisições do seu frontend (localhost:8080 ou onde estiver rodando)
origins = [
    "http://localhost",
    "http://localhost:8080", # Porta padrão para muitos servidores de desenvolvimento
    "http://127.0.0.1:8080",
    # Adicione aqui o domínio do seu site Avalia.Edu quando estiver em produção
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/omr/scan")
async def scan_omr_sheet(photo: UploadFile = File(...), debug: bool = False):
    try:
        # 1. Ler a imagem
        contents = await photo.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(status_code=400, detail="Não foi possível decodificar a imagem.")

        # --- Simulação de Detecção de Marcadores de Âncora ---
        # Em um cenário real, você teria um algoritmo aqui para detectar os 4 marcadores
        # pretos do seu cartão (os 4 quadrados nos cantos).
        # Para este exemplo, vamos usar coordenadas fixas (idealmente, você as detectaria dinamicamente).
        # Estes pontos são para o cartão Avalia.Edu, redimensionado para 700px de largura.
        # Você precisará ajustar estes pontos se a imagem de entrada não for de 700px de largura
        # ou se os marcadores mudarem de posição.
        
        # Para o cartão Avalia.Edu (pasted_file_AQRc0q_image.png) redimensionado para 700px de largura:
        # Canto superior esquerdo: (30, 150) aproximadamente
        # Canto superior direito: (670, 150) aproximadamente
        # Canto inferior esquerdo: (30, 800) aproximadamente
        # Canto inferior direito: (670, 800) aproximadamente

        # A forma mais robusta é detectar esses marcadores dinamicamente.
        # Por simplicidade para o teste, vamos usar valores que funcionariam se a imagem
        # já estivesse pré-processada ou se os marcadores fossem detectados.
        # Estes valores são APENAS PARA TESTE e devem ser substituídos pela detecção real.
        # Para o cartão Avalia.Edu, os marcadores são pequenos quadrados pretos.
        # O código de detecção de marcadores que você já tem (do script processa_cartao_avalia_edu_dinamico.py)
        # deve ser usado aqui para encontrar esses `corners`.
        
        # Placeholder para os corners (substitua pela detecção real)
        # Estes são os 4 quadrados pretos nos cantos da área de respostas do seu cartão.
        # Eles precisam ser detectados dinamicamente na imagem original antes do redimensionamento
        # ou na imagem redimensionada, e então passados para correct_perspective.
        
        # Para o propósito de fazer o backend funcionar com o frontend, vamos SIMULAR
        # que os corners foram detectados e que a imagem já está mais ou menos alinhada.
        # Em um sistema real, você chamaria sua função de detecção de marcadores aqui.
        
        # Vamos usar os 4 quadrados pretos do seu cartão como referência.
        # As coordenadas abaixo são aproximadas para a imagem original do seu cartão.
        # Você precisará integrar a detecção real dos 4 quadrados pretos aqui.
        # Para o teste, vamos assumir que a imagem já está razoavelmente alinhada
        # e que a correção de perspectiva não é estritamente necessária se a foto for boa.
        # No entanto, para um sistema robusto, a detecção dos 4 marcadores é crucial.

        # Para o teste, vamos SIMPLIFICAR e assumir que a imagem já está "quase" corrigida
        # e que os corners são os cantos da imagem para fins de demonstração da pipeline.
        # Em produção, use a detecção real dos 4 marcadores pretos!
        h, w, _ = image.shape
        corners_for_perspective = [
            [0, 0],       # Top-Left
            [w, 0],       # Top-Right
            [w, h],       # Bottom-Right
            [0, h]        # Bottom-Left
        ]

        # 2. Correção de Perspectiva (usando a função que você já tem)
        # target_width e target_height devem ser as dimensões padronizadas do seu gabarito
        # após a correção de perspectiva.
        target_width = 700 # Exemplo, ajuste conforme seu gabarito
        target_height = int(image.shape[0] * (target_width / image.shape[1])) # Manter proporção

        # Para este teste, vamos pular a correção de perspectiva se os corners forem os da imagem inteira
        # e apenas redimensionar para o tamanho alvo para a detecção de bolhas.
        # Em um sistema real, você usaria `correct_perspective` com os corners detectados.
        corrected_image = cv2.resize(image, (target_width, target_height), interpolation=cv2.INTER_AREA)
        
        # Se você tiver a detecção real dos 4 marcadores, use:
        # corrected_image = correct_perspective(image, corners_detectados_realmente, target_width, target_height)
        
        # Imagem para debug da correção de perspectiva
        _, corrected_image_encoded = cv2.imencode('.png', corrected_image)
        corrected_image_base64 = base64.b64encode(corrected_image_encoded).decode('utf-8')

        # 3. Detecção de Bolhas (usando a função corrigida)
        bubble_result = detect_bubbles(corrected_image)

        # 4. Desenhar bolhas para debug
        annotated_image = draw_bubbles(corrected_image, bubble_result)
        _, annotated_image_encoded = cv2.imencode('.png', annotated_image)
        annotated_image_base64 = base64.b64encode(annotated_image_encoded).decode('utf-8')

        response_data = {
            "status": "success",
            "bubbles": bubble_result.dict(), # Convert pydantic model to dict
            "corrected_image": corrected_image_base64,
            "debug_image": annotated_image_base64, # Imagem com bolhas desenhadas
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

# Para rodar este servidor:
# 1. pip install fastapi uvicorn opencv-python numpy python-multipart
# 2. uvicorn main:app --reload --host 0.0.0.0 --port 8000