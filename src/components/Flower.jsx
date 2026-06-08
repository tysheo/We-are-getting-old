import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SoftPlane } from '../materials/SoftSprite.jsx'
import { paintedPetal, paintedStem, makeSoftCircle } from '../lib/procedural.js'
import { PALETTE } from '../lib/palette.js'

// The one living thing, rebuilt as flat painted layers (no lit 3D primitives).
// Two rings of feathered petals splay open like an aperture around a layered
// glowing heart ringed with stamens; a soft stem and drop-shadow ground it.
// Props unchanged: pull 0..1, openness 0..1, tremble 0..1.
const OUTER = 9
const INNER = 7
const STAMENS = 12

export default function Flower({ pull = 0, openness = 0, tremble = 0, ...props }) {
  const sway = useRef()

  // two petal paintings: pale outer, warmer inner
  const outerTex = useMemo(() => paintedPetal(PALETTE.paper, PALETTE.bruise, 5), [])
  const innerTex = useMemo(() => paintedPetal(PALETTE.bone, PALETTE.flower, 9), [])
  const stemTex = useMemo(() => paintedStem(PALETTE.ash), [])
  const heartTex = useMemo(() => makeSoftCircle(PALETTE.flowerGlow), [])
  const stamenTex = useMemo(() => makeSoftCircle(PALETTE.flower), [])
  const shadowTex = useMemo(() => makeSoftCircle('#000000'), [])

  const outer = useMemo(() => ring(OUTER), [])
  const inner = useMemo(() => ring(INNER, 0.5), [])
  const stamens = useMemo(() => ring(STAMENS), [])

  useFrame((state) => {
    if (sway.current) {
      const t = state.clock.elapsedTime
      sway.current.rotation.z = Math.sin(t * 2.2) * 0.02 * tremble
    }
  })

  const stemH = 0.3 + pull * 1.5
  const petalLen = 0.55 + openness * 0.45
  const radius = 0.04 + openness * 0.2
  const headY = stemH - 0.1

  return (
    <group ref={sway} {...props}>
      {/* stem */}
      <SoftPlane
        map={stemTex}
        width={0.22}
        height={stemH}
        position={[0, stemH / 2 - 0.2, 0]}
        feather={0.12}
        tint={PALETTE.ash}
      />

      <group position={[0, headY, 0]}>
        {/* soft drop shadow behind the head */}
        <SoftPlane
          map={shadowTex}
          width={1.7 + openness * 1.5}
          height={1.7 + openness * 1.5}
          position={[0.06, -0.06, -0.06]}
          opacity={0.4}
          feather={0.5}
        />

        {/* outer petal ring */}
        {outer.map((p, i) => (
          <group key={i} rotation={[0, 0, p.angle]}>
            <SoftPlane
              map={outerTex}
              width={0.44 + openness * 0.14}
              height={petalLen}
              position={[0, radius + petalLen / 2, -0.01 + i * 0.002]}
              feather={0.34}
              tint={PALETTE.paper}
              side={THREE.DoubleSide}
            />
          </group>
        ))}

        {/* inner petal ring — warmer, shorter, set slightly forward */}
        {inner.map((p, i) => (
          <group key={i} rotation={[0, 0, p.angle]}>
            <SoftPlane
              map={innerTex}
              width={0.34 + openness * 0.1}
              height={petalLen * 0.7}
              position={[0, radius + petalLen * 0.36, 0.03 + i * 0.002]}
              feather={0.36}
              tint={PALETTE.bone}
              side={THREE.DoubleSide}
            />
          </group>
        ))}

        {/* stamen ring around the heart */}
        {stamens.map((p, i) => {
          const r = 0.12 + openness * 0.14
          return (
            <SoftPlane
              key={i}
              map={stamenTex}
              width={0.1}
              height={0.1}
              position={[Math.cos(p.angle) * r, Math.sin(p.angle) * r, 0.06]}
              opacity={0.5 + openness * 0.4}
              tint={PALETTE.flower}
              feather={0.5}
            />
          )
        })}

        {/* layered glowing heart — bloom makes this the light source */}
        <SoftPlane
          map={heartTex}
          width={0.7 + openness * 0.7}
          height={0.7 + openness * 0.7}
          position={[0, 0, 0.04]}
          opacity={0.5 + openness * 0.3}
          tint={PALETTE.flower}
          feather={0.5}
        />
        <SoftPlane
          map={heartTex}
          width={0.34 + openness * 0.3}
          height={0.34 + openness * 0.3}
          position={[0, 0, 0.07]}
          opacity={0.85 + openness * 0.15}
          tint={PALETTE.flowerGlow}
          feather={0.45}
        />
      </group>
    </group>
  )
}

function ring(n, offset = 0) {
  return new Array(n)
    .fill(0)
    .map((_, i) => ({ angle: ((i + offset) / n) * Math.PI * 2, phase: Math.random() * 6.28 }))
}
