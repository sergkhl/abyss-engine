import type { TopicLattice } from '@/types/topicLattice';

export interface TopicLatticeValidationExpectations {
  maxTier: number;
  topicsPerTier: number;
}

export type ValidateTopicLatticeResult = { ok: true } | { ok: false; error: string };

export function validateTopicLattice(
  lattice: TopicLattice,
  expectations: TopicLatticeValidationExpectations,
): ValidateTopicLatticeResult {
  const expectedTotal = expectations.maxTier * expectations.topicsPerTier;
  if (lattice.topics.length !== expectedTotal) {
    return {
      ok: false,
      error: `Expected ${expectedTotal} topics, got ${lattice.topics.length}`,
    };
  }

  const seen = new Set<string>();
  for (const node of lattice.topics) {
    if (seen.has(node.topicId)) {
      return { ok: false, error: `Duplicate topicId: ${node.topicId}` };
    }
    seen.add(node.topicId);
    if (node.tier < 1 || node.tier > expectations.maxTier) {
      return {
        ok: false,
        error: `Invalid tier ${node.tier} for topic ${node.topicId} (maxTier ${expectations.maxTier})`,
      };
    }
  }

  const countsByTier = new Map<number, number>();
  for (const node of lattice.topics) {
    countsByTier.set(node.tier, (countsByTier.get(node.tier) ?? 0) + 1);
  }
  for (let t = 1; t <= expectations.maxTier; t += 1) {
    const count = countsByTier.get(t) ?? 0;
    if (count !== expectations.topicsPerTier) {
      return {
        ok: false,
        error: `Tier ${t} must have exactly ${expectations.topicsPerTier} topics, got ${count}`,
      };
    }
  }

  return { ok: true };
}
