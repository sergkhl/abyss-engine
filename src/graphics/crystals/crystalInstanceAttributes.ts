import * as THREE from 'three/webgpu';

/** level, morph, seed, color×3, selectCeremony×2 = 8 floats per instance */
export const CRYSTAL_INSTANCE_FLOAT_COUNT = 8;

export const CRYSTAL_MAX_INSTANCES = 64;

export interface CrystalInstanceArrays {
  instanceLevel: Float32Array;
  instanceMorphProgress: Float32Array;
  instanceSubjectSeed: Float32Array;
  instanceColor: Float32Array;
  /** Packed vec2: x = selected (0|1), y = ceremonyPhase (0–1) */
  instanceSelectCeremony: Float32Array;
}

export interface CrystalInstancedAttributes {
  instanceLevel: THREE.InstancedBufferAttribute;
  instanceMorphProgress: THREE.InstancedBufferAttribute;
  instanceSubjectSeed: THREE.InstancedBufferAttribute;
  instanceColor: THREE.InstancedBufferAttribute;
  /** Packed vec2: x = selected (0|1), y = ceremonyPhase (0–1) */
  instanceSelectCeremony: THREE.InstancedBufferAttribute;
}

export function createCrystalInstancedAttributes(
  maxInstances: number = CRYSTAL_MAX_INSTANCES,
): { arrays: CrystalInstanceArrays; attributes: CrystalInstancedAttributes } {
  const instanceLevel = new Float32Array(maxInstances);
  const instanceMorphProgress = new Float32Array(maxInstances);
  const instanceSubjectSeed = new Float32Array(maxInstances);
  const instanceColor = new Float32Array(maxInstances * 3);
  const instanceSelectCeremony = new Float32Array(maxInstances * 2);

  const attributes: CrystalInstancedAttributes = {
    instanceLevel: new THREE.InstancedBufferAttribute(instanceLevel, 1),
    instanceMorphProgress: new THREE.InstancedBufferAttribute(instanceMorphProgress, 1),
    instanceSubjectSeed: new THREE.InstancedBufferAttribute(instanceSubjectSeed, 1),
    instanceColor: new THREE.InstancedBufferAttribute(instanceColor, 3),
    instanceSelectCeremony: new THREE.InstancedBufferAttribute(instanceSelectCeremony, 2),
  };

  for (const attr of Object.values(attributes)) {
    attr.setUsage(THREE.DynamicDrawUsage);
  }

  return {
    arrays: {
      instanceLevel,
      instanceMorphProgress,
      instanceSubjectSeed,
      instanceColor,
      instanceSelectCeremony,
    },
    attributes,
  };
}
