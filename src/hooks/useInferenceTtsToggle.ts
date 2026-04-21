'use client';

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'abyss:tts-toggle';

const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notifyAll(): void {
  for (const cb of listeners) cb();
}

function readSnapshot(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Global text-to-speech toggle persisted in localStorage.
 * Default is off; stores `'1'` when enabled and removes the key when disabled.
 */
export function useInferenceTtsToggle() {
  const enableTts = useSyncExternalStore(
    subscribe,
    readSnapshot,
    () => false,
  );

  const toggleTts = useCallback(() => {
    try {
      if (readSnapshot()) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, '1');
      }
    } catch {
      /* localStorage unavailable */
    }
    notifyAll();
  }, []);

  return { enableTts, toggleTts } as const;
}
