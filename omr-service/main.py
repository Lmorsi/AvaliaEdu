"""
OMR (Optical Mark Recognition) service for AvaliaEdu answer sheets.

Phases implemented:
  1. Health check endpoint
  2. QR code reading (token extraction)
  3. Fiducial marker detection (alignment preparation)
  4. Perspective correction (using detected markers)
"""

import base64
import io
import logging
import os

import cv2
import numpy as np
from fastapi import FastAPI, File, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from omr.fiducial import detect_fiducials, draw_fiducials
from omr.models import (
    FiducialResult,
    HealthResponse,
    QRData,
    ScanErrorResponse,
    ScanResponse,
)
from omr.perspective import correct_perspective
from omr.qr_reader import read_qr

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AvaliaEdu OMR Service",
    description="Optical Mark Recognition for answer sheet processing",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/api/health", response_model=HealthResponse)
def health():
    opencv_ok = True
    try:
        # Verify opencv-contrib (ArUco) is available
        _ = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
    except Exception:
        opencv_ok = False

    pyzbar_ok = True
    try:
        import pyzbar  # noqa: F401
    except ImportError:
        pyzbar_ok = False

    return HealthResponse(
        status="ok",
        service="avaliaedu-omr",
        version="0.3.0",
        opencv_available=opencv_ok,
        pyzbar_available=pyzbar_ok,
    )


# ---------------------------------------------------------------------------
# Scan endpoint (Phases 2 + 3)
# ---------------------------------------------------------------------------

@app.post("/api/omr/scan", response_model=ScanResponse)
async def scan(
    photo: UploadFile = File(..., description="JPEG/PNG photo of the answer sheet"),
    debug: bool = Query(False, description="Include annotated debug image in response"),
):
    """
    Phase 2 + 3 + 4 endpoint: reads the QR code, detects the four corner
    fiducial markers, and applies perspective correction.

    Returns:
      - qr: extracted QR data and parsed token
      - fiducial: whether the 4 corner markers were found and their coordinates
      - corrected_image: base64-encoded perspective-corrected image (when fiducials found)
      - debug_image: base64-encoded annotated PNG (only when debug=true)
    """
    raw = await photo.read()
    if not raw:
        return JSONResponse(
            status_code=400,
            content=ScanErrorResponse(error="Empty file upload").model_dump(),
        )

    # Decode bytes -> OpenCV BGR image
    arr = np.frombuffer(raw, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        return JSONResponse(
            status_code=422,
            content=ScanErrorResponse(error="Could not decode image. Send JPEG or PNG.").model_dump(),
        )

    logger.info("Received image %s  size=%dx%d", photo.filename, image.shape[1], image.shape[0])

    # Phase 2 -- QR code
    qr_data: QRData | None = read_qr(image)
    if qr_data:
        logger.info("QR decoded: format=%s  token=%s", qr_data.format, qr_data.token)
    else:
        logger.warning("No QR code found in image")

    # Phase 3 -- Fiducial markers
    fiducial_result: FiducialResult = detect_fiducials(image)
    logger.info("Fiducial detection: found=%s  count=%d", fiducial_result.found, fiducial_result.count)

    # Phase 4 -- Perspective correction
    corrected_b64: str | None = None
    if fiducial_result.found and fiducial_result.corners:
        corrected = correct_perspective(image, fiducial_result.corners)
        if corrected is not None:
            _, buf = cv2.imencode(".png", corrected)
            corrected_b64 = base64.b64encode(buf.tobytes()).decode("ascii")
            logger.info("Perspective correction successful")

    # Optional debug image
    debug_b64: str | None = None
    if debug:
        annotated = draw_fiducials(image, fiducial_result)
        _, buf = cv2.imencode(".png", annotated)
        debug_b64 = base64.b64encode(buf.tobytes()).decode("ascii")

    return ScanResponse(
        success=True,
        qr=qr_data,
        fiducial=fiducial_result,
        corrected_image=corrected_b64,
        debug_image=debug_b64,
    )
