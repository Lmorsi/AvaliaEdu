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

# --- Funções de Visão Computacional Otimizadas ---

def _order_corner_points(pts: np.ndarray) -> np.ndarray:
    """Ordena quatro pontos de canto: superior-esquerdo, superior-direito, inferior-direito, inferior-esquerdo."""
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]   # TL
    rect[2] = pts[np.argmax(s)]   # BR
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]  # TR
    rect[3] = pts[np.argmax(diff)]  # BL
    return rect

def correct_perspective(
    image: np.ndarray,
    corners: List[List[float]],
    target_width: int = 700,
    target_height: int = 1000,
) -> Optional[np.ndarray]:
    """Aplica a correção de perspectiva para alinhar o gabarito em um tamanho fixo."""
    if not corners or len(corners) != 4:
        logger.warning("Perspectiva não aplicada: requer exatamente 4 cantos.")
        return None

    pts = np.array(corners, dtype="float32")
    src_pts = _order_corner_points(pts)

    dst_pts = np.array(
        [[0, 0], [target_width, 0], [target_width, target_height], [0, target_height]],
        dtype="float32",
    )

    matrix = cv2.getPerspectiveTransform(src_pts, dst_pts)
    if matrix is None:
        return None

    try:
        return cv2.warpPerspective(
            image, matrix, (target_width, target_height),
            flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(255, 255, 255)
        )
    except Exception as e:
        logger.error("Falha no warpPerspective: %s", str(e))
        return None

def _find_checkboxes(gray: np.ndarray, min_area: int = 40, max_area: int = 2500) -> List[Tuple[int, int, int, int]]:
    """
    Detecta os círculos das bolhas de resposta. Ajustado para ser permissivo com
    proporções circulares e pequenas deformações causadas pela foto do celular.
    """
    # Binarização adaptativa para destacar os contornos das bolhas
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    
    # Operação morfológica para fechar pequenas falhas na linha do círculo
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    gray_processed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=1)
    
    contours, _ = cv2.findContours(gray_processed, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

    checkboxes = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if not (min_area < area < max_area):
            continue
            
        x, y, w, h = cv2.boundingRect(contour)
        
        # Filtro de Proporção (Aspect Ratio): Círculos na foto podem virar leves ovais (0.65 a 1.35)
        aspect_ratio = float(w) / h if h > 0 else 0
        if aspect_ratio < 0.65 or aspect_ratio > 1.35:
            continue
            
        # Filtro de tamanho mínimo para ignorar ruídos textuais ou furos de papel
        if w < 12 or h < 12:
            continue
            
        checkboxes.append((x, y, w, h))
        
    return checkboxes

def _calculate_fill_percentage(gray: np.ndarray, x: int, y: int, w: int, h: int, threshold: int = 140) -> float:
    """Calcula a porcentagem de preenchimento (pixels escuros) dentro da bolha."""
    y1, y2 = max(0, y), min(gray.shape[0], y + h)
    x1, x2 = max(0, x), min(gray.shape[1], x + w)
    roi = gray[y1:y2, x1:x2]
    if roi.size == 0:
        return 0.0
    _, roi_thresh = cv2.threshold(roi, threshold, 255, cv2.THRESH_BINARY_INV)
    dark_pixels = cv2.countNonZero(roi_thresh)
    return float(dark_pixels) / float(roi.size)

def _cluster_checkboxes(checkboxes: List[Tuple[int, int, int, int]], tolerance: int = 20) -> List[List[Tuple[int, int, int, int]]]:
    """Agrupa as bolhas detectadas em linhas baseando-se na proximidade do eixo Y."""
    if not checkboxes:
        return []
    
    # Ordena de cima para baixo
    sorted_checkboxes = sorted(checkboxes, key=lambda b: b[1])
    rows = []
    current_row = [sorted_checkboxes[0]]
    
    for checkbox in sorted_checkboxes[1:]:
        # Compara com o último elemento adicionado para evitar quebras por inclinação da folha
        if abs(checkbox[1] - current_row[-1][1]) <= tolerance:
            current_row.append(checkbox)
        else:
            rows.append(sorted(current_row, key=lambda b: b[0]))
            current_row = [checkbox]
            
    if current_row:
        rows.append(sorted(current_row, key=lambda b: b[0]))
        
    # Retorna apenas grupos que tenham 3 ou mais bolhas (evita falsas linhas com sujeiras)
    return [row for row in rows if len(row) >= 3]

def detect_bubbles(image: np.ndarray, fill_threshold: int = 145, marked_percentage: float = 0.35) -> BubbleResult:
    if image is None or image.size == 0:
        return BubbleResult(found=False, grids=[])

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape

    # --- CONFIGURAÇÃO DE ROI CALIBRADA ---
    # roi_y_start_percent mudou para 0.18: começa bem mais acima, englobando a linha 1 com folga.
    # roi_x_end_percent mudou para 0.50: limita a busca à metade esquerda (onde ficam as bolhas), ignorando o QR Code.
    roi_x_start_percent = 0.05
    roi_y_start_percent = 0.18  
    roi_x_end_percent = 0.50    
    roi_y_end_percent = 0.85    

    y_start_roi = int(height * roi_y_start_percent)
    y_end_roi = int(height * roi_y_end_percent)
    x_start_roi = int(width * roi_x_start_percent)
    x_end_roi = int(width * roi_x_end_percent)

    roi_gray = gray[y_start_roi:y_end_roi, x_start_roi:x_end_roi]
    
    checkboxes_in_roi = _find_checkboxes(roi_gray)
    if not checkboxes_in_roi:
        logger.warning("Nenhum contorno de bolha detectado na ROI.")
        return BubbleResult(found=False, grids=[])

    # Reposiciona as coordenadas locais da ROI de volta para a imagem cheia
    checkboxes = [(x + x_start_roi, y + y_start_roi, w, h) for x, y, w, h in checkboxes_in_roi]
    
    # Agrupa em linhas horizontais
    rows = _cluster_checkboxes(checkboxes, tolerance=22)

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
    """Desenha retângulos de depuração ao redor das bolhas detectadas."""
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
            raise HTTPException(status_code=400, detail="Não foi possível decodificar a imagem.")

        # Dimensões virtuais e estáticas do gabarito alvo
        target_width = 700
        target_height = 1000 
        
        # Redimensionamento provisório. 
        # NOTA: Para máxima precisão em produção, utilize aqui a sua função que encontra os 
        # 4 cantos pretos e execute o `correct_perspective(image, cantos, 700, 1000)`
        corrected_image = cv2.resize(image, (target_width, target_height), interpolation=cv2.INTER_AREA)

        # Executa a detecção na imagem normalizada
        bubble_result = detect_bubbles(corrected_image)

        # Prepara imagens em Base64 para visualização e depuração no frontend
        _, corrected_image_encoded = cv2.imencode('.png', corrected_image)
        corrected_image_base64 = base64.b64encode(corrected_image_encoded).decode('utf-8')

        annotated_image = draw_bubbles(corrected_image, bubble_result)
        _, annotated_image_encoded = cv2.imencode('.png', annotated_image)
        annotated_image_base64 = base64.b64encode(annotated_image_encoded).decode('utf-8')

        return JSONResponse(content={
            "status": "success",
            "bubbles": bubble_result.model_dump(),  # Pydantic v2 padrão
            "corrected_image": corrected_image_base64,
            "debug_image": annotated_image_base64,
        })

    except Exception as e:
        logger.error(f"Erro no processamento OMR: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "ok"}