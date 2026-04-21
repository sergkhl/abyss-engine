import { extractJsonString, logJsonParseError } from '@/lib/llmResponseText';
import type { TopicLattice } from '@/types/topicLattice';

import type { PrereqEdgesCorrectionLog } from './correctPrereqEdges';
import { correctPrereqEdges } from './correctPrereqEdges';
import { type PrereqEdges, buildPrereqEdgesSchema } from './prereqWiringSchema';

export type ParsePrereqWiringResult =
  | { ok: true; edges: PrereqEdges; correction: PrereqEdgesCorrectionLog }
  | { ok: false; error: string };

export function parsePrereqWiringResponse(raw: string, lattice: TopicLattice): ParsePrereqWiringResult {
  const jsonStr = extractJsonString(raw);
  if (!jsonStr) {
    return { ok: false, error: 'No JSON found in assistant response' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr) as unknown;
  } catch (e) {
    logJsonParseError('parsePrereqWiringResponse', e, jsonStr);
    return { ok: false, error: 'Assistant response is not valid JSON' };
  }

  const rawEdges =
    parsed !== null &&
    typeof parsed === 'object' &&
    'edges' in parsed &&
    (parsed as { edges: unknown }).edges !== null &&
    typeof (parsed as { edges: unknown }).edges === 'object'
      ? ((parsed as { edges: Record<string, unknown> }).edges as Record<string, unknown>)
      : {};

  const { edges: correctedEdges, correction } = correctPrereqEdges(lattice, rawEdges);

  const schema = buildPrereqEdgesSchema(lattice);
  const result = schema.safeParse({ edges: correctedEdges });
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path?.length ? issue.path.join('.') : 'root';
    return { ok: false, error: `Invalid prerequisite wiring at ${path}: ${issue?.message ?? 'unknown'}` };
  }

  return { ok: true, edges: result.data.edges as PrereqEdges, correction };
}
