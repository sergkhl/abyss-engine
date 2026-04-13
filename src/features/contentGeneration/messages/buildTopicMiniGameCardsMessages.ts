import type { ChatMessage } from '@/types/llm';
import topicMiniGameCardsTemplate from '@/prompts/topic-mini-game-cards.prompt';
import { appendContentBriefToSystem } from '@/lib/appendContentBriefToSystem';
import { interpolatePromptTemplate } from '@/lib/interpolatePromptTemplate';

export interface TopicMiniGameCardsPromptParams {
  topicId: string;
  topicTitle: string;
  theory: string;
  difficulty1Questions: string;
  contentBrief?: string;
}

export function buildTopicMiniGameCardsMessages(params: TopicMiniGameCardsPromptParams): ChatMessage[] {
  const systemContent = appendContentBriefToSystem(
    interpolatePromptTemplate(topicMiniGameCardsTemplate, {
      topicId: params.topicId,
      topicTitle: params.topicTitle,
      theory: params.theory,
      difficulty1Questions: params.difficulty1Questions,
    }),
    params.contentBrief,
  );

  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: 'Output only the JSON object with the cards array.' },
  ];
}
