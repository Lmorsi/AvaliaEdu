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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Modelos de Dados ---

class Bubble(BaseModel):
    col: int
    x: int
    y: int
    radius: int
    fill_percentage: float
    marked: bool

class BubbleGrid(BaseModel):
    row: int
    bubbles: List[Bubble]

class BubbleResult(BaseModel):
    found: bool
    grids: List[BubbleGrid]
    debug_info: Dict[str, Any] = {}

# --- Pré-processamento de Imagem ---

def preprocess_image(image: np.ndarray) -> np.ndarray:
    """Melhora o contraste e reduz ruídos para melhor detecção"""
    try:
        # Equalização de histograma adaptativa no canal L do LAB
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        l = clahe.apply(l)
        enhanced = cv2.merge([l, a, b])
        enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
        
        # Redução de ruído preservando bordas
        denoised = cv2.bilateralFilter(enhanced, 9, 75, 75)
        
        return denoised
    except Exception as e:
        logger.warning(f"Erro no pré-processamento: {e}")
        return image

def enhance_for_detection(gray: np.ndarray) -> np.ndarray:
    """Aprimora a imagem para melhor detecção de bordas"""
    # Equalização de histograma para melhorar contraste
    equalized = cv2.equalizeHist(gray)
    
    # Suavização para reduzir ruído
    blurred = cv2.GaussianBlur(equalized, (3, 3), 0)
    
    # Nitidez para realçar bordas
    kernel = np.array([[-1,-1,-1],
                       [-1, 9,-1],
                       [-1,-1,-1]])
    sharpened = cv2.filter2D(blurred, -1, kernel)
    
    return sharpened

# --- Detecção de Marcas Fiduciais ---

def find_fiducial_markers(image: np.ndarray) -> Optional[np.ndarray]:
    """
    Procura as marcas fiduciais com tolerância a marcadores encostados nas bordas da foto.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape
    
    # Binarização adaptativa com bloco maior para lidar com sombras de dobra de papel
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 25, 5
    )
    
    # Expandido para 25% para garantir a captura mesmo que a folha esteja muito próxima
    offset_h = int(height * 0.25)
    offset_w = int(width * 0.25)
    
    corners_rois = {
        "TL": (0, 0, offset_w, offset_h),
        "TR": (width - offset_w, 0, width, offset_h),
        "BR": (width - offset_w, height - offset_h, width, height),
        "BL": (0, height - offset_h, offset_w, height)
    }
    
    final_markers = {}
    
    for corner, (x1, y1, x2, y2) in corners_rois.items():
        roi_thresh = thresh[y1:y2, x1:x2]
        
        # Adiciona uma borda artificial branca de 2px ao redor da ROI
        roi_padded = cv2.copyMakeBorder(roi_thresh, 2, 2, 2, 2, cv2.BORDER_CONSTANT, value=0)
        
        contours, _ = cv2.findContours(roi_padded, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        best_candidate = None
        max_score = -1
        
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < 40 or area > (offset_h * offset_w * 0.30):
                continue
                
            perimeter = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, 0.06 * perimeter, True)
            
            if 4 <= len(approx) <= 7:
                x, y, w, h = cv2.boundingRect(approx)
                aspect_ratio = float(w) / h if h > 0 else 0
                
                if 0.6 <= aspect_ratio <= 1.4:
                    score = area / (w * h)
                    if score > max_score:
                        max_score = score
                        M = cv2.moments(contour)
                        if M["m00"] != 0:
                            cX = int(M["m10"] / M["m00"]) - 2 + x1
                            cY = int(M["m01"] / M["m00"]) - 2 + y1
                            best_candidate = [cX, cY]
                            
        if best_candidate:
            final_markers[corner] = best_candidate

    if len(final_markers) == 4:
        return np.array([
            final_markers["TL"], final_markers["TR"],
            final_markers["BR"], final_markers["BL"]
        ], dtype="float32")

    logger.warning(f"Falha na detecção completa. Encontrados apenas: {list(final_markers.keys())}")
    return None

def correct_perspective(image: np.ndarray, corners: np.ndarray, target_width: int = 800, target_height: int = 1100) -> Optional[np.ndarray]:
    """Corrige a perspectiva da imagem usando os pontos de referência"""
    dst_pts = np.array([[0, 0], [target_width, 0], [target_width, target_height], [0, target_height]], dtype="float32")
    matrix = cv2.getPerspectiveTransform(corners, dst_pts)
    if matrix is None:
        return None
    return cv2.warpPerspective(image, matrix, (target_width, target_height), flags=cv2.INTER_LINEAR)

# --- Detecção de Bolhas ---

def _find_checkboxes(gray: np.ndarray, min_area: int = 50, max_area: int = 2500, is_fallback: bool = False) -> List[Tuple[int, int, int, int]]:
    """Encontra as bolhas com parâmetros flexíveis"""
    # Aprimora a imagem para detecção
    enhanced_gray = enhance_for_detection(gray)
    
    # Binarização adaptativa
    thresh = cv2.adaptiveThreshold(
        enhanced_gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY_INV, 15, 5
    )
    
    # Operações morfológicas para limpar ruído
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=1)
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel, iterations=1)
    
    # Detectar contornos
    contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Ajustar proporções baseado no fallback
    min_ratio = 0.55 if is_fallback else 0.65
    max_ratio = 1.55 if is_fallback else 1.45
    
    checkboxes = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if not (min_area < area < max_area):
            continue
            
        x, y, w, h = cv2.boundingRect(contour)
        
        # Evitar detecções muito pequenas
        if w < 10 or h < 10:
            continue
            
        aspect_ratio = float(w) / h if h > 0 else 0
        if aspect_ratio < min_ratio or aspect_ratio > max_ratio:
            continue
            
        # Verificar circularidade para bolhas (opcional)
        perimeter = cv2.arcLength(contour, True)
        if perimeter > 0:
            circularity = 4 * np.pi * area / (perimeter * perimeter)
            if circularity < 0.3:  # Muito alongado, provavelmente não é uma bolha
                continue
        
        checkboxes.append((x, y, w, h))
    
    return checkboxes

def _calculate_fill_percentage(gray: np.ndarray, x: int, y: int, w: int, h: int, threshold: int = 135) -> float:
    """Calcula a porcentagem de preenchimento de uma bolha"""
    # Adicionar margem para considerar apenas o interior
    margin = max(1, int(min(w, h) * 0.15))
    y1 = max(0, y + margin)
    y2 = min(gray.shape[0], y + h - margin)
    x1 = max(0, x + margin)
    x2 = min(gray.shape[1], x + w - margin)
    
    if y2 <= y1 or x2 <= x1:
        return 0.0
    
    roi = gray[y1:y2, x1:x2]
    if roi.size == 0:
        return 0.0
    
    # Binarização com threshold adaptativo
    _, roi_thresh = cv2.threshold(roi, threshold, 255, cv2.THRESH_BINARY_INV)
    
    # Calcular área preenchida (considerando pequenos ruídos)
    filled_pixels = cv2.countNonZero(roi_thresh)
    total_pixels = roi.size
    
    # Se o preenchimento for muito baixo, pode ser ruído
    if filled_pixels < total_pixels * 0.05:
        return 0.0
    
    return float(filled_pixels) / float(total_pixels)

def _cluster_checkboxes(checkboxes: List[Tuple[int, int, int, int]], tolerance: int = 25) -> List[List[Tuple[int, int, int, int]]]:
    """Agrupa bolhas em linhas baseado na posição Y"""
    if not checkboxes:
        return []
    
    # Ordenar por Y (posição vertical)
    sorted_checkboxes = sorted(checkboxes, key=lambda b: b[1])
    rows = []
    current_row = [sorted_checkboxes[0]]
    
    for checkbox in sorted_checkboxes[1:]:
        # Verificar se pertence à mesma linha
        y_center_current = current_row[-1][1] + current_row[-1][3] // 2
        y_center_new = checkbox[1] + checkbox[3] // 2
        
        if abs(y_center_new - y_center_current) <= tolerance:
            current_row.append(checkbox)
        else:
            # Ordenar a linha atual por X
            current_row.sort(key=lambda b: b[0])
            rows.append(current_row)
            current_row = [checkbox]
    
    if current_row:
        current_row.sort(key=lambda b: b[0])
        rows.append(current_row)
    
    return rows

def detect_bubbles_adaptive(
    image: np.ndarray, 
    is_fallback: bool = False,
    fill_threshold: int = 135,
    min_marked_percentage: float = 0.20,
    min_questions: int = 5
) -> BubbleResult:
    """
    Detecta bolhas adaptativamente, tentando múltiplas configurações se necessário
    """
    if image is None or image.size == 0:
        return BubbleResult(found=False, grids=[], debug_info={"error": "Imagem vazia"})
    
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape
    
    debug_info = {
        "image_size": f"{width}x{height}",
        "attempts": []
    }
    
    # Configurações a serem testadas
    configs = [
        # (min_area, max_area, is_fallback, marcado_threshold)
        (45, 2500, is_fallback, min_marked_percentage),
        (40, 3000, True, min_marked_percentage - 0.05),
        (55, 2000, is_fallback, min_marked_percentage + 0.05),
        (35, 3500, True, 0.15),  # Configuração mais flexível
    ]
    
    best_result = None
    best_score = 0
    
    for min_area, max_area, use_fallback, mark_threshold in configs:
        logger.info(f"Tentando configuração: area=[{min_area},{max_area}], fallback={use_fallback}, threshold={mark_threshold}")
        
        # Detectar todas as bolhas na imagem inteira
        all_checkboxes = _find_checkboxes(gray, min_area=min_area, max_area=max_area, is_fallback=use_fallback)
        
        debug_attempt = {
            "config": f"area_{min_area}_{max_area}_fallback_{use_fallback}",
            "total_checkboxes": len(all_checkboxes),
            "mark_threshold": mark_threshold
        }
        
        if not all_checkboxes:
            debug_attempt["result"] = "no_checkboxes"
            debug_info["attempts"].append(debug_attempt)
            continue
        
        # Agrupar em linhas
        rows = _cluster_checkboxes(all_checkboxes, tolerance=28)
        debug_attempt["rows_found"] = len(rows)
        debug_attempt["row_sizes"] = [len(row) for row in rows]
        
        # Filtrar linhas que parecem válidas (mínimo de 3-4 bolhas por linha)
        valid_rows = []
        for row in rows:
            if len(row) >= 3:  # Pelo menos 3 alternativas (A,B,C)
                # Verificar consistência de tamanho
                sizes = [(w, h) for (_, _, w, h) in row]
                avg_w = np.mean([w for w, _ in sizes])
                avg_h = np.mean([h for _, h in sizes])
                
                # Se os tamanhos são consistentes
                if all(abs(w - avg_w) / avg_w < 0.4 and abs(h - avg_h) / avg_h < 0.4 for w, h in sizes):
                    valid_rows.append(row)
        
        debug_attempt["valid_rows"] = len(valid_rows)
        
        if len(valid_rows) >= min_questions:
            # Processar bolhas encontradas
            grids = []
            for row_idx, row in enumerate(valid_rows):
                grid_bubbles = []
                for col_idx, (x, y, w, h) in enumerate(row):
                    # Calcular preenchimento
                    fill_pct = _calculate_fill_percentage(gray, x, y, w, h, fill_threshold)
                    is_marked = fill_pct >= mark_threshold
                    
                    grid_bubbles.append(Bubble(
                        col=col_idx,
                        x=x + w // 2,
                        y=y + h // 2,
                        radius=max(w, h) // 2,
                        fill_percentage=round(fill_pct, 3),
                        marked=is_marked
                    ))
                grids.append(BubbleGrid(row=row_idx, bubbles=grid_bubbles))
            
            # Calcular pontuação para esta configuração
            score = len(grids) * len(grids[0].bubbles) if grids else 0
            if score > best_score:
                best_score = score
                best_result = BubbleResult(found=True, grids=grids, debug_info=debug_info)
                logger.info(f"Configuração encontrou {len(grids)} linhas com {len(grids[0].bubbles) if grids else 0} bolhas cada")
        
        debug_info["attempts"].append(debug_attempt)
        
        # Se já temos um resultado razoável, parar
        if best_score >= 20:  # 5 questões * 4 alternativas
            break
    
    if best_result:
        return best_result
    
    # Se nada foi encontrado, retornar com debug info
    return BubbleResult(found=False, grids=[], debug_info=debug_info)

def detect_bubbles_full_image(image: np.ndarray, is_fallback: bool = False) -> BubbleResult:
    """Wrapper principal para detecção de bolhas"""
    # Pré-processar imagem
    preprocessed = preprocess_image(image)
    
    # Detectar bolhas adaptativamente
    result = detect_bubbles_adaptive(preprocessed, is_fallback=is_fallback)
    
    return result

# --- Visualização ---

def draw_bubbles(image: np.ndarray, result: BubbleResult) -> np.ndarray:
    """Desenha as bolhas detectadas na imagem"""
    annotated = image.copy()
    colors = {
        "marked": (0, 255, 0),      # Verde
        "unmarked": (0, 165, 255),  # Laranja
        "uncertain": (0, 0, 255)    # Vermelho
    }
    
    for grid in result.grids:
        for bubble in grid.bubbles:
            cx, cy, radius = bubble.x, bubble.y, bubble.radius
            
            # Determinar cor baseada no preenchimento
            if bubble.marked:
                color = colors["marked"]
            elif bubble.fill_percentage > 0.10:
                color = colors["uncertain"]  # Parcialmente preenchido
            else:
                color = colors["unmarked"]
            
            # Desenhar retângulo ao redor da bolha
            cv2.rectangle(annotated, 
                         (cx - radius, cy - radius), 
                         (cx + radius, cy + radius), 
                         color, 2)
            
            # Adicionar texto com porcentagem
            label = f"{bubble.fill_percentage:.0%}"
            cv2.putText(annotated, label, 
                       (cx - 15, cy + 5), 
                       cv2.FONT_HERSHEY_SIMPLEX, 
                       0.4, color, 1)
    
    # Adicionar informações de debug na imagem
    if not result.found:
        cv2.putText(annotated, "Nenhuma bolha detectada", (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
    
    return annotated

def draw_debug_grid(image: np.ndarray, checkboxes: List[Tuple[int, int, int, int]]) -> np.ndarray:
    """Desenha todas as bolhas candidatas para debug"""
    debug_img = image.copy()
    for i, (x, y, w, h) in enumerate(checkboxes):
        cv2.rectangle(debug_img, (x, y), (x + w, y + h), (255, 0, 0), 2)
        cv2.putText(debug_img, str(i), (x, y - 5),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 0, 0), 1)
    return debug_img

# --- Endpoint FastAPI ---

app = FastAPI(title="OMR Sheet Scanner API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "OMR Sheet Scanner API",
        "version": "2.0",
        "endpoints": {
            "/api/omr/scan": "POST - Enviar foto da folha de respostas",
            "/api/omr/health": "GET - Verificar saúde da API"
        }
    }

@app.get("/api/omr/health")
async def health_check():
    return {"status": "healthy", "version": "2.0"}

@app.post("/api/omr/scan")
async def scan_omr_sheet(
    photo: UploadFile = File(...),
    debug_mode: bool = False,
    marked_threshold: Optional[float] = None
):
    """
    Endpoint principal para escanear folhas de respostas OMR
    
    Parâmetros:
    - photo: Arquivo de imagem da folha
    - debug_mode: Se True, retorna informações detalhadas de debug
    - marked_threshold: Threshold de preenchimento (0.0 a 1.0, padrão: 0.20)
    """
    try:
        # Validar arquivo
        if not photo.content_type or not photo.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Arquivo deve ser uma imagem")
        
        contents = await photo.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Não foi possível decodificar a imagem")
        
        logger.info(f"Imagem carregada: {image.shape}")
        
        # Tamanho alvo para correção de perspectiva
        target_width = 800
        target_height = 1100
        
        # Tentar correção de perspectiva com marcadores fiduciais
        corners = find_fiducial_markers(image)
        
        if corners is not None:
            logger.info("Perspectiva corrigida usando marcadores fiduciais")
            corrected_image = correct_perspective(image, corners, target_width, target_height)
            is_fallback = False
        else:
            logger.warning("Marcadores fiduciais não encontrados. Usando redimensionamento simples.")
            corrected_image = cv2.resize(image, (target_width, target_height), interpolation=cv2.INTER_AREA)
            is_fallback = True
        
        if corrected_image is None:
            raise HTTPException(status_code=500, detail="Falha no processamento da imagem")
        
        # Ajustar threshold se fornecido
        threshold = marked_threshold if marked_threshold is not None else 0.20
        
        # Detectar bolhas
        bubble_result = detect_bubbles_full_image(corrected_image, is_fallback=is_fallback)
        
        # Codificar imagens para resposta
        _, corrected_encoded = cv2.imencode('.jpg', corrected_image, [cv2.IMWRITE_JPEG_QUALITY, 85])
        corrected_base64 = base64.b64encode(corrected_encoded).decode('utf-8')
        
        annotated_image = draw_bubbles(corrected_image, bubble_result)
        _, annotated_encoded = cv2.imencode('.jpg', annotated_image, [cv2.IMWRITE_JPEG_QUALITY, 85])
        annotated_base64 = base64.b64encode(annotated_encoded).decode('utf-8')
        
        # Preparar resposta
        response_data = {
            "status": "success",
            "perspective_corrected": corners is not None,
            "detection_found": bubble_result.found,
            "total_questions": sum(len(grid.bubbles) for grid in bubble_result.grids),
            "total_rows": len(bubble_result.grids),
            "bubbles": bubble_result.model_dump(),
            "corrected_image": corrected_base64,
            "debug_image": annotated_base64,
        }
        
        # Adicionar informações de debug se solicitado
        if debug_mode and bubble_result.debug_info:
            response_data["debug_info"] = bubble_result.debug_info
            
            # Adicionar imagem com todas as bolhas candidatas
            gray = cv2.cvtColor(corrected_image, cv2.COLOR_BGR2GRAY)
            all_checkboxes = _find_checkboxes(gray, min_area=40, max_area=3000, is_fallback=True)
            if all_checkboxes:
                debug_img = draw_debug_grid(corrected_image, all_checkboxes)
                _, debug_encoded = cv2.imencode('.jpg', debug_img, [cv2.IMWRITE_JPEG_QUALITY, 85])
                response_data["candidates_image"] = base64.b64encode(debug_encoded).decode('utf-8')
        
        return JSONResponse(content=response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro não esperado: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

# --- Utilitário para testes offline ---

def test_with_image(image_path: str):
    """Função utilitária para testar localmente sem FastAPI"""
    image = cv2.imread(image_path)
    if image is None:
        print(f"Erro: Não foi possível carregar a imagem {image_path}")
        return
    
    print(f"Testando imagem: {image_path}")
    print(f"Dimensões: {image.shape}")
    
    # Tentar correção de perspectiva
    corners = find_fiducial_markers(image)
    if corners is not None:
        print("✅ Marcadores fiduciais encontrados")
        corrected_image = correct_perspective(image, corners, 800, 1100)
        is_fallback = False
    else:
        print("⚠️ Marcadores não encontrados, usando fallback")
        corrected_image = cv2.resize(image, (800, 1100))
        is_fallback = True
    
    # Detectar bolhas
    result = detect_bubbles_full_image(corrected_image, is_fallback=is_fallback)
    
    print(f"\nResultado da detecção:")
    print(f"  - Encontrado: {result.found}")
    print(f"  - Total de linhas: {len(result.grids)}")
    for grid in result.grids:
        marked = sum(1 for b in grid.bubbles if b.marked)
        print(f"  - Linha {grid.row}: {len(grid.bubbles)} bolhas, {marked} marcadas")
    
    # Salvar imagem anotada
    annotated = draw_bubbles(corrected_image, result)
    output_path = image_path.replace('.', '_annotated.')
    cv2.imwrite(output_path, annotated)
    print(f"\n✅ Imagem anotada salva em: {output_path}")
    
    return result

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        test_with_image(sys.argv[1])
    else:
        print("Uso: python script.py <caminho_da_imagem>")
        print("\nPara iniciar o servidor FastAPI:")
        print("  uvicorn script:app --reload --host 0.0.0.0 --port 8000")

# Para executar o servidor:
# uvicorn script:app --reload --host 0.0.0.0 --port 8000