import { getChatCompletionsRepositoryForSurface } from '@/infrastructure/llmInferenceRegistry';
import {
  resolveEnableStreamingForSurface,
  resolveEnableThinkingForSurface,
  resolveModelForSurface,
} from '@/infrastructure/llmInferenceSurfaceProviders';
import type { IChatCompletionsRepository } from '@/types/llm';

export interface SubjectGenerationStageBinding {
  chat: IChatCompletionsRepository;
  model: string;
  enableStreaming: boolean;
  enableThinking: boolean;
}

export interface SubjectGenerationStageBindings {
  topics: SubjectGenerationStageBinding;
  edges: SubjectGenerationStageBinding;
}

export function resolveSubjectGenerationStageBindings(): SubjectGenerationStageBindings {
  const topics: SubjectGenerationStageBinding = {
    chat: getChatCompletionsRepositoryForSurface('subjectGenerationTopics'),
    model: resolveModelForSurface('subjectGenerationTopics'),
    enableStreaming: resolveEnableStreamingForSurface('subjectGenerationTopics'),
    enableThinking: resolveEnableThinkingForSurface('subjectGenerationTopics'),
  };
  const edges: SubjectGenerationStageBinding = {
    chat: getChatCompletionsRepositoryForSurface('subjectGenerationEdges'),
    model: resolveModelForSurface('subjectGenerationEdges'),
    enableStreaming: false,
    enableThinking: resolveEnableThinkingForSurface('subjectGenerationEdges'),
  };
  return { topics, edges };
}
