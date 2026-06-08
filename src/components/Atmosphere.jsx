import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store.js'
import { ACT_MOOD, PALETTE } from '../lib/palette.js'
import { makeGradientBackdrop, makeHaze, makeSoftCircle } from '../lib/procedural.js'

// Reusable depth furniture for the painterly look: a graded backdrop, a few
// drifting haze bands (atmospheric perspective), and slow dust motes. Drop one
// into every act. Mood (fog/haze/tint) comes from the current act.
export default function Atmosphere({
  backdrop = true,
  backdropZ = -20,
  haze = 3,
  dust = 140,
  dustBox = [22, 14, 16],
}) {
  const act = useStore((s) => s.act)
  const mood = ACT_MOOD[act] || ACT_MOOD[1]

  const backdropTex = useMemo(
    () => makeGradientBackdrop(mood.haze, PALETTE.void),
    [mood.haze]
  )
  const hazeTex = useMemo(() => makeHaze(mood.haze), [mood.haze])
  const dustTex = useMemo(() => makeSoftCircle(PALETTE.bone), [])

  const hazeRefs = useRef([])
  const dustRef = useRef()

  const dustGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(dust * 3)
    for (let i = 0; i < dust; i++) {
      pos[i * 3] = (Math.random() - 0.5) * dustBox[0]
      pos[i * 3 + 1] = (Math.random() - 0.5) * dustBox[1]
      pos[i * 3 + 2] = (Math.random() - 0.5) * dustBox[2]
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [dust, dustBox[0], dustBox[1], dustBox[2]])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    hazeRefs.current.forEach((m, i) => {
      if (!m) return
      m.position.x = Math.sin(t * 0.04 + i) * 1.5
      m.rotation.z = t * 0.01 * (i % 2 ? 1 : -1)
    })
    if (dustRef.current) {
      dustRef.current.rotation.z = t * 0.012
      dustRef.current.position.y = Math.sin(t * 0.08) * 0.4
    }
  })

  return (
    <group>
      {backdrop && (
        <mesh position={[0, 0, backdropZ]} renderOrder={-10}>
          <planeGeometry args={[80, 50]} />
          <meshBasicMaterial map={backdropTex} depthWrite={false} fog={false} />
        </mesh>
      )}

      {Array.from({ length: haze }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => (hazeRefs.current[i] = el)}
          position={[0, (i - haze / 2) * 2, backdropZ + 4 + i * 4]}
        >
          <planeGeometry args={[34, 22]} />
          <meshBasicMaterial
            map={hazeTex}
            transparent
            opacity={0.16}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}

      <points ref={dustRef} geometry={dustGeo}>
        <pointsMaterial
          map={dustTex}
          size={0.09}
          sizeAttenuation
          transparent
          opacity={0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          color={PALETTE.bone}
        />
      </points>
    </group>
  )
}
