import type { ChatMessage } from '../../types/llm';
import minimalStudyPrompt from '../../prompts/minimal-study.prompt';
import { interpolatePromptTemplate } from './promptTemplate';

export function buildMinimalStudyQuestionMessages(topicLabel: string, questionText: string): ChatMessage[] {
  const topic = topicLabel.trim() || 'Unknown topic';
  const question = questionText.trim() || '(empty question)';

  return [
    {
      role: 'system',
      content: interpolatePromptTemplate(minimalStudyPrompt, { topic, question }),
    },
  ];
}
