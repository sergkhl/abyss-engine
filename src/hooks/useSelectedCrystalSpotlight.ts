import { useMemo } from 'react';

import { FLOOR_SURFACE_Y } from '../constants/sceneFloor';
import type { ActiveCrystal, TopicRef } from '../types';

export const SPOTLIGHT_HEIGHT = 5;
export const SPOTLIGHT_TARGET_Y = 0.42;
export const SPOTLIGHT_DISTANCE = 6;
export const SPOTLIGHT_ANGLE = 0.45;
export const SPOTLIGHT_ATTENUATION = 11;
export const SPOTLIGHT_OPACITY = 0.7;
export const SPOTLIGHT_SELECTED_CRYSTAL_Y = 0.3;

interface UseSelectedCrystalSpotlightParams {
  selectedTopic: TopicRef | null;
  crystals: readonly ActiveCrystal[];
}

export interface SelectedCrystalSpotlightData {
  selectedCrystalPosition: [number, number, number] | null;
  spotlightPosition: [number, number, number];
  spotlightTarget: [number, number, number];
  spotlightOpacity: number;
}

export const useSelectedCrystalSpotlight = ({
  selectedTopic,
  crystals,
}: UseSelectedCrystalSpotlightParams): SelectedCrystalSpotlightData => {
  const selectedCrystalPosition = useMemo<[number, number, number] | null>(() => {
    if (!selectedTopic) return null;

    const crystal = crystals.find(
      (c) => c.subjectId === selectedTopic.subjectId && c.topicId === selectedTopic.topicId,
    );
    if (!crystal) return null;

    const [x, z] = crystal.gridPosition;
    return [x, FLOOR_SURFACE_Y + SPOTLIGHT_SELECTED_CRYSTAL_Y, z];
  }, [selectedTopic, crystals]);

  const spotlightPosition = useMemo<[number, number, number]>(() => {
    if (!selectedCrystalPosition) {
      return [0, FLOOR_SURFACE_Y + SPOTLIGHT_HEIGHT, 0];
    }

    return [
      selectedCrystalPosition[0],
      FLOOR_SURFACE_Y + SPOTLIGHT_HEIGHT,
      selectedCrystalPosition[2],
    ];
  }, [selectedCrystalPosition]);

  const spotlightTarget = useMemo<[number, number, number]>(() => {
    if (!selectedCrystalPosition) {
      return [0, FLOOR_SURFACE_Y, 0];
    }

    return [
      selectedCrystalPosition[0],
      FLOOR_SURFACE_Y + SPOTLIGHT_TARGET_Y,
      selectedCrystalPosition[2],
    ];
  }, [selectedCrystalPosition]);

  return {
    selectedCrystalPosition,
    spotlightPosition,
    spotlightTarget,
    spotlightOpacity: selectedCrystalPosition ? SPOTLIGHT_OPACITY : 0,
  };
};
