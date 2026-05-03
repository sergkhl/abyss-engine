/**
 * Trial XP gating: pure-function policy used by the progression store to
 * decide whether a study or direct XP reward should be capped at the next
 * crystal-level boundary while a Crystal Trial is in a non-passed state,
 * and whether trial pregeneration should be triggered.
 *
 * Trial status is sampled once at gate time; callers must not mutate the
 * trial store between sampling and applying the result.
 */

import type { CrystalTrialStatus } from '@/types/crystalTrial';
import {
  calculateLevelFromXP,
  CRYSTAL_XP_PER_LEVEL,
  MAX_CRYSTAL_LEVEL,
} from '@/types/crystalLevel';
import { trialStatusRequiresXpCapAtLevelBoundary } from './trialPolicy';

export interface TrialXpGateInput {
  previousXp: number;
  rawReward: number;
  trialStatus: CrystalTrialStatus;
  currentLevel: number;
}

export interface TrialXpGateResult {
  effectiveReward: number;
  wasCapped: boolean;
  shouldPregenerate: boolean;
}

function hasAddedAnyXp(previousXp: number, currentXp: number): boolean {
  return currentXp > previousXp;
}

function wouldCrossLevelBoundary(
  currentXp: number,
  xpToAdd: number,
): { crosses: boolean; currentLevel: number; projectedLevel: number } {
  const projectedXp = currentXp + xpToAdd;
  const currentLevel = calculateLevelFromXP(currentXp);
  const projectedLevel = calculateLevelFromXP(projectedXp);
  return {
    crosses: projectedLevel > currentLevel,
    currentLevel,
    projectedLevel,
  };
}

function capXpBelowThreshold(
  currentXp: number,
  currentLevel: number,
): { cappedXp: number; maxReward: number } {
  const thresholdXp = (currentLevel + 1) * CRYSTAL_XP_PER_LEVEL;
  const cappedXp = thresholdXp - 1;
  const maxReward = Math.max(0, cappedXp - currentXp);
  return { cappedXp, maxReward };
}

function applyGating(
  input: TrialXpGateInput,
  capIdle: boolean,
): TrialXpGateResult {
  if (input.currentLevel >= MAX_CRYSTAL_LEVEL) {
    return {
      effectiveReward: input.rawReward,
      wasCapped: false,
      shouldPregenerate: false,
    };
  }

  const { crosses } = wouldCrossLevelBoundary(input.previousXp, input.rawReward);
  const statusGates = trialStatusRequiresXpCapAtLevelBoundary(input.trialStatus);
  const wasCapped =
    crosses && statusGates && (capIdle || input.trialStatus !== 'idle');

  const effectiveReward = wasCapped
    ? capXpBelowThreshold(input.previousXp, input.currentLevel).maxReward
    : input.rawReward;

  // Q7 fix: at boundary-idle with already-maxed XP (e.g. 99), wasCapped is
  // true but effectiveReward is 0. Today's code emits pregeneration in that
  // case via the boundary-cap branch; wasCapped preserves that behavior.
  const shouldPregenerate =
    input.trialStatus === 'idle' &&
    (wasCapped ||
      hasAddedAnyXp(input.previousXp, input.previousXp + effectiveReward));

  return { effectiveReward, wasCapped, shouldPregenerate };
}

/**
 * Study path: caps XP at the level boundary even when the trial is `idle`,
 * so reaching the boundary triggers pregeneration before the player crosses.
 */
export const computeTrialGatedStudyReward = (
  input: TrialXpGateInput,
): TrialXpGateResult => applyGating(input, /* capIdle */ true);

/**
 * Direct path (`addXP`): does NOT cap when the trial is `idle`, matching the
 * historical behavior where direct XP adjustments could cross level boundaries
 * without an active trial.
 */
export const computeTrialGatedDirectReward = (
  input: TrialXpGateInput,
): TrialXpGateResult => applyGating(input, /* capIdle */ false);
