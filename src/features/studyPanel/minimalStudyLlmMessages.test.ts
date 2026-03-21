import { describe, expect, it } from 'vitest';

import { buildMinimalStudyQuestionMessages } from './minimalStudyLlmMessages';

describe('buildMinimalStudyQuestionMessages', () => {
  it('returns system and user messages with topic and question', () => {
    const messages = buildMinimalStudyQuestionMessages('Linear algebra', 'What is an eigenvector?');
    expect(messages).toHaveLength(2);
    expect(messages[0]!.role).toBe('system');
    expect(messages[0]!.content.length).toBeGreaterThan(20);
    expect(messages[1]!.role).toBe('user');
    expect(messages[1]!.content).toContain('Topic: Linear algebra');
    expect(messages[1]!.content).toContain('What is an eigenvector?');
  });

  it('falls back for blank topic and question', () => {
    const messages = buildMinimalStudyQuestionMessages('  ', '');
    expect(messages[1]!.content).toContain('Unknown topic');
    expect(messages[1]!.content).toContain('(empty question)');
  });
});
