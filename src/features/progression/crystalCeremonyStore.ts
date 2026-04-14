import { create } from 'zustand';

import { topicRefKey } from '@/lib/topicRef';
import type { TopicRef } from '@/types/core';

/** Level-up morph + FX window (matches plan §8). */
export const CRYSTAL_CEREMONY_DURATION_MS = 1500;

export interface CrystalCeremonyState {
  /** Latest topic that leveled up while study panel was open; `topicRefKey` string. */
  pendingTopicKey: string | null;
  ceremonyTopicKey: string | null;
  ceremonyStartedAt: number | null;
}

export interface CrystalCeremonyActions {
  /**
   * Call when a crystal's level increases. Latest-only: overwrites `pendingTopicKey` when panel is open.
   * Starts ceremony immediately when the panel is closed (replaces any in-progress ceremony).
   */
  notifyLevelUp: (ref: TopicRef, isStudyPanelOpen: boolean) => void;
  /** When the study panel closes, play the pending ceremony if any. */
  onStudyPanelClosed: () => void;
  /** Clear finished ceremonies so morph settles to 1 without keeping dead state. */
  syncCeremonyClock: (now: number) => void;
  /** 0–1 eased progress for the active ceremony topic; 1 if idle or completed for this topic. */
  getCeremonyMorphProgress: (ref: TopicRef, now: number) => number;
  /** Raw linear 0–1 for flash timing (before ease). */
  getCeremonyLinearProgress: (ref: TopicRef, now: number) => number;
  /** Whether this topic is the one currently in the ceremony window. */
  isCeremonyActiveForTopic: (ref: TopicRef, now: number) => boolean;
}

function startCeremony(topicKey: string, startedAt: number): Partial<CrystalCeremonyState> {
  return {
    ceremonyTopicKey: topicKey,
    ceremonyStartedAt: startedAt,
    pendingTopicKey: null,
  };
}

export const crystalCeremonyStore = create<CrystalCeremonyState & CrystalCeremonyActions>((set, get) => ({
  pendingTopicKey: null,
  ceremonyTopicKey: null,
  ceremonyStartedAt: null,

  notifyLevelUp: (ref, isStudyPanelOpen) => {
    const key = topicRefKey(ref);
    if (isStudyPanelOpen) {
      set({ pendingTopicKey: key });
      return;
    }
    set(startCeremony(key, Date.now()));
  },

  onStudyPanelClosed: () => {
    const pending = get().pendingTopicKey;
    if (!pending) {
      return;
    }
    set(startCeremony(pending, Date.now()));
  },

  syncCeremonyClock: (now) => {
    const { ceremonyTopicKey, ceremonyStartedAt } = get();
    if (!ceremonyTopicKey || ceremonyStartedAt == null) {
      return;
    }
    if (now - ceremonyStartedAt >= CRYSTAL_CEREMONY_DURATION_MS) {
      set({ ceremonyTopicKey: null, ceremonyStartedAt: null });
    }
  },

  getCeremonyLinearProgress: (ref, now) => {
    const key = topicRefKey(ref);
    const { ceremonyTopicKey, ceremonyStartedAt } = get();
    if (ceremonyTopicKey !== key || ceremonyStartedAt == null) {
      return 1;
    }
    const t = (now - ceremonyStartedAt) / CRYSTAL_CEREMONY_DURATION_MS;
    return Math.min(1, Math.max(0, t));
  },

  getCeremonyMorphProgress: (ref, now) => {
    const linear = get().getCeremonyLinearProgress(ref, now);
    if (linear >= 1) {
      return 1;
    }
    // Smoothstep for displacement/material blend
    return linear * linear * (3 - 2 * linear);
  },

  isCeremonyActiveForTopic: (ref, now) => {
    const key = topicRefKey(ref);
    const { ceremonyTopicKey, ceremonyStartedAt } = get();
    if (ceremonyTopicKey !== key || ceremonyStartedAt == null) {
      return false;
    }
    return now - ceremonyStartedAt < CRYSTAL_CEREMONY_DURATION_MS;
  },
}));
