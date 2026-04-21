import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';

import { useInferenceTtsToggle } from './useInferenceTtsToggle';

const STORAGE_KEY = 'abyss:tts-toggle';

function createStorageMock(): Storage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) ?? null : null),
    setItem: (key, value) => {
      values.set(key, String(value));
    },
    removeItem: (key) => {
      values.delete(key);
    },
    clear: () => {
      values.clear();
    },
    key: (index) => Array.from(values.keys())[index] ?? null,
    get length() {
      return values.size;
    },
  };
}

type HookResult = ReturnType<typeof useInferenceTtsToggle>;

function renderHook() {
  let result: HookResult | null = null;

  function Host() {
    result = useInferenceTtsToggle();
    return null;
  }

  const container = document.createElement('div');
  const root = createRoot(container);
  flushSync(() => {
    root.render(createElement(Host));
  });

  return {
    getResult: () => result,
    unmount: () => {
      root.unmount();
    },
  };
}

describe('useInferenceTtsToggle', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageMock());
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults to disabled when no value is stored', () => {
    const { getResult, unmount } = renderHook();
    expect(getResult()?.enableTts).toBe(false);
    unmount();
  });

  it('returns true when storage contains "1"', () => {
    localStorage.setItem(STORAGE_KEY, '1');
    const { getResult, unmount } = renderHook();
    expect(getResult()?.enableTts).toBe(true);
    unmount();
  });

  it('treats non-"1" values as disabled', () => {
    localStorage.setItem(STORAGE_KEY, '0');
    const { getResult, unmount } = renderHook();
    expect(getResult()?.enableTts).toBe(false);
    unmount();
  });

  it('writes and clears the flag when toggled', () => {
    const { getResult, unmount } = renderHook();

    act(() => {
      getResult()?.toggleTts();
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe('1');
    expect(getResult()?.enableTts).toBe(true);

    act(() => {
      getResult()?.toggleTts();
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(getResult()?.enableTts).toBe(false);

    unmount();
  });
});
