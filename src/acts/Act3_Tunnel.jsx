import { useMemo, useRef, useState, Suspense } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import * as THREE from 'three'
import Flower from '../components/Flower.jsx'
import Atmosphere from '../components/Atmosphere.jsx'
import Veil from '../components/Veil.jsx'
import { ImagePlaneURL, ImagePlaneTex } from '../components/ImagePlane.jsx'
import { useManifest } from '../lib/manifest.js'
import { makeArchivePlaceholder } from '../lib/procedural.js'
import { useStore } from '../store.js'

const COUNT = 56 // ~40-80 planes per the plan
const DEPTH = 80 // how far the archive stretches in -z

export default function Act3_Tunnel() {
  const { manifest, hasAssets } = useManifest()
  const advanceAct = useStore((s) => s.advanceAct)
  const { camera } = useThree()
  const started = useRef(false)
  const flowerZ = useRef(-DEPTH - 4)
  const [exiting, setExiting] = useState(false)

  // lay out the planes in a loose spiral down the -z corridor
  const planes = useMemo(() => {
    const arr = []
    for (let i = 0; i < COUNT; i++) {
      const z = -2 - (i / COUNT) * DEPTH
      const a = i * 2.399 // golden angle -> non-repeating scatter
      const r = 1.6 + (i % 5) * 0.5
      arr.push({
        pos: [Math.cos(a) * r, Math.sin(a) * r * 0.7, z],
        scale: 1.1 + (i % 4) * 0.5,
        opacity: 0.85,
        baseRotY: (Math.random() - 0.5) * 0.5,
        seed: Math.random() * 100,
        billboard: i % 3 === 0,
        src: hasAssets ? manifest.archive[i % manifest.archive.length]?.src : null,
      })
    }
    return arr
  }, [hasAssets, manifest])

  // procedural fallbacks, memoised
  const placeholders = useMemo(
    () => planes.map((_, i) => makeArchivePlaceholder(i + 1)),
    [planes.length]
  )

  // camera flythrough: continue from wherever Act 2 left the camera (no cut),
  // settle to centre, dolly forward, then arc back down onto the flower
  useFrame((state, dt) => {
    if (!started.current) {
      started.current = true
      const tl = gsap.timeline({ onComplete: () => advanceAct() })
      // ease the off-centre dolly-out back to centre as we enter the corridor
      tl.to(camera.position, { x: 0, y: 0, duration: 1.4, ease: 'sine.inOut' }, 0)
      tl.to(camera.position, { z: -DEPTH + 2, duration: 11, ease: 'power1.inOut' }, 0)
      // arc down onto the flower at the end
      tl.to(camera.position, { y: 3, z: -DEPTH - 1, duration: 2.4, ease: 'power2.in' }, '-=1.5')
      // start fading to black ~1.6s before the end so Act 4 arrives smoothly
      tl.call(() => setExiting(true), null, '>-1.6')
    }
    // always look slightly ahead / down toward the guide flower
    camera.lookAt(0, flowerZ.current > camera.position.z ? -1 : 0, camera.position.z - 6)
  })

  return (
    <group>
      <Atmosphere backdrop={false} haze={0} dust={220} dustBox={[26, 18, 170]} />
      <fog attach="fog" args={['#0c0b0d', 6, 64]} />

      <Suspense fallback={null}>
        {planes.map((p, i) =>
          p.src ? (
            <ImagePlaneURL key={i} url={p.src} data={p} billboard={p.billboard} />
          ) : (
            <ImagePlaneTex key={i} texture={placeholders[i]} data={p} billboard={p.billboard} />
          )
        )}
      </Suspense>

      {/* guide flower waiting at the end of the corridor */}
      <Flower position={[0, -1.4, -DEPTH - 4]} pull={1} openness={0.2} tremble={0.3} />

      {exiting && <Veil from={0} to={1} duration={1.7} />}
    </group>
  )
}
