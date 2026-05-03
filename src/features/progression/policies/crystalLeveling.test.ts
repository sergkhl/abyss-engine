import { describe, expect, it } from 'vitest';

import type { TopicRef } from '@/types/core';
import { isXpMaxedForCurrentLevel } from '@/types/crystalLevel';
import type { ActiveCrystal } from '@/types/core';
import {
  applyCrystalXpDelta,
  getCrystalLevelProgressToNext,
  getXpToNextBandThreshold,
} from './crystalLeveling';

function createActiveCrystal(topicId: string, xp = 0, subjectId = 's1'): ActiveCrystal {
  return {
    subjectId,
    topicId,
    gridPosition: [0, 0],
    xp,
    spawnedAt: 100,
  };
}

function topicRef(subjectId: string, topicId: string): TopicRef {
  return { subjectId, topicId };
}

describe('crystalLeveling policy', () => {
  describe('getCrystalLevelProgressToNext', () => {
    it.each([
      { xp: -10, level: 0, progressPercent: 0, isMax: false, totalXp: 0 },
      { xp: 0, level: 0, progressPercent: 0, isMax: false, totalXp: 0 },
      { xp: 50, level: 0, progressPercent: 50, isMax: false, totalXp: 50 },
      { xp: 99, level: 0, progressPercent: 99, isMax: false, totalXp: 99 },
      { xp: 100, level: 1, progressPercent: 0, isMax: false, totalXp: 100 },
      { xp: 150, level: 1, progressPercent: 50, isMax: false, totalXp: 150 },
      { xp: 199, level: 1, progressPercent: 99, isMax: false, totalXp: 199 },
      { xp: 400, level: 4, progressPercent: 0, isMax: false, totalXp: 400 },
      { xp: 499, level: 4, progressPercent: 99, isMax: false, totalXp: 499 },
      { xp: 500, level: 5, progressPercent: 100, isMax: true, totalXp: 500 },
      { xp: 999, level: 5, progressPercent: 100, isMax: true, totalXp: 999 },
    ] as const)('xp=$xp → level $level, $progressPercent%, isMax=$isMax', ({ xp, level, progressPercent, isMax, totalXp }) => {
      expect(getCrystalLevelProgressToNext(xp)).toEqual({
        level,
        progressPercent,
        isMax,
        totalXp,
      });
    });
  });

  describe('XP band max helpers', () => {
    it.each([
      { xp: -10, isMaxed: false, nextThresholdDelta: 100 },
      { xp: 0, isMaxed: false, nextThresholdDelta: 100 },
      { xp: 50, isMaxed: false, nextThresholdDelta: 50 },
      { xp: 99, isMaxed: true, nextThresholdDelta: 1 },
      { xp: 100, isMaxed: false, nextThresholdDelta: 100 },
      { xp: 150, isMaxed: false, nextThresholdDelta: 50 },
      { xp: 199, isMaxed: true, nextThresholdDelta: 1 },
      { xp: 399, isMaxed: true, nextThresholdDelta: 1 },
      { xp: 500, isMaxed: false, nextThresholdDelta: 0 },
    ] as const)('xp=$xp → isXpMaxed=$isMaxed next= $nextThresholdDelta', ({ xp, isMaxed, nextThresholdDelta }) => {
      expect(isXpMaxedForCurrentLevel(xp)).toBe(isMaxed);
      expect(getXpToNextBandThreshold(xp)).toBe(nextThresholdDelta);
    });
  });

  describe('applyCrystalXpDelta', () => {
    it('returns null when topic is missing', () => {
      expect(
        applyCrystalXpDelta([createActiveCrystal('a', 0)], topicRef('s1', 'missing'), 50),
      ).toBeNull();
    });

    it('applies delta, clamps at zero, and reports level gains', () => {
      const crystals = [createActiveCrystal('topic-a', 95)];
      const result = applyCrystalXpDelta(crystals, topicRef('s1', 'topic-a'), 15);
      expect(result).not.toBeNull();
      expect(result!.nextXp).toBe(110);
      expect(result!.previousLevel).toBe(0);
      expect(result!.nextLevel).toBe(1);
      expect(result!.levelsGained).toBe(1);
      expect(result!.nextActiveCrystals[0]?.xp).toBe(110);
      expect(crystals[0]?.xp).toBe(95);
    });
  });
});
