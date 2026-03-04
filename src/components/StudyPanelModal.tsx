import React, { useEffect, useMemo, useState } from 'react';
import { Concept, Rating } from '../types';
import { Card } from '../types/repository';
import { getRatingLabel, getRatingColor, normalizeSM2State } from '../utils/sm2';
import { useProgressionStore as useStudyStore } from '../store/progressionStore';
import { useTopicCards } from '../hooks/useDeckData';

interface StudyPanelModalProps {
  isOpen: boolean;
  currentConceptId: string | null;
  currentTopicId: string | null;
  topicMetadata?: Record<string, { subjectId: string }>;
  isConceptFlipped: boolean;
  totalConcepts: number;
  feedbackMessage?: string | null;
  levelUpMessage?: string | null;
  currentTopicTheory?: string | null;
  onClose: () => void;
  onFlip: () => void;
  onSubmitResult: (conceptId: string, isCorrect?: boolean, selfRating?: Rating) => void;
  onLoadDeck?: () => void;
}

type RenderableType = 'flashcard' | 'single_choice' | 'multi_choice';

interface RenderableCard {
  id: string;
  type: RenderableType;
  question: string;
  answer?: string;
  options?: string[];
  correctAnswers?: string[];
  context?: string;
}

function toRenderable(card: Card): RenderableCard | null {
  if (!card?.id) return null;

  if (card.type === 'FLASHCARD') {
    const content = card.content as { front: string; back: string };
    return {
      id: card.id,
      type: 'flashcard',
      question: content.front,
      answer: content.back,
    };
  }

  if (card.type === 'SINGLE_CHOICE') {
    const content = card.content as {
      question: string;
      options: string[];
      correctAnswer: string;
      explanation: string;
    };

    return {
      id: card.id,
      type: 'single_choice',
      question: content.question,
      options: content.options,
      correctAnswers: [content.correctAnswer],
      context: content.explanation,
    };
  }

  const content = card.content as {
    question: string;
    options: string[];
    correctAnswers: string[];
    explanation: string;
  };

  return {
    id: card.id,
    type: 'multi_choice',
    question: content.question,
    options: content.options,
    correctAnswers: content.correctAnswers,
    context: content.explanation,
  };
}

export function StudyPanelModal({
  isOpen,
  currentConceptId,
  currentTopicId,
  topicMetadata = {},
  isConceptFlipped,
  totalConcepts,
  feedbackMessage,
  levelUpMessage,
  currentTopicTheory,
  onClose,
  onFlip,
  onSubmitResult,
  onLoadDeck,
}: StudyPanelModalProps) {
  const concepts = useStudyStore((state) => state.concepts);
  const sm2Data = useStudyStore((state) => state.sm2Data);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Track which tab is active: 'study' or 'theory'
  const [activeTab, setActiveTab] = useState<'study' | 'theory'>('study');

  // State for choice questions
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Active concept and card lookup maps
  const conceptMap = useMemo(
    () => new Map<string, Concept>(concepts.map((concept) => [concept.id, concept])),
    [concepts],
  );

  const currentConcept = useMemo(
    () => (currentConceptId ? conceptMap.get(currentConceptId) : null),
    [conceptMap, currentConceptId],
  );

  const resolvedTopicId = useMemo(
    () => currentTopicId || currentConcept?.topicId || null,
    [currentTopicId, currentConcept?.topicId],
  );

  const resolvedSubjectId = useMemo(
    () => (resolvedTopicId ? topicMetadata[resolvedTopicId]?.subjectId || null : null),
    [resolvedTopicId, topicMetadata],
  );

  const cardQuery = useTopicCards(resolvedSubjectId || '', resolvedTopicId || '');
  const topicCards = cardQuery.data ?? [];
  const cardsById = useMemo(
    () => new Map(topicCards.map((card: Card) => [card.id, card])),
    [topicCards],
  );

  const activeCard = useMemo(
    () => (currentConceptId ? cardsById.get(currentConceptId) || null : null),
    [cardsById, currentConceptId],
  );

  const renderedCard = useMemo(
    () => (activeCard ? toRenderable(activeCard) : null),
    [activeCard],
  );

  const sm2State = useMemo(() => {
    if (!currentConceptId) return null;
    const rawSm2 = sm2Data[currentConceptId] || currentConcept?.sm2;
    if (!rawSm2) return null;
    return normalizeSM2State(rawSm2);
  }, [currentConceptId, currentConcept?.sm2, sm2Data]);

  // Reset selection state when concept changes
  useEffect(() => {
    setSelectedAnswers([]);
    setIsAnswerSubmitted(false);
    setIsCorrect(false);
  }, [currentConceptId]);

  if (!isOpen) return null;

  const isLoadingCards = !!resolvedTopicId && !!resolvedSubjectId && cardQuery.isLoading;
  const isCardsLoadError = !!resolvedTopicId && !!resolvedSubjectId && cardQuery.isError;

  const isEmptyDeck = totalConcepts === 0;
  const hasActiveCard = renderedCard !== null;
  const isCompleted = !hasActiveCard && !isLoadingCards && !isEmptyDeck && totalConcepts > 0;

  const isFlashcard = renderedCard?.type === 'flashcard';
  const isSingleChoice = renderedCard?.type === 'single_choice';
  const isMultiChoice = renderedCard?.type === 'multi_choice';
  const isChoiceQuestion = isSingleChoice || isMultiChoice;

  // Handle answer selection for choice questions
  const handleAnswerSelect = (answer: string) => {
    if (isAnswerSubmitted || !renderedCard) return;

    if (isSingleChoice) {
      setSelectedAnswers([answer]);
    } else if (isMultiChoice) {
      if (selectedAnswers.includes(answer)) {
        setSelectedAnswers(selectedAnswers.filter((a) => a !== answer));
      } else {
        setSelectedAnswers([...selectedAnswers, answer]);
      }
    }
  };

  // Handle submit for choice questions
  const handleChoiceSubmit = () => {
    if (!renderedCard || !renderedCard.correctAnswers) return;

    const correctSet = new Set(renderedCard.correctAnswers);
    const selectedSet = new Set(selectedAnswers);

    let isAnswerCorrect: boolean;
    if (isMultiChoice) {
      isAnswerCorrect =
        correctSet.size === selectedSet.size &&
        Array.from(correctSet).every((answer) => selectedSet.has(answer));
    } else {
      isAnswerCorrect = selectedAnswers.length === 1 && correctSet.has(selectedAnswers[0]);
    }

    setIsCorrect(isAnswerCorrect);
    setIsAnswerSubmitted(true);
    // Don't submit result yet - show feedback first with Continue button
  };

  // Handle continue after seeing feedback for choice questions
  const handleChoiceContinue = () => {
    if (!currentConceptId) return;
    onSubmitResult(currentConceptId, isCorrect);
    setSelectedAnswers([]);
    setIsAnswerSubmitted(false);
    setIsCorrect(false);
  };

  // Handle self-rating for flashcards
  const handleRating = (rating: Rating) => {
    if (!currentConceptId) return;
    onSubmitResult(currentConceptId, undefined, rating);
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-[20px] p-8 max-w-[550px] w-[90%] max-h-[85vh] overflow-y-auto relative border border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-transparent border-none text-slate-400 text-2xl cursor-pointer leading-none p-1 hover:text-slate-200 transition-colors"
          aria-label="Close modal"
        >
          ×
        </button>

        {/* Header with Tabs */}
        <header className="text-center mb-3">
          <h2 className="text-2xl font-semibold text-slate-200 m-0">📚 Study Session</h2>

          {/* Theory Tab - only show when topic has theory content */}
          {currentTopicTheory && (
            <div className="flex justify-center gap-2 mt-3">
              <button
                onClick={() => setActiveTab('study')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'study'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                📖 Study
              </button>
              <button
                onClick={() => setActiveTab('theory')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'theory'
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                💡 Theory
              </button>
            </div>
          )}
        </header>

        {/* Level Up Banner */}
        {levelUpMessage && (
          <div className="mb-4 p-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl text-center animate-pulse">
            <div className="text-xl font-bold text-white">🎉 {levelUpMessage}</div>
            <div className="text-amber-100 text-sm mt-1">Keep up the great work!</div>
          </div>
        )}

        {/* Empty State */}
        {isEmptyDeck && (
          <div className="text-center py-8 px-5">
            <p className="text-slate-400 mb-4">No deck loaded. Click below to load the Data Science deck.</p>
            {onLoadDeck && (
              <button
                onClick={onLoadDeck}
                className="bg-cyan-500 text-white border-none py-3 px-6 rounded-lg text-base cursor-pointer hover:bg-cyan-400"
              >
                Load Default Deck
              </button>
            )}
          </div>
        )}

        {/* Loading State for cards */}
        {isLoadingCards && (
          <div className="text-center py-8 px-5 text-slate-300">Loading cards for this topic...</div>
        )}

        {/* Error State for cards */}
        {isCardsLoadError && (
          <div className="text-center py-8 px-5 text-amber-300">
            Unable to load cards for this topic. Open a topic and try again.
          </div>
        )}

        {/* Missing card data */}
        {!isLoadingCards && !isCardsLoadError && !hasActiveCard && !isEmptyDeck && !isCompleted && (
          <div className="text-center py-8 px-5 text-slate-300">
            <p className="mb-4">No current card is available for this study session.</p>
            <button
              onClick={onClose}
              className="bg-slate-700 text-white border-none py-3 px-6 rounded-lg text-base cursor-pointer hover:bg-slate-600"
            >
              Return to Grid
            </button>
          </div>
        )}

        {/* Concept Display - Study Tab */}
        {hasActiveCard && currentTopicTheory && activeTab === 'theory' && (
          <div className="w-full">
            <div className="bg-slate-900 rounded-[15px] p-5">
              <div className="text-violet-400 text-xs uppercase tracking-wider mb-3">💡 Theory</div>
              <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                {currentTopicTheory}
              </div>
            </div>
            <div className="mt-4 text-center">
              <button
                onClick={() => setActiveTab('study')}
                className="bg-cyan-600 text-white border-none py-3 px-8 rounded-lg text-base cursor-pointer hover:bg-cyan-500"
              >
                Back to Study
              </button>
            </div>
          </div>
        )}

        {/* Concept Display - Study Tab */}
        {hasActiveCard && activeTab === 'study' && renderedCard && (
          <div className="w-full">
            {/* Format Type Badge */}
            <div className="mb-3 flex items-center gap-2">
              <span className="text-cyan-500 text-xs uppercase tracking-wider">
                {isFlashcard && '📝 Flashcard'}
                {isSingleChoice && '⭕ Single Choice'}
                {isMultiChoice && '☑️ Multiple Choice'}
              </span>
            </div>

            {/* Question Content */}
            <div className="bg-slate-900 rounded-[15px] p-5 min-h-[150px] flex flex-col justify-center">
              {/* Question */}
              <div className="text-cyan-500 text-xs uppercase tracking-wider mb-2">Question</div>
              <div className="text-slate-200 text-lg">{renderedCard.question}</div>

              {/* Flashcard Answer */}
              {isFlashcard && isConceptFlipped && renderedCard.answer && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <div className="text-green-500 text-xs uppercase tracking-wider mb-2">Answer</div>
                  <div className="text-slate-200 text-lg">{renderedCard.answer}</div>
                </div>
              )}

              {/* Single Choice Options */}
              {isSingleChoice && renderedCard.options && (
                <div className="mt-4 space-y-2">
                  {renderedCard.options.map((option, index) => {
                    const isSelected = selectedAnswers.includes(option);
                    const isCorrectOption = renderedCard.correctAnswers?.includes(option);

                    let optionClass = 'bg-slate-800 border-slate-600 hover:bg-slate-700';
                    if (isAnswerSubmitted) {
                      if (isCorrectOption) {
                        optionClass = 'bg-green-900/50 border-green-500';
                      } else if (isSelected && !isCorrectOption) {
                        optionClass = 'bg-red-900/50 border-red-500';
                      }
                    } else if (isSelected) {
                      optionClass = 'bg-cyan-900/50 border-cyan-500';
                    }

                    return (
                      <button
                        key={index}
                        onClick={() => handleAnswerSelect(option)}
                        disabled={isAnswerSubmitted}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${optionClass} ${
                          isAnswerSubmitted ? 'cursor-default' : 'cursor-pointer'
                        }`}
                      >
                        <span className="text-slate-300">{option}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Multi Choice Options */}
              {isMultiChoice && renderedCard.options && (
                <div className="mt-4 space-y-2">
                  {renderedCard.options.map((option, index) => {
                    const isSelected = selectedAnswers.includes(option);
                    const isCorrectOption = renderedCard.correctAnswers?.includes(option);

                    let optionClass = 'bg-slate-800 border-slate-600 hover:bg-slate-700';
                    if (isAnswerSubmitted) {
                      if (isCorrectOption) {
                        optionClass = 'bg-green-900/50 border-green-500';
                      } else if (isSelected && !isCorrectOption) {
                        optionClass = 'bg-red-900/50 border-red-500';
                      }
                    } else if (isSelected) {
                      optionClass = 'bg-cyan-900/50 border-cyan-500';
                    }

                    return (
                      <button
                        key={index}
                        onClick={() => handleAnswerSelect(option)}
                        disabled={isAnswerSubmitted}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-colors flex items-center gap-3 ${
                          optionClass
                        } ${isAnswerSubmitted ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        <span className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected ? 'bg-cyan-500 border-cyan-500' : 'border-slate-500'
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </span>
                        <span className="text-slate-300">{option}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Context - shown after answering */}
              {((isFlashcard && isConceptFlipped) || (isChoiceQuestion && isAnswerSubmitted)) && renderedCard.context && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <div className="text-violet-400 text-xs uppercase tracking-wider mb-2">💡 Explanation</div>
                  <div className="text-slate-300 text-sm italic">{renderedCard.context}</div>
                </div>
              )}

              {/* Result Feedback for Choice Questions */}
              {isChoiceQuestion && isAnswerSubmitted && (
                <div className={`mt-4 p-3 rounded-lg text-center ${
                  isCorrect
                    ? 'bg-green-900/50 border border-green-500'
                    : 'bg-red-900/50 border border-red-500'
                }`}>
                  <span className={isCorrect ? 'text-green-400' : 'text-red-400'}>
                    {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                  </span>
                </div>
              )}

              {/* Concept Metadata */}
              <div className="flex gap-4 text-xs text-slate-500 border-t border-slate-700 pt-3 mt-4">
                <span>ID: {renderedCard.id.slice(0, 8)}</span>
                {currentConcept && <span>Difficulty: {currentConcept.difficulty}</span>}
                {sm2State && <span>Interval: {sm2State.interval} days</span>}
                {sm2State && <span>Reps: {sm2State.repetitions}</span>}
              </div>
            </div>

            {/* Feedback Message */}
            {feedbackMessage && (
              <div className="mt-3 text-center text-amber-400 text-lg font-semibold animate-pulse">
                {feedbackMessage}
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 text-center">
              {/* Flashcard Actions */}
              {isFlashcard && !isConceptFlipped && (
                <button
                  onClick={onFlip}
                  className="bg-violet-600 text-white border-none py-3 px-8 rounded-lg text-base cursor-pointer w-full hover:bg-violet-500"
                >
                  Show Answer
                </button>
              )}

              {isFlashcard && isConceptFlipped && (
                <div className="grid grid-cols-4 gap-2">
                  <span className="col-span-4 text-slate-400 text-sm mb-2">Rate your recall:</span>
                  {([1, 2, 3, 4] as Rating[]).map((rating) => (
                    <button
                      key={rating}
                      onClick={() => handleRating(rating)}
                      className="text-white border-none py-3 rounded-md text-sm font-bold cursor-pointer hover:opacity-90"
                      style={{
                        backgroundColor: getRatingColor(rating),
                      }}
                    >
                      {getRatingLabel(rating)}
                    </button>
                  ))}
                </div>
              )}

              {/* Choice Question Actions */}
              {isChoiceQuestion && !isAnswerSubmitted && (
                <button
                  onClick={handleChoiceSubmit}
                  disabled={selectedAnswers.length === 0}
                  className={`bg-cyan-600 text-white border-none py-3 px-8 rounded-lg text-base cursor-pointer w-full ${
                    selectedAnswers.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-cyan-500'
                  }`}
                >
                  Submit Answer
                </button>
              )}

              {isChoiceQuestion && isAnswerSubmitted && (
                <button
                  onClick={handleChoiceContinue}
                  className="bg-violet-600 text-white border-none py-3 px-8 rounded-lg text-base cursor-pointer w-full hover:bg-violet-500"
                >
                  Continue
                </button>
              )}
            </div>
          </div>
        )}

        {/* Completed State */}
        {isCompleted && (
          <div className="text-center py-6 px-5">
            <h3 className="text-green-500 text-xl mb-2">🎉 All Done!</h3>
            <p className="text-slate-400 mb-2">You've reviewed all concepts due today.</p>
            <p className="text-slate-400 mb-4">Return to the grid to see your crystals grow!</p>
            <button
              onClick={onClose}
              className="bg-cyan-500 text-white border-none py-3 px-6 rounded-lg text-base cursor-pointer hover:bg-cyan-400"
            >
              Back to Grid
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default StudyPanelModal;
