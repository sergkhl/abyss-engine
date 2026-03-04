import type { Card, Subject, SubjectGraph, TopicDetails } from './core';

export interface Manifest {
  subjects: Subject[];
}

export interface IDeckRepository {
  getManifest(): Promise<Manifest>;
  getSubjectGraph(subjectId: string): Promise<SubjectGraph>;
  getTopicDetails(subjectId: string, topicId: string): Promise<TopicDetails>;
  getTopicCards(subjectId: string, topicId: string): Promise<Card[]>;
}
