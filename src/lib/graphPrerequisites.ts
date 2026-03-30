/**
 * Normalizes curriculum graph prerequisite entries from JSON.
 * Strings default to minLevel 1 (legacy graphs).
 */

import type { GraphPrerequisiteEntry } from '@/types/core';

export interface NormalizedGraphPrerequisite {
  topicId: string;
  minLevel: number;
}

export function normalizeGraphPrerequisites(
  raw: GraphPrerequisiteEntry[] | undefined | null,
): NormalizedGraphPrerequisite[] {
  if (!raw?.length) {
    return [];
  }
  const out: NormalizedGraphPrerequisite[] = [];
  for (const entry of raw) {
    if (typeof entry === 'string') {
      out.push({ topicId: entry, minLevel: 1 });
    } else {
      out.push({ topicId: entry.topicId, minLevel: entry.minLevel });
    }
  }
  return out;
}
