#!/usr/bin/env python3
"""
Test bubble-based fiducial detection.
Creates a synthetic answer sheet with bubbles and verifies detection.
"""

import sys
import logging
import cv2
import numpy as np

logging.basicConfig(level=logging.INFO, format='%(name)s - %(message)s')

from omr.fiducial import detect_fiducials

def create_answer_sheet_with_bubbles():
    """Create a realistic answer sheet with actual bubble circles."""
    img = np.ones((1754, 1240, 3), dtype=np.uint8) * 255

    # Draw outer sheet border
    cv2.rectangle(img, (50, 50), (1190, 1704), (0, 0, 0), 3)

    # Draw header area
    cv2.rectangle(img, (60, 60), (1180, 280), (200, 200, 200), 1)
    cv2.putText(img, "ANSWER SHEET", (400, 150), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)

    # Draw bubble grid: 60 questions, 4 options each, in 3 columns
    bubble_y_start = 350
    bubble_radius = 18
    bubble_spacing_y = 35
    bubble_spacing_x = 50

    col_starts = [150, 500, 850]
    bubbles_created = 0

    for col_idx, col_x_base in enumerate(col_starts):
        questions_in_col = 20
        for q_idx in range(questions_in_col):
            y = bubble_y_start + q_idx * bubble_spacing_y
            if y > 1650:
                break

            # Draw question number
            q_num = col_idx * 20 + q_idx + 1
            cv2.putText(img, str(q_num), (col_x_base - 40, y + 8),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)

            # Draw 4 bubble options
            for opt_idx in range(4):
                bx = col_x_base + opt_idx * bubble_spacing_x
                # Draw bubble circle (black outline)
                cv2.circle(img, (bx, y), bubble_radius, (0, 0, 0), 2)
                bubbles_created += 1

    print(f"Created sheet with {bubbles_created} bubbles")
    return img


def test_bubble_detection():
    """Test the new bubble-based fiducial detection."""
    print("\n=== Testing Bubble-Based Fiducial Detection ===\n")

    sheet = create_answer_sheet_with_bubbles()
    print(f"Answer sheet size: {sheet.shape}")

    # Detect fiducials
    result = detect_fiducials(sheet)

    print(f"\nDetection result:")
    print(f"  Found: {result.found}")
    print(f"  Count: {result.count}")

    if result.corners:
        print(f"\n  Detected corners:")
        labels = ["TL", "TR", "BR", "BL"]
        for label, corner in zip(labels, result.corners):
            print(f"    {label}: ({corner[0]:.1f}, {corner[1]:.1f})")

        # Verify corners define a reasonable answer area
        xs = [c[0] for c in result.corners]
        ys = [c[1] for c in result.corners]
        width = max(xs) - min(xs)
        height = max(ys) - min(ys)

        print(f"\n  Detected area: {width:.0f} x {height:.0f}")

        # Should be portrait orientation
        if height > width and width > 500 and height > 1300:
            print(f"  ✓ Dimensions are reasonable for answer sheet")
            return True
        else:
            print(f"  ✗ Dimensions don't match expected answer sheet")
            return False
    else:
        print(f"\n✗ No corners detected!")
        return False


if __name__ == "__main__":
    try:
        success = test_bubble_detection()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
