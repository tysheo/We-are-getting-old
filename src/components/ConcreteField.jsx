import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { paintedConcrete, makeSoftCircle } from '../lib/procedural.js'
import { SoftPlane } from '../materials/SoftSprite.jsx'
import { PALETTE } from '../lib/palette.js'
import { useCoverScale } from '../lib/responsive.js'

// design size of the field; cover-scaled to fill any window aspect
const FIELD_W = 8
const FIELD_H = 5.4

// The sealed ground as flat painted shards (cut-paper layers), not lit boxes.
// Before the threshold the shards rest and only those near the stem tremble;
// past it they become dynamic bodies and fall away. The whole field is
// cover-scaled so the concrete always fills the frame on any window size.
export default function ConcreteField({ pull = 0, shattered = false, texture }) {
  const shards = useShards()
  const tex = texture
  const cover = useCoverScale(FIELD_W, FIELD_H, 0)
  const glowTex = useMemo(() => makeSoftCircle(PALETTE.flowerGlow), [])

  return (
    <>
      {/* resting field (cut-paper layers) lives in a cover-scaled group */}
      {!shattered && (
        <group scale={cover}>
          {/* warm light leaking from beneath, revealed as the gap opens */}
          <SoftPlane
            map={glowTex}
            width={2.2 + pull * 2.6}
            height={2.2 + pull * 2.6}
            position={[0, -0.4, -0.55]}
            opacity={pull * 0.7}
            tint={PALETTE.flowerGlow}
            feather={0.5}
          />
          {/* the sealed ground plane behind the shards, so the gap reveals depth */}
          <SoftPlane
            map={tex}
            width={FIELD_W + 1}
            height={FIELD_H + 1}
            position={[0, 0, -0.4]}
            feather={0.16}
            tint={PALETTE.dust}
            desaturate={0.1}
          />
          {shards.map((s, i) => (
            <RestingShard key={i} shard={s} pull={pull} texture={tex} />
          ))}
        </group>
      )}

      {/* on shatter, bake the cover scale into world positions so rapier bodies
          aren't children of a scaled group (which it dislikes) */}
      {shattered &&
        shards.map((s, i) => <FallingShard key={i} shard={s} texture={tex} cover={cover} />)}
    </>
  )
}

function RestingShard({ shard, pull, texture }) {
  const ref = useRef()
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    const near = Math.max(0, 1 - shard.dist / 1.6)
    const shake = near * pull * 0.05
    ref.current.position.x = shard.pos[0] + Math.sin(t * 22 + shard.seed) * shake
    ref.current.position.y = shard.pos[1] + Math.cos(t * 19 + shard.seed) * shake
    ref.current.position.z = shard.pos[2] + near * pull * 0.15
    ref.current.visible = shard.dist >= pull * 1.25 // gap opens around the stem
  })
  return (
    <SoftPlane
      ref={ref}
      map={texture}
      width={shard.w}
      height={shard.h}
      position={shard.pos}
      rotation={shard.rot}
      feather={0.14}
      tint={shard.tint}
      desaturate={0.08}
    />
  )
}

function FallingShard({ shard, texture, cover = 1 }) {
  const body = useRef()
  const launched = useRef(false)
  const pos = [shard.pos[0] * cover, shard.pos[1] * cover, shard.pos[2] * cover]
  useFrame(() => {
    if (launched.current || !body.current) return
    launched.current = true
    const dir = new THREE.Vector3(pos[0], pos[1], 0.5).normalize()
    body.current.applyImpulse(
      { x: dir.x * 2.4 + (Math.random() - 0.5), y: 1.4 + Math.random() * 2.2, z: 3 + Math.random() * 2.5 },
      true
    )
    body.current.applyTorqueImpulse(
      { x: Math.random() - 0.5, y: Math.random() - 0.5, z: Math.random() - 0.5 },
      true
    )
  })
  if (shard.dist < 0.45) return null // already inside the gap
  return (
    <RigidBody ref={body} colliders="cuboid" position={pos} rotation={shard.rot}>
      <mesh>
        <boxGeometry args={[shard.w * cover, shard.h * cover, 0.12 * cover]} />
        <meshBasicMaterial map={texture} color={shard.tint} side={THREE.DoubleSide} />
      </mesh>
    </RigidBody>
  )
}

function useShards() {
  return useMemo(() => {
    const out = []
    const cols = 12
    const rows = 8
    const w = FIELD_W
    const h = FIELD_H
    const cell = w / cols
    const rowH = h / rows
    const dust = new THREE.Color(PALETTE.dust)
    const bone = new THREE.Color(PALETTE.bone)
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const jx = (Math.random() - 0.5) * cell * 0.7
        const jy = (Math.random() - 0.5) * rowH * 0.7
        const x = -w / 2 + (i + 0.5) * cell + jx
        const y = -h / 2 + (j + 0.5) * rowH + jy
        const dist = Math.hypot(x, y)
        // organic fracture: mostly mid chunks, a few big slabs + small chips
        const roll = Math.random()
        const size = roll > 0.85 ? 1.5 : roll < 0.2 ? 0.55 : 0.95
        // warm tonal variation + cut-paper depth; warmer/lighter toward centre
        const warm = bone.clone().lerp(dust, Math.random() * 0.6)
        const v = 1.05 + Math.random() * 0.3 - dist * 0.02
        const c = warm.multiplyScalar(THREE.MathUtils.clamp(v, 0.65, 1.3))
        out.push({
          pos: [x, y, (Math.random() - 0.5) * 0.22], // deeper z spread = layered paper
          rot: [0, 0, (Math.random() - 0.5) * 0.26],
          w: cell * size * (0.8 + Math.random() * 0.4),
          h: rowH * size * (0.8 + Math.random() * 0.4),
          dist,
          seed: Math.random() * 100,
          tint: `#${c.getHexString()}`,
        })
      }
    }
    return out
  }, [])
}

export function useConcreteTexture() {
  return useMemo(() => paintedConcrete(), [])
}
