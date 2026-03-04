import { beforeEach, describe, expect, it } from 'vitest';
import { useProgressionStore } from './progressionStore';
import { SM2Data } from '../utils/sm2';
import { Concept } from '../types';
import { getDeckData, INITIAL_UNLOCK_POINTS, setDeckDataForTests } from '../data/deckCatalog';

function createLegacyConcept(id: string, topicId: string, dueDate: string): Concept {
  return {
    id,
    topicId,
    difficulty: 1,
    sm2: {
      interval: 0,
      ease: 2.5,
      repetitions: 0,
      dueDate,
    },
    formats: [],
  };
}

const TEST_DECK = {
  subjects: [
    {
      id: 'data-science',
      name: 'Data Science',
      description: 'Test deck for progression store assertions',
      themeId: 'data-science',
      color: '#4F46E5',
      geometry: {
        gridTile: 'box',
        crystal: 'box',
        altar: 'cylinder',
      },
      topicIds: ['topic-a', 'topic-b'],
    },
  ],
  topics: [
    {
      id: 'topic-a',
      name: 'Topic A',
      description: 'Foundation topic',
      icon: 'book',
      subjectId: 'data-science',
      conceptIds: ['topic-a-card'],
      theory: 'Basics for topic A',
      prerequisites: [],
    },
    {
      id: 'topic-b',
      name: 'Topic B',
      description: 'Depends on topic A',
      icon: 'book',
      subjectId: 'data-science',
      conceptIds: ['topic-b-card'],
      theory: 'Advanced topic B',
      prerequisites: [{ topicId: 'topic-a', requiredLevel: 1 }],
    },
  ],
  concepts: [
    createLegacyConcept('topic-a-card', 'topic-a', new Date('2025-01-01T00:00:00Z').toISOString()),
    createLegacyConcept('topic-b-card', 'topic-b', new Date('2025-01-01T00:00:00Z').toISOString()),
  ],
};

function resetStoreState() {
  localStorage.removeItem('abyss-engine-storage');
  useProgressionStore.setState({
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
  });
}

describe('progressionStore due-card selectors', () => {
  beforeEach(() => {
    resetStoreState();
    setDeckDataForTests(TEST_DECK);
  });

  it('counts due cards using legacy concept sm2 values when no runtime state override exists', () => {
    const now = Date.now();
    const concepts = [
      createLegacyConcept('concept-due', 'topic-1', new Date(now - 1_000).toISOString()),
      createLegacyConcept('concept-future', 'topic-1', new Date(now + 60_000).toISOString()),
    ];

    useProgressionStore.setState({ concepts });

    expect(useProgressionStore.getState().getDueCardsCount()).toBe(1);
    expect(useProgressionStore.getState().getTotalCardsCount()).toBe(2);
  });

  it('respects runtime sm2Data overrides over legacy concept sm2 values', () => {
    const now = Date.now();
    const concepts = [
      createLegacyConcept('legacy-overridden', 'topic-1', new Date(now - 1_000).toISOString()),
      createLegacyConcept('legacy-future', 'topic-1', new Date(now + 60_000).toISOString()),
    ];
    const sm2Data: Record<string, SM2Data> = {
      'legacy-overridden': {
        interval: 3,
        easeFactor: 2.5,
        repetitions: 0,
        nextReview: now + 60_000,
      },
      'legacy-future': {
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        nextReview: now + 60_000,
      },
    };

    useProgressionStore.setState({
      concepts,
      sm2Data,
    });

    expect(useProgressionStore.getState().getDueCardsCount()).toBe(0);
  });

  it('counts a legacy-past concept when sm2Data marks it due', () => {
    const now = Date.now();
    const concepts = [
      createLegacyConcept('legacy-due', 'topic-1', new Date(now + 60_000).toISOString()),
      createLegacyConcept('legacy-due-2', 'topic-1', new Date(now + 60_000).toISOString()),
    ];
    const sm2Data: Record<string, SM2Data> = {
      'legacy-due': {
        interval: 1,
        easeFactor: 2.5,
        repetitions: 1,
        nextReview: now - 1_000,
      },
    };

    useProgressionStore.setState({
      concepts,
      sm2Data,
    });

    expect(useProgressionStore.getState().getDueCardsCount()).toBe(1);
  });

  it('rebuilds concepts from the deck catalog without resetting persisted progression on initialize', () => {
    const deck = getDeckData();
    const deckConcepts = deck.concepts ?? [];
    const topicIds = Array.from(new Set(deckConcepts.map((concept) => concept.topicId).filter(Boolean)));
    const crystalTopicId = topicIds[0];
    const lockedTopicId = topicIds[1];
    const preservedConceptId = deckConcepts[0]?.id;
    const persistedSm2 = preservedConceptId
      ? {
          [preservedConceptId]: {
            interval: 3,
            easeFactor: 2.5,
            repetitions: 2,
            nextReview: Date.now() + 12_000,
          },
        }
      : {};

    resetStoreState();
    expect(crystalTopicId).toBeTruthy();

    useProgressionStore.setState({
      activeCrystals: [{
        topicId: crystalTopicId!,
        gridPosition: [0, 0],
        xp: 250,
        spawnedAt: Date.now(),
      }],
      unlockPoints: 2,
      sm2Data: persistedSm2,
      concepts: [],
      unlockedTopics: [],
      lockedTopics: lockedTopicId ? [lockedTopicId] : [],
    });

    useProgressionStore.getState().initialize();
    const state = useProgressionStore.getState();

    expect(state.concepts.length).toBe(deckConcepts.length);
    expect(state.activeCrystals).toHaveLength(1);
    expect(state.activeCrystals[0].topicId).toBe(crystalTopicId);
    expect(state.unlockPoints).toBe(2);
    expect(state.unlockedTopics).toContain(crystalTopicId);
    if (lockedTopicId) {
      expect(state.lockedTopics).toContain(lockedTopicId);
    }
    if (preservedConceptId) {
      expect(state.sm2Data[preservedConceptId]).toEqual(persistedSm2[preservedConceptId]);
    }
  });

  it('initializes first-run defaults when no persistence is present', () => {
    resetStoreState();
    useProgressionStore.setState({ concepts: [], sm2Data: {} });
    useProgressionStore.getState().initialize();

    const deck = getDeckData();
    const deckConcepts = deck.concepts ?? [];
    const topicIds = Array.from(new Set(deckConcepts.map((concept) => concept.topicId).filter(Boolean)));
    const state = useProgressionStore.getState();

    expect(state.concepts.length).toBe(deckConcepts.length);
    expect(state.lockedTopics.sort()).toEqual(topicIds.sort());
    expect(state.unlockedTopics).toEqual([]);
    expect(state.unlockPoints).toBe(INITIAL_UNLOCK_POINTS);
  });

  it('does not persist concept payload in localStorage (progression-only partialize)', async () => {
    const deckConcepts = [createLegacyConcept('persist-test', 'topic-persist', new Date().toISOString())];
    useProgressionStore.setState({
      concepts: deckConcepts,
      currentConcept: deckConcepts[0],
      activeCrystals: [{
        topicId: 'topic-persist',
        gridPosition: [1, 1],
        xp: 50,
        spawnedAt: Date.now(),
      }],
      unlockedTopics: ['topic-persist'],
      lockedTopics: [],
      sm2Data: {
        'persist-test': {
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
          nextReview: Date.now(),
        },
      },
      currentSubjectId: 'data-science',
      unlockPoints: 3,
    });

    await Promise.resolve();

    const raw = localStorage.getItem('abyss-engine-storage');
    expect(raw).not.toBeNull();
    const saved = JSON.parse(raw!);
    const persisted = (saved as any).state ? (saved as any).state : saved;

    expect(persisted.concepts).toBeUndefined();
    expect(persisted.activeCrystals).toHaveLength(1);
    expect(persisted.sm2Data['persist-test']).toBeDefined();
  });

  it('migrates legacy persisted payloads by stripping concepts', () => {
    const migrate = useProgressionStore.persist.getOptions().migrate!;
    const migrated = migrate(
      {
        version: 1,
        state: {
          concepts: [{ id: 'legacy' }],
          activeCrystals: [],
          unlockedTopics: ['topic-legacy'],
          lockedTopics: ['topic-other'],
          sm2Data: {},
          currentSubjectId: null,
          unlockPoints: 0,
        },
      },
      1,
    );
    const payload = (migrated as any).state ? (migrated as any).state : migrated;

    expect(payload.concepts).toBeUndefined();
    expect(payload.unlockedTopics).toEqual(['topic-legacy']);
    expect(payload.lockedTopics).toEqual(['topic-other']);
  });
});
