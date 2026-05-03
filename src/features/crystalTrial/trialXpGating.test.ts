import { describe, expect, it } from 'vitest';

import type { CrystalTrialStatus } from '@/types/crystalTrial';

import {
  computeTrialGatedDirectReward,
  computeTrialGatedStudyReward,
} from './trialXpGating';

const NON_PASSED_STATUSES: CrystalTrialStatus[] = [
  'idle',
  'pregeneration',
  'awaiting_player',
  'in_progress',
  'failed',
  'cooldown',
];

const NON_IDLE_NON_PASSED_STATUSES: CrystalTrialStatus[] = [
  'pregeneration',
  'awaiting_player',
  'in_progress',
  'failed',
  'cooldown',
];

describe('computeTrialGatedStudyReward', () => {
  it('returns the raw reward when below max level and not crossing a boundary', () => {
    const result = computeTrialGatedStudyReward({
      previousXp: 50,
      rawReward: 10,
      trialStatus: 'idle',
      currentLevel: 0,
    });
    expect(result).toEqual({
      effectiveReward: 10,
      wasCapped: false,
      shouldPregenerate: true,
    });
  });

  it.each(NON_PASSED_STATUSES)(
    'caps the reward at the boundary for status %s',
    (status) => {
      const result = computeTrialGatedStudyReward({
        previousXp: 95,
        rawReward: 10,
        trialStatus: status,
        currentLevel: 0,
      });
      expect(result.wasCapped).toBe(true);
      expect(result.effectiveReward).toBe(4);
      expect(result.shouldPregenerate).toBe(status === 'idle');
    },
  );

  it('does NOT cap for passed (level-up allowed)', () => {
    const result = computeTrialGatedStudyReward({
      previousXp: 95,
      rawReward: 10,
      trialStatus: 'passed',
      currentLevel: 0,
    });
    expect(result).toEqual({
      effectiveReward: 10,
      wasCapped: false,
      shouldPregenerate: false,
    });
  });

  it('idle + positive gain (no cap) emits shouldPregenerate=true', () => {
    const result = computeTrialGatedStudyReward({
      previousXp: 10,
      rawReward: 5,
      trialStatus: 'idle',
      currentLevel: 0,
    });
    expect(result).toEqual({
      effectiveReward: 5,
      wasCapped: false,
      shouldPregenerate: true,
    });
  });

  it('idle + raw reward 0 does not emit pregeneration', () => {
    const result = computeTrialGatedStudyReward({
      previousXp: 10,
      rawReward: 0,
      trialStatus: 'idle',
      currentLevel: 0,
    });
    expect(result).toEqual({
      effectiveReward: 0,
      wasCapped: false,
      shouldPregenerate: false,
    });
  });

  it('Q7 regression: previousXp=99 idle with positive raw reward caps to 0 and still emits pregeneration', () => {
    const result = computeTrialGatedStudyReward({
      previousXp: 99,
      rawReward: 10,
      trialStatus: 'idle',
      currentLevel: 0,
    });
    expect(result).toEqual({
      effectiveReward: 0,
      wasCapped: true,
      shouldPregenerate: true,
    });
  });

  it.each(NON_IDLE_NON_PASSED_STATUSES)(
    'non-idle status %s never emits pregeneration',
    (status) => {
      const result = computeTrialGatedStudyReward({
        previousXp: 10,
        rawReward: 5,
        trialStatus: status,
        currentLevel: 0,
      });
      expect(result.shouldPregenerate).toBe(false);
    },
  );

  it('returns the raw reward at max level without gating', () => {
    const result = computeTrialGatedStudyReward({
      previousXp: 600,
      rawReward: 50,
      trialStatus: 'awaiting_player',
      currentLevel: 5,
    });
    expect(result).toEqual({
      effectiveReward: 50,
      wasCapped: false,
      shouldPregenerate: false,
    });
  });
});

describe('computeTrialGatedDirectReward', () => {
  it('does NOT cap when trial is idle, even at the boundary', () => {
    const result = computeTrialGatedDirectReward({
      previousXp: 95,
      rawReward: 10,
      trialStatus: 'idle',
      currentLevel: 0,
    });
    expect(result.wasCapped).toBe(false);
    expect(result.effectiveReward).toBe(10);
    expect(result.shouldPregenerate).toBe(true);
  });

  it.each(NON_IDLE_NON_PASSED_STATUSES)(
    'caps the reward at the boundary for non-idle status %s',
    (status) => {
      const result = computeTrialGatedDirectReward({
        previousXp: 95,
        rawReward: 10,
        trialStatus: status,
        currentLevel: 0,
      });
      expect(result.wasCapped).toBe(true);
      expect(result.effectiveReward).toBe(4);
      expect(result.shouldPregenerate).toBe(false);
    },
  );

  it('does NOT cap for passed', () => {
    const result = computeTrialGatedDirectReward({
      previousXp: 95,
      rawReward: 10,
      trialStatus: 'passed',
      currentLevel: 0,
    });
    expect(result.wasCapped).toBe(false);
    expect(result.effectiveReward).toBe(10);
    expect(result.shouldPregenerate).toBe(false);
  });

  it('idle + positive gain emits shouldPregenerate=true', () => {
    const result = computeTrialGatedDirectReward({
      previousXp: 10,
      rawReward: 5,
      trialStatus: 'idle',
      currentLevel: 0,
    });
    expect(result.shouldPregenerate).toBe(true);
  });

  it('returns the raw reward at max level without gating', () => {
    const result = computeTrialGatedDirectReward({
      previousXp: 600,
      rawReward: 50,
      trialStatus: 'awaiting_player',
      currentLevel: 5,
    });
    expect(result).toEqual({
      effectiveReward: 50,
      wasCapped: false,
      shouldPregenerate: false,
    });
  });
});
