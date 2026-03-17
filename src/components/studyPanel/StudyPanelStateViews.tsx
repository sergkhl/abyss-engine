import React from 'react';

import MathMarkdownRenderer from '../MathMarkdownRenderer';
import {
  NativeSelect,
  NativeSelectOption,
} from '../ui/native-select';
import { StudyPanelTab } from './types';
import { Button } from '@/components/ui/button';

interface StudyPanelStateViewsProps {
  levelUpMessage?: string | null;
  activeTab: StudyPanelTab;
  hasTheory: boolean;
  isEmptyDeck: boolean;
  isLoadingCards: boolean;
  isCardsLoadError: boolean;
  hasActiveCard: boolean;
  isCompleted: boolean;
  resolvedTopicTheory: string | null;
  topicSystemPrompt: string;
  targetAudience: string;
  targetAudienceOptions: readonly string[];
  onClose: () => void;
  onSetTargetAudience: (targetAudience: string) => void;
  onSystemPromptSelect: () => void;
  systemPromptRef: React.RefObject<HTMLPreElement | null>;
}

export function StudyPanelStateViews({
  levelUpMessage,
  activeTab,
  hasTheory,
  isEmptyDeck,
  isLoadingCards,
  isCardsLoadError,
  hasActiveCard,
  isCompleted,
  resolvedTopicTheory,
  topicSystemPrompt,
  targetAudience,
  targetAudienceOptions,
  onClose,
  onSetTargetAudience,
  onSystemPromptSelect,
  systemPromptRef,
}: StudyPanelStateViewsProps) {
  return (
    <div className="min-h-0 pr-1" data-testid="study-panel-state">
      {/* Level Up Banner */}
      {levelUpMessage && (
        <div className="mb-4 p-4 bg-gradient-to-r from-accent to-secondary rounded-xl text-center animate-pulse">
          <div className="text-xl font-bold text-foreground">🎉 {levelUpMessage}</div>
          <div className="text-accent-foreground text-sm mt-1">Keep up the great work!</div>
        </div>
      )}

      {/* Empty State */}
      {isEmptyDeck && (
        <div className="text-center py-8 px-5">
          <p className="text-muted-foreground mb-4" data-testid="study-panel-empty-state">
            No cards are currently available for this topic.
          </p>
        </div>
      )}

      {/* Loading State for cards */}
      {isLoadingCards && (
        <div className="text-center py-8 px-5 text-muted-foreground" data-testid="study-panel-loading">
          Loading cards for this topic...
        </div>
      )}

      {/* Error State for cards */}
      {isCardsLoadError && (
        <div className="text-center py-8 px-5 text-destructive" data-testid="study-panel-error">
          Unable to load cards for this topic. Open a topic and try again.
        </div>
      )}

      {/* Missing card data */}
      {!isLoadingCards && !isCardsLoadError && !hasActiveCard && !isEmptyDeck && !isCompleted && (
        <div className="text-center py-8 px-5 text-muted-foreground">
          <p className="mb-4" data-testid="study-panel-no-card">
            No current card is available for this study session.
          </p>
          <Button
            onClick={onClose}
            className="w-full"
            data-testid="study-panel-return-to-grid"
          >
            Return to Grid
          </Button>
        </div>
      )}

      {/* Theory View */}
      {hasTheory && activeTab === 'theory' && resolvedTopicTheory && (
        <div className="w-full">
          <div className="bg-card rounded-[15px] p-5" data-testid="study-panel-theory">
            <div className="text-primary text-xs uppercase tracking-wider mb-3">💡 Theory</div>
            <MathMarkdownRenderer
              source={resolvedTopicTheory}
              className="text-foreground leading-relaxed markdown-body markdown-body--theory"
            />
          </div>
        </div>
      )}

      {/* System Prompt View */}
      {activeTab === 'system_prompt' && (
        <div className="w-full">
          <div className="bg-card rounded-[15px] p-5" data-testid="study-panel-system-prompt">
            <div
              className="text-accent-foreground text-xs uppercase tracking-wider mb-3 cursor-pointer"
              onClick={onSystemPromptSelect}
              data-testid="study-panel-system-prompt-title"
            >
              📋 System Prompt
            </div>
            <pre
              ref={systemPromptRef}
              className="text-foreground leading-relaxed text-sm whitespace-pre-wrap break-words cursor-pointer"
            >
              {topicSystemPrompt}
            </pre>
          </div>
        </div>
      )}

      {/* Study Settings View */}
      {activeTab === 'settings' && (
        <div className="w-full">
          <div className="bg-card rounded-[15px] p-5" data-testid="study-panel-settings">
            <div className="text-primary text-xs uppercase tracking-wider mb-3">🎚️ Study Settings</div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Target Audience</label>
              <NativeSelect
                value={targetAudience}
                onChange={(event) => onSetTargetAudience(event.currentTarget.value)}
                aria-label="study-settings-target-audience"
                className="w-full"
              >
                <NativeSelectOption value="" disabled>
                  Select target audience
                </NativeSelectOption>
                {targetAudienceOptions.map((option) => (
                  <NativeSelectOption key={option} value={option}>
                    {option}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>
        </div>
      )}

      {/* Completed State */}
      {isCompleted && (
        <div className="text-center py-6 px-5">
          <h3 className="text-primary text-xl mb-2">🎉 All Done!</h3>
          <p className="text-muted-foreground mb-2">You&apos;ve reviewed all cards due today.</p>
          <p className="text-muted-foreground mb-4">Return to the grid to see your crystals grow!</p>
          <div className="sticky bottom-0 z-10 bg-card py-3">
            <Button
              onClick={onClose}
              className="w-full"
              data-testid="study-panel-all-done-cta"
            >
              Back to Grid
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
