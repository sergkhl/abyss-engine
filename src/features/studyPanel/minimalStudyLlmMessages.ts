import type { ChatMessage } from '../../types/llm';

const MINIMAL_STUDY_TUTOR_SYSTEM =
  'You are a concise tutor. Explain the study question clearly for a learner. Use short paragraphs. If the question involves math, use plain language or standard notation where helpful.';

export function buildMinimalStudyQuestionMessages(topicLabel: string, questionText: string): ChatMessage[] {
  const topic = topicLabel.trim() || 'Unknown topic';
  const question = questionText.trim() || '(empty question)';

  return [
    { role: 'system', content: MINIMAL_STUDY_TUTOR_SYSTEM },
    {
      role: 'user',
      content: `Topic: ${topic}\n\nQuestion:\n${question}`,
    },
  ];
}
