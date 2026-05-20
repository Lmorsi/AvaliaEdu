"""
QR code extraction from answer sheet images.

Supported token formats (must match server/server.js generateQRData):
  - URL format:    https://<host>/s/<TOKEN>
  - JSON legacy:   {"assessmentId": "...", "studentId": "..."}
  - Direct token:  <TOKEN>  (raw alphanumeric string)
"""

import json
import re
import logging
from typing import Optional

import cv2
import numpy as np

from omr.models import QRData

logger = logging.getLogger(__name__)

# Matches the URL format written by server.js: /s/<token>
_URL_TOKEN_RE = re.compile(r"/s/([A-Za-z0-9_\-]+)")


def _decode_qr(gray: np.ndarray) -> Optional[str]:
    """Decode QR code using OpenCV's built-in detector."""
    detector = cv2.QRCodeDetector()
    data, _, _ = detector.detectAndDecode(gray)
    return data if data else None


def _parse_token(raw: str) -> QRData:
    """
    Parse a raw QR string into a QRData, extracting the token when possible.
    Mirrors the three formats in ScanPage.tsx.
    """
    raw = raw.strip()

    # URL format: https://host/s/TOKEN  or  /s/TOKEN
    m = _URL_TOKEN_RE.search(raw)
    if m:
        return QRData(raw=raw, token=m.group(1), format="url")

    # JSON legacy format: {"assessmentId": "...", "studentId": "..."}
    if raw.startswith("{"):
        try:
            obj = json.loads(raw)
            assessment_id = obj.get("assessmentId", "")
            student_id = obj.get("studentId", "")
            # Combine both IDs as a composite token (same logic as ScanPage)
            token = f"{assessment_id}_{student_id}" if assessment_id else None
            return QRData(raw=raw, token=token, format="json_legacy")
        except json.JSONDecodeError:
            pass

    # Direct token: alphanumeric + underscores/hyphens
    if re.fullmatch(r"[A-Za-z0-9_\-]{6,}", raw):
        return QRData(raw=raw, token=raw, format="direct_token")

    return QRData(raw=raw, token=None, format="unknown")


def read_qr(image: np.ndarray) -> Optional[QRData]:
    """
    Attempt to read a QR code from the given BGR image.

    Returns a QRData if a QR code is found, None otherwise.
    Uses OpenCV's built-in QR detector with optional preprocessing.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    raw = _decode_qr(gray)

    if not raw:
        # Try with light preprocessing to improve detection on low-contrast images
        blurred = cv2.GaussianBlur(gray, (3, 3), 0)
        _, binary = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
        raw = _decode_qr(binary)

    if not raw:
        return None

    return _parse_token(raw)
