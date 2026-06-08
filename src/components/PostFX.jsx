import {
  EffectComposer,
  Bloom,
  DepthOfField,
  Noise,
  Vignette,
  ChromaticAberration,
  HueSaturation,
  BrightnessContrast,
} from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'

// The painterly / dreamlike grade, applied once over the whole scene. Bloom +
// DOF do the "soft focus", grain + vignette + desaturation do the "film".
// Tuned conservatively for the RTX 3050 — dial here if perf dips.
export default function PostFX() {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {/* depth separation: hero layer crisp, near/far melt away */}
      <DepthOfField
        focusDistance={0.025}
        focalLength={0.02}
        bokehScale={2.0}
        height={480}
      />
      {/* glow — low threshold so soft lights bloom, mipmapBlur for a wide halo */}
      <Bloom
        intensity={0.95}
        luminanceThreshold={0.2}
        luminanceSmoothing={0.4}
        mipmapBlur
        radius={0.75}
      />
      {/* muted film grade */}
      <HueSaturation saturation={-0.28} hue={0.0} />
      <BrightnessContrast brightness={-0.02} contrast={0.1} />
      {/* faint colour-fringe on edges */}
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={new THREE.Vector2(0.0006, 0.0006)}
        radialModulation={false}
      />
      {/* film grain */}
      <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.05} />
      <Vignette eskil={false} offset={0.3} darkness={0.7} />
    </EffectComposer>
  )
}
