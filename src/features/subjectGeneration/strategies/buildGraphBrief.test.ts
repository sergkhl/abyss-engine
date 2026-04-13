import { describe, expect, it } from 'vitest';

import { buildGraphBrief } from './buildGraphBrief';

describe('buildGraphBrief', () => {
  it('includes topic name and tier structure', () => {
    const s = buildGraphBrief({
      goal: 'curiosity',
      knowledge: 'none',
      style: 'balanced',
      topicName: 'Rust async',
    });
    expect(s).toContain('Rust async');
    expect(s).toContain('three tiers');
  });

  it('reflects exam-prep goal', () => {
    const s = buildGraphBrief({
      goal: 'exam-prep',
      knowledge: 'intermediate',
      style: 'theory-heavy',
      topicName: 'X',
    });
    expect(s.toLowerCase()).toMatch(/exam/);
  });
});
