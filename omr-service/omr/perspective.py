"""
Perspective correction using fiducial markers.

Given the four corner coordinates from L-shaped side markers (LT, RT, RB, LB),
compute a perspective transformation that "warps" the original image
to a frontal, axis-aligned view.
"""

import logging
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)


def _order_corner_points(pts: np.ndarray) -> np.ndarray:
    """
    Order four corner points as: top-left, top-right, bottom-right, bottom-left.
    Uses centroid-based angle calculation for robust ordering in any orientation.
    """
    rect = np.zeros((4, 2), dtype="float32")

    # Compute centroid
    cx = pts[:, 0].mean()
    cy = pts[:, 1].mean()

    # Calculate angles from centroid to each point (-π to π)
    angles = np.arctan2(pts[:, 1] - cy, pts[:, 0] - cx)

    # Sort by angle: start from -π (left) and go counter-clockwise
    sorted_indices = np.argsort(angles)
    sorted_pts = pts[sorted_indices]

    # Find top point (minimum y) among sorted points
    min_y_idx = np.argmin(sorted_pts[:, 1])

    # Rotate array so top-left is first, then clockwise: TL, TR, BR, BL
    rect = np.roll(sorted_pts, -min_y_idx, axis=0)

    return rect


def correct_perspective(
    image: np.ndarray,
    corners: list[list[float]],
    target_width: int = 1240,
    target_height: int = 1754,
) -> Optional[np.ndarray]:
    """
    Warp the image using perspective correction from fiducial markers.
    Robust to moderate distortion and outliers.

    Args:
        image: BGR image to warp
        corners: Four corner coordinates (order doesn't matter, will be sorted)
        target_width: output width
        target_height: output height

    Returns:
        Perspective-corrected image, or None if transformation fails.
    """
    if not corners or len(corners) != 4:
        logger.warning("Cannot correct perspective: need exactly 4 corners")
        return None

    pts = np.array(corners, dtype="float32")
    src_pts = _order_corner_points(pts)

    # Validate that corners form a reasonable quadrilateral
    if not _is_valid_quadrilateral(src_pts):
        logger.warning("Detected corners do not form a valid quadrilateral")
        return None

    dst_pts = np.array(
        [
            [0, 0],
            [target_width, 0],
            [target_width, target_height],
            [0, target_height],
        ],
        dtype="float32",
    )

    matrix = cv2.getPerspectiveTransform(src_pts, dst_pts)
    if matrix is None:
        logger.warning("Could not compute perspective transform matrix")
        return None

    try:
        warped = cv2.warpPerspective(
            image,
            matrix,
            (target_width, target_height),
            flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=(255, 255, 255),
        )
        logger.info("Perspective correction: %dx%d", target_width, target_height)

        if warped.shape[0] > warped.shape[1]:
            logger.info("Rotating portrait result to landscape")
            warped = cv2.rotate(warped, cv2.ROTATE_90_CLOCKWISE)

        return warped
    except Exception as e:
        logger.error("Perspective warp failed: %s", str(e))
        return None


def _is_valid_quadrilateral(pts: np.ndarray) -> bool:
    """
    Check if 4 points form a valid, non-degenerate quadrilateral.
    """
    if pts.shape != (4, 2):
        return False

    # All points must be different
    if len(np.unique(pts, axis=0)) < 4:
        logger.warning("Duplicate corner points detected")
        return False

    # Check area (should be non-zero)
    area = _polygon_area(pts)
    if area < 100:  # Minimum reasonable area
        logger.warning("Quadrilateral area too small: %.0f", area)
        return False

    # Check convexity (should be roughly convex, not self-intersecting)
    if not _is_roughly_convex(pts):
        logger.warning("Quadrilateral is not convex (markers may be in wrong order)")
        return False

    return True


def _polygon_area(pts: np.ndarray) -> float:
    """Compute area using shoelace formula."""
    x = pts[:, 0]
    y = pts[:, 1]
    return 0.5 * abs(sum(x[i] * y[(i + 1) % 4] - x[(i + 1) % 4] * y[i] for i in range(4)))


def _is_roughly_convex(pts: np.ndarray) -> bool:
    """Check if quadrilateral is roughly convex (not self-intersecting)."""
    for i in range(4):
        p1 = pts[i]
        p2 = pts[(i + 1) % 4]
        p3 = pts[(i + 2) % 4]
        # Cross product to check turn direction
        v1 = p2 - p1
        v2 = p3 - p2
        cross = v1[0] * v2[1] - v1[1] * v2[0]
        if abs(cross) < 10:  # Almost collinear
            return False
    return True
