import type { PriorKnowledge, StudyGoal } from '@/types/studyChecklist';

export interface ContentDefaults {
  theoryDepth: 'concise' | 'standard' | 'comprehensive';
  cardMix: {
    flashcardWeight: number;
    choiceWeight: number;
    miniGameWeight: number;
  };
  difficultyBias: 'foundational' | 'balanced' | 'challenging';
}

export const STRATEGY_DEFAULTS: Record<StudyGoal, Record<PriorKnowledge, ContentDefaults>> = {
  curiosity: {
    none: {
      theoryDepth: 'comprehensive',
      difficultyBias: 'foundational',
      cardMix: { flashcardWeight: 0.5, choiceWeight: 0.3, miniGameWeight: 0.2 },
    },
    beginner: {
      theoryDepth: 'comprehensive',
      difficultyBias: 'foundational',
      cardMix: { flashcardWeight: 0.4, choiceWeight: 0.35, miniGameWeight: 0.25 },
    },
    intermediate: {
      theoryDepth: 'standard',
      difficultyBias: 'balanced',
      cardMix: { flashcardWeight: 0.3, choiceWeight: 0.4, miniGameWeight: 0.3 },
    },
    advanced: {
      theoryDepth: 'concise',
      difficultyBias: 'challenging',
      cardMix: { flashcardWeight: 0.2, choiceWeight: 0.4, miniGameWeight: 0.4 },
    },
  },
  'exam-prep': {
    none: {
      theoryDepth: 'standard',
      difficultyBias: 'foundational',
      cardMix: { flashcardWeight: 0.3, choiceWeight: 0.5, miniGameWeight: 0.2 },
    },
    beginner: {
      theoryDepth: 'standard',
      difficultyBias: 'balanced',
      cardMix: { flashcardWeight: 0.25, choiceWeight: 0.5, miniGameWeight: 0.25 },
    },
    intermediate: {
      theoryDepth: 'concise',
      difficultyBias: 'challenging',
      cardMix: { flashcardWeight: 0.2, choiceWeight: 0.5, miniGameWeight: 0.3 },
    },
    advanced: {
      theoryDepth: 'concise',
      difficultyBias: 'challenging',
      cardMix: { flashcardWeight: 0.15, choiceWeight: 0.5, miniGameWeight: 0.35 },
    },
  },
  'career-switch': {
    none: {
      theoryDepth: 'comprehensive',
      difficultyBias: 'foundational',
      cardMix: { flashcardWeight: 0.35, choiceWeight: 0.35, miniGameWeight: 0.3 },
    },
    beginner: {
      theoryDepth: 'standard',
      difficultyBias: 'balanced',
      cardMix: { flashcardWeight: 0.3, choiceWeight: 0.35, miniGameWeight: 0.35 },
    },
    intermediate: {
      theoryDepth: 'standard',
      difficultyBias: 'balanced',
      cardMix: { flashcardWeight: 0.25, choiceWeight: 0.4, miniGameWeight: 0.35 },
    },
    advanced: {
      theoryDepth: 'concise',
      difficultyBias: 'challenging',
      cardMix: { flashcardWeight: 0.2, choiceWeight: 0.4, miniGameWeight: 0.4 },
    },
  },
  refresh: {
    none: {
      theoryDepth: 'standard',
      difficultyBias: 'foundational',
      cardMix: { flashcardWeight: 0.4, choiceWeight: 0.4, miniGameWeight: 0.2 },
    },
    beginner: {
      theoryDepth: 'concise',
      difficultyBias: 'balanced',
      cardMix: { flashcardWeight: 0.35, choiceWeight: 0.4, miniGameWeight: 0.25 },
    },
    intermediate: {
      theoryDepth: 'concise',
      difficultyBias: 'balanced',
      cardMix: { flashcardWeight: 0.3, choiceWeight: 0.4, miniGameWeight: 0.3 },
    },
    advanced: {
      theoryDepth: 'concise',
      difficultyBias: 'challenging',
      cardMix: { flashcardWeight: 0.2, choiceWeight: 0.4, miniGameWeight: 0.4 },
    },
  },
};
