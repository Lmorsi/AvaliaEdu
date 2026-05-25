"""
Servidor FastAPI para processamento OMR de cartões-resposta.
Integra correção de perspectiva e detecção dinâmica de bolhas.
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
import imutils # Adicionado para sort_contours
from imutils import contours # Adicionado para sort_contours

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
    # Isso ajuda a encontrar tanto bolhas vazias quanto preenchidas
    # O valor 11 é o tamanho do bloco, 2 é a constante subtraída
    thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)

    # Operações morfológicas para fechar pequenos buracos e conectar contornos
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)) # Kernel elíptico funciona bem para bolhas
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=2)
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=1) # Remove pequenos ruídos

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
        if w < 10 or h < 10: # Aumentado o tamanho mínimo para ser mais robusto
            continue

        # Filtrar por proporção (aspect ratio) - deve ser próximo de 1 para quadrados/círculos
        aspect_ratio = float(w) / h if h > 0 else 0
        if aspect_ratio < 0.7 or aspect_ratio > 1.3: # Tolerância um pouco maior
            continue

        # Filtrar por circularidade/solidez (ajuda a remover contornos irregulares)
        perimeter = cv2.arcLength(contour, True)
        if perimeter < 1:
            continue
        circularity = 4 * np.pi * area / (perimeter * perimeter)
        if circularity < 0.5: # Reduzido um pouco para ser mais inclusivo
            continue

        hull = cv2.convexHull(contour)
        hull_area = cv2.contourArea(hull)
        if hull_area > 0:
            solidity = area / hull_area
            if solidity < 0.6: # Reduzido um pouco para ser mais inclusivo
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
    checkboxes: List[Tuple[int, int, int, int]], tolerance: int = 15
) -> List[List[Tuple[int, int, int, int]]]:
    """
    Group checkboxes into grid rows based on y-coordinate proximity.
    """
    if not checkboxes:
        return []

    # Sort by y-coordinate
    sorted_checkboxes = sorted(checkboxes, key=lambda b: b[1])

    logger.debug(f"Clustering {len(sorted_checkboxes)} checkboxes with tolerance={tolerance}")

    rows = []
    current_row = [sorted_checkboxes[0]]

    for checkbox in sorted_checkboxes[1:]:
        # Se o checkbox estiver próximo verticalmente do primeiro da linha atual, adicione à linha
        if abs(checkbox[1] - current_row[0][1]) <= tolerance:
            current_row.append(checkbox)
        else:
            # Se não, finalize a linha atual e comece uma nova
            if len(current_row) > 0:
                rows.append(contours.sort_contours(current_row, method="left-to-right")[0])
            current_row = [checkbox]

    # Não esquecer a última linha
    if len(current_row) > 0:
        rows.append(contours.sort_contours(current_row, method="left-to-right")[0])

    # Filtrar linhas: manter apenas linhas com um número razoável de checkboxes (ex: 3 ou 4 para A,B,C,D)
    # Ajuste este valor conforme o número de alternativas por questão no seu gabarito
    filtered_rows = [row for row in rows if len(row) >= 3 and len(row) <= 5] # Ex: 3 a 5 alternativas

    logger.info(f"Clustered into {len(rows)} rows, kept {len(filtered_rows)} valid rows (min 3, max 5 checkboxes)")
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
    
    # Ajuste estes percentuais para cobrir apenas a área das bolhas de resposta no seu cartão corrigido.
    # Estes são valores aproximados para o cartão Avalia.Edu após correção de perspectiva para 700x~990px
    roi_x_start_percent = 0.15 # Começa um pouco mais para a direita para evitar as numerações das questões
    roi_y_start_percent = 0.25 # Começa um pouco mais abaixo do cabeçalho e QR Code
    roi_x_end_percent = 0.90   # Termina um pouco antes da borda direita
    roi_y_end_percent = 0.90   # Termina um pouco antes da borda inferior

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

    # Passa a ROI para a função de detecção de checkboxes
    checkboxes_in_roi = _find_checkboxes(roi_gray, min_area=100, max_area=1000) # Ajuste min/max area para suas bolhas
    
    if not checkboxes_in_roi:
        logger.warning("No checkboxes detected in ROI")
        return BubbleResult(found=False, grids=[])

    # Ajusta as coordenadas dos checkboxes de volta para o espaço da imagem original
    checkboxes = []
    for x, y, w, h in checkboxes_in_roi:
        checkboxes.append((x + x_start_roi, y + y_start_roi, w, h))

    rows = _cluster_checkboxes(checkboxes)

    grids = []
    for row_idx, row in enumerate(rows):
        grid_row = []
        for col_idx, (x, y, w, h) in enumerate(row):
            # Aumentar o marked_percentage para ser mais seletivo com o que é considerado marcado
            # E o fill_threshold para considerar pixels mais escuros como preenchimento
            fill_pct = _calculate_fill_percentage(gray, x, y, w, h, fill_threshold=100) # Ajustado para 100
            is_marked = fill_pct >= 0.40 # Ajustado para 40% de preenchimento

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
        "multiple": (0, 0, 255),    # Red para múltiplas marcações (se implementado)
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
    "*", # Permite qualquer origem para facilitar o teste
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
        contents = await photo.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(status_code=400, detail="Não foi possível decodificar a imagem.")

        # Redimensionar a imagem para um tamanho padrão para o processamento
        # Isso simula a saída da correção de perspectiva para um tamanho fixo
        target_width = 700 # Largura padrão para processamento
        # Calcula a altura mantendo a proporção
        target_height = int(image.shape[0] * (target_width / image.shape[1]))
        processed_image = cv2.resize(image, (target_width, target_height), interpolation=cv2.INTER_AREA)
        
        # Em um sistema real, aqui você chamaria sua função de detecção de marcadores
        # e depois a `correct_perspective` para obter a `processed_image`.
        # Ex: corners = detect_markers(image)
        #     processed_image = correct_perspective(image, corners, target_width, target_height)

        # Detecção de Bolhas
        bubble_result = detect_bubbles(processed_image)

        # Desenhar bolhas para debug
        annotated_image = draw_bubbles(processed_image, bubble_result)
        _, annotated_image_encoded = cv2.imencode(".png", annotated_image)
        annotated_image_base64 = base64.b64encode(annotated_image_encoded).decode("utf-8")

        response_data = {
            "status": "success",
            "bubbles": bubble_result.dict(),
            "corrected_image": annotated_image_base64, # Usando a imagem anotada como corrected_image para debug
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
# 1. pip install fastapi uvicorn opencv-python numpy python-multipart imutils
# 2. uvicorn main:app --reload --host 0.0.0.0 --port 8000