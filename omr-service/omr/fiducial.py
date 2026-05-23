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


def _detect_aruco(image: np.ndarray) -> tuple[list[tuple[int, int]], list[int]]:
    """
    Run ArUco detection and return (centroids, ids) for found markers.
    Centroids are in the coordinate space of `image`.
    """
    detector = cv2.aruco.ArucoDetector(_ARUCO_DICT, _ARUCO_PARAMS)
    corners, ids, _ = detector.detectMarkers(image)

    if ids is None:
        return [], []

    centroids: list[tuple[int, int]] = []
    found_ids: list[int] = []
    for corner, marker_id in zip(corners, ids.flatten()):
        c = corner[0]  # shape (4, 2)
        cx = int(c[:, 0].mean())
        cy = int(c[:, 1].mean())
        centroids.append((cx, cy))
        found_ids.append(int(marker_id))

    return centroids, found_ids


def detect_fiducials(image: np.ndarray) -> FiducialResult:
    """
    Detect the four corner ArUco markers in a BGR image.

    The image is resized to width=900 for stable detection, then coordinates
    are scaled back to the original image dimensions.
    """
    original_h, original_w = image.shape[:2]

    resized = imutils.resize(image, width=900)
    scale_x = original_w / resized.shape[1]
    scale_y = original_h / resized.shape[0]

    centroids, found_ids = _detect_aruco(resized)

    # Filter to only the 4 expected IDs (ignore stray detections)
    filtered = [(c, i) for c, i in zip(centroids, found_ids) if i in _EXPECTED_IDS]

    # Deduplicate: keep only the first occurrence of each ID
    seen: set[int] = set()
    unique: list[tuple[tuple[int, int], int]] = []
    for c, i in filtered:
        if i not in seen:
            seen.add(i)
            unique.append((c, i))

    if len(unique) != 4:
        logger.warning(
            "ArUco: expected IDs {0,1,2,3}, found %d unique: %s",
            len(unique),
            [i for _, i in unique],
        )

        # Fallback: if we found exactly 4 markers of ANY ids, use them
        if len(filtered) >= 4:
            # Try with all detected markers (take first 4 unique positions)
            unique = filtered[:4]
            logger.info("ArUco fallback: using first 4 detected markers")
        else:
            return FiducialResult(found=False, count=len(unique))

    pts = np.array([c for c, _ in unique], dtype="float32")
    ordered = _order_points(pts)

    corners = [
        [float(x * scale_x), float(y * scale_y)]
        for x, y in ordered
    ]

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
