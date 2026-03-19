import { describe, expect, it } from 'vitest';

import { stripTheoryMarkdownForSpeech } from './theorySpeech';

describe('stripTheoryMarkdownForSpeech', () => {
  it('removes markdown syntax while preserving readable wording', () => {
    const source = `
# Theory of Arrays

Explain **concepts** and \`syntax\` used in this section.

- Item one
- Item two with [link text](https://example.com)
  1. Ordered item

Inline math: $a^2 + b^2 = c^2$ and block:

$$
\\frac{1}{2} + \\frac{1}{2} = 1
$$
`;

    expect(stripTheoryMarkdownForSpeech(source)).toBe(
      'Theory of Arrays Explain concepts and syntax used in this section. Item one Item two with link text Ordered item Inline math: a^2 + b^2 = c^2 and block: \\frac{1}{2} + \\frac{1}{2} = 1',
    );
  });

  it('strips emojis, bullets, and markdown decorations from mixed input', () => {
    const source = '### 🧠 Notes\n> Keep this brief.\n- Use markdown for formatting.\n*Emphasized* and __strong__ values.';

    expect(stripTheoryMarkdownForSpeech(source)).toBe('🧠 Notes Keep this brief. Use markdown for formatting. Emphasized and strong values.');
  });

  it('handles empty source safely', () => {
    expect(stripTheoryMarkdownForSpeech('')).toBe('');
    expect(stripTheoryMarkdownForSpeech('   ')).toBe('');
  });
});
