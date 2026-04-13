import { describe, expect, it } from 'vitest';

import type { PriorKnowledge, StudyGoal } from '@/types/studyChecklist';

import { resolveStrategy } from './strategyResolver';

const goals: StudyGoal[] = ['curiosity', 'exam-prep', 'career-switch', 'refresh'];
const knowledge: PriorKnowledge[] = ['none', 'beginner', 'intermediate', 'advanced'];

describe('resolveStrategy', () => {
  it('produces valid strategy for all goal × knowledge combos', () => {
    for (const g of goals) {
      for (const k of knowledge) {
        const s = resolveStrategy({ topicName: 'Test topic', studyGoal: g, priorKnowledge: k });
        expect(s.graph.totalTiers).toBe(3);
        expect(s.graph.topicsPerTier).toBe(5);
        expect(s.graph.domainBrief).toBe('Test topic');
        expect(s.content.contentBrief.length).toBeGreaterThan(10);
        const sum =
          s.content.cardMix.flashcardWeight +
          s.content.cardMix.choiceWeight +
          s.content.cardMix.miniGameWeight;
        expect(sum).toBeCloseTo(1, 5);
      }
    }
  });

  it('applies defaults for omitted checklist fields', () => {
    const s = resolveStrategy({ topicName: 'Only name' });
    expect(s.graph.audienceBrief.length).toBeGreaterThan(0);
    expect(s.content.theoryDepth).toBeDefined();
  });
});
