"""
Servidor FastAPI para processamento OMR de cartões-resposta.
Versão corrigida: Detecção robusta de marcadores, correção de perspectiva e fallback.
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

def _find_checkboxes(gray: np.ndarray, min_area: int = 20, max_area: int = 3000) -> List[Tuple[int, int, int, int]]:
    """
    Find rectangular checkbox regions in a grayscale image.
    
    This version is more robust to finding both filled and unfilled bubbles.
    Adjusted min_area and max_area for better sensitivity.
    """
    # Usar um thresholding adaptativo para realçar as bordas das bolhas
    thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)

    # Operações morfológicas para fechar pequenos buracos e conectar contornos
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)) # Kernel menor para bolhas
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=1)
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=1)

    # Encontrar contornos
    cnts = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = imutils.grab_contours(cnts)

    checkboxes = []
    for contour in cnts:
        area = cv2.contourArea(contour)
        # Filtrar por área - ajuste min_area e max_area conforme o tamanho esperado das suas bolhas
        if not (min_area < area < max_area):
            logger.debug(f"Skipping checkbox contour (area out of range): {area:.0f}")
            continue

        # Obter o retângulo delimitador
        x, y, w, h = cv2.boundingRect(contour)

        # Filtrar por tamanho mínimo
        if w < 5 or h < 5: # Reduzido o mínimo para capturar bolhas menores
            logger.debug(f"Skipping checkbox contour (min size): w={w}, h={h}")
            continue

        # Filtrar por proporção (aspect ratio) - deve ser próximo de 1 para quadrados/círculos
        aspect_ratio = float(w) / h if h > 0 else 0
        if aspect_ratio < 0.5 or aspect_ratio > 1.5: # Faixa mais ampla para tolerar distorções
            logger.debug(f"Skipping checkbox contour (aspect ratio): {aspect_ratio:.2f}")
            continue

        perimeter = cv2.arcLength(contour, True)
        if perimeter < 1:
            logger.debug("Skipping checkbox contour (perimeter < 1)")
            continue
        circularity = 4 * np.pi * area / (perimeter * perimeter)
        if circularity < 0.3: # Faixa mais ampla para tolerar formas não perfeitamente circulares
            logger.debug(f"Skipping checkbox contour (circularity): {circularity:.3f}")
            continue

        hull = cv2.convexHull(contour)
        hull_area = cv2.contourArea(hull)
        if hull_area > 0:
            solidity = area / hull_area
            if solidity < 0.4: # Faixa mais ampla para tolerar preenchimentos irregulares
                logger.debug(f"Skipping checkbox contour (solidity): {solidity:.3f}")
                continue

        checkboxes.append((x, y, w, h))
        logger.debug(f"Found checkbox: x={x}, y={y}, w={w}, h={h}, aspect={aspect_ratio:.2f}, circ={circularity:.3f}, solid={solidity:.3f}, area={area:.0f}")

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
    # Ajustado para permitir 4 alternativas como no seu cartão
    filtered_rows = [row for row in rows if len(row) >= 3 and len(row) <= 5]

    logger.info(f"Clustered into {len(rows)} rows, kept {len(filtered_rows)} valid rows.")
    return filtered_rows

def detect_bubbles(
    image: np.ndarray,
    fill_threshold: int = 120, # Ajustado para ser mais sensível a marcações
    marked_percentage: float = 0.30, # Ajustado para 30% de preenchimento
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
    # Reduzido o y_start_roi para capturar bolhas que possam estar mais acima
    roi_x_start_percent = 0.05
    roi_y_start_percent = 0.15 # Pula o cabeçalho, mas mais baixo para capturar bolhas
    roi_x_end_percent = 0.95
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
    # Ajustado min_area e max_area para serem mais flexíveis
    checkboxes_in_roi = _find_checkboxes(roi_gray, min_area=20, max_area=3000)
    
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
    
    # Aprimorado: Usar Limiarização de Otsu para se adaptar a diferentes iluminações
    # E aplicar um blur para reduzir ruídos antes do threshold
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # Operações morfológicas para fechar pequenos buracos nos marcadores e conectá-los
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7)) # Kernel maior para marcadores maiores
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=3)
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=2)

    cnts = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = imutils.grab_contours(cnts)

    markers = []
    for c in cnts:
        # Aproxima o contorno para um polígono
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.04 * peri, True)

        if len(approx) == 4: # Procurar por contornos com 4 vértices (quadrados)
            x, y, w, h = cv2.boundingRect(approx)
            aspect_ratio = float(w) / h
            area = cv2.contourArea(c)

            # Filtra por área e proporção para encontrar os marcadores
            # Ajustado para marcadores menores e mais flexíveis
            if 0.7 <= aspect_ratio <= 1.3 and 50 < area < 10000: # Faixa de área mais ampla
                # Calcula o centro do marcador
                M = cv2.moments(c)
                if M["m00"] != 0:
                    cX = int(M["m10"] / M["m00"])
                    cY = int(M["m01"] / M["m00"])
                    markers.append([float(cX), float(cY)])
    
    if len(markers) == 4:
        logger.info("Successfully found 4 corner markers.")
        # Ordena os marcadores para garantir a ordem TL, TR, BR, BL
        ordered_markers = _order_corner_points(np.array(markers))
        return ordered_markers.tolist()
    elif len(markers) > 4:
        logger.warning(f"Found {len(markers)} potential markers. Attempting to filter to 4.")
        # Se mais de 4 forem encontrados, tente pegar os 4 mais externos
        # Isso é uma heurística e pode não ser 100% robusto em todos os casos
        markers_np = np.array(markers)
        # Ordena por soma (x+y) para encontrar TL e BR
        s = markers_np.sum(axis=1)
        tl = markers_np[np.argmin(s)]
        br = markers_np[np.argmax(s)]
        # Ordena por diferença (y-x) para encontrar TR e BL
        diff = np.diff(markers_np, axis=1)
        tr = markers_np[np.argmin(diff)]
        bl = markers_np[np.argmax(diff)]
        
        # Reordena para a sequência correta
        ordered_markers = _order_corner_points(np.array([tl, tr, br, bl]))
        return ordered_markers.tolist()

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

        processed_image = image.copy() # Imagem original para fallback
        corrected_image_base64 = "" # Inicializa para o caso de falha
        debug_markers_image_base64 = "" # Inicializa para o caso de falha

        # 1. Tentar detectar os 4 marcadores de canto
        corners = find_corner_markers(image)
        
        if corners is not None:
            # Desenhar os marcadores detectados na imagem original para debug
            debug_markers_image = image.copy()
            for corner_pt in corners:
                cv2.circle(debug_markers_image, (int(corner_pt[0]), int(corner_pt[1])), 15, (0, 255, 255), -1) # Amarelo
            
            _, debug_markers_image_encoded = cv2.imencode(".png", debug_markers_image)
            debug_markers_image_base64 = base64.b64encode(debug_markers_image_encoded).decode("utf-8")

            # 2. Corrigir a Perspectiva
            target_width = 700 # Largura padrão para processamento
            target_height = int(target_width * 1.414) # Proporção A4

            warped_image = correct_perspective(image, corners, target_width, target_height)
            if warped_image is not None:
                processed_image = warped_image # Usa a imagem corrigida se o warp for bem-sucedido
                _, corrected_image_encoded = cv2.imencode(".png", processed_image)
                corrected_image_base64 = base64.b64encode(corrected_image_encoded).decode("utf-8")
            else:
                logger.warning("Perspective correction failed, proceeding with resized original image.")
                # Fallback: se a correção de perspectiva falhar, redimensiona a imagem original
                processed_image = cv2.resize(image, (target_width, target_height), interpolation=cv2.INTER_AREA)
                _, corrected_image_encoded = cv2.imencode(".png", processed_image)
                corrected_image_base64 = base64.b64encode(corrected_image_encoded).decode("utf-8")
        else:
            logger.warning("Could not find 4 corner markers. Proceeding with resized original image.")
            # Fallback: se não encontrar os 4 marcadores, redimensiona a imagem original
            target_width = 700
            target_height = int(image.shape[0] * (target_width / image.shape[1]))
            processed_image = cv2.resize(image, (target_width, target_height), interpolation=cv2.INTER_AREA)
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
            "corrected_image": corrected_image_base64, # Imagem corrigida ou original redimensionada
            "debug_image": annotated_image_base64, # Imagem com bolhas desenhadas
            "markers_debug_image": debug_markers_image_base64, # Imagem com marcadores detectados (se houver)
        }

        return JSONResponse(content=response_data)

    except Exception as e:
        logger.error(f"Erro inesperado no processamento: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno: {e}")

@app.get("/health")
async def health_check():
    return {"status": "ok"}