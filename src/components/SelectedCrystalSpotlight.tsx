'use client'

import React, { useState } from 'react'
import * as THREE from 'three/webgpu'
import { SpotLight } from '@react-three/drei/webgpu'

interface SelectedCrystalSpotlightProps {
  spotlightPosition: [number, number, number]
  spotlightTarget: [number, number, number]
  spotlightOpacity: number
}

const SPOTLIGHT_RADIUS_TOP = 0.2
const SPOTLIGHT_RADIUS_BOTTOM = 0.5
const SPOTLIGHT_ANGLE_POWER = 5
const SPOTLIGHT_INTENSITY = 1

export const SelectedCrystalSpotlight: React.FC<SelectedCrystalSpotlightProps> = ({
  spotlightPosition,
  spotlightTarget,
  spotlightOpacity,
}) => {
  const [spotlightTargetRef] = useState(() => new THREE.Object3D())

  return (
    <>
      <SpotLight
        castShadow
        target={spotlightTargetRef}
        position={spotlightPosition}
        penumbra={0.2}
        radiusTop={SPOTLIGHT_RADIUS_TOP}
        radiusBottom={SPOTLIGHT_RADIUS_BOTTOM}
        distance={6}
        angle={0.45}
        attenuation={11}
        anglePower={SPOTLIGHT_ANGLE_POWER}
        intensity={SPOTLIGHT_INTENSITY}
        opacity={spotlightOpacity}
      />
      <primitive object={spotlightTargetRef} position={spotlightTarget} />
    </>
  )
}
