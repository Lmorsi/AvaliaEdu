# AvaliaEdu OMR Service

Python/FastAPI service for optical mark recognition of AvaliaEdu answer sheets.

## Current status

| Phase | Feature | Status |
|---|---|---|
| 1 | FastAPI + health check | Done |
| 2 | QR code reading (token extraction) | Done |
| 3 | Fiducial marker detection | Done |
| 4 | Perspective correction | Pending |
| 5 | Bubble reading | Pending |
| 6 | Question type mapping (A-E, V/F, discursive) | Pending |

## Running locally

```bash
# Create and activate virtualenv
python -m venv .venv
source .venv/bin/activate      # Linux/Mac
.venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Start the server (port 8000)
uvicorn main:app --reload
```

Interactive API docs: http://localhost:8000/docs

## Running with Docker

```bash
docker build -t avaliaedu-omr .
docker run -p 8000:8000 avaliaedu-omr
```

## Endpoints

### GET /api/health

Returns service status and availability of OpenCV and pyzbar.

```json
{
  "status": "ok",
  "service": "avaliaedu-omr",
  "version": "0.1.0",
  "opencv_available": true,
  "pyzbar_available": true
}
```

### POST /api/omr/scan

Accepts a JPEG or PNG photo of the answer sheet.

**Parameters:**
- `photo` (form-data, required): image file
- `debug` (query, optional): if `true`, includes a base64-encoded annotated PNG

**Example with curl:**

```bash
curl -X POST http://localhost:8000/api/omr/scan \
  -F "photo=@/path/to/answer_sheet.jpg" \
  -F "debug=true"
```

**Success response:**

```json
{
  "success": true,
  "qr": {
    "raw": "https://avaliaedu.com/s/lq3j5k_x9m2n",
    "token": "lq3j5k_x9m2n",
    "format": "url"
  },
  "fiducial": {
    "found": true,
    "count": 4,
    "corners": [
      [45.0, 52.0],
      [648.0, 51.0],
      [649.0, 901.0],
      [44.0, 902.0]
    ]
  },
  "debug_image": null
}
```

**Error response (QR not found, fiducial not found):**

```json
{
  "success": true,
  "qr": null,
  "fiducial": {
    "found": false,
    "count": 2
  }
}
```

Note: `success: true` means the image was processed without errors.
`qr: null` or `fiducial.found: false` means those elements were not detected.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `ALLOWED_ORIGINS` | `*` | Comma-separated CORS origins |

## Calibration notes

The fiducial detector uses area thresholds of 100-500 px² (at 700px width).
If you change the size of the corner squares in the PDF template, update
`_MIN_AREA` and `_MAX_AREA` in `omr/fiducial.py`.
