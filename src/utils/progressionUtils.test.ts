import { describe, it, expect } from 'vitest';

import {
  calculateLevelFromXP,
  calculateXPReward,
  filterCardsByDifficulty,
  getTopicUnlockStatus,
  calculateTopicTier,
} from './progressionUtils';
import { ActiveCrystal } from '../types';
import { SubjectGraph, Card } from '../types/core';

function createMockCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'test-card',
    type: 'FLASHCARD',
    difficulty: 1,
    content: {
      front: 'front',
      back: 'back',
    },
    ...overrides,
  };
}

function createMockCards(overrides: Array<Partial<Card>>) {
  return overrides.map((item) => createMockCard(item));
}

const graphFixtures: SubjectGraph[] = [
  {
    subjectId: 'data-science',
    title: 'Data Science',
    themeId: 'default',
    maxTier: 2,
    nodes: [
      { topicId: 'sql-basics', title: 'SQL Basics', tier: 1, prerequisites: [], learningObjective: 'SQL foundation' },
      { topicId: 'machine-learning', title: 'Machine Learning', tier: 2, prerequisites: ['sql-basics'], learningObjective: 'Intro ML' },
    ],
  },
];

const topics = [
  {
    id: 'sql-basics',
    name: 'SQL Basics',
    description: 'Fixture topic',
    subjectId: 'data-science',
    cardIds: ['sql-basics-card'],
    prerequisites: [],
  },
  {
    id: 'machine-learning',
    name: 'Machine Learning',
    description: 'Fixture topic',
    subjectId: 'data-science',
    cardIds: ['machine-learning-card'],
    prerequisites: [{ topicId: 'sql-basics', requiredLevel: 1 }],
  },
];

describe('calculateLevelFromXP', () => {
  it('returns expected level buckets', () => {
    expect(calculateLevelFromXP(0)).toBe(0);
    expect(calculateLevelFromXP(99)).toBe(0);
    expect(calculateLevelFromXP(100)).toBe(1);
    expect(calculateLevelFromXP(199)).toBe(1);
    expect(calculateLevelFromXP(200)).toBe(2);
    expect(calculateLevelFromXP(500)).toBe(5);
  });
});

describe('calculateXPReward', () => {
  it('returns expected flashcard reward', () => {
    expect(calculateXPReward('FLASHCARD', 3)).toBe(10);
    expect(calculateXPReward('FLASHCARD', 1)).toBe(0);
    expect(calculateXPReward('FLASHCARD', 4)).toBe(15);
  });

  it('returns expected single-choice reward', () => {
    expect(calculateXPReward('SINGLE_CHOICE', 3)).toBe(12);
  });

  it('returns expected multi-choice reward', () => {
    expect(calculateXPReward('MULTI_CHOICE', 4)).toBe(22);
  });
});

describe('filterCardsByDifficulty', () => {
  const cards: Card[] = createMockCards([
    { id: 'easy', difficulty: 1 },
    { id: 'medium', difficulty: 2 },
    { id: 'hard', difficulty: 4 },
  ]);

  it('filters by max difficulty', () => {
    expect(filterCardsByDifficulty(cards, 2).map((card) => card.id)).toEqual(['easy', 'medium']);
    expect(filterCardsByDifficulty(cards, 5)).toHaveLength(3);
    expect(filterCardsByDifficulty(cards, 0)).toHaveLength(0);
  });
});

describe('getTopicUnlockStatus', () => {
  const activeCrystals: ActiveCrystal[] = [
    { topicId: 'sql-basics', xp: 50, gridPosition: [0, 0], spawnedAt: Date.now() },
    { topicId: 'machine-learning', xp: 0, gridPosition: [0, 0], spawnedAt: Date.now() },
  ];

  it('unlocks base topic when points available', () => {
    const status = getTopicUnlockStatus('sql-basics', activeCrystals, 1, graphFixtures, topics);
    expect(status.canUnlock).toBe(true);
    expect(status.hasEnoughPoints).toBe(true);
  });

  it('blocks dependent topic without prerequisite level', () => {
    const status = getTopicUnlockStatus('machine-learning', activeCrystals, 1, graphFixtures, topics);
    expect(status.canUnlock).toBe(false);
    expect(status.hasPrerequisites).toBe(false);
    expect(status.missingPrerequisites[0]).toMatchObject({ topicId: 'sql-basics', requiredLevel: 1, currentLevel: 0 });
  });

  it('returns false for unknown topic', () => {
    const status = getTopicUnlockStatus('unknown-topic', activeCrystals, 1, graphFixtures, topics);
    expect(status.canUnlock).toBe(false);
    expect(status.hasEnoughPoints).toBe(false);
  });
});

describe('calculateTopicTier', () => {
  it('calculates recursive topic tier', () => {
    expect(calculateTopicTier('sql-basics', graphFixtures)).toBe(1);
    expect(calculateTopicTier('machine-learning', graphFixtures)).toBe(2);
  });
});
