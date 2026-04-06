import { stripTheoryMarkdownForSpeech } from './theorySpeech';

/**
 * Plain text for LLM assistant output read aloud (markdown stripped).
 */
export function stripLlmMarkdownForSpeech(markdown: string | null | undefined): string {
  return stripTheoryMarkdownForSpeech(markdown ?? '');
}

/**
 * Pulls leading "complete" segments from a **raw assistant** substring (`delta`):
 * full lines (newline-terminated), then full sentences (`.?!` followed by space or end).
 * Use on `assistantText.slice(rawConsumed)` so progress stays monotonic while markdown streams.
 * Strip each chunk with {@link stripLlmMarkdownForSpeech} before speaking.
 */
export function extractCompleteSpeechChunks(delta: string): { chunks: string[]; remainder: string } {
  const chunks: string[] = [];
  let rest = delta;

  while (rest.length > 0) {
    const nl = rest.indexOf('\n');
    if (nl !== -1) {
      const line = rest.slice(0, nl).trim();
      if (line.length > 0) {
        chunks.push(line);
      }
      rest = rest.slice(nl + 1);
      continue;
    }

    const sentenceMatch = rest.match(/^(.+?[.!?])(?=\s|$)/);
    if (sentenceMatch) {
      const sent = sentenceMatch[1].trim();
      if (sent.length > 0) {
        chunks.push(sent);
      }
      rest = rest.slice(sentenceMatch[0].length);
      const leadingSpace = rest.match(/^\s+/);
      if (leadingSpace) {
        rest = rest.slice(leadingSpace[0].length);
      }
      continue;
    }

    break;
  }

  return { chunks, remainder: rest };
}
