import { normalizeGraphPrerequisites } from '@/lib/graphPrerequisites';
import { topicRefKey } from '@/lib/topicRef';
import { calculateLevelFromXP } from '@/types/crystalLevel';
import type {
	ActiveCrystal,
	SubjectGraph,
	TopicIconName,
	TopicRef,
} from '@/types/core';
import type { TopicContentStatus } from '@/types/progression';

export interface TopicUnlockStatus {
	canUnlock: boolean;
	/** Topic graph prerequisites (crystal levels) satisfied; excludes unlock points. */
	hasPrerequisites: boolean;
	hasEnoughPoints: boolean;
	/** Current unlock-point balance (for UI copy). */
	unlockPoints: number;
	missingPrerequisites: {
		topicId: string;
		topicName: string;
		requiredLevel: number;
		currentLevel: number;
	}[];
}

interface TopicPrerequisite {
	topicId: string;
	requiredLevel: number;
}

interface TopicDescriptor {
	id: string;
	name: string;
	description: string;
	subjectId: string;
	cardIds?: string[];
	prerequisites?: TopicPrerequisite[];
}

type TopicData = Omit<TopicDescriptor, 'cardIds'> & {
	cardIds?: string[];
};

export interface TieredTopic {
	id: string;
	name: string;
	description: string;
	subjectId: string;
	subjectName: string;
	/**
	 * Curated lucide icon name copied directly from the topic's graph node.
	 * Validated upstream by topicLatticeSchema / graphSchema; downstream
	 * components consume it through the typed TopicIcon registry.
	 */
	iconName: TopicIconName;
	/** Tri-state content status: 'ready' | 'generating' | 'unavailable'. */
	contentStatus: TopicContentStatus;
	isLocked: boolean;
	isUnlocked: boolean;
	/** False when prerequisite crystal levels hide this topic from the curriculum list (tier > 1). */
	isCurriculumVisible: boolean;
}

export interface SubjectLike {
	id: string;
	name: string;
}

/**
 * Topic ids that may appear in curriculum / graph UI: tier 1 always; higher
 * tiers when prerequisites are empty (always) or at least one listed
 * prerequisite has an active crystal. Graph `minLevel` is ignored here —
 * unlock eligibility still uses minLevel via `getTopicUnlockStatus`.
 */
export function getVisibleTopicIds(
	graph: SubjectGraph,
	activeCrystals: readonly ActiveCrystal[],
): Set<string> {
	const crystalTopicIds = new Set(
		activeCrystals.filter((c) => c.subjectId === graph.subjectId).map((c) => c.topicId),
	);

	const visible = new Set<string>();
	for (const node of graph.nodes) {
		if (node.tier === 1) {
			visible.add(node.topicId);
			continue;
		}

		const prereqs = normalizeGraphPrerequisites(node.prerequisites);
		if (prereqs.length === 0) {
			visible.add(node.topicId);
			continue;
		}

		const anyPrereqUnlocked = prereqs.some((p) => crystalTopicIds.has(p.topicId));
		if (anyPrereqUnlocked) {
			visible.add(node.topicId);
		}
	}

	return visible;
}

function graphForSubject(
	subjectId: string,
	allGraphs: SubjectGraph[],
): SubjectGraph | undefined {
	return allGraphs.find((g) => g.subjectId === subjectId);
}

function resolveTopic(
	ref: TopicRef,
	allTopics: TopicData[],
	allGraphs: SubjectGraph[],
): TopicData | undefined {
	const topicFromAll = allTopics.find(
		(topic) => topic.id === ref.topicId && topic.subjectId === ref.subjectId,
	);
	if (topicFromAll) {
		return topicFromAll;
	}

	const graph = graphForSubject(ref.subjectId, allGraphs);
	const node = graph?.nodes.find((item) => item.topicId === ref.topicId);
	if (!node) {
		return undefined;
	}

	return {
		id: node.topicId,
		name: node.title,
		description: node.learningObjective,
		subjectId: ref.subjectId,
		cardIds: [],
		prerequisites: normalizeGraphPrerequisites(node.prerequisites).map((p) => ({
			topicId: p.topicId,
			requiredLevel: p.minLevel,
		})),
	};
}

function toSubjectMap(subjects: SubjectLike[] = []): Record<string, SubjectLike> {
	return subjects.reduce<Record<string, SubjectLike>>((acc, subject) => {
		acc[subject.id] = subject;
		return acc;
	}, {});
}

export function calculateTopicTier(
	ref: TopicRef,
	allGraphs: SubjectGraph[] = [],
): number {
	const graph = graphForSubject(ref.subjectId, allGraphs);
	if (!graph) {
		return 1;
	}

	const visited = new Set<string>();

	const resolve = (topicId: string, stack: Set<string>): number => {
		if (stack.has(topicId)) {
			return 1;
		}

		if (visited.has(topicId)) {
			return 1;
		}

		const node = graph.nodes.find((n) => n.topicId === topicId);
		const prereqNorm = node ? normalizeGraphPrerequisites(node.prerequisites) : [];
		if (!node || prereqNorm.length === 0) {
			visited.add(topicId);
			return 1;
		}

		const nextStack = new Set(stack);
		nextStack.add(topicId);

		let maxPrereqTier = 0;
		for (const { topicId: prereqId } of prereqNorm) {
			const prereqTier = resolve(prereqId, nextStack);
			if (prereqTier > maxPrereqTier) {
				maxPrereqTier = prereqTier;
			}
		}

		visited.add(topicId);
		return maxPrereqTier + 1;
	};

	return resolve(ref.topicId, new Set());
}

export function getTopicUnlockStatus(
	ref: TopicRef,
	activeCrystals: ActiveCrystal[],
	unlockPoints: number,
	allGraphs: SubjectGraph[] = [],
	allTopics: TopicData[] = [],
): TopicUnlockStatus {
	const topic = resolveTopic(ref, allTopics, allGraphs);

	if (!topic) {
		return {
			canUnlock: false,
			hasPrerequisites: false,
			hasEnoughPoints: false,
			unlockPoints,
			missingPrerequisites: [],
		};
	}

	const graph = graphForSubject(ref.subjectId, allGraphs);
	const prerequisites = topic.prerequisites || [];
	const hasEnoughPoints = unlockPoints >= 1;

	if (prerequisites.length === 0) {
		return {
			canUnlock: hasEnoughPoints,
			hasPrerequisites: true,
			hasEnoughPoints,
			unlockPoints,
			missingPrerequisites: [],
		};
	}

	const missingPrereqs: TopicUnlockStatus['missingPrerequisites'] = [];
	let allPrereqsMet = true;

	for (const prereq of prerequisites) {
		const prereqCrystal = activeCrystals.find(
			(crystal) => crystal.subjectId === ref.subjectId && crystal.topicId === prereq.topicId,
		);
		const prereqLevel = calculateLevelFromXP(prereqCrystal?.xp ?? 0);

		if (prereqLevel < prereq.requiredLevel) {
			allPrereqsMet = false;
			const topicName =
				graph?.nodes.find((n) => n.topicId === prereq.topicId)?.title
				?? allTopics.find((t) => t.id === prereq.topicId && t.subjectId === ref.subjectId)?.name
				?? prereq.topicId;
			missingPrereqs.push({
				topicId: prereq.topicId,
				topicName,
				requiredLevel: prereq.requiredLevel,
				currentLevel: prereqLevel,
			});
		}
	}

	return {
		canUnlock: allPrereqsMet && hasEnoughPoints,
		hasPrerequisites: allPrereqsMet,
		hasEnoughPoints,
		unlockPoints,
		missingPrerequisites: missingPrereqs,
	};
}

function resolveTopicContentStatus(
	tKey: string,
	contentStatusByTopicKey?: Record<string, TopicContentStatus>,
): TopicContentStatus {
	if (!contentStatusByTopicKey) {
		return 'ready';
	}
	return contentStatusByTopicKey[tKey] ?? 'unavailable';
}

export function getTopicsByTier(
	allGraphs: SubjectGraph[] = [],
	subjects: SubjectLike[] = [],
	currentSubjectId?: string | null,
	/** Tri-state map keyed by `topicRefKey`. Omitted → all topics treated as `'ready'`. */
	contentStatusByTopicKey?: Record<string, TopicContentStatus>,
	/**
	 * When set, `isCurriculumVisible` reflects prerequisite crystal levels per
	 * graph; unlock flags use the same crystal list.
	 */
	activeCrystals?: readonly ActiveCrystal[],
) {
	const subjectMap = toSubjectMap(subjects);
	const tierMap = new Map<number, TieredTopic[]>();
	const unlockedKeys = new Set(
		(activeCrystals ?? []).map((c) =>
			topicRefKey({ subjectId: c.subjectId, topicId: c.topicId }),
		),
	);

	const graphs = currentSubjectId
		? allGraphs.filter((graph) => graph.subjectId === currentSubjectId)
		: allGraphs;

	for (const graph of graphs) {
		const visibleIds = activeCrystals ? getVisibleTopicIds(graph, activeCrystals) : null;
		for (const node of graph.nodes) {
			const ref: TopicRef = { subjectId: graph.subjectId, topicId: node.topicId };
			const tKey = topicRefKey(ref);
			const tier = node.tier || calculateTopicTier(ref, allGraphs);
			const subjectName = subjectMap[graph.subjectId]?.name || 'Unknown';
			const contentStatus = resolveTopicContentStatus(tKey, contentStatusByTopicKey);
			const topicData: TieredTopic = {
				id: node.topicId,
				name: node.title,
				description: node.learningObjective,
				subjectId: graph.subjectId,
				subjectName,
				iconName: node.iconName,
				contentStatus,
				isLocked: !unlockedKeys.has(tKey),
				isUnlocked: unlockedKeys.has(tKey),
				isCurriculumVisible: visibleIds ? visibleIds.has(node.topicId) : true,
			};

			const current = tierMap.get(tier);
			if (current) {
				current.push(topicData);
			} else {
				tierMap.set(tier, [topicData]);
			}
		}
	}

	const sortedTiers = Array.from(tierMap.keys()).sort((a, b) => a - b);
	return sortedTiers.map((tier) => ({ tier, topics: tierMap.get(tier) || [] }));
}
