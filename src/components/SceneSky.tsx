'use client'

import React, { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber/webgpu'
import * as THREE from 'three/webgpu'
import { SkyMesh } from 'three/addons/objects/SkyMesh.js'

/** Defaults aligned with three.js webgpu sky example (art direction hub). */
export const SCENE_SKY_DEFAULTS = {
  scale: 450_000,
  turbidity: 10,
  rayleigh: 3,
  mieCoefficient: 0.005,
  mieDirectionalG: 0.7,
  /** Degrees above horizon */
  elevation: 2,
  /** Degrees, 0 = +Z */
  azimuth: 180,
  cloudCoverage: 0.4,
  cloudDensity: 0.4,
  cloudElevation: 0.5,
} as const

/**
 * Below-horizon intro: hazy, warm mie, denser clouds — animates to {@link SCENE_SKY_DEFAULTS}.
 */
export const SCENE_SKY_ANIMATION_START = {
  elevation: -2,
  turbidity: 12.5,
  rayleigh: 2.05,
  mieCoefficient: 0.0088,
  mieDirectionalG: 0.82,
  azimuth: 175.5,
  cloudCoverage: 0.58,
  cloudDensity: 0.52,
  cloudElevation: 0.38,
  cloudSpeed: 0.00006,
} as const

export const SKY_STARTUP_ANIMATION_SEC = 4

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const sunScratch = new THREE.Vector3()

function applySkyState(
  sky: SkyMesh,
  state: {
    elevation: number
    turbidity: number
    rayleigh: number
    mieCoefficient: number
    mieDirectionalG: number
    azimuth: number
    cloudCoverage: number
    cloudDensity: number
    cloudElevation: number
    cloudSpeed: number
  },
  sunOut: THREE.Vector3,
) {
  sky.turbidity.value = state.turbidity
  sky.rayleigh.value = state.rayleigh
  sky.mieCoefficient.value = state.mieCoefficient
  sky.mieDirectionalG.value = state.mieDirectionalG
  sky.cloudCoverage.value = state.cloudCoverage
  sky.cloudDensity.value = state.cloudDensity
  sky.cloudElevation.value = state.cloudElevation
  sky.cloudSpeed.value = state.cloudSpeed

  const phi = THREE.MathUtils.degToRad(90 - state.elevation)
  const theta = THREE.MathUtils.degToRad(state.azimuth)
  sunOut.setFromSphericalCoords(1, phi, theta)
  sky.sunPosition.value.copy(sunOut)
}

interface SceneSkyAnimatorProps {
  sky: SkyMesh
  sunDirectionRef: React.MutableRefObject<THREE.Vector3>
}

/**
 * Eased intro: sun climbs through haze; `frameloop="demand"` requires invalidate while playing.
 */
const SceneSkyAnimator: React.FC<SceneSkyAnimatorProps> = ({ sky, sunDirectionRef }) => {
  const invalidate = useThree((s) => s.invalidate)
  const startMsRef = useRef<number | null>(null)
  const doneRef = useRef(false)

  useFrame(() => {
    if (doneRef.current) {
      return
    }

    if (startMsRef.current === null) {
      startMsRef.current = performance.now()
    }

    const elapsedSec = (performance.now() - startMsRef.current) / 1000
    const linearT = Math.min(1, elapsedSec / SKY_STARTUP_ANIMATION_SEC)
    const easedT = THREE.MathUtils.smootherstep(linearT, 0, 1)

    const end = SCENE_SKY_DEFAULTS
    const start = SCENE_SKY_ANIMATION_START

    applySkyState(
      sky,
      {
        elevation: lerp(start.elevation, end.elevation, easedT),
        turbidity: lerp(start.turbidity, end.turbidity, easedT),
        rayleigh: lerp(start.rayleigh, end.rayleigh, easedT),
        mieCoefficient: lerp(start.mieCoefficient, end.mieCoefficient, easedT),
        mieDirectionalG: lerp(start.mieDirectionalG, end.mieDirectionalG, easedT),
        azimuth: lerp(start.azimuth, end.azimuth, easedT),
        cloudCoverage: lerp(start.cloudCoverage, end.cloudCoverage, easedT),
        cloudDensity: lerp(start.cloudDensity, end.cloudDensity, easedT),
        cloudElevation: lerp(start.cloudElevation, end.cloudElevation, easedT),
        cloudSpeed: lerp(start.cloudSpeed, 0.0001, easedT),
      },
      sunScratch,
    )
    sunDirectionRef.current.copy(sunScratch)

    if (linearT < 1) {
      invalidate()
    } else {
      doneRef.current = true
    }
  })

  return null
}

export interface SceneSkyProps {
  /** Filled with normalized direction toward the sun (world space). */
  sunDirectionRef: React.MutableRefObject<THREE.Vector3>
}

/**
 * WebGPU Preetham skydome + clouds. Must sit inside a Canvas with a large camera far plane.
 */
export const SceneSky: React.FC<SceneSkyProps> = ({ sunDirectionRef }) => {
  const sky = useMemo(() => {
    const mesh = new SkyMesh()
    mesh.scale.setScalar(SCENE_SKY_DEFAULTS.scale)
    // Scene Fog uses depth/distance; SkyMesh snaps to camera far — would otherwise blend to fogColor.
    mesh.material.fog = false
    mesh.frustumCulled = false
    return mesh
  }, [])

  useLayoutEffect(() => {
    applySkyState(sky, { ...SCENE_SKY_ANIMATION_START }, sunDirectionRef.current)
  }, [sky, sunDirectionRef])

  return (
    <>
      <primitive object={sky} />
      <SceneSkyAnimator sky={sky} sunDirectionRef={sunDirectionRef} />
    </>
  )
}

const SUN_LIGHT_DISTANCE = 120

export interface SunSyncedDirectionalLightProps {
  sunDirectionRef: React.MutableRefObject<THREE.Vector3>
  intensity?: number
  color?: string
  castShadow?: boolean
}

/**
 * Key light: direction matches analytic sky sun vector.
 */
export const SunSyncedDirectionalLight: React.FC<SunSyncedDirectionalLightProps> = ({
  sunDirectionRef,
  intensity = 1.15,
  color = '#ffffff',
  castShadow = true,
}) => {
  const lightRef = useRef<THREE.DirectionalLight>(null)

  useFrame(() => {
    const light = lightRef.current
    if (!light) {
      return
    }
    const sun = sunDirectionRef.current
    light.position.set(
      sun.x * SUN_LIGHT_DISTANCE,
      sun.y * SUN_LIGHT_DISTANCE,
      sun.z * SUN_LIGHT_DISTANCE,
    )
    light.target.position.set(0, 0, 0)
    light.target.updateMatrixWorld()

    const sunY = sun.y
    const lift = THREE.MathUtils.smoothstep(sunY, -0.12, 0.08)
    light.intensity = intensity * (0.28 + 0.62 * lift)
  })

  return (
    <directionalLight ref={lightRef} intensity={intensity} color={color} castShadow={castShadow}>
      <object3D attach="target" position={[0, 0, 0]} />
    </directionalLight>
  )
}
