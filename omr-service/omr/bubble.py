import logging
from typing import Optional, List, Tuple, Dict, Any

import cv2
import numpy as np

# Mocking the models for demonstration purposes
class BubbleGrid:
    def __init__(self, row: int, bubbles: List[Dict[str, Any]]):
        self.row = row
        self.bubbles = bubbles

class BubbleResult:
    def __init__(self, found: bool, grids: List[BubbleGrid]):
        self.found = found
        self.grids = grids

logger = logging.getLogger(__name__)

def _find_checkboxes(gray: np.ndarray, min_area: int = 50, max_area: int = 2000) -> List[Tuple[int, int, int, int]]:
    """
    Find rectangular checkbox regions in a grayscale image.
    """
    # Apply Otsu's thresholding for better separation
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # Morphological operations to enhance squares
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    gray_processed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=1)

    # Find contours
    contours, _ = cv2.findContours(gray_processed, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

    logger.info("Found %d contours after morphology", len(contours))

    checkboxes = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if not (min_area < area < max_area):
            continue

        # Get bounding rectangle
        x, y, w, h = cv2.boundingRect(contour)

        # Minimum size check: at least 8x8 pixels
        if w < 8 or h < 8:
            continue

        # Check if it's roughly square-like (aspect ratio 0.75 to 1.25)
        aspect_ratio = float(w) / h if h > 0 else 0
        if aspect_ratio < 0.75 or aspect_ratio > 1.25:
            continue

        # Check circularity as strong filter (0.6+ = good square/circle)
        perimeter = cv2.arcLength(contour, True)
        if perimeter < 1:
            continue

        circularity = 4 * np.pi * area / (perimeter * perimeter)
        if circularity < 0.6:
            continue

        # Additional filter: solidity (area / convex hull area)
        hull = cv2.convexHull(contour)
        hull_area = cv2.contourArea(hull)
        if hull_area > 0:
            solidity = area / hull_area
            if solidity < 0.7:
                continue

        checkboxes.append((x, y, w, h))
        logger.info(f"Box: x={x}, y={y}, w={w}, h={h}, aspect={aspect_ratio:.2f}, circ={circularity:.3f}, solid={solidity:.3f}, area={area:.0f}")

    logger.info("Total checkboxes found: %d", len(checkboxes))
    return checkboxes

def _calculate_fill_percentage(
    gray: np.ndarray, x: int, y: int, w: int, h: int, threshold: int = 130
) -> float:
    """
    Calculate fill percentage of a checkbox region.
    """
    y1, y2 = max(0, y), min(gray.shape[0], y + h)
    x1, x2 = max(0, x), min(gray.shape[1], x + w)

    roi = gray[y1:y2, x1:x2]
    if roi.size == 0:
        return 0.0

    # Use a mask to only count pixels inside the detected contour (more precise)
    # For simplicity, we'll stick to the rectangle ROI for now, but with a threshold
    _, roi_thresh = cv2.threshold(roi, threshold, 255, cv2.THRESH_BINARY_INV)
    dark_pixels = cv2.countNonZero(roi_thresh)
    total_pixels = roi.size

    if total_pixels == 0:
        return 0.0

    return float(dark_pixels) / float(total_pixels)

def _cluster_checkboxes(
    checkboxes: List[Tuple[int, int, int, int]], tolerance: int = 15
) -> List[List[Tuple[int, int, int, int]]]:
    """
    Group checkboxes into grid rows based on y-coordinate proximity.
    """
    if not checkboxes:
        return []

    # Sort by y-coordinate
    sorted_checkboxes = sorted(checkboxes, key=lambda b: b[1])

    logger.info(f"Clustering {len(sorted_checkboxes)} checkboxes with tolerance={tolerance}")

    rows = []
    current_row = [sorted_checkboxes[0]]

    for checkbox in sorted_checkboxes[1:]:
        if abs(checkbox[1] - current_row[0][1]) <= tolerance:
            current_row.append(checkbox)
        else:
            if len(current_row) > 0:
                rows.append(sorted(current_row, key=lambda b: b[0]))
            current_row = [checkbox]

    if len(current_row) > 0:
        rows.append(sorted(current_row, key=lambda b: b[0]))

    # Filter rows: only keep rows with at least 3 checkboxes (valid answer rows)
    filtered_rows = [row for row in rows if len(row) >= 3]

    logger.info(f"Clustered into {len(rows)} rows, kept {len(filtered_rows)} valid rows (min 3 checkboxes)")
    return filtered_rows

def detect_bubbles(
    image: np.ndarray,
    fill_threshold: int = 150,
    marked_percentage: float = 0.25,
) -> BubbleResult:
    """
    Detect and classify checkboxes as marked or unmarked, with ROI filtering to avoid QR Code.
    """
    if image is None or image.size == 0:
        logger.error("Image is empty or None")
        return BubbleResult(found=False, grids=[])

    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape
    logger.info("Image shape: %dx%d (H=%d, W=%d)", width, height, height, width)

    # --- ESTRATÉGIA DE FILTRAGEM DE ROI ---
    # No seu cartão Avalia.Edu, o QR Code está no canto superior direito.
    # Vamos definir uma ROI que exclua o topo (onde estão os dados da escola e o QR Code).
    # Ajuste estes valores conforme necessário para o seu gabarito padronizado.
    
    y_start_roi = int(height * 0.3)  # Começa em 30% da altura (pula o cabeçalho e QR Code)
    y_end_roi = int(height * 0.95)   # Termina em 95% da altura
    x_start_roi = int(width * 0.05)  # Começa em 5% da largura
    x_end_roi = int(width * 0.95)    # Termina em 95% da largura

    logger.info(f"Applying ROI: y=[{y_start_roi}:{y_end_roi}], x=[{x_start_roi}:{x_end_roi}]")
    
    roi_gray = gray[y_start_roi:y_end_roi, x_start_roi:x_end_roi]
    
    # Find all checkboxes ONLY in the ROI
    checkboxes_in_roi = _find_checkboxes(roi_gray)
    
    if not checkboxes_in_roi:
        logger.warning("No checkboxes detected in ROI")
        return BubbleResult(found=False, grids=[])

    # Adjust coordinates back to the original image space
    checkboxes = []
    for x, y, w, h in checkboxes_in_roi:
        checkboxes.append((x + x_start_roi, y + y_start_roi, w, h))

    logger.info("Found %d checkbox candidates in ROI", len(checkboxes))

    # Cluster checkboxes into rows
    rows = _cluster_checkboxes(checkboxes)
    logger.info("Clustered into %d rows", len(rows))

    # Classify each checkbox as marked/unmarked
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

            logger.info(f"Row {row_idx}, Col {col_idx}: fill={fill_pct:.2%}, marked={is_marked}, pos=({x},{y}), size=({w}x{h})")

        grids.append(BubbleGrid(row=row_idx, bubbles=grid_row))

    logger.info("Detected %d rows with checkboxes", len(grids))
    return BubbleResult(found=True, grids=grids)

def draw_bubbles(image: np.ndarray, result: BubbleResult) -> np.ndarray:
    """Draw detected checkboxes on a copy of the image (for debugging)."""
    annotated = image.copy()
    colors = {
        "marked": (0, 255, 0),      # Green
        "unmarked": (0, 165, 255),  # Orange
    }

    for grid in result.grids:
        for bubble in grid.bubbles:
            cx = bubble["x"]
            cy = bubble["y"]
            radius = bubble["radius"]
            color = colors["marked"] if bubble["marked"] else colors["unmarked"]
            x1, y1 = max(0, cx - radius), max(0, cy - radius)
            x2, y2 = min(annotated.shape[1], cx + radius), min(annotated.shape[0], cy + radius)
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
            fill_pct = bubble["fill_percentage"]
            text = f"{fill_pct:.0%}"
            cv2.putText(annotated, text, (cx - 15, cy + 5), cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)

    return annotated

if __name__ == '__main__':
    # Test with the provided image
    logging.basicConfig(level=logging.INFO)
    image_path = '/home/ubuntu/upload/pasted_file_AQRc0q_image.png'
    image = cv2.imread(image_path)
    if image is not None:
        # Simulate perspective correction by resizing to a standard size if needed
        # For this test, we'll use the image as is, but in a real scenario, 
        # it would be the output of correct_perspective.
        result = detect_bubbles(image)
        if result.found:
            annotated = draw_bubbles(image, result)
            cv2.imwrite("/home/ubuntu/detected_bubbles_corrigido.png", annotated)
            print(f"Sucesso! Detectadas {len(result.grids)} linhas de respostas.")
            print("Imagem de depuração salva em /home/ubuntu/detected_bubbles_corrigido.png")
        else:
            print("Nenhuma bolha detectada.")
    else:
        print("Erro ao carregar a imagem.")