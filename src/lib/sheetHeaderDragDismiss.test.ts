import { describe, expect, it } from 'vitest';
import {
  shouldDismissSheetDrag,
  SHEET_HEADER_DRAG_DISTANCE_THRESHOLD,
  SHEET_HEADER_DRAG_MIN_DELTA,
  SHEET_HEADER_DRAG_VELOCITY_THRESHOLD,
} from './sheetHeaderDragDismiss';

describe('shouldDismissSheetDrag', () => {
  it('returns false when movement is below min delta', () => {
    expect(shouldDismissSheetDrag(SHEET_HEADER_DRAG_MIN_DELTA - 1, 10)).toBe(false);
  });

  it('returns true when distance crosses threshold with moderate velocity', () => {
    expect(shouldDismissSheetDrag(SHEET_HEADER_DRAG_DISTANCE_THRESHOLD, 0)).toBe(true);
  });

  it('returns true on fast flick below distance threshold', () => {
    expect(
      shouldDismissSheetDrag(
        40,
        SHEET_HEADER_DRAG_VELOCITY_THRESHOLD + 0.1,
        SHEET_HEADER_DRAG_DISTANCE_THRESHOLD,
        SHEET_HEADER_DRAG_VELOCITY_THRESHOLD,
        SHEET_HEADER_DRAG_MIN_DELTA,
      ),
    ).toBe(true);
  });

  it('returns false between min delta and thresholds with low velocity', () => {
    expect(
      shouldDismissSheetDrag(
        50,
        0.1,
        SHEET_HEADER_DRAG_DISTANCE_THRESHOLD,
        SHEET_HEADER_DRAG_VELOCITY_THRESHOLD,
        SHEET_HEADER_DRAG_MIN_DELTA,
      ),
    ).toBe(false);
  });
});
