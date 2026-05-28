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


def _find_checkboxes(
    gray: np.ndarray,
    min_area: int = 100,
    max_area: int = 5000,
    roi: tuple[int, int, int, int] | None = None,
) -> list[tuple[int, int, int, int]]:
    """
    Find rectangular checkbox regions in a grayscale image.

    Returns list of (x, y, width, height) for each detected checkbox.
    Uses contour detection and rectangle approximation.

    roi: (x1, y1, x2, y2) bounding box to restrict detection. Coordinates are
    in the full-image space; returned checkboxes are also in full-image space.
    """
    # Restrict processing to ROI when provided
    if roi is not None:
        img_h, img_w = gray.shape[:2]
        x1_roi = max(0, roi[0])
        y1_roi = max(0, roi[1])
        x2_roi = min(img_w, roi[2])
        y2_roi = min(img_h, roi[3])
        working = gray[y1_roi:y2_roi, x1_roi:x2_roi]
        x_offset, y_offset = x1_roi, y1_roi
        logger.info("Using ROI (%d,%d,%d,%d), working region %dx%d", x1_roi, y1_roi, x2_roi, y2_roi,
                    x2_roi - x1_roi, y2_roi - y1_roi)
    else:
        working = gray
        x_offset, y_offset = 0, 0

    # Apply Otsu's thresholding for better separation
    _, thresh = cv2.threshold(working, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # Apply morphological operations to enhance rectangles
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    gray_processed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=2)

    # Find contours
    contours, _ = cv2.findContours(gray_processed, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

    logger.info("Found %d contours after morphology", len(contours))

    checkboxes = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if not (min_area < area < max_area):
            continue

        # Approximate contour to polygon
        epsilon = 0.03 * cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, epsilon, True)

        # We want rectangles (4 vertices)
        if len(approx) != 4:
            continue

        # Get bounding rectangle
        x, y, w, h = cv2.boundingRect(contour)

        # Check if it's roughly square (aspect ratio close to 1)
        aspect_ratio = float(w) / h if h > 0 else 0
        if aspect_ratio < 0.7 or aspect_ratio > 1.3:
            logger.debug(f"Skipped: aspect_ratio={aspect_ratio:.2f} (not square-like)")
            continue

        # Ensure minimum size
        if w < 12 or h < 12:
            logger.debug(f"Skipped: size too small ({w}x{h})")
            continue

        checkboxes.append((x, y, w, h))
        logger.info(f"Checkbox: x={x}, y={y}, w={w}, h={h}, aspect={aspect_ratio:.2f}, area={area:.0f}")

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
    fill_threshold: int = 130,
    marked_percentage: float = 0.35,
    roi: tuple[int, int, int, int] | None = None,
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
    checkboxes = _find_checkboxes(gray, roi=roi)
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
