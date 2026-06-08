import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import waterFrag from '../shaders/water.glsl?raw'

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main(){
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// A quiet puddle. Pass a normal map via `normal` for displacement highlights;
// without one it ripples procedurally.
export default function WaterSurface({ normal = null, opacity = 1, ...props }) {
  const mat = useRef()
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#1b2a2e') },
      uNormal: { value: normal },
      uHasNormal: { value: normal ? 1 : 0 },
      uOpacity: { value: opacity },
    }),
    [normal]
  )
  useFrame((state) => {
    if (mat.current) {
      mat.current.uniforms.uTime.value = state.clock.elapsedTime
      mat.current.uniforms.uOpacity.value = opacity
    }
  })
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} {...props}>
      <planeGeometry args={[14, 14, 1, 1]} />
      <shaderMaterial
        ref={mat}
        vertexShader={VERT}
        fragmentShader={waterFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}
