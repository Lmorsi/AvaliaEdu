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

def detect_answer_regions_simple(image: np.ndarray) -> Tuple[bool, List[List[Dict[str, Any]]]]:
    """
    Método simplificado para detectar regiões de resposta.
    Retorna tupla (sucesso, lista de grades)
    """
    if image is None:
        return False, []
    
    # Converter para grayscale
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    
    h, w = gray.shape
    
    # Definir a região onde as bolhas estão
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
            
            # Extrair a região
            roi = gray[y1:y2, x1:x2]
            
            if roi.size == 0:
                fill_pct = 0.0
            else:
                # Calcular a média de intensidade (0=preto, 255=branco)
                mean_intensity = np.mean(roi)
                # Quanto mais baixa a média, mais escura (marcada)
                # Normalizar: 0 = completamente branco, 1 = completamente preto
                darkness = 1.0 - (mean_intensity / 255.0)
                # Aplicar um fator de correção
                if roi.size < 50:
                    darkness = darkness * 1.2
                fill_pct = float(min(1.0, max(0.0, darkness)))
            
            # Determinar se está marcada (limiar de 15% de escuridão)
            is_marked = fill_pct > 0.15
            
            # Centro da região
            center_x = int(x1 + cell_width // 2)
            center_y = int(y1 + cell_height // 2)
            
            grid_row.append({
                "col": int(col),
                "x": int(center_x),
                "y": int(center_y),
                "radius": int(min(cell_width, cell_height) // 2),
                "fill_percentage": float(fill_pct),
                "marked": bool(is_marked),
            })
        
        grids.append(grid_row)
    
    logger.info(f"Análise concluída: {len(grids)} linhas, cada uma com {len(grids[0]) if grids else 0} colunas")
    
    return True, grids

def detect_answer_regions_contour(image: np.ndarray) -> Tuple[bool, List[List[Dict[str, Any]]]]:
    """
    Método baseado em contornos para detectar as bolhas.
    """
    if image is None:
        return False, []
    
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
            if 0.5 < aspect_ratio < 2.0:
                bubbles.append((x, y, w_box, h_box))
    
    if len(bubbles) < 5:
        logger.warning(f"Poucas bolhas detectadas via contorno: {len(bubbles)}")
        return False, []
    
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
        return False, []
    
    # Analisar cada bolha
    grids = []
    for row_idx, row in enumerate(rows):
        grid_row = []
        for col_idx, (x, y, w_box, h_box) in enumerate(row):
            # Analisar preenchimento
            roi = gray[y:y+h_box, x:x+w_box]
            
            if roi.size == 0:
                fill_pct = 0.0
            else:
                mean_intensity = np.mean(roi)
                darkness = 1.0 - (mean_intensity / 255.0)
                if roi.size < 50:
                    darkness = darkness * 1.2
                fill_pct = float(min(1.0, max(0.0, darkness)))
            
            is_marked = fill_pct > 0.15
            
            center_x = int(x + w_box // 2)
            center_y = int(y + h_box // 2)
            
            grid_row.append({
                "col": int(col_idx),
                "x": int(center_x),
                "y": int(center_y),
                "radius": int(max(w_box, h_box) // 2),
                "fill_percentage": float(fill_pct),
                "marked": bool(is_marked),
            })
        grids.append(grid_row)
    
    return True, grids

def draw_annotated_image(image: np.ndarray, grids: List[List[Dict[str, Any]]]) -> np.ndarray:
    """Desenha as bolhas detectadas na imagem."""
    annotated = image.copy()
    
    colors = {
        "marked": (0, 255, 0),   # Verde
        "unmarked": (0, 0, 255), # Vermelho
    }
    
    for row in grids:
        for bubble in row:
            cx = bubble["x"]
            cy = bubble["y"]
            radius = bubble["radius"]
            color = colors["marked"] if bubble["marked"] else colors["unmarked"]
            
            # Desenhar círculo
            cv2.circle(annotated, (cx, cy), radius, color, 2)
            
            # Adicionar porcentagem
            fill_pct = bubble["fill_percentage"]
            text = f"{fill_pct:.0%}"
            cv2.putText(annotated, text, (cx - 15, cy - 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)
    
    # Adicionar legenda
    cv2.putText(annotated, "VERDE: Marcada | VERMELHO: Nao marcada", 
               (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
    
    return annotated

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
        success, grids = detect_answer_regions_simple(image)
        
        if not success or not grids:
            logger.info("Método simples falhou, tentando método de contornos")
            success, grids = detect_answer_regions_contour(image)
        
        if not success or not grids:
            raise HTTPException(status_code=400, detail="Não foi possível detectar as regiões de resposta")
        
        # Preparar resultado no formato esperado
        bubbles_data = {
            "found": True,
            "grids": []
        }
        
        for row_idx, row in enumerate(grids):
            bubbles_data["grids"].append({
                "row": row_idx,
                "bubbles": row
            })
        
        # Preparar resposta
        response_data = {
            "status": "success",
            "bubbles": bubbles_data,
        }
        
        if debug:
            # Criar imagem anotada
            annotated = draw_annotated_image(image, grids)
            
            # Codificar para base64
            _, annotated_encoded = cv2.imencode('.png', annotated)
            response_data["debug_image"] = base64.b64encode(annotated_encoded).decode('utf-8')
            response_data["corrected_image"] = base64.b64encode(annotated_encoded).decode('utf-8')
        
        return JSONResponse(content=response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")