import { describe, expect, it } from 'vitest';

import { buildFormulaExplainMessages } from './formulaExplainLlmMessages';

describe('buildFormulaExplainMessages', () => {
  it('returns a single system message with topic, question, context, and LaTeX', () => {
    const messages = buildFormulaExplainMessages(
      'Statistics',
      'What is the variance?',
      String.raw`\sigma^2 = \mathbb{E}[(X-\mu)^2]`,
      'question',
    );
    expect(messages).toHaveLength(1);
    expect(messages[0]!.role).toBe('system');
    const content = messages[0]!.content;
    expect(content.length).toBeGreaterThan(40);
    expect(content).toContain('Topic: Statistics');
    expect(content).toContain('What is the variance?');
    expect(content).toContain('card question');
    expect(content).toContain(String.raw`\sigma^2`);
    expect(content).toContain('What does this formula mean?');
  });

  it('labels answer and option contexts', () => {
    const answerContent = buildFormulaExplainMessages('T', 'Q', 'x', 'answer')[0]!.content;
    expect(answerContent).toContain('revealed answer');

    const optionContent = buildFormulaExplainMessages('T', 'Q', 'x', 'option')[0]!.content;
    expect(optionContent).toContain('multiple-choice');
  });

  it('falls back for blank topic, question, and formula', () => {
    const content = buildFormulaExplainMessages('  ', '', '  ', 'question')[0]!.content;
    expect(content).toContain('Unknown topic');
    expect(content).toContain('(empty question)');
    expect(content).toContain('(empty formula)');
  });
});
