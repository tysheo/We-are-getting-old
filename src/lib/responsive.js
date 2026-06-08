import { useThree } from '@react-three/fiber'

// World units visible at a given depth in front of a perspective camera.
// Lets full-bleed elements cover the screen at any window size / aspect ratio.
export function visibleSizeAt(camera, z = 0) {
  const dist = Math.abs(camera.position.z - z)
  const vFov = (camera.fov * Math.PI) / 180
  const height = 2 * Math.tan(vFov / 2) * dist
  return { width: height * camera.aspect, height }
}

// Scale factor so a `designW x designH` layout COVERS the viewport at depth z
// (fills the frame, cropping the overflow). Use for backgrounds / the ground.
export function useCoverScale(designW, designH, z = 0, margin = 1.06) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size) // re-runs on resize
  const { width, height } = visibleSizeAt(camera, z)
  void size
  return Math.max(width / designW, height / designH) * margin
}

// Scale factor so a layout CONTAINS within the viewport (fits, letterboxing).
// Use for subjects you never want cropped (e.g. the two faces).
export function useContainScale(designW, designH, z = 0, margin = 0.92) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const { width, height } = visibleSizeAt(camera, z)
  void size
  return Math.min(width / designW, height / designH) * margin
}
