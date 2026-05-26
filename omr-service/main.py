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
from omr.models import ScanResponse, ScanErrorResponse, BubbleResult, BubbleGrid

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


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
    Full OMR scan pipeline:
      1. Read image
      2. Detect L-shaped fiducial markers on the sides
      3. Correct perspective using detected markers
      4. Read QR code (from original or corrected image)
      5. Detect and classify answer bubbles
      6. Return structured results + optional debug images
    """
    try:
        # 1. Read image
        contents = await photo.read()
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(status_code=400, detail="Não foi possível decodificar a imagem.")

        # 2. Detect L-shaped fiducial markers
        fiducial_result = detect_fiducials(image)
        logger.info("Fiducial detection: found=%s, count=%d", fiducial_result.found, fiducial_result.count)

        # 3. Perspective correction using L-markers
        if fiducial_result.found and fiducial_result.corners:
            corrected_image = correct_perspective(
                image,
                fiducial_result.corners,
                target_width=1240,
                target_height=1754,
            )
            if corrected_image is None:
                logger.warning("Perspective correction failed, using resized original")
                h, w = image.shape[:2]
                scale = 1240 / w
                corrected_image = cv2.resize(image, (1240, int(h * scale)))
        else:
            # No fiducials found — resize as fallback
            logger.warning("No fiducial markers found, resizing without perspective correction")
            h, w = image.shape[:2]
            scale = 1240 / w
            corrected_image = cv2.resize(image, (1240, int(h * scale)))

        # 4. Read QR code (try corrected first, then original)
        qr_data = read_qr(corrected_image)
        if qr_data is None:
            qr_data = read_qr(image)

        # 5. Detect answer bubbles on corrected image
        bubble_result = detect_bubbles(corrected_image)

        # 6. Build response
        response = ScanResponse(
            success=True,
            qr=qr_data,
            fiducial=fiducial_result,
            bubbles=bubble_result,
        )

        if debug:
            # Annotate corrected image with bubbles + fiducials
            annotated = draw_bubbles(corrected_image, bubble_result)
            annotated = draw_fiducials(annotated, fiducial_result)

            _, buf = cv2.imencode('.png', annotated)
            response.debug_image = base64.b64encode(buf).decode('utf-8')

            _, corrected_buf = cv2.imencode('.png', corrected_image)
            response.corrected_image = base64.b64encode(corrected_buf).decode('utf-8')

        return response

    except HTTPException as e:
        logger.error("HTTP Exception: %s", e.detail)
        return JSONResponse(status_code=e.status_code, content=ScanErrorResponse(error=e.detail).dict())
    except Exception as e:
        logger.error("Erro inesperado: %s", str(e), exc_info=True)
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
