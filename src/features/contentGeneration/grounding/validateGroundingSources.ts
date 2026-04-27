import type {
  GroundingSearchPolicy,
  GroundingSource,
  GroundingSourceTrustLevel,
  GroundingUsage,
  RejectedGroundingSource,
} from '@/types/grounding';

export interface GroundingValidationResult {
  acceptedSources: GroundingSource[];
  rejectedSources: RejectedGroundingSource[];
  usage: GroundingUsage;
  errors: string[];
}

function hostFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function matchesDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

function matchesAnyDomain(host: string, domains: readonly string[]): boolean {
  return domains.some((domain) => matchesDomain(host, domain));
}

function isRejectedHost(host: string, rejectedDomains: readonly string[]): boolean {
  return matchesAnyDomain(host, rejectedDomains);
}

const SCHOLARLY_PRIMARY_DOMAINS = [
  'pubmed.ncbi.nlm.nih.gov',
  'arxiv.org',
  'doi.org',
  'ieee.org',
  'acm.org',
] as const;

function isAcademicOrGovernmentHost(host: string): boolean {
  return host.endsWith('.edu') || host.includes('.ac.') || host.endsWith('.gov');
}

function isAuthoritativePrimarySource(host: string, policy: GroundingSearchPolicy): boolean {
  return (
    isAcademicOrGovernmentHost(host) ||
    matchesAnyDomain(host, SCHOLARLY_PRIMARY_DOMAINS) ||
    matchesAnyDomain(host, policy.authoritativePrimarySourceDomains)
  );
}

function trustLevelForHost(
  host: string,
  url: string,
  policy: GroundingSearchPolicy,
): GroundingSourceTrustLevel {
  if (isAuthoritativePrimarySource(host, policy)) {
    return 'high';
  }
  if (
    matchesDomain(host, 'wikipedia.org') ||
    host.includes('docs.') ||
    host.includes('developer.') ||
    url.includes('/docs/')
  ) {
    return 'medium';
  }
  return 'medium';
}

function explicitWebSearchRequestsFromProvider(
  providerMetadata: Record<string, unknown> | undefined,
): number | null {
  const usage = providerMetadata?.usage;
  if (!usage || typeof usage !== 'object') return null;

  const directRequests = (usage as { web_search_requests?: unknown }).web_search_requests;
  if (typeof directRequests === 'number' && Number.isFinite(directRequests)) {
    return directRequests;
  }

  const serverToolUse = (usage as { server_tool_use?: unknown }).server_tool_use;
  if (!serverToolUse || typeof serverToolUse !== 'object') return null;
  const requests = (serverToolUse as { web_search_requests?: unknown }).web_search_requests;
  return typeof requests === 'number' && Number.isFinite(requests) ? requests : null;
}

function hasUrlCitationAnnotations(providerMetadata: Record<string, unknown> | undefined): boolean {
  const annotations = providerMetadata?.annotations;
  if (!Array.isArray(annotations)) return false;

  return annotations.some((annotation) => {
    if (!annotation || typeof annotation !== 'object') return false;
    const record = annotation as { type?: unknown; url_citation?: unknown };
    return record.type === 'url_citation' && !!record.url_citation && typeof record.url_citation === 'object';
  });
}

function hasCitations(providerMetadata: Record<string, unknown> | undefined): boolean {
  const citations = providerMetadata?.citations;
  if (Array.isArray(citations)) return citations.length > 0;
  return !!citations;
}

function webSearchRequestsFromProvider(providerMetadata: Record<string, unknown> | undefined): number {
  const explicitRequests = explicitWebSearchRequestsFromProvider(providerMetadata);
  if (explicitRequests !== null) return explicitRequests;

  if (hasUrlCitationAnnotations(providerMetadata) || hasCitations(providerMetadata)) {
    return 1;
  }

  return 0;
}

export function validateGroundingSources(params: {
  sources: GroundingSource[];
  policy: GroundingSearchPolicy;
  providerMetadata?: Record<string, unknown>;
}): GroundingValidationResult {
  const usage: GroundingUsage = {
    webSearchRequests: webSearchRequestsFromProvider(params.providerMetadata),
  };
  const acceptedSources: GroundingSource[] = [];
  const rejectedSources: RejectedGroundingSource[] = [];
  const errors: string[] = [];

  if (params.policy.requireWebSearch && usage.webSearchRequests <= 0) {
    errors.push('Provider usage reported zero web-search requests');
  }

  for (const source of params.sources) {
    const host = hostFromUrl(source.url);
    if (!host) {
      rejectedSources.push({ title: source.title, url: source.url, reason: 'Invalid source URL' });
      continue;
    }
    if (!source.title.trim()) {
      rejectedSources.push({ title: source.title, url: source.url, reason: 'Missing source title' });
      continue;
    }
    if (!source.retrievedAt.trim() || Number.isNaN(Date.parse(source.retrievedAt))) {
      rejectedSources.push({ title: source.title, url: source.url, reason: 'Invalid retrievedAt timestamp' });
      continue;
    }
    if (isRejectedHost(host, params.policy.rejectedDomains)) {
      rejectedSources.push({ title: source.title, url: source.url, reason: `Rejected source host: ${host}` });
      continue;
    }

    const trustLevel = trustLevelForHost(host, source.url, params.policy);
    acceptedSources.push({ ...source, trustLevel });
  }

  if (acceptedSources.length < params.policy.minAcceptedSources) {
    errors.push(`At least ${params.policy.minAcceptedSources} accepted grounding sources are required`);
  }
  if (params.policy.requireAuthoritativePrimarySource && !acceptedSources.some((s) => s.trustLevel === 'high')) {
    errors.push('At least one authoritative primary source is required');
  }

  return { acceptedSources, rejectedSources, usage, errors };
}
