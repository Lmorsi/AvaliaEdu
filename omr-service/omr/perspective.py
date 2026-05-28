"""
Perspective correction using fiducial markers.

Given the four INNER corner coordinates of ArUco markers (the corners that
face toward the inside of the answer sheet), compute a perspective
transformation that "warps" the original image to a frontal, axis-aligned view.

Using inner corners instead of centroids ensures the perspective correction
properly aligns with the boundaries of the answer field.
"""

import logging
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)


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
        corners: Four INNER corner coordinates in image space, ordered as TL, TR, BR, BL.
                 These are the corners of the ArUco markers that face the inside of the sheet.
        target_width: output width (pixels)
        target_height: output height (pixels)

    Returns:
        Perspective-corrected image, or None if transformation fails.
    """
    if not corners or len(corners) != 4:
        logger.warning("Cannot correct perspective: need exactly 4 corners")
        return None

    # Corners are already ordered by fiducial.py based on marker IDs:
    # TL(ID0 inner corner), TR(ID1 inner corner), BR(ID3 inner corner), BL(ID2 inner corner)
    # These are the inner corners of each marker that face the answer field
    src_pts = np.array(corners, dtype="float32")

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
        return warped
    except Exception as e:
        logger.error("Perspective warp failed: %s", str(e))
        return None
