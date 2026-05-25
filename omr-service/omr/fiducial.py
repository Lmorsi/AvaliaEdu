"""
Fiducial marker detection using L-shaped side markers.

The answer sheet has four L-shaped markers on the left and right sides:
  Left  top  (~30%) = marker opening rightward  (└ shape)
  Left  bot  (~70%) = marker opening rightward  (└ shape, lower)
  Right top  (~30%) = marker opening leftward   (┘ shape)
  Right bot  (~70%) = marker opening leftward   (┘ shape, lower)

Each marker is a solid black "L" made of two perpendicular bars.
Detection uses contour analysis: find L-shaped contours by checking
the bounding box fill pattern (two perpendicular rectangular regions).

More robust than ArUco for scanned/photographed answer sheets because:
  - Larger markers (7mm vs 5mm) survive lower resolution
  - Simple shape survives blur and perspective distortion
  - No dependency on opencv-contrib
"""

import logging
from typing import Optional

import cv2
import numpy as np

from omr.models import FiducialResult

logger = logging.getLogger(__name__)

# Minimum area for an L-marker contour (pixels^2) — tuned for 7mm markers
_MIN_MARKER_AREA = 200
_MAX_MARKER_AREA = 15000

# Circularity range for L-shapes (lower than circles, ~0.4-0.7)
_MIN_CIRCULARITY = 0.25
_MAX_CIRCULARITY = 0.75

# Aspect ratio for L-markers: roughly square bounding box
_MIN_ASPECT = 0.5
_MAX_ASPECT = 2.0


def _order_points(pts: np.ndarray) -> np.ndarray:
    """
    Order four points as: top-left, top-right, bottom-right, bottom-left.
    Uses centroid-based angle calculation for robust ordering in any orientation.
    """
    rect = np.zeros((4, 2), dtype="float32")

    cx = pts[:, 0].mean()
    cy = pts[:, 1].mean()

    angles = np.arctan2(pts[:, 1] - cy, pts[:, 0] - cx)
    sorted_indices = np.argsort(angles)
    sorted_pts = pts[sorted_indices]

    min_y_idx = np.argmin(sorted_pts[:, 1])
    rect = np.roll(sorted_pts, -min_y_idx, axis=0)

    return rect


def _is_l_shape(contour: np.ndarray) -> bool:
    """
    Check if a contour resembles an L-shape by analyzing the spatial
    distribution of points within its bounding box.

    An L-shape has two perpendicular bars, so points cluster in two
    perpendicular rectangular regions sharing a corner.
    """
    x, y, w, h = cv2.boundingRect(contour)
    if w < 10 or h < 10:
        return False

    # Create a mask of the contour within its bounding box
    mask = np.zeros((h, w), dtype=np.uint8)
    shifted = contour - np.array([x, y])
    cv2.drawContours(mask, [shifted], -1, 255, -1)

    total_fill = np.count_nonzero(mask)
    bounding_area = w * h
    if bounding_area == 0:
        return False

    # L-shape occupies roughly 50-75% of its bounding box
    # (two bars sharing a corner: area = bar_w*h + w*bar_h - bar_w*bar_h)
    fill_ratio = total_fill / bounding_area
    if fill_ratio < 0.3 or fill_ratio > 0.85:
        return False

    # Check quadrant fill pattern: L-shape has one empty quadrant
    # Divide bounding box into 4 quadrants
    hw, hh = w // 2, h // 2
    if hw == 0 or hh == 0:
        return False

    q_tl = np.count_nonzero(mask[:hh, :hw])
    q_tr = np.count_nonzero(mask[:hh, hw:])
    q_bl = np.count_nonzero(mask[hh:, :hw])
    q_br = np.count_nonzero(mask[hh:, hw:])

    # An L-shape (e.g. └) fills TL+BL+TR quadrants, but BR is sparse
    # For └: top bar fills TL+TR, left bar fills TL+BL -> BR is empty
    # For ┘: top bar fills TL+TR, right bar fills TR+BR -> BL is empty
    # For ┐: right bar fills TR+BR, top bar fills TL+TR -> BL is empty
    # For └: bottom bar fills BL+BR, left bar fills TL+BL -> TR is empty

    quadrant_fills = [q_tl, q_tr, q_bl, q_br]
    max_q = max(quadrant_fills)
    min_q = min(quadrant_fills)

    if max_q == 0:
        return False

    # One quadrant should be significantly emptier than the others
    emptiness_ratio = min_q / max_q if max_q > 0 else 1.0
    has_empty_quadrant = emptiness_ratio < 0.4

    # At least 3 quadrants should have significant fill
    filled_quads = sum(1 for q in quadrant_fills if q > max_q * 0.15)

    return has_empty_quadrant and filled_quads >= 2


def _detect_l_markers(image: np.ndarray) -> list[tuple[int, int]]:
    """
    Detect L-shaped fiducial markers in a BGR image.

    Returns a list of centroids (x, y) for each detected L-marker.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Adaptive threshold for robust detection across lighting
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # Morphological close to connect bars of L-shape
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    processed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=2)

    contours, _ = cv2.findContours(processed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    logger.info("L-marker detection: found %d external contours", len(contours))

    centroids = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < _MIN_MARKER_AREA or area > _MAX_MARKER_AREA:
            continue

        x, y, w, h = cv2.boundingRect(contour)

        # Aspect ratio: L-markers are roughly square
        aspect = w / h if h > 0 else 0
        if aspect < _MIN_ASPECT or aspect > _MAX_ASPECT:
            continue

        # Circular filter: L-shapes have moderate circularity
        perimeter = cv2.arcLength(contour, True)
        if perimeter < 1:
            continue
        circularity = 4 * np.pi * area / (perimeter * perimeter)
        if circularity < _MIN_CIRCULARITY or circularity > _MAX_CIRCULARITY:
            continue

        # Check if contour looks like an L
        if not _is_l_shape(contour):
            continue

        cx = int(x + w / 2)
        cy = int(y + h / 2)
        centroids.append((cx, cy))
        logger.info(
            "L-marker: cx=%d, cy=%d, w=%d, h=%d, area=%d, circ=%.3f",
            cx, cy, w, h, area, circularity,
        )

    logger.info("L-marker detection: %d valid markers found", len(centroids))
    return centroids


def _classify_l_markers(
    centroids: list[tuple[int, int]],
    img_width: int,
    img_height: int,
) -> list[tuple[int, int]]:
    """
    Classify 4 detected L-markers into the expected positions:
      Left-top, Left-bottom, Right-top, Right-bottom.

    Uses x-coordinate to split left/right, then y-coordinate to split top/bottom.

    Returns ordered list: [left_top, right_top, right_bottom, left_bottom]
    (clockwise from top-left, matching perspective.py expected order)
    """
    if len(centroids) != 4:
        return centroids

    mid_x = img_width / 2
    mid_y = img_height / 2

    left = sorted([c for c in centroids if c[0] < mid_x], key=lambda p: p[1])
    right = sorted([c for c in centroids if c[0] >= mid_x], key=lambda p: p[1])

    # Handle edge case: all on one side
    if not left:
        left = centroids[:2]
        right = centroids[2:]
    elif not right:
        right = left[2:]
        left = left[:2]

    # Ensure 2 per side
    if len(left) < 2 or len(right) < 2:
        logger.warning("L-marker classification: uneven split L=%d R=%d", len(left), len(right))
        # Fallback: just sort all by position
        all_sorted = sorted(centroids, key=lambda p: (p[1], p[0]))
        if len(all_sorted) >= 4:
            left = all_sorted[:2]
            right = all_sorted[2:]

    left_top = left[0] if len(left) > 0 else (0, 0)
    left_bottom = left[-1] if len(left) > 1 else (0, img_height)
    right_top = right[0] if len(right) > 0 else (img_width, 0)
    right_bottom = right[-1] if len(right) > 1 else (img_width, img_height)

    # Return in TL, TR, BR, BL order
    return [left_top, right_top, right_bottom, left_bottom]


def detect_fiducials(image: np.ndarray) -> FiducialResult:
    """
    Detect the four L-shaped side markers in a BGR image.

    The image is resized to width=900 for stable detection, then coordinates
    are scaled back to the original image dimensions.
    """
    original_h, original_w = image.shape[:2]

    # Resize for stable detection
    scale = 900 / original_w
    new_h = int(original_h * scale)
    resized = cv2.resize(image, (900, new_h), interpolation=cv2.INTER_AREA)
    scale_x = original_w / 900
    scale_y = original_h / new_h

    centroids = _detect_l_markers(resized)

    if len(centroids) != 4:
        logger.warning(
            "L-markers: expected 4, found %d at positions: %s",
            len(centroids),
            centroids,
        )

        if len(centroids) < 4:
            return FiducialResult(found=False, count=len(centroids))

        # If we found more than 4, keep the 4 that best match expected positions
        # (2 on left side, 2 on right side, at ~30% and ~70% height)
        classified = _classify_l_markers(centroids, 900, new_h)
        centroids = classified

    classified = _classify_l_markers(centroids, 900, new_h)

    corners = [
        [float(x * scale_x), float(y * scale_y)]
        for x, y in classified
    ]

    logger.info("L-marker corners (TL,TR,BR,BL): %s", corners)

    return FiducialResult(found=True, count=4, corners=corners)


def draw_fiducials(image: np.ndarray, result: FiducialResult) -> np.ndarray:
    """Draw detected L-shaped markers on a copy of the image (for debugging)."""
    annotated = image.copy()

    # Re-detect and draw raw L-marker contours for visibility
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
