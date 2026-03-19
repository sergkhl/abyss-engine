import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';

import { ProgressionFeedbackProvider } from './ProgressionFeedbackProvider';

const mockToastSuccess = vi.fn();

const mockPlayPositiveSound = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
  },
}));

vi.mock('@/utils/sound', () => ({
  playPositiveSound: () => mockPlayPositiveSound(),
}));

function renderFeedbackProvider() {
  const container = document.createElement('div');
  const root = createRoot(container);
  flushSync(() => {
    root.render(createElement(ProgressionFeedbackProvider));
  });

  return {
    root,
    unmount: () => root.unmount(),
  };
}

afterEach(() => {
  mockToastSuccess.mockReset();
  mockPlayPositiveSound.mockReset();
  vi.restoreAllMocks();
});

describe('ProgressionFeedbackProvider', () => {
  it('shows a positive toast and plays sound on xp-gained', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    const { unmount } = renderFeedbackProvider();

    window.dispatchEvent(
      new CustomEvent('abyss-progression-xp-gained', {
        detail: {
          amount: 25,
          rating: 4,
          cardId: 'card-1',
          topicId: 'topic-a',
        },
      }),
    );

    expect(mockToastSuccess).toHaveBeenCalledTimes(1);
    const [toastMessage, options] = mockToastSuccess.mock.calls[0];
    expect(toastMessage).toContain('✨ Excellent!');
    expect(toastMessage).toContain('+25 XP');
    expect((options as { duration?: number }).duration).toBe(1500);
    expect(mockPlayPositiveSound).toHaveBeenCalledTimes(1);
    randomSpy.mockRestore();
    unmount();
  });

  it('shows a history message on undo and redo events', () => {
    const { unmount } = renderFeedbackProvider();

    window.dispatchEvent(
      new CustomEvent('abyss-progression-study-panel-history', {
        detail: {
          action: 'undo',
          topicId: 'topic-a',
          undoCount: 2,
          redoCount: 1,
        },
      }),
    );
    expect(mockToastSuccess).toHaveBeenCalledTimes(1);
    expect(String(mockToastSuccess.mock.calls[0]?.[0] ?? '')).toContain('Undo complete.');
    expect(String(mockToastSuccess.mock.calls[0]?.[0] ?? '')).toContain('2 undo');
    unmount();
  });

  it('renders a completion toast for session completion events', () => {
    const { unmount } = renderFeedbackProvider();

    window.dispatchEvent(
      new CustomEvent('abyss-progression-session-complete', {
        detail: {
          topicId: 'topic-a',
          correctRate: 0.5,
          totalAttempts: 3,
        },
      }),
    );

    expect(mockToastSuccess).toHaveBeenCalledTimes(1);
    expect(String(mockToastSuccess.mock.calls[0]?.[0] ?? '')).toContain('Session complete');
    unmount();
  });
});
