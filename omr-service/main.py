import base64
import io
import logging
from typing import List, Optional, Tuple, Dict, Any

import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from omr.fiducial import detect_fiducials, draw_fiducials
from omr.perspective import correct_perspective
from omr.qr_reader import read_qr
from omr.models import ScanResponse, ScanErrorResponse, BubbleResult, BubbleGrid, FiducialResult

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# --- Funções de detecção L (LEGADO - não mais utilizadas) ---
# Mantidas para compatibilidade, mas detect_fiducials() é preferida para quadrados


def _detect_l_marker_harris(image: np.ndarray, target_corner: str) -> Optional[Tuple[float, float]]:
    """
    Detecta um marcador L em um canto específico usando Harris Corner Detection.
    target_corner: "TL", "TR", "BR", "BL"

    Estratégia:
    1. Binarização adaptativa + Otsu para melhorar contraste
    2. Harris Corner Detection para encontrar cantos
    3. Filtro gaussiano + análise de centroide para remover ruído
    4. Retorna o canto extremo mais confiável

    Retorna as coordenadas do canto do L ou None se não encontrado.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape

    # Definir ROI baseado no canto (1/8 da imagem)
    margin = min(w, h) // 8

    if target_corner == "TL":
        roi = gray[0:margin, 0:margin]
        roi_x, roi_y = 0, 0
        # Para TL, queremos o canto superior-esquerdo (menor x, menor y)
        is_top_left = True
        is_left = True
    elif target_corner == "TR":
        roi = gray[0:margin, w-margin:w]
        roi_x, roi_y = w - margin, 0
        is_top_left = True
        is_left = False
    elif target_corner == "BR":
        roi = gray[h-margin:h, w-margin:w]
        roi_x, roi_y = w - margin, h - margin
        is_top_left = False
        is_left = False
    else:  # BL
        roi = gray[h-margin:h, 0:margin]
        roi_x, roi_y = 0, h - margin
        is_top_left = False
        is_left = True

    roi_h, roi_w = roi.shape

    # ========== Pré-processamento ==========

    # 1. Binarização Adaptativa
    if roi_h > 11 and roi_w > 11:
        adaptive_thresh = cv2.adaptiveThreshold(
            roi, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            blockSize=11,
            C=2
        )
    else:
        adaptive_thresh = roi

    # 2. Binarização com Otsu
    _, otsu_thresh = cv2.threshold(roi, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # 3. Combinar ambas as binarizações (intersecção)
    binary = cv2.bitwise_and(adaptive_thresh, otsu_thresh)

    # 4. Remover ruído com desfoque gaussiano
    if roi_h > 5 and roi_w > 5:
        blurred = cv2.GaussianBlur(binary, (5, 5), 1.0)
    else:
        blurred = binary

    # ========== Harris Corner Detection ==========

    # Detectar cantos usando Harris
    harris_corners = cv2.cornerHarris(blurred, blockSize=2, ksize=3, k=0.04)

    # Normalizar para visualização
    harris_normalized = cv2.normalize(harris_corners, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)

    # Aplicar threshold para pegar apenas cantos fortes
    threshold = 0.1 * harris_normalized.max()
    strong_corners = np.argwhere(harris_normalized > threshold)

    if len(strong_corners) == 0:
        logger.debug(f"L-marker {target_corner}: nenhum canto Harris detectado")
        return None

    logger.info(f"L-marker {target_corner}: {len(strong_corners)} cantos detectados")

    # ========== Análise de Centroide e Filtragem de Ruído ==========

    # Agrupar cantos próximos (clustering simples)
    # Usar apenas os cantos mais fortes
    corner_strength = [harris_normalized[y, x] for y, x in strong_corners]
    sorted_indices = np.argsort(corner_strength)[::-1]  # Descrescente

    # Pegar apenas os top 10% dos cantos mais fortes
    top_n = max(1, len(sorted_indices) // 10)
    top_corners = strong_corners[sorted_indices[:top_n]]

    # Calcular centroide dos cantos fortes
    centroid_y = np.mean(top_corners[:, 0])
    centroid_x = np.mean(top_corners[:, 1])

    logger.debug(f"L-marker {target_corner}: centroide em ({centroid_x:.1f}, {centroid_y:.1f})")

    # Filtrar cantos que estão muito afastados do centroide (outliers)
    # Usar desvio padrão como métrica
    distances = np.sqrt(
        (top_corners[:, 1] - centroid_x) ** 2 + (top_corners[:, 0] - centroid_y) ** 2
    )

    mean_dist = np.mean(distances)
    std_dist = np.std(distances) if len(distances) > 1 else 0
    threshold_dist = mean_dist + 2 * std_dist  # 2-sigma rule

    filtered_corners = top_corners[distances <= threshold_dist]

    if len(filtered_corners) == 0:
        filtered_corners = top_corners

    # ========== Selecionar o Canto Extremo ==========

    # Baseado no target_corner, selecionar o canto mais extremo
    if is_top_left:
        if is_left:
            # TL: queremos o canto superior-esquerdo (menor x, menor y)
            corner = min(filtered_corners, key=lambda c: c[1] + c[0])
        else:
            # TR: queremos o canto superior-direito (maior x, menor y)
            corner = min(filtered_corners, key=lambda c: -c[1] + c[0])
    else:
        if is_left:
            # BL: queremos o canto inferior-esquerdo (menor x, maior y)
            corner = max(filtered_corners, key=lambda c: c[0] - c[1])
        else:
            # BR: queremos o canto inferior-direito (maior x, maior y)
            corner = max(filtered_corners, key=lambda c: c[0] + c[1])

    corner_y, corner_x = corner

    # Converter para coordenadas globais
    global_x = float(roi_x + corner_x)
    global_y = float(roi_y + corner_y)

    logger.info(f"L-marker {target_corner} detectado em ({global_x:.1f}, {global_y:.1f})")
    return (global_x, global_y)


def detect_l_markers(image: np.ndarray) -> FiducialResult:
    """
    Detecta todos os 4 marcadores L nos cantos da imagem usando Harris Corner Detection.

    Processo:
    1. Binarização Adaptativa + Otsu para melhor contraste
    2. Harris Corner Detection em cada ROI de canto
    3. Filtragem por centroide e desvio padrão (remove ruído)
    4. Seleção do canto mais extremo confiável

    Retorna FiducialResult com os 4 cantos [TL, TR, BR, BL].
    """
    corners = []
    found_count = 0

    logger.info("Iniciando detecção de L-markers com Harris Corner Detection...")

    for corner_name in ["TL", "TR", "BR", "BL"]:
        try:
            corner = _detect_l_marker_harris(image, corner_name)
            if corner is not None:
                corners.append(corner)
                found_count += 1
                logger.info(f"✓ {corner_name} detectado: {corner}")
            else:
                # Fallback: usar a borda da imagem
                h, w = image.shape[:2]
                if corner_name == "TL":
                    corners.append((0.0, 0.0))
                elif corner_name == "TR":
                    corners.append((float(w), 0.0))
                elif corner_name == "BR":
                    corners.append((float(w), float(h)))
                else:  # BL
                    corners.append((0.0, float(h)))
                logger.warning(f"✗ {corner_name} não detectado, usando borda como fallback")
        except Exception as e:
            logger.error(f"Erro ao detectar {corner_name}: {e}")
            h, w = image.shape[:2]
            if corner_name == "TL":
                corners.append((0.0, 0.0))
            elif corner_name == "TR":
                corners.append((float(w), 0.0))
            elif corner_name == "BR":
                corners.append((float(w), float(h)))
            else:  # BL
                corners.append((0.0, float(h)))

    logger.info(f"L-markers detectados: {found_count}/4")

    return FiducialResult(found=found_count > 0, count=4, corners=corners)


# --- Bubble detection ---


def _find_circles(gray: np.ndarray, min_area: int = 120, max_area: int = 1500) -> List[Tuple[int, int, int, int]]:
    """
    Find circular answer bubbles in a grayscale image.
    Tuned for ~18-22px circles (when image is 1240px wide).
    """
    # CLAHE to enhance edges of bubbles in low-light scans
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    # Multiple thresholding strategies
    _, thresh1 = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    _, thresh2 = cv2.threshold(enhanced, 100, 255, cv2.THRESH_BINARY_INV)
    processed = cv2.bitwise_or(thresh1, thresh2)

    # Morphological cleanup
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    processed = cv2.morphologyEx(processed, cv2.MORPH_CLOSE, kernel, iterations=1)

    contours, _ = cv2.findContours(processed, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

    circles = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if not (min_area < area < max_area):
            continue

        x, y, w, h = cv2.boundingRect(contour)
        if w < 11 or h < 11:
            continue

        # More relaxed aspect ratio (allow slightly oval bubbles from scanning)
        aspect_ratio = float(w) / h if h > 0 else 0
        if aspect_ratio < 0.75 or aspect_ratio > 1.35:
            continue

        perimeter = cv2.arcLength(contour, True)
        if perimeter < 1:
            continue
        circularity = 4 * np.pi * area / (perimeter * perimeter)
        if circularity < 0.70:
            continue

        hull = cv2.convexHull(contour)
        hull_area = cv2.contourArea(hull)
        if hull_area > 0:
            solidity = area / hull_area
            if solidity < 0.70:
                continue

        circles.append((x, y, w, h))

    logger.info("Found %d circles", len(circles))
    return circles


def _calculate_fill_percentage(
    gray: np.ndarray, x: int, y: int, w: int, h: int, threshold: int = 130
) -> float:
    """
    Calculate percentage of dark pixels inside a bubble (marks).
    Higher value = more filled/marked.

    Uses multiple thresholds and takes the maximum to handle varying lighting:
      - OTSU on local region
      - Manual threshold at 130 (tuned for pens on white)
    """
    y1, y2 = max(0, y), min(gray.shape[0], y + h)
    x1, x2 = max(0, x), min(gray.shape[1], x + w)
    roi = gray[y1:y2, x1:x2]
    if roi.size == 0:
        return 0.0

    # Apply CLAHE to enhance contrast locally
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(4, 4))
    roi_enhanced = clahe.apply(roi)

    # Strategy 1: OTSU on enhanced region
    _, roi_thresh1 = cv2.threshold(roi_enhanced, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # Strategy 2: Manual threshold (dark = < 130)
    _, roi_thresh2 = cv2.threshold(roi_enhanced, threshold, 255, cv2.THRESH_BINARY_INV)

    # Take union: any pixel that's dark in either threshold
    roi_combined = cv2.bitwise_or(roi_thresh1, roi_thresh2)

    dark_pixels = cv2.countNonZero(roi_combined)
    total_pixels = roi.size
    if total_pixels == 0:
        return 0.0

    return float(dark_pixels) / float(total_pixels)


def _cluster_circles(
    circles: List[Tuple[int, int, int, int]], tolerance: int = 20
) -> List[List[Tuple[int, int, int, int]]]:
    """
    Cluster circles into rows by y-coordinate.
    Tolerance allows for slight vertical misalignment of bubbles.
    """
    if not circles:
        return []
    sorted_circles = sorted(circles, key=lambda b: b[1])
    rows = []
    current_row = [sorted_circles[0]]
    for circle in sorted_circles[1:]:
        if abs(circle[1] - current_row[0][1]) <= tolerance:
            current_row.append(circle)
        else:
            if len(current_row) > 0:
                rows.append(sorted(current_row, key=lambda b: b[0]))
            current_row = [circle]
    if len(current_row) > 0:
        rows.append(sorted(current_row, key=lambda b: b[0]))
    # Accept rows with 2+ bubbles (might be just A/B or might be A/B/C/D)
    filtered_rows = [row for row in rows if len(row) >= 2]
    return filtered_rows


def detect_bubbles(
    image: np.ndarray,
    fill_threshold: int = 150,
    marked_percentage: float = 0.40,
) -> BubbleResult:
    if image is None or image.size == 0:
        return BubbleResult(found=False, grids=[])

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape

    # ROI: skip header area (top 25%) and margins
    roi_y_start = int(height * 0.25)
    roi_y_end = int(height * 0.95)
    roi_x_start = int(width * 0.05)
    roi_x_end = int(width * 0.95)

    roi_gray = gray[roi_y_start:roi_y_end, roi_x_start:roi_x_end]
    if roi_gray.size == 0:
        return BubbleResult(found=False, grids=[])

    circles_in_roi = _find_circles(roi_gray)
    if not circles_in_roi:
        return BubbleResult(found=False, grids=[])

    # Map back to full image coordinates
    circles = [(x + roi_x_start, y + roi_y_start, w, h) for x, y, w, h in circles_in_roi]

    rows = _cluster_circles(circles)

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
    annotated = image.copy()
    colors = {"marked": (0, 255, 0), "unmarked": (0, 165, 255)}

    for grid in result.grids:
        for bubble in grid.bubbles:
            cx, cy = bubble["x"], bubble["y"]
            radius = bubble["radius"]
            color = colors["marked"] if bubble["marked"] else colors["unmarked"]
            cv2.circle(annotated, (cx, cy), radius, color, 2)
            fill_pct = bubble["fill_percentage"]
            cv2.putText(annotated, f"{fill_pct:.0%}", (cx - 15, cy + 5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)

    return annotated


# --- FastAPI Application ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/omr/scan", response_model=ScanResponse, responses={400: {"model": ScanErrorResponse}})
async def scan_omr_sheet(photo: UploadFile = File(...), debug: bool = False):
    """
    Pipeline completo de scan OMR:
      1. Ler imagem
      2. Detectar marcadores L nos 4 cantos (se possível)
      3. Corrigir perspectiva usando marcadores L detectados
      4. Ler QR code
      5. Detectar e classificar bolhas de resposta
      6. Retornar resultados + imagens de debug (se solicitado)
    """
    try:
        # 1. Ler imagem
        contents = await photo.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(status_code=400, detail="Não foi possível decodificar a imagem.")

        original_h, original_w = image.shape[:2]
        logger.info(f"Imagem recebida: {original_w}x{original_h}")

        # 2. Detectar quadrados fiduciais nos 4 cantos
        logger.info("Detectando marcadores quadrados nos cantos...")
        fiducial_result = detect_fiducials(image)
        logger.info("Marcadores quadrados: encontrados=%s, count=%d", fiducial_result.found, fiducial_result.count)

        # 3. Corrigir perspectiva
        corrected_image = image.copy()
        if fiducial_result.found and fiducial_result.corners:
            try:
                corrected_image = correct_perspective(
                    image,
                    fiducial_result.corners,
                    target_width=1240,
                    target_height=1754,
                )
                if corrected_image is not None:
                    logger.info("Perspectiva corrigida com sucesso")
                else:
                    logger.warning("correct_perspective retornou None, usando imagem original redimensionada")
                    scale = 1240 / original_w
                    corrected_image = cv2.resize(image, (1240, int(original_h * scale)))
            except Exception as e:
                logger.error(f"Erro na correção de perspectiva: {e}")
                scale = 1240 / original_w
                corrected_image = cv2.resize(image, (1240, int(original_h * scale)))
        else:
            # Sem marcadores - apenas redimensionar
            logger.warning("Marcadores quadrados não detectados, redimensionando sem correção de perspectiva")
            scale = 1240 / original_w
            corrected_image = cv2.resize(image, (1240, int(original_h * scale)))

        # 4. Ler QR code (tentar na imagem corrigida primeiro)
        qr_data = read_qr(corrected_image)
        if qr_data is None:
            logger.info("QR code não encontrado na imagem corrigida, tentando original")
            qr_data = read_qr(image)

        # 5. Detectar bolhas de resposta na imagem corrigida
        logger.info("Detectando bolhas de resposta...")
        bubble_result = detect_bubbles(corrected_image)
        logger.info(f"Bolhas encontradas: {len(bubble_result.grids)} linhas")

        # 6. Montar resposta
        response = ScanResponse(
            success=True,
            qr=qr_data,
            fiducial=fiducial_result,
            bubbles=bubble_result,
        )

        if debug:
            # Anotar imagem corrigida com bolhas + marcadores
            annotated = draw_bubbles(corrected_image, bubble_result)
            annotated = draw_fiducials(annotated, fiducial_result)

            _, buf = cv2.imencode('.png', annotated)
            response.debug_image = base64.b64encode(buf).decode('utf-8')

            _, corrected_buf = cv2.imencode('.png', corrected_image)
            response.corrected_image = base64.b64encode(corrected_buf).decode('utf-8')

        logger.info("Scan completado com sucesso")
        return response

    except HTTPException as e:
        logger.error(f"HTTP Exception: {e.detail}")
        return JSONResponse(status_code=e.status_code, content=ScanErrorResponse(error=e.detail).dict())
    except Exception as e:
        logger.error(f"Erro inesperado: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro interno: {e}")


@app.get("/health")
@app.get("/api/health")
async def health_check():
    try:
        import pyzbar
        pyzbar_available = True
    except ImportError:
        pyzbar_available = False

    return {
        "status": "ok",
        "service": "avaliaedu-omr",
        "version": "0.1.0",
        "opencv_available": True,
        "pyzbar_available": pyzbar_available,
    }
