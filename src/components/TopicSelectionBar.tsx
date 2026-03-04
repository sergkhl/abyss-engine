"use client";

import React from 'react';
import { useUIStore } from '../store/uiStore';
import { useProgressionStore as useStudyStore } from '../store/progressionStore';
import { calculateLevelFromXP } from '../utils/progressionUtils';

interface TopicMetadata {
  title?: string;
  subjectId: string;
  subjectName?: string;
  topicName?: string;
}

type TopicMetadataMap = Record<string, TopicMetadata>;

interface TopicSelectionBarProps {
  /** Whether this bar is embedded in the 3D scene (vs standalone) */
  isEmbedded?: boolean;
  topicMetadata?: TopicMetadataMap;
  onStartTopicStudySession?: (topicId: string) => void;
}

/**
 * TopicSelectionBar Component
 *
 * A small persistent bar at the top of the 3D view that shows the selected topic
 * when a crystal is selected. Displays subject name, topic name, and level.
 *
 * Features:
 * - Shows selected topic info when isSelectionMode is true
 * - "Begin" button to start studying the selected topic
 * - "X" button to clear/deselect the topic
 */
export default function TopicSelectionBar({
  isEmbedded = false,
  topicMetadata = {},
  onStartTopicStudySession,
}: TopicSelectionBarProps) {
  // Subscribe to UI store for selection state
  const selectedTopicId = useUIStore((state) => state.selectedTopicId);
  const selectTopic = useUIStore((state) => state.selectTopic);
  // Compute isSelectionMode from selectedTopicId - this makes it reactive
  const isSelectionMode = selectedTopicId !== null;

  // Subscribe to study store for topic data
  const activeCrystals = useStudyStore((state) => state.activeCrystals);

  // Get topic and subject data from deck
  const [topicData, setTopicData] = React.useState<{
    topicId: string | null;
    topicName: string | null;
    subjectName: string | null;
    level: number;
    xp: number;
  }>({ topicId: null, topicName: null, subjectName: null, level: 0, xp: 0 });

  // Look up topic and subject when selectedTopicId changes
  React.useEffect(() => {
    if (!selectedTopicId) {
      setTopicData({ topicId: null, topicName: null, subjectName: null, level: 0, xp: 0 });
      return;
    }

    const topicMeta = topicMetadata[selectedTopicId];
    const topicName = topicMeta?.title || topicMeta?.topicName || null;
    const subjectName = topicMeta?.subjectName || null;

    // Get level from active crystals (calculate from XP)
    const crystal = activeCrystals.find((c) => c.topicId === selectedTopicId);
    const xp = crystal?.xp || 0;
    const level = calculateLevelFromXP(xp);

    setTopicData({
      topicId: selectedTopicId,
      topicName,
      subjectName,
      level,
      xp,
    });
  }, [selectedTopicId, activeCrystals, topicMetadata]);

  // Don't render if not in selection mode
  if (!isSelectionMode) {
    return null;
  }

  const { topicId, topicName, subjectName, level, xp } = topicData;

  // Handle begin button click
  const handleBegin = () => {
    if (selectedTopicId && onStartTopicStudySession) {
      onStartTopicStudySession(selectedTopicId);
    }
  };

  // Handle clear/close button click
  const handleClear = () => {
    selectTopic(null);
  };

  // Determine container classes based on whether it's embedded in 3D scene
  const containerClass = isEmbedded
    ? ''
    : 'fixed top-4 left-1/2 -translate-x-1/2 z-50';

  return (
    <div className={containerClass}>
      <div className="flex items-center gap-3 px-4 py-2 bg-black/80 backdrop-blur-sm rounded-lg border border-white/10 shadow-lg">
        {/* Selection Info */}
        <div className="flex flex-col items-start">
          <span className="text-xs text-white/50 uppercase tracking-wider">
            Selected
          </span>
          <div className="flex items-center gap-2 text-white">
            {subjectName && (
              <span className="font-medium">{subjectName}</span>
            )}
            {subjectName && topicId && (
              <span className="text-white/40">–</span>
            )}
            {topicName && (
              <span className="font-semibold">{topicName}</span>
            )}
            <span className="text-white/40">•</span>
            <span className="text-sm text-amber-400">
              Level {level} ({xp} XP)
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-white/20" />

        {/* Begin Button */}
        <button
          onClick={handleBegin}
          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded transition-colors duration-200"
        >
          Begin
        </button>

        {/* Clear/Close Button */}
        <button
          onClick={handleClear}
          className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors duration-200"
          aria-label="Clear selection"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
