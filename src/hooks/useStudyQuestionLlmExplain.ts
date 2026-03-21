'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { buildMinimalStudyQuestionMessages } from '../features/studyPanel';
import { chatCompletionsRepository } from '../infrastructure/di';

export interface UseStudyQuestionLlmExplainParams {
  topicLabel: string;
  questionText: string;
  cardId: string | null;
}

function isAbortError(e: unknown): boolean {
  return (
    (e instanceof DOMException && e.name === 'AbortError')
    || (e instanceof Error && e.name === 'AbortError')
  );
}

export function useStudyQuestionLlmExplain({
  topicLabel,
  questionText,
  cardId,
}: UseStudyQuestionLlmExplainParams) {
  const [assistantText, setAssistantText] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setAssistantText(null);
    setError(null);
    setIsPending(false);
  }, []);

  useEffect(() => {
    reset();
  }, [cardId, reset]);

  const requestExplain = useCallback(() => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setError(null);
    setAssistantText('');
    setIsPending(true);

    const messages = buildMinimalStudyQuestionMessages(topicLabel, questionText);
    const model = process.env.NEXT_PUBLIC_LLM_MODEL?.trim() ?? '';

    void (async () => {
      try {
        let acc = '';
        for await (const chunk of chatCompletionsRepository.streamChat({
          model,
          messages,
          signal: ac.signal,
        })) {
          acc += chunk;
          setAssistantText(acc);
        }
        setIsPending(false);
      } catch (e) {
        if (isAbortError(e)) {
          return;
        }
        setError(e);
        setIsPending(false);
        setAssistantText(null);
      }
    })();
  }, [topicLabel, questionText]);

  return {
    requestExplain,
    isPending,
    errorMessage: error instanceof Error ? error.message : error ? String(error) : null,
    assistantText,
    reset,
  };
}
