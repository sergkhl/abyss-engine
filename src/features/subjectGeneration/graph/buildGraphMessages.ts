import type { ChatMessage } from '@/types/llm';
import type { GraphStrategy } from '@/types/generationStrategy';
import subjectGraphPrompt from '@/prompts/subject-graph.prompt';
import { interpolatePromptTemplate } from '@/lib/interpolatePromptTemplate';

export function buildGraphMessages(subjectId: string, strategy: GraphStrategy): ChatMessage[] {
  const topicCount = strategy.totalTiers * strategy.topicsPerTier;
  const systemContent = interpolatePromptTemplate(subjectGraphPrompt, {
    subjectId,
    themeId: subjectId,
    subjectTitle: strategy.domainBrief,
    topicCount: String(topicCount),
    maxTier: String(strategy.totalTiers),
    topicsPerTier: String(strategy.topicsPerTier),
    audience: strategy.audienceBrief,
    domainDescription: strategy.domainBrief,
  });

  const userContent = strategy.focusConstraints.trim()
    ? `Additional constraints from the learner:\n${strategy.focusConstraints}`
    : 'Generate the curriculum graph now.';

  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: userContent },
  ];
}
