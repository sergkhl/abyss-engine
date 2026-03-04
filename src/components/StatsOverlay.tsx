import React from 'react';

export interface StatsOverlayProps {
  /** Total number of concepts in the deck */
  totalCards: number;
  /** Number of concepts due for review */
  dueCards: number;
  /** Number of active (unlocked) topics */
  activeTopics: number;
  /** Number of locked topics */
  lockedTopics: number;
}

/**
 * StatsOverlay Component
 * Displays study statistics in an overlay on the main page.
 * Shows: Total cards, Due cards, Active topics, Locked topics
 */
export function StatsOverlay({
  totalCards,
  dueCards,
  activeTopics,
  lockedTopics,
}: StatsOverlayProps) {
  return (
    <div className="absolute top-5 left-5 flex gap-[15px] z-10">
      {/* Total Concepts */}
      <div className="bg-slate-800/90 px-5 py-2.5 rounded-lg text-center">
        <span className="block text-slate-400 text-xs mb-0.5">Total</span>
        <span className="block text-xl font-bold text-cyan-400">{totalCards}</span>
      </div>

      {/* Due Concepts */}
      <div className="bg-slate-800/90 px-5 py-2.5 rounded-lg text-center">
        <span className="block text-slate-400 text-xs mb-0.5">Due</span>
        <span className="block text-xl font-bold text-cyan-400">{dueCards}</span>
      </div>

      {/* Active Topics */}
      <div className="bg-slate-800/90 px-5 py-2.5 rounded-lg text-center">
        <span className="block text-slate-400 text-xs mb-0.5">Topics</span>
        <span className="block text-xl font-bold text-cyan-400">{activeTopics}</span>
      </div>

      {/* Locked Topics */}
      <div className="bg-slate-800/90 px-5 py-2.5 rounded-lg text-center">
        <span className="block text-slate-400 text-xs mb-0.5">Locked</span>
        <span className="block text-xl font-bold text-amber-500">{lockedTopics}</span>
      </div>
    </div>
  );
}

export default StatsOverlay;
