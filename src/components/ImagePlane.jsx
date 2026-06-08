import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { SoftPlane } from '../materials/SoftSprite.jsx'

// A single floating image in the 2.5D archive — a feathered, desaturated sprite
// that parallaxes by depth and yaws/pitches toward the cursor as the camera
// passes. "Images half-seen", melting into the atmosphere.
function PlaneBody({ texture, data, billboard }) {
  const ref = useRef()
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    const px = state.pointer.x
    const py = state.pointer.y
    const k = billboard ? 0.5 : 0.18
    ref.current.rotation.y = data.baseRotY + px * k + Math.sin(t * 0.3 + data.seed) * 0.04
    ref.current.rotation.x = py * k * 0.6 + Math.cos(t * 0.25 + data.seed) * 0.03
  })
  const aspect = (texture.image?.width || 1) / (texture.image?.height || 1)
  const h = data.scale
  const w = h * (aspect || 1)
  return (
    <SoftPlane
      ref={ref}
      map={texture}
      width={w}
      height={h}
      position={data.pos}
      opacity={data.opacity}
      feather={0.32}
      desaturate={0.45}
      tint={data.tint || '#c9bfb0'}
      side={THREE.DoubleSide}
    />
  )
}

// Real harvested image (loaded by URL, suspends).
export function ImagePlaneURL({ url, data, billboard }) {
  const texture = useTexture(url)
  return <PlaneBody texture={texture} data={data} billboard={billboard} />
}

// Procedural placeholder (texture already in memory).
export function ImagePlaneTex({ texture, data, billboard }) {
  return <PlaneBody texture={texture} data={data} billboard={billboard} />
}
