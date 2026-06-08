import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import { forwardRef } from 'react'

// The unifying flat-sprite material for the whole painterly look. Unlit. Edges
// feather away so every plane melts into the atmosphere instead of showing a
// hard rectangle. Optional tint + desaturation feed the muted film grade.
const SoftSpriteMaterial = shaderMaterial(
  {
    map: null,
    uOpacity: 1,
    uTint: new THREE.Color('#ffffff'),
    uFeather: 0.25, // fraction of each edge that dissolves
    uDesaturate: 0.0,
    uHasMap: 0,
  },
  /* glsl */ `
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* glsl */ `
    uniform sampler2D map;
    uniform float uOpacity;
    uniform vec3 uTint;
    uniform float uFeather;
    uniform float uDesaturate;
    uniform float uHasMap;
    varying vec2 vUv;

    void main(){
      vec4 tex = uHasMap > 0.5 ? texture2D(map, vUv) : vec4(1.0);
      vec3 rgb = tex.rgb;
      float lum = dot(rgb, vec3(0.299, 0.587, 0.114));
      rgb = mix(rgb, vec3(lum), uDesaturate);
      rgb *= uTint;

      // feather every edge inward so the plane has no hard border
      float f = max(uFeather, 0.001);
      float mx = smoothstep(0.0, f, vUv.x) * smoothstep(0.0, f, 1.0 - vUv.x);
      float my = smoothstep(0.0, f, vUv.y) * smoothstep(0.0, f, 1.0 - vUv.y);
      float edge = mx * my;

      float alpha = tex.a * uOpacity * edge;
      if (alpha < 0.002) discard;
      gl_FragColor = vec4(rgb, alpha);
    }
  `
)

extend({ SoftSpriteMaterial })

// Convenience: a feathered textured plane. Use everywhere a flat 2.5D layer is
// needed (flower petals, archive planes, faces, letters).
export const SoftPlane = forwardRef(function SoftPlane(
  {
    map = null,
    width = 1,
    height = 1,
    opacity = 1,
    tint = '#ffffff',
    feather = 0.25,
    desaturate = 0,
    side = THREE.FrontSide,
    ...props
  },
  ref
) {
  return (
    <mesh ref={ref} {...props}>
      <planeGeometry args={[width, height]} />
      <softSpriteMaterial
        map={map}
        uHasMap={map ? 1 : 0}
        uOpacity={opacity}
        uTint={new THREE.Color(tint)}
        uFeather={feather}
        uDesaturate={desaturate}
        transparent
        depthWrite={false}
        side={side}
      />
    </mesh>
  )
})

export { SoftSpriteMaterial }
