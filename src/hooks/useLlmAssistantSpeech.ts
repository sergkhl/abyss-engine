'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  extractCompleteSpeechChunks,
  stripLlmMarkdownForSpeech,
} from '@/features/studyPanel/llmSpeech';

export type UseLlmAssistantSpeechParams = {
  isSurfaceOpen: boolean;
  ttsEnabled: boolean;
  assistantText: string | null;
  isPending: boolean;
};

export type UseLlmAssistantSpeechResult = {
  /** True while this hook instance has utterances queued or playing (after speak() until onend/onerror). */
  isSpeaking: boolean;
};

/**
 * Speaks assistant markdown incrementally (Web Speech API). Progress is tracked in **raw**
 * `assistantText` character offsets so stripping markdown never shrinks a virtual cursor
 * (which previously restarted TTS when bold/lists completed). Re-enabling TTS for a
 * surface replays from the beginning of the currently accumulated raw text.
 */
export function useLlmAssistantSpeech({
  isSurfaceOpen,
  ttsEnabled,
  assistantText,
  isPending,
}: UseLlmAssistantSpeechParams): UseLlmAssistantSpeechResult {
  const rawConsumedRef = useRef(0);
  const prevRawLenRef = useRef(0);
  const prevTtsRef = useRef(ttsEnabled);
  const replayFromStartRef = useRef(false);
  const utteranceCountRef = useRef(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const resetSpeaking = useCallback(() => {
    utteranceCountRef.current = 0;
    setIsSpeaking(false);
  }, []);

  const enqueueUtterance = useCallback((plain: string) => {
    if (typeof window === 'undefined' || typeof window.SpeechSynthesisUtterance === 'undefined') {
      return;
    }
    const u = new SpeechSynthesisUtterance(plain);
    utteranceCountRef.current += 1;
    setIsSpeaking(true);
    const onFinish = () => {
      utteranceCountRef.current -= 1;
      if (utteranceCountRef.current <= 0) {
        utteranceCountRef.current = 0;
        setIsSpeaking(false);
      }
    };
    u.onend = onFinish;
    u.onerror = onFinish;
    window.speechSynthesis.speak(u);
  }, []);

  const cancelIfHasQueuedUtterances = useCallback(() => {
    if (utteranceCountRef.current > 0) {
      window.speechSynthesis.cancel();
    }
  }, []);

  useEffect(() => {
    if (ttsEnabled && !prevTtsRef.current && isSurfaceOpen && typeof window !== 'undefined' && window.speechSynthesis) {
      cancelIfHasQueuedUtterances();
      resetSpeaking();
      rawConsumedRef.current = 0;
      prevRawLenRef.current = 0;
      replayFromStartRef.current = true;
    }
    if (!ttsEnabled) {
      replayFromStartRef.current = false;
    }
    prevTtsRef.current = ttsEnabled;
  }, [cancelIfHasQueuedUtterances, resetSpeaking, ttsEnabled, isSurfaceOpen]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.speechSynthesis === 'undefined') {
      return;
    }

    if (!isSurfaceOpen) {
      cancelIfHasQueuedUtterances();
      resetSpeaking();
      rawConsumedRef.current = 0;
      prevRawLenRef.current = 0;
      return;
    }

    if (!ttsEnabled) {
      cancelIfHasQueuedUtterances();
      resetSpeaking();
      return;
    }

    const raw = assistantText ?? '';

    if (raw.length < prevRawLenRef.current) {
      cancelIfHasQueuedUtterances();
      resetSpeaking();
      rawConsumedRef.current = 0;
    }
    prevRawLenRef.current = raw.length;

    if (rawConsumedRef.current > raw.length) {
      rawConsumedRef.current = raw.length;
    }

    const delta = raw.slice(rawConsumedRef.current);
    let { chunks, remainder } = extractCompleteSpeechChunks(delta);

    if ((replayFromStartRef.current || !isPending) && remainder.trim().length > 0) {
      chunks = [...chunks, remainder];
      remainder = '';
    }

    const consumedInDelta = replayFromStartRef.current ? delta.length : delta.length - remainder.length;

    for (const chunk of chunks) {
      const plain = stripLlmMarkdownForSpeech(chunk).trim();
      if (plain.length > 0) {
        enqueueUtterance(plain);
      }
    }

    rawConsumedRef.current += consumedInDelta;
    replayFromStartRef.current = false;
  }, [assistantText, cancelIfHasQueuedUtterances, enqueueUtterance, isPending, isSurfaceOpen, resetSpeaking, ttsEnabled]);

  return { isSpeaking };
}
