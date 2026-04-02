import type { CrystalBaseShape } from '../../types/core';
import { getClusterGeometry, disposeClusterGeometries } from './crystalClusterGeometry';

export const CRYSTAL_BASE_RADIUS = 0.3;

/**
 * Returns the pre-merged cluster geometry for the given base shape.
 * All 6 shards are present; the shader collapses inactive ones via the `shardIndex` attribute.
 */
export function getCrystalGeometry(shape: CrystalBaseShape = 'icosahedron') {
  return getClusterGeometry(shape);
}

export function disposeCrystalGeometry(): void {
  disposeClusterGeometries();
}
