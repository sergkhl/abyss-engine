import * as THREE from 'three/webgpu'
import type { SkyMesh } from 'three/addons/objects/SkyMesh.js'
import {
  Fn,
  float,
  vec4,
  uniform,
  dot,
  normalize,
  positionWorld,
  cameraPosition,
  pow,
  smoothstep,
  add,
  mul,
  sub,
} from 'three/tsl'

/** Full cone apex angle (degrees) around the anti-solar axis. 180° ≈ sun-opposite hemisphere; 330° widens the highlight. */
export const OPPOSITE_HEMISPHERE_GRADING_CONE_APEX_DEG = 320

export function cosineConeEdgeFromApexDegrees(apexDeg: number): number {
  const halfAngleRad = (apexDeg / 2) * (Math.PI / 180)
  return Math.cos(halfAngleRad)
}

/**
 * Stylized additive grading toward the anti-solar direction: lifts the sky away from the sun for a
 * more even vault (e.g. early sunrise). Cone width is {@link OPPOSITE_HEMISPHERE_GRADING_CONE_APEX_DEG}.
 * Disabled when the sun is at or below the horizon via a smooth gate on sun direction Y.
 */
export const OPPOSITE_HEMISPHERE_GRADING_DEFAULTS = {
  intensity: 0.38,
  falloff: 1.15,
  blend: 0.32,
  /** Warm pre-dawn / sunrise fill */
  color: '#ffd9a8',
} as const

export type OppositeHemisphereGradingHandles = {
  intensity: { value: number }
  falloff: { value: number }
  blend: { value: number }
  color: { value: THREE.Color }
}

/**
 * Wraps the skydome fragment so final RGB gains a sun-opposite lobe. Keeps the full Preetham + cloud
 * graph as the base by referencing the existing {@link NodeMaterial#colorNode}.
 */
export function attachOppositeHemisphereGrading(
  sky: SkyMesh,
  initial: Partial<{
    intensity: number
    falloff: number
    blend: number
    color: THREE.ColorRepresentation
  }> = {},
): OppositeHemisphereGradingHandles {
  const rawBase = sky.material.colorNode
  if (rawBase === null || rawBase === undefined) {
    throw new Error('attachOppositeHemisphereGrading: SkyMesh colorNode is missing')
  }
  const baseColorNode = rawBase as { rgb: unknown; a: unknown }
  const d = OPPOSITE_HEMISPHERE_GRADING_DEFAULTS

  const intensity = uniform(initial.intensity ?? d.intensity)
  const falloff = uniform(initial.falloff ?? d.falloff)
  const blend = uniform(initial.blend ?? d.blend)
  const color = uniform(
    new THREE.Color(initial.color !== undefined ? initial.color : d.color),
  )

  const sunPosUniform = sky.sunPosition
  const cosConeEdge = float(
    cosineConeEdgeFromApexDegrees(OPPOSITE_HEMISPHERE_GRADING_CONE_APEX_DEG),
  )

  const gradedColorNode = Fn(() => {
    const baseRgb = baseColorNode.rgb as never
    const baseA = baseColorNode.a as never
    const direction = normalize(positionWorld.sub(cameraPosition))
    const sunDir = normalize(sunPosUniform)
    const horizonGate = smoothstep(float(0), float(0.06), sunDir.y)
    const towardAntiSun = dot(direction, sunDir.negate())
    const coneMask = smoothstep(cosConeEdge, float(1), towardAntiSun)
    const mask = pow(coneMask, falloff)
    const boost = intensity.mul(horizonGate).mul(mask)
    const additive = color.mul(boost)
    const lit = add(baseRgb, additive)
    const oneM = sub(float(1), blend)
    const outRgb = add(mul(baseRgb, oneM), mul(lit, blend))
    return vec4(outRgb, baseA)
  })()

  sky.material.colorNode = gradedColorNode

  return { intensity, falloff, blend, color }
}
