import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';

import { StudyPanelFeedbackMessage } from './StudyPanelFeedbackMessage';
import { StudyPanelFeedbackEvent } from './types';

const mockToastSuccess = vi.fn();
const mockToastDismiss = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    dismiss: mockToastDismiss,
  },
}));

type ToastOptions = {
  duration?: number;
  description?: unknown;
  onAutoClose?: () => void;
};

function toastMessageText(message: unknown): string {
  if (typeof message === 'string') {
    return message;
  }

  return typeof message === 'undefined' ? '' : renderToStaticMarkup(message as ReactNode);
}

function renderFeedbackMessage(
  props: {
    feedbackEvent?: StudyPanelFeedbackEvent | null;
    onDone?: (feedbackEventId?: string) => void;
  } = {}
) {
  const container = document.createElement('div');
  const root = createRoot(container);

  flushSync(() => {
    root.render(
      createElement(StudyPanelFeedbackMessage, {
        feedbackEvent: null,
        ...props,
      })
    );
  });

  return {
    container,
    root,
    unmount: () => root.unmount(),
  };
}

afterEach(() => {
  mockToastSuccess.mockReset();
  mockToastDismiss.mockReset();
});

describe('StudyPanelFeedbackMessage', () => {
  it('triggers an XP success toast with optional feedback description', () => {
    const onDone = vi.fn();

    const { unmount, container } = renderFeedbackMessage({
      feedbackEvent: {
        id: 'feedback-1',
        message: 'Excellent progress',
        xpAmount: 25,
        durationMs: 1800,
      },
      onDone,
    });

    expect(container.textContent).toBe('');
    expect(mockToastSuccess).toHaveBeenCalledTimes(1);

    const call = mockToastSuccess.mock.calls[0] as [unknown, ToastOptions];
    const messageText = toastMessageText(call[0]);
    expect(messageText).toContain('+25 XP');
    expect(messageText).toContain('Excellent progress');
    expect(call[1].duration).toBe(1800);

    call[1].onAutoClose?.();
    expect(onDone).toHaveBeenCalledWith('feedback-1');
    expect(onDone).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('uses feedback text as the toast message when no XP gain exists', () => {
    renderFeedbackMessage({
      feedbackEvent: {
        id: 'feedback-2',
        message: 'Review the concept again',
        durationMs: 1500,
      },
    });

    const call = mockToastSuccess.mock.calls[0] as [unknown, ToastOptions];
    const messageText = toastMessageText(call[0]);
    expect(messageText).toContain('Review the concept again');
  });

  it('omits XP suffix when xpAmount is 0', () => {
    renderFeedbackMessage({
      feedbackEvent: {
        id: 'feedback-3',
        message: 'Excellent progress',
        xpAmount: 0,
        durationMs: 1400,
      },
    });

    const call = mockToastSuccess.mock.calls[0] as [unknown, ToastOptions];
    const messageText = toastMessageText(call[0]);
    expect(messageText).toContain('Excellent progress');
    expect(messageText).not.toContain('+0 XP');
  });

  it('does not emit a toast without message or XP gain', () => {
    renderFeedbackMessage();

    expect(mockToastSuccess).not.toHaveBeenCalled();
  });
});
