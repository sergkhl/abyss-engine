'use client';

import type {
  AutocaptureCompatibleElement,
  DomAutocaptureEvents,
} from 'posthog-js';

export const POSTHOG_DEFAULTS = '2026-01-30' as const;
export const POSTHOG_DEFAULT_HOST = 'https://us.i.posthog.com';
export const POSTHOG_LOCAL_DISABLE_KEY = 'abyss-analytics-disabled';
export const POSTHOG_QUERY_KILL_PARAM = 'abyss-analytics';
export const POSTHOG_QUERY_KILL_VALUE = 'off';
export const POSTHOG_DISTINCT_ID_KEY = 'abyss-posthog-player-id';

export interface PosthogResolvedConfig {
  token: string;
  host: string;
  defaults: typeof POSTHOG_DEFAULTS;
  recordCanvas: false;
  enableSessionRecording: true;
  autocapture: {
    dom_event_allowlist: readonly DomAutocaptureEvents[];
    element_allowlist: readonly AutocaptureCompatibleElement[];
  };
}

export interface PosthogEnv {
  token?: string | null;
  host?: string | null;
}

/**
 * Reads the build-time environment. NEXT_PUBLIC_* vars are inlined by
 * Next.js at build time, so this is safe to call from the browser.
 */
function readEnv(): PosthogEnv {
  return {
    token: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ?? null,
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? null,
  };
}

function isQueryKillSwitchActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get(POSTHOG_QUERY_KILL_PARAM) === POSTHOG_QUERY_KILL_VALUE;
  } catch {
    return false;
  }
}

function isLocalKillSwitchActive(): boolean {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return false;
  }
  try {
    return window.localStorage.getItem(POSTHOG_LOCAL_DISABLE_KEY) === '1';
  } catch {
    // SecurityError in private mode etc. Treat unreadable storage as
    // "no kill switch active" so the explicit query-string switch is
    // still authoritative.
    return false;
  }
}

/**
 * True when the kill switch is active. Precedence: querystring >
 * localStorage. Either source flipping the switch fully disables PostHog.
 */
export function isAnalyticsKillSwitchActive(): boolean {
  return isQueryKillSwitchActive() || isLocalKillSwitchActive();
}

/**
 * Resolves the PostHog runtime config. Returns null when:
 *  - Running outside the browser.
 *  - The kill switch is active (querystring or localStorage).
 *  - No project token is provided in the environment.
 *
 * The returned shape is intentionally complete — callers must not
 * second-guess autocapture allowlists or session-recording posture.
 */
export function readPosthogConfig(
  env: PosthogEnv = readEnv(),
): PosthogResolvedConfig | null {
  if (typeof window === 'undefined') return null;
  if (isAnalyticsKillSwitchActive()) return null;

  const token = env.token?.trim();
  if (!token) return null;

  const host = env.host?.trim() || POSTHOG_DEFAULT_HOST;

  return {
    token,
    host,
    defaults: POSTHOG_DEFAULTS,
    recordCanvas: false,
    enableSessionRecording: true,
    autocapture: {
      // Day-one allowlist; broaden only after architectural review.
      dom_event_allowlist: ['click', 'submit', 'change'],
      element_allowlist: ['button', 'a', 'input'],
    },
  };
}
