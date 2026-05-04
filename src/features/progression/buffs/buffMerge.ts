/**
 * Buff merge primitives.
 *
 * Both `dedupeBuffsById` and `normalizeActiveBuffs` previously appeared as
 * private duplicates in three call sites:
 *
 *   - `stores/buffStore.ts`                       (dev XP-buff toggle)
 *   - `orchestrators/studySessionOrchestrator.ts` (ritual flow)
 *   - `orchestrators/crystalGardenOrchestrator.ts` (boot-time pruning)
 *
 * Centralizing them removes the soft-fallback risk: any future change to
 * the dedupe key, the `session_end` filter, or the hydration step now
 * flows through one module instead of three.
 *
 * Pure functions; no React, no Zustand, no event bus.
 */

import type { Buff } from '@/types/progression';

import { BuffEngine } from './buffEngine';

/**
 * Dedupe buffs by `(buffId | source | condition)`. Keeps the LAST
 * occurrence for each key so callers concatenating
 * `[...current, ...incoming]` end up with the freshly-granted buff
 * over a stale one. Iterates in reverse so the Set membership test is
 * "have I already kept a later entry for this key?", then reverses
 * the accumulator to restore original ordering.
 */
export function dedupeBuffsById(buffs: Buff[]): Buff[] {
	const seen = new Set<string>();
	const deduped: Buff[] = [];
	for (let index = buffs.length - 1; index >= 0; index -= 1) {
		const buff = buffs[index];
		const dedupeKey = !buff
			? ''
			: `${buff.buffId}|${buff.source ?? 'unknown'}|${buff.condition}`;
		if (!buff || seen.has(dedupeKey)) {
			continue;
		}
		seen.add(dedupeKey);
		deduped.push(buff);
	}
	return deduped.reverse();
}

/**
 * Hydrate the prior set, drop session-scoped buffs that have not yet
 * been consumed, hydrate the incoming buffs, concatenate, and dedupe.
 * Used by the ritual flow and dev toggles so end-of-session buffs
 * don't accumulate and so two simultaneous grants from the same
 * `(source, condition)` collapse to one entry.
 */
export function normalizeActiveBuffs(currentBuffs: Buff[], incoming: Buff[]): Buff[] {
	const nonSession = currentBuffs
		.map((buff) => BuffEngine.get().hydrateBuff(buff))
		.filter((buff) => buff.condition !== 'session_end');
	const sanitizedIncoming = incoming.map((buff) => BuffEngine.get().hydrateBuff(buff));
	const combined = [...nonSession, ...sanitizedIncoming];
	return dedupeBuffsById(combined);
}
