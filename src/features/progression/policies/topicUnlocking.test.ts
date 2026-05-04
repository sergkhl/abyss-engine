import { describe, expect, it } from 'vitest';

import type { ActiveCrystal, SubjectGraph, TopicRef } from '@/types/core';
import type { TopicContentStatus } from '@/types/progression';
import {
  getTopicUnlockStatus,
  getTopicsByTier,
  getVisibleTopicIds,
} from './topicUnlocking';

function createActiveCrystal(topicId: string, xp = 0, subjectId = 's1'): ActiveCrystal {
  return {
    subjectId,
    topicId,
    gridPosition: [0, 0],
    xp,
    spawnedAt: 100,
  };
}

function topicRef(subjectId: string, topicId: string): TopicRef {
  return { subjectId, topicId };
}

describe('topicUnlocking policy', () => {
  describe('getTopicUnlockStatus', () => {
    const graphWithPrereq: SubjectGraph[] = [
      {
        subjectId: 's1',
        title: 'S1',
        themeId: 't1',
        maxTier: 2,
        nodes: [
          { topicId: 'a', title: 'A', tier: 1, learningObjective: '', prerequisites: [], iconName: 'lightbulb' },
          { topicId: 'b', title: 'B', tier: 2, learningObjective: '', prerequisites: ['a'], iconName: 'lightbulb' },
        ],
      },
    ];

    it('returns unlockPoints on the status object', () => {
      const status = getTopicUnlockStatus(topicRef('s1', 'missing'), [], 2, [], []);
      expect(status.unlockPoints).toBe(2);
    });

    it('topic prereqs met but no points: canUnlock false, hasPrerequisites true, hasEnoughPoints false', () => {
      const crystals = [createActiveCrystal('a', 100)];
      const status = getTopicUnlockStatus(topicRef('s1', 'b'), crystals, 0, graphWithPrereq, []);
      expect(status.hasPrerequisites).toBe(true);
      expect(status.hasEnoughPoints).toBe(false);
      expect(status.canUnlock).toBe(false);
      expect(status.unlockPoints).toBe(0);
    });

    it('topic prereqs met and has points: canUnlock true', () => {
      const crystals = [createActiveCrystal('a', 100)];
      const status = getTopicUnlockStatus(topicRef('s1', 'b'), crystals, 1, graphWithPrereq, []);
      expect(status.hasPrerequisites).toBe(true);
      expect(status.hasEnoughPoints).toBe(true);
      expect(status.canUnlock).toBe(true);
    });

    it('object prerequisite with minLevel 2: false when parent crystal is only level 1', () => {
      const graphMin2: SubjectGraph[] = [
        {
          subjectId: 's1',
          title: 'S1',
          themeId: 't1',
          maxTier: 2,
          nodes: [
            { topicId: 'a', title: 'A', tier: 1, learningObjective: '', prerequisites: [], iconName: 'lightbulb' },
            {
              topicId: 'b',
              title: 'B',
              tier: 2,
              learningObjective: '',
              prerequisites: [{ topicId: 'a', minLevel: 2 }],
              iconName: 'lightbulb',
            },
          ],
        },
      ];
      const crystalsL1 = [createActiveCrystal('a', 100)];
      const blocked = getTopicUnlockStatus(topicRef('s1', 'b'), crystalsL1, 1, graphMin2, []);
      expect(blocked.hasPrerequisites).toBe(false);
      expect(blocked.missingPrerequisites[0]).toMatchObject({
        topicId: 'a',
        requiredLevel: 2,
        currentLevel: 1,
      });

      const crystalsL2 = [createActiveCrystal('a', 200)];
      const open = getTopicUnlockStatus(topicRef('s1', 'b'), crystalsL2, 1, graphMin2, []);
      expect(open.hasPrerequisites).toBe(true);
      expect(open.canUnlock).toBe(true);
    });
  });

  describe('getVisibleTopicIds', () => {
    function graphTwoTier(): SubjectGraph {
      return {
        subjectId: 's',
        title: 'T',
        themeId: 's',
        maxTier: 2,
        nodes: [
          { topicId: 'a', title: 'A', tier: 1, prerequisites: [], learningObjective: 'o', iconName: 'lightbulb' },
          { topicId: 'b', title: 'B', tier: 2, prerequisites: ['a'], learningObjective: 'o', iconName: 'lightbulb' },
        ],
      };
    }

    it('tier 1 always visible', () => {
      const g = graphTwoTier();
      const v = getVisibleTopicIds(g, []);
      expect(v.has('a')).toBe(true);
      expect(v.has('b')).toBe(false);
    });

    it('tier 2 visible when any prerequisite has a crystal; graph minLevel ignored', () => {
      const g = graphTwoTier();
      g.nodes[1].prerequisites = [{ topicId: 'a', minLevel: 2 }];
      expect(getVisibleTopicIds(g, [createActiveCrystal('a', 0, 's')]).has('b')).toBe(true);
      expect(getVisibleTopicIds(g, []).has('b')).toBe(false);
    });

    it('tier 2 visible when at least one of several prerequisites is unlocked', () => {
      const g: SubjectGraph = {
        subjectId: 's',
        title: 'T',
        themeId: 's',
        maxTier: 2,
        nodes: [
          { topicId: 'a', title: 'A', tier: 1, prerequisites: [], learningObjective: 'o', iconName: 'lightbulb' },
          { topicId: 'x', title: 'X', tier: 1, prerequisites: [], learningObjective: 'o', iconName: 'lightbulb' },
          { topicId: 'b', title: 'B', tier: 2, prerequisites: ['a', 'x'], learningObjective: 'o', iconName: 'lightbulb' },
        ],
      };
      expect(getVisibleTopicIds(g, [createActiveCrystal('x', 0, 's')]).has('b')).toBe(true);
      expect(getVisibleTopicIds(g, []).has('b')).toBe(false);
    });
  });

  describe('getTopicsByTier curriculum visibility', () => {
    it('marks isCurriculumVisible from activeCrystals when provided', () => {
      const graphs: SubjectGraph[] = [
        {
          subjectId: 's',
          title: 'T',
          themeId: 's',
          maxTier: 2,
          nodes: [
            { topicId: 'a', title: 'A', tier: 1, prerequisites: [], learningObjective: 'o', iconName: 'lightbulb' },
            { topicId: 'b', title: 'B', tier: 2, prerequisites: ['a'], learningObjective: 'o', iconName: 'lightbulb' },
          ],
        },
      ];
      const withoutCrystal = getTopicsByTier(graphs, [], undefined, undefined, []);
      const bHidden = withoutCrystal.flatMap((t) => t.topics).find((x) => x.id === 'b');
      expect(bHidden?.isCurriculumVisible).toBe(false);

      const withCrystal = getTopicsByTier(graphs, [], undefined, undefined, [
        createActiveCrystal('a', 0, 's'),
      ]);
      const bVisible = withCrystal.flatMap((t) => t.topics).find((x) => x.id === 'b');
      expect(bVisible?.isCurriculumVisible).toBe(true);
    });
  });

  describe('getTopicsByTier tri-state contentStatus', () => {
    const graphs: SubjectGraph[] = [
      {
        subjectId: 's',
        title: 'T',
        themeId: 's',
        maxTier: 1,
        nodes: [
          { topicId: 'a', title: 'A', tier: 1, prerequisites: [], learningObjective: 'o', iconName: 'lightbulb' },
          { topicId: 'b', title: 'B', tier: 1, prerequisites: [], learningObjective: 'o', iconName: 'lightbulb' },
          { topicId: 'c', title: 'C', tier: 1, prerequisites: [], learningObjective: 'o', iconName: 'lightbulb' },
        ],
      },
    ];

    it('uses tri-state TopicContentStatus map when provided', () => {
      const statusMap: Record<string, TopicContentStatus> = {
        's::a': 'ready',
        's::b': 'generating',
        's::c': 'unavailable',
      };
      const tiers = getTopicsByTier(graphs, [], undefined, statusMap, []);
      const topics = tiers.flatMap((t) => t.topics);

      const topicA = topics.find((t) => t.id === 'a');
      expect(topicA?.contentStatus).toBe('ready');

      const topicB = topics.find((t) => t.id === 'b');
      expect(topicB?.contentStatus).toBe('generating');

      const topicC = topics.find((t) => t.id === 'c');
      expect(topicC?.contentStatus).toBe('unavailable');
    });

    it('defaults to ready when no map is provided', () => {
      const tiers = getTopicsByTier(graphs, [], undefined, undefined, []);
      const topics = tiers.flatMap((t) => t.topics);
      for (const topic of topics) {
        expect(topic.contentStatus).toBe('ready');
      }
    });

    it('treats missing map keys as unavailable when a map is provided', () => {
      const partialMap: Record<string, TopicContentStatus> = {
        's::a': 'ready',
      };
      const tiers = getTopicsByTier(graphs, [], undefined, partialMap, []);
      const topics = tiers.flatMap((t) => t.topics);
      expect(topics.find((t) => t.id === 'a')?.contentStatus).toBe('ready');
      expect(topics.find((t) => t.id === 'b')?.contentStatus).toBe('unavailable');
      expect(topics.find((t) => t.id === 'c')?.contentStatus).toBe('unavailable');
    });
  });
});
