/**
 * Crystal-garden orchestrator.
 *
 * Reads from the four progression stores, calls policies, writes back, and
 * emits domain events on the `appEventBus`. Owns:
 *
 *   - app-bootstrap `initialize()` (buff hydration / pruning)
 *   - `unlockTopic(ref, allGraphs)` — spawns a new crystal at the next free
 *     grid cell, charging one unlock point. Emits `crystal:unlocked`; the
 *     eventBusHandlers ceremony wiring sources isDialogOpen from the UI
 *     store and presents the spawn ceremony.
 *   - `addXP(ref, xp, options)` — direct-path XP grant (dev tools, ritual
 *     spillover, trial level-up payouts).
 *
 * Atomicity invariant: every public action's mutation phase is a single
 * synchronous block. All `setState` calls are contiguous. Events are
 * emitted only after the final write so subscribers observe a consistent
 * post-mutation state.
 *
 * `addXP` direct-path emission order:
 *   1. `xp:gained` (effective post-gating delta, if positive) —
 *      orchestrator owns this telemetry as the single direct-path
 *      emitter (fix #5 of the progression monolith verification plan).
 *      Component-level emits in `AbyssCommandPalette` are removed.
 *   2. `crystal-trial:pregeneration-requested` (if gating crossed the
 *      pregeneration threshold).
 *   3. `crystal:leveled` (if the applied delta crossed level bands).
 *
 * All three fire after the XP write. Acceptable: the bus handler for
 * `crystal-trial:pregeneration-requested` only writes to
 * `crystalTrialStore` and never reads `crystalGardenStore`, so any
 * reader sees the post-write XP value regardless. The `xp:gained`
 * handler is a passive telemetry sink.
 *
 * Buff catalog actions (`grantBuffFromCatalog` / `toggleBuffFromCatalog`)
 * are pure single-store mutations and live in `stores/buffStore.ts` helpers
 * — they are NOT part of this orchestrator (the orchestrator layer is
 * reserved for cross-store writes).
 *
 * Buff merge primitives are imported from `../buffs/buffMerge` so this
 * file, `stores/buffStore.ts`, and `orchestrators/studySessionOrchestrator.ts`
 * share a single interface (fix #4 of the progression monolith
 * verification plan).
 */

import { appEventBus } from '@/infrastructure/eventBus';
import { calculateLevelFromXP } from '@/types/crystalLevel';
import type { SubjectGraph, TopicRef } from '@/types/core';
import {
	computeTrialGatedDirectReward,
	useCrystalTrialStore,
} from '@/features/crystalTrial';

import { useBuffStore } from '../stores/buffStore';
import { useCrystalGardenStore } from '../stores/crystalGardenStore';
import { applyCrystalXpDelta } from '../policies/crystalLeveling';
import { getTopicUnlockStatus } from '../policies/topicUnlocking';
import { findNextGridPosition } from '../gridUtils';
import { BuffEngine } from '../buffs/buffEngine';
import { dedupeBuffsById } from '../buffs/buffMerge';

export function initialize(): void {
	const buff = useBuffStore.getState();
	const hydrated = buff.activeBuffs.map((b) => BuffEngine.get().hydrateBuff(b));
	const afterSession = BuffEngine.get().consumeForEvent(hydrated, 'session_ended');
	const pruned = BuffEngine.get().pruneExpired(afterSession);
	useBuffStore.setState({ activeBuffs: dedupeBuffsById(pruned) });
}

export function unlockTopic(
	ref: TopicRef,
	allGraphs: SubjectGraph[],
): [number, number] | null {
	const cg = useCrystalGardenStore.getState();
	const existing = cg.activeCrystals.find(
		(item) => item.subjectId === ref.subjectId && item.topicId === ref.topicId,
	);
	if (existing) {
		return existing.gridPosition;
	}

	const status = getTopicUnlockStatus(ref, cg.activeCrystals, cg.unlockPoints, allGraphs);
	if (!status.canUnlock) {
		return null;
	}

	const nextPosition = findNextGridPosition(cg.activeCrystals);
	if (!nextPosition) {
		return null;
	}

	// --- Single contiguous setState block ---
	useCrystalGardenStore.setState({
		activeCrystals: [
			...cg.activeCrystals,
			{
				subjectId: ref.subjectId,
				topicId: ref.topicId,
				gridPosition: nextPosition,
				xp: 0,
				spawnedAt: Date.now(),
			},
		],
		unlockPoints: Math.max(0, cg.unlockPoints - 1),
	});
	// --- End mutation phase ---

	// Phase 1 step 6: ceremony presentation flows through the bus. The
	// `crystal:unlocked` handler in `eventBusHandlers.ts` reads
	// `selectIsAnyModalOpen(useUIStore.getState())` directly and routes to
	// `crystalCeremonyStore.presentCeremony`, so the orchestrator stays
	// focused on domain mutation.
	appEventBus.emit('crystal:unlocked', {
		subjectId: ref.subjectId,
		topicId: ref.topicId,
	});

	return nextPosition;
}

export function addXP(
	ref: TopicRef,
	xpAmount: number,
	options?: { sessionId?: string },
): number {
	const cg = useCrystalGardenStore.getState();
	const crystal = cg.activeCrystals.find(
		(item) => item.subjectId === ref.subjectId && item.topicId === ref.topicId,
	);

	// Lifted out of the `if (crystal)` block so the post-write delta
	// calculation downstream has a single source of truth. When the
	// crystal does not yet exist, `previousXp` is 0 and `applyCrystalXpDelta`
	// returns null, so we never reach the emit path.
	const previousXp = crystal?.xp ?? 0;

	let effectiveXpAmount = xpAmount;
	let pregenPayload:
		| { subjectId: string; topicId: string; currentLevel: number; targetLevel: number }
		| null = null;

	if (crystal) {
		const currentLevel = calculateLevelFromXP(previousXp);
		const trialGating = computeTrialGatedDirectReward({
			previousXp,
			rawReward: xpAmount,
			trialStatus: useCrystalTrialStore.getState().getTrialStatus(ref),
			currentLevel,
		});
		effectiveXpAmount = trialGating.effectiveReward;

		if (trialGating.shouldPregenerate) {
			pregenPayload = {
				subjectId: ref.subjectId,
				topicId: ref.topicId,
				currentLevel,
				targetLevel: currentLevel + 1,
			};
		}
	}

	const applied = applyCrystalXpDelta(cg.activeCrystals, ref, effectiveXpAmount);
	if (!applied) {
		return 0;
	}

	// --- Single contiguous setState block ---
	useCrystalGardenStore.setState({
		activeCrystals: applied.nextActiveCrystals,
		unlockPoints:
			applied.levelsGained > 0 ? cg.unlockPoints + applied.levelsGained : cg.unlockPoints,
	});
	// --- End mutation phase ---

	const appliedDelta = applied.nextXp - previousXp;
	if (appliedDelta > 0) {
		// Fix #5: orchestrator owns direct-path `xp:gained` telemetry.
		// Emits the post-gating effective delta (not the requested
		// `xpAmount`) so the listener records what actually landed on
		// the crystal. Component-level dev emits in `AbyssCommandPalette`
		// are removed in a sibling commit so each direct grant produces
		// exactly one `xp:gained` event. Negative deltas (subtractXp
		// dev path) are intentionally skipped — `xp:gained` retains
		// "net positive XP landed" semantics for downstream consumers.
		appEventBus.emit('xp:gained', {
			subjectId: ref.subjectId,
			topicId: ref.topicId,
			amount: appliedDelta,
			sessionId: options?.sessionId ?? 'direct',
			cardId: 'direct',
		});
	}

	if (pregenPayload) {
		appEventBus.emit('crystal-trial:pregeneration-requested', pregenPayload);
	}

	if (applied.levelsGained > 0) {
		appEventBus.emit('crystal:leveled', {
			subjectId: ref.subjectId,
			topicId: ref.topicId,
			from: applied.previousLevel,
			to: applied.nextLevel,
			levelsGained: applied.levelsGained,
			sessionId: options?.sessionId ?? 'xp-adjustment',
		});
	}

	return applied.nextXp;
}
