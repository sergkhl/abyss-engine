'use client';

import React from 'react';

export type MiniGameConnectorLineVariant = 'default' | 'correct' | 'incorrect';

export interface MiniGameConnectorSegment {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  variant?: MiniGameConnectorLineVariant;
}

const STROKE: Record<MiniGameConnectorLineVariant, string> = {
  default: 'stroke-muted-foreground',
  correct: 'stroke-green-500',
  incorrect: 'stroke-destructive',
};

interface MiniGameConnectorLayerProps {
  width: number;
  height: number;
  lines: MiniGameConnectorSegment[];
  className?: string;
}

export function MiniGameConnectorLayer({ width, height, lines, className }: MiniGameConnectorLayerProps) {
  if (width <= 0 || height <= 0) return null;

  return (
    <svg
      className={className ?? 'pointer-events-none absolute inset-0 z-[1]'}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      {lines.map((line) => {
        const v = line.variant ?? 'default';
        return (
          <line
            key={line.key}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            strokeWidth={2}
            strokeLinecap="round"
            className={STROKE[v]}
          />
        );
      })}
    </svg>
  );
}
