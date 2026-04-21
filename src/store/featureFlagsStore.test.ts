import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useFeatureFlagsStore } from './featureFlagsStore';

function createStorageMock(): Storage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) ?? null : null),
    setItem: (key, value) => { values.set(key, String(value)); },
    removeItem: (key) => { values.delete(key); },
    clear: () => { values.clear(); },
    key: (index) => Array.from(values.keys())[index] ?? null,
    get length() { return values.size; },
  };
}

describe('featureFlagsStore', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageMock());
    localStorage.clear();
    useFeatureFlagsStore.setState({
      pomodoroVisible: false,
      ritualVisible: false,
      sfxEnabled: false,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('defaults all flags to off', () => {
    expect(useFeatureFlagsStore.getState().pomodoroVisible).toBe(false);
    expect(useFeatureFlagsStore.getState().ritualVisible).toBe(false);
    expect(useFeatureFlagsStore.getState().sfxEnabled).toBe(false);
  });

  it('persists feature flags when updated', () => {
    useFeatureFlagsStore.getState().setSfxEnabled(true);
    expect(useFeatureFlagsStore.getState().sfxEnabled).toBe(true);
    const raw = localStorage.getItem('abyss.feature-flags');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw as string).sfxEnabled).toBe(true);
  });
});
