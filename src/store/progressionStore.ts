/**
 * Study Store - State Management Layer
 *
 * Responsibilities:
 * - Zustand store definition and state management
 * - Coordinates data from deckProvider with game logic from utilities
 * - Handles state mutations only - delegates business logic to utilities
 *
 * Layer Architecture:
 * [Data Layer: deckProvider] → [Game Logic: progressionUtils] → [Store]
 * [Grid Layer: gridUtils] ─────────────────────────────────────────→ [Store]
 *
 * The store imports extracted utilities and handles ONLY state mutations.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { StudyStore, Rating, ActiveCrystal } from '../types';
import { SM2Data, normalizeSM2State, sm2 } from '../utils/sm2';
import { uiStore } from './uiStore';

// Data Layer imports
import { getDeckData, INITIAL_UNLOCK_POINTS, ensureDeckData, isDeckDataLoaded } from '../data/deckCatalog';

// Game Logic Layer imports
import {
  getTopicUnlockStatus,
  calculateTopicTier,
  calculateLevelFromXP,
  calculateXPReward,
  selectRandomFormat,
  calculateMaxDifficulty,
  filterConceptsByDifficulty,
  getTopicById,
  getTopicsByTier
} from '../utils/progressionUtils';

// Grid Algorithms Layer imports
import {
  findNextGridPosition,
  calculateSpawnPosition
} from '../utils/gridUtils';

type LegacySm2Map = Record<string, SM2Data>;

function convertSM2DataToLegacyFormat(sm2Data: SM2Data): {
  interval: number;
  ease: number;
  repetitions: number;
  dueDate: string;
} {
  return {
    interval: sm2Data.interval,
    ease: sm2Data.easeFactor,
    repetitions: sm2Data.repetitions,
    dueDate: new Date(sm2Data.nextReview).toISOString(),
  };
}

function enrichConceptWithSm2<T extends { id: string; sm2: any }>(concept: T, sm2Data: LegacySm2Map): T {
  const mapped = sm2Data[concept.id];
  if (!mapped) return concept;
  return {
    ...concept,
    sm2: normalizeSM2State(mapped),
  };
}

function enrichConceptList<T extends { id: string; sm2: any }>(concepts: T[], sm2Data: LegacySm2Map): T[] {
  return concepts.map((concept) => enrichConceptWithSm2(concept, sm2Data));
}

function buildSm2Map(concepts: { id: string; sm2: any }[]): LegacySm2Map {
  return concepts.reduce((acc, concept) => {
    acc[concept.id] = normalizeSM2State(concept.sm2);
    return acc;
  }, {} as LegacySm2Map);
}

function buildBootstrappedSm2Data(
  concepts: StudyStore['concepts'],
  previousSm2Data: Record<string, SM2Data>,
): Record<string, SM2Data> {
  const fallbackSm2Data = buildSm2Map(concepts);

  return concepts.reduce((acc, concept) => {
    const persisted = previousSm2Data[concept.id];
    acc[concept.id] = persisted ? normalizeSM2State(persisted) : fallbackSm2Data[concept.id];
    return acc;
  }, {} as Record<string, SM2Data>);
}

function getUniqueTopicIds(topicIds: string[]): string[] {
  return Array.from(new Set(topicIds.filter(Boolean)));
}

function resolveStartupTopicState(
  deckTopicIds: string[],
  activeCrystals: ActiveCrystal[],
  unlockedTopics: string[],
  lockedTopics: string[],
): {
  unlockedTopics: string[];
  lockedTopics: string[];
} {
  const knownTopics = getUniqueTopicIds(deckTopicIds);
  const crystalTopics = getUniqueTopicIds(activeCrystals.map((crystal) => crystal.topicId)).filter(topicId => knownTopics.includes(topicId));
  const explicitUnlocked = getUniqueTopicIds(unlockedTopics).filter(topicId => knownTopics.includes(topicId));
  const explicitLocked = getUniqueTopicIds(lockedTopics).filter(topicId => knownTopics.includes(topicId));

  if (explicitUnlocked.length > 0) {
    return {
      unlockedTopics: explicitUnlocked,
      lockedTopics: knownTopics.filter(topicId => !explicitUnlocked.includes(topicId)),
    };
  }

  if (explicitLocked.length > 0) {
    return {
      unlockedTopics: knownTopics.filter(topicId => !explicitLocked.includes(topicId)),
      lockedTopics: explicitLocked,
    };
  }

  if (crystalTopics.length > 0) {
    return {
      unlockedTopics: crystalTopics,
      lockedTopics: knownTopics.filter(topicId => !crystalTopics.includes(topicId)),
    };
  }

  return {
    unlockedTopics: [],
    lockedTopics: knownTopics,
  };
}

function getDueCardsFromConcepts(
  concepts: StudyStore['concepts'],
  sm2Data: Record<string, SM2Data>,
): number {
  const now = Date.now();
  return concepts.reduce((count, concept) => {
    const rawSm2 = sm2Data[concept.id] ?? concept.sm2;
    if (!rawSm2) return count;
    return normalizeSM2State(rawSm2).nextReview <= now ? count + 1 : count;
  }, 0);
}

export interface ProgressionState {
  concepts: StudyStore['concepts'];
  currentConcept: StudyStore['currentConcept'];
  currentFormat: StudyStore['currentFormat'];
  isConceptFlipped: boolean;
  studyQueue: StudyStore['studyQueue'];
  unlockedTopics: string[];
  lockedTopics: string[];
  sm2Data: Record<string, SM2Data>;
  activeCrystals: StudyStore['activeCrystals'];
  currentSubjectId: string | null;
  currentTopic: string | null;
  levelUpMessage: string | null;
  currentTopicTheory: string | null;
  unlockPoints: number;
}

export interface ProgressionActions {
  loadDeck: StudyStore['loadDeck'];
  flipConcept: StudyStore['flipConcept'];
  submitStudyResult: StudyStore['submitStudyResult'];
  spawnCrystal: StudyStore['spawnCrystal'];
  getNextAvailableGridPosition: StudyStore['getNextAvailableGridPosition'];
  initialize: StudyStore['initialize'];
  recalculateFromConcepts: StudyStore['recalculateFromConcepts'];
  unlockTopic: StudyStore['unlockTopic'];
  getTopicUnlockStatus: StudyStore['getTopicUnlockStatus'];
  getTopicTier: StudyStore['getTopicTier'];
  getTopicsByTier: StudyStore['getTopicsByTier'];
  startTopicStudySession: StudyStore['startTopicStudySession'];
  setCurrentSubject: StudyStore['setCurrentSubject'];
  addXP: (topicId: string, xp: number) => number;
  updateSM2: (cardId: string, sm2State: SM2Data) => void;
  getSM2Data: (cardId: string) => SM2Data | undefined;
  getDueCardsCount: () => number;
  getTotalCardsCount: () => number;
}

export type ProgressionStore = ProgressionState & ProgressionActions;

/**
 * Create the Zustand store with persistence
 */
export const useProgressionStore = create<ProgressionStore>()(
  persist(
    (set, get) => ({
      // State
      concepts: [],
      currentConcept: null,
      currentFormat: null,
      isConceptFlipped: false,
      studyQueue: [],
      unlockedTopics: [],
      lockedTopics: [],
      sm2Data: {},
      activeCrystals: [],
      currentSubjectId: null,
      currentTopic: null,
      levelUpMessage: null,
      currentTopicTheory: null,
      unlockPoints: 0,

      /**
       * Load a deck of concepts into the store
       * Also initializes all topics as locked
       * Explicit reset/import path - used by the manual Load Default Deck action.
       */
      loadDeck: (deck) => {
        let concepts: any[];

        // Use concepts from the deck directly
        if (deck.concepts && deck.concepts.length > 0) {
          concepts = deck.concepts.map(concept => ({
            ...concept,
            id: concept.id || `concept-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            topicId: concept.topicId || '',
            difficulty: concept.difficulty || 1,
            sm2: {
              interval: concept.sm2?.interval ?? 0,
              ease: concept.sm2?.ease ?? 2.5,
              repetitions: concept.sm2?.repetitions ?? 0,
              dueDate: concept.sm2?.dueDate ?? new Date().toISOString(),
            },
            formats: concept.formats || [],
          }));
        } else {
          concepts = [];
        }

        const sm2Data = buildSm2Map(concepts);
        const conceptsWithSm2 = enrichConceptList(concepts, sm2Data);

        // Get all topic IDs from the deck
        const allTopicIds = deck.topics?.map(t => t.id) || [];

        // ALL topics start as locked - player must unlock them using unlock points
        const lockedTopicsInitial = allTopicIds;
        const unlockedTopics = allTopicIds.length === 0 ? [] : [];

        // Give player initial unlock points
        const initialUnlockPoints = INITIAL_UNLOCK_POINTS;

        // Get due concepts for study queue using SM2 service
        const dueConcepts = sm2.getDueConcepts(conceptsWithSm2 as StudyStore['concepts']);

        // Select a random format for the first concept
        const firstConcept = dueConcepts.length > 0 ? dueConcepts[0] : null;
        const selectedFormat = firstConcept ? selectRandomFormat(firstConcept) : null;

        set({
          concepts,
          studyQueue: dueConcepts,
          currentConcept: firstConcept,
          currentFormat: selectedFormat,
          isConceptFlipped: false,
          // All topics are locked initially
          unlockedTopics,
          sm2Data,
          lockedTopics: lockedTopicsInitial,
          activeCrystals: [],
          currentSubjectId: null,
          currentTopic: null,
          unlockPoints: initialUnlockPoints,
        });
      },

      /**
       * Toggle concept flip state (for flashcards)
       */
      flipConcept: () => {
        set(state => ({ isConceptFlipped: !state.isConceptFlipped }));
      },

      /**
       * Submit study result and update SM-2 values
       * Handles both self-rated (flashcard) and auto-graded (choice) questions
       *
       * @param conceptId - The concept that was studied
       * @param isCorrect - Whether the answer was correct (for auto-graded)
       * @param selfRating - The self-rating 1-4 (for flashcards)
       */
      submitStudyResult: (conceptId: string, isCorrect?: boolean, selfRating?: Rating) => {
        const { currentConcept, concepts, studyQueue, activeCrystals, currentFormat, sm2Data } = get();

        if (!currentConcept || currentConcept.id !== conceptId) return;

        // Determine the rating to use
        let rating: Rating;

        if (selfRating !== undefined) {
          // Self-rated (flashcard): use the rating directly
          rating = selfRating;
        } else if (isCorrect !== undefined) {
          // Auto-graded: map isCorrect to rating
          // Correct = "Good" (3) or "Easy" (4), Incorrect = "Again" (1)
          rating = isCorrect ? 3 : 1;
        } else {
          // Default to "Good" if neither is provided
          rating = 3;
        }

        // Calculate new SM-2 values using encapsulated service
        const newSM2 = sm2.calculateNextReviewForConcept(currentConcept, rating);
        const updatedSm2Data = {
          ...sm2Data,
          [currentConcept.id]: newSM2,
        };

        const conceptsWithSm2 = enrichConceptList(concepts, updatedSm2Data);

        // Update the concept in the concepts array
        const updatedConcepts = conceptsWithSm2.map(concept =>
          concept.id === currentConcept.id
            ? { ...concept, sm2: convertSM2DataToLegacyFormat(newSM2) }
            : concept
        );

        // Remove current concept from study queue
        const newStudyQueue = studyQueue.filter(concept => concept.id !== currentConcept.id);

        // Check if this concept should be re-added to queue (if rating < 3, review again later)
        let newStudyQueueAdjusted = newStudyQueue;
        if (rating < 3) {
          // Add to END of queue (not front) so user can review other concepts first
          // Only re-add if there are other concepts to review
          if (newStudyQueue.length > 0) {
            const reviewedConcept = { ...currentConcept, sm2: convertSM2DataToLegacyFormat(newSM2) };
            newStudyQueueAdjusted = [...newStudyQueue, reviewedConcept];
          } else {
            // If no other concepts, keep the failed concept but set a flag to review later
            const reviewedConcept = { ...currentConcept, sm2: convertSM2DataToLegacyFormat(newSM2) };
            newStudyQueueAdjusted = [reviewedConcept];
          }
        }

        // Update topic levels in active crystals and check for level up
        const topicId = currentConcept.topicId;
        let newActiveCrystals = activeCrystals;
        let newLevelUpMessage: string | null = null;
        let newUnlockPoints = get().unlockPoints ?? 0;

        if (topicId) {
          // Get the old crystal (if exists) with its XP
          const oldCrystal = activeCrystals.find(c => c.topicId === topicId);
          const oldXP = oldCrystal?.xp ?? 0;
          const oldLevel = calculateLevelFromXP(oldXP);

          // Calculate XP reward based on format type and rating
          const xpReward = calculateXPReward(currentFormat?.type, rating);
          const newXP = oldXP + xpReward;
          const newLevel = calculateLevelFromXP(newXP);

          // Check if level increased
          if (newLevel > oldLevel) {
            newLevelUpMessage = `Level Up! Level ${newLevel} unlocked harder questions!`;
            // Grant 1 unlock point per level up
            newUnlockPoints += (newLevel - oldLevel);
          }

          // Update crystal with new XP
          newActiveCrystals = activeCrystals.map(crystal =>
            crystal.topicId === topicId
              ? { ...crystal, xp: newXP }
              : crystal
          );
        }

        // Get next concept and select a random format
        const queueWithSm2 = enrichConceptList(newStudyQueueAdjusted, updatedSm2Data);
        const nextConcept = queueWithSm2.length > 0 ? queueWithSm2[0] : null;
        const nextFormat = nextConcept ? selectRandomFormat(nextConcept) : null;

        set({
          concepts: updatedConcepts,
          sm2Data: updatedSm2Data,
          studyQueue: queueWithSm2,
          currentConcept: nextConcept,
          currentFormat: nextFormat,
          isConceptFlipped: false,
          activeCrystals: newActiveCrystals,
          levelUpMessage: newLevelUpMessage,
          unlockPoints: newUnlockPoints,
        });

        // Auto-clear level up message after 5 seconds
        if (newLevelUpMessage) {
          setTimeout(() => {
            set({ levelUpMessage: null });
          }, 5000);
        }
      },

      /**
       * Get the next available grid position using spiral outward algorithm
       * Excludes [0,0] where the Wisdom Altar is located
       */
      getNextAvailableGridPosition: (): [number, number] | null => {
        const { activeCrystals } = get();
        return findNextGridPosition(activeCrystals);
      },

      /**
       * Spawn a crystal for a topic at the next available grid position
       * Uses adjacency-based spawning:
       * - If topic has prerequisites: spawn adjacent to the prerequisite's crystal
       * - If no prerequisites (Tier 1): spawn adjacent to the Altar [0,0]
       * Returns the position where crystal was spawned, or null if no space
       */
      spawnCrystal: (topicId: string): [number, number] | null => {
        const { activeCrystals, concepts } = get();

        // Verify topic exists and has concepts
        const topicConcepts = concepts.filter(c => c.topicId === topicId);
        if (topicConcepts.length === 0) return null;

        // Check if crystal for this topic already exists
        const existingCrystal = activeCrystals.find(c => c.topicId === topicId);
        if (existingCrystal) return existingCrystal.gridPosition;

        // Find the topic in defaultDeckData to check for prerequisites
        const topic = getTopicById(topicId);
        const prerequisites = topic?.prerequisites || [];

        // Use grid utility to calculate spawn position
        const position = calculateSpawnPosition(prerequisites, get().activeCrystals);

        if (!position) return null;

        // Start with 0 XP (Level 0)
        const newCrystal: ActiveCrystal = {
          topicId,
          gridPosition: position,
          xp: 0,
          spawnedAt: Date.now(),
        };

        set(state => ({
          activeCrystals: [...state.activeCrystals, newCrystal],
        }));

        return position;
      },

      /**
       * Unlock a topic and spawn its crystal
       * Removes topic from lockedTopics, adds to activeCrystals
       *
       * Prerequisites logic:
       * - If topic has prerequisites: requires unlockPoints > 0 AND all prerequisites met
       * - If topic has no prerequisites: uses answer-based unlock (free)
       *
       * Returns the position where crystal was spawned, or null if no space
       */
      unlockTopic: (topicId: string): [number, number] | null => {
        const { lockedTopics, activeCrystals, unlockPoints } = get();

        // Check if topic is locked
        if (!lockedTopics.includes(topicId)) {
          // Already unlocked, just return position
          const existingCrystal = activeCrystals.find(c => c.topicId === topicId);
          return existingCrystal?.gridPosition || null;
        }

        // Ignore topics that are not fully provisioned in the deck (no content yet)
        const topic = getTopicById(topicId);
        if (!topic || !(topic.conceptIds && topic.conceptIds.length > 0)) {
          console.warn(`Cannot unlock topic ${topicId}: topic content is not available yet`);
          return null;
        }

        // Check unlock status using the game logic utility
        const unlockStatus = getTopicUnlockStatus(topicId, activeCrystals, unlockPoints);

        // ALL locked topics now cost 1 unlock point to unlock
        if (!unlockStatus.hasPrerequisites) {
          console.warn(`Cannot unlock topic ${topicId}: prerequisites not met`);
          return null;
        }

        if (!unlockStatus.hasEnoughPoints) {
          console.warn(`Cannot unlock topic ${topicId}: not enough unlock points`);
          return null;
        }

        // Remove from locked topics
        const newLockedTopics = lockedTopics.filter(id => id !== topicId);
        const newUnlockedTopics = [...get().unlockedTopics, topicId];

        // Spawn the crystal
        const position = get().spawnCrystal(topicId);

        if (position) {
          // Consume 1 unlock point and update locked topics in a single set
          set({
            unlockPoints: unlockPoints - 1,
            lockedTopics: newLockedTopics,
            unlockedTopics: newUnlockedTopics,
          });
        }

        return position;
      },

      /**
       * Get the unlock status for a topic
       * Returns an object with prerequisites info and whether it can be unlocked
       */
      getTopicUnlockStatus: (topicId: string) => {
        const { activeCrystals, unlockPoints } = get();
        return getTopicUnlockStatus(topicId, activeCrystals, unlockPoints);
      },

      /**
       * Get the tier/depth of a topic in the prerequisite tree
       * Tier 1 = no prerequisites
       * Tier 2 = requires Tier 1, etc.
       */
      getTopicTier: (topicId: string) => {
        return calculateTopicTier(topicId);
      },

      /**
       * Get all topics grouped by tier
       * Returns array of tier objects, each containing topics at that depth
       */
      getTopicsByTier: () => {
        const { lockedTopics } = get();

        // Use game logic utility to get base tier data
        const tierData = getTopicsByTier();

        // Override lock status from current store state
        return tierData.map(({ tier, topics }) => ({
          tier,
          topics: topics.map(topic => ({
            ...topic,
            isLocked: lockedTopics.includes(topic.id),
            isUnlocked: !lockedTopics.includes(topic.id),
          })),
        }));
      },

      /**
       * Add XP to a topic crystal, returning the updated XP total
       */
      addXP: (topicId: string, xp: number) => {
        let updatedXp = 0;

        set(state => {
          const existing = state.activeCrystals.find(crystal => crystal.topicId === topicId);
          if (!existing) {
            return { activeCrystals: state.activeCrystals };
          }

          updatedXp = existing.xp + xp;
          const nextCrystals = state.activeCrystals.map(crystal =>
            crystal.topicId === topicId ? { ...crystal, xp: updatedXp } : crystal
          );

          return { activeCrystals: nextCrystals };
        });

        return updatedXp;
      },

      /**
       * Update SM-2 state for a card by ID
       */
      updateSM2: (cardId: string, sm2State: SM2Data) => {
        set(state => ({
          sm2Data: {
            ...state.sm2Data,
            [cardId]: sm2State,
          },
        }));
      },

      /**
       * Get stored SM-2 state for a card
       */
      getSM2Data: (cardId: string) => {
        return get().sm2Data[cardId];
      },

      /**
       * Start a topic-focused study session
       * Filters concepts to only those from the specified topic,
       * applies difficulty gating based on crystal level,
       * sets up the study queue, and opens the study panel modal
       */
      startTopicStudySession: (topicId: string) => {
        const { concepts, activeCrystals, sm2Data } = get();
        const conceptsWithSm2 = enrichConceptList(concepts, sm2Data);

        // Filter concepts for the specified topic
        const topicConcepts = conceptsWithSm2.filter(c => c.topicId === topicId);

        if (topicConcepts.length === 0) {
          console.warn(`No concepts found for topic: ${topicId}`);
          return;
        }

        // Get the crystal's current level for difficulty gating
        const crystal = activeCrystals.find(c => c.topicId === topicId);
        const crystalXP = crystal?.xp ?? 0;
        const crystalLevel = calculateLevelFromXP(crystalXP);

        // Use game logic utility for difficulty gating
        const maxDifficulty = calculateMaxDifficulty(crystalLevel);
        const gatedTopicConcepts = filterConceptsByDifficulty(topicConcepts, maxDifficulty);

        // If no concepts pass the difficulty filter, fall back to available concepts
        const filteredConcepts = gatedTopicConcepts.length > 0 ? gatedTopicConcepts : topicConcepts;

        // Sort by due date (most overdue first) using SM2 service
        const sortedTopicConcepts = sm2.getDueConcepts(filteredConcepts);

        // If no concepts are due, use all filtered concepts for review
        const studyConcepts = sortedTopicConcepts.length > 0 ? sortedTopicConcepts : filteredConcepts;

        // Get the first concept and select a random format
        const firstConcept = studyConcepts.length > 0 ? studyConcepts[0] : null;
        const selectedFormat = firstConcept ? selectRandomFormat(firstConcept) : null;

        // Get the topic's theory text for display
        const topic = getTopicById(topicId);
        const theory = topic?.theory ?? null;

        set({
          studyQueue: studyConcepts,
          currentConcept: firstConcept,
          currentFormat: selectedFormat,
          isConceptFlipped: false,
          currentTopic: topicId,
          currentTopicTheory: theory,
          levelUpMessage: null, // Clear any previous level up message
        });

        // Open the study panel modal
        uiStore.getState().openStudyPanel();
      },

      /**
       * Set the current subject for multi-floor 3D rendering
       * Updates the visual representation based on subject preferences
       */
      setCurrentSubject: (subjectId: string | null) => {
        set({ currentSubjectId: subjectId });
      },

      /**
       * Initialize store - bootstrap runtime concepts when missing
       * while preserving persisted progression state.
       * This should only be called ONCE on client mount
       */
      initialize: () => {
        const bootstrap = () => {
          const {
            concepts,
            activeCrystals,
            unlockedTopics,
            lockedTopics,
            sm2Data,
            unlockPoints,
            currentSubjectId,
          } = get();

          const hasPersistedProgress = activeCrystals.length > 0 ||
            unlockedTopics.length > 0 ||
            lockedTopics.length > 0 ||
            Object.keys(sm2Data).length > 0 ||
            unlockPoints > 0 ||
            currentSubjectId !== null;

          // If no concepts loaded, bootstrap from deck data only (no destructive reset)
          if (concepts.length === 0) {
            const deck = getDeckData() as { concepts?: StudyStore['concepts']; topics?: Array<{ id: string }> };
            const deckConcepts = deck.concepts || [];
            const deckTopicIds = getUniqueTopicIds((deck.topics || []).map(topic => topic.id));
            const availableTopicIds = deckTopicIds.length > 0
              ? deckTopicIds
              : getUniqueTopicIds(deckConcepts.map(concept => concept.topicId));

            if (deckConcepts.length === 0 && availableTopicIds.length === 0) return;

            const allTopicIds = availableTopicIds;
            const nextTopicState = resolveStartupTopicState(
              allTopicIds,
              activeCrystals,
              unlockedTopics,
              lockedTopics,
            );

            const nextSm2Data = buildBootstrappedSm2Data(
              deckConcepts,
              sm2Data,
            );

            set({
              concepts: deckConcepts,
              sm2Data: nextSm2Data,
              unlockedTopics: nextTopicState.unlockedTopics,
              lockedTopics: nextTopicState.lockedTopics,
              unlockPoints: hasPersistedProgress ? unlockPoints : INITIAL_UNLOCK_POINTS,
            });

            get().recalculateFromConcepts();
            return;
          }

          // Preserve existing topic state when concepts already exist (from hydration/reload).
          const deckTopics = (getDeckData()?.topics || []) as Array<{ id: string }>;
          const allTopicIds = getUniqueTopicIds(
            (deckTopics.length > 0
              ? deckTopics
              : concepts
            ).map((topic: any) => topic.id || topic.topicId),
          );
          const nextTopicState = resolveStartupTopicState(allTopicIds, activeCrystals, unlockedTopics, lockedTopics);
          const nextSm2Data = buildBootstrappedSm2Data(concepts, sm2Data);

          set({
            unlockedTopics: nextTopicState.unlockedTopics,
            lockedTopics: nextTopicState.lockedTopics,
            sm2Data: nextSm2Data,
          });

          // If concepts exist (from persistence), recalculate study queue
          get().recalculateFromConcepts();
        };

        if (isDeckDataLoaded()) {
          bootstrap();
          return;
        }

        void ensureDeckData()
          .then(() => {
            bootstrap();
          })
          .catch((error) => {
            console.error('Failed to initialize progression store deck data', error);
            bootstrap();
          });
      },

      /**
       * Get the current number of cards due for review based on persisted SM-2 state.
       * This is the runtime source-of-truth for due-card counts.
       */
      getDueCardsCount: () => {
        const { concepts, sm2Data } = get();
        return getDueCardsFromConcepts(concepts, sm2Data);
      },

      /**
       * Get total cards currently loaded in progression state.
       */
      getTotalCardsCount: () => {
        return get().concepts.length;
      },

      /**
       * Recalculate study queue and topic levels from existing concepts
       * Use this after hydration or when concepts are updated externally
       */
      recalculateFromConcepts: () => {
        const { concepts, activeCrystals, sm2Data } = get();
        const conceptsWithSm2 = enrichConceptList(concepts, sm2Data);

        if (conceptsWithSm2.length === 0) return;

        // Recalculate study queue based on due dates using encapsulated SM2 service
        const dueConcepts = sm2.getDueConcepts(conceptsWithSm2);

        // Get the first concept and select a random format
        const firstConcept = dueConcepts.length > 0 ? dueConcepts[0] : null;
        const selectedFormat = firstConcept ? selectRandomFormat(firstConcept) : null;

        // Keep existing XP values for active crystals (level is calculated dynamically from XP)
        const updatedCrystals = activeCrystals.map(crystal => ({
          ...crystal,
        }));

        set({
          studyQueue: dueConcepts,
          currentConcept: firstConcept,
          currentFormat: selectedFormat,
          isConceptFlipped: false,
          activeCrystals: updatedCrystals,
        });
      },
    }),
    {
      name: 'abyss-engine-storage',
      partialize: (state) => ({
        // Persist progression-only fields
        unlockedTopics: state.unlockedTopics,
        lockedTopics: state.lockedTopics,
        sm2Data: state.sm2Data,
        activeCrystals: state.activeCrystals,
        currentSubjectId: state.currentSubjectId,
        unlockPoints: state.unlockPoints,
      }),
      version: 2,
      migrate: (persistedState: any, version: number) => {
        const persisted = persistedState?.state ? persistedState.state : persistedState;
        if (version >= 2) {
          return persisted;
        }
        if (!persisted || typeof persisted !== 'object') {
          return persisted;
        }

        const { concepts, ...rest } = persisted;
        return rest;
      },
      // onRehydration should be PURE - just return state, no mutations
      // State-changing logic moved to recalculateFromConcepts() action
      onRehydrateStorage: () => (state) => {
        // Just return state - don't do any mutations here
        // This prevents infinite loops during SSR hydration
        return state;
      },
    }
  )
);
