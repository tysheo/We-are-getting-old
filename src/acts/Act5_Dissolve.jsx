import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import * as THREE from 'three'
import WaterSurface from '../components/WaterSurface.jsx'
import Atmosphere from '../components/Atmosphere.jsx'
import Veil from '../components/Veil.jsx'
import { SoftPlane } from '../materials/SoftSprite.jsx'
import { makeFacePlaceholder, makeLetterPlaceholder } from '../lib/procedural.js'
import { PALETTE } from '../lib/palette.js'
import { useContainScale } from '../lib/responsive.js'
import { useManifest } from '../lib/manifest.js'
import dissolveFrag from '../shaders/dissolve.glsl?raw'

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main(){
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const WORD = 'close to you'

// Faces destabilise -> dissolve into water -> a puddle fills the space ->
// letter fragments drift in and align into "close to you". The message is
// assembled from found pieces, never typed.
export default function Act5_Dissolve() {
  const { camera } = useThree()
  const { manifest, hasAssets } = useManifest()
  const faceProg = useRef({ v: 0 })
  const waterOp = useRef({ v: 0 })
  const [, force] = useState(0)

  useEffect(() => {
    camera.position.set(0, 1.5, 6)
    camera.lookAt(0, 0, 0)
    const tl = gsap.timeline()
    tl.to(faceProg.current, { v: 1, duration: 3.2, ease: 'power1.in' })
    tl.to(camera.position, { y: 0.6, z: 5, duration: 3.2, ease: 'power2.inOut' }, 0)
    tl.to(waterOp.current, { v: 1, duration: 2.2, ease: 'power1.out' }, '-=1.6')
    return () => tl.kill()
  }, [camera])

  useFrame(() => force((n) => (n + 1) % 1000))

  return (
    <group>
      <Atmosphere backdropZ={-8} haze={2} dust={80} />
      <DissolveFace sex="male" pos={[-1.5, 0.4, 0]} progress={faceProg.current} />
      <DissolveFace sex="female" pos={[1.5, 0.4, 0]} progress={faceProg.current} />

      <WaterSurface position={[0, -1.3, 1]} opacity={waterOp.current.v} />

      <Letters word={WORD} reveal={waterOp.current.v} manifest={manifest} hasAssets={hasAssets} />

      {/* arrive from black (continues Act 4's fade-out) */}
      <Veil duration={2.4} />
    </group>
  )
}

function DissolveFace({ sex, pos, progress }) {
  const mat = useRef()
  const tex = useMemo(() => makeFacePlaceholder(sex, 100), [sex])
  const uniforms = useMemo(
    () => ({ uTex: { value: tex }, uProgress: { value: 0 }, uTime: { value: 0 } }),
    [tex]
  )
  useFrame((state) => {
    if (mat.current) {
      mat.current.uniforms.uProgress.value = progress.v
      mat.current.uniforms.uTime.value = state.clock.elapsedTime
    }
  })
  return (
    <mesh position={pos}>
      <planeGeometry args={[2.4, 3, 1, 1]} />
      <shaderMaterial
        ref={mat}
        vertexShader={VERT}
        fragmentShader={dissolveFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}

const LETTER_Z = 1.4
const SPACING = 0.4
const LETTER_SIZE = 0.46

function Letters({ word, reveal, manifest, hasAssets }) {
  // build target layout: letters spread along x, gaps for spaces
  const letters = useMemo(() => {
    const chars = word.split('')
    const totalW = (chars.length - 1) * SPACING
    return chars
      .map((ch, i) => ({ ch, i }))
      .filter((c) => c.ch !== ' ')
      .map((c) => ({
        ch: c.ch,
        target: [-totalW / 2 + c.i * SPACING, -1.0, LETTER_Z],
        start: [
          (Math.random() - 0.5) * 8,
          -1.2 + (Math.random() - 0.5) * 1.5,
          1 + Math.random() * 2,
        ],
        rot: (Math.random() - 0.5) * Math.PI,
        tex: hasAssets
          ? manifest.letters.find((l) => l.char === c.ch)?.src || null
          : null,
      }))
  }, [word, hasAssets, manifest])

  // scale the whole phrase so it always fits the frame width (was overflowing)
  const designW = (word.length - 1) * SPACING + LETTER_SIZE
  const fit = useContainScale(designW, LETTER_SIZE, LETTER_Z, 0.82)

  return (
    <group scale={Math.min(fit, 1)}>
      {letters.map((l, i) => (
        <Letter key={i} data={l} reveal={reveal} delay={i * 0.12} />
      ))}
    </group>
  )
}

function Letter({ data, reveal, delay }) {
  const ref = useRef()
  const started = useRef(false)
  const state = useRef({ x: data.start[0], y: data.start[1], z: data.start[2], rot: data.rot, op: 0 })
  const tex = useMemo(() => makeLetterPlaceholder(data.ch), [data.ch])

  useFrame(() => {
    if (reveal > 0.4 && !started.current) {
      started.current = true
      gsap.to(state.current, {
        x: data.target[0],
        y: data.target[1],
        z: data.target[2],
        rot: 0,
        op: 0.95,
        duration: 2.4,
        delay,
        ease: 'power3.out',
      })
    }
    if (ref.current) {
      ref.current.position.set(state.current.x, state.current.y, state.current.z)
      ref.current.rotation.z = state.current.rot
      const u = ref.current.material?.uniforms?.uOpacity
      if (u) u.value = state.current.op
    }
  })

  return (
    <SoftPlane
      ref={ref}
      map={tex}
      width={LETTER_SIZE}
      height={LETTER_SIZE}
      opacity={0}
      feather={0.12}
      tint={PALETTE.paper}
      side={THREE.DoubleSide}
    />
  )
}
