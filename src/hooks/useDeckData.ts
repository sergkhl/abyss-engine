import { UseQueryResult, useQuery } from '@tanstack/react-query';
import { Card, Manifest, SubjectGraph, TopicDetails } from '../types/repository';
import { deckRepository } from '../infrastructure/di';

const DEFAULT_STALE_TIME = Number.POSITIVE_INFINITY;

export function useManifest(): UseQueryResult<Manifest, Error> {
  return useQuery({
    queryKey: ['deck', 'manifest'] as const,
    queryFn: async (): Promise<Manifest> => deckRepository.getManifest(),
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useSubjectGraph(subjectId: string): UseQueryResult<SubjectGraph, Error> {
  return useQuery({
    queryKey: ['deck', 'subject', subjectId, 'graph'] as const,
    queryFn: async (): Promise<SubjectGraph> => deckRepository.getSubjectGraph(subjectId),
    staleTime: DEFAULT_STALE_TIME,
    enabled: Boolean(subjectId),
  });
}

export function useSubjectGraphs(subjectIds: string[]): UseQueryResult<SubjectGraph[], Error> {
  return useQuery({
    queryKey: ['deck', 'subject', 'graphs', subjectIds],
    queryFn: async (): Promise<SubjectGraph[]> => Promise.all(subjectIds.map((subjectId) => deckRepository.getSubjectGraph(subjectId))),
    staleTime: DEFAULT_STALE_TIME,
    enabled: subjectIds.length > 0,
  });
}

export function useTopicDetails(subjectId: string, topicId: string): UseQueryResult<TopicDetails, Error> {
  return useQuery({
    queryKey: ['deck', 'subject', subjectId, 'topic', topicId, 'details'],
    queryFn: async (): Promise<TopicDetails> => deckRepository.getTopicDetails(subjectId, topicId),
    staleTime: DEFAULT_STALE_TIME,
    enabled: Boolean(subjectId) && Boolean(topicId),
  });
}

export function useTopicCards(subjectId: string, topicId: string): UseQueryResult<Card[], Error> {
  return useQuery({
    queryKey: ['deck', 'subject', subjectId, 'topic', topicId, 'cards'],
    queryFn: async (): Promise<Card[]> => deckRepository.getTopicCards(subjectId, topicId),
    staleTime: DEFAULT_STALE_TIME,
    enabled: Boolean(subjectId) && Boolean(topicId),
  });
}
