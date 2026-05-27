import base64
import io
import logging
from typing import List, Optional, Tuple, Dict, Any

import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# Importações do seu projeto (certifique-se de que esses módulos existam)
try:
    from omr.fiducial import draw_fiducials
    from omr.perspective import correct_perspective
    from omr.qr_reader import read_qr
    from omr.models import ScanResponse, ScanErrorResponse, BubbleResult, BubbleGrid, FiducialResult
except ImportError:
    # Fallback para modelos básicos se os módulos não forem encontrados durante o desenvolvimento
    from pydantic import BaseModel
    class FiducialResult(BaseModel):
        found: bool
        count: int
        corners: List[Tuple[float, float]]
    class BubbleGrid(BaseModel):
        row: int
        bubbles: List[Dict[str, Any]]
    class BubbleResult(BaseModel):
        found: bool
        grids: List[BubbleGrid]
    class ScanResponse(BaseModel):
        success: bool
        qr: Optional[Any] = None
        fiducial: Optional[FiducialResult] = None
        bubbles: BubbleResult
        debug_image: Optional[str] = None
        corrected_image: Optional[str] = None
    class ScanErrorResponse(BaseModel):
        error: str

    # Funções de fallback para desenvolvimento
    def correct_perspective(image, corners, target_width, target_height):
        pts1 = np.float32(corners)
        pts2 = np.float32([[0, 0], [target_width, 0], [target_width, target_height], [0, target_height]])
        matrix = cv2.getPerspectiveTransform(pts1, pts2)
        return cv2.warpPerspective(image, matrix, (target_width, target_height))
    
    def read_qr(image): return None
    def draw_fiducials(img, res): return img

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Detecção de Marcadores L (Harris Corner) ---

def _detect_l_corner_harris(roi: np.ndarray, corner_type: str) -> Optional[Tuple[float, float]]:
    """
    Detecta o canto de um marcador em L usando Harris Corner Detection.
    Eficaz para linhas finas onde a detecção de contornos sólidos falha.
    """
    if roi is None or roi.size == 0:
        return None
        
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    # Suavização para reduzir ruído de texturas externas (mesa, teclado)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Harris Corner Detection
    dst = cv2.cornerHarris(gray, 2, 3, 0.04)
    dst = cv2.dilate(dst, None)
    
    # Threshold para os melhores cantos
    ret, dst = cv2.threshold(dst, 0.01 * dst.max(), 255, 0)
    dst = np.uint8(dst)
    
    # Encontrar centroides dos componentes conectados
    ret, labels, stats, centroids = cv2.connectedComponentsWithStats(dst)
    
    if len(centroids) <= 1:
        return None
        
    # Ignorar o centroide do fundo (índice 0)
    centroids = centroids[1:]
    
    # Selecionar o canto mais extremo baseado na posição esperada na ROI
    h, w = roi.shape[:2]
    if corner_type == 'TL':
        target = np.array([0, 0])
    elif corner_type == 'TR':
        target = np.array([w, 0])
    elif corner_type == 'BR':
        target = np.array([w, h])
    else: # BL
        target = np.array([0, h])
        
    best_idx = np.argmin(np.linalg.norm(centroids - target, axis=1))
    return (float(centroids[best_idx][0]), float(centroids[best_idx][1]))

def detect_l_markers(image: np.ndarray) -> FiducialResult:
    """
    Detecta os 4 marcadores L nos cantos da imagem.
    """
    h, w = image.shape[:2]
    margin = min(w, h) // 6 # Área de busca nos cantos
    
    corners = []
    found_count = 0
    
    corner_configs = [
        ('TL', (0, 0, margin, margin), (0, 0)),
        ('TR', (w-margin, 0, w, margin), (w-margin, 0)),
        ('BR', (w-margin, h-margin, w, h), (w-margin, h-margin)),
        ('BL', (0, h-margin, margin, h), (0, h-margin))
    ]
    
    for name, (x1, y1, x2, y2), (off_x, off_y) in corner_configs:
        roi = image[y1:y2, x1:x2]
        corner = _detect_l_corner_harris(roi, name)
        
        if corner:
            corners.append((corner[0] + off_x, corner[1] + off_y))
            found_count += 1
        else:
            # Fallback para as bordas absolutas se o marcador não for encontrado
            if name == 'TL': corners.append((0.0, 0.0))
            elif name == 'TR': corners.append((float(w), 0.0))
            elif name == 'BR': corners.append((float(w), float(h)))
            else: corners.append((0.0, float(h)))
            
    return FiducialResult(found=found_count >= 3, count=found_count, corners=corners)

# --- Detecção de Bolhas com Binarização Adaptativa e Otsu ---

def _find_circles(gray: np.ndarray, min_area: int = 100, max_area: int = 2000) -> List[Tuple[int, int, int, int]]:
    """
    Encontra bolhas usando Binarização Adaptativa para lidar com sombras.
    """
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY_INV, 11, 2
    )
    
    # Limpeza morfológica para remover ruídos pequenos
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
    
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    circles = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if min_area < area < max_area:
            x, y, w, h = cv2.boundingRect(cnt)
            aspect_ratio = float(w)/h
            if 0.7 <= aspect_ratio <= 1.3:
                circles.append((x, y, w, h))
    return circles

def _calculate_fill_percentage(gray: np.ndarray, x: int, y: int, w: int, h: int) -> float:
    """
    Calcula preenchimento usando Método de Otsu local.
    """
    roi = gray[y:y+h, x:x+w]
    if roi.size == 0: return 0.0
    
    # Otsu decide automaticamente o limiar de preto/branco para a bolha
    _, thresh = cv2.threshold(roi, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    
    dark_pixels = cv2.countNonZero(thresh)
    return float(dark_pixels) / roi.size

def detect_bubbles(image: np.ndarray, marked_threshold: float = 0.5) -> BubbleResult:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    
    # ROI: Focar na área de respostas (pula cabeçalho)
    roi_y_start = int(h * 0.25)
    roi_gray = gray[roi_y_start:int(h*0.95), int(w*0.05):int(w*0.95)]
    
    circles_roi = _find_circles(roi_gray)
    if not circles_roi: return BubbleResult(found=False, grids=[])
    
    # Agrupar em linhas
    circles_roi.sort(key=lambda c: c[1])
    rows = []
    curr_row = [circles_roi[0]]
    for i in range(1, len(circles_roi)):
        if abs(circles_roi[i][1] - curr_row[0][1]) < 20:
            curr_row.append(circles_roi[i])
        else:
            rows.append(sorted(curr_row, key=lambda c: c[0]))
            curr_row = [circles_roi[i]]
    rows.append(sorted(curr_row, key=lambda c: c[0]))
    
    grids = []
    for i, row in enumerate(rows):
        if len(row) < 2: continue # Ignorar ruídos que não formam uma linha de respostas
        bubbles = []
        for j, (x, y, bw, bh) in enumerate(row):
            gx, gy = x + int(w*0.05), y + roi_y_start
            fill = _calculate_fill_percentage(gray, gx, gy, bw, bh)
            bubbles.append({
                "col": j, "x": gx + bw//2, "y": gy + bh//2,
                "radius": max(bw, bh)//2, "fill_percentage": fill, 
                "marked": fill >= marked_threshold
            })
        grids.append(BubbleGrid(row=i, bubbles=bubbles))
        
    return BubbleResult(found=len(grids) > 0, grids=grids)

def draw_bubbles(image: np.ndarray, result: BubbleResult) -> np.ndarray:
    annotated = image.copy()
    for grid in result.grids:
        for b in grid.bubbles:
            color = (0, 255, 0) if b["marked"] else (0, 165, 255)
            cv2.circle(annotated, (b["x"], b["y"]), b["radius"], color, 2)
    return annotated

# --- FastAPI Application ---
app = FastAPI(title="Avalia.Edu OMR Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/omr/scan", response_model=ScanResponse)
async def scan_omr_sheet(photo: UploadFile = File(...), debug: bool = False):
    try:
        contents = await photo.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(status_code=400, detail="Imagem inválida.")

        # 1. Detectar Marcadores L
        fiducial = detect_l_markers(image)
        
        # 2. Corrigir Perspectiva
        corrected_image = image
        if fiducial.found:
            try:
                corrected_image = correct_perspective(image, fiducial.corners, 1240, 1754)
            except Exception as e:
                logger.error(f"Erro na perspectiva: {e}")
        
        if corrected_image is image:
            h, w = image.shape[:2]
            scale = 1240 / w
            corrected_image = cv2.resize(image, (1240, int(h * scale)))

        # 3. QR Code
        qr_data = read_qr(corrected_image) or read_qr(image)

        # 4. Bolhas
        bubble_result = detect_bubbles(corrected_image)

        response = ScanResponse(
            success=True,
            qr=qr_data,
            fiducial=fiducial,
            bubbles=bubble_result
        )

        if debug:
            annotated = draw_bubbles(corrected_image, bubble_result)
            annotated = draw_fiducials(annotated, fiducial)
            _, buf = cv2.imencode('.png', annotated)
            response.debug_image = base64.b64encode(buf).decode('utf-8')

        return response

    except Exception as e:
        logger.error(f"Erro: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)