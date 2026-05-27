"""
ArUco marker detection with Harris Corner Detection fallback.

This module provides robust fiducial point identification using:
  1. ArUco markers (DICT_4X4_50) with IDs 0-3 for each corner
  2. Harris Corner Detection as a fallback for challenging conditions
  3. Multiple edge-based detection strategies

Detection strategy (cascading):
  1. ArUco detection (primary)
     - Enhanced with CLAHE preprocessing
     - Optimized corner refinement
  2. Harris Corner Detection (fallback)
     - Detects strong corners in each ROI
     - Robust to illumination variations
  3. Edge detection (fallback)
     - Detects content area boundary
  4. Rectangle border detection (fallback)
     - Finds largest quadrilateral
  5. Image edges (final fallback)

Benefits:
  - ArUco provides ID-based corner identification
  - Harris provides robustness when ArUco fails
  - Multiple fallbacks ensure high success rate
  - Adaptive to different document quality
"""

import logging
from typing import Optional, Tuple

import cv2
import numpy as np

from omr.models import FiducialResult

logger = logging.getLogger(__name__)

# Mapeamento de IDs ArUco para posições
# IDs correspondem aos marcadores gerados no PDF
ARUCO_ID_TO_POSITION = {
    0: 'TL',  # Top-Left
    1: 'TR',  # Top-Right
    2: 'BL',  # Bottom-Left
    3: 'BR'   # Bottom-Right
}


def _detect_harris_corners_at_roi(image: np.ndarray, roi_position: str) -> Optional[Tuple[float, float]]:
    """
    Detecta cantos usando Harris Corner Detection em uma ROI específica.

    Args:
        image: Imagem BGR
        roi_position: "TL", "TR", "BL", "BR"

    Returns:
        Coordenadas (x, y) do canto detectado ou None
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape

    # Define ROI (1/10 da imagem em cada canto)
    margin = min(w, h) // 10

    if roi_position == "TL":
        roi = gray[0:margin, 0:margin]
        roi_x, roi_y = 0, 0
        corner_selector = lambda corners: np.argmin(corners[:, 0] + corners[:, 1])  # Mínimo x+y
    elif roi_position == "TR":
        roi = gray[0:margin, w-margin:w]
        roi_x, roi_y = w - margin, 0
        corner_selector = lambda corners: np.argmin(-corners[:, 0] + corners[:, 1])  # Máximo x, mínimo y
    elif roi_position == "BR":
        roi = gray[h-margin:h, w-margin:w]
        roi_x, roi_y = w - margin, h - margin
        corner_selector = lambda corners: np.argmax(corners[:, 0] + corners[:, 1])  # Máximo x+y
    else:  # BL
        roi = gray[h-margin:h, 0:margin]
        roi_x, roi_y = 0, h - margin
        corner_selector = lambda corners: np.argmax(-corners[:, 0] + corners[:, 1])  # Mínimo x, máximo y

    roi_h, roi_w = roi.shape

    # Pré-processamento
    if roi_h < 5 or roi_w < 5:
        return None

    # Binarização adaptativa para melhorar contraste
    if roi_h > 11 and roi_w > 11:
        blurred = cv2.GaussianBlur(roi, (5, 5), 1.0)
        binary = cv2.adaptiveThreshold(
            blurred, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            blockSize=11, C=2
        )
    else:
        binary = roi

    # Harris Corner Detection
    harris_response = cv2.cornerHarris(binary, blockSize=2, ksize=3, k=0.04)

    # Encontrar cantos fortes
    corners_list = np.where(harris_response > 0.01 * harris_response.max())

    if len(corners_list[0]) < 1:
        logger.debug(f"Nenhum canto Harris detectado em {roi_position}")
        return None

    # Combinar coordenadas y, x
    corners = np.column_stack((corners_list[1], corners_list[0]))  # (x, y)

    # Selecionar canto mais apropriado
    try:
        selected_idx = corner_selector(corners)
        corner = corners[selected_idx]
        global_x = float(roi_x + corner[0])
        global_y = float(roi_y + corner[1])

        logger.info(f"Harris corner {roi_position}: ({global_x:.1f}, {global_y:.1f})")
        return (global_x, global_y)
    except Exception as e:
        logger.debug(f"Erro ao selecionar canto Harris em {roi_position}: {e}")
        return None


def _detect_aruco_markers(image: np.ndarray) -> Optional[dict]:
    """
    Detecta marcadores ArUco na imagem e retorna suas posições.

    Returns dict com IDs como chaves e corner points como valores.
    Exemplo: {0: (x, y), 1: (x, y), 2: (x, y), 3: (x, y)}
    """
    try:
        # Carregar dicionário ArUco (DICT_4X4_50)
        aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)

        # Parâmetros de detecção otimizados
        parameters = cv2.aruco.DetectorParameters()
        parameters.cornerRefinementMethod = cv2.aruco.CORNER_REFINE_SUBPIX
        parameters.cornerRefinementMinAccuracy = 0.1
        parameters.cornerRefinementMaxIterations = 50
        parameters.adaptiveThreshConstantSubtracted = 7
        parameters.adaptiveThreshWinSizeStep = 16

        # Criar detector
        detector = cv2.aruco.ArucoDetector(aruco_dict, parameters)

        # Converter para escala de cinza
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Pré-processamento para melhorar detecção
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(blurred)

        # Detectar marcadores na imagem pré-processada
        corners, ids, rejected = detector.detectMarkers(enhanced)

        if ids is None or len(ids) == 0:
            logger.warning("Nenhum marcador ArUco detectado com pré-processamento, tentando sem...")
            corners, ids, rejected = detector.detectMarkers(gray)

        if ids is None or len(ids) == 0:
            logger.warning("Nenhum marcador ArUco detectado")
            return None

        logger.info("Detectados %d marcadores ArUco", len(ids))

        # Extrair posições dos cantos
        marker_positions = {}

        for i, marker_id in enumerate(ids.flatten()):
            # marker_id é o ID do marcador (0-3)
            # corners[i] contém os 4 cantos do marcador
            marker_corners = corners[i][0]

            # Calcular centro do marcador (média dos 4 cantos)
            center_x = np.mean(marker_corners[:, 0])
            center_y = np.mean(marker_corners[:, 1])

            marker_positions[int(marker_id)] = (float(center_x), float(center_y))

            logger.info(f"ArUco ID {marker_id}: centro em ({center_x:.1f}, {center_y:.1f})")

        return marker_positions if len(marker_positions) == 4 else None

    except Exception as e:
        logger.error(f"Erro na detecção ArUco: {e}")
        return None


def _detect_harris_markers(image: np.ndarray) -> Optional[dict]:
    """
    Detecta marcadores usando Harris Corner Detection como fallback para ArUco.

    Retorna dict com IDs 0-3 mapeados para posições TL, TR, BR, BL.
    """
    logger.info("Usando Harris Corner Detection como fallback...")

    positions = {}
    roi_map = {
        0: "TL",  # ID 0 = Top-Left
        1: "TR",  # ID 1 = Top-Right
        3: "BR",  # ID 3 = Bottom-Right
        2: "BL"   # ID 2 = Bottom-Left
    }

    for marker_id, roi_name in roi_map.items():
        corner = _detect_harris_corners_at_roi(image, roi_name)
        if corner is not None:
            positions[marker_id] = corner
            logger.info(f"Harris detector marcador ID {marker_id} ({roi_name}): {corner}")

    if len(positions) == 4:
        return positions

    logger.warning(f"Harris detection: apenas {len(positions)}/4 marcadores detectados")
    return None if len(positions) < 4 else positions


def _build_corners_from_aruco(marker_positions: dict, img_w: int, img_h: int) -> Optional[list]:
    """
    Constrói lista de cantos a partir das posições dos marcadores ArUco.

    Retorna lista de 4 cantos [TL, TR, BR, BL] ou None se não encontrar todos.
    """
    if len(marker_positions) < 4:
        logger.warning(f"Apenas {len(marker_positions)} marcadores ArUco detectados (esperado 4)")
        return None

    # Verificar se temos todos os IDs necessários
    required_ids = [0, 1, 2, 3]
    for marker_id in required_ids:
        if marker_id not in marker_positions:
            logger.warning(f"Marcador ArUco ID {marker_id} não encontrado")
            return None

    # Construir lista de cantos na ordem correta [TL, TR, BR, BL]
    corners = [
        list(marker_positions[0]),  # TL (ID 0)
        list(marker_positions[1]),  # TR (ID 1)
        list(marker_positions[3]),  # BR (ID 3)
        list(marker_positions[2])   # BL (ID 2)
    ]

    logger.info(f"Cantos ArUco: TL={corners[0]}, TR={corners[1]}, BR={corners[2]}, BL={corners[3]}")

    return corners


def _detect_content_area_via_edges(image: np.ndarray) -> Optional[list[tuple[float, float]]]:
    """
    Detect the main content area of the answer sheet using edge detection + line detection.
    More robust than bubble detection because it works on ANY scanned document,
    regardless of printing quality or distortion.

    Strategy:
    1. Detect strong horizontal and vertical edges
    2. Find the principal content area
    3. Use the content boundary as fiducial corners

    Returns 4 corner points [TL, TR, BR, BL] or None if detection fails.
    """
    h, w = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Apply morphological closing to fill small holes and connect broken lines
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    closed = cv2.morphologyEx(gray, cv2.MORPH_CLOSE, kernel, iterations=2)

    # Detect edges of the content (white background + dark content)
    # Use Canny with aggressive parameters to find clear boundaries
    edges = cv2.Canny(closed, 30, 100)

    logger.info("Edge detection: found edges")

    # Dilate edges to make them continuous
    kernel_dilate = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edges_dilated = cv2.dilate(edges, kernel_dilate, iterations=2)

    # Find contours
    contours, _ = cv2.findContours(edges_dilated, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        logger.warning("No contours found in edge detection")
        return None

    logger.info("Found %d contours from edges", len(contours))

    # Filter contours: find the largest one that spans most of the image
    # (should be the outer content boundary)
    best_contour = None
    best_area = 0

    for contour in contours:
        area = cv2.contourArea(contour)

        # Contour should be reasonably large (at least 10% of image)
        if area < (w * h) * 0.10:
            continue

        # Contour should not be too large (not the entire image)
        if area > (w * h) * 0.95:
            continue

        if area > best_area:
            best_area = area
            best_contour = contour

    if best_contour is None:
        logger.warning("No suitable contour found for content area")
        return None

    logger.info("Selected contour area: %.0f", best_area)

    # Get bounding box
    x, y, bw, bh = cv2.boundingRect(best_contour)

    # Convert to corners
    corners = [
        (float(x), float(y)),  # TL
        (float(x + bw), float(y)),  # TR
        (float(x + bw), float(y + bh)),  # BR
        (float(x), float(y + bh)),  # BL
    ]

    logger.info("Content area fiducials: TL=(%.0f,%.0f) | TR=(%.0f,%.0f) | BR=(%.0f,%.0f) | BL=(%.0f,%.0f)",
                corners[0][0], corners[0][1], corners[1][0], corners[1][1],
                corners[2][0], corners[2][1], corners[3][0], corners[3][1])

    return corners


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
    Detect fiducial points for perspective correction using ArUco markers.

    Strategy (in order of preference):
    1. ArUco marker detection (primary) - most accurate and reliable
    2. Harris Corner Detection (fallback) - robust to lighting variations
    3. Content area detection (edge-based) - fallback
    4. Detect rectangle border - fallback
    5. Use image edges - final fallback

    The image is resized to width=900 for stable detection, then coordinates
    are scaled back to the original image dimensions.
    """
    original_h, original_w = image.shape[:2]

    scale = 900 / original_w
    new_h = int(original_h * scale)
    resized = cv2.resize(image, (900, new_h), interpolation=cv2.INTER_AREA)
    scale_x = original_w / 900
    scale_y = original_h / new_h

    corners_resized = None
    detection_method = None

    # Strategy 1: Try ArUco marker detection (most accurate)
    logger.info("Attempting ArUco marker detection...")
    marker_positions = _detect_aruco_markers(resized)
    if marker_positions is not None and len(marker_positions) >= 4:
        corners_resized = _build_corners_from_aruco(marker_positions, 900, new_h)
        if corners_resized is not None:
            detection_method = "ARUCO"
            logger.info("✓ ArUco marker detection succeeded")

    # Strategy 2: Try Harris Corner Detection (fallback)
    if corners_resized is None:
        logger.info("Attempting Harris Corner Detection...")
        marker_positions = _detect_harris_markers(resized)
        if marker_positions is not None and len(marker_positions) >= 4:
            corners_resized = _build_corners_from_aruco(marker_positions, 900, new_h)
            if corners_resized is not None:
                detection_method = "HARRIS"
                logger.info("✓ Harris Corner Detection succeeded")

    # Strategy 3: Try content area detection (edge-based)
    if corners_resized is None:
        logger.info("Attempting content area edge detection...")
        corners_resized = _detect_content_area_via_edges(resized)
        if corners_resized is not None:
            corners_resized = _validate_rectangle_corners(corners_resized, 900, new_h)
            if corners_resized is not None:
                detection_method = "EDGES"
                logger.info("✓ Content area edge detection succeeded")

    # Strategy 4: Try rectangle border detection (fallback)
    if corners_resized is None:
        logger.info("Attempting rectangle border detection...")
        corners_resized = _detect_rectangle_border(resized)
        if corners_resized is not None:
            corners_resized = _validate_rectangle_corners(corners_resized, 900, new_h)
            if corners_resized is not None:
                detection_method = "RECTANGLE"
                logger.info("✓ Rectangle border detection succeeded")

    # Strategy 5: Fall back to image edges
    if corners_resized is None:
        logger.warning("All detection methods failed, using image edges")
        corners_resized = [
            (0, 0),
            (900, 0),
            (900, new_h),
            (0, new_h),
        ]
        detection_method = "EDGES_FALLBACK"

    # Scale corners back to original image size
    corners = [
        [float(x * scale_x), float(y * scale_y)]
        for x, y in corners_resized
    ]

    logger.info("Final corners via %s (TL,TR,BR,BL): %s", detection_method, corners)

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
