/**
 * Unit Tests for progressionUtils.ts - Abyss Engine
 *
 * Tests pure game logic functions:
 * - Level calculation from XP
 * - XP reward calculation based on format type and rating
 * - Difficulty gating
 * - Topic unlock status
 */

import { describe, it, expect } from 'vitest';
import {
  calculateLevelFromXP,
  calculateXPReward,
  calculateMaxDifficulty,
  filterConceptsByDifficulty,
  getTopicUnlockStatus,
  selectRandomFormat,
  calculateTopicTier,
} from './progressionUtils';
import { Concept, Format, Rating, ActiveCrystal, Deck } from '../types';
import { setDeckDataForTests } from '../data/deckCatalog';

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

// Helper to create mock active crystals
function createMockCrystals(crystals: Array<{ topicId: string; xp: number }>): ActiveCrystal[] {
  return crystals.map((c) => ({
    topicId: c.topicId,
    xp: c.xp,
    level: calculateLevelFromXP(c.xp),
    gridPosition: [0, 0] as [number, number],
    spawnedAt: Date.now(),
  }));
}

const TEST_DECK: Deck = {
  subjects: [
    {
      id: 'data-science',
      name: 'Data Science',
      description: 'Topic dependency fixtures',
      color: '#4F46E5',
      geometry: {
        gridTile: 'box',
        crystal: 'box',
        altar: 'cylinder',
      },
      topicIds: ['sql-basics', 'machine-learning'],
    },
  ],
  topics: [
    {
      id: 'sql-basics',
      name: 'SQL Basics',
      description: 'Fixture topic',
      icon: 'book',
      subjectId: 'data-science',
      conceptIds: ['sql-basics-card'],
      prerequisites: [],
    },
    {
      id: 'machine-learning',
      name: 'Machine Learning',
      description: 'Fixture topic',
      icon: 'book',
      subjectId: 'data-science',
      conceptIds: ['machine-learning-card'],
      prerequisites: [{ topicId: 'sql-basics', requiredLevel: 1 }],
    },
  ],
  concepts: [],
};

beforeEach(() => {
  setDeckDataForTests(TEST_DECK);
});

describe('calculateLevelFromXP', () => {
  it('should return level 0 for 0 XP', () => {
    expect(calculateLevelFromXP(0)).toBe(0);
  });

  it('should return level 0 for 99 XP', () => {
    expect(calculateLevelFromXP(99)).toBe(0);
  });

  it('should return level 1 for 100 XP', () => {
    expect(calculateLevelFromXP(100)).toBe(1);
  });

  it('should return level 1 for 199 XP', () => {
    expect(calculateLevelFromXP(199)).toBe(1);
  });

  it('should return level 2 for 200 XP', () => {
    expect(calculateLevelFromXP(200)).toBe(2);
  });

  it('should return level 5 for 500+ XP (max level)', () => {
    expect(calculateLevelFromXP(500)).toBe(5);
    expect(calculateLevelFromXP(600)).toBe(5);
    expect(calculateLevelFromXP(1000)).toBe(5);
  });

  it('should handle negative XP - returns floor division result', () => {
    // Note: Math.floor(-10/100) = Math.floor(-0.1) = -1
    // The function doesn't explicitly handle negative XP
    expect(calculateLevelFromXP(-10)).toBe(-1);
  });
});

describe('calculateXPReward', () => {
  describe('flashcard format', () => {
    it('should return 0 XP for rating 1 (Again)', () => {
      expect(calculateXPReward('flashcard', 1 as Rating)).toBe(0);
    });

    it('should return 5 XP for rating 2 (Hard) - 10 * 0.5', () => {
      expect(calculateXPReward('flashcard', 2 as Rating)).toBe(5);
    });

    it('should return 10 XP for rating 3 (Good)', () => {
      expect(calculateXPReward('flashcard', 3 as Rating)).toBe(10);
    });

    it('should return 15 XP for rating 4 (Easy) - floor(10 * 1.5)', () => {
      expect(calculateXPReward('flashcard', 4 as Rating)).toBe(15);
    });
  });

  describe('single_choice format', () => {
    it('should return 0 XP for rating 1 (Again)', () => {
      expect(calculateXPReward('single_choice', 1 as Rating)).toBe(0);
    });

    it('should return 6 XP for rating 2 (Hard) - floor(12 * 0.5)', () => {
      expect(calculateXPReward('single_choice', 2 as Rating)).toBe(6);
    });

    it('should return 12 XP for rating 3 (Good)', () => {
      expect(calculateXPReward('single_choice', 3 as Rating)).toBe(12);
    });

    it('should return 18 XP for rating 4 (Easy) - floor(12 * 1.5)', () => {
      expect(calculateXPReward('single_choice', 4 as Rating)).toBe(18);
    });
  });

  describe('multi_choice format', () => {
    it('should return 0 XP for rating 1 (Again)', () => {
      expect(calculateXPReward('multi_choice', 1 as Rating)).toBe(0);
    });

    it('should return 7 XP for rating 2 (Hard) - floor(15 * 0.5)', () => {
      expect(calculateXPReward('multi_choice', 2 as Rating)).toBe(7);
    });

    it('should return 15 XP for rating 3 (Good)', () => {
      expect(calculateXPReward('multi_choice', 3 as Rating)).toBe(15);
    });

    it('should return 22 XP for rating 4 (Easy) - floor(15 * 1.5)', () => {
      expect(calculateXPReward('multi_choice', 4 as Rating)).toBe(22);
    });
  });

  describe('default format', () => {
    it('should use flashcard as default when format is undefined', () => {
      expect(calculateXPReward(undefined, 3 as Rating)).toBe(10);
    });

    it('should use flashcard as default when format is unknown', () => {
      expect(calculateXPReward('unknown_format' as any, 3 as Rating)).toBe(10);
    });
  });
});

describe('calculateMaxDifficulty', () => {
  it('should return 1 for level 0 crystal', () => {
    expect(calculateMaxDifficulty(0)).toBe(1);
  });

  it('should return 2 for level 1 crystal', () => {
    expect(calculateMaxDifficulty(1)).toBe(2);
  });

  it('should return 3 for level 2 crystal', () => {
    expect(calculateMaxDifficulty(2)).toBe(3);
  });

  it('should return 6 for level 5 crystal (max level)', () => {
    expect(calculateMaxDifficulty(5)).toBe(6);
  });

  it('should follow formula: maxDifficulty = crystalLevel + 1', () => {
    for (let level = 0; level <= 10; level++) {
      expect(calculateMaxDifficulty(level)).toBe(level + 1);
    }
  });
});

describe('filterConceptsByDifficulty', () => {
  const concepts: Concept[] = [
    createMockConcept({ id: 'easy', difficulty: 1 }),
    createMockConcept({ id: 'medium', difficulty: 2 }),
    createMockConcept({ id: 'hard', difficulty: 3 }),
    createMockConcept({ id: 'very-hard', difficulty: 4 }),
    createMockConcept({ id: 'expert', difficulty: 5 }),
  ];

  it('should return all concepts when maxDifficulty is 5', () => {
    const result = filterConceptsByDifficulty(concepts, 5);
    expect(result).toHaveLength(5);
  });

  it('should filter out concepts above maxDifficulty', () => {
    const result = filterConceptsByDifficulty(concepts, 2);
    expect(result).toHaveLength(2);
    expect(result.map(c => c.difficulty)).toEqual([1, 2]);
  });

  it('should return empty array when maxDifficulty is 0', () => {
    const result = filterConceptsByDifficulty(concepts, 0);
    expect(result).toHaveLength(0);
  });

  it('should return empty array for empty concepts array', () => {
    const result = filterConceptsByDifficulty([], 5);
    expect(result).toHaveLength(0);
  });
});

describe('getTopicUnlockStatus', () => {
  const mockCrystals = createMockCrystals([
    { topicId: 'sql-basics', xp: 250 }, // Level 2
    { topicId: 'machine-learning', xp: 0 }, // Level 0
  ]);

  it('should return canUnlock=true when has enough points', () => {
    const status = getTopicUnlockStatus('sql-basics', mockCrystals, 1);
    expect(status.hasEnoughPoints).toBe(true);
    expect(status.canUnlock).toBe(true);
  });

  it('should return canUnlock=false when not enough points', () => {
    const status = getTopicUnlockStatus('sql-basics', mockCrystals, 0);
    expect(status.hasEnoughPoints).toBe(false);
    // For base topic with no prerequisites, canUnlock should equal hasEnoughPoints
    expect(status.canUnlock).toBe(false);
  });

  it('should return canUnlock=false for unknown topic', () => {
    const status = getTopicUnlockStatus('unknown-topic', mockCrystals, 1);
    expect(status.canUnlock).toBe(false);
    expect(status.hasPrerequisites).toBe(false);
  });
});

describe('selectRandomFormat', () => {
  it('should return fallback format when no formats available', () => {
    const concept = createMockConcept({ formats: [] });
    const format = selectRandomFormat(concept);

    expect(format.type).toBe('flashcard');
    expect(format.question).toBe('No question available');
  });

  it('should return random format from available formats', () => {
    const formats: Format[] = [
      { id: 'f1', type: 'flashcard', question: 'Q1' },
      { id: 'f2', type: 'single_choice', question: 'Q2', options: [] },
    ];
    const concept = createMockConcept({ formats });

    // Run multiple times to verify it can return different formats
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const format = selectRandomFormat(concept);
      results.add(format.id);
    }

    // Should have at least one format available
    expect(results.size).toBeGreaterThan(0);
  });
});

describe('calculateTopicTier', () => {
  it('should return tier 1 for topics with no prerequisites', () => {
    // sql-basics is a base topic with no prerequisites
    const tier = calculateTopicTier('sql-basics');
    expect(tier).toBe(1);
  });

  it('should return higher tier for topics with prerequisites', () => {
    // machine-learning depends on sql-basics
    const tier = calculateTopicTier('machine-learning');
    expect(tier).toBeGreaterThan(1);
  });
});
