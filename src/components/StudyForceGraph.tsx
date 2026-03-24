'use client';

import type { SimulationNodeDatum } from 'd3';
import { zoom, zoomIdentity } from 'd3';
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from 'd3-force';
import type { Simulation } from 'd3-force';
import { select } from 'd3-selection';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { getTopicUnlockStatus } from '@/features/progression/progressionUtils';
import type { SubjectGraphsForceGraphData, SubjectGraphForceNode } from '@/lib/subjectGraphsForceGraphData';
import { clusterCentersOnCircle } from '@/lib/subjectGraphsForceGraphData';
import type { ActiveCrystal, SubjectGraph } from '@/types/core';

import { cn } from '@/lib/utils';

type SimNode = SubjectGraphForceNode & SimulationNodeDatum;

type LinkDatum = { source: string | SimNode; target: string | SimNode };

function linkNodeX(endpoint: string | SimNode): number {
  if (typeof endpoint === 'string') {
    return 0;
  }
  return endpoint.x ?? 0;
}

function linkNodeY(endpoint: string | SimNode): number {
  if (typeof endpoint === 'string') {
    return 0;
  }
  return endpoint.y ?? 0;
}

function styleForNode(
  d: SimNode,
  unlockedTopicIds: string[],
  activeCrystals: ActiveCrystal[],
  unlockPoints: number,
  allGraphs: SubjectGraph[],
  selectedTopicId: string | null,
): { fill: string; stroke: string; strokeWidth: number } {
  const topicId = d.topicId;
  const hasCrystal = activeCrystals.some((c) => c.topicId === topicId);
  const unlocked = unlockedTopicIds.includes(topicId);
  const canUnlock = getTopicUnlockStatus(
    topicId,
    activeCrystals,
    unlockPoints,
    allGraphs,
    [],
  ).canUnlock;

  let base: { fill: string; stroke: string; strokeWidth: number };
  if (hasCrystal) {
    base = {
      fill: 'var(--chart-1)',
      stroke: 'var(--foreground)',
      strokeWidth: 3,
    };
  } else if (unlocked) {
    base = {
      fill: 'var(--chart-2)',
      stroke: 'var(--foreground)',
      strokeWidth: 2,
    };
  } else if (canUnlock) {
    base = {
      fill: 'var(--accent)',
      stroke: 'var(--primary)',
      strokeWidth: 2,
    };
  } else {
    base = {
      fill: 'var(--muted)',
      stroke: 'var(--border)',
      strokeWidth: 1.5,
    };
  }

  if (selectedTopicId && topicId === selectedTopicId) {
    return {
      ...base,
      stroke: 'var(--ring)',
      strokeWidth: base.strokeWidth + 2,
    };
  }
  return base;
}

/** Updates node circle and label styles without restarting the force simulation. */
function paintTopicNodeVisuals(
  svgRoot: SVGSVGElement,
  unlockedTopicIds: string[],
  activeCrystals: ActiveCrystal[],
  unlockPoints: number,
  allGraphs: SubjectGraph[],
  selectedTopicId: string | null,
) {
  const root = select(svgRoot);
  root
    .selectAll<SVGCircleElement, SimNode>('g.plot-view g.nodes circle')
    .each(function paintCircle(d) {
      const s = styleForNode(d, unlockedTopicIds, activeCrystals, unlockPoints, allGraphs, selectedTopicId);
      select(this).attr('fill', s.fill).attr('stroke', s.stroke).attr('stroke-width', s.strokeWidth);
    });
  root
    .selectAll<SVGTextElement, SimNode>('g.plot-view g.labels text')
    .each(function paintLabel(d) {
      const isSelected = Boolean(selectedTopicId && d.topicId === selectedTopicId);
      select(this)
        .attr('fill-opacity', isSelected ? 0.95 : 0.78)
        .attr('font-weight', isSelected ? 600 : 500);
    });
}

export interface StudyForceGraphProps {
  graphData: SubjectGraphsForceGraphData;
  allGraphs: SubjectGraph[];
  unlockedTopicIds: string[];
  activeCrystals: ActiveCrystal[];
  unlockPoints: number;
  /** Highlights the matching topic node (by `topicId`). */
  selectedTopicId?: string | null;
  /** Invoked when the user activates a topic node (click, tap, or keyboard). */
  onSelectTopic?: (topicId: string) => void;
  /** Invoked when the user activates the empty graph background (tap outside nodes). */
  onClearSelection?: () => void;
  className?: string;
}

const NODE_RADIUS = 14;
/** Vertical offset from node center to label (text middle), below the circle. */
const LABEL_Y_OFFSET = NODE_RADIUS + 12;
const TOPIC_TITLE_MAX_CHARS = 28;

function truncateTopicTitle(title: string, maxChars = TOPIC_TITLE_MAX_CHARS): string {
  const t = title.trim();
  if (t.length <= maxChars) {
    return t;
  }
  return `${t.slice(0, Math.max(1, maxChars - 1))}\u2026`;
}

/** ~11px UI font: upper bound for half-width of truncated titles (horizontal clip guard). */
const LABEL_HALF_WIDTH_EST = Math.min(112, (TOPIC_TITLE_MAX_CHARS * 6.35) / 2);

type ViewportCenterBounds = { minX: number; maxX: number; minY: number; maxY: number };

function nodeCenterViewportBounds(width: number, height: number): ViewportCenterBounds {
  const insetX = NODE_RADIUS + 8 + LABEL_HALF_WIDTH_EST;
  const insetTop = NODE_RADIUS + 10;
  const insetBottom = LABEL_Y_OFFSET + 16;
  let minX = insetX;
  let maxX = width - insetX;
  let minY = insetTop;
  let maxY = height - insetBottom;
  if (minX >= maxX) {
    const mid = width / 2;
    minX = mid;
    maxX = mid;
  }
  if (minY >= maxY) {
    const mid = height / 2;
    minY = mid;
    maxY = mid;
  }
  return { minX, maxX, minY, maxY };
}

/** Keeps node centers (and labels) inside the SVG; zeros velocity on bounce. */
function clampNodeCenterToViewport(d: SimNode, b: ViewportCenterBounds) {
  const ox = d.x ?? b.minX;
  const oy = d.y ?? b.minY;
  const x = Math.min(b.maxX, Math.max(b.minX, ox));
  const y = Math.min(b.maxY, Math.max(b.minY, oy));
  if (ox !== x && d.vx != null) {
    d.vx = 0;
  }
  if (oy !== y && d.vy != null) {
    d.vy = 0;
  }
  d.x = x;
  d.y = y;
  if (d.fx != null) {
    d.fx = x;
  }
  if (d.fy != null) {
    d.fy = y;
  }
}

export function StudyForceGraph({
  graphData,
  allGraphs,
  unlockedTopicIds,
  activeCrystals,
  unlockPoints,
  selectedTopicId = null,
  onSelectTopic,
  onClearSelection,
  className,
}: StudyForceGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const progressionRef = useRef({
    unlockedTopicIds,
    activeCrystals,
    unlockPoints,
  });
  progressionRef.current = { unlockedTopicIds, activeCrystals, unlockPoints };
  const graphsRef = useRef(allGraphs);
  graphsRef.current = allGraphs;
  const selectedTopicIdRef = useRef(selectedTopicId);
  selectedTopicIdRef.current = selectedTopicId;
  const onSelectTopicRef = useRef(onSelectTopic);
  onSelectTopicRef.current = onSelectTopic;
  const onClearSelectionRef = useRef(onClearSelection);
  onClearSelectionRef.current = onClearSelection;
  const simulationRef = useRef<Simulation<SimNode, undefined> | null>(null);

  /** Stable key so progression-driven node colors repaint without waiting for simulation ticks. */
  const progressionPaintKey = useMemo(() => {
    const unlocked = [...unlockedTopicIds].sort().join('\0');
    const crystalTopics = [...new Set(activeCrystals.map((c) => c.topicId))].sort().join('|');
    return `${unlocked}#${unlockPoints}#${crystalTopics}`;
  }, [unlockedTopicIds, activeCrystals, unlockPoints]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) {
        return;
      }
      const w = Math.max(0, Math.floor(cr.width));
      const h = Math.max(0, Math.floor(cr.height));
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || size.w < 32 || size.h < 32 || graphData.nodes.length === 0) {
      return;
    }

    const { w, h } = size;
    const vp = nodeCenterViewportBounds(w, h);
    const clusterPadding = Math.max(56, vp.minX, vp.minY, h - vp.maxY);
    const centers = clusterCentersOnCircle(graphData.subjectIdsOrdered.length, w, h, clusterPadding);
    const cx = w / 2;
    const cy = h / 2;

    const simNodes: SimNode[] = graphData.nodes.map((n) => {
      const rawX = cx + (Math.random() - 0.5) * 24;
      const rawY = cy + (Math.random() - 0.5) * 24;
      return {
        ...n,
        x: Math.min(vp.maxX, Math.max(vp.minX, rawX)),
        y: Math.min(vp.maxY, Math.max(vp.minY, rawY)),
      };
    });

    const linkData: LinkDatum[] = graphData.links.map((l) => ({
      source: l.source,
      target: l.target,
    }));

    const svg = select(svgEl);
    svg.selectAll('*').remove();
    svg.attr('width', w).attr('height', h).attr('role', 'img').attr('aria-label', 'Curriculum topic force graph');

    const viewG = svg.append('g').attr('class', 'plot-view');
    viewG.attr('transform', zoomIdentity.toString());

    viewG
      .append('rect')
      .attr('class', 'hit-surface')
      .attr('width', w)
      .attr('height', h)
      .attr('fill', 'transparent')
      .attr('pointer-events', 'all')
      .style('cursor', 'default')
      .on('click', (event: MouseEvent) => {
        event.stopPropagation();
        onClearSelectionRef.current?.();
      });
    const linkG = viewG.append('g').attr('class', 'links');
    const nodeG = viewG.append('g').attr('class', 'nodes');
    const labelG = viewG.append('g').attr('class', 'labels');

    const linkForce = forceLink<SimNode, LinkDatum>(linkData)
      .id((d) => d.id)
      .distance(52)
      .strength(0.7);

    const clusterStrength = graphData.subjectIdsOrdered.length <= 1 ? 0.08 : 0.14;

    const simulation = forceSimulation(simNodes)
      .force(
        'link',
        linkForce,
      )
      .force('charge', forceManyBody().strength(-140))
      .force('collide', forceCollide(NODE_RADIUS + 12))
      .force(
        'x',
        forceX<SimNode>((d) => centers[d.clusterIndex]?.x ?? cx).strength(clusterStrength),
      )
      .force(
        'y',
        forceY<SimNode>((d) => centers[d.clusterIndex]?.y ?? cy).strength(clusterStrength),
      )
      .alphaDecay(0.022)
      .velocityDecay(0.25);

    const lineSel = linkG
      .selectAll<SVGLineElement, LinkDatum>('line')
      .data(linkData, (d) => {
        const s = typeof d.source === 'object' ? d.source.id : d.source;
        const t = typeof d.target === 'object' ? d.target.id : d.target;
        return `${s}:${t}`;
      });

    lineSel.exit().remove();
    const lineEnter = lineSel.enter().append('line');
    const lineMerge = lineEnter.merge(lineSel);
    lineMerge
      .attr('stroke', 'var(--border)')
      .attr('stroke-opacity', 0.55)
      .attr('stroke-width', 1.25)
      .style('pointer-events', 'none');

    const circleSel = nodeG
      .selectAll<SVGCircleElement, SimNode>('circle')
      .data(simNodes, (d) => d.id);

    circleSel.exit().remove();
    const circleEnter = circleSel.enter().append('circle');
    const circleMerge = circleEnter.merge(circleSel);
    circleMerge
      .attr('r', NODE_RADIUS)
      .attr('tabindex', 0)
      .each(function eachNode(d) {
        const s = styleForNode(
          d,
          progressionRef.current.unlockedTopicIds,
          progressionRef.current.activeCrystals,
          progressionRef.current.unlockPoints,
          graphsRef.current,
          selectedTopicIdRef.current,
        );
        select(this)
          .attr('fill', s.fill)
          .attr('stroke', s.stroke)
          .attr('stroke-width', s.strokeWidth)
          .attr('aria-label', `${d.title}, tier ${d.tier}`);
      });

    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.35, 4])
      .extent([
        [0, 0],
        [w, h],
      ])
      .filter((event) => {
        if (event.type === 'wheel') {
          event.preventDefault();
          return true;
        }
        const t = event.target;
        if (t instanceof Element && t.closest('circle')) {
          return false;
        }
        return (!event.ctrlKey || event.type === 'wheel') && !event.button;
      })
      .on('zoom', (event) => {
        viewG.attr('transform', event.transform.toString());
      });

    svg.call(zoomBehavior);

    const textSel = labelG
      .selectAll<SVGTextElement, SimNode>('text')
      .data(simNodes, (d) => d.id);

    textSel.exit().remove();
    const textEnter = textSel.enter().append('text');
    const textMerge = textEnter.merge(textSel);
    textMerge
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('pointer-events', 'none')
      .style('user-select', 'none')
      .attr('font-size', 11)
      .attr('fill', 'currentColor')
      .text((d) => truncateTopicTitle(d.title));

    circleMerge.on('click', function handleCircleClick(this: SVGCircleElement, event: MouseEvent) {
      event.stopPropagation();
      const d = select(this).datum() as SimNode;
      onSelectTopicRef.current?.(d.topicId);
    });

    circleMerge.on('keydown', function handleKeydown(this: SVGCircleElement, event: Event) {
      const ke = event as KeyboardEvent;
      if (ke.key !== 'Enter' && ke.key !== ' ') {
        return;
      }
      ke.preventDefault();
      ke.stopPropagation();
      const d = select(this).datum() as SimNode;
      onSelectTopicRef.current?.(d.topicId);
    });

    simulation.on('tick', () => {
      for (const d of simNodes) {
        clampNodeCenterToViewport(d, vp);
      }

      lineMerge
        .attr('x1', (d) => linkNodeX(d.source))
        .attr('y1', (d) => linkNodeY(d.source))
        .attr('x2', (d) => linkNodeX(d.target))
        .attr('y2', (d) => linkNodeY(d.target));

      circleMerge
        .attr('cx', (d) => d.x ?? 0)
        .attr('cy', (d) => d.y ?? 0)
        .each(function eachTick(d) {
          const s = styleForNode(
            d,
            progressionRef.current.unlockedTopicIds,
            progressionRef.current.activeCrystals,
            progressionRef.current.unlockPoints,
            graphsRef.current,
            selectedTopicIdRef.current,
          );
          select(this).attr('fill', s.fill).attr('stroke', s.stroke).attr('stroke-width', s.strokeWidth);
        });

      textMerge
        .attr('x', (d) => d.x ?? 0)
        .attr('y', (d) => (d.y ?? 0) + LABEL_Y_OFFSET)
        .each(function eachLabelTick(d) {
          const sel = selectedTopicIdRef.current;
          const isSelected = Boolean(sel && d.topicId === sel);
          select(this)
            .attr('fill-opacity', isSelected ? 0.95 : 0.78)
            .attr('font-weight', isSelected ? 600 : 500);
        });
    });

    simulation.restart();
    simulationRef.current = simulation;

    return () => {
      svg.on('.zoom', null);
      simulationRef.current = null;
      simulation.on('tick', null);
      simulation.stop();
    };
  }, [graphData, size.w, size.h]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || graphData.nodes.length === 0) {
      return;
    }
    paintTopicNodeVisuals(
      svgEl,
      unlockedTopicIds,
      activeCrystals,
      unlockPoints,
      allGraphs,
      selectedTopicId,
    );
  }, [selectedTopicId, progressionPaintKey, graphData.nodes.length, allGraphs]);

  return (
    <div
      ref={containerRef}
      className={cn('h-full w-full min-h-0', className)}
    >
      {size.w >= 32 && size.h >= 32 && graphData.nodes.length > 0 ? (
        <svg ref={svgRef} className="block h-full w-full text-foreground" />
      ) : (
        <div className="text-muted-foreground flex h-full min-h-[12rem] items-center justify-center text-sm">
          {graphData.nodes.length === 0 ? 'No curriculum topics to display.' : 'Resizing…'}
        </div>
      )}
    </div>
  );
}
