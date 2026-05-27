#!/usr/bin/env python3
"""
Test script to verify the new rectangle-based fiducial detection works correctly.
"""

import sys
import logging
import cv2
import numpy as np

# Setup logging
logging.basicConfig(level=logging.DEBUG, format='%(name)s - %(levelname)s - %(message)s')

# Import the fixed module
from omr.fiducial import detect_fiducials

def create_test_sheet():
    """Create a synthetic answer sheet with clear border."""
    img = np.ones((1754, 1240, 3), dtype=np.uint8) * 255  # White background

    # Draw a clear rectangular border
    cv2.rectangle(img, (50, 50), (1190, 1704), (0, 0, 0), 3)

    # Add some content in the middle (simulated bubbles)
    for y in range(200, 1600, 150):
        for x in range(200, 1100, 200):
            cv2.circle(img, (x, y), 15, (0, 0, 0), 2)

    # Add QR code simulation
    cv2.rectangle(img, (950, 80), (1100, 230), (0, 0, 0), 2)

    return img

def test_detection():
    """Test the new rectangle detection."""
    print("\n=== Testing Rectangle-Based Fiducial Detection ===\n")

    # Create test image
    test_sheet = create_test_sheet()
    print(f"Created test sheet: {test_sheet.shape}")

    # Run detection
    result = detect_fiducials(test_sheet)

    print(f"\nDetection result:")
    print(f"  Found: {result.found}")
    print(f"  Count: {result.count}")

    if result.corners:
        print(f"  Corners detected:")
        labels = ["TL", "TR", "BR", "BL"]
        for i, (label, corner) in enumerate(zip(labels, result.corners)):
            print(f"    {label}: ({corner[0]:.1f}, {corner[1]:.1f})")

        # Verify corners are roughly at the border
        expected_tl = (50, 50)
        expected_br = (1190, 1704)

        tl_x, tl_y = result.corners[0]
        br_x, br_y = result.corners[2]

        tolerance = 20
        if (abs(tl_x - expected_tl[0]) < tolerance and
            abs(tl_y - expected_tl[1]) < tolerance and
            abs(br_x - expected_br[0]) < tolerance and
            abs(br_y - expected_br[1]) < tolerance):
            print("\n✓ Corners are correctly detected!")
            return True
        else:
            print(f"\n✗ Corners are off:")
            print(f"  Expected TL: {expected_tl}, got: ({tl_x:.1f}, {tl_y:.1f})")
            print(f"  Expected BR: {expected_br}, got: ({br_x:.1f}, {br_y:.1f})")
            return False
    else:
        print("\n✗ No corners detected!")
        return False

if __name__ == "__main__":
    try:
        success = test_detection()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n✗ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
