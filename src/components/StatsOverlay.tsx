import React from 'react';
import { Buff } from '../types/progression';
import {
  getBuffDisplayName,
  getBuffIcon,
  getBuffSummary,
  groupBuffsByType,
  groupBuffsByTypeWithSources,
} from '../features/progression';
import { Badge } from '@/components/ui/badge';

export interface StatsOverlayProps {
  /** Total number of cards in the deck */
  totalCards: number;
  /** Number of cards due for review */
  dueCards: number;
  activeBuffs?: Buff[];
}

/**
 * StatsOverlay Component
 * Displays study statistics in an overlay on the main page.
 * Shows: Due/Total cards, buffs
 */
export function StatsOverlay({
  totalCards,
  dueCards,
  activeBuffs = [],
}: StatsOverlayProps) {
  const [selectedBuffType, setSelectedBuffType] = React.useState<Buff['modifierType'] | null>(null);

  const groupedBuffs = groupBuffsByType(activeBuffs).slice(0, 3);
  const groupedBuffsWithSources = groupBuffsByTypeWithSources(activeBuffs);
  const selectedGroup = groupedBuffsWithSources.find((group) => group.modifierType === selectedBuffType);

  const buffIcons = groupedBuffs.map((buff) => {
    const icon = getBuffIcon(buff.modifierType);
    const summary = getBuffSummary(buff);
    const isSelected = selectedBuffType === buff.modifierType;

    return (
      <Badge
        asChild
        key={buff.modifierType}
        variant={isSelected ? 'default' : 'outline'}
        className={`px-2 py-1 text-xs transition-colors ${isSelected ? 'ring-1 ring-foreground/30' : ''}`}
      >
        <button
          type="button"
          onClick={() => {
            setSelectedBuffType((current) => (current === buff.modifierType ? null : buff.modifierType));
          }}
          aria-label={`View ${summary} sources`}
          title={summary}
          className="inline-flex items-center gap-1 text-xs text-current"
        >
          <span className="text-sm leading-none" aria-hidden="true">{icon}</span>
          <span>{buff.magnitude.toFixed(1)}x</span>
        </button>
      </Badge>
    );
  });

  const selectedDetails = selectedGroup ? (
        <div className="text-xs text-foreground/90 mt-2 border-t border-border/40 pt-1.5">
        <p className="font-medium text-[10px] uppercase tracking-[0.15em] text-foreground/60 mb-1">
        {`${selectedGroup.totalMagnitude.toFixed(2)}x ${getBuffDisplayName(selectedGroup.modifierType)} sources`}
      </p>
      <ul className="mt-1 flex flex-col gap-1">
        {selectedGroup.buffs.map((buff, index) => (
          <li key={`${buff.buffId}-${buff.source ?? 'unknown'}-${index}`} className="leading-4">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true">{getBuffIcon(selectedGroup.modifierType)}</span>
              <span>{buff.magnitude.toFixed(2)}x from {buff.source ?? 'Unknown origin'}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  ) : null;

  return (
    <div className="absolute top-4 left-4 z-10 flex gap-2" data-testid="stats-overlay">
      <div className="bg-card/90 px-4 py-2 rounded-md text-center border border-border/50" data-testid="stats-overlay-cards">
        <Badge variant="outline" className="h-5 px-2 text-[10px] mb-0.5">
          Cards
        </Badge>
        <span className="block text-lg font-semibold leading-none text-primary">
          {dueCards}/{totalCards}
        </span>
      </div>

      <div className="bg-card/90 px-3 py-2 rounded-md text-left min-w-[80px] border border-border/40" data-testid="stats-overlay-buffs">
        <Badge variant="outline" className="h-5 px-2 text-[10px] mb-1">
          Buffs
        </Badge>
        {activeBuffs.length === 0 ? (
          <span className="text-xs text-muted-foreground">None</span>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">{buffIcons}</div>
            {selectedBuffType ? (
              selectedDetails
            ) : (
              <span className="text-[11px] text-muted-foreground mt-1">Tap a buff for source details</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default StatsOverlay;
