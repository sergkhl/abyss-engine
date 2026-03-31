/** Pixels dragged downward before dismiss (unless velocity triggers first). */
export const SHEET_HEADER_DRAG_DISTANCE_THRESHOLD = 70;

/** Downward velocity in px/ms; fast flicks dismiss below distance threshold. */
export const SHEET_HEADER_DRAG_VELOCITY_THRESHOLD = 0.45;

/** Ignore dismiss if the user barely moved (noise / tap). */
export const SHEET_HEADER_DRAG_MIN_DELTA = 10;

export function shouldDismissSheetDrag(
  deltaY: number,
  velocityYPxPerMs: number,
  distanceThreshold: number = SHEET_HEADER_DRAG_DISTANCE_THRESHOLD,
  velocityThreshold: number = SHEET_HEADER_DRAG_VELOCITY_THRESHOLD,
  minDelta: number = SHEET_HEADER_DRAG_MIN_DELTA,
): boolean {
  if (deltaY < minDelta) return false;
  return deltaY >= distanceThreshold || velocityYPxPerMs >= velocityThreshold;
}
