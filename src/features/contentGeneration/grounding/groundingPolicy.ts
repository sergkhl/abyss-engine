import type { GroundingSearchPolicy } from '@/types/grounding';
import type { OpenRouterWebSearchTool } from '@/types/llm';

export const FIRECRAWL_TOPIC_GROUNDING_POLICY: GroundingSearchPolicy = {
  engine: 'firecrawl',
  maxResults: 3,
  maxTotalResults: 6,
  requireWebSearch: true,
  minAcceptedSources: 2,
  requireAuthoritativePrimarySource: true,
  authoritativePrimarySourceDomains: [
    'developer.mozilla.org',
    'docs.python.org',
    'docs.oracle.com',
    'learn.microsoft.com',
    'react.dev',
    'nextjs.org',
    'nodejs.org',
    'typescriptlang.org',
    'go.dev',
    'rust-lang.org',
    'doc.rust-lang.org',
    'kubernetes.io',
    'docs.docker.com',
    'postgresql.org',
    'sqlite.org',
    'mysql.com',
    'w3.org',
    'whatwg.org',
    'ietf.org',
    'rfc-editor.org',
    'iso.org',
    'ecma-international.org',
    'tc39.es',
    'opengroup.org',
  ],
  rejectedDomains: [
    'reddit.com',
    'quora.com',
    'stackoverflow.com',
    'twitter.com',
    'x.com',
    'tiktok.com',
    'youtube.com',
    'medium.com',
    'substack.com',
    'coursehero.com',
    'chegg.com',
    'brainly.com',
  ],
};

export function buildOpenRouterWebSearchTools(
  policy: GroundingSearchPolicy,
): OpenRouterWebSearchTool[] {
  return [
    {
      type: 'openrouter:web_search',
      parameters: {
        engine: policy.engine,
        max_results: policy.maxResults,
        max_total_results: policy.maxTotalResults,
      },
    },
  ];
}
