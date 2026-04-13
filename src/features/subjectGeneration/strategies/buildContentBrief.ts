import type { LearningStyle, PriorKnowledge, StudyGoal } from '@/types/studyChecklist';

export function buildContentBrief(params: {
  goal: StudyGoal;
  knowledge: PriorKnowledge;
  style: LearningStyle;
  topicName: string;
}): string {
  const { goal, knowledge, style, topicName } = params;

  const depth =
    knowledge === 'none' || knowledge === 'beginner'
      ? 'Use plain language, short explanations, and frequent scaffolding.'
      : knowledge === 'intermediate'
        ? 'Assume partial context; connect new ideas to prior topics succinctly.'
        : 'Be concise; prioritize precision and edge cases over lengthy exposition.';

  const goalTone =
    goal === 'exam-prep'
      ? 'Favor distinctions, definitions, and formats that support retrieval under pressure.'
      : goal === 'career-switch'
        ? 'Tie explanations to realistic workflows and decision points where possible.'
        : goal === 'refresh'
          ? 'Highlight what matters most to remember and common pitfalls.'
          : 'Encourage curiosity with clear “why this matters” framing.';

  const styleTone =
    style === 'theory-heavy'
      ? 'Prefer theory sections and recall-oriented flashcards over games.'
      : style === 'practice-heavy'
        ? 'Prefer interactive and applied prompts; keep theory minimal but accurate.'
        : 'Balance theory, recall, and light interactivity.';

  return [
    `Learner context for "${topicName}".`,
    depth,
    goalTone,
    styleTone,
    'When generating cards, honor the configured theory depth, difficulty bias, and card mix from strategy metadata when present.',
  ].join(' ');
}
