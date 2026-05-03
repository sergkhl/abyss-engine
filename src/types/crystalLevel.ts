/**
 * Shared crystal-level math primitives.
 *
 * Pure data/math contracts. Zero framework, zero runtime beyond arithmetic.
 * Lives in the Types layer so feature modules (progression, crystalTrial,
 * visualization, …) can depend on these primitives without coupling to
 * each other.
 */

/** XP required per crystal level tier (levels 0–5). */
export const CRYSTAL_XP_PER_LEVEL = 100;

/** Inclusive max crystal level; XP beyond this tier still counts as this level. */
export const MAX_CRYSTAL_LEVEL = 5;

/** Discrete crystal level (0 – MAX_CRYSTAL_LEVEL) derived from XP. */
export function calculateLevelFromXP(xp: number): number {
  return Math.min(
    MAX_CRYSTAL_LEVEL,
    Math.floor(Math.max(0, xp) / CRYSTAL_XP_PER_LEVEL),
  );
}

/** True when XP sits at the cap of the current level band (e.g. 99, 199, …). */
export function isXpMaxedForCurrentLevel(xp: number): boolean {
  const safeXp = Math.max(0, xp);
  const level = calculateLevelFromXP(safeXp);

  if (level >= MAX_CRYSTAL_LEVEL) {
    return false;
  }

  return safeXp >= level * CRYSTAL_XP_PER_LEVEL + (CRYSTAL_XP_PER_LEVEL - 1);
}
