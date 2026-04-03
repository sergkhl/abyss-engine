import type { Card, CardType } from '../../types/core';

/**
 * Returns cards whose `type` is in `enabledTypes`. If `enabledTypes` is empty, returns [].
 */
export function filterCardsByCardTypes(
  cards: Card[],
  enabledTypes: ReadonlySet<CardType>,
): Card[] {
  if (enabledTypes.size === 0) {
    return [];
  }
  return cards.filter((card) => enabledTypes.has(card.type));
}
