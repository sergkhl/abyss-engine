import type { ChatMessage } from '../../types/llm';
import formulaExplainPrompt from '../../prompts/formula-explain.prompt';
import { interpolatePromptTemplate } from './promptTemplate';

export type StudyFormulaExplainContext = 'question' | 'answer' | 'option';

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
    {
      role: 'system',
      content: interpolatePromptTemplate(formulaExplainPrompt, {
        topic,
        question,
        contextLabel: contextLabel[context],
        formula,
      }),
    },
  ];
}
