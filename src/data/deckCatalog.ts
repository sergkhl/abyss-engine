import { Concept, Topic, TopicPrerequisite, Subject, Deck } from '../types';
import { Card, GraphNode, SubjectGraph, TopicDetails, Subject as RepositorySubject } from '../types/repository';
import { deckRepository } from '../infrastructure/di';

interface TopicBundle {
  topic: Topic;
  concepts: Concept[];
}

interface RemoteTopicCacheEntry {
  topicDetails: TopicDetails | null;
  cards: Card[];
}

type DeckLoadError = {
  subjectId: string;
  topicId?: string;
  operation: string;
  message: string;
};

const EMPTY_DECK: Deck = {
  subjects: [],
  topics: [],
  concepts: [],
};

let cachedDeckData: Deck = EMPTY_DECK;
let deckLoadPromise: Promise<Deck> | null = null;
let deckIsLoaded = false;
const remoteTopicCache = new Map<string, RemoteTopicCacheEntry>();

function adaptCardToConcept(card: Card, initialDueDate: string, topicId: string): Concept {
  const baseConcept = {
    id: card.id,
    topicId,
    difficulty: card.difficulty,
    sm2: {
      interval: 0,
      ease: 2.5,
      repetitions: 0,
      dueDate: initialDueDate,
    },
    formats: [],
  } as Concept;

  if (card.type === 'FLASHCARD') {
    const content = card.content as { front: string; back: string };
    return {
      ...baseConcept,
      formats: [{
        id: `${card.id}-format`,
        type: 'flashcard',
        question: content.front,
        answer: content.back,
      }],
    };
  }

  if (card.type === 'SINGLE_CHOICE') {
    const content = card.content as { question: string; options: string[]; correctAnswer: string; explanation: string };
    return {
      ...baseConcept,
      formats: [{
        id: `${card.id}-format`,
        type: 'single_choice',
        question: content.question,
        options: content.options,
        correctAnswers: [content.correctAnswer],
        context: content.explanation,
      }],
    };
  }

  const content = card.content as { question: string; options: string[]; correctAnswers: string[]; explanation: string };
  return {
    ...baseConcept,
    formats: [{
      id: `${card.id}-format`,
      type: 'multi_choice',
      question: content.question,
      options: content.options,
      correctAnswers: content.correctAnswers,
      context: content.explanation,
    }],
  };
}

function createTopicDefinitions(
  subjectId: string,
  graphNode: GraphNode,
  topicDetails: TopicDetails | null,
  cards: Card[],
): TopicBundle {
  const topicId = graphNode?.topicId || topicDetails?.topicId || '';
  const prerequisites: TopicPrerequisite[] = (graphNode?.prerequisites || []).map((prereqTopicId: string) => ({
    topicId: prereqTopicId,
    requiredLevel: 1,
  }));
  const topic: Topic = {
    id: topicId,
    name: graphNode?.title || topicDetails?.title || topicId || '',
    description: topicDetails?.coreConcept?.substring(0, 100) || '',
    icon: 'book',
    subjectId,
    conceptIds: cards.map((card: Card) => card.id),
    theory: topicDetails?.theory || '',
    prerequisites,
  };

  const concepts = cards.map((card) => adaptCardToConcept(card, nowIso(), topicId));
  return { topic, concepts };
}

const nowIso = () => new Date().toISOString();

function getTopicCacheKey(subjectId: string, topicId: string) {
  return `${subjectId}/${topicId}`;
}

function buildDeck(subjectEntries: Array<{ subject: RepositorySubject; graph: SubjectGraph }>): Deck {
  const subjects: Subject[] = [];
  const topics: Topic[] = [];
  const concepts: Concept[] = [];

  subjectEntries.forEach(({ subject, graph }) => {
    const subjectId = subject.id;
    const graphNodes = graph?.nodes ?? [];
    const topicIds: string[] = [];

    for (const node of graphNodes) {
      const cachedNode = remoteTopicCache.get(getTopicCacheKey(subjectId, node.topicId));
      if (!cachedNode) {
        continue;
      }

      const topicBundle = createTopicDefinitions(
        subjectId,
        node,
        cachedNode.topicDetails,
        cachedNode.cards,
      );
      topics.push(topicBundle.topic);
      concepts.push(...topicBundle.concepts);
      topicIds.push(topicBundle.topic.id);
    }

    const subjectWithTopics = {
      ...subject,
      topicIds,
    };
    subjects.push(subjectWithTopics);
  });

  return {
    subjects,
    topics,
    concepts,
  };
}

async function fetchTopicDetails(subjectId: string, topicId: string): Promise<TopicDetails | null> {
  try {
    return await deckRepository.getTopicDetails(subjectId, topicId);
  } catch {
    return null;
  }
}

async function fetchTopicCards(subjectId: string, topicId: string): Promise<Card[]> {
  try {
    return await deckRepository.getTopicCards(subjectId, topicId);
  } catch {
    return [];
  }
}

async function loadSubject(subject: RepositorySubject): Promise<{ subject: RepositorySubject; graph: SubjectGraph }> {
  const graph = await deckRepository.getSubjectGraph(subject.id);
  return { subject, graph };
}

async function loadTopicsForSubject(subjectId: string, graph: SubjectGraph): Promise<void> {
  const nodes = graph.nodes ?? [];
  const loadOps = nodes.map(async (node) => {
    const [topicDetails, cards] = await Promise.all([
      fetchTopicDetails(subjectId, node.topicId),
      fetchTopicCards(subjectId, node.topicId),
    ]);

    remoteTopicCache.set(getTopicCacheKey(subjectId, node.topicId), { topicDetails, cards });
  });
  await Promise.all(loadOps);
}

function logDeckLoadError(topic: DeckLoadError) {
  if (typeof console !== 'undefined') {
    const suffix = topic.topicId ? `/${topic.topicId}` : '';
    console.warn(
      `[deckCatalog] ${topic.operation} failed for ${topic.subjectId}${suffix}: ${topic.message}`,
    );
  }
}

async function hydrateDeckFromRepository(): Promise<Deck> {
  remoteTopicCache.clear();
  const manifest = await deckRepository.getManifest();
  const subjects = manifest.subjects ?? [];

  const loadedSubjects = await Promise.all(
    subjects.map(async (subject: RepositorySubject) => {
      try {
        const subjectBundle = await loadSubject(subject);
        await loadTopicsForSubject(subject.id, subjectBundle.graph);
        return subjectBundle;
      } catch (error) {
        logDeckLoadError({
          subjectId: subject.id,
          operation: 'Subject bootstrap',
          message: (error as Error).message,
        });
        return {
          subject,
          graph: {
            subjectId: subject.id,
            title: subject.name,
            themeId: subject.themeId,
            maxTier: 1,
            nodes: [],
          },
        };
      }
    }),
  );

  const deckData = buildDeck(loadedSubjects);
  deckIsLoaded = true;
  cachedDeckData = deckData;

  return deckData;
}

function withFallbackDeck(deck: Deck | null): Deck {
  if (!deck) {
    return EMPTY_DECK;
  }

  return {
    subjects: deck.subjects ?? [],
    topics: deck.topics ?? [],
    concepts: deck.concepts ?? [],
  };
}

export function isDeckDataLoaded(): boolean {
  return deckIsLoaded;
}

export async function ensureDeckData(): Promise<Deck> {
  if (deckIsLoaded) {
    return cachedDeckData;
  }

  if (deckLoadPromise) {
    return deckLoadPromise;
  }

  deckLoadPromise = (async () => {
    try {
      const loaded = await hydrateDeckFromRepository();
      return withFallbackDeck(loaded);
    } catch (error) {
      logDeckLoadError({
        subjectId: 'unknown',
        operation: 'Deck bootstrap',
        message: (error as Error).message,
      });
      return withFallbackDeck(cachedDeckData);
    } finally {
      deckLoadPromise = null;
    }
  })();

  return deckLoadPromise;
}

export function getDeckData() {
  return cachedDeckData;
}

export function setDeckDataForTests(deck: Deck): void {
  cachedDeckData = withFallbackDeck(deck);
  deckIsLoaded = true;
  remoteTopicCache.clear();
  deckLoadPromise = Promise.resolve(cachedDeckData);
}

export const INITIAL_UNLOCK_POINTS = 3;
