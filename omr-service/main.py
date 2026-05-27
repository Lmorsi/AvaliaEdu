import base64
import io
import logging
from typing import List, Optional, Tuple, Dict, Any

import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Avalia.Edu OMR Service")

# Configuração de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Funções de Visão Computacional ---

def _order_corner_points(pts: np.ndarray) -> np.ndarray:
    """
    Ordena 4 pontos: [superior-esquerdo, superior-direito, inferior-direito, inferior-esquerdo].
    """
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]   # top-left
    rect[2] = pts[np.argmax(s)]   # bottom-right
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]  # top-right
    rect[3] = pts[np.argmax(diff)]  # bottom-left
    return rect

def find_corner_markers(image: np.ndarray) -> Optional[List[List[float]]]:
    """
    Detecta os 4 marcadores de canto (formato em L ou quadrados).
    Filtra contornos que tocam a borda da imagem para evitar falsos positivos.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    # Binarização adaptativa para lidar com diferentes iluminações
    thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
    
    # Limpeza para unir partes do marcador se houver ruído
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)

    cnts, _ = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    height, width = image.shape[:2]
    img_area = height * width
    candidates = []
    
    # Margem para ignorar o que toca a borda da imagem
    margin = 10

    for c in cnts:
        area = cv2.contourArea(c)
        # Filtro de área: marcadores devem ter entre 0.05% e 5% da área total
        if 0.0005 * img_area < area < 0.05 * img_area:
            x, y, w, h = cv2.boundingRect(c)
            
            # Ignorar se tocar a borda (evita detectar a moldura da foto)
            if x < margin or y < margin or (x + w) > (width - margin) or (y + h) > (height - margin):
                continue
                
            ratio = float(w) / h
            if 0.5 < ratio < 2.0: # "L" pode ter proporção variada mas o bounding box é contido
                M = cv2.moments(c)
                if M["m00"] != 0:
                    cX = float(M["m10"] / M["m00"])
                    cY = float(M["m01"] / M["m00"])
                    candidates.append([cX, cY])

    if len(candidates) >= 4:
        # Se houver muitos candidatos, pegamos os 4 que formam o maior quadrilátero
        # Para simplificar, pegamos os 4 pontos mais próximos dos cantos teóricos
        pts = np.array(candidates)
        s = pts.sum(axis=1)
        tl = pts[np.argmin(s)]
        br = pts[np.argmax(s)]
        diff = np.diff(pts, axis=1)
        tr = pts[np.argmin(diff)]
        bl = pts[np.argmax(diff)]
        return [tl.tolist(), tr.tolist(), br.tolist(), bl.tolist()]
    
    return None

def correct_perspective(image: np.ndarray, corners: List[List[float]], target_w=800, target_h=1131) -> np.ndarray:
    """Aplica a transformação de perspectiva para 'desentortar' a folha."""
    src_pts = _order_corner_points(np.array(corners, dtype="float32"))
    dst_pts = np.array([
        [0, 0],
        [target_w - 1, 0],
        [target_w - 1, target_h - 1],
        [0, target_h - 1]], dtype="float32")

    M = cv2.getPerspectiveTransform(src_pts, dst_pts)
    warped = cv2.warpPerspective(image, M, (target_w, target_h), flags=cv2.INTER_LINEAR, borderValue=(255, 255, 255))
    return warped

def detect_bubbles(image: np.ndarray) -> Dict[str, Any]:
    """Detecta e lê as bolhas de resposta na imagem já alinhada."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    # Binarização para análise de preenchimento
    thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)[1]
    
    h, w = image.shape[:2]
    # ROI: Focar na área de respostas (ajustado para o layout Avalia.Edu)
    # Começa em 40% da altura para pular o cabeçalho
    roi_y_start = int(h * 0.4)
    roi_y_end = int(h * 0.95)
    roi_x_start = int(w * 0.05)
    roi_x_end = int(w * 0.95)
    
    roi_thresh = thresh[roi_y_start:roi_y_end, roi_x_start:roi_x_end]
    cnts, _ = cv2.findContours(roi_thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    bubbles = []
    for c in cnts:
        (x, y, bw, bh) = cv2.boundingRect(c)
        ar = bw / float(bh)
        # Filtro para bolhas (quadrados/círculos de tamanho médio)
        if 15 <= bw <= 60 and 15 <= bh <= 60 and 0.7 <= ar <= 1.3:
            bubbles.append((x + roi_x_start, y + roi_y_start, bw, bh))
    
    # Agrupar em linhas (questões)
    bubbles.sort(key=lambda b: b[1])
    rows = []
    if bubbles:
        current_row = [bubbles[0]]
        for i in range(1, len(bubbles)):
            if abs(bubbles[i][1] - current_row[-1][1]) < 20: # Tolerância de linha
                current_row.append(bubbles[i])
            else:
                current_row.sort(key=lambda b: b[0])
                rows.append(current_row)
                current_row = [bubbles[i]]
        current_row.sort(key=lambda b: b[0])
        rows.append(current_row)

    results = []
    debug_img = image.copy()
    
    for i, row in enumerate(rows):
        # Filtra linhas que não parecem questões (ex: ruídos)
        if len(row) < 2: continue
        
        question_data = {"question": i + 1, "options": []}
        for j, (bx, by, bw, bh) in enumerate(row):
            # Calcula preenchimento
            roi = thresh[by:by+bh, bx:bx+bw]
            total_pixels = cv2.countNonZero(roi)
            pixel_ratio = total_pixels / float(bw * bh)
            
            is_marked = pixel_ratio > 0.45 # 45% de preenchimento
            label = chr(65 + j)
            
            question_data["options"].append({"label": label, "marked": is_marked})
            
            color = (0, 255, 0) if is_marked else (0, 165, 255)
            cv2.rectangle(debug_img, (bx, by), (bx + bw, by + bh), color, 2)
            cv2.putText(debug_img, label, (bx, by - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
            
        results.append(question_data)
        
    return {"results": results, "debug_image": debug_img}

@app.post("/api/omr/scan")
async def scan(file: UploadFile = File(...), debug: bool = Query(False)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        return {"error": "Falha ao decodificar imagem"}

    # 1. Tentar encontrar marcadores de canto
    corners = find_corner_markers(img)
    
    processed_img = img
    markers_found = 0
    used_perspective = False

    if corners:
        markers_found = len(corners)
        try:
            processed_img = correct_perspective(img, corners)
            used_perspective = True
        except Exception as e:
            logger.error(f"Erro na correção de perspectiva: {e}")
    else:
        # Fallback: Redimensionar para manter consistência se não achar marcadores
        h, w = img.shape[:2]
        target_w = 800
        target_h = int(h * (target_w / w))
        processed_img = cv2.resize(img, (target_w, target_h))

    # 2. Detectar bolhas
    omr_res = detect_bubbles(processed_img)
    
    # 3. Gerar imagem de debug em Base64
    _, buf = cv2.imencode(".png", omr_res["debug_image"])
    debug_b64 = base64.b64encode(buf).decode()
    
    return {
        "status": "success",
        "markers_found": markers_found,
        "used_perspective": used_perspective,
        "results": omr_res["results"],
        "debug_image": debug_b64,
        "corners": corners if corners else []
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)