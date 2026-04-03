import { describe, it, expect } from 'vitest';

import type { Card } from '../../types/core';
import { filterCardsByCardTypes } from './filterCardsByCardTypes';

function card(id: string, type: Card['type']): Card {
  if (type === 'FLASHCARD') {
    return { id, type, difficulty: 1, content: { front: 'f', back: 'b' } };
  }
  if (type === 'SINGLE_CHOICE') {
    return {
      id,
      type,
      difficulty: 1,
      content: { question: 'q', options: ['a'], correctAnswer: 'a', explanation: 'e' },
    };
  }
  if (type === 'MULTI_CHOICE') {
    return {
      id,
      type,
      difficulty: 1,
      content: { question: 'q', options: ['a'], correctAnswers: ['a'], explanation: 'e' },
    };
  }
  return {
    id,
    type: 'MINI_GAME',
    difficulty: 1,
    content: {
      gameType: 'CATEGORY_SORT',
      prompt: 'p',
      categories: [{ id: 'c1', label: 'C' }],
      items: [{ id: 'i1', label: 'L', categoryId: 'c1' }],
      explanation: 'e',
    },
  };
}

describe('filterCardsByCardTypes', () => {
  it('returns empty array when enabledTypes is empty', () => {
    const cards = [card('a', 'FLASHCARD'), card('b', 'SINGLE_CHOICE')];
    expect(filterCardsByCardTypes(cards, new Set())).toEqual([]);
  });

  it('filters to a single card type', () => {
    const cards = [
      card('f1', 'FLASHCARD'),
      card('s1', 'SINGLE_CHOICE'),
      card('f2', 'FLASHCARD'),
    ];
    expect(filterCardsByCardTypes(cards, new Set(['FLASHCARD']))).toEqual([
      card('f1', 'FLASHCARD'),
      card('f2', 'FLASHCARD'),
    ]);
  });

  it('preserves relative order', () => {
    const cards = [
      card('1', 'MULTI_CHOICE'),
      card('2', 'FLASHCARD'),
      card('3', 'MULTI_CHOICE'),
    ];
    expect(filterCardsByCardTypes(cards, new Set(['MULTI_CHOICE']))).toEqual([
      card('1', 'MULTI_CHOICE'),
      card('3', 'MULTI_CHOICE'),
    ]);
  });

  it('includes all types when set contains all four', () => {
    const cards = [
      card('a', 'FLASHCARD'),
      card('b', 'SINGLE_CHOICE'),
      card('c', 'MULTI_CHOICE'),
      card('d', 'MINI_GAME'),
    ];
    const all = new Set<Card['type']>(['FLASHCARD', 'SINGLE_CHOICE', 'MULTI_CHOICE', 'MINI_GAME']);
    expect(filterCardsByCardTypes(cards, all)).toEqual(cards);
  });
});
