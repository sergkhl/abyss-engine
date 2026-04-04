import type { MiniGameItemVisualState } from './miniGameItemStyles';

export function getMiniGameItemVisualState(
  itemId: string,
  selectedItemId: string | null,
  phase: string,
  correctItemIds: ReadonlySet<string>,
  incorrectItemIds: ReadonlySet<string>,
): MiniGameItemVisualState {
  if (phase === 'submitted') {
    if (correctItemIds.has(itemId)) return 'correct';
    if (incorrectItemIds.has(itemId)) return 'incorrect';
    return 'default';
  }
  if (selectedItemId === itemId) return 'selected';
  return 'default';
}
