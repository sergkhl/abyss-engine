import { describe, expect, it } from 'vitest';

import { buildMinimalStudyQuestionMessages } from './minimalStudyLlmMessages';

describe('buildMinimalStudyQuestionMessages', () => {
  it('returns a single system message with topic and question', () => {
    const messages = buildMinimalStudyQuestionMessages('Linear algebra', 'What is an eigenvector?');
    expect(messages).toHaveLength(1);
    expect(messages[0]!.role).toBe('system');
    const content = messages[0]!.content;
    expect(content.length).toBeGreaterThan(20);
    expect(content).toContain('Topic: Linear algebra');
    expect(content).toContain('What is an eigenvector?');
  });

  it('falls back for blank topic and question', () => {
    const content = buildMinimalStudyQuestionMessages('  ', '')[0]!.content;
    expect(content).toContain('Unknown topic');
    expect(content).toContain('(empty question)');
  });
});
