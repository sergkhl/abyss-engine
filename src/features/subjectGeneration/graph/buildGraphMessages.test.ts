import { describe, expect, it } from 'vitest';

import type { GraphStrategy } from '@/types/generationStrategy';

import { buildGraphMessages } from './buildGraphMessages';

describe('buildGraphMessages', () => {
  const strategy: GraphStrategy = {
    totalTiers: 3,
    topicsPerTier: 5,
    audienceBrief: 'Audience paragraph.',
    domainBrief: 'Machine learning',
    focusConstraints: '',
  };

  it('includes domain and audience in system message', () => {
    const msgs = buildGraphMessages('my-subject', strategy);
    expect(msgs[0].role).toBe('system');
    const sys = typeof msgs[0].content === 'string' ? msgs[0].content : '';
    expect(sys).toContain('my-subject');
    expect(sys).toContain('Machine learning');
    expect(sys).toContain('Audience paragraph.');
    expect(sys).toContain('15');
  });

  it('puts focus constraints in user message when non-empty', () => {
    const msgs = buildGraphMessages('s', { ...strategy, focusConstraints: 'Only transformers' });
    expect(msgs[1].role).toBe('user');
    const user = typeof msgs[1].content === 'string' ? msgs[1].content : '';
    expect(user).toContain('Only transformers');
  });

  it('uses default user prompt when focus empty', () => {
    const msgs = buildGraphMessages('s', strategy);
    const user = typeof msgs[1].content === 'string' ? msgs[1].content : '';
    expect(user).toBe('Generate the curriculum graph now.');
  });
});
