import { useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import Flower from '../components/Flower.jsx'
import Atmosphere from '../components/Atmosphere.jsx'
import { useStore } from '../store.js'

// The flower has settled (at the same transform it ended Act 1 — no jump).
// Clicking opens the bloom AND pulls the camera back and away, beginning the
// flight that carries through the tunnel and swings back onto the faces.
export default function Act2_Bloom() {
  const bloom = useStore((s) => s.bloom)
  const advanceAct = useStore((s) => s.advanceAct)
  const opening = useRef(false)
  const [openness, setOpenness] = useState(0)
  const o = useRef({ v: 0 })
  const { camera } = useThree()

  useFrame(() => setOpenness(o.current.v))

  const onClick = (e) => {
    e.stopPropagation()
    if (opening.current) return
    opening.current = true
    bloom()
    // bloom the petals open
    gsap.to(o.current, { v: 1, duration: 2.2, ease: 'power2.inOut' })
    // and fly the camera up and back away from the flower (Act 3 continues
    // from wherever this leaves the camera — no cut)
    const tl = gsap.timeline({ onComplete: () => advanceAct() })
    tl.to(camera.position, { z: 9.5, y: 1.4, duration: 1.6, ease: 'power2.in' }, 0.5)
    tl.to(camera.position, { x: 0.8, duration: 1.0, ease: 'sine.inOut' }, 0.5)
  }

  return (
    <group>
      <Atmosphere backdropZ={-6} haze={2} dust={120} />

      <group onPointerDown={onClick}>
        <Flower position={[0, -1.4, 0.3]} pull={1} openness={openness} tremble={1 - openness} />
      </group>
    </group>
  )
}
