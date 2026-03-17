import { useEffect } from 'react';
import { toast } from 'sonner';
import { StudyPanelFeedbackEvent } from './types';

interface StudyPanelFeedbackMessageProps {
  feedbackEvent?: StudyPanelFeedbackEvent | null;
  onDone?: (feedbackEventId?: string) => void;
}

export function StudyPanelFeedbackMessage({
  feedbackEvent,
  onDone,
}: StudyPanelFeedbackMessageProps) {
  const show = Boolean(feedbackEvent);
  const toastId = feedbackEvent ? `study-panel-feedback-${feedbackEvent.id}` : undefined;
  const toastMessage = feedbackEvent
    ? feedbackEvent.xpAmount != null && feedbackEvent.xpAmount > 0
      ? `${feedbackEvent.message} +${feedbackEvent.xpAmount} XP`
      : feedbackEvent.message
    : '';

  useEffect(() => {
    if (!show) {
      return;
    }

    let doneCalled = false;
    const handleDone = () => {
      if (doneCalled) {
        return;
      }
      doneCalled = true;
      onDone?.(feedbackEvent?.id);
    };

    toast.success(
      <span data-testid="study-card-xp-gain">
        <span data-testid="study-panel-feedback-message">{toastMessage}</span>
      </span>,
      {
        duration: feedbackEvent?.durationMs,
        onAutoClose: handleDone,
        id: toastId,
      }
    );
  }, [toastMessage, show, feedbackEvent?.durationMs, onDone, feedbackEvent?.id, toastId]);

  return null;
}
