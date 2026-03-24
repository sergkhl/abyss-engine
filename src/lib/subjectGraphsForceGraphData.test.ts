import { describe, expect, it } from 'vitest';

import type { SubjectGraph } from '@/types/core';

import {
  buildSubjectGraphsForceGraphData,
  clusterCentersOnCircle,
  compositeTopicNodeId,
} from './subjectGraphsForceGraphData';

describe('buildSubjectGraphsForceGraphData', () => {
  it('keeps distinct nodes when the same topicId appears in different subjects', () => {
    const graphs: SubjectGraph[] = [
      {
        subjectId: 'sub-a',
        title: 'A',
        themeId: 't',
        maxTier: 1,
        nodes: [
          {
            topicId: 'shared-slug',
            title: 'In A',
            tier: 1,
            prerequisites: [],
            learningObjective: 'o',
          },
        ],
      },
      {
        subjectId: 'sub-b',
        title: 'B',
        themeId: 't',
        maxTier: 1,
        nodes: [
          {
            topicId: 'shared-slug',
            title: 'In B',
            tier: 1,
            prerequisites: [],
            learningObjective: 'o',
          },
        ],
      },
    ];

    const { nodes, links, subjectIdsOrdered } = buildSubjectGraphsForceGraphData(graphs);

    expect(subjectIdsOrdered).toEqual(['sub-a', 'sub-b']);
    expect(nodes).toHaveLength(2);
    const ids = new Set(nodes.map((n) => n.id));
    expect(ids.size).toBe(2);
    expect(ids.has(compositeTopicNodeId('sub-a', 'shared-slug'))).toBe(true);
    expect(ids.has(compositeTopicNodeId('sub-b', 'shared-slug'))).toBe(true);
    expect(links).toHaveLength(0);
  });

  it('creates prerequisite links with composite endpoints within a subject', () => {
    const graphs: SubjectGraph[] = [
      {
        subjectId: 'math',
        title: 'Math',
        themeId: 'math',
        maxTier: 2,
        nodes: [
          {
            topicId: 'algebra',
            title: 'Algebra',
            tier: 1,
            prerequisites: [],
            learningObjective: 'a',
          },
          {
            topicId: 'calculus',
            title: 'Calculus',
            tier: 2,
            prerequisites: ['algebra'],
            learningObjective: 'c',
          },
        ],
      },
    ];

    const { nodes, links } = buildSubjectGraphsForceGraphData(graphs);

    expect(nodes).toHaveLength(2);
    expect(links).toEqual([
      {
        source: compositeTopicNodeId('math', 'algebra'),
        target: compositeTopicNodeId('math', 'calculus'),
      },
    ]);
  });

  it('drops links when prerequisite id is missing from nodes', () => {
    const graphs: SubjectGraph[] = [
      {
        subjectId: 's',
        title: 'S',
        themeId: 's',
        maxTier: 1,
        nodes: [
          {
            topicId: 'orphan-child',
            title: 'Child',
            tier: 2,
            prerequisites: ['missing-prereq'],
            learningObjective: 'x',
          },
        ],
      },
    ];

    const { links } = buildSubjectGraphsForceGraphData(graphs);
    expect(links).toHaveLength(0);
  });
});

describe('clusterCentersOnCircle', () => {
  it('returns one center at box midpoint for a single cluster', () => {
    const [c] = clusterCentersOnCircle(1, 400, 300, 0);
    expect(c).toEqual({ x: 200, y: 150 });
  });

  it('places three clusters on a circle', () => {
    const centers = clusterCentersOnCircle(3, 300, 300, 50);
    expect(centers).toHaveLength(3);
    const cx = 150;
    const cy = 150;
    const r = 100;
    expect(centers[0]!.x).toBeCloseTo(cx, 5);
    expect(centers[0]!.y).toBeCloseTo(cy - r, 5);
  });
});
