#!/bin/bash
# Start OMR Service - Simple startup script

echo "=== AvaliaEdu OMR Service Startup ==="
echo ""

# Check if dependencies are installed
echo "Checking dependencies..."
python3 -c "import cv2, fastapi, pyzbar; print('✓ All dependencies OK')" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "⚠ Installing missing dependencies..."
    pip install --break-system-packages opencv-python-headless fastapi uvicorn python-multipart pyzbar numpy pillow
fi

echo ""
echo "Starting OMR Service on port 8000..."
echo "API Docs: http://localhost:8000/docs"
echo "Health: http://localhost:8000/api/health"
echo ""
echo "Press Ctrl+C to stop"
echo ""

cd "$(dirname "$0")"
python3 -m uvicorn omr-service.main:app --host 0.0.0.0 --port 8000
