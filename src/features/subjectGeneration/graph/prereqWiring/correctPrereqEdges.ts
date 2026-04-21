import type { GraphPrerequisiteEntry } from '@/types/core';
import type { TopicLattice } from '@/types/topicLattice';

import type { PrereqEdges } from './prereqWiringSchema';

/** Deterministic prerequisite repair applied before strict schema validation (see CLAUDE.md). */
export type PrereqEdgesCorrectionLog = {
  removed: Array<{ topicId: string; prereqId: string; reason: string }>;
  added: Array<{ topicId: string; prereqId: string; kind: 'filler-tier1' | 'filler-tier2' }>;
};

function prereqTopicId(entry: GraphPrerequisiteEntry): string {
  return typeof entry === 'string' ? entry : entry.topicId;
}

function normalizeEntry(raw: unknown): GraphPrerequisiteEntry | null {
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (typeof raw === 'object' && raw !== null && 'topicId' in raw) {
    const topicId = (raw as { topicId: unknown }).topicId;
    if (typeof topicId !== 'string' || !topicId.trim()) return null;
    const tid = topicId.trim();
    const ml = (raw as { minLevel?: unknown }).minLevel;
    if (typeof ml === 'number' && Number.isInteger(ml) && ml >= 1) {
      return { topicId: tid, minLevel: ml };
    }
    return tid;
  }
  return null;
}

function dedupePreservingOrder(entries: GraphPrerequisiteEntry[]): GraphPrerequisiteEntry[] {
  const seen = new Set<string>();
  const out: GraphPrerequisiteEntry[] = [];
  for (const e of entries) {
    const id = prereqTopicId(e);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(e);
  }
  return out;
}

/**
 * Removes invalid prerequisite entries and applies deterministic fillers so the graph
 * satisfies lattice tier rules (see `buildPrereqEdgesSchema`).
 */
export function correctPrereqEdges(
  lattice: TopicLattice,
  rawEdges: Record<string, unknown>,
): { edges: PrereqEdges; correction: PrereqEdgesCorrectionLog } {
  const tierById = new Map<string, number>();
  const tier1 = new Set<string>();
  const tier2 = new Set<string>();
  const tier3 = new Set<string>();
  const tier1Ordered: string[] = [];
  const tier2Ordered: string[] = [];

  for (const t of lattice.topics) {
    tierById.set(t.topicId, t.tier);
    if (t.tier === 1) {
      tier1.add(t.topicId);
      tier1Ordered.push(t.topicId);
    } else if (t.tier === 2) {
      tier2.add(t.topicId);
      tier2Ordered.push(t.topicId);
    } else if (t.tier === 3) {
      tier3.add(t.topicId);
    }
  }

  const firstTier1 = tier1Ordered[0];
  const firstTier2 = tier2Ordered[0];

  const requiredKeys = new Set<string>([...tier2, ...tier3]);

  const removed: PrereqEdgesCorrectionLog['removed'] = [];
  const added: PrereqEdgesCorrectionLog['added'] = [];

  const edges: PrereqEdges = {};

  for (const topicId of requiredKeys) {
    const tier = tierById.get(topicId);
    if (tier === undefined) continue;

    const rawVal = rawEdges[topicId];
    const rawArr = Array.isArray(rawVal) ? rawVal : [];

    let entries: GraphPrerequisiteEntry[] = [];
    for (const item of rawArr) {
      const norm = normalizeEntry(item);
      if (!norm) {
        removed.push({
          topicId,
          prereqId: typeof item === 'string' ? item : JSON.stringify(item),
          reason: 'unrecognized prerequisite entry shape',
        });
        continue;
      }
      entries.push(norm);
    }

    entries = dedupePreservingOrder(entries);

    if (tier === 2) {
      const filtered: GraphPrerequisiteEntry[] = [];
      for (const e of entries) {
        const pid = prereqTopicId(e);
        if (!tier1.has(pid)) {
          removed.push({
            topicId,
            prereqId: pid,
            reason: tierById.has(pid)
              ? `tier-2 topic may only list tier-1 prerequisites (got tier ${tierById.get(pid)})`
              : 'unknown topic id',
          });
          continue;
        }
        filtered.push(e);
      }
      entries = filtered;

      if (entries.length === 0 && firstTier1) {
        entries.push(firstTier1);
        added.push({ topicId, prereqId: firstTier1, kind: 'filler-tier1' });
      }
    }

    if (tier === 3) {
      const filtered: GraphPrerequisiteEntry[] = [];
      for (const e of entries) {
        const pid = prereqTopicId(e);
        const pt = tierById.get(pid);
        if (pt === undefined) {
          removed.push({ topicId, prereqId: pid, reason: 'unknown topic id' });
          continue;
        }
        if (pt >= tier) {
          removed.push({
            topicId,
            prereqId: pid,
            reason: `prerequisite tier ${pt} must be lower than dependent tier ${tier}`,
          });
          continue;
        }
        if (tier3.has(pid)) {
          removed.push({
            topicId,
            prereqId: pid,
            reason: 'tier-3 topics must not appear as prerequisites',
          });
          continue;
        }
        filtered.push(e);
      }
      entries = dedupePreservingOrder(filtered);

      const hasTier2 = entries.some((e) => tier2.has(prereqTopicId(e)));
      if (!hasTier2 && firstTier2) {
        entries.push(firstTier2);
        added.push({ topicId, prereqId: firstTier2, kind: 'filler-tier2' });
      }

      entries = dedupePreservingOrder(entries);
    }

    edges[topicId] = entries;
  }

  return { edges, correction: { removed, added } };
}
