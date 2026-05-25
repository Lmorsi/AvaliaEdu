"""
Fiducial marker detection using L-shaped side markers.

The answer sheet has four L-shaped markers on the left and right sides:
  Left  top  (~30%) = marker opening rightward  (└ shape)
  Left  bot  (~70%) = marker opening rightward  (└ shape, lower)
  Right top  (~30%) = marker opening leftward   (┘ shape)
  Right bot  (~70%) = marker opening leftward   (┘ shape, lower)

Each marker is a solid black "L" made of two perpendicular bars.
Detection uses contour analysis with convexity defects to identify
L-shapes: they have exactly one large convexity defect (the inner
corner of the L).

More robust than ArUco for scanned/photographed answer sheets because:
  - Larger markers (7mm) survive lower resolution
  - Simple shape survives blur and perspective distortion
  - No dependency on opencv-contrib
"""

import logging
from typing import Optional

import cv2
import numpy as np

from omr.models import FiducialResult

logger = logging.getLogger(__name__)

# Area range for L-marker contours (tuned for 6mm markers with 2px bars at various scan resolutions)
# 6mm @ 150 DPI (common scanning) = ~35px -> area ~ 20-100 after morphology
_MIN_MARKER_AREA = 50
_MAX_MARKER_AREA = 25000


def _order_points(pts: np.ndarray) -> np.ndarray:
    """
    Order four points as: top-left, top-right, bottom-right, bottom-left.
    """
    cx = pts[:, 0].mean()
    cy = pts[:, 1].mean()
    angles = np.arctan2(pts[:, 1] - cy, pts[:, 0] - cx)
    sorted_pts = pts[np.argsort(angles)]
    min_y_idx = np.argmin(sorted_pts[:, 1])
    return np.roll(sorted_pts, -min_y_idx, axis=0)


def _is_l_shape(contour: np.ndarray) -> bool:
    """
    Check if a contour resembles an L-shape using convexity defects.

    An L-shape has exactly one large convexity defect — the inner corner
    where the two bars meet. This is more robust than quadrant analysis
    because it works regardless of the L's orientation or bar thickness.
    """
    hull = cv2.convexHull(contour)
    hull_area = cv2.contourArea(hull)
    if hull_area < 1:
        return False

    # Solidity: L-shape fills roughly 50-80% of its convex hull
    area = cv2.contourArea(contour)
    solidity = area / hull_area
    if solidity < 0.35 or solidity > 0.90:
        return False

    # Convexity defects: L-shapes have 1 large defect (the inner corner)
    contour_closed = contour.reshape(-1, 1, 2).astype(np.int32)
    hull_indices = cv2.convexHull(contour_closed, returnPoints=False)

    if hull_indices is None or len(hull_indices) < 3:
        return False

    try:
        defects = cv2.convexityDefects(contour_closed, hull_indices)
    except cv2.error:
        return False

    if defects is None:
        return False

    # Count significant defects (depth > 10% of contour perimeter)
    perimeter = cv2.arcLength(contour, True)
    if perimeter < 1:
        return False

    significant_defects = 0
    for defect in defects:
        # defect format: [start_idx, end_idx, farthest_pt_idx, depth]
        depth = defect[0][3] / 256.0  # depth is fixed-point with 8 fractional bits
        if depth > perimeter * 0.05:
            significant_defects += 1

    # L-shape should have exactly 1 significant convexity defect
    return significant_defects == 1


def _detect_l_markers(image: np.ndarray) -> list[tuple[int, int, int, int]]:
    """
    Detect L-shaped fiducial markers in a BGR image.

    Returns a list of (cx, cy, w, h) bounding boxes for each detected L-marker.
    More robust preprocessing for faint/pale markers from photo scans.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # CLAHE (Contrast Limited Adaptive Histogram Equalization) to brighten faint markers
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    # Try multiple thresholding strategies to catch faint black markers
    thresholds = []

    # Strategy 1: OTSU on enhanced image
    blurred = cv2.GaussianBlur(enhanced, (5, 5), 0)
    _, thresh1 = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    thresholds.append(("OTSU", thresh1))

    # Strategy 2: Manual threshold on original gray (catch very dark areas)
    _, thresh2 = cv2.threshold(gray, 100, 255, cv2.THRESH_BINARY_INV)
    thresholds.append(("Manual@100", thresh2))

    # Combine thresholds: take union (logical OR)
    combined = cv2.bitwise_or(thresh1, thresh2)

    # Morphological operations: open to remove noise, close to connect bars
    kernel_open = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    opened = cv2.morphologyEx(combined, cv2.MORPH_OPEN, kernel_open, iterations=1)

    kernel_close = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    processed = cv2.morphologyEx(opened, cv2.MORPH_CLOSE, kernel_close, iterations=2)

    contours, _ = cv2.findContours(processed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    logger.info("L-marker detection: found %d external contours", len(contours))

    markers = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < _MIN_MARKER_AREA or area > _MAX_MARKER_AREA:
            continue

        x, y, w, h = cv2.boundingRect(contour)

        # Aspect ratio: L-markers are roughly square (0.4 to 2.5, relaxed from 0.5-2.0)
        aspect = w / h if h > 0 else 0
        if aspect < 0.3 or aspect > 3.0:
            continue

        # Check if contour looks like an L
        if not _is_l_shape(contour):
            continue

        cx = int(x + w / 2)
        cy = int(y + h / 2)
        markers.append((cx, cy, w, h))
        logger.info(
            "L-marker: cx=%d, cy=%d, w=%d, h=%d, area=%.0f",
            cx, cy, w, h, area,
        )

    logger.info("L-marker detection: %d valid markers found", len(markers))
    return markers


def _classify_l_markers(
    markers: list[tuple[int, int, int, int]],
    img_width: int,
    img_height: int,
) -> list[tuple[int, int]]:
    """
    Classify detected L-markers into 4 expected positions:
      Left-top, Right-top, Right-bottom, Left-bottom.

    Uses x-coordinate to split left/right, then y-coordinate to split top/bottom.

    Returns ordered list: [left_top, right_top, right_bottom, left_bottom]
    """
    mid_x = img_width / 2

    left = [m for m in markers if m[0] < mid_x]
    right = [m for m in markers if m[0] >= mid_x]

    # Sort each side by y-coordinate
    left.sort(key=lambda m: m[1])
    right.sort(key=lambda m: m[1])

    logger.info("L-marker classification: left=%d, right=%d", len(left), len(right))

    # If uneven distribution, re-split using sorted x-coordinates
    if len(left) < 2 or len(right) < 2:
        sorted_by_x = sorted(markers, key=lambda m: m[0])
        left = sorted_by_x[:2]
        right = sorted_by_x[2:] if len(sorted_by_x) > 2 else sorted_by_x[2:]
        left.sort(key=lambda m: m[1])
        right.sort(key=lambda m: m[1])
        logger.info("L-marker re-split: left=%d, right=%d", len(left), len(right))

    # Pick top and bottom from each side
    left_top = left[0][:2] if len(left) > 0 else (0, 0)
    left_bottom = left[-1][:2] if len(left) > 1 else (0, img_height)
    right_top = right[0][:2] if len(right) > 0 else (img_width, 0)
    right_bottom = right[-1][:2] if len(right) > 1 else (img_width, img_height)

    # TL, TR, BR, BL order
    return [left_top, right_top, right_bottom, left_bottom]


def detect_fiducials(image: np.ndarray) -> FiducialResult:
    """
    Detect the four L-shaped side markers in a BGR image.

    The image is resized to width=900 for stable detection, then coordinates
    are scaled back to the original image dimensions.
    """
    original_h, original_w = image.shape[:2]

    scale = 900 / original_w
    new_h = int(original_h * scale)
    resized = cv2.resize(image, (900, new_h), interpolation=cv2.INTER_AREA)
    scale_x = original_w / 900
    scale_y = original_h / new_h

    markers = _detect_l_markers(resized)

    if len(markers) < 4:
        logger.warning(
            "L-markers: expected 4, found %d",
            len(markers),
        )
        return FiducialResult(found=False, count=len(markers))

    # If more than 4 found, keep the 4 most likely markers
    # (pick ones closest to expected positions: 2 left, 2 right, at ~30%/70% height)
    if len(markers) > 4:
        classified = _classify_l_markers(markers, 900, new_h)
        centroids = classified
    else:
        classified = _classify_l_markers(markers, 900, new_h)
        centroids = classified

    corners = [
        [float(x * scale_x), float(y * scale_y)]
        for x, y in centroids
    ]

    logger.info("L-marker corners (TL,TR,BR,BL): %s", corners)

    return FiducialResult(found=True, count=4, corners=corners)


def draw_fiducials(image: np.ndarray, result: FiducialResult) -> np.ndarray:
    """Draw detected L-shaped markers on a copy of the image (for debugging)."""
    annotated = image.copy()

    # Re-detect and draw raw L-marker contours
    gray = cv2.cvtColor(annotated, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    processed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=2)
    contours, _ = cv2.findContours(processed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    for contour in contours:
        area = cv2.contourArea(contour)
        if area < _MIN_MARKER_AREA or area > _MAX_MARKER_AREA:
            continue
        if _is_l_shape(contour):
            cv2.drawContours(annotated, [contour], -1, (255, 200, 0), 2)

    if not result.found or result.corners is None:
        return annotated

    labels = ["LT", "RT", "RB", "LB"]
    colors = [(0, 255, 0), (0, 200, 255), (0, 0, 255), (255, 100, 0)]

    for corner, label, color in zip(result.corners, labels, colors):
        cx, cy = int(corner[0]), int(corner[1])
        cv2.circle(annotated, (cx, cy), 15, color, 3)
        cv2.putText(annotated, label, (cx + 18, cy - 18),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)

    return annotated
