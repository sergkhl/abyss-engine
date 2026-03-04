import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  calculateLevelFromXP,
  calculateXPReward,
  calculateTopicTier,
  filterCardsByDifficulty,
  getTopicUnlockStatus,
  getTopicsByTier,
} from './progressionUtils';
import { defaultSM2, sm2, SM2Data } from '../../utils/sm2';
import { ActiveCrystal, Card } from '../../types/core';
import { INITIAL_UNLOCK_POINTS, Rating } from '../../types/progression';
import { SubjectGraph } from '../../types/core';
import { findNextGridPosition } from '../../utils/gridUtils';

interface StudySessionState {
  topicId: string;
  queueCardIds: string[];
  currentCardId: string | null;
  totalCards: number;
}

interface ProgressionState {
  activeCrystals: ActiveCrystal[];
  sm2Data: Record<string, SM2Data>;
  unlockedTopicIds: string[];
  lockedTopics: string[];
  unlockPoints: number;
  currentSubjectId: string | null;
  currentSession: StudySessionState | null;
  levelUpMessage: string | null;
  isCurrentCardFlipped: boolean;
}

interface ProgressionActions {
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
    subjects: Array<{ id: string; name: string }>,
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
  addXP: (topicId: string, xpAmount: number) => number;
  updateSM2: (cardId: string, sm2State: SM2Data) => void;
  getSM2Data: (cardId: string) => SM2Data | undefined;
}

type ProgressionStore = ProgressionState & ProgressionActions;

interface CardWithSm2 extends Card {
  sm2: SM2Data;
}

function attachSm2(cards: Card[], sm2Map: Record<string, SM2Data>): CardWithSm2[] {
  return cards.map((card) => ({
    ...card,
    sm2: sm2Map[card.id] || defaultSM2,
  }));
}

export const useProgressionStore = create<ProgressionStore>()(
  persist(
    (set, get) => ({
      activeCrystals: [],
      sm2Data: {},
      unlockedTopicIds: [],
      lockedTopics: [],
      unlockPoints: INITIAL_UNLOCK_POINTS,
      currentSubjectId: null,
      currentSession: null,
      levelUpMessage: null,
      isCurrentCardFlipped: false,

      initialize: () => {
        set((state) => ({
          levelUpMessage: state.levelUpMessage || null,
        }));
      },

      setCurrentSubject: (subjectId) => set({ currentSubjectId: subjectId }),

      startTopicStudySession: (topicId, cards) => {
        const state = get();
        const crystal = state.activeCrystals.find((item) => item.topicId === topicId);
        const level = calculateLevelFromXP(crystal?.xp ?? 0);
        const sm2Augmented = attachSm2(cards, state.sm2Data);
        const maxDifficulty = Math.min(level + 1, 4);
        const gatedCards = filterCardsByDifficulty(sm2Augmented, maxDifficulty);
        const dueCards = sm2.getDueCards(gatedCards);
        const queue = (dueCards.length > 0 ? dueCards : gatedCards).map((card) => card.id);

        set({
          currentSession: {
            topicId,
            queueCardIds: queue,
            currentCardId: queue[0] ?? null,
            totalCards: queue.length,
          },
          isCurrentCardFlipped: false,
        });
      },

      submitStudyResult: (cardId, rating) => {
        const state = get();
        const session = state.currentSession;
        if (!session || session.currentCardId !== cardId) {
          return;
        }

        const crystal = state.activeCrystals.find((item) => item.topicId === session.topicId);
        if (!crystal) {
          return;
        }

        const previousSM2 = state.sm2Data[cardId] || defaultSM2;
        const updatedSM2 = sm2.calculateNextReview(previousSM2, rating);
        const reward = calculateXPReward(undefined, rating);
        const xp = crystal.xp + reward;

        const nextQueue = session.queueCardIds.filter((id) => id !== cardId);
        const nextCard = nextQueue[0] ?? null;

        set((current) => ({
          sm2Data: {
            ...current.sm2Data,
            [cardId]: updatedSM2,
          },
          activeCrystals: current.activeCrystals.map((item) =>
            item.topicId === session.topicId
              ? {
                  ...item,
                  xp,
                }
              : item,
          ),
          currentSession: {
            ...session,
            queueCardIds: nextQueue,
            currentCardId: nextCard,
            totalCards: Math.max(session.totalCards - 1, 0),
          },
          isCurrentCardFlipped: false,
        }));
      },

      flipCurrentCard: () => {
        set((state) => ({ isCurrentCardFlipped: !state.isCurrentCardFlipped }));
      },

      unlockTopic: (topicId, allGraphs) => {
        const state = get();
        const existing = state.activeCrystals.find((item) => item.topicId === topicId);
        if (existing) {
          return existing.gridPosition;
        }

        const status = getTopicUnlockStatus(topicId, state.activeCrystals, state.unlockPoints, allGraphs);
        if (!status.canUnlock) {
          return null;
        }

        const nextPosition = findNextGridPosition(state.activeCrystals);
        if (!nextPosition) {
          return null;
        }

        set((current) => ({
          unlockedTopicIds: [...current.unlockedTopicIds, topicId],
          lockedTopics: current.lockedTopics.filter((item) => item !== topicId),
          activeCrystals: [
            ...current.activeCrystals,
            {
              topicId,
              gridPosition: nextPosition,
              xp: 0,
              spawnedAt: Date.now(),
            },
          ],
          unlockPoints: Math.max(0, current.unlockPoints - 1),
          levelUpMessage: `Unlocked topic ${topicId}`,
        }));

        return nextPosition;
      },

      getTopicUnlockStatus: (topicId, allGraphs) => {
        return getTopicUnlockStatus(topicId, get().activeCrystals, get().unlockPoints, allGraphs);
      },

      getTopicTier: (topicId, allGraphs) => {
        return calculateTopicTier(topicId, allGraphs);
      },

      getTopicsByTier: (allGraphs, subjects) => {
        return getTopicsByTier(allGraphs, get().unlockedTopicIds, subjects);
      },

      getDueCardsCount: (cards = []) => {
        const withSm2 = attachSm2(cards as Card[], get().sm2Data);
        return sm2.getDueCards(withSm2).length;
      },

      getTotalCardsCount: (cards = []) => {
        return cards.length;
      },

      addXP: (topicId, xpAmount) => {
        const crystal = get().activeCrystals.find((item) => item.topicId === topicId);
        if (!crystal) {
          return 0;
        }

        const nextXp = crystal.xp + xpAmount;
        set((state) => ({
          activeCrystals: state.activeCrystals.map((item) =>
            item.topicId === topicId
              ? {
                  ...item,
                  xp: nextXp,
                }
              : item,
          ),
        }));
        return nextXp;
      },

      updateSM2: (cardId, sm2State) => {
        set((state) => ({
          sm2Data: {
            ...state.sm2Data,
            [cardId]: sm2State,
          },
        }));
      },

      getSM2Data: (cardId) => {
        return get().sm2Data[cardId];
      },
    }),
    {
      name: 'abyss-progression',
      partialize: (state) => ({
        activeCrystals: state.activeCrystals,
        sm2Data: state.sm2Data,
        unlockedTopicIds: state.unlockedTopicIds,
        lockedTopics: state.lockedTopics,
        unlockPoints: state.unlockPoints,
        currentSubjectId: state.currentSubjectId,
        currentSession: state.currentSession,
      }),
    },
  ),
);
