import { useShallow } from 'zustand/react/shallow';

import type { ActiveCrystal, SubjectGraph } from '@/types/core';
import type { TopicContentStatus } from '@/types/progression';

import { useCrystalGardenStore } from '../stores/crystalGardenStore';
import {
	getTopicsByTier,
	type SubjectLike,
} from '../policies/topicUnlocking';

/**
 * Tier-bucketed topic listing for Wisdom Altar / Discovery surfaces.
 *
 * Adapter rule: reads from exactly one store (`crystalGardenStore`) and
 * calls exactly one policy (`getTopicsByTier`). `useShallow` keeps the
 * returned array identity stable across unrelated store updates so React
 * memoization downstream stays effective.
 */
export function useTopicsByTier(
	graphs: SubjectGraph[],
	subjects: SubjectLike[],
	currentSubjectId: string | null | undefined,
	contentStatusByTopicKey?: Record<string, TopicContentStatus>,
): ReturnType<typeof getTopicsByTier> {
	return useCrystalGardenStore(
		useShallow((s: { activeCrystals: ActiveCrystal[] }) =>
			getTopicsByTier(
				graphs,
				subjects,
				currentSubjectId,
				contentStatusByTopicKey,
				s.activeCrystals,
			),
		),
	);
}
