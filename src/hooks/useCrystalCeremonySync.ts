'use client';

import { useFrame } from '@react-three/fiber/webgpu';
import { crystalCeremonyStore } from '../features/progression/crystalCeremonyStore';

/**
 * Advances ceremony clock so completed ceremonies clear without a separate timer.
 */
export function useCrystalCeremonySync(): void {
  useFrame(() => {
    crystalCeremonyStore.getState().syncCeremonyClock(performance.now());
  });
}
