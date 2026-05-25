import base64
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

def detect_grid_by_template(image: np.ndarray) -> Tuple[bool, List[List[Tuple[int, int, int, int]]]]:
    """
    Detecta a grade de respostas baseado em busca por regiões escuras.
    Método simples mas eficaz.
    """
    if image is None:
        return False, []
    
    # Converter para escala de cinza
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    
    h, w = gray.shape
    
    # Aplicar threshold para destacar regiões escuras (marcações)
    # Usar um threshold mais baixo para capturar marcações leves
    _, thresh = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY_INV)
    
    # Encontrar todos os contornos
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Filtrar contornos por área (ajustar conforme necessário)
    min_area = 30
    max_area = 3000
    
    valid_contours = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if min_area < area < max_area:
            x, y, w_box, h_box = cv2.boundingRect(contour)
            valid_contours.append((x, y, w_box, h_box, area))
    
    if len(valid_contours) < 10:
        logger.warning(f"Poucos contornos detectados: {len(valid_contours)}")
        return False, []
    
    # Organizar por linha (baseado na coordenada Y)
    valid_contours.sort(key=lambda c: c[1])  # Ordenar por Y
    
    # Agrupar em linhas
    rows = []
    current_row = [valid_contours[0]]
    y_threshold = 30  # Tolerância para mesma linha
    
    for contour in valid_contours[1:]:
        if abs(contour[1] - current_row[0][1]) <= y_threshold:
            current_row.append(contour)
        else:
            if len(current_row) >= 3:  # Pelo menos 3 itens por linha
                # Ordenar por X e limpar dados
                current_row.sort(key=lambda c: c[0])
                rows.append([(c[0], c[1], c[2], c[3]) for c in current_row])
            current_row = [contour]
    
    # Adicionar última linha
    if len(current_row) >= 3:
        current_row.sort(key=lambda c: c[0])
        rows.append([(c[0], c[1], c[2], c[3]) for c in current_row])
    
    logger.info(f"Detectadas {len(rows)} linhas de possíveis respostas")
    
    return len(rows) > 0, rows

def analyze_bubble_marking(gray: np.ndarray, x: int, y: int, w: int, h: int) -> float:
    """
    Analisa se uma região está marcada baseado na escuridão dos pixels.
    Retorna porcentagem de marcação.
    """
    # Extrair a região
    y1 = max(0, y)
    y2 = min(gray.shape[0], y + h)
    x1 = max(0, x)
    x2 = min(gray.shape[1], x + w)
    
    roi = gray[y1:y2, x1:x2]
    
    if roi.size == 0:
        return 0.0
    
    # Calcular a média de intensidade (0=preto, 255=branco)
    mean_intensity = np.mean(roi)
    
    # Quanto mais baixa a média, mais escura (marcada)
    # Normalizar: 0 = completamente branco, 1 = completamente preto
    darkness = 1.0 - (mean_intensity / 255.0)
    
    # Aplicar um fator de correção
    # Se a região for muito pequena, ajustar
    if roi.size < 50:
        darkness = darkness * 1.2
    
    return min(1.0, max(0.0, darkness))

def detect_answer_regions_simple(image: np.ndarray) -> BubbleResult:
    """
    Método simplificado para detectar regiões de resposta.
    """
    if image is None:
        return BubbleResult(found=False, grids=[])
    
    # Converter para grayscale
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    
    h, w = gray.shape
    
    # Abordagem 1: Dividir a imagem em uma grade fixa
    # Assumindo que as respostas estão em uma região específica
    
    # Definir a região onde as bolhas estão (ajustar conforme seu cartão)
    # Pular cabeçalho (20% superior) e rodapé (15% inferior)
    start_y = int(h * 0.20)
    end_y = int(h * 0.85)
    start_x = int(w * 0.10)
    end_x = int(w * 0.90)
    
    # Número esperado de linhas e colunas
    expected_rows = 5
    expected_cols = 5
    
    # Calcular tamanho de cada célula
    cell_height = (end_y - start_y) // expected_rows
    cell_width = (end_x - start_x) // expected_cols
    
    # Analisar cada célula
    grids = []
    
    for row in range(expected_rows):
        grid_row = []
        y1 = start_y + (row * cell_height)
        y2 = y1 + cell_height
        
        for col in range(expected_cols):
            x1 = start_x + (col * cell_width)
            x2 = x1 + cell_width
            
            # Analisar a região
            fill_pct = analyze_bubble_marking(gray, x1, y1, cell_width, cell_height)
            
            # Determinar se está marcada (limiar de 15% de escuridão)
            is_marked = fill_pct > 0.15
            
            # Centro da região
            center_x = x1 + cell_width // 2
            center_y = y1 + cell_height // 2
            
            grid_row.append({
                "col": col,
                "x": center_x,
                "y": center_y,
                "radius": min(cell_width, cell_height) // 2,
                "fill_percentage": fill_pct,
                "marked": is_marked,
            })
        
        grids.append(BubbleGrid(row=row, bubbles=grid_row))
    
    logger.info(f"Análise concluída: {len(grids)} linhas, cada uma com {len(grids[0].bubbles) if grids else 0} colunas")
    
    return BubbleResult(found=True, grids=grids)

def detect_answer_regions_contour(image: np.ndarray) -> BubbleResult:
    """
    Método baseado em contornos para detectar as bolhas.
    """
    if image is None:
        return BubbleResult(found=False, grids=[])
    
    # Converter para grayscale
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    
    h, w = gray.shape
    
    # Suavizar a imagem
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Aplicar threshold adaptativo
    thresh = cv2.adaptiveThreshold(blurred, 255, 
                                   cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                   cv2.THRESH_BINARY_INV, 11, 2)
    
    # Operações morfológicas para limpar ruído
    kernel = np.ones((2, 2), np.uint8)
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
    
    # Encontrar contornos
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Filtrar contornos que parecem bolhas
    bubbles = []
    min_area = 30
    max_area = 1000
    
    for contour in contours:
        area = cv2.contourArea(contour)
        if min_area < area < max_area:
            x, y, w_box, h_box = cv2.boundingRect(contour)
            # Verificar proporção
            aspect_ratio = w_box / h_box if h_box > 0 else 0
            if 0.5 < aspect_ratio < 2.0:  # Tolerante para diferentes formas
                bubbles.append((x, y, w_box, h_box))
    
    if len(bubbles) < 5:
        logger.warning(f"Poucas bolhas detectadas via contorno: {len(bubbles)}")
        return BubbleResult(found=False, grids=[])
    
    # Organizar em grid
    bubbles.sort(key=lambda b: b[1])  # Ordenar por Y
    
    # Agrupar por linhas
    rows = []
    current_row = [bubbles[0]]
    y_tolerance = 20
    
    for bubble in bubbles[1:]:
        if abs(bubble[1] - current_row[0][1]) <= y_tolerance:
            current_row.append(bubble)
        else:
            if len(current_row) >= 3:
                current_row.sort(key=lambda b: b[0])  # Ordenar por X
                rows.append(current_row)
            current_row = [bubble]
    
    if len(current_row) >= 3:
        current_row.sort(key=lambda b: b[0])
        rows.append(current_row)
    
    if not rows:
        return BubbleResult(found=False, grids=[])
    
    # Analisar cada bolha
    grids = []
    for row_idx, row in enumerate(rows):
        grid_row = []
        for col_idx, (x, y, w_box, h_box) in enumerate(row):
            # Analisar preenchimento
            fill_pct = analyze_bubble_marking(gray, x, y, w_box, h_box)
            is_marked = fill_pct > 0.15
            
            center_x = x + w_box // 2
            center_y = y + h_box // 2
            
            grid_row.append({
                "col": col_idx,
                "x": center_x,
                "y": center_y,
                "radius": max(w_box, h_box) // 2,
                "fill_percentage": fill_pct,
                "marked": is_marked,
            })
        grids.append(BubbleGrid(row=row_idx, bubbles=grid_row))
    
    return BubbleResult(found=True, grids=grids)

@app.post("/api/omr/scan")
async def scan_omr_sheet(photo: UploadFile = File(...), debug: bool = False):
    try:
        # Ler imagem
        contents = await photo.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Não foi possível decodificar a imagem")
        
        logger.info(f"Imagem carregada: {image.shape}")
        
        # Redimensionar se necessário
        max_size = 1200
        h, w = image.shape[:2]
        if max(w, h) > max_size:
            scale = max_size / max(w, h)
            new_w = int(w * scale)
            new_h = int(h * scale)
            image = cv2.resize(image, (new_w, new_h))
            logger.info(f"Imagem redimensionada para: {image.shape}")
        
        # Tentar detectar por diferentes métodos
        result = detect_answer_regions_simple(image)
        
        if not result.found or len(result.grids) == 0:
            logger.info("Método simples falhou, tentando método de contornos")
            result = detect_answer_regions_contour(image)
        
        # Preparar resposta
        response_data = {
            "status": "success",
            "bubbles": result.dict(),
        }
        
        if debug:
            # Criar imagem anotada
            annotated = image.copy()
            
            colors = {
                "marked": (0, 255, 0),   # Verde
                "unmarked": (0, 0, 255), # Vermelho
            }
            
            for grid in result.grids:
                for bubble in grid.bubbles:
                    cx = bubble["x"]
                    cy = bubble["y"]
                    radius = bubble["radius"]
                    color = colors["marked"] if bubble["marked"] else colors["unmarked"]
                    
                    # Desenhar retângulo/círculo
                    cv2.circle(annotated, (cx, cy), radius, color, 2)
                    
                    # Adicionar porcentagem
                    fill_pct = bubble["fill_percentage"]
                    text = f"{fill_pct:.0%}"
                    cv2.putText(annotated, text, (cx - 15, cy - 10), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)
            
            # Adicionar legenda
            cv2.putText(annotated, "VERDE: Marcada | VERMELHO: Nao marcada", 
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
            
            # Codificar para base64
            _, annotated_encoded = cv2.imencode('.png', annotated)
            response_data["debug_image"] = base64.b64encode(annotated_encoded).decode('utf-8')
            response_data["corrected_image"] = base64.b64encode(annotated_encoded).decode('utf-8')
        
        return JSONResponse(content=response_data)
        
    except Exception as e:
        logger.error(f"Erro: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")