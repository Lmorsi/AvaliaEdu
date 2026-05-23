"""
Bubble reader for OMR answer sheets.

Detects filled bubbles (marked circles) in the answer area of the sheet.
Uses contour detection and circularity analysis to identify bubble regions
and determines fill percentage to classify as marked or unmarked.
"""

import logging
from typing import Optional

import cv2
import numpy as np

from omr.models import BubbleResult, BubbleGrid

logger = logging.getLogger(__name__)


def _find_bubbles(gray: np.ndarray, min_area: int = 60, max_area: int = 4000) -> list[tuple[int, int, int]]:
    """
    Find circular bubble regions in a grayscale image.

    Returns list of (cx, cy, radius) for each detected bubble.
    Uses contour detection and circularity filtering.
    """
    # Apply adaptive thresholding for better contrast
    thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                    cv2.THRESH_BINARY_INV, 21, 5)

    # Apply morphological operations to enhance circles
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    gray_processed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    gray_processed = cv2.morphologyEx(gray_processed, cv2.MORPH_OPEN, kernel)

    # Find contours
    contours, _ = cv2.findContours(gray_processed, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

    logger.info("Found %d contours total", len(contours))

    bubbles = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if not (min_area < area < max_area):
            continue

        # Fit circle
        (cx, cy), radius = cv2.minEnclosingCircle(contour)
        if radius < 9:
            continue

        # Check circularity: 4π * area / perimeter²
        perimeter = cv2.arcLength(contour, True)
        if perimeter < 1:
            continue

        circularity = 4 * np.pi * area / (perimeter * perimeter)
        if circularity < 0.68:  # Stricter circularity to filter noise
            continue

        bubbles.append((int(cx), int(cy), int(radius)))
        logger.debug(f"Bubble: cx={cx:.0f}, cy={cy:.0f}, r={radius:.0f}, area={area:.0f}, circ={circularity:.2f}")

    return bubbles


def _calculate_fill_percentage(
    gray: np.ndarray, cx: int, cy: int, radius: int, threshold: int = 127
) -> float:
    """
    Calculate fill percentage of a bubble.

    Counts dark pixels inside the bubble region and returns percentage.
    """
    y1, y2 = max(0, cy - radius), min(gray.shape[0], cy + radius)
    x1, x2 = max(0, cx - radius), min(gray.shape[1], cx + radius)

    roi = gray[y1:y2, x1:x2]
    mask = cv2.circle(np.zeros_like(roi), (radius, radius), radius, 255, -1)
    mask = mask[:roi.shape[0], :roi.shape[1]]

    dark_pixels = np.sum((roi < threshold) & (mask > 0))
    total_pixels = np.sum(mask > 0)

    if total_pixels == 0:
        return 0.0

    return float(dark_pixels) / float(total_pixels)


def _cluster_bubbles(
    bubbles: list[tuple[int, int, int]], tolerance: int = 40
) -> list[list[tuple[int, int, int]]]:
    """
    Group bubbles into grid rows based on y-coordinate proximity.

    Bubbles within `tolerance` pixels vertically are grouped into rows.
    Filters out outliers (bubbles too far above/below the main content).
    """
    if not bubbles:
        return []

    # Sort by y-coordinate
    sorted_bubbles = sorted(bubbles, key=lambda b: b[1])

    # Find the median y-position to filter outliers
    y_values = [b[1] for b in sorted_bubbles]
    median_y = sorted(y_values)[len(y_values) // 2]

    # Filter bubbles that are too far from median (outliers)
    max_y_deviation = 500  # Allow bubbles up to 500px from median
    filtered_bubbles = [b for b in sorted_bubbles if abs(b[1] - median_y) < max_y_deviation]

    logger.info(f"Filtered bubbles: {len(sorted_bubbles)} -> {len(filtered_bubbles)} (median_y={median_y})")

    if not filtered_bubbles:
        return []

    rows = []
    current_row = [filtered_bubbles[0]]

    for bubble in filtered_bubbles[1:]:
        if abs(bubble[1] - current_row[0][1]) <= tolerance:
            current_row.append(bubble)
        else:
            rows.append(sorted(current_row, key=lambda b: b[0]))  # Sort by x within row
            current_row = [bubble]

    rows.append(sorted(current_row, key=lambda b: b[0]))
    return rows


def detect_bubbles(
    image: np.ndarray,
    fill_threshold: int = 150,
    marked_percentage: float = 0.35,
) -> BubbleResult:
    """
    Detect and classify bubbles as marked or unmarked.

    Args:
        image: BGR image (typically perspective-corrected)
        fill_threshold: Grayscale threshold for dark pixel detection (0-255)
        marked_percentage: Fill % above which a bubble is considered marked

    Returns:
        BubbleResult with grid of marked bubbles
    """
    if image is None or image.size == 0:
        logger.error("Image is empty or None")
        return BubbleResult(found=False, grids=[])

    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    logger.info("Image shape: %dx%d", gray.shape[1], gray.shape[0])

    # Find all bubbles
    bubbles = _find_bubbles(gray)
    if not bubbles:
        logger.warning("No bubbles detected in image")
        return BubbleResult(found=False, grids=[])

    logger.info("Found %d bubble candidates", len(bubbles))

    # Cluster bubbles into rows
    rows = _cluster_bubbles(bubbles)
    logger.info("Clustered into %d rows", len(rows))

    # Classify each bubble as marked/unmarked
    grids = []
    for row_idx, row in enumerate(rows):
        grid_row = []
        for col_idx, (cx, cy, radius) in enumerate(row):
            fill_pct = _calculate_fill_percentage(gray, cx, cy, radius, fill_threshold)
            is_marked = fill_pct >= marked_percentage

            grid_row.append({
                "col": col_idx,
                "x": cx,
                "y": cy,
                "radius": radius,
                "fill_percentage": fill_pct,
                "marked": is_marked,
            })

            logger.info(f"Row {row_idx}, Col {col_idx}: fill={fill_pct:.2%}, marked={is_marked}")

        grids.append(BubbleGrid(row=row_idx, bubbles=grid_row))

    logger.info("Detected %d rows with bubbles", len(grids))
    return BubbleResult(found=True, grids=grids)


def draw_bubbles(image: np.ndarray, result: BubbleResult) -> np.ndarray:
    """Draw detected bubbles on a copy of the image (for debugging)."""
    annotated = image.copy()

    colors = {
        "marked": (0, 255, 0),      # Green
        "unmarked": (0, 165, 255),  # Orange
    }

    for grid in result.grids:
        for bubble in grid.bubbles:
            cx, cy = bubble["x"], bubble["y"]
            radius = bubble["radius"]
            color = colors["marked"] if bubble["marked"] else colors["unmarked"]

            # Draw circle
            cv2.circle(annotated, (cx, cy), radius, color, 2)

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
