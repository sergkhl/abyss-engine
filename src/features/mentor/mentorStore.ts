import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { appEventBus } from '@/infrastructure/eventBus';

import {
  type DialogPlan,
  type MentorTriggerId,
} from './mentorTypes';

const STORAGE_KEY = 'abyss-mentor-v1';
// Bumped to 5 in the trigger-id colon-namespace rename
// (`subject.generation.started` etc. → `subject:generation-started`).
// Scoped hard cut: `seenTriggers` and `cooldowns` are keyed by trigger
// ids that the v4 -> v5 rename invalidated, so they are unconditionally
// reset. All other persisted fields (e.g. `playerName`,
// `firstSubjectGenerationEnqueuedAt` which gates the onboarding intro)
// are preserved across the bump - wiping them would silently re-open
// the onboarding dialog for every existing user on next load.
const STORAGE_VERSION = 5;

export interface VariantCursor {
  order: readonly number[];
  index: number;
}

export interface MentorPersistedState {
  playerName: string | null;
  mentorLocale: 'en';
  seenTriggers: MentorTriggerId[];
  narrationEnabled: boolean;
  lastInteractionAt: number | null;
  cooldowns: Partial<Record<MentorTriggerId, number>>;
  firstSubjectGenerationEnqueuedAt: number | null;
}

export interface MentorEphemeralState {
  dialogQueue: DialogPlan[];
  currentDialog: DialogPlan | null;
  variantCursors: Partial<Record<MentorTriggerId, VariantCursor>>;
}

export interface MentorActions {
  setPlayerName: (name: string | null) => void;
  setNarrationEnabled: (enabled: boolean) => void;
  enqueue: (plan: DialogPlan) => void;
  popHead: () => DialogPlan | null;
  peekHead: () => DialogPlan | null;
  openCurrentFromQueue: () => DialogPlan | null;
  dismissCurrent: () => void;
  markSeen: (trigger: MentorTriggerId) => void;
  recordCooldown: (trigger: MentorTriggerId, atMs: number) => void;
  markFirstSubjectGenerationEnqueued: (atMs: number) => void;
  nextVariantIndex: (
    trigger: MentorTriggerId,
    variantCount: number,
    rng?: () => number,
  ) => number;
  reset: () => void;
}

export type MentorState = MentorPersistedState & MentorEphemeralState & MentorActions;

export const DEFAULT_PERSISTED_STATE: MentorPersistedState = {
  playerName: null,
  mentorLocale: 'en',
  seenTriggers: [],
  narrationEnabled: false,
  lastInteractionAt: null,
  cooldowns: {},
  firstSubjectGenerationEnqueuedAt: null,
};

export const DEFAULT_EPHEMERAL_STATE: MentorEphemeralState = {
  dialogQueue: [],
  currentDialog: null,
  variantCursors: {},
};

function fisherYatesShuffle(length: number, rng: () => number): number[] {
  const order = Array.from({ length }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = order[i]!;
    const b = order[j]!;
    order[i] = b;
    order[j] = a;
  }
  return order;
}

function reshuffleAvoidingHeadEqualsTail(
  length: number,
  previousTail: number | undefined,
  rng: () => number,
): number[] {
  if (length <= 1) return [0];
  for (let attempt = 0; attempt < 8; attempt++) {
    const order = fisherYatesShuffle(length, rng);
    if (previousTail === undefined || order[0] !== previousTail) return order;
  }
  // Last-resort fallback: swap head and tail to guarantee no repeat.
  const order = fisherYatesShuffle(length, rng);
  if (order[0] === previousTail && order.length > 1) {
    const head = order[0]!;
    const tail = order[order.length - 1]!;
    order[0] = tail;
    order[order.length - 1] = head;
  }
  return order;
}

function getMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    removeItem: (key: string) => {
      map.delete(key);
    },
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  } satisfies Storage;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Scoped hard cut on version bump: only fields keyed by the renamed
 * trigger ids (`seenTriggers`, `cooldowns`) are unconditionally reset,
 * because the v4 -> v5 dot-namespace -> colon-namespace rename made the
 * legacy values meaningless. All other persisted fields are preserved
 * with per-field defensive type guards so malformed legacy blobs cannot
 * leak unexpected types into the new state.
 *
 * Critically, `firstSubjectGenerationEnqueuedAt` is preserved: the
 * `onboarding:pre-first-subject` trigger gates on this field being
 * null, so a wholesale wipe would re-open the full onboarding dialog
 * for every existing user on next load.
 *
 * zustand only invokes `migrate` when the stored version differs from
 * `STORAGE_VERSION`, so the current-version pass-through path is
 * handled by zustand internally.
 */
export function migrateMentorState(
  persisted: unknown,
  _fromVersion: number,
): MentorPersistedState {
  if (!isPlainObject(persisted)) {
    return { ...DEFAULT_PERSISTED_STATE