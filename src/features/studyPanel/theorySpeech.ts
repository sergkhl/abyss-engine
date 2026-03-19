export function stripTheoryMarkdownForSpeech(markdown: string): string {
  const source = markdown ?? '';

  if (!source.trim()) {
    return '';
  }

  const withoutCodeBlocks = source
    .replace(/```[\s\S]*?```/g, (match) => `\n${match.slice(3, -3)}\n`)
    .replace(/`{1,3}([^`]+?)`{1,3}/g, '$1');

  const withoutLinks = withoutCodeBlocks
    .replace(/!\[[^\]]*]\((.*?)\)/g, '')
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, '$1');

  const withoutEmphasis = withoutLinks
    .replace(/(\*\*?|__?)([^*_`]+?)\1/g, '$2')
    .replace(/~~([^~]+?)~~/g, '$1');

  const withoutHeadings = withoutEmphasis
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*[-+*]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n');

  const withoutMath = withoutHeadings
    .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/\$\s*$/gm, '')
    .replace(/^\s*[\|\-:]+\s*$/gm, '');

  return withoutMath
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
