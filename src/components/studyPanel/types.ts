export type StudyPanelTab = 'study' | 'theory' | 'system_prompt' | 'settings';

export type StudyPanelFeedbackEvent = {
  id: string;
  message: string;
  xpAmount?: number;
  durationMs: number;
};
