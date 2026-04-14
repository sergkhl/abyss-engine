import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';

import { topicRefKey } from '@/lib/topicRef';
import { Subject, SubjectGraph, TopicDetails, Card, TopicRef } from '../../types/core';
import { useSubjects, useSubjectGraphs } from './contentQueries';
import { deckRepository } from '../../infrastructure/di';

export interface TopicMetadata {
  subjectId: string;
  subjectName: string;
  topicName: string;
  theory?: string;
}

/** Returns metadata keyed by `topicRefKey` (`subjectId::topicId`). */
export function useTopicMetadata(refs: TopicRef[]) {
  const deduped = useMemo(() => {
    const seen = new Set<string>();
    const out: TopicRef[] = [];
    for (const ref of refs) {
      const k = topicRefKey(ref);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(ref);
    }
    return out;
  }, [refs]);

  const { data: subjects = [] } = useSubjects();
  const subjectIds = useMemo(
    () => Array.from(new Set(subjects.map((subject) => subject.id))),
    [subjects],
  );
  const { data: graphs = [] } = useSubjectGraphs(subjectIds);

  const subjectMap = useMemo(() => {
    const map = new Map<string, string>();
    subjects.forEach((subject) => map.set(subject.id, subject.name));
    return map;
  }, [subjects]);

  const topicMetadataBase = useMemo(() => {
    const base: Record<string, TopicMetadata> = {};
    for (const ref of deduped) {
      const k = topicRefKey(ref);
      const subjectName = subjectMap.get(ref.subjectId) ?? '';
      base[k] = {
        subjectId: ref.subjectId,
        subjectName,
        topicName: '',
      };
    }
    return base;
  }, [subjectMap, deduped]);

  const topicDetailsQueries = useQueries({
    queries: deduped.map((ref) => ({
      queryKey: ['content', 'topic', ref.subjectId, ref.topicId, 'details'],
      queryFn: () => deckRepository.getTopicDetails(ref.subjectId, ref.topicId),
      enabled: Boolean(ref.subjectId) && Boolean(ref.topicId),
      staleTime: Infinity,
    })),
  });

  const detailsMap = new Map<string, TopicDetails>();
  deduped.forEach((ref, index) => {
    const data = topicDetailsQueries[index]?.data as TopicDetails | undefined;
    if (data) {
      detailsMap.set(topicRefKey(ref), data);
    }
  });

  return useMemo(() => {
    const merged: Record<string, TopicMetadata> = { ...topicMetadataBase };
    for (const ref of deduped) {
      const k = topicRefKey(ref);
      const details = detailsMap.get(k);
      if (!details) {
        continue;
      }
      const base = merged[k] ?? { subjectId: details.subjectId, subjectName: '', topicName: '' };
      merged[k] = {
        ...base,
        subjectId: details.subjectId,
        topicName: details.title,
        theory: details.theory,
      };
    }
    return merged;
  }, [detailsMap, deduped, topicMetadataBase]);
}

export function useAllGraphs() {
  const { data: subjects = [] } = useSubjects();
  const subjectIds = useMemo(
    () => Array.from(new Set(subjects.map((subject) => subject.id))),
    [subjects],
  );
  const { data: graphs = [] } = useSubjectGraphs(subjectIds);
  return graphs as SubjectGraph[];
}

interface TopicCardsFixture {
  subjectId: string;
  topicId: string;
  cards: Card[];
}

function topicKey(subjectId: string, topicId: string) {
  return `${subjectId}::${topicId}`;
}

export function setContentDataForTests(
  subjects: Subject[],
  graphs: SubjectGraph[],
  topics: TopicDetails[],
  cards: TopicCardsFixture[],
) {
  const topicsByKey = new Map<string, TopicDetails>();
  for (const topic of topics) {
    topicsByKey.set(topicKey(topic.subjectId, topic.topicId), topic);
  }

  const cardsByKey = new Map<string, Card[]>();
  for (const record of cards) {
    cardsByKey.set(topicKey(record.subjectId, record.topicId), record.cards);
  }

  const graphsBySubject = new Map<string, SubjectGraph>();
  for (const graph of graphs) {
    graphsBySubject.set(graph.subjectId, graph);
  }

  (deckRepository as any).getManifest = async () => ({
    subjects,
  });

  (deckRepository as any).getSubjectGraph = async (subjectId: string) => {
    return graphsBySubject.get(subjectId) ?? {
      subjectId,
      title: '',
      themeId: '',
      maxTier: 0,
      nodes: [],
    };
  };

  (deckRepository as any).getTopicDetails = async (subjectId: string, topicId: string) => {
    const key = topicKey(subjectId, topicId);
    const topic = topicsByKey.get(key);
    return (
      topic ?? {
        subjectId,
        topicId,
        title: topicId,
        theory: '',
        coreConcept: '',
        keyTakeaways: [],
      }
    );
  };

  (deckRepository as any).getTopicCards = async (subjectId: string, topicId: string) => {
    return cardsByKey.get(topicKey(subjectId, topicId)) ?? [];
  };
}
