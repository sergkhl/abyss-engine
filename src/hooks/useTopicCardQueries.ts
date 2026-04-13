import { useMemo } from 'react';
import { useQueries, type UseQueryResult } from '@tanstack/react-query';

import type { TopicMetadata } from '../features/content';
import type { Card } from '../types/core';
import { deckRepository } from '../infrastructure/di';
import { topicCardsQueryKey } from './useDeckData';

export type TopicCardQueryRow = UseQueryResult<Card[], Error>;

export interface TopicCardQueriesResult {
  /** Topic IDs aligned with `topicCardQueries` indices (subject-filtered or full active set). */
  queriedTopicIds: readonly string[];
  topicCardQueries: TopicCardQueryRow[];
  topicCardsById: Map<string, Card[]>;
}

/**
 * Pure filter: same rule as legacy `page.tsx` / `Scene` subject scoping — one place so call sites cannot drift.
 */
export function getSubjectFilteredTopicIds(
  activeTopicIds: readonly string[],
  currentSubjectId: string | null,
  allTopicMetadata: Readonly<Record<string, TopicMetadata>>,
): string[] {
  if (!currentSubjectId) {
    return [...activeTopicIds];
  }

  return activeTopicIds.filter(
    (topicId) => allTopicMetadata[topicId]?.subjectId === currentSubjectId,
  );
}

function useTopicCardQueriesFromTopicIds(
  topicIds: readonly string[],
  allTopicMetadata: Readonly<Record<string, TopicMetadata>>,
): TopicCardQueriesResult {
  const topicCardQueries = useQueries({
    queries: topicIds.map((topicId) => {
      const subjectId = allTopicMetadata[topicId]?.subjectId || '';
      return {
        queryKey: topicCardsQueryKey(subjectId, topicId),
        queryFn: () => deckRepository.getTopicCards(subjectId, topicId),
        enabled: Boolean(subjectId),
        staleTime: Infinity,
      };
    }),
  });

  const topicCardsById = useMemo(() => {
    const map = new Map<string, Card[]>();
    topicIds.forEach((topicId, index) => {
      const cards = topicCardQueries[index]?.data;
      if (cards) {
        map.set(topicId, cards);
      }
    });
    return map;
  }, [topicIds, topicCardQueries]);

  return { queriedTopicIds: topicIds, topicCardQueries, topicCardsById };
}

/** Fetch deck cards for every active crystal topic (Scene: all visible crystals need card payloads). */
export function useTopicCardQueriesForActiveTopics(
  activeTopicIds: readonly string[],
  allTopicMetadata: Readonly<Record<string, TopicMetadata>>,
): TopicCardQueriesResult {
  return useTopicCardQueriesFromTopicIds(activeTopicIds, allTopicMetadata);
}

/** Fetch deck cards only for topics in the current subject (or all topics when no subject is selected). */
export function useTopicCardQueriesForSubjectFilter(
  activeTopicIds: readonly string[],
  currentSubjectId: string | null,
  allTopicMetadata: Readonly<Record<string, TopicMetadata>>,
): TopicCardQueriesResult {
  const subjectFilteredTopicIds = useMemo(
    () => getSubjectFilteredTopicIds(activeTopicIds, currentSubjectId, allTopicMetadata),
    [activeTopicIds, currentSubjectId, allTopicMetadata],
  );

  return useTopicCardQueriesFromTopicIds(subjectFilteredTopicIds, allTopicMetadata);
}
