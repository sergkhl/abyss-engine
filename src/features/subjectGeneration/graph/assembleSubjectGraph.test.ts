import { describe, expect, it } from 'vitest';

import type { TopicLattice } from '@/types/topicLattice';

import { assembleSubjectGraph } from './assembleSubjectGraph';

describe('assembleSubjectGraph', () => {
  it('attaches edges and keeps tier 1 prerequisites empty', () => {
    const lattice: TopicLattice = {
      topics: [
        { topicId: 'a1', title: 'A1', tier: 1, learningObjective: 'o' },
        { topicId: 'b1', title: 'B1', tier: 2, learningObjective: 'o' },
        { topicId: 'c1', title: 'C1', tier: 3, learningObjective: 'o' },
      ],
    };
    const edges = {
      b1: ['a1'],
      c1: ['b1', { topicId: 'a1', minLevel: 2 }],
    };
    const graph = assembleSubjectGraph(lattice, edges, 'sub-1', 'Title');
    expect(graph.maxTier).toBe(3);
    expect(graph.nodes.map((n) => n.topicId)).toEqual(['a1', 'b1', 'c1']);
    const n1 = graph.nodes.find((n) => n.topicId === 'a1');
    expect(n1?.prerequisites).toEqual([]);
    expect(graph.nodes.find((n) => n.topicId === 'b1')?.prerequisites).toEqual(['a1']);
    expect(graph.nodes.find((n) => n.topicId === 'c1')?.prerequisites).toEqual(edges.c1);
  });
});
