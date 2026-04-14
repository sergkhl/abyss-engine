import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { topicRefKey } from '@/lib/topicRef';
import { ActiveCrystal } from '../types';
import {
  getLabelOcclusionFactor,
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
    const sub = 'test-subject';
    const crystals: ActiveCrystal[] = [
      { subjectId: sub, topicId: 'farther', gridPosition: [10, 0], xp: 0, spawnedAt: 0 },
      { subjectId: sub, topicId: 'closest', gridPosition: [1, 0], xp: 0, spawnedAt: 0 },
      { subjectId: sub, topicId: 'mid', gridPosition: [3, 0], xp: 0, spawnedAt: 0 },
      { subjectId: sub, topicId: 'hidden', gridPosition: [20, 0], xp: 0, spawnedAt: 0 },
    ];

    const candidates = getVisibleLabelCandidates(
      crystals,
      cameraPosition,
      CRYSTAL_LABEL_OFFSET_Y,
      18,
      2,
    );

    expect(candidates).toHaveLength(2);
    expect(candidates.map((item) => item.topicKey)).toEqual([
      topicRefKey({ subjectId: sub, topicId: 'closest' }),
      topicRefKey({ subjectId: sub, topicId: 'mid' }),
    ]);
    expect(candidates.every((item) => item.distance < 18)).toBe(true);
  });

  it('ignores self mesh when evaluating occlusion', () => {
    const cameraPosition = new THREE.Vector3(0, 1.25, 0);
    const targetPosition = new THREE.Vector3(0, 1.25, 5);
    const selfMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 8, 8),
      new THREE.MeshBasicMaterial(),
    );
    selfMesh.position.copy(targetPosition);
    selfMesh.updateMatrixWorld(true);

    const raycaster = new THREE.Raycaster();
    const occlusionFactor = getLabelOcclusionFactor(
      cameraPosition,
      targetPosition,
      raycaster,
      [selfMesh],
      selfMesh,
    );

    expect(occlusionFactor).toBe(1);
  });

  it('hides label when both label targets are occluded', () => {
    const cameraPosition = new THREE.Vector3(0, 1.25, 0);
    const targetPosition = new THREE.Vector3(0, 1.25, 5);
    const selfMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 8, 8),
      new THREE.MeshBasicMaterial(),
    );
    const blockerMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2, 2, 2),
      new THREE.MeshBasicMaterial(),
    );
    selfMesh.position.copy(targetPosition);
    blockerMesh.position.set(0, 1.25, 2.5);
    selfMesh.updateMatrixWorld(true);
    blockerMesh.updateMatrixWorld(true);

    const raycaster = new THREE.Raycaster();
    const occlusionFactor = getLabelOcclusionFactor(
      cameraPosition,
      targetPosition,
      raycaster,
      [selfMesh, blockerMesh],
      selfMesh,
    );

    expect(occlusionFactor).toBe(0);
  });

  it('partially hides label when one label target is occluded', () => {
    const cameraPosition = new THREE.Vector3(0, 1.25, 0);
    const targetPosition = new THREE.Vector3(0, 1.25, 5);
    const selfMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 8, 8),
      new THREE.MeshBasicMaterial(),
    );
    const blockerMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.7, 0.8),
      new THREE.MeshBasicMaterial(),
    );
    selfMesh.position.copy(targetPosition);
    blockerMesh.position.set(0, 1, 2.5);
    selfMesh.updateMatrixWorld(true);
    blockerMesh.updateMatrixWorld(true);

    const raycaster = new THREE.Raycaster();
    const occlusionFactor = getLabelOcclusionFactor(
      cameraPosition,
      targetPosition,
      raycaster,
      [selfMesh, blockerMesh],
      selfMesh,
    );

    expect(occlusionFactor).toBe(0.5);
  });
});
