/**
 * Unit Tests for sm2.ts - Abyss Engine
 *
 * Tests the simplified SM-2 spaced repetition algorithm functions
 */

import { describe, it, expect } from 'vitest';
import {
  calculateNextReview,
  calculateNextReviewForConcept,
  getDueConcepts,
  SM2Data,
} from './sm2';
import { Concept, Rating } from '../types';

// Helper to create a mock concept
function createMockConcept(overrides: Partial<Concept> = {}): Concept {
  return {
    id: 'test-concept',
    topicId: 'test-topic',
    difficulty: 1,
    formats: [],
    sm2: {
      interval: 0,
      ease: 2.5,
      repetitions: 0,
      dueDate: new Date().toISOString(),
    },
    ...overrides,
  };
}

// Helper to create a concept with specific SM2 values
function createConceptWithSM2(
  sm2Values: {
    interval?: number;
    ease?: number;
    repetitions?: number;
    dueDate?: string;
  } = {},
  overrides: Partial<Concept> = {}
): Concept {
  return createMockConcept({
    sm2: {
      interval: sm2Values.interval ?? 0,
      ease: sm2Values.ease ?? 2.5,
      repetitions: sm2Values.repetitions ?? 0,
      dueDate: sm2Values.dueDate ?? new Date().toISOString(),
    },
    ...overrides,
  });
}

describe('calculateNextReview', () => {
  it('should reset interval and repetitions on rating 1 (Again)', () => {
    const concept = createConceptWithSM2({
      interval: 10,
      ease: 2.5,
      repetitions: 5,
    });

    const result = calculateNextReview(concept, 1 as Rating);

    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(0);
  });

  it('should reset interval and repetitions on rating 2 (Hard)', () => {
    const concept = createConceptWithSM2({
      interval: 10,
      ease: 2.5,
      repetitions: 5,
    });

    const result = calculateNextReview(concept, 2 as Rating);

    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(0);
  });

  it('should set interval to 1 on first successful review (rating 3)', () => {
    const concept = createConceptWithSM2({
      interval: 0,
      ease: 2.5,
      repetitions: 0,
    });

    const result = calculateNextReview(concept, 3 as Rating);

    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(1);
  });

  it('should set interval to 6 on second successful review (rating 3)', () => {
    const concept = createConceptWithSM2({
      interval: 1,
      ease: 2.5,
      repetitions: 1,
    });

    const result = calculateNextReview(concept, 3 as Rating);

    expect(result.interval).toBe(6);
    expect(result.repetitions).toBe(2);
  });

  it('should multiply interval by ease on subsequent reviews (rating 3)', () => {
    const concept = createConceptWithSM2({
      interval: 6,
      ease: 2.5,
      repetitions: 2,
    });

    const result = calculateNextReview(concept, 3 as Rating);

    expect(result.interval).toBe(15); // 6 * 2.5 = 15
    expect(result.repetitions).toBe(3);
  });

  it('should add 2 repetitions on rating 4 (Easy) instead of 1', () => {
    const concept = createConceptWithSM2({
      interval: 6,
      ease: 2.5,
      repetitions: 2,
    });

    const result = calculateNextReview(concept, 4 as Rating);

    // Rating 4 increases ease (q=5): newEase = 2.5 + 0.1 = 2.6
    // interval = round(6 * 2.6) = 16
    expect(result.interval).toBe(16);
    expect(result.repetitions).toBe(4); // 2 + 2 = 4
  });

  it('should not let ease go below minimum (1.3)', () => {
    const concept = createConceptWithSM2({
      interval: 0,
      ease: 1.3, // Already at minimum
      repetitions: 0,
    });

    const result = calculateNextReview(concept, 2 as Rating);

    expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('should generate valid dueDate', () => {
    const concept = createConceptWithSM2({
      interval: 0,
      ease: 2.5,
      repetitions: 0,
    });

    const result = calculateNextReview(concept, 3 as Rating);

    expect(result.nextReview).toBeDefined();
    expect(result.nextReview).toBeGreaterThan(Date.now());
  });
});

describe('calculateNextReviewForConcept', () => {
  it('should be an alias for calculateNextReview', () => {
    const concept = createConceptWithSM2({
      interval: 6,
      ease: 2.5,
      repetitions: 2,
    });

    const result1 = calculateNextReview(concept, 3 as Rating);
    const result2 = calculateNextReviewForConcept(concept, 3 as Rating);

    expect(result1).toEqual(result2);
  });
});

describe('getDueConcepts', () => {
  it('should return empty array when no concepts are due', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const concepts: Concept[] = [
      createConceptWithSM2(
        { repetitions: 1, dueDate: tomorrow.toISOString() },
        { id: 'not-due' }
      ),
    ];

    expect(getDueConcepts(concepts)).toHaveLength(0);
  });

  it('should return only due concepts', () => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const concepts: Concept[] = [
      createConceptWithSM2(
        { repetitions: 0, dueDate: today.toISOString() },
        { id: 'due' }
      ),
      createConceptWithSM2(
        { repetitions: 1, dueDate: tomorrow.toISOString() },
        { id: 'not-due' }
      ),
    ];

    const result = getDueConcepts(concepts);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('due');
  });

  it('should return true for concept due today', () => {
    const sm2Data: SM2Data = {
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      nextReview: Date.now(),
    };

    // Concept due today should be included
    const concept = createMockConcept({
      sm2: sm2Data,
    });

    expect(getDueConcepts([concept])).toHaveLength(1);
  });

  it('should return true for overdue concept', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const concept = createConceptWithSM2({
      interval: 1,
      ease: 2.5,
      repetitions: 1,
      dueDate: yesterday.toISOString(),
    });

    expect(getDueConcepts([concept])).toHaveLength(1);
  });

  it('should return false for future due date', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const concept = createConceptWithSM2({
      interval: 1,
      ease: 2.5,
      repetitions: 1,
      dueDate: tomorrow.toISOString(),
    });

    expect(getDueConcepts([concept])).toHaveLength(0);
  });
});
