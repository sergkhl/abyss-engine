import { describe, expect, it } from 'vitest';

import { normalizeGraphPrerequisites } from './graphPrerequisites';

describe('normalizeGraphPrerequisites', () => {
  it('defaults string entries to minLevel 1', () => {
    expect(normalizeGraphPrerequisites(['a', 'b'])).toEqual([
      { topicId: 'a', minLevel: 1 },
      { topicId: 'b', minLevel: 1 },
    ]);
  });

  it('preserves object entries', () => {
    expect(
      normalizeGraphPrerequisites([
        { topicId: 'x', minLevel: 3 },
        'y',
      ]),
    ).toEqual([
      { topicId: 'x', minLevel: 3 },
      { topicId: 'y', minLevel: 1 },
    ]);
  });

  it('returns empty for nullish or empty', () => {
    expect(normalizeGraphPrerequisites(undefined)).toEqual([]);
    expect(normalizeGraphPrerequisites(null)).toEqual([]);
    expect(normalizeGraphPrerequisites([])).toEqual([]);
  });
});
