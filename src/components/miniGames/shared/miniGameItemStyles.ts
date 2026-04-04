export type MiniGameItemVisualState = 'default' | 'selected' | 'correct' | 'incorrect';

export const MINI_GAME_ITEM_STYLE: Record<MiniGameItemVisualState, string> = {
  default: 'bg-muted border-border text-foreground',
  selected: 'bg-primary/20 border-primary text-foreground ring-2 ring-primary',
  correct: 'bg-green-500/20 border-green-500 text-green-700 dark:text-green-300',
  incorrect: 'bg-destructive/20 border-destructive text-destructive',
};
