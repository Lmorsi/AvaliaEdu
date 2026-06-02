"""
OMR (Optical Mark Recognition) service for AvaliaEdu answer sheets.

Phases implemented:
  1. Health check endpoint
  2. QR code reading (token extraction)
  3. Fiducial marker detection (alignment preparation)
  4. Perspective correction (using inner corners of detected markers)
  5. Bubble reader (bubble detection and classification)
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
from dotenv import load_dotenv

# Carrega variáveis de ambiente do arquivo .env
load_dotenv()

from omr.bubble import detect_bubbles, draw_bubbles
from omr.fiducial import detect_fiducials, draw_fiducials
from omr.models import (
    BubbleResult,
    FiducialResult,
    HealthResponse,
    QRData,
    ScanErrorResponse,
    ScanResponse,
)
from omr.perspective import correct_perspective
from omr.qr_reader import read_qr

# Configuração de logging
log_level = os.getenv("LOG_LEVEL", "INFO")
logging.basicConfig(
    level=log_level,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)

# Inicializa FastAPI
app = FastAPI(
    title="AvaliaEdu OMR Service",
    description="Optical Mark Recognition for answer sheet processing",
    version="0.1.0",
)

# CORS - Permite requisições do frontend
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins],
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
    Phase 2 + 3 + 4 + 5 endpoint: reads the QR code, detects the four corner
    fiducial markers (extracting their inner corners), applies perspective correction,
    and detects bubbles.

    Returns:
      - qr: extracted QR data and parsed token
      - fiducial: whether the 4 corner markers were found and their inner corner coordinates
      - corrected_image: base64-encoded perspective-corrected image (when fiducials found)
      - bubbles: detected answer bubbles (when perspective correction successful)
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

    # Phase 4 -- Perspective correction (using inner corners of markers)
    corrected_b64: str | None = None
    corrected_image: np.ndarray | None = None
    if fiducial_result.found and fiducial_result.corners:
        corrected_image = correct_perspective(image, fiducial_result.corners)
        if corrected_image is not None:
            _, buf = cv2.imencode(".png", corrected_image)
            corrected_b64 = base64.b64encode(buf.tobytes()).decode("ascii")
            logger.info("Perspective correction successful")

    # Phase 5 -- Bubble reader
    bubble_result: BubbleResult | None = None
    if corrected_image is not None:
        bubble_result = detect_bubbles(corrected_image)
        if bubble_result.found:
            logger.info("Found bubbles: %d rows", len(bubble_result.grids))
        else:
            logger.warning("No bubbles detected")

    # Optional debug image
    debug_b64: str | None = None
    if debug:
        # Desenha fiduciais na imagem original (para ver onde foram detectados)
        annotated_fiducials = draw_fiducials(image, fiducial_result)
        _, buf_fiducials = cv2.imencode(".png", annotated_fiducials)
        fiducials_debug_b64 = base64.b64encode(buf_fiducials.tobytes()).decode("ascii")

        # Se houve correção de perspectiva, mostra a imagem corrigida com bolhas
        annotated = annotated_fiducials
        if corrected_image is not None:
            # Desenha bolhas na imagem corrigida
            if bubble_result and bubble_result.found:
                annotated = draw_bubbles(corrected_image, bubble_result)
            else:
                # Se não houve bolhas, retorna imagem corrigida sem anotações
                _, buf = cv2.imencode(".png", corrected_image)
                annotated = cv2.imdecode(buf, cv2.IMREAD_COLOR)

        _, buf = cv2.imencode(".png", annotated)
        debug_b64 = base64.b64encode(buf.tobytes()).decode("ascii")

    return ScanResponse(
        success=True,
        qr=qr_data,
        fiducial=fiducial_result,
        bubbles=bubble_result,
        corrected_image=corrected_b64,
        debug_image=debug_b64,
    )


# Inicia o servidor se executado diretamente
if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    environment = os.getenv("ENVIRONMENT", "development")

    logger.info(f"Starting OMR server on port {port} ({environment})")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=(environment == "development"),
        log_level=log_level.lower(),
    )
