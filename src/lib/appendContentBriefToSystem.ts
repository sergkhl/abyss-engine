export function appendContentBriefToSystem(systemContent: string, contentBrief?: string): string {
  const trimmed = contentBrief?.trim();
  if (!trimmed) {
    return systemContent;
  }
  return `${systemContent}\n\n## Learner Context\n\n${trimmed}`;
}
