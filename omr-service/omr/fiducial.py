"""
Fiducial marker detection using rectangular border detection.

Instead of relying on L-shaped markers (which are fragile to scan variations),
this approach detects the rectangular border/outline of the answer sheet itself.
The detected rectangle corners become the fiducial points for perspective correction.

This is more robust because:
  - The sheet border is always present and clearly defined
  - Works regardless of printing quality or marker artifacts
  - Handles severe perspective distortion automatically
  - Falls back to image edges if no clear border is found
"""

import logging
from typing import Optional

import cv2
import numpy as np

from omr.models import FiducialResult

logger = logging.getLogger(__name__)


def _detect_rectangle_border(image: np.ndarray) -> Optional[list[tuple[float, float]]]:
    """
    Detect the rectangular border of the answer sheet by finding the largest
    rectangle contour in the image. Much more robust than L-marker detection.

    Returns 4 corner points [TL, TR, BR, BL] or None if detection fails.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Apply Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # Use Canny edge detection to find strong edges (sheet border)
    edges = cv2.Canny(blurred, 50, 150)

    # Dilate edges to close small gaps in the border
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    dilated = cv2.dilate(edges, kernel, iterations=2)

    # Find contours
    contours, _ = cv2.findContours(dilated, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        logger.warning("No contours found for rectangle detection")
        return None

    # Find the largest contour by area (should be the sheet border)
    largest_contour = max(contours, key=cv2.contourArea)
    area = cv2.contourArea(largest_contour)

    logger.info("Largest contour area: %.0f", area)

    # Approximate the contour to a polygon
    epsilon = 0.05 * cv2.arcLength(largest_contour, True)
    approx = cv2.approxPolyDP(largest_contour, epsilon, True)

    # Check if approximation has 4 points (rectangle)
    if len(approx) != 4:
        logger.warning("Contour approximation has %d points, expected 4", len(approx))
        # Try to find a rectangle using rotated rectangles
        rect = cv2.minAreaRect(largest_contour)
        box_points = cv2.boxPoints(rect)
        approx = np.array(box_points, dtype=np.int32)

    # Extract corners from approximation
    corners = []
    for point in approx:
        corners.append(tuple(point[0].astype(float)))

    if len(corners) != 4:
        logger.warning("Could not extract 4 corners from contour")
        return None

    # Order corners as [TL, TR, BR, BL]
    corners = _order_rectangle_corners(np.array(corners, dtype=np.float32))

    logger.info("Rectangle corners detected: TL=%.1f,%.1f | TR=%.1f,%.1f | BR=%.1f,%.1f | BL=%.1f,%.1f",
                corners[0][0], corners[0][1], corners[1][0], corners[1][1],
                corners[2][0], corners[2][1], corners[3][0], corners[3][1])

    return [(float(c[0]), float(c[1])) for c in corners]


def _order_rectangle_corners(corners: np.ndarray) -> np.ndarray:
    """
    Order 4 corners as [top-left, top-right, bottom-right, bottom-left].
    """
    # Calculate centroid
    cx = corners[:, 0].mean()
    cy = corners[:, 1].mean()

    # Calculate angles from centroid
    angles = np.arctan2(corners[:, 1] - cy, corners[:, 0] - cx)

    # Sort by angle
    sorted_idx = np.argsort(angles)
    sorted_corners = corners[sorted_idx]

    # Find top point (minimum y)
    min_y_idx = np.argmin(sorted_corners[:, 1])

    # Rotate so top point is first
    ordered = np.roll(sorted_corners, -min_y_idx, axis=0)

    return ordered


def detect_fiducials(image: np.ndarray) -> FiducialResult:
    """
    Detect the rectangular border of the answer sheet for perspective correction.

    Uses Canny edge detection + contour analysis to find the sheet outline.
    Much more robust than L-shaped marker detection.

    The image is resized to width=900 for stable detection, then coordinates
    are scaled back to the original image dimensions.
    """
    original_h, original_w = image.shape[:2]

    scale = 900 / original_w
    new_h = int(original_h * scale)
    resized = cv2.resize(image, (900, new_h), interpolation=cv2.INTER_AREA)
    scale_x = original_w / 900
    scale_y = original_h / new_h

    # Try to detect rectangle border
    corners_resized = _detect_rectangle_border(resized)

    if corners_resized is None:
        logger.error("Rectangle border detection failed, falling back to image edges")
        # Fallback: use image edges
        corners_resized = [
            (0, 0),
            (900, 0),
            (900, new_h),
            (0, new_h),
        ]

    # Scale corners back to original image size
    corners = [
        [float(x * scale_x), float(y * scale_y)]
        for x, y in corners_resized
    ]

    logger.info("Detected corners (TL,TR,BR,BL): %s", corners)

    return FiducialResult(found=True, count=4, corners=corners)


def draw_fiducials(image: np.ndarray, result: FiducialResult) -> np.ndarray:
    """Draw detected rectangle corners (for debugging)."""
    annotated = image.copy()

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

    # Draw quadrilateral connecting all 4 corners (sheet border)
    if len(result.corners) == 4:
        pts = np.array([[int(c[0]), int(c[1])] for c in result.corners], dtype=np.int32)
        cv2.polylines(annotated, [pts], True, (100, 255, 100), 2)

    return annotated
