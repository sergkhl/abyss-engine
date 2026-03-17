import React from 'react';
import { Buff } from '../types/progression';
import {
  getBuffDisplayName,
  getBuffIcon,
  getBuffSummary,
  groupBuffsByType,
  groupBuffsByTypeWithSources,
} from '../features/progression';
import { Button } from '@/components/ui/button';

export interface StatsOverlayProps {
  /** Total number of cards in the deck */
  totalCards: number;
  /** Number of cards due for review */
  dueCards: number;
  /** Number of active (unlocked) topics */
  activeTopics: number;
  activeBuffs?: Buff[];
}

/**
 * StatsOverlay Component
 * Displays study statistics in an overlay on the main page.
 * Shows: Total cards, Due cards, Active topics, Active buffs
 */
export function StatsOverlay({
  totalCards,
  dueCards,
  activeTopics,
  activeBuffs = [],
}: StatsOverlayProps) {
  const [selectedBuffType, setSelectedBuffType] = React.useState<Buff['modifierType'] | null>(null);

  const groupedBuffs = groupBuffsByType(activeBuffs).slice(0, 3);
  const groupedBuffsWithSources = groupBuffsByTypeWithSources(activeBuffs);
  const selectedGroup = groupedBuffsWithSources.find((group) => group.modifierType === selectedBuffType);

  const buffIcons = groupedBuffs.map((buff) => {
    const icon = getBuffIcon(buff.modifierType);
    const summary = getBuffSummary(buff);
    return (
      <Button
        type="button"
        key={buff.modifierType}
        className={`inline-flex items-center justify-center w-8 h-8 rounded bg-secondary/20 border border-secondary mr-1 ${selectedBuffType === buff.modifierType ? 'ring-2 ring-ring' : ''}`}
        onClick={() => {
          setSelectedBuffType((current) => (current === buff.modifierType ? null : buff.modifierType));
        }}
        aria-label={`View ${summary} sources`}
        title={summary}
      >
        {icon}
      </Button>
    );
  });

  const selectedDetails = selectedGroup ? (
        <div className="text-xs text-foreground mt-2 border-t border-secondary pt-2">
        <p className="font-semibold text-accent-foreground">
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
    <div className="absolute top-5 left-5 flex gap-[15px] z-10">
      {/* Total Cards */}
      <div className="bg-card/90 px-5 py-2.5 rounded-lg text-center">
        <span className="block text-muted-foreground text-xs mb-0.5">Total</span>
        <span className="block text-xl font-bold text-primary">{totalCards}</span>
      </div>

      {/* Due Cards */}
      <div className="bg-card/90 px-5 py-2.5 rounded-lg text-center">
        <span className="block text-muted-foreground text-xs mb-0.5">Due</span>
        <span className="block text-xl font-bold text-primary">{dueCards}</span>
      </div>

      {/* Active Topics */}
      <div className="bg-card/90 px-5 py-2.5 rounded-lg text-center">
        <span className="block text-muted-foreground text-xs mb-0.5">Topics</span>
        <span className="block text-xl font-bold text-primary">{activeTopics}</span>
      </div>

      <div className="bg-card/90 px-5 py-2.5 rounded-lg text-left min-w-[140px]">
        <span className="block text-muted-foreground text-xs mb-0.5">Active Buffs</span>
        {activeBuffs.length === 0 ? (
          <span className="text-sm text-muted-foreground">None</span>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center">{buffIcons}</div>
            {selectedBuffType ? (
              selectedDetails
            ) : (
              <span className="text-xs text-muted-foreground mt-2">Click a buff to see details</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default StatsOverlay;
