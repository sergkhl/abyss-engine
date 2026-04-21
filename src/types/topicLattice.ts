/**
 * Stage-A curriculum output: topics and tiers only (no prerequisite edges).
 * Used by subject graph generation and telemetry payloads.
 */

export interface TopicLatticeNode {
  topicId: string;
  title: string;
  tier: number;
  learningObjective: string;
}

export interface TopicLattice {
  topics: TopicLatticeNode[];
}
