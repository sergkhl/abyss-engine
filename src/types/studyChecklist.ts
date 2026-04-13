export type StudyGoal = 'curiosity' | 'exam-prep' | 'career-switch' | 'refresh';
export type PriorKnowledge = 'none' | 'beginner' | 'intermediate' | 'advanced';
export type LearningStyle = 'balanced' | 'theory-heavy' | 'practice-heavy';

export interface StudyChecklist {
  topicName: string;
  studyGoal?: StudyGoal;
  priorKnowledge?: PriorKnowledge;
  learningStyle?: LearningStyle;
  focusAreas?: string;
}

export const STUDY_CHECKLIST_DEFAULTS: Required<Omit<StudyChecklist, 'topicName' | 'focusAreas'>> = {
  studyGoal: 'curiosity',
  priorKnowledge: 'none',
  learningStyle: 'balanced',
};
