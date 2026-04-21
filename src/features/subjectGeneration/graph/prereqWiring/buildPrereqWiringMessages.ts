import type { ChatMessage } from '@/types/llm';
import type { GraphStrategy } from '@/types/generationStrategy';
import type { TopicLattice } from '@/types/topicLattice';
import subjectGraphEdgesPrompt from '@/prompts/subject-graph-edges.prompt';
import { interpolatePromptTemplate } from '@/lib/interpolatePromptTemplate';

function formatIdList(title: string, ids: string[]): string {
  if (ids.length === 0) return `${title}\n  (none)`;
  return `${title}\n${ids.map((id) => `    - ${id}`).join('\n')}`;
}

export function buildPrereqWiringMessages(
  subjectId: string,
  subjectTitle: string,
  strategy: GraphStrategy,
  lattice: TopicLattice,
): ChatMessage[] {
  const tier1 = lattice.topics.filter((t) => t.tier === 1).map((t) => t.topicId);
  const tier2 = lattice.topics.filter((t) => t.tier === 2).map((t) => t.topicId);
  const tier3 = lattice.topics.filter((t) => t.tier === 3).map((t) => t.topicId);

  const tier3Pair =
    tier3.length >= 2
      ? `CONCRETE NEGATIVE EXAMPLE FOR THIS LATTICE:
  DO NOT list "${tier3[0]}" as a prerequisite of "${tier3[1]}".
  Both are tier 3; same-tier prerequisite edges are forbidden.`
      : `CONCRETE NEGATIVE EXAMPLE: do not connect two tier-3 topics as prerequisite and dependent—same tier is forbidden.`;

  const latticeBlock = [
    'Lattice (authoritative):',
    formatIdList('  Tier 1 ids (permitted as prerequisites for tier 2 only):', tier1),
    formatIdList('  Tier 2 ids (keys in edges; prerequisites for tier 2 may only be tier 1):', tier2),
    formatIdList('  Tier 3 ids (keys in edges; prerequisites may be tier 1 and tier 2, never tier 3):', tier3),
    '',
    'Required output shape:',
    '  { "edges": { "<topicId>": [ "<prereqId>" | { "topicId":"<prereqId>", "minLevel": int } ], ... } }',
    '',
    'Rules:',
    '  - The `edges` map MUST contain every tier 2 id and every tier 3 id as keys.',
    '  - Tier 1 ids MUST NOT appear as keys.',
    '  - Values for a tier 2 key may reference only tier 1 ids.',
    '  - Values for a tier 3 key must reference at least one tier 2 id; may also reference tier 1 ids.',
    '  - NEVER include a tier 3 id in any value array.',
    '',
    tier3Pair,
  ].join('\n');

  const systemIntro = interpolatePromptTemplate(subjectGraphEdgesPrompt, {
    subjectId,
    subjectTitle,
    audience: strategy.audienceBrief,
    domainDescription: strategy.domainBrief,
  });

  const systemContent = `${systemIntro}\n\n${latticeBlock}`;

  const userContent = strategy.focusConstraints.trim()
    ? `Additional constraints from the learner:\n${strategy.focusConstraints}\n\nOutput only the JSON edges object as specified.`
    : 'Output only the JSON edges object as specified.';

  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: userContent },
  ];
}
