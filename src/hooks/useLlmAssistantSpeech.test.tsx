import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';

import { useLlmAssistantSpeech, type UseLlmAssistantSpeechParams } from './useLlmAssistantSpeech';

function setupSpeechSynthesisMock() {
  const mockSpeak = vi.fn();
  const mockCancel = vi.fn();
  const utteranceTexts: string[] = [];

  class MockSpeechSynthesisUtterance {
    public text: string;

    constructor(value: string) {
      this.text = value;
      utteranceTexts.push(value);
    }
  }

  const mockWindow = window as unknown as Record<string, unknown>;
  const originalSpeechSynthesis = window.speechSynthesis;
  const originalSpeechSynthesisUtterance = window.SpeechSynthesisUtterance;

  mockWindow.speechSynthesis = {
    ...originalSpeechSynthesis,
    speak: (utterance: SpeechSynthesisUtterance) => {
      mockSpeak(utterance);
    },
    cancel: mockCancel,
  };
  mockWindow.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;

  return { mockSpeak, mockCancel, utteranceTexts, originalSpeechSynthesis, originalSpeechSynthesisUtterance };
}

function HookHost(props: UseLlmAssistantSpeechParams) {
  useLlmAssistantSpeech(props);
  return null;
}

function renderHook(props: UseLlmAssistantSpeechParams) {
  const container = document.createElement('div');
  const root = createRoot(container);
  const render = (next: UseLlmAssistantSpeechParams) => {
    act(() => {
      flushSync(() => {
        root.render(createElement(HookHost, next));
      });
    });
  };
  render(props);
  return {
    rerender: render,
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
}

function DualHookHost(props: {
  openSurface: UseLlmAssistantSpeechParams;
  closedSurface: UseLlmAssistantSpeechParams;
}) {
  useLlmAssistantSpeech(props.openSurface);
  useLlmAssistantSpeech(props.closedSurface);
  return null;
}

function renderDualHooks(props: { openSurface: UseLlmAssistantSpeechParams; closedSurface: UseLlmAssistantSpeechParams }) {
  const container = document.createElement('div');
  const root = createRoot(container);
  const render = (next: { openSurface: UseLlmAssistantSpeechParams; closedSurface: UseLlmAssistantSpeechParams }) => {
    act(() => {
      flushSync(() => {
        root.render(createElement(DualHookHost, next));
      });
    });
  };
  render(props);
  return {
    rerender: render,
    unmount: () => {
      act(() => {
        root.unmount();
      });
    },
  };
}

afterEach(() => {
  const mockWindow = window as unknown as Record<string, unknown>;
  if ('speechSynthesis' in mockWindow) {
    mockWindow.speechSynthesis = window.speechSynthesis;
  }
  if ('SpeechSynthesisUtterance' in mockWindow) {
    mockWindow.SpeechSynthesisUtterance = window.SpeechSynthesisUtterance;
  }
  vi.restoreAllMocks();
});

describe('useLlmAssistantSpeech', () => {
  it('does not speak when surface is closed', () => {
    const { mockSpeak, mockCancel } = setupSpeechSynthesisMock();
    const { unmount } = renderHook({
      isSurfaceOpen: false,
      ttsEnabled: true,
      assistantText: 'Hello world.',
      isPending: false,
    });
    expect(mockSpeak).not.toHaveBeenCalled();
    expect(mockCancel).not.toHaveBeenCalled();
    unmount();
  });

  it('does not cancel from a closed sibling when global TTS turns on', () => {
    const { mockCancel, mockSpeak } = setupSpeechSynthesisMock();
    const { rerender, unmount } = renderDualHooks({
      openSurface: {
        isSurfaceOpen: true,
        ttsEnabled: false,
        assistantText: 'Open surface sentence.',
        isPending: false,
      },
      closedSurface: {
        isSurfaceOpen: false,
        ttsEnabled: false,
        assistantText: 'Closed surface sentence.',
        isPending: false,
      },
    });
    expect(mockSpeak).not.toHaveBeenCalled();

    rerender({
      openSurface: {
        isSurfaceOpen: true,
        ttsEnabled: true,
        assistantText: 'Open surface sentence.',
        isPending: false,
      },
      closedSurface: {
        isSurfaceOpen: false,
        ttsEnabled: true,
        assistantText: 'Closed surface sentence.',
        isPending: false,
      },
    });
    expect(mockSpeak).toHaveBeenCalledTimes(1);
    expect(mockCancel).not.toHaveBeenCalled();
    unmount();
  });

  it('does not speak when TTS is disabled', () => {
    const { mockSpeak } = setupSpeechSynthesisMock();
    const { unmount } = renderHook({
      isSurfaceOpen: true,
      ttsEnabled: false,
      assistantText: 'Hello world.',
      isPending: false,
    });
    expect(mockSpeak).not.toHaveBeenCalled();
    unmount();
  });

  it('speaks flushed assistant text when streaming completes', () => {
    const { mockSpeak, utteranceTexts } = setupSpeechSynthesisMock();
    const { unmount } = renderHook({
      isSurfaceOpen: true,
      ttsEnabled: true,
      assistantText: 'One line without terminator yet',
      isPending: false,
    });
    expect(mockSpeak).toHaveBeenCalledTimes(1);
    expect(utteranceTexts[0]).toContain('One line without terminator yet');
    unmount();
  });

  it('queues incremental chunks while streaming', () => {
    const { mockSpeak, utteranceTexts } = setupSpeechSynthesisMock();
    const { rerender, unmount } = renderHook({
      isSurfaceOpen: true,
      ttsEnabled: true,
      assistantText: 'First sentence. Second',
      isPending: true,
    });
    expect(mockSpeak).toHaveBeenCalledTimes(1);
    expect(utteranceTexts[0]).toContain('First sentence.');

    rerender({
      isSurfaceOpen: true,
      ttsEnabled: true,
      assistantText: 'First sentence. Second sentence.',
      isPending: false,
    });
    expect(mockSpeak.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(utteranceTexts.some((t) => t.includes('Second sentence.'))).toBe(true);
    unmount();
  });

  it('cancels when surface closes', () => {
    const { mockCancel } = setupSpeechSynthesisMock();
    const { rerender, unmount } = renderHook({
      isSurfaceOpen: true,
      ttsEnabled: true,
      assistantText: 'A.',
      isPending: false,
    });
    rerender({
      isSurfaceOpen: false,
      ttsEnabled: true,
      assistantText: 'A.',
      isPending: false,
    });
    expect(mockCancel).toHaveBeenCalled();
    unmount();
  });

  it('replays accumulated text from the start when TTS is enabled during streaming', () => {
    const { mockSpeak, utteranceTexts } = setupSpeechSynthesisMock();
    const { rerender, unmount } = renderHook({
      isSurfaceOpen: true,
      ttsEnabled: false,
      assistantText: 'Streaming text without punctuation',
      isPending: true,
    });
    rerender({
      isSurfaceOpen: true,
      ttsEnabled: true,
      assistantText: 'Streaming text without punctuation',
      isPending: true,
    });
    expect(mockSpeak).toHaveBeenCalledTimes(1);
    expect(utteranceTexts[0]).toContain('Streaming text without punctuation');
    unmount();
  });

  it('replays the full message again after a disable/re-enable cycle', () => {
    const { mockSpeak, mockCancel, utteranceTexts } = setupSpeechSynthesisMock();
    const { rerender, unmount } = renderHook({
      isSurfaceOpen: true,
      ttsEnabled: true,
      assistantText: 'Replay this message.',
      isPending: false,
    });
    expect(mockSpeak).toHaveBeenCalledTimes(1);
    rerender({
      isSurfaceOpen: true,
      ttsEnabled: false,
      assistantText: 'Replay this message.',
      isPending: false,
    });
    expect(mockCancel).toHaveBeenCalled();
    rerender({
      isSurfaceOpen: true,
      ttsEnabled: true,
      assistantText: 'Replay this message.',
      isPending: false,
    });
    expect(mockSpeak).toHaveBeenCalledTimes(2);
    expect(utteranceTexts[0]).toBe('Replay this message.');
    expect(utteranceTexts[1]).toBe('Replay this message.');
    unmount();
  });

  it('does not cancel when bold markdown completes while raw text only grows', () => {
    const { mockSpeak, mockCancel, utteranceTexts } = setupSpeechSynthesisMock();
    const { rerender, unmount } = renderHook({
      isSurfaceOpen: true,
      ttsEnabled: true,
      assistantText: 'This is **bol',
      isPending: true,
    });
    rerender({
      isSurfaceOpen: true,
      ttsEnabled: true,
      assistantText: 'This is **bold** text.',
      isPending: false,
    });
    expect(mockCancel).not.toHaveBeenCalled();
    expect(mockSpeak).toHaveBeenCalled();
    expect(utteranceTexts.some((t) => t.includes('bold') && !t.includes('**'))).toBe(true);
    unmount();
  });
});
