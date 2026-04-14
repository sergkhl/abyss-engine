import { appEventBus } from '@/infrastructure/eventBus';

export function triggerTopicGenerationPipeline(
  subjectId: string,
  topicId: string,
  options?: { enableThinking?: boolean; signal?: AbortSignal },
): void {
  appEventBus.emit('topic:generation-pipeline', {
    subjectId,
    topicId,
    enableThinking: options?.enableThinking ?? false,
  });
}
