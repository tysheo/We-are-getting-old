import { useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useManifest } from '../lib/manifest.js'
import { makeFacePlaceholder } from '../lib/procedural.js'
import { SoftPlane } from '../materials/SoftSprite.jsx'
import Atmosphere from '../components/Atmosphere.jsx'
import Veil from '../components/Veil.jsx'
import gsap from 'gsap'
import { PALETTE } from '../lib/palette.js'
import { useStore } from '../store.js'

// Scroll scrubs both faces 0->100. Time is told by the scroll alone (no age
// marker). Rather than hard cuts, the scroll position continuously crossfades
// through a preloaded sequence of real found faces (sorted by age) — a smooth
// aging morph where the people themselves keep changing.
const SEQ = 64 // faces sampled per sex for the sequence

export default function Act4_Aging() {
  const { manifest, hasAssets } = useManifest()
  const setAgeProgress = useStore((s) => s.setAgeProgress)
  const advanceAct = useStore((s) => s.advanceAct)
  const { camera } = useThree()

  const raw = useRef(0) // scroll target 0..1
  const smooth = useRef(0) // eased 0..1 (read by the face sequences)
  const done = useRef(false)
  const [exiting, setExiting] = useState(false)
  const entrance = useRef({ v: 0 })

  useEffect(() => {
    camera.position.set(0, 0, 6)
    camera.lookAt(0, 0, 0)
    const tw = gsap.to(entrance.current, { v: 1, duration: 2.6, ease: 'power2.out' })
    return () => tw.kill()
  }, [camera])

  // smoothed virtual scroll input
  useEffect(() => {
    const onWheel = (e) => {
      raw.current = THREE.MathUtils.clamp(raw.current + e.deltaY * 0.0005, 0, 1)
    }
    let lastY = null
    const onTouch = (e) => {
      const y = e.touches[0].clientY
      if (lastY != null) raw.current = THREE.MathUtils.clamp(raw.current + (lastY - y) * 0.0018, 0, 1)
      lastY = y
    }
    const onTouchEnd = () => (lastY = null)
    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchmove', onTouch)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  useFrame(() => {
    smooth.current += (raw.current - smooth.current) * 0.06
    setAgeProgress(smooth.current)
    if (smooth.current > 0.985 && !done.current) {
      done.current = true
      setExiting(true) // fade-out veil...
      setTimeout(() => advanceAct(), 1500) // ...then into Act 5 (matches veil)
    }
  })

  return (
    <group>
      <Atmosphere backdropZ={-8} haze={3} dust={90} />

      <Suspense fallback={null}>
        <FaceSequence sex="male" pos={[-1.5, 0, 0]} ageRef={smooth} entrance={entrance} manifest={manifest} hasAssets={hasAssets} />
        <FaceSequence sex="female" pos={[1.5, 0, 0]} ageRef={smooth} entrance={entrance} manifest={manifest} hasAssets={hasAssets} />
      </Suspense>

      {/* ease in from black; on exit fade to black then advance */}
      <Veil duration={2.2} />
      {exiting && <Veil from={0} to={1} duration={1.6} />}
    </group>
  )
}

// pick which sequence renderer to use (hooks can't be conditional)
function FaceSequence(props) {
  return props.hasAssets && props.manifest.faces?.[props.sex]?.length
    ? <FaceSeqURL {...props} />
    : <FaceSeqProc {...props} />
}

function FaceSeqURL({ sex, pos, ageRef, entrance, manifest }) {
  const urls = useMemo(() => sample(manifest.faces[sex].map((f) => f.src), SEQ), [manifest, sex])
  const texs = useTexture(urls) // preloaded -> no pop/flash during the morph
  const arr = Array.isArray(texs) ? texs : [texs]
  return <CrossFaces texs={arr} pos={pos} ageRef={ageRef} entrance={entrance} />
}

function FaceSeqProc({ sex, pos, ageRef, entrance }) {
  const texs = useMemo(
    () => Array.from({ length: 24 }, (_, i) => makeFacePlaceholder(sex, (i / 23) * 100)),
    [sex]
  )
  return <CrossFaces texs={texs} pos={pos} ageRef={ageRef} entrance={entrance} />
}

// two stacked planes that crossfade as the age position moves through the list
function CrossFaces({ texs, pos, ageRef, entrance }) {
  const a = useRef()
  const b = useRef()
  const n = texs.length
  useFrame((state) => {
    const p = THREE.MathUtils.clamp(ageRef.current, 0, 1)
    const idx = p * (n - 1)
    const lo = Math.floor(idx)
    const hi = Math.min(lo + 1, n - 1)
    const f = idx - lo
    const v = entrance?.current.v ?? 1
    const px = pos[0] + state.pointer.x * 0.1 * Math.sign(pos[0] || 1)
    const py = pos[1] + state.pointer.y * 0.05
    const pz = pos[2] - (1 - v) * 2.2
    for (const [ref, tex, op] of [[a, texs[lo], 1 - f], [b, texs[hi], f]]) {
      const m = ref.current
      if (!m) continue
      m.position.set(px, py, pz)
      m.scale.setScalar(0.9 + v * 0.1)
      if (m.material?.uniforms) {
        m.material.uniforms.map.value = tex
        m.material.uniforms.uHasMap.value = 1
        m.material.uniforms.uOpacity.value = op * v
      }
    }
  })
  const common = { width: 2.4, height: 3, feather: 0.3, desaturate: 0.28, tint: PALETTE.bone }
  return (
    <>
      <SoftPlane ref={a} map={texs[0]} position={pos} {...common} />
      <SoftPlane ref={b} map={texs[Math.min(1, n - 1)]} position={pos} {...common} />
    </>
  )
}

// evenly sample up to `k` items across an array (keeps the age spread)
function sample(arr, k) {
  if (arr.length <= k) return arr
  const out = []
  for (let i = 0; i < k; i++) out.push(arr[Math.round((i / (k - 1)) * (arr.length - 1))])
  return out
}
