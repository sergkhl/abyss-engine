import { describe, expect, it } from 'vitest';

import { extractCompleteSpeechChunks, stripLlmMarkdownForSpeech } from './llmSpeech';

describe('stripLlmMarkdownForSpeech', () => {
  it('delegates to theory stripper', () => {
    expect(stripLlmMarkdownForSpeech('**Bold** and `code`.')).toBe('Bold and code.');
  });
});

describe('extractCompleteSpeechChunks', () => {
  it('returns empty when delta is only incomplete sentence', () => {
    expect(extractCompleteSpeechChunks('Hello wor')).toEqual({
      chunks: [],
      remainder: 'Hello wor',
    });
  });

  it('extracts line at newline and leaves remainder', () => {
    expect(extractCompleteSpeechChunks('First line\nSecond')).toEqual({
      chunks: ['First line'],
      remainder: 'Second',
    });
  });

  it('extracts multiple newline-separated lines', () => {
    expect(extractCompleteSpeechChunks('A\nB\n')).toEqual({
      chunks: ['A', 'B'],
      remainder: '',
    });
  });

  it('extracts sentence without newline', () => {
    expect(extractCompleteSpeechChunks('Hello world. Next')).toEqual({
      chunks: ['Hello world.'],
      remainder: 'Next',
    });
  });

  it('extracts sentence at end of string', () => {
    expect(extractCompleteSpeechChunks('Done.')).toEqual({
      chunks: ['Done.'],
      remainder: '',
    });
  });

  it('prefers newlines before sentence split', () => {
    expect(extractCompleteSpeechChunks('Line one.\nStill line two')).toEqual({
      chunks: ['Line one.'],
      remainder: 'Still line two',
    });
  });

  it('splits raw markdown so strip can run per chunk (streaming-safe)', () => {
    const delta = 'This is **bold** text.\n- List item.';
    const { chunks, remainder } = extractCompleteSpeechChunks(delta);
    expect(chunks).toEqual(['This is **bold** text.', '- List item.']);
    expect(remainder).toBe('');
  });
});
