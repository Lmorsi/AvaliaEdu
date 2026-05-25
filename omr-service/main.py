import base64
import logging
from typing import List, Optional, Tuple, Dict, Any

import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

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

def preprocess_for_bubble_detection(image: np.ndarray) -> np.ndarray:
    """
    Pré-processamento para destacar apenas as bolhas/quadrados da folha de respostas.
    """
    # Converter para grayscale
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    
    # Aplicar blur para reduzir ruído
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Usar Canny edge detection para encontrar bordas
    edges = cv2.Canny(blurred, 50, 150)
    
    # Dilatar bordas para conectar contornos
    kernel = np.ones((3, 3), np.uint8)
    dilated = cv2.dilate(edges, kernel, iterations=2)
    
    return dilated

def find_actual_bubbles(image: np.ndarray) -> List[Tuple[int, int, int, int]]:
    """
    Encontra apenas as bolhas/quadrados reais na folha de respostas.
    """
    # Pré-processar
    processed = preprocess_for_bubble_detection(image)
    
    # Encontrar contornos
    contours, _ = cv2.findContours(processed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    actual_bubbles = []
    
    for contour in contours:
        area = cv2.contourArea(contour)
        
        # Filtrar por área (bolhas devem ter tamanho similar)
        # Ajuste esses valores conforme sua imagem
        if area < 50 or area > 800:
            continue
        
        # Obter bounding box
        x, y, w, h = cv2.boundingRect(contour)
        
        # Verificar proporção (bolhas são aproximadamente quadradas)
        aspect_ratio = w / h if h > 0 else 0
        if aspect_ratio < 0.7 or aspect_ratio > 1.3:
            continue
        
        # Verificar se o contorno é convexo (bolhas são convexas)
        if cv2.isContourConvex(contour):
            actual_bubbles.append((x, y, w, h))
    
    return actual_bubbles

def organize_bubbles_in_grid(bubbles: List[Tuple[int, int, int, int]]) -> List[List[Dict[str, Any]]]:
    """
    Organiza as bolhas detectadas em uma grade (linhas e colunas).
    """
    if not bubbles:
        return []
    
    # Ordenar por Y (linha)
    bubbles.sort(key=lambda b: b[1])
    
    # Agrupar por linhas (diferença Y menor que altura média)
    avg_height = np.mean([h for (_, _, _, h) in bubbles])
    y_threshold = avg_height * 0.8  # 80% da altura média
    
    rows = []
    current_row = [bubbles[0]]
    
    for bubble in bubbles[1:]:
        if abs(bubble[1] - current_row[0][1]) <= y_threshold:
            current_row.append(bubble)
        else:
            # Ordenar linha por X
            current_row.sort(key=lambda b: b[0])
            rows.append(current_row)
            current_row = [bubble]
    
    # Adicionar última linha
    if current_row:
        current_row.sort(key=lambda b: b[0])
        rows.append(current_row)
    
    # Filtrar linhas com número adequado de bolhas (geralmente 5)
    rows = [row for row in rows if len(row) >= 3]  # Mínimo 3 bolhas por linha
    
    return rows

def analyze_bubble_fill(image: np.ndarray, x: int, y: int, w: int, h: int) -> float:
    """
    Analisa se uma bolha está preenchida com base na escuridão da região.
    """
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    
    # Extrair região da bolha
    y1 = max(0, y)
    y2 = min(gray.shape[0], y + h)
    x1 = max(0, x)
    x2 = min(gray.shape[1], x + w)
    
    roi = gray[y1:y2, x1:x2]
    
    if roi.size == 0:
        return 0.0
    
    # Calcular média de intensidade
    mean_intensity = np.mean(roi)
    
    # Quanto mais escuro (menor valor), mais preenchido
    # Normalizar: 0 = branco (não preenchido), 1 = preto (completamente preenchido)
    fill_percentage = 1.0 - (mean_intensity / 255.0)
    
    return min(1.0, max(0.0, fill_percentage))

def detect_prefilled_bubbles(image: np.ndarray) -> List[List[Dict[str, Any]]]:
    """
    Pipeline completa de detecção de bolhas.
    """
    # 1. Encontrar todas as bolhas na imagem
    bubbles = find_actual_bubbles(image)
    
    if not bubbles:
        logger.warning("Nenhuma bolha encontrada na imagem")
        return []
    
    logger.info(f"Encontradas {len(bubbles)} bolhas potenciais")
    
    # 2. Organizar em grid
    grid = organize_bubbles_in_grid(bubbles)
    
    if not grid:
        logger.warning("Não foi possível organizar bolhas em grid")
        return []
    
    logger.info(f"Organizadas em {len(grid)} linhas")
    
    # 3. Analisar preenchimento de cada bolha
    result_grid = []
    
    for row_idx, row in enumerate(grid):
        result_row = []
        
        for col_idx, (x, y, w, h) in enumerate(row):
            # Analisar quão preenchida está a bolha
            fill_pct = analyze_bubble_fill(image, x, y, w, h)
            
            # Determinar se está marcada (threshold de 20% de preenchimento)
            is_marked = fill_pct > 0.20
            
            # Centro da bolha
            center_x = x + w // 2
            center_y = y + h // 2
            
            result_row.append({
                "col": col_idx,
                "row": row_idx,
                "x": int(center_x),
                "y": int(center_y),
                "width": int(w),
                "height": int(h),
                "fill_percentage": float(fill_pct),
                "marked": bool(is_marked)
            })
            
            logger.debug(f"Bolha L{row_idx}C{col_idx}: preenchimento={fill_pct:.2%}, marcada={is_marked}")
        
        result_grid.append(result_row)
    
    return result_grid

def draw_bubbles_on_image(image: np.ndarray, bubbles_grid: List[List[Dict[str, Any]]]) -> np.ndarray:
    """
    Desenha as bolhas detectadas na imagem para visualização.
    """
    annotated = image.copy()
    
    colors = {
        "marked": (0, 255, 0),   # Verde
        "unmarked": (0, 0, 255), # Vermelho
    }
    
    for row in bubbles_grid:
        for bubble in row:
            x = bubble["x"] - bubble["width"] // 2
            y = bubble["y"] - bubble["height"] // 2
            w = bubble["width"]
            h = bubble["height"]
            
            color = colors["marked"] if bubble["marked"] else colors["unmarked"]
            
            # Desenhar retângulo ao redor da bolha
            cv2.rectangle(annotated, (x, y), (x + w, y + h), color, 2)
            
            # Adicionar porcentagem de preenchimento
            text = f"{bubble['fill_percentage']:.0%}"
            cv2.putText(annotated, text, (bubble["x"] - 15, bubble["y"] - 5),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)
    
    # Adicionar legenda
    cv2.putText(annotated, "VERDE: Marcada | VERMELHO: Nao marcada",
               (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
    
    return annotated

@app.post("/api/omr/scan")
async def scan_omr_sheet(photo: UploadFile = File(...), debug: bool = False):
    try:
        # 1. Carregar imagem
        contents = await photo.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Não foi possível decodificar a imagem")
        
        logger.info(f"Imagem carregada: {image.shape}")
        
        # 2. Redimensionar para tamanho padrão (opcional)
        max_dimension = 1200
        h, w = image.shape[:2]
        if max(w, h) > max_dimension:
            scale = max_dimension / max(w, h)
            new_w = int(w * scale)
            new_h = int(h * scale)
            image = cv2.resize(image, (new_w, new_h))
            logger.info(f"Imagem redimensionada para: {image.shape}")
        
        # 3. Detectar e analisar bolhas
        bubbles_grid = detect_prefilled_bubbles(image)
        
        if not bubbles_grid:
            raise HTTPException(status_code=400, detail="Não foi possível detectar bolhas na imagem")
        
        # 4. Preparar resposta
        response_data = {
            "status": "success",
            "total_rows": len(bubbles_grid),
            "total_bubbles": sum(len(row) for row in bubbles_grid),
            "bubbles": []
        }
        
        # Adicionar dados das bolhas
        for row in bubbles_grid:
            for bubble in row:
                response_data["bubbles"].append(bubble)
        
        # 5. Adicionar imagens de debug se solicitado
        if debug:
            annotated_image = draw_bubbles_on_image(image, bubbles_grid)
            _, annotated_encoded = cv2.imencode('.png', annotated_image)
            response_data["debug_image"] = base64.b64encode(annotated_encoded).decode('utf-8')
            response_data["corrected_image"] = base64.b64encode(annotated_encoded).decode('utf-8')
        
        logger.info(f"Processamento concluído: {len(bubbles_grid)} linhas, {response_data['total_bubbles']} bolhas")
        
        return JSONResponse(content=response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no processamento: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "OMR Bubble Detector"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")