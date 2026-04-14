import type { CardRef, TopicRef } from '@/types/core';

const TOPIC_KEY_SEP = '::';

export function topicRefKey(ref: TopicRef): string {
  return `${ref.subjectId}${TOPIC_KEY_SEP}${ref.topicId}`;
}

export function parseTopicRefKey(key: string): TopicRef {
  const idx = key.indexOf(TOPIC_KEY_SEP);
  if (idx <= 0 || idx === key.length - 2) {
    throw new Error(`Invalid topicRefKey: "${key}"`);
  }
  return {
    subjectId: key.slice(0, idx),
    topicId: key.slice(idx + TOPIC_KEY_SEP.length),
  };
}

export function topicRefsEqual(a: TopicRef, b: TopicRef): boolean {
  return a.subjectId === b.subjectId && a.topicId === b.topicId;
}

export function cardRefKey(ref: CardRef): string {
  return `${topicRefKey({ subjectId: ref.subjectId, topicId: ref.topicId })}${TOPIC_KEY_SEP}${ref.cardId}`;
}

export function parseCardRefKey(key: string): CardRef {
  const idx = key.lastIndexOf(TOPIC_KEY_SEP);
  if (idx <= 0) {
    throw new Error(`Invalid cardRefKey: "${key}"`);
  }
  const cardId = key.slice(idx + TOPIC_KEY_SEP.length);
  const topicPart = key.slice(0, idx);
  const { subjectId, topicId } = parseTopicRefKey(topicPart);
  return { subjectId, topicId, cardId };
}

export function cardRefFromParts(subjectId: string, topicId: string, cardId: string): CardRef {
  return { subjectId, topicId, cardId };
}
