import { describe, expect, it } from 'vitest';

import type { TopicMetadata } from '../features/content';
import { topicRefKey } from '@/lib/topicRef';

import { getSubjectFilteredTopicRefs } from './useTopicCardQueries';

function meta(subjectId: string, topicId: string): TopicMetadata {
  return {
    subjectId,
    subjectName: 'S',
    topicName: `T-${topicId}`,
  };
}

describe('getSubjectFilteredTopicRefs', () => {
  it('returns all active topic refs when no subject is selected', () => {
    const refs = [
      { subjectId: 'sub-1', topicId: 'a' },
      { subjectId: 'sub-2', topicId: 'b' },
    ];
    const all: Record<string, TopicMetadata> = {
      [topicRefKey(refs[0]!)]: meta('sub-1', 'a'),
      [topicRefKey(refs[1]!)]: meta('sub-2', 'b'),
    };
    expect(getSubjectFilteredTopicRefs(refs, null, all)).toEqual(refs);
  });

  it('filters to topics whose metadata subject matches currentSubjectId', () => {
    const refs = [
      { subjectId: 'sub-1', topicId: 'a' },
      { subjectId: 'sub-2', topicId: 'b' },
      { subjectId: 'sub-1', topicId: 'c' },
    ];
    const all: Record<string, TopicMetadata> = {
      [topicRefKey(refs[0]!)]: meta('sub-1', 'a'),
      [topicRefKey(refs[1]!)]: meta('sub-2', 'b'),
      [topicRefKey(refs[2]!)]: meta('sub-1', 'c'),
    };
    expect(getSubjectFilteredTopicRefs(refs, 'sub-1', all)).toEqual([
      { subjectId: 'sub-1', topicId: 'a' },
      { subjectId: 'sub-1', topicId: 'c' },
    ]);
  });

  it('drops topics with missing or mismatched metadata', () => {
    const refs = [
      { subjectId: 'sub-1', topicId: 'a' },
      { subjectId: 'sub-2', topicId: 'b' },
    ];
    const all: Record<string, TopicMetadata> = {
      [topicRefKey(refs[0]!)]: meta('sub-1', 'a'),
    };
    expect(getSubjectFilteredTopicRefs(refs, 'sub-1', all)).toEqual([{ subjectId: 'sub-1', topicId: 'a' }]);
  });
});
