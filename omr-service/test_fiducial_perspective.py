#!/usr/bin/env python3
"""
Test rectangle detection with perspective distorted (skewed) answer sheet.
"""

import sys
import logging
import cv2
import numpy as np

logging.basicConfig(level=logging.INFO, format='%(name)s - %(message)s')

from omr.fiducial import detect_fiducials
from omr.perspective import correct_perspective

def create_skewed_sheet():
    """Create a skewed/perspective-distorted answer sheet."""
    # Create base sheet
    img = np.ones((1754, 1240, 3), dtype=np.uint8) * 255

    # Draw border and content on the straight sheet
    cv2.rectangle(img, (50, 50), (1190, 1704), (0, 0, 0), 3)

    # Add bubble grid
    for y in range(200, 1600, 150):
        for x in range(200, 1100, 200):
            cv2.circle(img, (x, y), 15, (0, 0, 0), 2)

    # Add QR code area
    cv2.rectangle(img, (950, 80), (1100, 230), (0, 0, 0), 2)

    # Now apply perspective transformation to skew it
    h, w = img.shape[:2]

    # Define skew: tilt the top-right corner inward
    src_pts = np.float32([
        [0, 0],
        [w, 0],
        [w, h],
        [0, h]
    ])

    dst_pts = np.float32([
        [50, 80],          # TL: shift down and right
        [w - 120, 0],      # TR: shift inward (left)
        [w - 50, h - 40],  # BR: normal
        [80, h - 60]       # BL: shift right
    ])

    matrix = cv2.getPerspectiveTransform(src_pts, dst_pts)
    skewed = cv2.warpPerspective(img, matrix, (w, h), borderValue=(255, 255, 255))

    return skewed

def test_skewed_detection():
    """Test detection on skewed sheet."""
    print("\n=== Testing Rectangle Detection on Skewed Sheet ===\n")

    skewed = create_skewed_sheet()
    print(f"Created skewed sheet: {skewed.shape}")

    # Detect corners
    result = detect_fiducials(skewed)

    print(f"\nDetection result:")
    print(f"  Found: {result.found}")
    print(f"  Count: {result.count}")

    if result.corners:
        print(f"  Corners detected (in original image coordinates):")
        labels = ["TL", "TR", "BR", "BL"]
        for label, corner in zip(labels, result.corners):
            print(f"    {label}: ({corner[0]:.1f}, {corner[1]:.1f})")

        # Try perspective correction
        print(f"\n--- Testing Perspective Correction ---")
        corrected = correct_perspective(skewed, result.corners)

        if corrected is not None:
            print(f"✓ Perspective correction successful!")
            print(f"  Corrected image size: {corrected.shape}")

            # Verify bubbles are roughly horizontal now
            return True
        else:
            print(f"✗ Perspective correction failed!")
            return False
    else:
        print(f"✗ No corners detected!")
        return False

if __name__ == "__main__":
    try:
        success = test_skewed_detection()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
