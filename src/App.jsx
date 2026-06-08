import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { Suspense, useEffect } from 'react'
import Experience from './Experience.jsx'
import Overlay from './components/Overlay.jsx'
import PostFX from './components/PostFX.jsx'
import { useStore } from './store.js'

export default function App() {
  const toggleDebug = useStore((s) => s.toggleDebug)
  const reset = useStore((s) => s.reset)

  // Dev shortcuts: `d` toggles the HUD, `r` resets the ritual.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'd') toggleDebug()
      if (e.key === 'r') reset()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleDebug, reset])

  return (
    <>
      <Canvas
        dpr={[1, 2]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        camera={{ position: [0, 0, 6], fov: 45, near: 0.1, far: 200 }}
      >
        <color attach="background" args={['#0a0908']} />
        <Suspense fallback={null}>
          <Experience />
        </Suspense>
        <PostFX />
      </Canvas>
      <Overlay />
    </>
  )
}
