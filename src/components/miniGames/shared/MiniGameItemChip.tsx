'use client';

import { motion } from 'motion/react';
import type { MiniGameItemVisualState } from './miniGameItemStyles';
import { MINI_GAME_ITEM_STYLE } from './miniGameItemStyles';

export interface MiniGameItemChipProps {
  label: string;
  state: MiniGameItemVisualState;
  onTap: () => void;
  layoutId: string;
  disabled: boolean;
  /** Wider chips with wrapped labels (sequence build). */
  multilineLabel?: boolean;
  /** Extra Tailwind classes (e.g. `w-full h-full` for grid rows). */
  className?: string;
}

export function MiniGameItemChip({
  label,
  state,
  onTap,
  layoutId,
  disabled,
  multilineLabel = false,
  className = '',
}: MiniGameItemChipProps) {
  const base =
    'inline-flex items-center justify-center rounded-lg border-2 px-3 py-2 text-sm font-medium min-h-[44px] min-w-[44px] select-none';
  const wide = multilineLabel ? 'max-w-full text-center break-words px-2' : '';

  return (
    <motion.button
      layoutId={layoutId}
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onTap();
      }}
      disabled={disabled}
      className={`${base} ${wide} ${MINI_GAME_ITEM_STYLE[state]} ${disabled ? 'opacity-70' : ''} ${className}`.trim()}
      layout
      transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.8 }}
      initial={false}
      animate={
        state === 'incorrect'
          ? { x: [0, -3, 3, -3, 3, 0], transition: { duration: 0.25 } }
          : state === 'correct'
            ? { scale: [1, 1.06, 1], transition: { duration: 0.2 } }
            : {}
      }
    >
      {state === 'correct' && <span className="mr-1 shrink-0">✓</span>}
      {state === 'incorrect' && <span className="mr-1 shrink-0">✗</span>}
      {multilineLabel ? (
        <span className="line-clamp-3">{label}</span>
      ) : (
        label
      )}
    </motion.button>
  );
}
