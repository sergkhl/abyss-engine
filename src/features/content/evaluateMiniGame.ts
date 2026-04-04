import type {
  MiniGameContent,
  CategorySortContent,
  SequenceBuildContent,
  ConnectionWebContent,
} from '../../types/core';
import type { MiniGameResult, MiniGamePlacement } from '../../types/miniGame';

const CORRECT_THRESHOLD = 0.8;

export function evaluateMiniGame(
  content: MiniGameContent,
  placements: Map<string, string>,
): MiniGameResult {
  switch (content.gameType) {
    case 'CATEGORY_SORT':
      return evaluateCategorySort(content, placements);
    case 'SEQUENCE_BUILD':
      return evaluateSequenceBuild(content, placements);
    case 'CONNECTION_WEB':
      return evaluateConnectionWeb(content, placements);
  }
}

function evaluateCategorySort(
  content: CategorySortContent,
  placements: Map<string, string>,
): MiniGameResult {
  const totalItems = content.items.length;
  let correctItems = 0;
  const placementList: MiniGamePlacement[] = [];

  for (const item of content.items) {
    const placedCategoryId = placements.get(item.id);
    const isItemCorrect = placedCategoryId === item.categoryId;
    if (isItemCorrect) correctItems++;
    placementList.push({ itemId: item.id, targetId: placedCategoryId ?? '', isItemCorrect });
  }

  const score = totalItems > 0 ? correctItems / totalItems : 0;

  return {
    totalItems,
    correctItems,
    score,
    isCorrect: score >= CORRECT_THRESHOLD,
    placements: placementList,
  };
}

function evaluateSequenceBuild(
  content: SequenceBuildContent,
  placements: Map<string, string>,
): MiniGameResult {
  const totalItems = content.items.length;
  let correctItems = 0;
  const placementList: MiniGamePlacement[] = [];

  for (const item of content.items) {
    const placedPosition = placements.get(item.id);
    const isItemCorrect = placedPosition === String(item.correctPosition);
    if (isItemCorrect) correctItems++;
    placementList.push({ itemId: item.id, targetId: placedPosition ?? '', isItemCorrect });
  }

  const score = totalItems > 0 ? correctItems / totalItems : 0;

  return {
    totalItems,
    correctItems,
    score,
    isCorrect: score >= CORRECT_THRESHOLD,
    placements: placementList,
  };
}

function expectedRightNodeId(pairId: string): string {
  return `right-${pairId}`;
}

function evaluateConnectionWeb(
  content: ConnectionWebContent,
  placements: Map<string, string>,
): MiniGameResult {
  const totalPairs = content.pairs.length;
  let pairCorrect = 0;
  const placementList: MiniGamePlacement[] = [];

  for (const pair of content.pairs) {
    const leftId = pair.id;
    const expectedRightId = expectedRightNodeId(pair.id);
    const placedRightId = placements.get(leftId);
    const isItemCorrect = placedRightId === expectedRightId;
    if (isItemCorrect) pairCorrect++;
    placementList.push({
      itemId: leftId,
      targetId: placedRightId ?? '',
      isItemCorrect,
    });
  }

  const leftDistractors = (content.distractors ?? []).filter((d) => d.side === 'left');
  const totalItems = totalPairs + leftDistractors.length;
  let distractorCorrect = 0;

  for (const distractor of leftDistractors) {
    const connected = placements.has(distractor.id);
    if (!connected) distractorCorrect++;
    const isItemCorrect = !connected;
    placementList.push({
      itemId: distractor.id,
      targetId: placements.get(distractor.id) ?? '',
      isItemCorrect,
    });
  }

  const totalCorrect = pairCorrect + distractorCorrect;
  const score = totalItems > 0 ? totalCorrect / totalItems : 0;

  return {
    totalItems,
    correctItems: totalCorrect,
    score,
    isCorrect: score >= CORRECT_THRESHOLD,
    placements: placementList,
  };
}

export function miniGameResultToIsCorrect(result: MiniGameResult): boolean {
  return result.score >= CORRECT_THRESHOLD;
}
