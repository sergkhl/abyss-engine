import { z } from 'zod';

import type { GraphPrerequisiteEntry } from '@/types/core';
import type { TopicLattice } from '@/types/topicLattice';

/**
 * Prereq wiring schema — validated **after** deterministic repair (`correctPrereqEdges`).
 *
 * Invalid LLM edges are stripped and missing required tiers are filled by lattice order (see
 * CLAUDE.md — Curriculum prerequisite edges). This Zod schema is the strict gate on the
 * **repaired** graph only.
 *
 * REJECTED (still): accepting empty prerequisite arrays without repair — that would bypass the
 * lattice invariant (Tier 3 ≥1 tier-2 prereq; Tier 2 ≥1 tier-1 prereq).
 */

const prereqEntrySchema = z.union([
  z.string().min(1),
  z.object({
    topicId: z.string().min(1),
    minLevel: z.number().int().min(1),
  }),
]);

function prereqTopicId(entry: GraphPrerequisiteEntry): string {
  return typeof entry === 'string' ? entry : entry.topicId;
}

/**
 * Lattice-aware schema: keys are exactly tier-2 and tier-3 topic ids; values respect tier allow-lists.
 * Same-tier or higher-tier prerequisites are rejected (no downstream mutation).
 */
export function buildPrereqEdgesSchema(lattice: TopicLattice) {
  const tierById = new Map<string, number>();
  const tier1 = new Set<string>();
  const tier2 = new Set<string>();
  const tier3 = new Set<string>();
  for (const t of lattice.topics) {
    tierById.set(t.topicId, t.tier);
    if (t.tier === 1) tier1.add(t.topicId);
    else if (t.tier === 2) tier2.add(t.topicId);
    else if (t.tier === 3) tier3.add(t.topicId);
  }

  const requiredKeys = new Set<string>([...tier2, ...tier3]);

  return z
    .object({
      edges: z.record(z.string(), z.array(prereqEntrySchema)),
    })
    .superRefine((data, ctx) => {
      const keys = Object.keys(data.edges);
      const keySet = new Set(keys);

      for (const id of tier1) {
        if (keySet.has(id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Tier 1 topic "${id}" must not appear as a key in edges`,
            path: ['edges', id],
          });
        }
      }

      for (const k of requiredKeys) {
        if (!keySet.has(k)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Missing edges entry for required topic "${k}"`,
            path: ['edges'],
          });
        }
      }

      for (const k of keys) {
        if (!requiredKeys.has(k)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Unexpected edges key "${k}" (only tier 2 and tier 3 topic ids are allowed)`,
            path: ['edges', k],
          });
        }
      }

      for (const topicId of keys) {
        const tier = tierById.get(topicId);
        if (tier === undefined) continue;

        const prereqs = data.edges[topicId] ?? [];

        if (tier === 2) {
          for (let i = 0; i < prereqs.length; i += 1) {
            const pid = prereqTopicId(prereqs[i]!);
            if (!tier1.has(pid)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Tier 2 topic "${topicId}" may only reference tier-1 prerequisites; got "${pid}"`,
                path: ['edges', topicId, i],
              });
            }
          }
        }

        if (tier === 3) {
          if (prereqs.length === 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Tier 3 topic "${topicId}" must list at least one prerequisite`,
              path: ['edges', topicId],
            });
          }
          let hasTier2 = false;
          for (let i = 0; i < prereqs.length; i += 1) {
            const pid = prereqTopicId(prereqs[i]!);
            const pt = tierById.get(pid);
            if (pt === undefined) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Unknown prerequisite "${pid}" for topic "${topicId}"`,
                path: ['edges', topicId, i],
              });
              continue;
            }
            if (pt >= tier) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Prerequisite "${pid}" (tier ${pt}) must be from a lower tier than "${topicId}" (tier ${tier})`,
                path: ['edges', topicId, i],
              });
            }
            if (tier3.has(pid)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Tier 3 topic "${topicId}" must not list another tier-3 topic "${pid}" as a prerequisite`,
                path: ['edges', topicId, i],
              });
            }
            if (pt === 2) hasTier2 = true;
          }
          if (prereqs.length > 0 && !hasTier2) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Tier 3 topic "${topicId}" must include at least one prerequisite from tier 2`,
              path: ['edges', topicId],
            });
          }
        }
      }
    });
}

export type PrereqEdges = Record<string, GraphPrerequisiteEntry[]>;
