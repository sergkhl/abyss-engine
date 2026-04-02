'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber/webgpu';
import { Html } from '@react-three/drei/webgpu';
import * as THREE from 'three/webgpu';
import { ActiveCrystal } from '../types';
import {
  calculateLevelFromXP,
  crystalCeremonyStore,
  getCrystalScale,
  subjectSeedFromId,
} from '../features/progression';
import { useUIStore } from '../store/uiStore';
import { getSubjectColor } from '../utils/geometryMapping';
import { useTopicMetadata } from '../features/content';
import { GrowthParticles } from '../graphics/GrowthParticles';
import { playLevelUpSound } from '../utils/sound';
import { useSceneInvalidator } from '../hooks/useSceneInvalidator';
import { useCrystalCeremonySync } from '../hooks/useCrystalCeremonySync';
import { useManifest } from '../hooks/useDeckData';
import {
  createCrystalInstancedAttributes,
  createCrystalNodeMaterial,
  CRYSTAL_MAX_INSTANCES,
  getCrystalGeometry,
} from '../graphics/crystals';
import {
  getLabelOpacity,
  getLabelOcclusionFactor,
  getVisibleLabelCandidates,
  LabelVisibilityState,
  MAX_LABEL_DISTANCE,
  MAX_VISIBLE_LABELS,
  CRYSTAL_LABEL_OFFSET_Y,
  LABEL_SECONDARY_OFFSET_Y,
} from './crystalLabelVisibility';

interface TopicMetadata {
  title?: string;
  subjectId: string;
  subjectName?: string;
  topicName?: string;
}

interface CrystalsProps {
  crystals: ActiveCrystal[];
  onStartTopicStudySession?: (topicId: string) => void;
  isStudyPanelOpen?: boolean;
}

const matrixScratch = new THREE.Matrix4();
const positionScratch = new THREE.Vector3();
const quaternionScratch = new THREE.Quaternion();
const scaleScratch = new THREE.Vector3();
const yAxis = new THREE.Vector3(0, 1, 0);

export const Crystals: React.FC<CrystalsProps> = ({
  crystals,
  onStartTopicStudySession,
  isStudyPanelOpen = false,
}) => {
  const metadataLookup = useTopicMetadata(crystals.map((crystal) => crystal.topicId));
  const manifestQuery = useManifest();
  const subjects = manifestQuery.data?.subjects ?? [];

  const selectedTopicId = useUIStore((state) => state.selectedTopicId);
  const selectTopic = useUIStore((state) => state.selectTopic);

  const instancedRef = useRef<THREE.InstancedMesh>(null);
  const labelVisibility = useRef<LabelVisibilityState>({
    visibleIds: new Set(),
    distances: new Map(),
    occlusion: new Map(),
  });
  const raycasterRef = useRef(new THREE.Raycaster());
  const { invalidate, isPaused } = useSceneInvalidator();
  const environmentMap = useThree((state) => state.scene.environment);

  const prevPanelOpen = useRef(isStudyPanelOpen);
  const prevLevelByTopic = useRef<Map<string, number>>(new Map());
  const lastCeremonyKey = useRef<string | null>(null);

  const [particleTopicId, setParticleTopicId] = useState<string | null>(null);
  const suppressNextClickRef = useRef(false);

  const labelAnchorRefs = useRef<(THREE.Group | null)[]>([]);
  const labelOpacityRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { arrays, attributes } = useMemo(
    () => createCrystalInstancedAttributes(CRYSTAL_MAX_INSTANCES),
    [],
  );

  const instanceGeometry = useMemo(() => {
    const geo = getCrystalGeometry();
    geo.setAttribute('instanceLevel', attributes.instanceLevel);
    geo.setAttribute('instanceMorphProgress', attributes.instanceMorphProgress);
    geo.setAttribute('instanceSubjectSeed', attributes.instanceSubjectSeed);
    geo.setAttribute('instanceColor', attributes.instanceColor);
    geo.setAttribute('instanceSelected', attributes.instanceSelected);
    geo.setAttribute('instanceCeremonyPhase', attributes.instanceCeremonyPhase);
    return geo;
  }, [attributes]);

  const material = useMemo(
    () => createCrystalNodeMaterial(attributes, environmentMap),
    [attributes, environmentMap],
  );

  useCrystalCeremonySync();

  const count = Math.min(crystals.length, CRYSTAL_MAX_INSTANCES);

  useEffect(() => {
    if (!prevPanelOpen.current && isStudyPanelOpen) {
      // opened — no flush
    }
    if (prevPanelOpen.current && !isStudyPanelOpen) {
      crystalCeremonyStore.getState().onStudyPanelClosed();
    }
    prevPanelOpen.current = isStudyPanelOpen;
  }, [isStudyPanelOpen]);

  useEffect(() => {
    const prev = prevLevelByTopic.current;
    for (const crystal of crystals) {
      const level = calculateLevelFromXP(crystal.xp);
      const previous = prev.get(crystal.topicId);
      if (previous !== undefined && level > previous) {
        crystalCeremonyStore.getState().notifyLevelUp(crystal.topicId, isStudyPanelOpen);
      }
      prev.set(crystal.topicId, level);
    }
    for (const key of [...prev.keys()]) {
      if (!crystals.some((c) => c.topicId === key)) {
        prev.delete(key);
      }
    }
  }, [crystals, isStudyPanelOpen]);

  useFrame(() => {
    if (isPaused) {
      return;
    }

    const mesh = instancedRef.current;
    if (!mesh) {
      return;
    }

    const now = performance.now();
    const elapsedTime = now / 1000;

    const ceremonyApi = crystalCeremonyStore.getState();
    ceremonyApi.syncCeremonyClock(now);
    const ceremonyKey =
      ceremonyApi.ceremonyTopicId != null && ceremonyApi.ceremonyStartedAt != null
        ? `${ceremonyApi.ceremonyTopicId}:${ceremonyApi.ceremonyStartedAt}`
        : null;
    if (ceremonyKey && ceremonyKey !== lastCeremonyKey.current) {
      lastCeremonyKey.current = ceremonyKey;
      playLevelUpSound();
      if (ceremonyApi.ceremonyTopicId) {
        setParticleTopicId(ceremonyApi.ceremonyTopicId);
        window.setTimeout(() => setParticleTopicId(null), 1200);
      }
    }
    if (!ceremonyKey) {
      lastCeremonyKey.current = null;
    }

    let needsInvalidate = false;

    for (let i = 0; i < count; i++) {
      const crystal = crystals[i];
      const topicMeta = metadataLookup[crystal.topicId] as TopicMetadata | undefined;
      const level = calculateLevelFromXP(crystal.xp);
      const [gx, gz] = crystal.gridPosition;
      const bob = Math.sin(elapsedTime * 2 + gx * 0.5) * 0.03;
      const py = 0.3 + bob;
      const isSelected = selectedTopicId === crystal.topicId;
      const rotY = isSelected ? elapsedTime * 0.4 : 0;
      const scale = getCrystalScale(level);

      positionScratch.set(gx, py, gz);
      quaternionScratch.setFromAxisAngle(yAxis, rotY);
      scaleScratch.setScalar(scale);
      matrixScratch.compose(positionScratch, quaternionScratch, scaleScratch);
      mesh.setMatrixAt(i, matrixScratch);

      const morphProgress = ceremonyApi.getCeremonyMorphProgress(crystal.topicId, now);
      const linear = ceremonyApi.getCeremonyLinearProgress(crystal.topicId, now);
      const ceremonyPhase = linear * (1 - linear) * 4;

      const colorHex = getSubjectColor(topicMeta?.subjectId ?? null, subjects);
      const color = new THREE.Color(colorHex);

      arrays.instanceLevel[i] = level;
      arrays.instanceMorphProgress[i] = morphProgress;
      arrays.instanceSubjectSeed[i] = subjectSeedFromId(topicMeta?.subjectId);
      arrays.instanceColor[i * 3] = color.r;
      arrays.instanceColor[i * 3 + 1] = color.g;
      arrays.instanceColor[i * 3 + 2] = color.b;
      arrays.instanceSelected[i] = isSelected ? 1 : 0;
      arrays.instanceCeremonyPhase[i] = ceremonyPhase;

      const anchor = labelAnchorRefs.current[i];
      if (anchor) {
        anchor.position.set(gx, py, gz);
      }

      const labelEl = labelOpacityRefs.current[i];
      if (labelEl && topicMeta?.topicName) {
        const isLabelVisible = labelVisibility.current.visibleIds.has(crystal.topicId);
        const distance = isLabelVisible
          ? labelVisibility.current.distances.get(crystal.topicId) ?? Infinity
          : Infinity;
        const occlusionFactor = labelVisibility.current.occlusion.get(crystal.topicId) ?? 1;
        const opacity = getLabelOpacity(distance) * occlusionFactor;
        labelEl.style.opacity = `${opacity}`;
        labelEl.style.display = opacity === 0 ? 'none' : 'block';
        if (opacity > 0) {
          needsInvalidate = true;
        }
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    attributes.instanceLevel.needsUpdate = true;
    attributes.instanceMorphProgress.needsUpdate = true;
    attributes.instanceSubjectSeed.needsUpdate = true;
    attributes.instanceColor.needsUpdate = true;
    attributes.instanceSelected.needsUpdate = true;
    attributes.instanceCeremonyPhase.needsUpdate = true;
    mesh.count = count;

    if (needsInvalidate) {
      invalidate();
    }
  });

  useFrame(({ camera: cam }) => {
    if (isPaused) {
      return;
    }

    const candidates = getVisibleLabelCandidates(
      crystals,
      cam.position,
      CRYSTAL_LABEL_OFFSET_Y,
      MAX_LABEL_DISTANCE,
      MAX_VISIBLE_LABELS,
    );
    const { visibleIds, distances } = labelVisibility.current;
    visibleIds.clear();
    distances.clear();
    labelVisibility.current.occlusion.clear();

    const mesh = instancedRef.current;
    const occluders = mesh ? [mesh] : [];

    candidates.forEach((candidate) => {
      visibleIds.add(candidate.topicId);
      distances.set(candidate.topicId, candidate.distance);
      const instanceIndex = crystals.findIndex((c) => c.topicId === candidate.topicId);
      const occlusionFactor = getLabelOcclusionFactor(
        cam.position,
        candidate.worldPosition,
        raycasterRef.current,
        occluders,
        null,
        LABEL_SECONDARY_OFFSET_Y,
        mesh && instanceIndex >= 0 ? { mesh, instanceId: instanceIndex } : undefined,
      );
      labelVisibility.current.occlusion.set(candidate.topicId, occlusionFactor);
    });
  });

  const handleCrystalPointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    suppressNextClickRef.current = true;
    handleSelectFromEvent(e);
  };

  const handleCrystalClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    handleSelectFromEvent(e);
  };

  const handleSelectFromEvent = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    const id = e.instanceId;
    if (id === undefined || id < 0 || id >= count) {
      return;
    }
    const crystal = crystals[id];
    if (!crystal) {
      return;
    }
    if (selectedTopicId === crystal.topicId) {
      onStartTopicStudySession?.(crystal.topicId);
    } else {
      selectTopic(crystal.topicId);
    }
  };

  if (crystals.length === 0) {
    return <group />;
  }

  const particleCrystal = particleTopicId
    ? crystals.find((c) => c.topicId === particleTopicId)
    : undefined;
  const [px, pz] = particleCrystal?.gridPosition ?? [0, 0];
  const particleY = 0.3;

  return (
    <group>
      <instancedMesh
        ref={instancedRef}
        args={[instanceGeometry, material, CRYSTAL_MAX_INSTANCES]}
        frustumCulled={false}
        onPointerUp={handleCrystalPointerUp}
        onClick={handleCrystalClick}
      />

      {crystals.map((crystal, index) => {
        const topicMeta = metadataLookup[crystal.topicId] as TopicMetadata | undefined;
        const labelLayerRange = isStudyPanelOpen ? [0, 10] : selectedTopicId === crystal.topicId ? [50, 100] : [0, 10];
        return (
          <group
            key={crystal.topicId}
            ref={(el: THREE.Group | null) => {
              labelAnchorRefs.current[index] = el;
            }}
          >
            {topicMeta?.topicName && (
              <Html
                center
                transform
                sprite
                position={[0, -0.7, 0]}
                zIndexRange={labelLayerRange}
                style={{
                  pointerEvents: 'none',
                  width: '100px',
                  textAlign: 'center',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <div
                  ref={(el: HTMLDivElement | null) => {
                    labelOpacityRefs.current[index] = el;
                  }}
                  style={{ opacity: 0 }}
                  className="pointer-events-none max-w-[100px] truncate rounded-sm border border-border/50 bg-card/75 px-0.5 py-0.5 text-center font-sans text-[5px] font-normal leading-none tracking-wide text-foreground shadow-sm backdrop-blur-sm"
                >
                  {topicMeta.topicName}
                </div>
              </Html>
            )}
          </group>
        );
      })}

      <GrowthParticles position={[px, particleY, pz]} active={!!particleTopicId} />
    </group>
  );
};

export default Crystals;
