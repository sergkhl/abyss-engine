'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ActiveCrystal } from '../types';
import { calculateLevelFromXP } from '../utils/progressionUtils';
import { useUIStore } from '../store/uiStore';
import { getCrystalColors, getGeometryForSubject } from '../utils/geometryMapping';

const crystalInnerGeometry = new THREE.SphereGeometry(0.15, 8, 6);
const levelIndicatorGeometry = new THREE.SphereGeometry(0.08, 16, 16);

interface TopicMetadata {
  title?: string;
  subjectId: string;
  subjectName?: string;
  topicName?: string;
}

export type TopicMetadataMap = Record<string, TopicMetadata>;

function getCrystalScale(level: number): number {
  const baseScale = 0.6;
  const scaleIncrement = 0.15;
  return baseScale + level * scaleIncrement;
}

interface CrystalsProps {
  crystals: ActiveCrystal[];
  topicMetadata?: TopicMetadataMap;
  onStartTopicStudySession?: (topicId: string) => void;
}

interface SingleCrystalProps {
  crystal: ActiveCrystal;
  isSelected: boolean;
  topicMetadata?: TopicMetadataMap;
  onSelect: (crystal: ActiveCrystal) => void;
}

const SingleCrystal: React.FC<SingleCrystalProps> = ({
  crystal,
  isSelected,
  topicMetadata,
  onSelect,
}) => {
  const [x, z] = crystal.gridPosition;
  const [animatedScale, setAnimatedScale] = React.useState(0);

  const topicInfo = topicMetadata?.[crystal.topicId];
  const colors = getCrystalColors(topicInfo?.subjectId || null);
  const level = calculateLevelFromXP(crystal.xp);
  const targetScale = getCrystalScale(level);
  React.useEffect(() => {
    const startTime = Date.now();
    const duration = 500;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScale(eased * targetScale);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [targetScale, crystal.spawnedAt]);

  const crystalGeometry = useMemo(() => {
    return getGeometryForSubject(topicInfo?.subjectId || null, 'crystal');
  }, [topicInfo?.subjectId]);

  const selectedEmissiveIntensity = isSelected ? 0.6 : 0.2;
  const selectedEmissiveIntensityInner = isSelected ? 0.9 : 0.4;

  const outerMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: colors.outerColor,
        metalness: 0.4,
        roughness: 0.3,
        emissive: colors.emissiveColor,
        emissiveIntensity: selectedEmissiveIntensity,
      }),
    [colors, selectedEmissiveIntensity],
  );

  const innerMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: colors.innerColor,
        metalness: 0.7,
        roughness: 0.1,
        emissive: colors.emissiveColor,
        emissiveIntensity: selectedEmissiveIntensityInner,
        transparent: true,
        opacity: 0.8,
      }),
    [colors, selectedEmissiveIntensityInner],
  );

  const levelMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#fbbf24',
        metalness: 0.5,
        roughness: 0.3,
        emissive: '#f59e0b',
        emissiveIntensity: 0.3,
      }),
    [],
  );

  return (
    <group position={[x, 0.3, z]}>
      <mesh
        geometry={crystalGeometry}
        material={outerMaterial}
        scale={[animatedScale, animatedScale, animatedScale]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(crystal);
        }}
      />

      <mesh
        geometry={crystalInnerGeometry}
        material={innerMaterial}
        position={[0, 0.1, 0]}
        scale={[animatedScale, animatedScale, animatedScale]}
      />

      {level > 0 && (
        <mesh
          geometry={levelIndicatorGeometry}
          material={levelMaterial}
          position={[0, 0.4 * animatedScale, 0]}
        />
      )}
    </group>
  );
};

export const Crystals: React.FC<CrystalsProps> = ({
  crystals,
  onStartTopicStudySession,
  topicMetadata,
}) => {
  if (crystals.length === 0) {
    return <group />;
  }

  const selectedTopicId = useUIStore((state) => state.selectedTopicId);
  const selectTopic = useUIStore((state) => state.selectTopic);
  const handleCrystalClick = (crystal: ActiveCrystal) => {
    if (selectedTopicId === crystal.topicId) {
      onStartTopicStudySession?.(crystal.topicId);
    } else {
      selectTopic(crystal.topicId);
    }
  };

  return (
    <group>
      {crystals.map((crystal, index) => (
        <SingleCrystal
          key={`${crystal.topicId}-${index}`}
          crystal={crystal}
          isSelected={selectedTopicId === crystal.topicId}
          onSelect={handleCrystalClick}
          topicMetadata={topicMetadata}
        />
      ))}
    </group>
  );
};

export default Crystals;
