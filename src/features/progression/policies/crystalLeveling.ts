import type { ActiveCrystal, TopicRef } from '@/types/core';
import type { Rating } from '@/types/progression';
import {
	CRYSTAL_XP_PER_LEVEL,
	MAX_CRYSTAL_LEVEL,
	calculateLevelFromXP,
} from '@/types/crystalLevel';

/**
 * Result of applying an XP delta to one topic's crystal. Used by the study
 * orchestrator and `addXP` direct path so unlock-point grants stay consistent
 * across both XP entry points.
 */
export interface CrystalXpDeltaResult {
	nextXp: number;
	previousLevel: number;
	nextLevel: number;
	/** `nextLevel - previousLevel`; positive when unlock points should be granted. */
	levelsGained: number;
	nextActiveCrystals: ActiveCrystal[];
}

/**
 * Applies `xpDelta` to the crystal for `ref` in `activeCrystals` (total XP
 * clamped at 0). Returns null if no matching crystal exists.
 *
 * Pure function: input arrays are not mutated; a new `nextActiveCrystals`
 * array is returned with the updated entry.
 */
export function applyCrystalXpDelta(
	activeCrystals: ActiveCrystal[],
	ref: TopicRef,
	xpDelta: number,
): CrystalXpDeltaResult | null {
	const crystal = activeCrystals.find(
		(item) => item.subjectId === ref.subjectId && item.topicId === ref.topicId,
	);
	if (!crystal) {
		return null;
	}

	const previousXp = crystal.xp;
	const nextXp = Math.max(0, previousXp + xpDelta);
	const previousLevel = calculateLevelFromXP(previousXp);
	const nextLevel = calculateLevelFromXP(nextXp);
	const levelsGained = nextLevel - previousLevel;
	const nextActiveCrystals = activeCrystals.map((item) =>
		item.subjectId === ref.subjectId && item.topicId === ref.topicId
			? { ...item, xp: nextXp }
			: item,
	);

	return {
		nextXp,
		previousLevel,
		nextLevel,
		levelsGained,
		nextActiveCrystals,
	};
}

export interface CrystalLevelProgressToNext {
	level: number;
	/** 0–100 for the `Progress` UI; 100 when `isMax`. */
	progressPercent: number;
	isMax: boolean;
	/** Total XP after clamping negatives to 0 (same basis as level math). */
	totalXp: number;
}

/** XP left to reach the next band boundary (e.g. 50 → 50, 99 → 1). */
export function getXpToNextBandThreshold(xp: number): number {
	const safeXp = Math.max(0, xp);
	const level = calculateLevelFromXP(safeXp);

	if (level >= MAX_CRYSTAL_LEVEL) {
		return 0;
	}

	const nextThreshold = (level + 1) * CRYSTAL_XP_PER_LEVEL;
	return Math.max(0, nextThreshold - safeXp);
}

/** Progress within the current level band toward the next level (or max). */
export function getCrystalLevelProgressToNext(xp: number): CrystalLevelProgressToNext {
	const safeXp = Math.max(0, xp);
	const level = calculateLevelFromXP(safeXp);
	if (level >= MAX_CRYSTAL_LEVEL) {
		return { level, progressPercent: 100, isMax: true, totalXp: safeXp };
	}
	const xpIntoLevel = safeXp - level * CRYSTAL_XP_PER_LEVEL;
	const progressPercent = (xpIntoLevel / CRYSTAL_XP_PER_LEVEL) * 100;
	return { level, progressPercent, isMax: false, totalXp: safeXp };
}

/** Base XP reward for a card type, scaled by SM-2 rating (1–4). */
export function calculateXPReward(
	formatType: string | undefined,
	rating: Rating = 3,
): number {
	let baseXP: number;

	switch (formatType) {
		case 'single_choice':
		case 'single-choice':
		case 'SINGLE_CHOICE':
			baseXP = 12;
			break;
		case 'multi_choice':
		case 'multi-choice':
		case 'MULTI_CHOICE':
			baseXP = 15;
			break;
		case 'mini_game':
		case 'MINI_GAME':
			baseXP = 20;
			break;
		case 'flashcard':
		case 'FLASHCARD':
		default:
			baseXP = 10;
			break;
	}

	switch (rating) {
		case 1:
			return 0;
		case 2:
			return Math.floor(baseXP * 0.5);
		case 3:
			return baseXP;
		case 4:
			return Math.floor(baseXP * 1.5);
		default:
			return baseXP;
	}
}
