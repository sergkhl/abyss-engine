/** Stable keys for LLM inference entry points (hooks / modals). */
export type InferenceSurfaceId =
  | 'studyQuestionExplain'
  | 'studyFormulaExplain'
  | 'studyQuestionMermaid'
  | 'screenCaptureSummary'
  | 'subjectGeneration'
  | 'topicContent';

export type LlmInferenceProviderId = 'openai-compatible' | 'gemini';
