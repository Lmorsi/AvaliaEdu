from pydantic import BaseModel
from typing import Optional, Any


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


class BubbleGrid(BaseModel):
    row: int
    bubbles: list[dict[str, Any]]  # col, x, y, radius, fill_percentage, marked


class BubbleResult(BaseModel):
    found: bool
    grids: list[BubbleGrid] = []


class ScanResponse(BaseModel):
    success: bool
    qr: Optional[QRData] = None
    fiducial: Optional[FiducialResult] = None
    bubbles: Optional[BubbleResult] = None
    error: Optional[str] = None
    # base64-encoded annotated image for debugging (only when debug=true)
    debug_image: Optional[str] = None
    # base64-encoded perspective-corrected image (only when fiducials found)
    corrected_image: Optional[str] = None


class ScanErrorResponse(BaseModel):
    success: bool = False
    error: str
