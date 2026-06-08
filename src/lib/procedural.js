import * as THREE from 'three'

// Procedural stand-ins so the whole ritual runs end-to-end before any assets
// are harvested. Everything here is replaced by real found imagery once
// tools/ has populated public/assets + manifest.json.

// Tiny deterministic PRNG so a given seed always yields the same placeholder.
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function canvas(w = 256, h = w) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

// add a faint film grain to any 2d context (painterly tooth)
function grain(g, w, h, amount = 0.05, seed = 11) {
  const r = mulberry32(seed)
  g.save()
  for (let i = 0; i < w * h * 0.12; i++) {
    const v = Math.floor(r() * 255)
    g.fillStyle = `rgba(${v},${v},${v},${amount * r()})`
    g.fillRect(r() * w, r() * h, 1, 1)
  }
  g.restore()
}

function tex(c) {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

// Mottled concrete surface.
export function makeConcreteTexture(size = 512) {
  const c = canvas(size)
  const g = c.getContext('2d')
  g.fillStyle = '#3b3a36'
  g.fillRect(0, 0, size, size)
  const r = mulberry32(7)
  for (let i = 0; i < size * 24; i++) {
    const x = r() * size
    const y = r() * size
    const v = 40 + r() * 70
    const a = 0.04 + r() * 0.06
    g.fillStyle = `rgba(${v},${v},${v - 4},${a})`
    g.fillRect(x, y, 1 + r() * 2, 1 + r() * 2)
  }
  return tex(c)
}

// A muted, archive-flavoured colour field standing in for a found photograph.
export function makeArchivePlaceholder(seed = 1) {
  const c = canvas(256)
  const g = c.getContext('2d')
  const r = mulberry32(seed * 2654435761)
  const hue = 20 + r() * 40 // warm, aged palette
  const l1 = 25 + r() * 20
  const l2 = 45 + r() * 25
  const grad = g.createLinearGradient(0, 0, 256, 256)
  grad.addColorStop(0, `hsl(${hue}, 18%, ${l1}%)`)
  grad.addColorStop(1, `hsl(${hue + 15}, 22%, ${l2}%)`)
  g.fillStyle = grad
  g.fillRect(0, 0, 256, 256)
  // a soft floating form so planes read as "something half-seen"
  g.globalAlpha = 0.25
  g.fillStyle = `hsl(${hue + 30}, 30%, ${l2 + 12}%)`
  g.beginPath()
  g.ellipse(60 + r() * 130, 60 + r() * 130, 30 + r() * 50, 40 + r() * 60, r() * 6, 0, Math.PI * 2)
  g.fill()
  g.globalAlpha = 0.08
  for (let i = 0; i < 400; i++) g.fillRect(r() * 256, r() * 256, 1, 1) // grain
  return tex(c)
}

// A face stand-in that visibly "ages" with the age param (0..100): the warm
// tone cools and darkens, a couple of features drift. Eyes/mouth stay locked
// to fixed positions to mimic the harvest's alignment.
export function makeFacePlaceholder(sex = 'male', age = 0) {
  const c = canvas(256)
  const g = c.getContext('2d')
  const t = Math.min(1, Math.max(0, age / 100))
  const base = sex === 'female' ? 18 : 28
  g.fillStyle = `hsl(${base}, ${28 - t * 18}%, ${64 - t * 34}%)`
  g.fillRect(0, 0, 256, 256)
  // head
  g.fillStyle = `hsl(${base}, ${24 - t * 14}%, ${58 - t * 30}%)`
  g.beginPath()
  g.ellipse(128, 132, 78, 96, 0, 0, Math.PI * 2)
  g.fill()
  // eyes — pinned (this is the "jump-matched" anchor)
  g.fillStyle = `rgba(20,18,16,${0.85})`
  g.beginPath(); g.ellipse(100, 116, 9, 5 + t * 1.5, 0, 0, Math.PI * 2); g.fill()
  g.beginPath(); g.ellipse(156, 116, 9, 5 + t * 1.5, 0, 0, Math.PI * 2); g.fill()
  // mouth — pinned
  g.strokeStyle = `rgba(60,30,30,${0.6})`
  g.lineWidth = 2 + t * 2
  g.beginPath(); g.moveTo(108, 168); g.quadraticCurveTo(128, 172 + t * 4, 148, 168); g.stroke()
  // aging lines that grow with t
  g.strokeStyle = `rgba(0,0,0,${0.06 + t * 0.18})`
  g.lineWidth = 1
  for (let i = 0; i < Math.floor(t * 14); i++) {
    const y = 90 + (i / 14) * 90
    g.beginPath(); g.moveTo(70, y); g.bezierCurveTo(110, y - 3, 150, y + 3, 186, y); g.stroke()
  }
  return tex(c)
}

// A single letter rendered as found typography (placeholder for a glyph cut
// out of a real photograph).
export function makeLetterPlaceholder(char = 'o') {
  const c = canvas(128)
  const g = c.getContext('2d')
  g.clearRect(0, 0, 128, 128)
  g.fillStyle = 'rgba(235,230,222,0.92)'
  g.font = '96px "Times New Roman", serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(char, 64, 70)
  const t = tex(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// --- painterly 2.5D sprites ------------------------------------------------
// All return soft, alpha-feathered textures meant for flat planes (SoftSprite).

// A soft glowing dot — dust motes, the flower's heart, light blooms.
export function makeSoftCircle(hex = '#ffffff') {
  const c = canvas(128)
  const g = c.getContext('2d')
  const col = new THREE.Color(hex)
  const r = Math.round(col.r * 255), gg = Math.round(col.g * 255), b = Math.round(col.b * 255)
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, `rgba(${r},${gg},${b},1)`)
  grad.addColorStop(0.4, `rgba(${r},${gg},${b},0.55)`)
  grad.addColorStop(1, `rgba(${r},${gg},${b},0)`)
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  return tex(c)
}

// A painted petal: a soft teardrop with a glowing core, feathered to nothing.
export function paintedPetal(hex = '#f2e3d0', core = '#d98f86', seed = 1) {
  const W = 128, H = 200
  const c = canvas(W, H)
  const g = c.getContext('2d')
  const base = new THREE.Color(hex)
  const glow = new THREE.Color(core)
  g.translate(W / 2, H)
  // build the teardrop with several soft, slightly offset fills for paint feel
  const r = mulberry32(seed)
  for (let pass = 0; pass < 4; pass++) {
    const k = 1 - pass * 0.12
    const grad = g.createLinearGradient(0, 0, 0, -H)
    grad.addColorStop(0, `rgba(${glow.r * 255},${glow.g * 255},${glow.b * 255},${0.22})`)
    grad.addColorStop(0.55, `rgba(${base.r * 255},${base.g * 255},${base.b * 255},${0.5})`)
    grad.addColorStop(1, `rgba(${base.r * 255},${base.g * 255},${base.b * 255},0)`)
    g.fillStyle = grad
    g.beginPath()
    g.moveTo(0, 0)
    g.bezierCurveTo(46 * k, -46, 30 * k, -176, (r() - 0.5) * 8, -190 * k)
    g.bezierCurveTo(-30 * k, -176, -46 * k, -46, 0, 0)
    g.fill()
  }
  grain(g, W, H, 0.04, seed + 3)
  return tex(c)
}

// A soft vertical stem stripe, fading at both ends.
export function paintedStem(hex = '#5a6b3b') {
  const W = 48, H = 256
  const c = canvas(W, H)
  const g = c.getContext('2d')
  const col = new THREE.Color(hex)
  const cx = `${col.r * 255},${col.g * 255},${col.b * 255}`
  const grad = g.createLinearGradient(0, 0, W, 0)
  grad.addColorStop(0, `rgba(${cx},0)`)
  grad.addColorStop(0.5, `rgba(${cx},0.85)`)
  grad.addColorStop(1, `rgba(${cx},0)`)
  g.fillStyle = grad
  g.fillRect(0, 0, W, H)
  // fade the very top so it reads as growing
  const v = g.createLinearGradient(0, 0, 0, H)
  v.addColorStop(0, 'rgba(0,0,0,0.5)')
  v.addColorStop(0.15, 'rgba(0,0,0,0)')
  g.globalCompositeOperation = 'destination-out'
  g.fillStyle = v
  g.fillRect(0, 0, W, H)
  return tex(c)
}

// Warm, mottled painted concrete with faint cracks.
export function paintedConcrete(size = 512, seed = 7) {
  const c = canvas(size)
  const g = c.getContext('2d')
  g.fillStyle = '#4a443c'
  g.fillRect(0, 0, size, size)
  const r = mulberry32(seed)
  // soft mottle
  for (let i = 0; i < 60; i++) {
    const x = r() * size, y = r() * size, rad = 30 + r() * 120
    const v = 50 + r() * 60
    const grad = g.createRadialGradient(x, y, 0, x, y, rad)
    grad.addColorStop(0, `rgba(${v},${v - 4},${v - 10},${0.06 + r() * 0.06})`)
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, size, size)
  }
  // hairline cracks
  g.strokeStyle = 'rgba(20,18,16,0.35)'
  for (let i = 0; i < 7; i++) {
    g.lineWidth = 0.5 + r() * 1.5
    g.beginPath()
    let x = r() * size, y = r() * size
    g.moveTo(x, y)
    for (let s = 0; s < 6; s++) {
      x += (r() - 0.5) * 120
      y += (r() - 0.5) * 120
      g.lineTo(x, y)
    }
    g.stroke()
  }
  grain(g, size, size, 0.05, seed + 1)
  return tex(c)
}

// A vertical gradient backdrop (atmospheric sky/ground).
export function makeGradientBackdrop(top = '#1a1712', bottom = '#0a0908') {
  const c = canvas(16, 256)
  const g = c.getContext('2d')
  const grad = g.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, top)
  grad.addColorStop(1, bottom)
  g.fillStyle = grad
  g.fillRect(0, 0, 16, 256)
  return tex(c)
}

// A wide soft haze blob for atmospheric depth bands.
export function makeHaze(hex = '#2a2520') {
  return makeSoftCircle(hex)
}
