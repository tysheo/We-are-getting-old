import { useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import * as THREE from 'three'
import Flower from '../components/Flower.jsx'
import ConcreteField, { useConcreteTexture } from '../components/ConcreteField.jsx'
import Atmosphere from '../components/Atmosphere.jsx'
import Veil from '../components/Veil.jsx'
import { Spring } from '../physics/springChain.js'
import { useStore } from '../store.js'

const PULL_RANGE = 1.6 // world units of *drag distance* that maps to a full pull
const THRESHOLD = 0.7 // past this on release -> the ground shatters

export default function Act1_Pull() {
  const setPull = useStore((s) => s.setPull)
  const freeFlower = useStore((s) => s.freeFlower)
  const advanceAct = useStore((s) => s.advanceAct)

  const texture = useConcreteTexture()
  const spring = useRef(new Spring({ stiffness: 70, damping: 14 }))
  const drag = useRef({ active: false, startY: 0, startPull: 0, targetY: 0 })
  const [pull, setLocalPull] = useState(0)
  const [shattered, setShattered] = useState(false)
  const { camera } = useThree()

  // release handler lives on the window so you can let go anywhere
  useEffect(() => {
    const onUp = () => {
      if (!drag.current.active) return
      drag.current.active = false
      if (spring.current.value >= THRESHOLD) {
        // committed: snap free and rupture
        spring.current.target = 1
        setShattered(true)
        freeFlower()
        setTimeout(() => advanceAct(), 2600) // let the debris settle, then bloom
      } else {
        // not enough — the flower slips back into the ground
        spring.current.target = 0
      }
    }
    window.addEventListener('pointerup', onUp)
    return () => window.removeEventListener('pointerup', onUp)
  }, [advanceAct, freeFlower])

  useFrame((_, dt) => {
    const s = spring.current
    if (drag.current.active) {
      // map drag distance (from where you grabbed) to pull; resistance comes
      // from the spring lag, not from capping the reachable range
      const delta = drag.current.targetY - drag.current.startY
      s.target = THREE.MathUtils.clamp(drag.current.startPull + delta / PULL_RANGE, 0, 1)
    }
    const v = THREE.MathUtils.clamp(s.step(dt), 0, 1)
    setLocalPull(v)
    setPull(v)
  })

  // invisible plane that reports the pointer's world Y while dragging
  const onMove = (e) => {
    if (!drag.current.active) return
    drag.current.targetY = e.point.y
  }

  return (
    <group>
      <Atmosphere backdropZ={-6} haze={2} dust={120} />

      {/* drag catcher */}
      <mesh visible={false} onPointerMove={onMove} position={[0, 1, 0.5]}>
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial />
      </mesh>

      {/* the flower: grab its head to pull */}
      <group
        onPointerDown={(e) => {
          e.stopPropagation()
          if (shattered) return
          drag.current.active = true
          drag.current.startY = e.point.y
          drag.current.startPull = spring.current.value
          drag.current.targetY = e.point.y
        }}
      >
        <Flower position={[0, -1.4, 0.3]} pull={pull} tremble={drag.current.active ? 0 : 0.4} />
      </group>

      <Physics gravity={[0, -9.8, 0]} paused={!shattered}>
        <ConcreteField pull={pull} shattered={shattered} texture={texture} />
      </Physics>

      {/* the piece opens out of black */}
      <Veil duration={2.2} />
    </group>
  )
}
