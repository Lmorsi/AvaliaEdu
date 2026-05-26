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

# Area range for L-marker contours (tuned for 10mm markers at various scan resolutions)
_MIN_MARKER_AREA = 100
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


def _detect_l_markers(image: np.ndarray) -> list[dict]:
    """
    Detect L-shaped fiducial markers in a BGR image.

    Returns a list of dicts with L-marker info:
      - cx, cy: centroid
      - corner_x, corner_y: internal corner point (where bars meet)
      - x, y, w, h: bounding box
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # CLAHE (Contrast Limited Adaptive Histogram Equalization) to brighten faint markers
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    # Try multiple thresholding strategies to catch faint black markers
    # Strategy 1: OTSU on enhanced image
    blurred = cv2.GaussianBlur(enhanced, (5, 5), 0)
    _, thresh1 = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # Strategy 2: Manual threshold on original gray (catch very dark areas)
    _, thresh2 = cv2.threshold(gray, 100, 255, cv2.THRESH_BINARY_INV)

    # Combine thresholds: take union (logical OR)
    combined = cv2.bitwise_or(thresh1, thresh2)

    # Morphological operations: open to remove noise, close to connect bars
    kernel_open = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    opened = cv2.morphologyEx(combined, cv2.MORPH_OPEN, kernel_open, iterations=1)

    kernel_close = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
    processed = cv2.morphologyEx(opened, cv2.MORPH_CLOSE, kernel_close, iterations=2)

    contours, _ = cv2.findContours(processed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    logger.info("L-marker detection: found %d external contours", len(contours))

    markers = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < _MIN_MARKER_AREA or area > _MAX_MARKER_AREA:
            continue

        x, y, w, h = cv2.boundingRect(contour)

        # Aspect ratio: L-markers are roughly square (0.3 to 3.0)
        aspect = w / h if h > 0 else 0
        if aspect < 0.3 or aspect > 3.0:
            continue

        # Check if contour looks like an L
        if not _is_l_shape(contour):
            continue

        cx = int(x + w / 2)
        cy = int(y + h / 2)

        # Extract the internal corner of the L (where the two bars meet)
        # Use convexity defect to find the corner point
        corner_x, corner_y = _extract_l_corner(contour, x, y, w, h)

        markers.append({
            "cx": cx,
            "cy": cy,
            "corner_x": corner_x,
            "corner_y": corner_y,
            "x": x,
            "y": y,
            "w": w,
            "h": h,
            "area": area,
        })
        logger.info(
            "L-marker: cx=%d, cy=%d, corner=(%d,%d), box=(%d,%d,%d,%d), area=%.0f",
            cx, cy, corner_x, corner_y, x, y, w, h, area,
        )

    logger.info("L-marker detection: %d valid markers found", len(markers))
    return markers


def _extract_l_corner(contour: np.ndarray, bbox_x: int, bbox_y: int, bbox_w: int, bbox_h: int) -> tuple[int, int]:
    """
    Extract the internal corner point of an L-shape (where the two bars meet).
    Robust to perspective distortion by using the deepest convexity defect.
    """
    contour_closed = contour.reshape(-1, 1, 2).astype(np.int32)
    hull = cv2.convexHull(contour_closed, returnPoints=False)

    if hull is None or len(hull) < 3:
        return int(bbox_x + bbox_w // 2), int(bbox_y + bbox_h // 2)

    try:
        defects = cv2.convexityDefects(contour_closed, hull)
        if defects is None or len(defects) == 0:
            return int(bbox_x + bbox_w // 2), int(bbox_y + bbox_h // 2)

        # Find the deepest (most significant) defect — this is the L corner
        best_defect = None
        max_depth = 0
        for defect in defects:
            depth = defect[0][3] / 256.0  # Fixed-point: depth >> 8
            if depth > max_depth:
                max_depth = depth
                best_defect = defect[0]

        if best_defect is not None:
            # Use the farthest point (between start and end of defect)
            # This is the actual corner of the L
            farthest_idx = best_defect[2]
            corner_pt = contour[farthest_idx][0]
            return int(corner_pt[0]), int(corner_pt[1])

    except (cv2.error, IndexError, TypeError):
        pass

    # Fallback: geometric center (less precise but always works)
    return int(bbox_x + bbox_w // 2), int(bbox_y + bbox_h // 2)


def _classify_l_markers(
    markers: list[dict],
    img_width: int,
    img_height: int,
) -> list[tuple[int, int]]:
    """
    Classify 4+ detected L-markers into expected corner positions.
    Robust to severe perspective distortion by finding the best quadrilateral match.

    Returns ordered list: [top_left, top_right, bottom_right, bottom_left]
    """
    if len(markers) == 0:
        return [(0, 0), (img_width, 0), (img_width, img_height), (0, img_height)]

    if len(markers) == 4:
        # Exactly 4 markers: order them by position
        pts = [(m["corner_x"], m["corner_y"]) for m in markers]
        return _order_markers_by_position(pts, img_width, img_height)

    if len(markers) > 4:
        # More than 4: select the 4 that form the best rectangle
        logger.info("Found %d markers, selecting best 4", len(markers))
        best_4 = _select_best_4_markers(markers)
        pts = [(m["corner_x"], m["corner_y"]) for m in best_4]
        return _order_markers_by_position(pts, img_width, img_height)

    # Less than 4: use what we have with fallbacks
    logger.warning("Expected 4 markers, found %d", len(markers))
    pts = [(m["corner_x"], m["corner_y"]) for m in markers]
    return _order_markers_by_position(pts, img_width, img_height)


def _select_best_4_markers(markers: list[dict]) -> list[dict]:
    """
    Select the best 4 markers from a larger set using a convex hull approximation.
    """
    if len(markers) <= 4:
        return markers

    # Use OpenCV to find the convex hull
    pts = np.array([[m["corner_x"], m["corner_y"]] for m in markers], dtype=np.int32)
    hull = cv2.convexHull(pts)
    hull_indices_list = []

    # Map hull points back to original marker indices
    for hull_pt in hull:
        hull_pt_coords = tuple(hull_pt[0])
        for i, m in enumerate(markers):
            if (m["corner_x"], m["corner_y"]) == hull_pt_coords:
                hull_indices_list.append(i)
                break

    if len(hull_indices_list) <= 4:
        return [markers[i] for i in hull_indices_list]

    # If hull has more than 4 points, pick 4 most distant from centroid
    cx = np.mean([m["corner_x"] for m in markers])
    cy = np.mean([m["corner_y"] for m in markers])
    distances = [(m, (m["corner_x"] - cx)**2 + (m["corner_y"] - cy)**2) for m in markers]
    distances.sort(key=lambda x: x[1], reverse=True)
    return [m for m, _ in distances[:4]]


def _order_markers_by_position(
    points: list[tuple[int, int]],
    img_width: int,
    img_height: int,
) -> list[tuple[int, int]]:
    """
    Order points as [top_left, top_right, bottom_right, bottom_left].
    """
    if len(points) < 4:
        # Pad with image corners if not enough markers
        corners = {
            "TL": (0, 0),
            "TR": (img_width, 0),
            "BR": (img_width, img_height),
            "BL": (0, img_height),
        }
        for p in points:
            closest_key = min(
                corners.keys(),
                key=lambda k: (corners[k][0] - p[0])**2 + (corners[k][1] - p[1])**2
            )
            corners[closest_key] = p
        return [corners["TL"], corners["TR"], corners["BR"], corners["BL"]]

    # Find which point is closest to each corner
    pts_array = np.array(points, dtype=np.float32)
    expected_corners = [
        (0, 0),  # TL
        (img_width, 0),  # TR
        (img_width, img_height),  # BR
        (0, img_height),  # BL
    ]

    ordered = []
    used = set()
    for ex_corner in expected_corners:
        best_idx = 0
        best_dist = float('inf')
        for i, pt in enumerate(pts_array):
            if i in used:
                continue
            dist = (pt[0] - ex_corner[0])**2 + (pt[1] - ex_corner[1])**2
            if dist < best_dist:
                best_dist = dist
                best_idx = i
        used.add(best_idx)
        ordered.append(tuple(points[best_idx]))

    logger.info("L-marker corners (ordered): TL=%s, TR=%s, BR=%s, BL=%s",
                ordered[0], ordered[1], ordered[2], ordered[3])
    return ordered


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
    """Draw detected L-shaped markers and their internal corners (for debugging)."""
    annotated = image.copy()

    # Re-detect and draw L-marker contours
    gray = cv2.cvtColor(annotated, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    blurred = cv2.GaussianBlur(enhanced, (5, 5), 0)
    _, thresh1 = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    _, thresh2 = cv2.threshold(gray, 100, 255, cv2.THRESH_BINARY_INV)
    combined = cv2.bitwise_or(thresh1, thresh2)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    opened = cv2.morphologyEx(combined, cv2.MORPH_OPEN, kernel, iterations=1)
    kernel_close = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
    processed = cv2.morphologyEx(opened, cv2.MORPH_CLOSE, kernel_close, iterations=2)
    contours, _ = cv2.findContours(processed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    for contour in contours:
        area = cv2.contourArea(contour)
        if area < _MIN_MARKER_AREA or area > _MAX_MARKER_AREA:
            continue
        if _is_l_shape(contour):
            cv2.drawContours(annotated, [contour], -1, (255, 200, 0), 2)

    if not result.found or result.corners is None:
        return annotated

    # Draw the 4 corner points used for perspective correction
    labels = ["TL", "TR", "BR", "BL"]
    colors = [(0, 255, 0), (0, 200, 255), (0, 0, 255), (255, 100, 0)]

    for corner, label, color in zip(result.corners, labels, colors):
        cx, cy = int(corner[0]), int(corner[1])
        cv2.circle(annotated, (cx, cy), 12, color, 3)
        cv2.putText(annotated, label, (cx + 15, cy - 15),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

    # Draw quadrilateral connecting all 4 corners (perspective outline)
    if len(result.corners) == 4:
        pts = np.array([[int(c[0]), int(c[1])] for c in result.corners], dtype=np.int32)
        cv2.polylines(annotated, [pts], True, (100, 255, 100), 2)

    return annotated
