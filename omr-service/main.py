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

def detect_bubbles_robust(image: np.ndarray) -> Tuple[List[List[Dict[str, Any]]], np.ndarray]:
    """
    Detecta bolhas usando múltiplas estratégias.
    Retorna (grid_detected, imagem_processada)
    """
    # Converter para grayscale
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    
    h, w = gray.shape
    
    # Estratégia 1: Tentar encontrar bolhas por contornos circulares
    circles = detect_circles_hough(gray)
    
    if circles and len(circles) >= 15:  # Pelo menos 15 bolhas (3x5)
        logger.info(f"Detectadas {len(circles)} bolhas via Hough Circles")
        grid = organize_circles_in_grid(circles, h, w)
        if grid:
            return analyze_grid_fill(image, grid), draw_grid_on_image(image, grid)
    
    # Estratégia 2: Usar threshold adaptativo e encontrar retângulos
    bubbles = find_bubbles_by_threshold(gray)
    
    if bubbles and len(bubbles) >= 15:
        logger.info(f"Detectadas {len(bubbles)} bolhas via threshold")
        grid = organize_bubbles_in_grid(bubbles, h, w)
        if grid:
            return analyze_grid_fill(image, grid), draw_grid_on_image(image, grid)
    
    # Estratégia 3: Criar grade baseada na estrutura esperada (5x5)
    logger.info("Usando grade fixa baseada na estrutura esperada")
    grid = create_expected_grid(h, w, rows=5, cols=5)
    return analyze_grid_fill(image, grid), draw_grid_on_image(image, grid)

def detect_circles_hough(gray: np.ndarray) -> List[Tuple[int, int, int]]:
    """
    Detecta círculos usando Transformada de Hough.
    """
    # Aplicar blur para reduzir ruído
    blurred = cv2.medianBlur(gray, 5)
    
    # Detectar círculos
    circles = cv2.HoughCircles(
        blurred,
        cv2.HOUGH_GRADIENT,
        dp=1,
        minDist=20,
        param1=50,
        param2=30,
        minRadius=8,
        maxRadius=30
    )
    
    if circles is not None:
        circles = np.round(circles[0, :]).astype("int")
        return [(x, y, r) for x, y, r in circles]
    
    return []

def find_bubbles_by_threshold(gray: np.ndarray) -> List[Tuple[int, int, int, int]]:
    """
    Encontra bolhas usando threshold adaptativo.
    """
    # Aplicar threshold adaptativo
    thresh = cv2.adaptiveThreshold(gray, 255, 
                                   cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                   cv2.THRESH_BINARY_INV, 11, 2)
    
    # Operações morfológicas
    kernel = np.ones((3, 3), np.uint8)
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
    
    # Encontrar contornos
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    bubbles = []
    for contour in contours:
        area = cv2.contourArea(contour)
        
        # Filtrar por área
        if area < 50 or area > 800:
            continue
        
        x, y, w, h = cv2.boundingRect(contour)
        
        # Verificar proporção
        aspect_ratio = w / h if h > 0 else 0
        if 0.5 < aspect_ratio < 1.5:
            bubbles.append((x, y, w, h))
    
    return bubbles

def organize_circles_in_grid(circles: List[Tuple[int, int, int]], h: int, w: int) -> List[List[Tuple[int, int, int]]]:
    """
    Organiza círculos detectados em uma grid.
    """
    # Ordenar por Y
    circles.sort(key=lambda c: c[1])
    
    # Agrupar por linhas
    rows = []
    current_row = [circles[0]]
    y_threshold = 20
    
    for circle in circles[1:]:
        if abs(circle[1] - current_row[0][1]) <= y_threshold:
            current_row.append(circle)
        else:
            if len(current_row) >= 3:
                current_row.sort(key=lambda c: c[0])  # Ordenar por X
                rows.append(current_row)
            current_row = [circle]
    
    if len(current_row) >= 3:
        current_row.sort(key=lambda c: c[0])
        rows.append(current_row)
    
    # Garantir que temos 5 linhas
    if len(rows) < 5:
        # Criar linhas faltantes baseadas na média
        avg_y_spacing = (rows[-1][0][1] - rows[0][0][1]) / (len(rows) - 1) if len(rows) > 1 else 50
        expected_rows = []
        
        for i in range(5):
            target_y = rows[0][0][1] + (i * avg_y_spacing)
            closest_row = min(rows, key=lambda r: abs(r[0][1] - target_y))
            expected_rows.append(closest_row)
        
        rows = expected_rows
    
    return rows

def organize_bubbles_in_grid(bubbles: List[Tuple[int, int, int, int]], h: int, w: int) -> List[List[Tuple[int, int, int, int]]]:
    """
    Organiza bounding boxes em grid.
    """
    if not bubbles:
        return []
    
    # Calcular centros
    centers = [(x + w//2, y + h//2, w, h) for (x, y, w, h) in bubbles]
    
    # Ordenar por Y
    centers.sort(key=lambda c: c[1])
    
    # Agrupar por linhas
    rows = []
    current_row = [centers[0]]
    y_threshold = 30
    
    for center in centers[1:]:
        if abs(center[1] - current_row[0][1]) <= y_threshold:
            current_row.append(center)
        else:
            if len(current_row) >= 3:
                current_row.sort(key=lambda c: c[0])  # Ordenar por X
                rows.append(current_row)
            current_row = [center]
    
    if len(current_row) >= 3:
        current_row.sort(key=lambda c: c[0])
        rows.append(current_row)
    
    # Garantir formato 5x5
    if len(rows) != 5:
        logger.warning(f"Esperadas 5 linhas, encontradas {len(rows)}")
    
    return rows

def create_expected_grid(h: int, w: int, rows: int = 5, cols: int = 5) -> List[List[Tuple[int, int, int, int]]]:
    """
    Cria uma grade baseada na estrutura esperada da folha de respostas.
    """
    # Definir região das respostas (ajustar percentuais conforme necessário)
    start_y = int(h * 0.30)  # 30% do topo
    end_y = int(h * 0.85)    # 85% do topo
    start_x = int(w * 0.10)  # 10% da esquerda
    end_x = int(w * 0.90)    # 90% da esquerda
    
    cell_height = (end_y - start_y) // rows
    cell_width = (end_x - start_x) // cols
    
    grid = []
    for row in range(rows):
        grid_row = []
        for col in range(cols):
            x = start_x + col * cell_width + cell_width // 2 - 15
            y = start_y + row * cell_height + cell_height // 2 - 15
            w_cell = cell_width
            h_cell = cell_height
            
            grid_row.append((x, y, w_cell, h_cell))
        grid.append(grid_row)
    
    return grid

def analyze_grid_fill(image: np.ndarray, grid: List[List[Tuple[int, int, int, int]]]) -> List[List[Dict[str, Any]]]:
    """
    Analisa o preenchimento de cada célula da grid.
    """
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image
    
    result_grid = []
    
    for row_idx, row in enumerate(grid):
        result_row = []
        
        for col_idx, (x, y, w, h) in enumerate(row):
            # Extrair região
            y1 = max(0, y)
            y2 = min(gray.shape[0], y + h)
            x1 = max(0, x)
            x2 = min(gray.shape[1], x + w)
            
            roi = gray[y1:y2, x1:x2]
            
            if roi.size == 0:
                fill_pct = 0.0
            else:
                # Calcular média de intensidade
                mean_intensity = np.mean(roi)
                # Converter para porcentagem de preenchimento
                fill_pct = 1.0 - (mean_intensity / 255.0)
                fill_pct = min(1.0, max(0.0, fill_pct))
            
            # Determinar se está marcada
            is_marked = fill_pct > 0.20
            
            # Centro
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
        
        result_grid.append(result_row)
    
    return result_grid

def draw_grid_on_image(image: np.ndarray, grid: List[List[Tuple[int, int, int, int]]]) -> np.ndarray:
    """
    Desenha a grid na imagem para visualização.
    """
    annotated = image.copy()
    
    for row in grid:
        for (x, y, w, h) in row:
            cv2.rectangle(annotated, (x, y), (x + w, y + h), (255, 0, 0), 1)
    
    return annotated

def draw_results_on_image(image: np.ndarray, results_grid: List[List[Dict[str, Any]]]) -> np.ndarray:
    """
    Desenha os resultados da análise na imagem.
    """
    annotated = image.copy()
    
    colors = {
        "marked": (0, 255, 0),   # Verde
        "unmarked": (0, 0, 255), # Vermelho
    }
    
    for row in results_grid:
        for bubble in row:
            x = bubble["x"] - bubble["width"] // 2
            y = bubble["y"] - bubble["height"] // 2
            w = bubble["width"]
            h = bubble["height"]
            
            color = colors["marked"] if bubble["marked"] else colors["unmarked"]
            
            # Desenhar retângulo
            cv2.rectangle(annotated, (x, y), (x + w, y + h), color, 2)
            
            # Adicionar porcentagem
            text = f"{bubble['fill_percentage']:.0%}"
            cv2.putText(annotated, text, (bubble["x"] - 15, bubble["y"] - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)
    
    # Legenda
    cv2.putText(annotated, "VERDE: Marcada | VERMELHO: Nao marcada",
               (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
    
    return annotated

@app.post("/api/omr/scan")
async def scan_omr_sheet(photo: UploadFile = File(...), debug: bool = False):
    try:
        # Carregar imagem
        contents = await photo.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Não foi possível decodificar a imagem")
        
        logger.info(f"Imagem carregada: {image.shape}")
        
        # Redimensionar para facilitar processamento
        scale_factor = 800 / min(image.shape[0], image.shape[1])
        new_width = int(image.shape[1] * scale_factor)
        new_height = int(image.shape[0] * scale_factor)
        image = cv2.resize(image, (new_width, new_height))
        
        logger.info(f"Imagem redimensionada para: {image.shape}")
        
        # Detectar e analisar bolhas
        results_grid, debug_grid = detect_bubbles_robust(image)
        
        if not results_grid:
            raise HTTPException(status_code=400, detail="Não foi possível detectar as bolhas na imagem")
        
        # Preparar resposta
        response_data = {
            "status": "success",
            "total_rows": len(results_grid),
            "total_bubbles": sum(len(row) for row in results_grid),
            "bubbles": []
        }
        
        for row in results_grid:
            for bubble in row:
                response_data["bubbles"].append(bubble)
        
        # Adicionar imagens de debug
        if debug:
            # Imagem com grade
            _, grid_encoded = cv2.imencode('.png', debug_grid)
            response_data["debug_image"] = base64.b64encode(grid_encoded).decode('utf-8')
            
            # Imagem com resultados
            result_image = draw_results_on_image(image, results_grid)
            _, result_encoded = cv2.imencode('.png', result_image)
            response_data["corrected_image"] = base64.b64encode(result_encoded).decode('utf-8')
        
        logger.info(f"Processamento concluído: {len(results_grid)} linhas, {response_data['total_bubbles']} bolhas")
        
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