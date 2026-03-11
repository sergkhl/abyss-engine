import * as THREE from 'three/webgpu'
import { useEffect } from 'react'
import { usePostProcessing, useThree } from '@react-three/fiber/webgpu'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'
import { emissive, mrt, output, pass, vec4 } from 'three/tsl'

const BLOOM_STRENGTH = 1.5
const BLOOM_RADIUS = 0.75

interface GlowPostProcessingProps {
  bloomExcludeLayer?: number
  bloomMode?: 'emissive' | 'color'
}

export function GlowPostProcessing({
  bloomExcludeLayer = 1,
  bloomMode = 'emissive',
}: GlowPostProcessingProps) {
  const renderer = useThree((state) => state.renderer)

  const { rebuild, reset } = usePostProcessing(
    ({ postProcessing, passes }) => {
      const scenePass = passes.scenePass
      if (!postProcessing || !scenePass) {
        return
      }

      const sceneLayers = new THREE.Layers()
      sceneLayers.enable(0)
      sceneLayers.enable(bloomExcludeLayer)
      scenePass.setLayers(sceneLayers)

      const baseColorPass = scenePass.getTextureNode()
      let bloomPass = passes.bloomPass as any
      if (!bloomPass || bloomPass.scene !== scenePass.scene || bloomPass.camera !== scenePass.camera) {
        bloomPass = pass(scenePass.scene, scenePass.camera)
      }

      const bloomLayers = new THREE.Layers()
      bloomLayers.set(0)
      bloomPass.setLayers(bloomLayers)

      if (bloomMode === 'emissive') {
        const bloomMrtNode = mrt({
          output,
          emissive: vec4(emissive, output.a),
        })
        bloomPass.setMRT(bloomMrtNode)

        const bloomTexture = bloomPass.getTexture('emissive')
        if (bloomTexture) {
          bloomTexture.type = THREE.UnsignedByteType
        }
      }

      const bloomSourcePass = bloomMode === 'emissive'
        ? bloomPass.getTextureNode('emissive')
        : bloomPass.getTextureNode()

      if (!baseColorPass || !bloomSourcePass) {
        return
      }

      postProcessing.outputNode = baseColorPass.add(
        bloom(
          bloomSourcePass,
          BLOOM_STRENGTH,
          BLOOM_RADIUS,
        ),
      )

      if (passes.bloomPass !== bloomPass) {
        return { bloomPass }
      }
    },
  )

  useEffect(() => {
    if (!renderer) {
      return
    }

    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0

    return () => {
      reset()
    }
  }, [renderer, reset])

  useEffect(() => {
    rebuild()
  }, [bloomMode, bloomExcludeLayer, rebuild])

  return null
}
