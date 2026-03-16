import React, { useEffect } from 'react';
import { motion } from 'motion/react';

interface StudyPanelFeedbackMessageProps {
  feedbackMessage?: string | null;
  xpGainAmount?: number | null;
  onDone?: () => void;
  durationMs?: number;
}

export function StudyPanelFeedbackMessage({
  feedbackMessage,
  xpGainAmount,
  onDone,
  durationMs = 1500,
}: StudyPanelFeedbackMessageProps) {
  const showXpGain = xpGainAmount !== undefined && xpGainAmount !== null;
  const show = Boolean(feedbackMessage) || showXpGain;

  useEffect(() => {
    if (!onDone || !show) {
      return;
    }

    const timeout = window.setTimeout(() => {
      onDone();
    }, durationMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [onDone, show, durationMs]);

  if (!show) {
    return null;
  }

  return (
    <motion.div
      className="mt-3 text-center text-amber-400 text-lg font-semibold"
      data-testid="study-panel-feedback-message"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {feedbackMessage && <div>{feedbackMessage}</div>}

      {showXpGain && (
        <motion.div
          className="mt-2 inline-flex justify-center pointer-events-none"
          initial={{ opacity: 0, y: 6, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2, ease: 'easeOut', delay: 0.08 }}
        >
          <span
            data-testid="study-card-xp-gain"
            className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-300 text-emerald-200 text-sm font-semibold shadow-lg inline-block"
          >
            +{xpGainAmount} XP
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}

