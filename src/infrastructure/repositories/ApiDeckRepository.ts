import { IDeckRepository, Manifest } from '../../types/repository';
import { Card, SubjectGraph, TopicDetails } from '../../types/core';

export class ApiDeckRepository implements IDeckRepository {
  private baseUrl = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/data`;

  private async fetchJson<T>(paths: string[]): Promise<T> {
    for (const path of paths) {
      const response = await fetch(path);
      if (response.ok) {
        return response.json();
      }
    }

    throw new Error(`Failed to load JSON from paths: ${paths.join(', ')}`);
  }

  async getManifest(): Promise<Manifest> {
    return this.fetchJson<Manifest>([
      `${this.baseUrl}/subjects/manifest.json`,
    ]);
  }

  async getSubjectGraph(subjectId: string): Promise<SubjectGraph> {
    const response = await fetch(`${this.baseUrl}/subjects/${subjectId}/graph.json`);
    return response.json();
  }

  async getTopicDetails(subjectId: string, topicId: string): Promise<TopicDetails> {
    return this.fetchJson<TopicDetails>([
      `${this.baseUrl}/subjects/${subjectId}/topics/${topicId}.json`,
      `${this.baseUrl}/subjects/${subjectId}/topics/${topicId}/topic.json`,
    ]);
  }

  async getTopicCards(subjectId: string, topicId: string): Promise<Card[]> {
    const payload = await this.fetchJson<unknown>([
      `${this.baseUrl}/subjects/${subjectId}/cards/${topicId}.json`,
      `${this.baseUrl}/subjects/${subjectId}/topics/${topicId}/cards.json`,
    ]);

    if (Array.isArray(payload)) {
      return payload as Card[];
    }

    if (typeof payload === 'object' && payload !== null && 'cards' in payload) {
      const maybeCards = (payload as { cards?: unknown }).cards;
      if (Array.isArray(maybeCards)) {
        return maybeCards as Card[];
      }
    }

    return [];
  }
}
