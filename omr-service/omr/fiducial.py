"""
Fiducial marker detection using ArUco markers (DICT_4X4_50).

The answer sheet has four ArUco markers in the corners:
  TL = ID 0  |  TR = ID 1
  BL = ID 2  |  BR = ID 3

Detection is handled by cv2.aruco (requires opencv-contrib).
The four markers are ordered geometrically (TL, TR, BR, BL) using the
centre of each detected marker, regardless of which ID was found where.
This makes the detection robust to partial occlusion or rotation.
"""

import logging
from typing import Optional

import cv2
import numpy as np
import imutils

from omr.models import FiducialResult

logger = logging.getLogger(__name__)

# ArUco dictionary used when generating the PDF markers
_ARUCO_DICT = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
_ARUCO_PARAMS = cv2.aruco.DetectorParameters()

# Expected marker IDs (one per corner)
_EXPECTED_IDS = {0, 1, 2, 3}


def _order_points(pts: np.ndarray) -> np.ndarray:
    """
    Order four points as: top-left, top-right, bottom-right, bottom-left.
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


def _detect_aruco(image: np.ndarray) -> tuple[list[np.ndarray], list[int]]:
    """
    Run ArUco detection and return (marker_corners, ids) for found markers.

    marker_corners: list of arrays, each with shape (4, 2) containing the
                    four corner coordinates of the detected marker
                    Order: TL, TR, BR, BL of the marker itself
    ids: list of marker IDs detected

    All coordinates are in the coordinate space of `image`.
    """
    detector = cv2.aruco.ArucoDetector(_ARUCO_DICT, _ARUCO_PARAMS)
    corners, ids, _ = detector.detectMarkers(image)

    if ids is None:
        return [], []

    marker_corners: list[np.ndarray] = []
    found_ids: list[int] = []
    for corner, marker_id in zip(corners, ids.flatten()):
        c = corner[0]  # shape (4, 2) - TL, TR, BR, BL of the marker
        marker_corners.append(c.copy())
        found_ids.append(int(marker_id))

    return marker_corners, found_ids


def _get_inner_corner(marker_corners: np.ndarray, marker_id: int) -> tuple[float, float]:
    """
    Extract the corner of the marker that faces toward the inside of the answer sheet.

    ArUco marker corner order: TL(0), TR(1), BR(2), BL(3) of the marker

    For perspective correction, we need the corner that points inward:
      - ID 0 (Top-Left corner of sheet): use BR corner of marker (index 2)
      - ID 1 (Top-Right corner of sheet): use BL corner of marker (index 3)
      - ID 2 (Bottom-Left corner of sheet): use TR corner of marker (index 1)
      - ID 3 (Bottom-Right corner of sheet): use TL corner of marker (index 0)

    Args:
        marker_corners: array of shape (4, 2) with marker corner coordinates
        marker_id: the ArUco marker ID (0, 1, 2, or 3)

    Returns:
        (x, y) coordinates of the inner corner
    """
    # Map marker ID to the corner index that faces the inside of the sheet
    # Marker corners are ordered: TL(0), TR(1), BR(2), BL(3)
    inner_corner_map = {
        0: 2,  # TL marker -> use its BR corner
        1: 3,  # TR marker -> use its BL corner
        2: 1,  # BL marker -> use its TR corner
        3: 0,  # BR marker -> use its TL corner
    }

    corner_idx = inner_corner_map[marker_id]
    x, y = marker_corners[corner_idx]
    return (float(x), float(y))


def detect_fiducials(image: np.ndarray) -> FiducialResult:
    """
    Detect the four corner ArUco markers in a BGR image.

    The image is resized to width=900 for stable detection, then coordinates
    are scaled back to the original image dimensions.

    IMPORTANT: This function extracts the INNER CORNERS of each ArUco marker
    (the corners that face toward the inside of the answer sheet). This ensures
    the perspective correction aligns with the actual boundaries of the answer field.

    Marker layout and which corner we use:
      - ID 0 (Top-Left): use BR corner of marker -> inner corner facing sheet
      - ID 1 (Top-Right): use BL corner of marker -> inner corner facing sheet
      - ID 2 (Bottom-Left): use TR corner of marker -> inner corner facing sheet
      - ID 3 (Bottom-Right): use TL corner of marker -> inner corner facing sheet

    Corners are ordered by ArUco marker ID: TL(0), TR(1), BR(3), BL(2)
    """
    original_h, original_w = image.shape[:2]

    resized = imutils.resize(image, width=900)
    scale_x = original_w / resized.shape[1]
    scale_y = original_h / resized.shape[0]

    marker_corners, found_ids = _detect_aruco(resized)

    # Create a mapping from marker ID to its corner coordinates
    detected_by_id: dict[int, np.ndarray] = {}
    for corners, marker_id in zip(marker_corners, found_ids):
        if marker_id in _EXPECTED_IDS and marker_id not in detected_by_id:
            detected_by_id[marker_id] = corners

    # Check if we have all 4 expected markers
    if len(detected_by_id) != 4:
        logger.warning(
            "ArUco: expected IDs {0,1,2,3}, found %d unique: %s",
            len(detected_by_id),
            list(detected_by_id.keys()),
        )
        return FiducialResult(found=False, count=len(detected_by_id))

    # Order corners by ID mapping: TL(0), TR(1), BR(3), BL(2)
    # For each marker, extract the inner corner that faces the answer field
    corner_order = [0, 1, 3, 2]  # TL, TR, BR, BL (clockwise from top-left)

    corners = []
    for marker_id in corner_order:
        if marker_id not in detected_by_id:
            logger.error("Missing marker ID %d", marker_id)
            return FiducialResult(found=False, count=len(detected_by_id))

        # Get the inner corner of this marker (the corner facing the sheet interior)
        inner_x, inner_y = _get_inner_corner(detected_by_id[marker_id], marker_id)
        # Scale back to original image dimensions
        corners.append([float(inner_x * scale_x), float(inner_y * scale_y)])

    logger.info("Fiducials (inner corners) ordered by ID: TL(ID0)=%s, TR(ID1)=%s, BR(ID3)=%s, BL(ID2)=%s",
                corners[0], corners[1], corners[2], corners[3])

    return FiducialResult(found=True, count=4, corners=corners)


def draw_fiducials(image: np.ndarray, result: FiducialResult) -> np.ndarray:
    """Draw detected fiducial markers on a copy of the image (for debugging)."""
    annotated = image.copy()

    # Always draw raw ArUco detections for visibility
    detector = cv2.aruco.ArucoDetector(_ARUCO_DICT, _ARUCO_PARAMS)
    corners, ids, _ = detector.detectMarkers(annotated)
    if ids is not None:
        cv2.aruco.drawDetectedMarkers(annotated, corners, ids)

    if not result.found or result.corners is None:
        return annotated

    labels = ["TL", "TR", "BR", "BL"]
    colors = [(0, 255, 0), (0, 200, 255), (0, 0, 255), (255, 100, 0)]

    for corner, label, color in zip(result.corners, labels, colors):
        cx, cy = int(corner[0]), int(corner[1])
        cv2.circle(annotated, (cx, cy), 10, color, -1)
        cv2.putText(annotated, label, (cx + 12, cy - 12),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

    return annotated
