type RatingValue = 1 | 2 | 3 | 4;

export type StudyPanelHistoryAction = 'undo' | 'redo' | 'submit' | 'session-complete';

export interface ProgressionEventMap {
  'study-panel-history': {
    action: StudyPanelHistoryAction;
    topicId?: string;
    undoCount?: number;
    redoCount?: number;
  };
  'xp-gained': {
    amount: number;
    rating: RatingValue;
    cardId?: string;
    topicId?: string;
  };
  'session-complete': {
    topicId: string;
    correctRate: number;
    totalAttempts: number;
  };
}

export type ProgressionEventType = keyof ProgressionEventMap;
export type ProgressionEventPayload<T extends ProgressionEventType> = ProgressionEventMap[T];
