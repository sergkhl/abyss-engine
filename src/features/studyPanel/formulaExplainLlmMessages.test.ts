import { describe, expect, it } from 'vitest';

import { buildFormulaExplainMessages } from './formulaExplainLlmMessages';

describe('buildFormulaExplainMessages', () => {
  it('returns system and user messages with topic, question, context, and LaTeX', () => {
    const messages = buildFormulaExplainMessages(
      'Statistics',
      'What is the variance?',
      String.raw`\sigma^2 = \mathbb{E}[(X-\mu)^2]`,
      'question',
    );
    expect(messages).toHaveLength(2);
    expect(messages[0]!.role).toBe('system');
    expect(messages[0]!.content.length).toBeGreaterThan(40);
    expect(messages[1]!.role).toBe('user');
    expect(messages[1]!.content).toContain('Topic: Statistics');
    expect(messages[1]!.content).toContain('What is the variance?');
    expect(messages[1]!.content).toContain('card question');
    expect(messages[1]!.content).toContain(String.raw`\sigma^2`);
    expect(messages[1]!.content).toContain('What does this formula mean?');
  });

  it('labels answer and option contexts', () => {
    const answerMsg = buildFormulaExplainMessages('T', 'Q', 'x', 'answer')[1]!.content;
    expect(answerMsg).toContain('revealed answer');

    const optionMsg = buildFormulaExplainMessages('T', 'Q', 'x', 'option')[1]!.content;
    expect(optionMsg).toContain('multiple-choice');
  });

  it('falls back for blank topic, question, and formula', () => {
    const messages = buildFormulaExplainMessages('  ', '', '  ', 'question');
    expect(messages[1]!.content).toContain('Unknown topic');
    expect(messages[1]!.content).toContain('(empty question)');
    expect(messages[1]!.content).toContain('(empty formula)');
  });
});
