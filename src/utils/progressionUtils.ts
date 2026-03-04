/**
 * Game Logic Layer - progressionUtils.ts
 *
 * Responsibilities:
 * - Topic unlock status and prerequisite validation
 * - Level calculation from XP
 * - XP reward calculation based on format type and rating
 * - Random format selection
 * - Topic tier/depth calculation
 *
 * Dependencies:
 * - Reads deck snapshot from deckCatalog (data layer)
 * - Imports Rating and Format types (types layer)
 */

import { ActiveCrystal, Concept, Format, Rating } from '../types';
import { getDeckData } from '../data/deckCatalog';

function getDeckSnapshot() {
  return getDeckData();
}

// NOTE: `getDeckData` is used as metadata source-of-truth for topic unlock
// and tier calculations while runtime decisions remain driven by the
// progression store's SM-2 state and topic/session actions.

/**
 * Unlock status return type
 */
export interface TopicUnlockStatus {
  canUnlock: boolean;
  hasPrerequisites: boolean;
  hasEnoughPoints: boolean;
  missingPrerequisites: {
    topicId: string;
    topicName: string;
    requiredLevel: number;
    currentLevel: number;
  }[];
}

/**
 * Calculate the current level of a topic from XP
 * Level = floor(xp / 100), max level is 5
 */
export function calculateLevelFromXP(xp: number): number {
  return Math.min(5, Math.floor(xp / 100));
}

/**
 * Calculate the depth/tier of a topic in the prerequisite tree
 * Tier 1 = no prerequisites (directly unlockable)
 * Tier 2 = requires Tier 1 topic, etc.
 */
export function calculateTopicTier(topicId: string): number {
  const topic = getDeckSnapshot().topics.find((t: any) => t.id === topicId);
  if (!topic || !topic.prerequisites || topic.prerequisites.length === 0) {
    return 1; // Tier 1 = no prerequisites
  }

  // Find the maximum tier among all prerequisites
  let maxPrereqTier = 0;
  for (const prereq of topic.prerequisites) {
    const prereqTier = calculateTopicTier(prereq.topicId);
    maxPrereqTier = Math.max(maxPrereqTier, prereqTier);
  }

  return maxPrereqTier + 1;
}

/**
 * Get the unlock status for a topic
 * Returns an object with:
 * - canUnlock: boolean - whether the topic can be unlocked
 * - hasPrerequisites: boolean - whether prerequisites are met
 * - hasEnoughPoints: boolean - whether user has enough unlock points (if prerequisites met)
 * - missingPrerequisites: array of unmet prerequisite info
 */
export function getTopicUnlockStatus(
  topicId: string,
  activeCrystals: ActiveCrystal[],
  unlockPoints: number
): TopicUnlockStatus {
  // Find the topic in the default deck data
  const topic = getDeckSnapshot().topics.find((t: any) => t.id === topicId);

  if (!topic) {
    return {
      canUnlock: false,
      hasPrerequisites: false,
      hasEnoughPoints: false,
      missingPrerequisites: [],
    };
  }

  const prerequisites = topic.prerequisites || [];
  const hasEnoughPoints = unlockPoints >= 1;

  // If no prerequisites, still need unlock points to unlock
  if (prerequisites.length === 0) {
    return {
      canUnlock: hasEnoughPoints,
      hasPrerequisites: true,
      hasEnoughPoints,
      missingPrerequisites: [],
    };
  }

  // Check if all prerequisites are met
  const missingPrereqs: TopicUnlockStatus['missingPrerequisites'] = [];
  let allPrereqsMet = true;

  for (const prereq of prerequisites) {
    const prereqCrystal = activeCrystals.find(c => c.topicId === prereq.topicId);
    const prereqTopic = getDeckSnapshot().topics.find((t: any) => t.id === prereq.topicId);
    const prereqLevel = prereqCrystal ? calculateLevelFromXP(prereqCrystal.xp) : 0;

    if (prereqLevel < prereq.requiredLevel) {
      allPrereqsMet = false;
      missingPrereqs.push({
        topicId: prereq.topicId,
        topicName: prereqTopic?.name || prereq.topicId,
        requiredLevel: prereq.requiredLevel,
        currentLevel: prereqLevel,
      });
    }
  }

  return {
    canUnlock: allPrereqsMet && hasEnoughPoints,
    hasPrerequisites: allPrereqsMet,
    hasEnoughPoints,
    missingPrerequisites: missingPrereqs,
  };
}

/**
 * Calculate XP reward based on format type and rating
 * flashcard = 10 XP, single_choice = 12 XP, multi_choice = 15 XP
 * Rating 1 (Again) = 0x, Rating 2 (Hard) = 0.5x, Rating 3 (Good) = 1x, Rating 4 (Easy) = 1.5x
 */
export function calculateXPReward(formatType: string | undefined, rating: Rating = 3): number {
  let baseXP: number;
  switch (formatType) {
    case 'single_choice':
      baseXP = 12;
      break;
    case 'multi_choice':
      baseXP = 15;
      break;
    case 'flashcard':
    default:
      baseXP = 10;
      break;
  }

  // Apply rating multiplier
  switch (rating) {
    case 1: // Again - no XP
      return 0;
    case 2: // Hard - half XP
      return Math.floor(baseXP * 0.5);
    case 3: // Good - full XP
      return baseXP;
    case 4: // Easy - 1.5x XP
      return Math.floor(baseXP * 1.5);
    default:
      return baseXP;
  }
}

/**
 * Randomly select a format from a concept's formats array
 */
export function selectRandomFormat(concept: Concept): Format {
  if (concept.formats.length === 0) {
    // Fallback to a basic flashcard format if no formats exist
    return {
      id: `format-${concept.id}-fallback`,
      type: 'flashcard',
      question: 'No question available',
    };
  }
  const randomIndex = Math.floor(Math.random() * concept.formats.length);
  return concept.formats[randomIndex];
}

/**
 * Calculate max difficulty based on crystal level
 * Level 0 crystal only shows Difficulty 1 questions
 * Level 1 crystal shows Difficulty 1-2 questions, etc.
 */
export function calculateMaxDifficulty(crystalLevel: number): number {
  return crystalLevel + 1;
}

/**
 * Filter concepts by difficulty gate
 */
export function filterConceptsByDifficulty(
  concepts: Concept[],
  maxDifficulty: number
): Concept[] {
  return concepts.filter(concept => concept.difficulty <= maxDifficulty);
}

/**
 * Get topic by ID from deck data
 */
export function getTopicById(topicId: string) {
  return getDeckSnapshot().topics.find((t: any) => t.id === topicId);
}

/**
 * Get all topics grouped by tier
 */
export function getTopicsByTier(): { tier: number; topics: any[] }[] {
  const allTopics = getDeckSnapshot().topics as any[];
  const allSubjects = getDeckSnapshot().subjects as any[];

  // Group topics by tier
  const tierMap = new Map<number, any[]>();

  for (const topic of allTopics) {
    const tier = calculateTopicTier(topic.id);
    const subject = allSubjects.find(s => s.id === topic.subjectId);

    const topicData = {
      id: topic.id,
      name: topic.name,
      description: topic.description,
      subjectId: topic.subjectId,
      subjectName: subject?.name || 'Unknown',
      isContentAvailable: Array.isArray(topic.conceptIds) && topic.conceptIds.length > 0,
      isLocked: true, // Default - will be overridden by store
      isUnlocked: false, // Default - will be overridden by store
    };

    if (!tierMap.has(tier)) {
      tierMap.set(tier, []);
    }
    tierMap.get(tier)!.push(topicData);
  }

  // Convert to sorted array
  const result: { tier: number; topics: any[] }[] = [];
  const sortedTiers = Array.from(tierMap.keys()).sort((a, b) => a - b);

  for (const tier of sortedTiers) {
    result.push({
      tier,
      topics: tierMap.get(tier)!,
    });
  }

  return result;
}
