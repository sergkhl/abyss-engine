import type { ChatMessage } from '@/types/llm';
import topicExpansionCardsTemplate from '@/prompts/topic-expansion-cards.prompt';
import { appendContentBriefToSystem } from '@/lib/appendContentBriefToSystem';
import { interpolatePromptTemplate } from '@/lib/interpolatePromptTemplate';

export interface TopicExpansionCardsPromptParams {
  topicId: string;
  topicTitle: string;
  theoryExcerpt: string;
  syllabusQuestions: string;
  difficulty: number;
  contentBrief?: string;
}

export function buildTopicExpansionCardsMessages(params: TopicExpansionCardsPromptParams): ChatMessage[] {
  const systemContent = appendContentBriefToSystem(
    interpolatePromptTemplate(topicExpansionCardsTemplate, {
      topicId: params.topicId,
      topicTitle: params.topicTitle,
      theoryExcerpt: params.theoryExcerpt,
      syllabusQuestions: params.syllabusQuestions,
      difficulty: String(params.difficulty),
    }),
    params.contentBrief,
  );

  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: 'Output only the JSON object with the cards array.' },
  ];
}
