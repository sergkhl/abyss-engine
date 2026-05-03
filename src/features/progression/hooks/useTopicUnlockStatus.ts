import { useShallow } from 'zustand/react/shallow';

import type { ActiveCrystal, SubjectGraph, TopicRef } from '@/types/core';

import { useCrystalGardenStore } from '../stores/crystalGardenStore';
import {
	getTopicUnlockStatus,
	type TopicUnlockStatus,
} from '../policies/topicUnlocking';

/**
 * Resolve a topic's unlock eligibility from the current crystal-garden
 * snapshot. Adapter rule: reads exactly one store and calls exactly one
 * policy.
 */
export function useTopicUnlockStatus(
	ref: TopicRef,
	allGraphs: SubjectGraph[],
): TopicUnlockStatus {
	return useCrystalGardenStore(
		useShallow(
			(s: { activeCrystals: ActiveCrystal[]; unlockPoints: number }) =>
				getTopicUnlockStatus(ref, s.activeCrystals, s.unlockPoints, allGraphs),
		),
	);
}
