import { useEffect, useState } from 'react'

// Shape of public/manifest.json produced by tools/build_manifest.py:
// {
//   archive: [{ src, theme, depthHint, w, h }],
//   faces:   { male: [{ src, age }], female: [{ src, age }] },
//   letters: [{ src, char, x, y }],            // x,y are target collage coords 0..1
//   textures:{ concrete, dust, waterNormal, waterDisp }   // src paths
// }

const EMPTY = { archive: [], faces: { male: [], female: [] }, letters: [], textures: {} }

let _cache // module-level memo so we only fetch once

export async function loadManifest() {
  if (_cache) return _cache
  try {
    const res = await fetch('/manifest.json', { cache: 'no-cache' })
    if (!res.ok) throw new Error(`manifest ${res.status}`)
    const data = await res.json()
    _cache = { ...EMPTY, ...data, faces: { ...EMPTY.faces, ...(data.faces || {}) } }
  } catch {
    // No harvest has run yet — the app falls back to procedural placeholders.
    _cache = EMPTY
  }
  return _cache
}

// React hook. `hasAssets` lets each act decide between real assets and the
// procedural stand-ins in lib/procedural.js.
export function useManifest() {
  const [manifest, setManifest] = useState(_cache || EMPTY)
  useEffect(() => {
    let alive = true
    loadManifest().then((m) => alive && setManifest(m))
    return () => {
      alive = false
    }
  }, [])
  const hasAssets = manifest.archive.length > 0
  return { manifest, hasAssets }
}

// Pick the closest available face frame to a target age (0..100).
export function faceForAge(faces, sex, age) {
  const pool = faces?.[sex] || []
  if (pool.length === 0) return null
  let best = pool[0]
  let bestD = Infinity
  for (const f of pool) {
    const d = Math.abs(f.age - age)
    if (d < bestD) {
      bestD = d
      best = f
    }
  }
  return best
}

export { EMPTY }
