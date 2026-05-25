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
    Warp the image so the four corner points become the corners of a rectangle.

    Args:
        image: BGR image to warp
        corners: Four corner coordinates in image space (order doesn't matter, will be sorted)
        target_width: output width (pixels)
        target_height: output height (pixels)

    Returns:
        Perspective-corrected image, or None if transformation fails.
        If the resulting image is portrait (height > width), it will be rotated to landscape.
    """
    if not corners or len(corners) != 4:
        logger.warning("Cannot correct perspective: need exactly 4 corners")
        return None

    # Ensure corners are in the correct order: TL, TR, BR, BL
    pts = np.array(corners, dtype="float32")
    src_pts = _order_corner_points(pts)

    # Destination points: corners of a rectangle (0, 0) -> (target_width, target_height)
    dst_pts = np.array(
        [
            [0, 0],                          # TL
            [target_width, 0],               # TR
            [target_width, target_height],   # BR
            [0, target_height],              # BL
        ],
        dtype="float32",
    )

    # Compute perspective matrix
    matrix = cv2.getPerspectiveTransform(src_pts, dst_pts)
    if matrix is None:
        logger.warning("Could not compute perspective transform matrix")
        return None

    # Apply perspective warp
    try:
        warped = cv2.warpPerspective(
            image,
            matrix,
            (target_width, target_height),
            flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=(255, 255, 255),
        )
        logger.info("Perspective correction applied: %dx%d", target_width, target_height)

        # Check if result is portrait (height > width) - should be landscape
        if warped.shape[0] > warped.shape[1]:
            logger.info("Result is portrait (H=%d > W=%d), rotating 90° clockwise to landscape", warped.shape[0], warped.shape[1])
            warped = cv2.rotate(warped, cv2.ROTATE_90_CLOCKWISE)

        return warped
    except Exception as e:
        logger.error("Perspective warp failed: %s", str(e))
        return None
