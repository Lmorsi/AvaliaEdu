"""
Checkbox/Square reader for OMR answer sheets.

Detects filled checkboxes (marked squares) in the answer area of the sheet.
Uses contour detection and approximation to identify rectangular regions
and determines fill percentage to classify as marked or unmarked.
"""

import logging
from typing import Optional

import cv2
import numpy as np

from omr.models import BubbleResult, BubbleGrid

logger = logging.getLogger(__name__)


def _find_checkboxes(gray: np.ndarray, min_area: int = 15, max_area: int = 1000) -> list[tuple[int, int, int, int]]:
    """
    Find rectangular checkbox regions in a grayscale image.

    Returns list of (x, y, width, height) for each detected checkbox.
    Uses contour detection and circle/square detection.
    """
    # Apply Otsu's thresholding for better separation
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # Minimal morphological operations to avoid losing small shapes
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2))
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

        # Minimum size check (allow very small boxes - 3-4 pixels)
        if w < 3 or h < 3:
            continue

        # Check if it's roughly square-like or circular (aspect ratio 0.6 to 1.4)
        aspect_ratio = float(w) / h if h > 0 else 0
        if aspect_ratio < 0.6 or aspect_ratio > 1.4:
            continue

        # Try to detect if it's filled (dark) or just outline
        # This helps distinguish actual marked boxes from empty ones
        roi = gray[max(0, y):min(gray.shape[0], y+h), max(0, x):min(gray.shape[1], x+w)]
        if roi.size == 0:
            continue

        # Check circularity as additional filter (not too strict)
        perimeter = cv2.arcLength(contour, True)
        if perimeter < 1:
            continue

        circularity = 4 * np.pi * area / (perimeter * perimeter)
        if circularity < 0.5:  # Very loose - accepts circles and squares
            continue

        checkboxes.append((x, y, w, h))
        logger.info(f"Box: x={x}, y={y}, w={w}, h={h}, aspect={aspect_ratio:.2f}, circ={circularity:.3f}, area={area:.0f}")

    logger.info("Total checkboxes found: %d", len(checkboxes))
    return checkboxes


def _calculate_fill_percentage(
    gray: np.ndarray, x: int, y: int, w: int, h: int, threshold: int = 130
) -> float:
    """
    Calculate fill percentage of a checkbox region.

    Counts dark pixels inside the checkbox and returns percentage.
    """
    y1, y2 = max(0, y), min(gray.shape[0], y + h)
    x1, x2 = max(0, x), min(gray.shape[1], x + w)

    roi = gray[y1:y2, x1:x2]
    if roi.size == 0:
        return 0.0

    dark_pixels = np.sum(roi < threshold)
    total_pixels = roi.size

    if total_pixels == 0:
        return 0.0

    return float(dark_pixels) / float(total_pixels)


def _cluster_checkboxes(
    checkboxes: list[tuple[int, int, int, int]], tolerance: int = 30
) -> list[list[tuple[int, int, int, int]]]:
    """
    Group checkboxes into grid rows based on y-coordinate proximity.

    Checkboxes within `tolerance` pixels vertically are grouped into rows.
    """
    if not checkboxes:
        return []

    # Sort by y-coordinate
    sorted_checkboxes = sorted(checkboxes, key=lambda b: b[1])

    logger.info(f"Clustering {len(sorted_checkboxes)} checkboxes with tolerance={tolerance}")

    rows = []
    current_row = [sorted_checkboxes[0]]

    for checkbox in sorted_checkboxes[1:]:
        # If checkbox is close to current row (within tolerance), add to row
        if abs(checkbox[1] - current_row[0][1]) <= tolerance:
            current_row.append(checkbox)
        else:
            # Start a new row
            if len(current_row) > 0:
                rows.append(sorted(current_row, key=lambda b: b[0]))  # Sort by x within row
            current_row = [checkbox]

    # Don't forget the last row
    if len(current_row) > 0:
        rows.append(sorted(current_row, key=lambda b: b[0]))

    logger.info(f"Clustered into {len(rows)} rows")
    for i, row in enumerate(rows):
        logger.debug(f"Row {i}: {len(row)} checkboxes, y_positions: {[b[1] for b in row]}")

    return rows


def detect_bubbles(
    image: np.ndarray,
    fill_threshold: int = 150,
    marked_percentage: float = 0.25,
) -> BubbleResult:
    """
    Detect and classify checkboxes as marked or unmarked.

    Args:
        image: BGR image (typically perspective-corrected)
        fill_threshold: Grayscale threshold for dark pixel detection (0-255)
        marked_percentage: Fill % above which a checkbox is considered marked

    Returns:
        BubbleResult with grid of marked checkboxes
    """
    if image is None or image.size == 0:
        logger.error("Image is empty or None")
        return BubbleResult(found=False, grids=[])

    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape
    logger.info("Image shape: %dx%d (H=%d, W=%d)", width, height, height, width)

    # Find all checkboxes
    checkboxes = _find_checkboxes(gray)
    if not checkboxes:
        logger.warning("No checkboxes detected in image")
        return BubbleResult(found=False, grids=[])

    logger.info("Found %d checkbox candidates", len(checkboxes))

    # Filter checkboxes that are outside image bounds (safety check)
    valid_checkboxes = []
    for x, y, w, h in checkboxes:
        if x < 0 or y < 0 or x + w > width or y + h > height:
            logger.warning(f"Checkbox at ({x}, {y}, {w}, {h}) outside image bounds [{width}x{height}], skipping")
            continue
        valid_checkboxes.append((x, y, w, h))

    if not valid_checkboxes:
        logger.warning("All checkbox candidates were outside image bounds")
        return BubbleResult(found=False, grids=[])

    checkboxes = valid_checkboxes
    logger.info("After filtering: %d valid checkboxes", len(checkboxes))

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
                "x": x + w // 2,  # Return center x
                "y": y + h // 2,  # Return center y
                "radius": max(w, h) // 2,  # Return equivalent radius
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

            # Draw rectangle around checkbox
            x1 = max(0, cx - radius)
            y1 = max(0, cy - radius)
            x2 = min(annotated.shape[1], cx + radius)
            y2 = min(annotated.shape[0], cy + radius)
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)

            # Draw fill percentage text
            fill_pct = bubble["fill_percentage"]
            text = f"{fill_pct:.0%}"
            cv2.putText(
                annotated,
                text,
                (cx - 15, cy + 5),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.4,
                color,
                1,
            )

    return annotated
