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


def _find_checkboxes(gray: np.ndarray, min_area: int = 150, max_area: int = 1000) -> list[tuple[int, int, int, int]]:
    """
    Find circular answer bubbles in a grayscale image.

    Returns list of (x, y, width, height) for each detected circle.
    Optimized for 18px circles with 12px+ spacing.
    """
    # Apply Otsu's thresholding for better separation
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # Morphological operations to enhance circles
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
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

        # Minimum size: 12x12 pixels (18px circles are ~12-20px depending on scale)
        if w < 12 or h < 12:
            continue

        # Check if it's roughly square-like (circles have aspect ~1)
        aspect_ratio = float(w) / h if h > 0 else 0
        if aspect_ratio < 0.8 or aspect_ratio > 1.2:
            continue

        # Check circularity: STRICT (0.75+) - only accept circles
        perimeter = cv2.arcLength(contour, True)
        if perimeter < 1:
            continue

        circularity = 4 * np.pi * area / (perimeter * perimeter)
        if circularity < 0.75:  # STRICT - only real circles pass
            continue

        # Additional filter: solidity (area / convex hull area)
        # Circles should be solid
        hull = cv2.convexHull(contour)
        hull_area = cv2.contourArea(hull)
        if hull_area > 0:
            solidity = area / hull_area
            if solidity < 0.75:  # Exclude if too hollow
                continue

        checkboxes.append((x, y, w, h))
        logger.info(f"Circle: x={x}, y={y}, w={w}, h={h}, aspect={aspect_ratio:.2f}, circ={circularity:.3f}, solid={solidity:.3f}, area={area:.0f}")

    logger.info("Total circles found: %d", len(checkboxes))
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
    checkboxes: list[tuple[int, int, int, int]], tolerance: int = 15
) -> list[list[tuple[int, int, int, int]]]:
    """
    Group checkboxes into grid rows based on y-coordinate proximity.

    Checkboxes within `tolerance` pixels vertically are grouped into rows.
    Also filters rows with too few checkboxes (noise).
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

    # Filter rows: only keep rows with at least 3 checkboxes (valid answer rows)
    # This removes noise like single detected letters
    filtered_rows = [row for row in rows if len(row) >= 3]

    logger.info(f"Clustered into {len(rows)} rows, kept {len(filtered_rows)} valid rows (min 3 checkboxes)")
    for i, row in enumerate(filtered_rows):
        logger.info(f"Row {i}: {len(row)} checkboxes at y={row[0][1]}, x_positions: {[b[0] for b in row]}")

    return filtered_rows


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
