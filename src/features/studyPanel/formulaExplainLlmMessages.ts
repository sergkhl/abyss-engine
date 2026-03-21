import type { ChatMessage } from '../../types/llm';

export type StudyFormulaExplainContext = 'question' | 'answer' | 'option';

const FORMULA_TUTOR_SYSTEM =
  'You are a concise tutor. The learner tapped a formula on a study card. Explain what it means in plain language: what quantities or relationships it expresses, what each symbol typically denotes, and how it relates to the card question. Use short paragraphs. If helpful, restate the formula in words.';

const contextLabel: Record<StudyFormulaExplainContext, string> = {
  question: 'The formula appears in the card question.',
  answer: 'The formula appears on the revealed answer side of the card.',
  option: 'The formula appears in one of the multiple-choice options.',
};

export function buildFormulaExplainMessages(
  topicLabel: string,
  cardQuestionPlainText: string,
  latex: string,
  context: StudyFormulaExplainContext,
): ChatMessage[] {
  const topic = topicLabel.trim() || 'Unknown topic';
  const question = cardQuestionPlainText.trim() || '(empty question)';
  const formula = latex.trim() || '(empty formula)';

  return [
    { role: 'system', content: FORMULA_TUTOR_SYSTEM },
    {
      role: 'user',
      content: `Topic: ${topic}\n\nCard question (for context):\n${question}\n\n${contextLabel[context]}\n\nLaTeX formula:\n${formula}\n\nWhat does this formula mean?`,
    },
  ];
}
