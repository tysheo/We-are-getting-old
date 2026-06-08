import { useMemo, useRef, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { visibleSizeAt } from '../lib/responsive.js'
import { PALETTE } from '../lib/palette.js'

// A full-frame fade plane that sits just in front of the camera. Used to ease
// scene changes (e.g. the faces "coming in" from black) instead of a hard cut.
export default function Veil({ duration = 1.6, delay = 0, from = 1, to = 0, color = PALETTE.void }) {
  const mat = useRef()
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)

  // size to cover the frame at a plane 1 unit in front of the camera
  const { z, w, h } = useMemo(() => {
    const planeZ = camera.position.z - 1
    const v = visibleSizeAt(camera, planeZ)
    return { z: planeZ, w: v.width * 1.3, h: v.height * 1.3 }
  }, [camera, size])

  useEffect(() => {
    if (!mat.current) return
    mat.current.opacity = from
    const tw = gsap.to(mat.current, { opacity: to, duration, delay, ease: 'power2.inOut' })
    return () => tw.kill()
  }, [duration, delay, from, to])

  return (
    <mesh position={[camera.position.x, camera.position.y, z]} renderOrder={999}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial
        ref={mat}
        color={color}
        transparent
        opacity={from}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}
