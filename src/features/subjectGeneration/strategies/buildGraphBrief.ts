import type { LearningStyle, PriorKnowledge, StudyGoal } from '@/types/studyChecklist';

export function buildGraphBrief(params: {
  goal: StudyGoal;
  knowledge: PriorKnowledge;
  style: LearningStyle;
  topicName: string;
}): string {
  const { goal, knowledge, style, topicName } = params;

  const knowledgeLine =
    knowledge === 'none'
      ? 'Assume no prior domain knowledge unless the topic name implies otherwise.'
      : knowledge === 'beginner'
        ? 'The learner has beginner exposure; avoid jargon without definition.'
        : knowledge === 'intermediate'
          ? 'The learner has working familiarity; you may connect ideas across subtopics.'
          : 'The learner is advanced; emphasize depth, tradeoffs, and synthesis.';

  const goalLine =
    goal === 'curiosity'
      ? 'Motivation is exploration and understanding, not a credential.'
      : goal === 'exam-prep'
        ? 'Structure supports exam-style recall and careful distinction of similar concepts.'
        : goal === 'career-switch'
          ? 'Emphasize practical literacy and skills that transfer to professional contexts.'
          : 'Assume the learner is refreshing memory; prioritize clarity and efficient coverage.';

  const styleLine =
    style === 'balanced'
      ? 'Balance conceptual structure with applied examples.'
      : style === 'theory-heavy'
        ? 'Favor conceptual foundations, definitions, and principled ordering of ideas.'
        : 'Favor applied topics, drills, and concrete scenarios while keeping prerequisites strict.';

  return [
    `Generate a curriculum graph for "${topicName}".`,
    goalLine,
    knowledgeLine,
    styleLine,
    'Use exactly three tiers: Tier 1 foundational vocabulary and core concepts; Tier 2 applied understanding building on Tier 1; Tier 3 synthesis and cross-topic connections grounded in Tier 2.',
    'Respect prerequisite rules from the system prompt: Tier 1 has no prerequisites; higher tiers only reference lower tiers.',
  ].join(' ');
}
