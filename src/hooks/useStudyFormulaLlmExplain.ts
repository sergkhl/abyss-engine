'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { buildFormulaExplainMessages, type StudyFormulaExplainContext } from '../features/studyPanel';
import { chatCompletionsRepository } from '../infrastructure/di';

export type { StudyFormulaExplainContext };

export interface UseStudyFormulaLlmExplainParams {
  topicLabel: string;
  cardQuestionText: string;
  cardId: string | null;
}

function isAbortError(e: unknown): boolean {
  return (
    (e instanceof DOMException && e.name === 'AbortError')
    || (e instanceof Error && e.name === 'AbortError')
  );
}

export function useStudyFormulaLlmExplain({
  topicLabel,
  cardQuestionText,
  cardId,
}: UseStudyFormulaLlmExplainParams) {
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

  const requestExplain = useCallback(
    (latex: string, context: StudyFormulaExplainContext) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setError(null);
      setAssistantText('');
      setIsPending(true);

      const messages = buildFormulaExplainMessages(topicLabel, cardQuestionText, latex, context);
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
    },
    [topicLabel, cardQuestionText],
  );

  return {
    requestExplain,
    isPending,
    errorMessage: error instanceof Error ? error.message : error ? String(error) : null,
    assistantText,
    reset,
  };
}
