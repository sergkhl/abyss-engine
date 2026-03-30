import { normalizeGraphPrerequisites } from '@/lib/graphPrerequisites';
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
      for (const { topicId: prereqTopicId } of normalizeGraphPrerequisites(node.prerequisites)) {
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

export interface TopicGraphBfsResult {
  /** Shortest hop count from any seed along prerequisite → dependent edges; omitted if unreachable. */
  distances: ReadonlyMap<string, number>;
  seedIds: string[];
}

/**
 * Seeds: nodes whose `topicId` is in `unlockedTopicIds`. If none exist in `data`, seeds are indegree-0 nodes.
 * BFS expands along directed links source → target.
 */
export function computeTopicGraphBfsDistances(
  data: SubjectGraphsForceGraphData,
  unlockedTopicIds: string[],
): TopicGraphBfsResult {
  const unlocked = new Set(unlockedTopicIds);
  const indegree = new Map<string, number>();
  for (const n of data.nodes) {
    indegree.set(n.id, 0);
  }
  for (const l of data.links) {
    indegree.set(l.target, (indegree.get(l.target) ?? 0) + 1);
  }

  const seedIds = data.nodes.filter((n) => unlocked.has(n.topicId)).map((n) => n.id);
  const seeds =
    seedIds.length > 0 ? seedIds : data.nodes.filter((n) => (indegree.get(n.id) ?? 0) === 0).map((n) => n.id);

  const adj = new Map<string, string[]>();
  for (const n of data.nodes) {
    adj.set(n.id, []);
  }
  for (const l of data.links) {
    const out = adj.get(l.source);
    if (out) {
      out.push(l.target);
    }
  }

  const distances = new Map<string, number>();
  const queue: string[] = [];
  for (const id of seeds) {
    if (!distances.has(id)) {
      distances.set(id, 0);
      queue.push(id);
    }
  }

  while (queue.length > 0) {
    const u = queue.shift()!;
    const du = distances.get(u) ?? 0;
    for (const v of adj.get(u) ?? []) {
      if (!distances.has(v)) {
        distances.set(v, du + 1);
        queue.push(v);
      }
    }
  }

  return { distances, seedIds: seeds };
}

/**
 * Locked topics with no prerequisites (indegree 0) that BFS never reaches are treated as **distance 1**
 * for hop filtering and depth opacity (same as one hop from seeds). Nodes already in `rawDistances` are unchanged
 * (so bootstrap seeds stay at 0 when nothing is unlocked).
 */
export function resolveEffectiveTopicGraphDistances(
  data: SubjectGraphsForceGraphData,
  unlockedTopicIds: string[],
  rawDistances: ReadonlyMap<string, number>,
): Map<string, number> {
  const unlocked = new Set(unlockedTopicIds);
  const indegree = new Map<string, number>();
  for (const n of data.nodes) {
    indegree.set(n.id, 0);
  }
  for (const l of data.links) {
    indegree.set(l.target, (indegree.get(l.target) ?? 0) + 1);
  }

  const out = new Map<string, number>(rawDistances);
  for (const n of data.nodes) {
    if (out.has(n.id)) {
      continue;
    }
    if ((indegree.get(n.id) ?? 0) !== 0) {
      continue;
    }
    if (unlocked.has(n.topicId)) {
      continue;
    }
    out.set(n.id, 1);
  }
  return out;
}

/** Largest finite BFS distance among reachable nodes, or 0 if none. */
export function getMaxBfsDepthFromSeeds(distances: ReadonlyMap<string, number>): number {
  let m = 0;
  for (const d of distances.values()) {
    if (d > m) {
      m = d;
    }
  }
  return m;
}

/**
 * Max hop value for UI: at least 2 so default depth-2 is always a valid option.
 */
export function getSelectableMaxHop(distances: ReadonlyMap<string, number>): number {
  return Math.max(2, getMaxBfsDepthFromSeeds(distances));
}

/**
 * Keeps nodes with `distances.get(id) <= maxHop` and links with both endpoints kept.
 * Pass **effective** distances from `resolveEffectiveTopicGraphDistances` so locked entry topics count as hop 1.
 * Rebuilds `subjectIdsOrdered` and `clusterIndex` for remaining subjects only.
 */
export function filterSubjectGraphsForceGraphDataByMaxHop(
  data: SubjectGraphsForceGraphData,
  distances: ReadonlyMap<string, number>,
  maxHop: number,
): SubjectGraphsForceGraphData {
  const allowed = new Set<string>();
  for (const n of data.nodes) {
    const d = distances.get(n.id);
    if (d !== undefined && d <= maxHop) {
      allowed.add(n.id);
    }
  }

  const nodes = data.nodes.filter((n) => allowed.has(n.id));
  const links = data.links.filter((l) => allowed.has(l.source) && allowed.has(l.target));

  const subjectIdsOrdered: string[] = [];
  const subjectToCluster = new Map<string, number>();
  for (const sid of data.subjectIdsOrdered) {
    if (nodes.some((n) => n.subjectId === sid)) {
      subjectToCluster.set(sid, subjectIdsOrdered.length);
      subjectIdsOrdered.push(sid);
    }
  }

  const remappedNodes = nodes.map((n) => ({
    ...n,
    clusterIndex: subjectToCluster.get(n.subjectId) ?? 0,
  }));

  return {
    subjectIdsOrdered,
    nodes: remappedNodes,
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
