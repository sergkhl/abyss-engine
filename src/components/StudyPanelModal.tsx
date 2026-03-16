'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Rating } from '../types';
import {
  getRatingColor,
  getRatingLabel,
  calculateXPReward,
  useProgressionStore as useStudyStore,
} from '../features/progression';
import { evaluateAnswer as evaluateChoiceAnswer } from '../features/content';
import { ModalWrapper } from './ui/modal-wrapper';
import { TARGET_AUDIENCE_OPTIONS, useStudySettingsStore } from '../store/studySettingsStore';
import { StudyPanelHeader, StudyPanelTab } from './studyPanel/StudyPanelHeader';
import { StudyPanelStateViews } from './studyPanel/StudyPanelStateViews';
import { StudyPanelStudyView } from './studyPanel/StudyPanelStudyView';
import { useStudyPanelModel } from '../hooks/useStudyPanelModel';

interface StudyPanelModalProps {
  isOpen: boolean;
  currentCardId: string | null;
  currentTopicId: string | null;
  isCardFlipped: boolean;
  totalCards: number;
  feedbackMessage?: string | null;
  feedbackMessageDurationMs?: number;
  levelUpMessage?: string | null;
  onClose: () => void;
  onFlip: () => void;
  onSubmitResult: (cardId: string, isCorrect?: boolean, rating?: Rating) => void;
}

interface XpGainEvent {
  id: string;
  amount: number;
}

export function StudyPanelModal({
  isOpen,
  currentCardId,
  currentTopicId,
  isCardFlipped,
  totalCards,
  feedbackMessage,
  feedbackMessageDurationMs = 1500,
  levelUpMessage,
  onClose,
  onFlip,
  onSubmitResult,
}: StudyPanelModalProps) {
  const [activeTab, setActiveTab] = useState<StudyPanelTab>('study');
  const targetAudience = useStudySettingsStore((state) => state.targetAudience);
  const setTargetAudience = useStudySettingsStore((state) => state.setTargetAudience);
  const currentSession = useStudyStore((state) => state.currentSession);

  const model = useStudyPanelModel({
    currentCardId,
    currentTopicId,
    totalCards,
  });

  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [xpGainEvent, setXpGainEvent] = useState<XpGainEvent | null>(null);
  const systemPromptRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!model.resolvedTopicId || (activeTab === 'theory' && !model.hasTheory)) {
      setActiveTab('study');
    }
  }, [activeTab, model.hasTheory, model.resolvedTopicId]);

  useEffect(() => {
    setSelectedAnswers([]);
    setIsAnswerSubmitted(false);
    setIsCorrect(false);
  }, [model.activeCard?.id]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedAnswers([]);
      setIsAnswerSubmitted(false);
      setIsCorrect(false);
      setXpGainEvent(null);
    }
  }, [isOpen]);

  const triggerXpGain = (rating: Rating) => {
    const amount = calculateXPReward(undefined, rating);
    setXpGainEvent({
      id: `${model.activeCard?.id ?? 'card'}-${Date.now()}-${amount}`,
      amount,
    });
  };

  const handleSelectSystemPrompt = () => {
    const promptElement = systemPromptRef.current;
    if (!promptElement) return;

    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    range.selectNodeContents(promptElement);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const handleAnswerSelect = (answer: string) => {
    if (isAnswerSubmitted || !model.renderedCard) return;

    if (model.isSingleChoice) {
      setSelectedAnswers([answer]);
      return;
    }

    if (model.isMultiChoice) {
      setSelectedAnswers((previous) => {
        if (previous.includes(answer)) {
          return previous.filter((a) => a !== answer);
        }
        return [...previous, answer];
      });
    }
  };

  const handleChoiceSubmit = () => {
    const activeCard = model.activeCard;
    if (!activeCard) return;

    const nextIsCorrect = evaluateChoiceAnswer(activeCard, selectedAnswers);
    setIsCorrect(nextIsCorrect);
    setIsAnswerSubmitted(true);
  };

  const handleChoiceContinue = () => {
    const cardId = model.activeCard?.id || currentCardId || currentSession?.currentCardId || null;
    if (!cardId) return;

    triggerXpGain(isCorrect ? 3 : 1);
    onSubmitResult(cardId, isCorrect);
    setSelectedAnswers([]);
    setIsAnswerSubmitted(false);
    setIsCorrect(false);
  };

  const handleRating = (rating: Rating) => {
    const cardId = model.activeCard?.id || currentCardId || currentSession?.currentCardId || null;
    if (!cardId) return;

    triggerXpGain(rating);
    onSubmitResult(cardId, undefined, rating);
  };

  const clearXpGainEvent = useCallback(() => {
    setXpGainEvent(null);
  }, []);

  if (!isOpen) return null;

  return (
    <ModalWrapper onClose={onClose} panelClassName="w-[min(95%,60rem)] max-h-[95vh]">
      <div data-testid="study-panel-modal-content" className="relative flex min-h-0 flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-transparent border-none text-slate-400 text-2xl cursor-pointer leading-none p-1 hover:text-slate-200 transition-colors z-30"
          aria-label="Close modal"
        >
          ×
        </button>

        <StudyPanelHeader
          activeTab={activeTab}
          hasTheory={model.hasTheory}
          resolvedTopicId={model.resolvedTopicId}
          onTabChange={setActiveTab}
        />

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <StudyPanelStateViews
            levelUpMessage={levelUpMessage}
            activeTab={activeTab}
            hasTheory={model.hasTheory}
            isEmptyDeck={model.isEmptyDeck}
            isLoadingCards={model.isLoadingCards}
            isCardsLoadError={model.isCardsLoadError}
            hasActiveCard={model.hasActiveCard}
            isCompleted={model.isCompleted}
            resolvedTopicTheory={model.resolvedTopicTheory}
            topicSystemPrompt={model.topicSystemPrompt}
            targetAudience={targetAudience}
            targetAudienceOptions={TARGET_AUDIENCE_OPTIONS}
            onClose={onClose}
            onSetTargetAudience={setTargetAudience}
            onSystemPromptSelect={handleSelectSystemPrompt}
            systemPromptRef={systemPromptRef}
          />

          {model.renderedCard && activeTab === 'study' && (
            <StudyPanelStudyView
              renderedCard={model.renderedCard}
              isFlashcard={model.isFlashcard}
              isSingleChoice={model.isSingleChoice}
              isMultiChoice={model.isMultiChoice}
              isChoiceQuestion={model.isChoiceQuestion}
              selectedAnswers={selectedAnswers}
              isAnswerSubmitted={isAnswerSubmitted}
              isCorrect={isCorrect}
              isCardFlipped={isCardFlipped}
              feedbackMessage={feedbackMessage}
              feedbackMessageDurationMs={feedbackMessageDurationMs}
              sm2State={model.sm2State}
              activeCard={model.activeCard}
              xpGainAmount={xpGainEvent?.amount ?? null}
              xpGainVersion={xpGainEvent?.id}
              onXpGainDone={clearXpGainEvent}
              onSelectAnswer={handleAnswerSelect}
              onChoiceSubmit={handleChoiceSubmit}
              onChoiceContinue={handleChoiceContinue}
              onFlip={onFlip}
              onRate={handleRating}
              getRatingLabel={getRatingLabel}
              getRatingColor={getRatingColor}
            />
          )}
        </div>
      </div>
    </ModalWrapper>
  );
}

export default StudyPanelModal;
