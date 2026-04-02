// @ts-nocheck — three/tsl instanced buffer helpers are typed as generic nodes; graphs are valid at runtime.
import * as THREE from 'three/webgpu';
import {
  cameraPosition,
  clamp,
  float,
  floor,
  Fn,
  instancedDynamicBufferAttribute,
  max,
  mix,
  normalLocal,
  normalWorld,
  positionLocal,
  positionWorld,
  vec3,
} from 'three/tsl';
import type { CrystalInstancedAttributes } from './crystalInstanceAttributes';
import { crystalHighFrequencyNoise, crystalLowFrequencyNoise } from './crystalNoiseNodes';

const stoneColor = vec3(0.541, 0.541, 0.478);

/**
 * Picks one of six tier scalars using a float index 0–5 (piecewise constant).
 */
function tierScalar(
  tierIndex: {
    lessThan: (v: number) => { select: (a: unknown, b: unknown) => unknown };
  },
  v0: number,
  v1: number,
  v2: number,
  v3: number,
  v4: number,
  v5: number,
) {
  const f = float;
  return tierIndex
    .lessThan(0.5)
    .select(
      f(v0),
      tierIndex
        .lessThan(1.5)
        .select(
          f(v1),
          tierIndex
            .lessThan(2.5)
            .select(
              f(v2),
              tierIndex
                .lessThan(3.5)
                .select(f(v3), tierIndex.lessThan(4.5).select(f(v4), f(v5))),
            ),
        ),
    );
}

/**
 * Shared MeshPhysicalNodeMaterial for instanced procedural crystals.
 * Tier tables mirror `crystalMorphModel.ts` / morph plan.
 */
export function createCrystalNodeMaterial(
  attributes: CrystalInstancedAttributes,
  envMap: THREE.Texture | null,
): THREE.MeshPhysicalNodeMaterial {
  const iLevel = instancedDynamicBufferAttribute(attributes.instanceLevel, 'float');
  const iMorph = instancedDynamicBufferAttribute(attributes.instanceMorphProgress, 'float');
  const iSubjectSeed = instancedDynamicBufferAttribute(attributes.instanceSubjectSeed, 'float');
  const iColor = instancedDynamicBufferAttribute(attributes.instanceColor, 'vec3');
  const iSelected = instancedDynamicBufferAttribute(attributes.instanceSelected, 'float');
  const iCeremonyPhase = instancedDynamicBufferAttribute(attributes.instanceCeremonyPhase, 'float');

  const levelInt = clamp(floor(iLevel), float(0), float(5));
  const fromTier = max(float(0), levelInt.sub(1));
  const morphT = iMorph.mul(iMorph).mul(float(3).sub(iMorph.mul(2)));

  const lowFreqAmp = mix(
    tierScalar(fromTier, 0, 0.04, 0.10, 0.08, 0.06, 0.04),
    tierScalar(levelInt, 0, 0.04, 0.10, 0.08, 0.06, 0.04),
    morphT,
  );
  const lowFreqScale = mix(
    tierScalar(fromTier, 0, 1.8, 2.2, 1.5, 1.2, 1.0),
    tierScalar(levelInt, 0, 1.8, 2.2, 1.5, 1.2, 1.0),
    morphT,
  );
  const highFreqAmp = mix(
    tierScalar(fromTier, 0, 0, 0, 0.06, 0.12, 0.2),
    tierScalar(levelInt, 0, 0, 0, 0.06, 0.12, 0.2),
    morphT,
  );
  const highFreqScale = mix(
    tierScalar(fromTier, 0, 0, 0, 4.5, 6.0, 8.0),
    tierScalar(levelInt, 0, 0, 0, 4.5, 6.0, 8.0),
    morphT,
  );
  const quantStep = mix(
    tierScalar(fromTier, 0, 0, 0, 0.30, 0.4, 0.50),
    tierScalar(levelInt, 0, 0, 0, 0.30, 0.4, 0.50),
    morphT,
  );

  const levelNorm = clamp(iLevel, float(0), float(5)).div(float(5));

  const roughness = mix(
    tierScalar(fromTier, 0.95, 0.75, 0.55, 0.35, 0.15, 0.05),
    tierScalar(levelInt, 0.95, 0.75, 0.55, 0.35, 0.15, 0.05),
    morphT,
  );
  const transmission = mix(
    tierScalar(fromTier, 0, 0.05, 0.25, 0.5, 0.75, 0.92),
    tierScalar(levelInt, 0, 0.05, 0.25, 0.5, 0.75, 0.92),
    morphT,
  );
  const ior = mix(
    tierScalar(fromTier, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5),
    tierScalar(levelInt, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5),
    morphT,
  );
  const thickness = mix(
    tierScalar(fromTier, 0, 0.1, 0.2, 0.3, 0.4, 0.5),
    tierScalar(levelInt, 0, 0.1, 0.2, 0.3, 0.4, 0.5),
    morphT,
  );
  const emissiveIntensity = mix(
    tierScalar(fromTier, 0.1, 0.3, 0.5, 0.8, 1.2, 2.0),
    tierScalar(levelInt, 0.1, 0.3, 0.5, 0.8, 1.2, 2.0),
    morphT,
  );
  const dispersion = mix(
    tierScalar(fromTier, 0, 0, 0, 0.02, 0.05, 0.1),
    tierScalar(levelInt, 0, 0, 0, 0.02, 0.05, 0.1),
    morphT,
  );
  const fresnelPower = mix(
    tierScalar(fromTier, 5.0, 4.0, 3.5, 3.0, 2.5, 2.0),
    tierScalar(levelInt, 5.0, 4.0, 3.5, 3.0, 2.5, 2.0),
    morphT,
  );
  const fresnelIntensity = mix(
    tierScalar(fromTier, 0.05, 0.15, 0.3, 0.5, 0.7, 1.0),
    tierScalar(levelInt, 0.05, 0.15, 0.3, 0.5, 0.7, 1.0),
    morphT,
  );

  const material = new THREE.MeshPhysicalNodeMaterial({
    side: THREE.FrontSide,
    transparent: true,
    depthWrite: true,
    envMap,
    envMapIntensity: 1.2,
  });

  const positionNode = Fn(() => {
    const n = normalLocal.normalize();
    const p = positionLocal;
    const seed = iSubjectSeed;

    const lowNoise = crystalLowFrequencyNoise(p, seed, lowFreqScale);
    const highRaw = crystalHighFrequencyNoise(p, seed, highFreqScale);
    const highQuant = floor(highRaw.div(max(quantStep, float(1e-4)))).mul(quantStep);
    const total = lowNoise.mul(lowFreqAmp).add(highQuant.mul(highFreqAmp));
    const displaced = positionLocal.add(n.mul(total));
    return displaced;
  })();

  material.positionNode = positionNode;

  material.colorNode = mix(stoneColor, iColor, levelNorm);
  material.roughnessNode = roughness;
  material.metalnessNode = float(0);
  material.transmissionNode = transmission;
  material.iorNode = ior;
  material.thicknessNode = thickness;
  material.dispersionNode = dispersion;

  const viewDir = cameraPosition.sub(positionWorld).normalize();
  const fresnelRaw = float(1)
    .sub(normalWorld.dot(viewDir).saturate())
    .pow(fresnelPower);
  const fresnelTerm = fresnelRaw.mul(fresnelIntensity);
  const ceremonyFlash = float(iCeremonyPhase).mul(float(1).sub(float(iCeremonyPhase))).mul(8.0);
  const selectionBoost = iSelected.mul(1.5);

  material.emissiveNode = iColor.mul(
    fresnelTerm.add(levelNorm.mul(0.3)).add(selectionBoost).add(ceremonyFlash).add(emissiveIntensity.mul(0.15)),
  );

  return material;
}
