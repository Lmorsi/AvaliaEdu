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
    Detect the rectangular border of the answer bubble area by finding contours.

    Strategy:
    1. Filter out small contours (header dividers, text boxes)
    2. Look for the largest quadrilateral in the middle-to-lower portion of image
    3. Reject if corners are too close to the very top (header region)

    Returns 4 corner points [TL, TR, BR, BL] or None if detection fails.
    """
    h, w = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Apply Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # Use Canny edge detection to find strong edges
    edges = cv2.Canny(blurred, 50, 150)

    # Dilate edges to close small gaps
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    dilated = cv2.dilate(edges, kernel, iterations=2)

    # Find contours
    contours, _ = cv2.findContours(dilated, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        logger.warning("No contours found for rectangle detection")
        return None

    logger.info("Found %d contours, filtering...", len(contours))

    # Filter contours: reject those that are:
    # - Too small (noise, header lines, text): < 20% of image area
    # - Too large (entire page): > 95% of image area
    # - Too high (header region): top edge in top 20% of image
    min_area = (w * h) * 0.20
    max_area = (w * h) * 0.95
    top_threshold = h * 0.20  # Accept contours if their topmost point is below 20% of image

    valid_contours = []
    for contour in contours:
        area = cv2.contourArea(contour)

        # Check area constraints
        if not (min_area <= area <= max_area):
            continue

        # Check vertical position: reject if entirely in header region
        bounding_rect = cv2.boundingRect(contour)
        rect_y = bounding_rect[1]  # top edge y-coordinate

        if rect_y < top_threshold:
            # This contour is mostly in header region
            logger.debug("Contour at y=%d is in header region (threshold=%d), skipping", rect_y, top_threshold)
            continue

        valid_contours.append(contour)
        logger.info("Valid contour: area=%.0f, top_y=%d", area, rect_y)

    if not valid_contours:
        logger.warning("No contours passed validation. Using largest contour as fallback.")
        largest_contour = max(contours, key=cv2.contourArea)
    else:
        # Among valid contours, pick the largest
        largest_contour = max(valid_contours, key=cv2.contourArea)

    area = cv2.contourArea(largest_contour)
    logger.info("Selected contour area: %.0f", area)

    # Approximate the contour to a polygon
    epsilon = 0.05 * cv2.arcLength(largest_contour, True)
    approx = cv2.approxPolyDP(largest_contour, epsilon, True)

    # Check if approximation has 4 points (rectangle)
    if len(approx) != 4:
        logger.info("Contour approximation has %d points, expected 4. Trying minAreaRect.", len(approx))
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

    # Validate corners form a proper rectangle
    xs = [c[0] for c in corners]
    ys = [c[1] for c in corners]
    width_span = max(xs) - min(xs)
    height_span = max(ys) - min(ys)

    logger.info("Detected shape span: width=%.0f, height=%.0f (image: %d x %d)", width_span, height_span, w, h)

    # Rectangle should span significant portion of image
    if width_span < w * 0.5:
        logger.warning("Detected shape too narrow (width=%.0f, expected >%.0f)", width_span, w * 0.5)
        return None

    if height_span < h * 0.4:
        logger.warning("Detected shape too short (height=%.0f, expected >%.0f)", height_span, h * 0.4)
        return None

    # Check aspect ratio: answer sheets are roughly portrait (height > width)
    aspect_ratio = height_span / width_span if width_span > 0 else 0
    if aspect_ratio < 1.0:
        logger.warning("Detected shape has wrong aspect ratio: %.2f (expected >1.0 for portrait)", aspect_ratio)
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


def _validate_rectangle_corners(
    corners: list[tuple[float, float]], img_w: int, img_h: int
) -> Optional[list[tuple[float, float]]]:
    """
    Validate that detected corners form a reasonable rectangle.

    Returns the corners if valid, None otherwise.
    """
    if not corners or len(corners) != 4:
        return None

    xs = [c[0] for c in corners]
    ys = [c[1] for c in corners]

    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)

    width = max_x - min_x
    height = max_y - min_y

    # Check 1: Should span significant width (>40% of image)
    if width < img_w * 0.4:
        logger.warning("Corner validation failed: width too small (%.0f < %.0f)", width, img_w * 0.4)
        return None

    # Check 2: Should span significant height (>40% of image)
    if height < img_h * 0.4:
        logger.warning("Corner validation failed: height too small (%.0f < %.0f)", height, img_h * 0.4)
        return None

    # Check 3: Should be portrait orientation (height > width)
    if height < width:
        logger.warning("Corner validation failed: landscape orientation detected (%.0f x %.0f)", width, height)
        return None

    # Check 4: All corners should be within image bounds
    if min_x < 0 or max_x >= img_w or min_y < 0 or max_y >= img_h:
        logger.warning("Corner validation failed: corners outside image bounds")
        return None

    # Check 5: No two corners should be too close (minimum ~10% apart)
    min_dist_threshold = min(img_w, img_h) * 0.1
    for i in range(4):
        for j in range(i + 1, 4):
            dx = corners[i][0] - corners[j][0]
            dy = corners[i][1] - corners[j][1]
            dist = (dx * dx + dy * dy) ** 0.5
            if dist < min_dist_threshold:
                logger.warning("Corner validation failed: corners too close (dist=%.0f)", dist)
                return None

    logger.info("Corner validation passed: width=%.0f, height=%.0f", width, height)
    return corners


def detect_fiducials(image: np.ndarray) -> FiducialResult:
    """
    Detect the rectangular border of the answer sheet for perspective correction.

    Uses Canny edge detection + contour analysis to find the sheet outline.
    Falls back to image edges if detection fails.

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

    # Validate detected corners - if they don't form a valid rectangle, reject
    if corners_resized is not None:
        corners_resized = _validate_rectangle_corners(corners_resized, 900, new_h)

    if corners_resized is None:
        logger.error("Rectangle border detection failed, falling back to image edges")
        # Fallback: use image edges as safe default
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

    logger.info("Final corners (TL,TR,BR,BL): %s", corners)

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
