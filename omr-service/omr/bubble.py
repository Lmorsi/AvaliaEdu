"""
Checkbox/Bubble reader for OMR answer sheets.

Detects answer bubbles (circles and checkboxes) in the answer area of the sheet.
Uses contour detection and intelligent filtering to identify and classify bubbles
as marked or unmarked, while removing duplicates and false positives.
"""

import logging
from typing import List, Tuple, Dict, Any

import cv2
import numpy as np

from omr.models import BubbleResult, BubbleGrid

logger = logging.getLogger(__name__)


def _is_overlapping(box1: Tuple[int, int, int, int], box2: Tuple[int, int, int, int]) -> bool:
    """
    Check if two boxes overlap significantly.

    Returns True if intersection area is > 50% of the smaller box.
    Used to identify duplicate detections (inner/outer edges of same bubble).
    """
    x1, y1, w1, h1 = box1
    x2, y2, w2, h2 = box2

    # Calculate intersection
    xi1 = max(x1, x2)
    yi1 = max(y1, y2)
    xi2 = min(x1 + w1, x2 + w2)
    yi2 = min(y1 + h1, y2 + h2)

    if xi2 <= xi1 or yi2 <= yi1:
        return False

    intersection_area = (xi2 - xi1) * (yi2 - yi1)
    box1_area = w1 * h1
    box2_area = w2 * h2
    min_area = min(box1_area, box2_area)

    # Significant overlap if > 50% of smaller box
    return intersection_area > 0.5 * min_area


def _filter_bubbles(
    candidates: List[Tuple[int, int, int, int]],
    size_tolerance: float = 0.4
) -> List[Tuple[int, int, int, int]]:
    """
    Remove duplicates and filter by consistent size to eliminate false positives.

    1. Removes overlapping detections (keeps larger box)
    2. Filters by size consistency (removes letters, numbers, noise)

    Args:
        candidates: List of (x, y, w, h) candidate bubbles
        size_tolerance: Acceptable deviation from median size (0.4 = ±40%)

    Returns:
        Filtered list of validated bubbles
    """
    if not candidates:
        return []

    logger.info(f"Filter: Processing {len(candidates)} bubble candidates")

    # Step 1: Remove overlapping detections (keep larger boxes)
    candidates_sorted = sorted(candidates, key=lambda b: b[2] * b[3], reverse=True)
    unique_bubbles = []

    for cand in candidates_sorted:
        is_duplicate = False
        for unique in unique_bubbles:
            if _is_overlapping(cand, unique):
                is_duplicate = True
                logger.debug(f"Removed duplicate bubble at ({cand[0]}, {cand[1]}) - overlaps with ({unique[0]}, {unique[1]})")
                break

        if not is_duplicate:
            unique_bubbles.append(cand)

    logger.info(f"Filter: {len(candidates)} -> {len(unique_bubbles)} after duplicate removal")

    # Step 2: Filter by size consistency (median-based)
    if len(unique_bubbles) < 5:
        logger.info("Filter: Less than 5 bubbles, skipping size filter")
        return unique_bubbles

    areas = [b[2] * b[3] for b in unique_bubbles]
    median_area = np.median(areas)
    min_area = median_area * (1 - size_tolerance)
    max_area = median_area * (1 + size_tolerance)

    logger.info(f"Filter: Median area={median_area:.0f}, range=[{min_area:.0f}, {max_area:.0f}]")

    size_filtered = []
    for b in unique_bubbles:
        area = b[2] * b[3]
        if min_area < area < max_area:
            size_filtered.append(b)
        else:
            logger.debug(f"Filter: Removed outlier box ({b[0]}, {b[1]}, {b[2]}x{b[3]}) - area={area:.0f}")

    logger.info(f"Filter: {len(unique_bubbles)} -> {len(size_filtered)} after size filtering")
    return size_filtered


def _find_bubbles(
    gray: np.ndarray,
    roi: Tuple[int, int, int, int] | None = None,
) -> List[Tuple[int, int, int, int]]:
    """
    Find bubble candidates in grayscale image using contour detection.

    Args:
        gray: Grayscale image
        roi: Optional ROI (x1, y1, x2, y2) to restrict detection

    Returns:
        List of (x, y, w, h) candidates (not yet filtered)
    """
    # Restrict to ROI if provided
    if roi is not None:
        img_h, img_w = gray.shape[:2]
        x1_roi = max(0, roi[0])
        y1_roi = max(0, roi[1])
        x2_roi = min(img_w, roi[2])
        y2_roi = min(img_h, roi[3])
        working = gray[y1_roi:y2_roi, x1_roi:x2_roi]
        x_offset, y_offset = x1_roi, y1_roi
        logger.info(f"ROI: ({x1_roi}, {y1_roi}, {x2_roi}, {y2_roi})")
    else:
        working = gray
        x_offset, y_offset = 0, 0

    # Adaptive thresholding for better bubble detection
    # Parameter C=5: More demanding contrast, ignores light paper textures
    # and small print artifacts that aren't as dark as bubbles
    thresh = cv2.adaptiveThreshold(
        working, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV, 15, 5
    )

    # Morphological operations to unite inner/outer edges
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)

    # Find contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    logger.info(f"Found {len(contours)} contours")

    candidates = []
    for cnt in contours:
        area = cv2.contourArea(cnt)

        # Filter by area (bubbles should be reasonably sized)
        if area < 100 or area > 8000:
            continue

        x, y, w, h = cv2.boundingRect(cnt)

        # Filter by aspect ratio (circles/ovals)
        aspect_ratio = float(w) / h if h > 0 else 0
        if aspect_ratio < 0.6 or aspect_ratio > 1.4:
            logger.debug(f"Skipped contour: aspect_ratio={aspect_ratio:.2f} at ({x}, {y})")
            continue

        # Adjust coordinates back to full image space
        candidates.append((x + x_offset, y + y_offset, w, h))

    logger.info(f"Found {len(candidates)} bubble candidates")
    return candidates


def _validate_grid_columns(
    bubbles: List[Tuple[int, int, int, int]],
    column_tolerance: int = 20
) -> List[Tuple[int, int, int, int]]:
    """
    Validate grid by checking vertical alignment of columns.

    A bubble is only considered valid if it has at least 2 other bubbles
    aligned vertically with it (same column). This eliminates noise and
    random print artifacts that can't form proper columns.

    Args:
        bubbles: List of (x, y, w, h) bubbles
        column_tolerance: Maximum x-distance to consider bubbles in same column

    Returns:
        Filtered list of bubbles that form valid columns (3+ per column)
    """
    if not bubbles or len(bubbles) < 3:
        logger.info("Grid validation: Not enough bubbles for column validation")
        return bubbles

    # Extract x-coordinates (center of bubbles)
    bubble_x_centers = [(b[0] + b[2] // 2, b) for b in bubbles]
    bubble_x_centers.sort(key=lambda b: b[0])

    # Group bubbles by vertical alignment (column)
    columns = []
    for x_center, bubble in bubble_x_centers:
        # Find if bubble belongs to existing column
        found_column = False
        for column in columns:
            # Check if x-center is close to column's representative x
            col_x = column[0][0] + column[0][2] // 2
            if abs(x_center - col_x) <= column_tolerance:
                column.append(bubble)
                found_column = True
                break

        if not found_column:
            # Create new column
            columns.append([bubble])

    logger.info(f"Grid validation: Found {len(columns)} potential columns")

    # Filter columns: keep only those with 3+ bubbles (valid answer columns)
    valid_bubbles = []
    for col_idx, column in enumerate(columns):
        if len(column) >= 3:
            valid_bubbles.extend(column)
            logger.debug(f"Column {col_idx}: {len(column)} bubbles (VALID)")
        else:
            logger.debug(f"Column {col_idx}: {len(column)} bubbles (REJECTED - noise/artifact)")

    logger.info(f"Grid validation: {len(bubbles)} -> {len(valid_bubbles)} bubbles after column validation")
    return valid_bubbles


def _cluster_into_rows(
    bubbles: List[Tuple[int, int, int, int]],
    row_tolerance: int = 25
) -> List[List[Tuple[int, int, int, int]]]:
    """
    Group bubbles into rows based on y-coordinate proximity.
    Only keeps rows with 2+ bubbles (validates grid structure).

    Args:
        bubbles: List of (x, y, w, h) bubbles
        row_tolerance: Maximum y-distance to group in same row

    Returns:
        List of rows, each containing 2+ bubbles
    """
    if not bubbles:
        return []

    # Sort by y-coordinate
    sorted_bubbles = sorted(bubbles, key=lambda b: b[1])

    rows = []
    current_row = [sorted_bubbles[0]]

    for bubble in sorted_bubbles[1:]:
        # Check if bubble belongs to current row
        if abs(bubble[1] - current_row[0][1]) <= row_tolerance:
            current_row.append(bubble)
        else:
            # Validate current row before adding
            if len(current_row) >= 2:
                rows.append(sorted(current_row, key=lambda b: b[0]))  # Sort by x
                logger.debug(f"Row {len(rows)}: {len(current_row)} bubbles")
            else:
                logger.debug(f"Rejected isolated bubble at ({current_row[0][0]}, {current_row[0][1]})")

            current_row = [bubble]

    # Validate last row
    if len(current_row) >= 2:
        rows.append(sorted(current_row, key=lambda b: b[0]))
        logger.debug(f"Row {len(rows)}: {len(current_row)} bubbles")
    else:
        logger.debug(f"Rejected isolated bubble at ({current_row[0][0]}, {current_row[0][1]})")

    logger.info(f"Clustered into {len(rows)} valid rows")
    return rows


def _calculate_fill_percentage(
    gray: np.ndarray,
    x: int, y: int, w: int, h: int,
    threshold: int = 130
) -> float:
    """
    Calculate fill percentage of a bubble region.

    Counts dark pixels inside the bounding box and returns percentage.
    """
    y1 = max(0, y)
    y2 = min(gray.shape[0], y + h)
    x1 = max(0, x)
    x2 = min(gray.shape[1], x + w)

    roi = gray[y1:y2, x1:x2]
    if roi.size == 0:
        return 0.0

    dark_pixels = np.sum(roi < threshold)
    return float(dark_pixels) / float(roi.size)


def detect_bubbles(
    image: np.ndarray,
    fill_threshold: int = 130,
    marked_percentage: float = 0.35,
    roi: Tuple[int, int, int, int] | None = None,
) -> BubbleResult:
    """
    Detect and classify answer bubbles as marked or unmarked.

    Robust pipeline with vertical grid intelligence:
    1. Find bubble candidates via contour detection (C=5 for better filtering)
    2. Remove duplicate detections (NMS)
    3. Filter by consistent size to remove letters/numbers
    4. Validate vertical columns (3+ bubbles per column required)
    5. Cluster into rows (validate 2+ per row)
    6. Calculate fill percentage

    Args:
        image: BGR image
        fill_threshold: Grayscale threshold for dark pixel detection
        marked_percentage: Fill % above which bubble is considered marked
        roi: Optional ROI to restrict detection

    Returns:
        BubbleResult with detected grid
    """
    if image is None or image.size == 0:
        logger.error("Image is empty or None")
        return BubbleResult(found=False, grids=[])

    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    logger.info(f"Image shape: {gray.shape}")

    # Step 1: Find bubble candidates
    candidates = _find_bubbles(gray, roi=roi)
    if not candidates:
        logger.warning("No bubble candidates found")
        return BubbleResult(found=False, grids=[])

    # Step 2-3: Remove duplicates and filter by size
    bubbles = _filter_bubbles(candidates, size_tolerance=0.4)
    if not bubbles:
        logger.warning("No bubbles remaining after filtering")
        return BubbleResult(found=False, grids=[])

    # Step 4: Validate vertical columns (Grid Intelligence)
    # Eliminates noise/artifacts that can't form proper columns
    bubbles = _validate_grid_columns(bubbles, column_tolerance=20)
    if not bubbles:
        logger.warning("No bubbles remaining after grid column validation")
        return BubbleResult(found=False, grids=[])

    # Step 5: Cluster into rows (validate grid structure)
    rows = _cluster_into_rows(bubbles, row_tolerance=25)
    if not rows:
        logger.warning("No valid rows found (need 2+ bubbles per row)")
        return BubbleResult(found=False, grids=[])

    # Step 6: Classify bubbles
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

            logger.info(
                f"Row {row_idx}, Col {col_idx}: fill={fill_pct:.2%}, "
                f"marked={is_marked}, pos=({x},{y}), size=({w}x{h})"
            )

        grids.append(BubbleGrid(row=row_idx, bubbles=grid_row))

    logger.info(f"Detected {len(grids)} rows with bubbles")
    return BubbleResult(found=True, grids=grids)


def draw_bubbles(image: np.ndarray, result: BubbleResult) -> np.ndarray:
    """Draw detected bubbles on image (for debugging)."""
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

            # Draw circle
            cv2.circle(annotated, (cx, cy), radius, color, 2)

            # Draw fill percentage text
            fill_pct = bubble["fill_percentage"]
            text = f"{fill_pct:.0%}"
            cv2.putText(
                annotated, text, (cx - 15, cy + 5),
                cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1,
            )

    return annotated
