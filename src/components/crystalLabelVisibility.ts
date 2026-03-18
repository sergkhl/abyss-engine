import * as THREE from 'three';
import { ActiveCrystal } from '../types';

export interface LabelCandidate {
  topicId: string;
  distance: number;
  worldPosition: THREE.Vector3;
}

export interface LabelVisibilityState {
  visibleIds: Set<string>;
  distances: Map<string, number>;
  occlusion: Map<string, number>;
}

export const MAX_LABEL_DISTANCE = 18;
export const MAX_VISIBLE_LABELS = 12;
export const CRYSTAL_LABEL_OFFSET_Y = 1.25;
export const LABEL_SECONDARY_OFFSET_Y = 0.8;

export function getLabelOpacity(distance: number): number {
  if (distance < 6) {
    return 1;
  }

  if (distance < 12) {
    return 0.6;
  }

  if (distance < 18) {
    return 0.2;
  }

  return 0;
}

export function buildLabelCandidates(
  crystals: readonly ActiveCrystal[],
  cameraPosition: THREE.Vector3,
  maxDistance: number,
  labelOffsetY: number,
): LabelCandidate[] {
  return crystals
    .map((crystal) => {
      const worldPosition = new THREE.Vector3(
        crystal.gridPosition[0],
        labelOffsetY,
        crystal.gridPosition[1],
      );
      return {
        topicId: crystal.topicId,
        distance: cameraPosition.distanceTo(worldPosition),
        worldPosition,
      };
    })
    .filter((item) => item.distance < maxDistance);
}

export function getVisibleLabelCandidates(
  crystals: readonly ActiveCrystal[],
  cameraPosition: THREE.Vector3,
  labelOffsetY: number,
  maxDistance: number,
  maxVisible: number,
): LabelCandidate[] {
  const candidates = buildLabelCandidates(crystals, cameraPosition, maxDistance, labelOffsetY);
  candidates.sort((a, b) => a.distance - b.distance);
  return candidates.slice(0, maxVisible);
}

function isDescendantOrSelf(object: THREE.Object3D, candidateIgnored: THREE.Object3D): boolean {
  let cursor: THREE.Object3D | null = object;
  while (cursor) {
    if (cursor === candidateIgnored) {
      return true;
    }
    cursor = cursor.parent;
  }
  return false;
}

export function isLabelTargetOccluded(
  cameraPosition: THREE.Vector3,
  targetPosition: THREE.Vector3,
  raycaster: THREE.Raycaster,
  occluders: readonly THREE.Object3D[],
  ignoredOccluder: THREE.Object3D | null,
): boolean {
  if (!occluders.length) {
    return false;
  }

  const rayDirection = targetPosition.clone().sub(cameraPosition);
  const maxDistance = rayDirection.length();
  if (maxDistance <= 0) {
    return false;
  }

  raycaster.set(cameraPosition, rayDirection.normalize());
  const epsilon = 0.0001;
  const effectiveDistance = maxDistance - epsilon;
  if (effectiveDistance <= 0) {
    return false;
  }
  raycaster.far = effectiveDistance;

  const intersections = raycaster.intersectObjects(occluders as THREE.Object3D[], false);
  for (const intersection of intersections) {
    if (ignoredOccluder && isDescendantOrSelf(intersection.object, ignoredOccluder)) {
      continue;
    }

    if (intersection.distance <= effectiveDistance) {
      return true;
    }
  }

  return false;
}

export function getLabelOcclusionFactor(
  cameraPosition: THREE.Vector3,
  targetPosition: THREE.Vector3,
  raycaster: THREE.Raycaster,
  occluders: readonly THREE.Object3D[],
  ignoredOccluder: THREE.Object3D | null,
  secondaryOffsetY = LABEL_SECONDARY_OFFSET_Y,
): number {
  const secondaryTarget = targetPosition.clone().add(new THREE.Vector3(0, secondaryOffsetY, 0));
  const targetPoints = [targetPosition, secondaryTarget];

  let visiblePointCount = 0;
  for (const target of targetPoints) {
    if (!isLabelTargetOccluded(cameraPosition, target, raycaster, occluders, ignoredOccluder)) {
      visiblePointCount += 1;
    }
  }

  return visiblePointCount / targetPoints.length;
}
