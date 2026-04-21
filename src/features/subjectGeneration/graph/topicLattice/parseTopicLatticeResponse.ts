import { extractJsonString, logJsonParseError } from '@/lib/llmResponseText';
import type { TopicLattice } from '@/types/topicLattice';

import { topicLatticeResponseSchema } from './topicLatticeSchema';

export type ParseTopicLatticeResult = { ok: true; lattice: TopicLattice } | { ok: false; error: string };

export function parseTopicLatticeResponse(raw: string): ParseTopicLatticeResult {
  const jsonStr = extractJsonString(raw);
  if (!jsonStr) {
    return { ok: false, error: 'No JSON found in assistant response' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr) as unknown;
  } catch (e) {
    logJsonParseError('parseTopicLatticeResponse', e, jsonStr);
    return { ok: false, error: 'Assistant response is not valid JSON' };
  }

  const result = topicLatticeResponseSchema.safeParse(parsed);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path?.length ? issue.path.join('.') : 'root';
    return { ok: false, error: `Invalid topic lattice schema at ${path}: ${issue?.message ?? 'unknown'}` };
  }

  return { ok: true, lattice: { topics: result.data.topics } };
}
