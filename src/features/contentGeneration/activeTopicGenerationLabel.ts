import type { ContentGenerationState } from './contentGenerationStore';

/** Label of an in-flight generation job for this topic ref, or null if none. */
export function activeTopicGenerationLabel(
  state: Pick<ContentGenerationState, 'jobs'>,
  subjectId: string,
  topicId: string,
): string | null {
  for (const j of Object.values(state.jobs)) {
    if (
      j.subjectId === subjectId &&
      j.topicId === topicId &&
      (j.status === 'pending' ||
        j.status === 'streaming' ||
        j.status === 'parsing' ||
        j.status === 'saving')
    ) {
      return j.label;
    }
  }
  return null;
}
