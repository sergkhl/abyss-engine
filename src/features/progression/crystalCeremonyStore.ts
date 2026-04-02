import { create } from 'zustand';

/** Level-up morph + FX window (matches plan §8). */
export const CRYSTAL_CEREMONY_DURATION_MS = 1500;

export interface CrystalCeremonyState {
  /** Latest topic that leveled up while study panel was open; replaces any previous pending. */
  pendingTopicId: string | null;
  ceremonyTopicId: string | null;
  ceremonyStartedAt: number | null;
}

export interface CrystalCeremonyActions {
  /**
   * Call when a crystal's level increases. Latest-only: overwrites `pendingTopicId` when panel is open.
   * Starts ceremony immediately when the panel is closed (replaces any in-progress ceremony).
   */
  notifyLevelUp: (topicId: string, isStudyPanelOpen: boolean) => void;
  /** When the study panel closes, play the pending ceremony if any. */
  onStudyPanelClosed: () => void;
  /** Clear finished ceremonies so morph settles to 1 without keeping dead state. */
  syncCeremonyClock: (now: number) => void;
  /** 0–1 eased progress for the active ceremony topic; 1 if idle or completed for this topic. */
  getCeremonyMorphProgress: (topicId: string, now: number) => number;
  /** Raw linear 0–1 for flash timing (before ease). */
  getCeremonyLinearProgress: (topicId: string, now: number) => number;
  /** Whether this topic is the one currently in the ceremony window. */
  isCeremonyActiveForTopic: (topicId: string, now: number) => boolean;
}

function startCeremony(topicId: string, startedAt: number): Partial<CrystalCeremonyState> {
  return {
    ceremonyTopicId: topicId,
    ceremonyStartedAt: startedAt,
    pendingTopicId: null,
  };
}

export const crystalCeremonyStore = create<CrystalCeremonyState & CrystalCeremonyActions>((set, get) => ({
  pendingTopicId: null,
  ceremonyTopicId: null,
  ceremonyStartedAt: null,

  notifyLevelUp: (topicId, isStudyPanelOpen) => {
    if (isStudyPanelOpen) {
      set({ pendingTopicId: topicId });
      return;
    }
    set(startCeremony(topicId, Date.now()));
  },

  onStudyPanelClosed: () => {
    const pending = get().pendingTopicId;
    if (!pending) {
      return;
    }
    set(startCeremony(pending, Date.now()));
  },

  syncCeremonyClock: (now) => {
    const { ceremonyTopicId, ceremonyStartedAt } = get();
    if (!ceremonyTopicId || ceremonyStartedAt == null) {
      return;
    }
    if (now - ceremonyStartedAt >= CRYSTAL_CEREMONY_DURATION_MS) {
      set({ ceremonyTopicId: null, ceremonyStartedAt: null });
    }
  },

  getCeremonyLinearProgress: (topicId, now) => {
    const { ceremonyTopicId, ceremonyStartedAt } = get();
    if (ceremonyTopicId !== topicId || ceremonyStartedAt == null) {
      return 1;
    }
    const t = (now - ceremonyStartedAt) / CRYSTAL_CEREMONY_DURATION_MS;
    return Math.min(1, Math.max(0, t));
  },

  getCeremonyMorphProgress: (topicId, now) => {
    const linear = get().getCeremonyLinearProgress(topicId, now);
    if (linear >= 1) {
      return 1;
    }
    // Smoothstep for displacement/material blend
    return linear * linear * (3 - 2 * linear);
  },

  isCeremonyActiveForTopic: (topicId, now) => {
    const { ceremonyTopicId, ceremonyStartedAt } = get();
    if (ceremonyTopicId !== topicId || ceremonyStartedAt == null) {
      return false;
    }
    return now - ceremonyStartedAt < CRYSTAL_CEREMONY_DURATION_MS;
  },
}));
