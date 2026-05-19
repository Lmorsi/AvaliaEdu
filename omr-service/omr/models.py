from pydantic import BaseModel
from typing import Optional


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    opencv_available: bool
    pyzbar_available: bool


class QRData(BaseModel):
    raw: str
    token: Optional[str] = None
    format: str  # "url", "json_legacy", "direct_token", "unknown"


class FiducialResult(BaseModel):
    found: bool
    count: int
    # corner coordinates in image space: tl, tr, br, bl
    corners: Optional[list[list[float]]] = None


class ScanResponse(BaseModel):
    success: bool
    qr: Optional[QRData] = None
    fiducial: Optional[FiducialResult] = None
    error: Optional[str] = None
    # base64-encoded annotated image for debugging (only when debug=true)
    debug_image: Optional[str] = None


class ScanErrorResponse(BaseModel):
    success: bool = False
    error: str
