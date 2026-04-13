import { describe, expect, it, vi } from 'vitest';

import { appEventBus } from '@/infrastructure/eventBus';

import { triggerSubjectGeneration } from './triggerSubjectGeneration';

describe('triggerSubjectGeneration', () => {
  it("emits subject:generation-pipeline with subjectId and checklist", () => {
    const handler = vi.fn();
    const off = appEventBus.on('subject:generation-pipeline', handler);

    triggerSubjectGeneration('my-subject', {
      topicName: 'My Topic',
      studyGoal: 'curiosity',
      priorKnowledge: 'beginner',
      learningStyle: 'balanced',
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      subjectId: 'my-subject',
      checklist: {
        topicName: 'My Topic',
        studyGoal: 'curiosity',
        priorKnowledge: 'beginner',
        learningStyle: 'balanced',
      },
    });

    off();
  });
});
