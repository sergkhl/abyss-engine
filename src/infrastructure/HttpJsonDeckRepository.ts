import { Card, GraphNode, IDeckRepository, Manifest, SubjectGraph, SubjectGeometry, TopicCardGroup, TopicDetails } from '../types/repository';

const DATA_ROOT = '/data/subjects';

type HttpClient = typeof fetch;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Failed to load ${response.url}: ${response.status} ${response.statusText}`);
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new Error(`Invalid JSON at ${response.url}: ${(error as Error).message}`);
  }
}

async function fetchJson<T>(fetchClient: HttpClient, path: string): Promise<T> {
  const response = await fetchClient(path, { cache: 'force-cache' });
  return parseResponse<T>(response);
}

class MissingResourceError extends Error {
  constructor(resource: string) {
    super(`Resource not found: ${resource}`);
    this.name = 'MissingResourceError';
  }
}

function buildCardsPath(subjectId: string, topicId: string) {
  return `${DATA_ROOT}/${subjectId}/cards/${topicId}.json`;
}

function buildTopicPath(subjectId: string, topicId: string) {
  return `${DATA_ROOT}/${subjectId}/topics/${topicId}.json`;
}

function buildGraphPath(subjectId: string) {
  return `${DATA_ROOT}/${subjectId}/graph.json`;
}

export class HttpJsonDeckRepository implements IDeckRepository {
  private readonly fetchClient: HttpClient;

  constructor(fetchClient: HttpClient = isBrowser() ? fetch : () => {
    throw new Error('Fetch is unavailable in this environment');
  }) {
    this.fetchClient = fetchClient;
  }

  async getManifest(): Promise<Manifest> {
    return fetchJson<Manifest>(this.fetchClient, `${DATA_ROOT}/manifest.json`);
  }

  async getSubjectGraph(subjectId: string): Promise<SubjectGraph> {
    const graph = await fetchJson<{
      subjectId?: string;
      title: string;
      themeId: string;
      maxTier: number;
      nodes?: GraphNode[];
    }>(this.fetchClient, buildGraphPath(subjectId));

    const nodes = graph.nodes ?? [];

    if (!Array.isArray(nodes)) {
      throw new Error(`Invalid graph format for subject ${subjectId}: nodes is not an array`);
    }

    return {
      subjectId: graph.subjectId || subjectId,
      title: graph.title,
      themeId: graph.themeId,
      maxTier: graph.maxTier,
      nodes,
    };
  }

  async getTopicDetails(subjectId: string, topicId: string): Promise<TopicDetails> {
    const topic = await fetchJson<TopicDetails>(this.fetchClient, buildTopicPath(subjectId, topicId));

    if (!topic || topic.topicId !== topicId) {
      throw new MissingResourceError(`${subjectId}/topics/${topicId}.json`);
    }

    return topic;
  }

  async getTopicCards(subjectId: string, topicId: string): Promise<Card[]> {
    const cardGroup = await fetchJson<TopicCardGroup>(this.fetchClient, buildCardsPath(subjectId, topicId));

    if (!cardGroup || cardGroup.topicId !== topicId) {
      throw new MissingResourceError(`${subjectId}/cards/${topicId}.json`);
    }

    return cardGroup.cards ?? [];
  }
}
