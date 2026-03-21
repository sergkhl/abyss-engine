import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';

import type { Buff } from '../types/progression';
import { StatsOverlay } from './StatsOverlay';

function renderStatsOverlay(props: Parameters<typeof StatsOverlay>[0]) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  flushSync(() => {
    root.render(createElement(StatsOverlay, props));
  });
  return { container, root };
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

describe('StatsOverlay', () => {
  it('renders nothing when there are no buffs', () => {
    const { root } = renderStatsOverlay({ activeBuffs: [] });
    expect(document.body.querySelector('[data-testid="stats-overlay-buffs"]')).toBeNull();
    root.unmount();
  });

  it('renders buff stack with popover trigger when buffs exist', () => {
    const { root } = renderStatsOverlay({
      activeBuffs: [
        {
          buffId: 'b1',
          modifierType: 'xp_multiplier',
          magnitude: 1.1,
          condition: 'manual',
          source: 'test',
        } satisfies Buff,
      ],
    });

    const buffsRegion = document.body.querySelector('[data-testid="stats-overlay-buffs"]');
    expect(buffsRegion).not.toBeNull();

    const popoverTrigger = buffsRegion?.querySelector('[aria-label*="open details"]');
    expect(popoverTrigger).not.toBeNull();
    root.unmount();
  });
});
