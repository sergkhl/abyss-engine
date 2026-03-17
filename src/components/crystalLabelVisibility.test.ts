import * as THREE from 'three/webgpu';
import { describe, expect, it } from 'vitest';

import { ActiveCrystal } from '../types';
import {
  CRYSTAL_LABEL_OFFSET_Y,
  getLabelOpacity,
  getVisibleLabelCandidates,
} from './crystalLabelVisibility';

describe('crystal label visibility helpers', () => {
  it('uses explicit distance LOD bands', () => {
    expect(getLabelOpacity(5.99)).toBe(1);
    expect(getLabelOpacity(11.99)).toBe(0.6);
    expect(getLabelOpacity(17.99)).toBe(0.2);
    expect(getLabelOpacity(18)).toBe(0);
  });

  it('filters by max distance and applies nearest-first visibility cap', () => {
    const cameraPosition = new THREE.Vector3(0, 0, 0);
    const crystals: ActiveCrystal[] = [
      { topicId: 'farther', gridPosition: [10, 0], xp: 0, spawnedAt: 0 },
      { topicId: 'closest', gridPosition: [1, 0], xp: 0, spawnedAt: 0 },
      { topicId: 'mid', gridPosition: [3, 0], xp: 0, spawnedAt: 0 },
      { topicId: 'hidden', gridPosition: [20, 0], xp: 0, spawnedAt: 0 },
    ];

    const candidates = getVisibleLabelCandidates(
      crystals,
      cameraPosition,
      CRYSTAL_LABEL_OFFSET_Y,
      18,
      2,
    );

    expect(candidates).toHaveLength(2);
    expect(candidates.map((item) => item.topicId)).toEqual(['closest', 'mid']);
    expect(candidates.every((item) => item.distance < 18)).toBe(true);
  });
});

