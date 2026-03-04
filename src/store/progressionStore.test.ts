import { beforeEach, describe, expect, it } from 'vitest';
import { useProgressionStore } from '../features/progression';
import { Card, ActiveCrystal } from '../types';
import { SubjectGraph } from '../types/core';

function createCard(id: string): Card {
  return {
    id,
    type: 'FLASHCARD',
    difficulty: 1,
    content: {
      front: `front-${id}`,
      back: `back-${id}`,
    },
  };
}

function crystal(topicId: string): ActiveCrystal {
  return {
    topicId,
    gridPosition: [0, 0],
    xp: 0,
    spawnedAt: Date.now(),
  };
}

const topicGraphs: SubjectGraph[] = [
  {
    subjectId: 'data-science',
    title: 'Data Science',
    themeId: 'default',
    maxTier: 2,
    nodes: [
      {
        topicId: 'topic-a',
        title: 'Topic A',
        tier: 1,
        prerequisites: [],
        learningObjective: 'Base',
      },
      {
        topicId: 'topic-b',
        title: 'Topic B',
        tier: 2,
        prerequisites: ['topic-a'],
        learningObjective: 'Depends on A',
      },
    ],
  },
];

function resetStore() {
  useProgressionStore.setState({
    isCurrentCardFlipped: false,
    unlockedTopicIds: [],
    lockedTopics: [],
    sm2Data: {},
    activeCrystals: [],
    currentSubjectId: null,
    currentSession: null,
    levelUpMessage: null,
    unlockPoints: 0,
  });
}

describe('progressionStore card-only canonical API', () => {
  beforeEach(() => {
    resetStore();
  });

  it('starts a study session using card input and advances to next card on submit', () => {
    const cards = [createCard('a-1'), createCard('a-2')];
    useProgressionStore.setState({
      unlockedTopicIds: ['topic-a'],
      activeCrystals: [crystal('topic-a')],
      unlockPoints: 3,
      lockedTopics: ['topic-b'],
    });

    const startResult = useProgressionStore.getState().startTopicStudySession('topic-a', cards);
    expect(startResult).toBeUndefined();

    const sessionAfterStart = useProgressionStore.getState().currentSession;
    expect(sessionAfterStart?.topicId).toBe('topic-a');
    expect(sessionAfterStart?.currentCardId).toBe('a-1');
    expect(sessionAfterStart?.totalCards).toBe(2);

    useProgressionStore.getState().submitStudyResult('a-1', 4);
    const sessionAfterSubmit = useProgressionStore.getState().currentSession;
    expect(sessionAfterSubmit?.currentCardId).toBe('a-2');

    const updated = useProgressionStore.getState().sm2Data['a-1'];
    expect(updated).toBeDefined();
    expect(updated.interval).toBeGreaterThan(0);
  });

  it('uses graph prerequisites and unlock points when unlocking topics', () => {
    useProgressionStore.setState({
      lockedTopics: ['topic-a', 'topic-b'],
      unlockedTopicIds: [],
      activeCrystals: [],
      unlockPoints: 2,
    });

    const firstUnlock = useProgressionStore.getState().unlockTopic('topic-a', topicGraphs);
    expect(firstUnlock).not.toBeNull();

    useProgressionStore.getState().addXP('topic-a', 250);

    const dependentUnlock = useProgressionStore.getState().unlockTopic('topic-b', topicGraphs);
    expect(dependentUnlock).not.toBeNull();

    expect(useProgressionStore.getState().unlockedTopicIds).toContain('topic-b');
    expect(useProgressionStore.getState().activeCrystals.map((storeCrystal) => storeCrystal.topicId)).toContain('topic-b');
  });

  it('returns deterministic topic tiers from graph data', () => {
    expect(useProgressionStore.getState().getTopicTier('topic-a', topicGraphs)).toBe(1);
    expect(useProgressionStore.getState().getTopicTier('topic-b', topicGraphs)).toBe(2);
  });

  it('counts due cards with explicit card data', () => {
    const cards = [createCard('due-1'), createCard('due-2')];
    const dueCount = useProgressionStore.getState().getDueCardsCount(cards);
    expect(dueCount).toBe(2);
  });
});
