import { describe, expect, it } from 'vitest';

import type { TopicMetadata } from '../features/content';

import { getSubjectFilteredTopicIds } from './useTopicCardQueries';

function meta(subjectId: string): TopicMetadata {
  return {
    subjectId,
    subjectName: 'S',
    topicName: 'T',
  };
}

describe('getSubjectFilteredTopicIds', () => {
  it('returns all active topic ids when no subject is selected', () => {
    const active = ['a', 'b'];
    const all: Record<string, TopicMetadata> = {
      a: meta('sub-1'),
      b: meta('sub-2'),
    };
    expect(getSubjectFilteredTopicIds(active, null, all)).toEqual(['a', 'b']);
  });

  it('filters to topics whose metadata subject matches currentSubjectId', () => {
    const active = ['a', 'b', 'c'];
    const all: Record<string, TopicMetadata> = {
      a: meta('sub-1'),
      b: meta('sub-2'),
      c: meta('sub-1'),
    };
    expect(getSubjectFilteredTopicIds(active, 'sub-1', all)).toEqual(['a', 'c']);
  });

  it('drops topics with missing or mismatched metadata', () => {
    const active = ['a', 'b'];
    const all: Record<string, TopicMetadata> = {
      a: meta('sub-1'),
    };
    expect(getSubjectFilteredTopicIds(active, 'sub-1', all)).toEqual(['a']);
  });
});
