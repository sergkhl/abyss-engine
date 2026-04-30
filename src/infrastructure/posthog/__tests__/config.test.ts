import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  POSTHOG_DEFAULTS,
  POSTHOG_DEFAULT_HOST,
  POSTHOG_LOCAL_DISABLE_KEY,
  POSTHOG_QUERY_KILL_PARAM,
  POSTHOG_QUERY_KILL_VALUE,
  isAnalyticsKillSwitchActive,
  readPosthogConfig,
} from '../config';

const TOKEN = 'phc_test_token_value';
const HOST = 'https://us.i.posthog.com';

const ORIGINAL_LOCATION = window.location;

function setLocationSearch(search: string): void {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { ...ORIGINAL_LOCATION, search } as Location,
  });
}

function restoreLocation(): void {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: ORIGINAL_LOCATION,
  });
}

describe('readPosthogConfig', () => {
  beforeEach(() => {
    setLocationSearch('');
    window.localStorage.clear();
  });

  afterEach(() => {
    restoreLocation();
    window.localStorage.clear();
  });

  it('returns null when no token is present', () => {
    expect(readPosthogConfig({ token: null, host: HOST })).toBeNull();
    expect(readPosthogConfig({ token: '', host: HOST })).toBeNull();
    expect(readPosthogConfig({ token: '   ', host: HOST })).toBeNull();
  });

  it('returns a complete config with the documented safe posture when a token is present', () => {
    const config = readPosthogConfig({ token: TOKEN, host: HOST });
    expect(config).not.toBeNull();
    expect(config!.token).toBe(TOKEN);
    expect(config!.host).toBe(HOST);
    expect(config!.defaults).toBe(POSTHOG_DEFAULTS);
    expect(config!.recordCanvas).toBe(false);
    expect(config!.enableSessionRecording).toBe(true);
    expect(config!.autocapture.dom_event_allowlist).toEqual(
      expect.arrayContaining(['click', 'submit', 'change']),
    );
    expect(config!.autocapture.element_allowlist).toEqual(
      expect.arrayContaining(['button', 'a', 'input']),
    );
  });

  it('falls back to the documented default host when host is empty', () => {
    const config = readPosthogConfig({ token: TOKEN, host: null });
    expect(config?.host).toBe(POSTHOG_DEFAULT_HOST);
  });

  it('returns null when the querystring kill switch is active even with a token', () => {
    setLocationSearch(`?${POSTHOG_QUERY_KILL_PARAM}=${POSTHOG_QUERY_KILL_VALUE}`);
    expect(readPosthogConfig({ token: TOKEN, host: HOST })).toBeNull();
  });

  it('returns null when the localStorage kill switch is active', () => {
    window.localStorage.setItem(POSTHOG_LOCAL_DISABLE_KEY, '1');
    expect(readPosthogConfig({ token: TOKEN, host: HOST })).toBeNull();
  });
});

describe('isAnalyticsKillSwitchActive', () => {
  beforeEach(() => {
    setLocationSearch('');
    window.localStorage.clear();
  });

  afterEach(() => {
    restoreLocation();
    window.localStorage.clear();
  });

  it('is false when no source flips the switch', () => {
    expect(isAnalyticsKillSwitchActive()).toBe(false);
  });

  it('is true when the querystring carries the documented kill value', () => {
    setLocationSearch(`?${POSTHOG_QUERY_KILL_PARAM}=${POSTHOG_QUERY_KILL_VALUE}`);
    expect(isAnalyticsKillSwitchActive()).toBe(true);
  });

  it('is true when localStorage carries the documented kill value', () => {
    window.localStorage.setItem(POSTHOG_LOCAL_DISABLE_KEY, '1');
    expect(isAnalyticsKillSwitchActive()).toBe(true);
  });

  it('querystring kill switch is sufficient even when localStorage is empty', () => {
    setLocationSearch(`?${POSTHOG_QUERY_KILL_PARAM}=${POSTHOG_QUERY_KILL_VALUE}`);
    expect(window.localStorage.getItem(POSTHOG_LOCAL_DISABLE_KEY)).toBeNull();
    expect(isAnalyticsKillSwitchActive()).toBe(true);
  });
});
