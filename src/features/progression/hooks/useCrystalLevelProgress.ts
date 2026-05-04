import { useMemo } from 'react';

import type { TopicRef } from '@/types/core';

import { useCrystalGardenStore } from '../stores/crystalGardenStore';
import {
	getCrystalLevelProgressToNext,
	type CrystalLevelProgressToNext,
} from '../policies/crystalLeveling';

/**
 * Per-topic level progress (current band, percent toward next, isMax).
 * Adapter rule: reads exactly one store (`crystalGardenStore`) and calls
 * exactly one policy (`getCrystalLevelProgressToNext`). The hook subscribes
 * to the topic's XP only, so unrelated crystal updates do not retrigger
 * the calculation.
 */
export function useCrystalLevelProgress(ref: TopicRef): CrystalLevelProgressToNext {
	const xp = useCrystalGardenStore((s) =>
		s.activeCrystals.find(
			(c) => c.subjectId === ref.subjectId && c.topicId === ref.topicId,
		)?.xp ?? 0,
	);
	return useMemo(() => getCrystalLevelProgressToNext(xp), [xp]);
}
