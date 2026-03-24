import type { SubjectGraph } from '@/types/core';

/** Separates subject and topic segments in composite node ids (unlikely in kebab-case ids). */
export const SUBJECT_TOPIC_COMPOSITE_SEP = '\u001f';

export function compositeTopicNodeId(subjectId: string, topicId: string): string {
  return `${subjectId}${SUBJECT_TOPIC_COMPOSITE_SEP}${topicId}`;
}

export interface SubjectGraphForceNode {
  id: string;
  subjectId: string;
  topicId: string;
  clusterIndex: number;
  title: string;
  tier: number;
}

export interface SubjectGraphForceLink {
  source: string;
  target: string;
}

export interface SubjectGraphsForceGraphData {
  /** Distinct subject ids in cluster order (index matches `clusterIndex` on nodes). */
  subjectIdsOrdered: string[];
  nodes: SubjectGraphForceNode[];
  links: SubjectGraphForceLink[];
}

/**
 * Merges multiple curriculum graphs into one force-directed dataset.
 * Composite ids keep topics unique across subjects even when `topicId` strings collide.
 */
export function buildSubjectGraphsForceGraphData(graphs: SubjectGraph[]): SubjectGraphsForceGraphData {
  const subjectIdsOrdered: string[] = [];
  const subjectToCluster = new Map<string, number>();

  for (const graph of graphs) {
    if (!subjectToCluster.has(graph.subjectId)) {
      subjectToCluster.set(graph.subjectId, subjectIdsOrdered.length);
      subjectIdsOrdered.push(graph.subjectId);
    }
  }

  const nodeById = new Map<string, SubjectGraphForceNode>();

  for (const graph of graphs) {
    const clusterIndex = subjectToCluster.get(graph.subjectId) ?? 0;
    for (const node of graph.nodes) {
      const id = compositeTopicNodeId(graph.subjectId, node.topicId);
      nodeById.set(id, {
        id,
        subjectId: graph.subjectId,
        topicId: node.topicId,
        clusterIndex,
        title: node.title,
        tier: node.tier,
      });
    }
  }

  const links: SubjectGraphForceLink[] = [];

  for (const graph of graphs) {
    for (const node of graph.nodes) {
      const targetId = compositeTopicNodeId(graph.subjectId, node.topicId);
      if (!nodeById.has(targetId)) {
        continue;
      }
      for (const prereqTopicId of node.prerequisites) {
        const sourceId = compositeTopicNodeId(graph.subjectId, prereqTopicId);
        if (!nodeById.has(sourceId)) {
          continue;
        }
        links.push({ source: sourceId, target: targetId });
      }
    }
  }

  return {
    subjectIdsOrdered,
    nodes: Array.from(nodeById.values()),
    links,
  };
}

/**
 * Evenly spaces cluster focal points on a circle inside the given box (padding inset).
 */
export function clusterCentersOnCircle(
  clusterCount: number,
  width: number,
  height: number,
  padding = 48,
): { x: number; y: number }[] {
  if (clusterCount <= 0) {
    return [];
  }
  const cx = width / 2;
  const cy = height / 2;
  if (clusterCount === 1) {
    return [{ x: cx, y: cy }];
  }
  const rw = Math.max(0, width / 2 - padding);
  const rh = Math.max(0, height / 2 - padding);
  const radius = Math.min(rw, rh);
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < clusterCount; i += 1) {
    const angle = (2 * Math.PI * i) / clusterCount - Math.PI / 2;
    out.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  }
  return out;
}
