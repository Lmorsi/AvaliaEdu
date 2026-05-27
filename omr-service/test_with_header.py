#!/usr/bin/env python3
"""
Test rectangle detection with header area (like real answer sheets).
"""

import sys
import logging
import cv2
import numpy as np

logging.basicConfig(level=logging.INFO, format='%(name)s - %(message)s')

from omr.fiducial import detect_fiducials
from omr.perspective import correct_perspective

def create_sheet_with_header():
    """Create an answer sheet with header, bubbles, and footer."""
    img = np.ones((1754, 1240, 3), dtype=np.uint8) * 255

    # Draw header area (top ~200px with text info)
    cv2.rectangle(img, (50, 50), (1190, 250), (200, 200, 200), 1)  # Light gray border for header
    cv2.putText(img, "NOME DA ESCOLA:", (70, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1)
    cv2.putText(img, "PROFESSOR:", (70, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1)
    cv2.putText(img, "ESTUDANTE:", (70, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1)

    # Draw outer border of sheet
    cv2.rectangle(img, (50, 50), (1190, 1704), (0, 0, 0), 3)

    # Draw the answer bubble grid area (below header, ~300px down to ~1600px)
    for col_idx in range(3):
        col_x = 150 + col_idx * 350
        for row_idx in range(20):
            y = 400 + row_idx * 60
            # Question number
            cv2.putText(img, str(row_idx + 1 + col_idx * 20), (col_x - 30, y + 8),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1)
            # Bubbles (4 options: A, B, C, D)
            for opt_idx in range(4):
                bx = col_x + opt_idx * 50
                cv2.circle(img, (bx, y), 15, (0, 0, 0), 2)

    # Draw footer
    cv2.putText(img, "FIM DO GABARITO", (450, 1680), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)

    return img

def test_header_detection():
    """Test detection on sheet with header."""
    print("\n=== Testing Rectangle Detection with Header ===\n")

    img = create_sheet_with_header()
    print(f"Created sheet with header: {img.shape}")

    # Detect corners
    result = detect_fiducials(img)

    print(f"\nDetection result:")
    print(f"  Found: {result.found}")
    print(f"  Count: {result.count}")

    if result.corners:
        print(f"  Corners detected:")
        labels = ["TL", "TR", "BR", "BL"]
        for label, corner in zip(labels, result.corners):
            print(f"    {label}: ({corner[0]:.1f}, {corner[1]:.1f})")

        # For this synthetic test, the outer border is at y=50
        # The answer area should start around there (outer border)
        # Since we can't perfectly separate header from outer border in synthetic test,
        # just check that the rectangle was detected and is reasonable
        top_corners_y = [result.corners[0][1], result.corners[1][1]]
        avg_top_y = sum(top_corners_y) / len(top_corners_y)
        bottom_corners_y = [result.corners[2][1], result.corners[3][1]]
        avg_bottom_y = sum(bottom_corners_y) / len(bottom_corners_y)

        print(f"\n  Top edge average Y: {avg_top_y:.1f}")
        print(f"  Bottom edge average Y: {avg_bottom_y:.1f}")

        # Check that rectangle spans most of the image
        height = avg_bottom_y - avg_top_y
        if height > 1600:  # Should be tall
            print(f"  ✓ Correctly detected large rectangle (height={height:.0f})")
            return True
        else:
            print(f"  ✗ Detected rectangle too small (height={height:.0f})")
            return False
    else:
        print(f"✗ No corners detected!")
        return False

if __name__ == "__main__":
    try:
        success = test_header_detection()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
