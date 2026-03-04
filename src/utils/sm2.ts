import { Rating } from '../types';

export interface SM2Data {
  interval: number;
  easeFactor: number;
  repetitions: number;
  nextReview: number;
}

export interface LegacySM2Data {
  interval: number;
  ease: number;
  repetitions: number;
  dueDate: string;
}

export type AnySM2Data = SM2Data | LegacySM2Data;

/**
 * Rating labels for UI display
 */
export const RATING_LABELS: Record<Rating, string> = {
  1: 'Again',
  2: 'Hard',
  3: 'Good',
  4: 'Easy',
};

/**
 * Rating colors for UI display
 */
export const RATING_COLORS: Record<Rating, string> = {
  1: '#ef4444', // red-500
  2: '#f97316', // orange-500
  3: '#22c55e', // green-500
  4: '#3b82f6', // blue-500
};

const MIN_EASE = 1.3;

export function getRatingLabel(rating: Rating): string {
  return RATING_LABELS[rating] || 'Unknown';
}

export function getRatingColor(rating: Rating): string {
  return RATING_COLORS[rating] || '#6b7280';
}

export function normalizeSM2State(sm2: AnySM2Data): SM2Data {
  if ('nextReview' in sm2) {
    return sm2;
  }

  return {
    interval: sm2.interval,
    easeFactor: sm2.ease,
    repetitions: sm2.repetitions,
    nextReview: new Date(sm2.dueDate).getTime(),
  };
}

export const defaultSM2: SM2Data = {
  interval: 0,
  easeFactor: 2.5,
  repetitions: 0,
  nextReview: Date.now(),
};

export function calculateNextReview(
  stateOrConcept: AnySM2Data | { sm2: AnySM2Data },
  rating: Rating,
): SM2Data {
  const state = 'sm2' in stateOrConcept ? stateOrConcept.sm2 : stateOrConcept;
  const current = normalizeSM2State(state);
  const { interval: prevInterval, easeFactor: prevEase, repetitions: prevReps } = current;

  let newInterval: number;
  let newEase: number;
  let newRepetitions: number;

  const q = rating + 1;
  newEase = prevEase + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  newEase = Math.max(MIN_EASE, newEase);

  if (rating >= 3) {
    if (prevReps === 0) {
      newInterval = 1;
    } else if (prevReps === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(prevInterval * newEase);
    }
    newRepetitions = rating === 4 ? prevReps + 2 : prevReps + 1;
  } else {
    newInterval = 1;
    newRepetitions = 0;
  }

  return {
    interval: newInterval,
    easeFactor: newEase,
    repetitions: newRepetitions,
    nextReview: Date.now() + newInterval * 24 * 60 * 60 * 1000,
  };
}

export function calculateNextReviewForConcept(
  concept: { sm2: AnySM2Data },
  rating: Rating,
): SM2Data {
  return calculateNextReview(concept.sm2, rating);
}

function isDue(sm2Data: AnySM2Data): boolean {
  const now = Date.now();
  return normalizeSM2State(sm2Data).nextReview <= now;
}

export function getDueConcepts<T extends { id: string; sm2: AnySM2Data }>(concepts: T[]): T[] {
  return concepts.filter((concept) => isDue(concept.sm2));
}

export function getDueCards<T extends { id: string; sm2: AnySM2Data }>(cards: T[]): T[] {
  return getDueConcepts(cards);
}

export const sm2 = {
  getDueConcepts,
  getDueCards,
  calculateNextReviewForConcept,
  calculateNextReview,
  normalizeSM2State,
};
