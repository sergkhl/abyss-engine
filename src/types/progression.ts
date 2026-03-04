import type { ActiveCrystal, Card } from './core';
import type { SubjectGraph } from './core';

export type Rating = 1 | 2 | 3 | 4;

export interface StudySession {
  topicId: string;
  queueCardIds: string[];
  currentCardId: string | null;
  totalCards: number;
}

export interface ProgressionState {
  activeCrystals: ActiveCrystal[];
  sm2Data: Record<string, {
    interval: number;
    easeFactor: number;
    repetitions: number;
    nextReview: number;
  }>;
  unlockedTopicIds: string[];
  lockedTopics: string[];
  unlockPoints: number;
  currentSubjectId: string | null;
  currentSession: StudySession | null;
  levelUpMessage: string | null;
  isCurrentCardFlipped: boolean;
}

export interface ProgressionActions {
  initialize: () => void;
  setCurrentSubject: (subjectId: string | null) => void;
  startTopicStudySession: (topicId: string, cards: Card[]) => void;
  submitStudyResult: (cardId: string, rating: Rating) => void;
  flipCurrentCard: () => void;
  unlockTopic: (topicId: string, allGraphs: SubjectGraph[]) => [number, number] | null;
  getTopicUnlockStatus: (topicId: string, allGraphs: SubjectGraph[]) => {
    canUnlock: boolean;
    hasPrerequisites: boolean;
    hasEnoughPoints: boolean;
    missingPrerequisites: {
      topicId: string;
      topicName: string;
      requiredLevel: number;
      currentLevel: number;
    }[];
  };
  getTopicTier: (topicId: string, allGraphs: SubjectGraph[]) => number;
  getTopicsByTier: (
    allGraphs: SubjectGraph[],
    unlockedTopicIds: string[],
    subjects: { id: string; name: string }[],
    currentSubjectId?: string | null,
  ) => {
    tier: number;
    topics: {
      id: string;
      name: string;
      description: string;
      subjectId: string;
      subjectName: string;
      isContentAvailable: boolean;
      isLocked: boolean;
      isUnlocked: boolean;
    }[];
  }[];
  getDueCardsCount: (cards?: Array<{ id: string }>) => number;
  getTotalCardsCount: (cards?: Array<{ id: string }>) => number;
  addXP: (topicId: string, xp: number) => number;
  updateSM2: (cardId: string, sm2State: {
    interval: number;
    easeFactor: number;
    repetitions: number;
    nextReview: number;
  }) => void;
  getSM2Data: (cardId: string) => {
    interval: number;
    easeFactor: number;
    repetitions: number;
    nextReview: number;
  } | undefined;
}

export interface ProgressionStore extends ProgressionState, ProgressionActions {}

export const INITIAL_UNLOCK_POINTS = 3;
