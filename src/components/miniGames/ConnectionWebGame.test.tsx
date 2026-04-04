import { afterEach, describe, expect, it } from 'vitest';
import { act, createElement, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import type { ConnectionWebContent } from '../../types/core';
import { evaluateMiniGame } from '../../features/content/evaluateMiniGame';
import { useMiniGameInteraction } from '../../hooks/useMiniGameInteraction';
import { ConnectionWebGame, connectionWebRightNodeId } from './ConnectionWebGame';

const sampleContent: ConnectionWebContent = {
  gameType: 'CONNECTION_WEB',
  prompt: 'Match',
  pairs: [
    { id: 'a', left: 'LA', right: 'RA' },
    { id: 'b', left: 'LB', right: 'RB' },
    { id: 'c', left: 'LC', right: 'RC' },
    { id: 'd', left: 'LD', right: 'RD' },
  ],
  explanation: 'Test',
};

function Harness({ content }: { content: ConnectionWebContent }) {
  const itemIds = [
    ...content.pairs.map((p) => p.id),
    ...(content.distractors ?? []).filter((d) => d.side === 'left').map((d) => d.id),
  ];
  const requiredItemIds = content.pairs.map((p) => p.id);
  const evaluateFn = useCallback(
    (placements: Map<string, string>) => evaluateMiniGame(content, placements),
    [content],
  );
  const interaction = useMiniGameInteraction({ itemIds, requiredItemIds, evaluateFn });
  return createElement(ConnectionWebGame, { content, interaction });
}

function renderHarness(content: ConnectionWebContent = sampleContent) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  act(() => {
    flushSync(() => {
      root.render(createElement(Harness, { content }));
    });
  });
  return { container, unmount: () => root.unmount() };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ConnectionWebGame', () => {
  it('renders paired rows with one left and one right chip per row', () => {
    const { container, unmount } = renderHarness();
    const rows = container.querySelectorAll('[data-testid="connection-web-row"]');
    expect(rows.length).toBe(4);
    expect(container.querySelectorAll('[data-testid="connection-web-game"] button').length).toBe(8);
    unmount();
  });

  it('includes distractors in row counts', () => {
    const content: ConnectionWebContent = {
      ...sampleContent,
      distractors: [
        { id: 'dl', side: 'left', label: 'DL' },
        { id: 'dr', side: 'right', label: 'DR' },
      ],
    };
    const { container, unmount } = renderHarness(content);
    expect(container.querySelectorAll('[data-testid="connection-web-row"]').length).toBe(5);
    expect(container.querySelectorAll('[data-testid="connection-web-game"] button').length).toBe(10);
    unmount();
  });

  it('right column order is deterministic (shuffled, not pair insertion order)', () => {
    const { container, unmount } = renderHarness();
    const buttons = container.querySelectorAll('[data-testid="connection-web-game"] button');
    const rightLabels = [...buttons]
      .filter((_, i) => i % 2 === 1)
      .map((b) => b.textContent?.trim() ?? '');
    const natural = sampleContent.pairs.map((p) => p.right);
    expect(rightLabels).not.toEqual(natural);
    unmount();
  });

  it('exports stable right node ids for pairs', () => {
    expect(connectionWebRightNodeId('a')).toBe('right-a');
  });
});
