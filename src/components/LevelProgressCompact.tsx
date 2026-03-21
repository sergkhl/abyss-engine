"use client";

import { Progress } from "@/components/ui/progress";
import { getCrystalLevelProgressToNext } from "@/features/progression";
import { cn } from "@/lib/utils";

export interface LevelProgressCompactProps {
  xp: number;
  className?: string;
}

export function LevelProgressCompact({ xp, className }: LevelProgressCompactProps) {
  const { level, progressPercent, isMax, totalXp } = getCrystalLevelProgressToNext(xp);
  const rightLabel = isMax ? "Max" : `Lv${level + 1}`;
  const xpDisplay = Math.round(totalXp);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
        Lv{level}
      </span>
      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
        {xpDisplay} XP
      </span>
      <Progress
        value={progressPercent}
        className="h-1 min-w-[4rem] flex-1"
        aria-valuenow={Math.round(progressPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
      />
      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
        {rightLabel}
      </span>
    </div>
  );
}
