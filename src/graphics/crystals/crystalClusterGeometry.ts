import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { CrystalBaseShape } from '../../types/core';

const SHARD_COUNT = 6;

/**
 * Shard activation thresholds — the crystal level at which each shard becomes visible.
 * Shard 0: always (level 0+), Shards 1–2: level 2+, Shards 3–5: level 4+.
 */
export const SHARD_ACTIVATION_LEVELS = [0, 2, 2, 4, 4, 4] as const;

interface ShardPlacement {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

const SHARD_PLACEMENTS: ShardPlacement[] = [
  { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1.0, 1.5, 1.0] },
  { position: [0.13, -0.04, 0.09], rotation: [0.3, 0.5, -0.22], scale: [0.62, 1.0, 0.62] },
  { position: [-0.11, -0.02, -0.12], rotation: [-0.28, 2.8, 0.18], scale: [0.55, 0.92, 0.55] },
  { position: [0.15, -0.06, -0.07], rotation: [0.42, 3.8, -0.32], scale: [0.44, 0.78, 0.44] },
  { position: [-0.09, 0.0, 0.14], rotation: [-0.38, 1.2, 0.28], scale: [0.40, 0.72, 0.40] },
  { position: [0.04, -0.08, -0.15], rotation: [0.52, 5.5, -0.18], scale: [0.36, 0.66, 0.36] },
];

const BASE_RADIUS = 0.3;
const BASE_DETAIL = 0;

function createBasePolyhedron(shape: CrystalBaseShape): THREE.BufferGeometry {
  switch (shape) {
    case 'icosahedron':
      return new THREE.IcosahedronGeometry(BASE_RADIUS, BASE_DETAIL);
    case 'octahedron':
      return new THREE.OctahedronGeometry(BASE_RADIUS, BASE_DETAIL);
    case 'tetrahedron':
      return new THREE.TetrahedronGeometry(BASE_RADIUS, BASE_DETAIL);
    case 'dodecahedron':
      return new THREE.DodecahedronGeometry(BASE_RADIUS, BASE_DETAIL);
  }
}

function buildShardWithIndex(
  shape: CrystalBaseShape,
  shardIndex: number,
): THREE.BufferGeometry {
  const geo = createBasePolyhedron(shape);
  const placement = SHARD_PLACEMENTS[shardIndex];

  const matrix = new THREE.Matrix4();
  matrix.compose(
    new THREE.Vector3(...placement.position),
    new THREE.Quaternion().setFromEuler(
      new THREE.Euler(...placement.rotation),
    ),
    new THREE.Vector3(...placement.scale),
  );
  geo.applyMatrix4(matrix);

  const vertexCount = geo.attributes.position.count;
  const uvData = new Float32Array(vertexCount * 2);
  for (let j = 0; j < vertexCount; j++) {
    uvData[j * 2] = shardIndex;
    uvData[j * 2 + 1] = 0;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uvData, 2));

  return geo;
}

const clusterCache = new Map<CrystalBaseShape, THREE.BufferGeometry>();

export function getClusterGeometry(shape: CrystalBaseShape): THREE.BufferGeometry {
  const cached = clusterCache.get(shape);
  if (cached) return cached;

  const shards: THREE.BufferGeometry[] = [];
  for (let i = 0; i < SHARD_COUNT; i++) {
    shards.push(buildShardWithIndex(shape, i));
  }

  const merged = mergeGeometries(shards, false);
  if (!merged) {
    throw new Error(`Failed to merge crystal cluster shards for shape "${shape}"`);
  }

  clusterCache.set(shape, merged);
  return merged;
}

export function disposeClusterGeometries(): void {
  clusterCache.forEach((geo) => geo.dispose());
  clusterCache.clear();
}
