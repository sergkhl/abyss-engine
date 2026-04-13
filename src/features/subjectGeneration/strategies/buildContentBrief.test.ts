import { describe, expect, it } from 'vitest';

import { buildContentBrief } from './buildContentBrief';

describe('buildContentBrief', () => {
  it('includes topic name', () => {
    const s = buildContentBrief({
      goal: 'curiosity',
      knowledge: 'beginner',
      style: 'practice-heavy',
      topicName: 'Linear algebra',
    });
    expect(s).toContain('Linear algebra');
  });

  it('mentions practice-heavy style', () => {
    const s = buildContentBrief({
      goal: 'refresh',
      knowledge: 'advanced',
      style: 'practice-heavy',
      topicName: 'Y',
    });
    expect(s.toLowerCase()).toMatch(/practice|interactive|applied/);
  });
});
