import { appEventBus } from '@/infrastructure/eventBus';

export function triggerTopicUnlockPipeline(
  subjectId: string,
  topicId: string,
  options?: { enableThinking?: boolean; signal?: AbortSignal },
): void {
  appEventBus.emit('topic:unlock-pipeline', {
    subjectId,
    topicId,
    enableThinking: options?.enableThinking ?? false,
  });
}
