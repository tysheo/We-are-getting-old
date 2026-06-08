// Quick start for inserting your own photos — no Python, no API keys.
//
//   1. drop images into  public/photos/
//   2. run               node tools/local_photos.mjs
//   3. reload the app — they flow through the Act 3 archive tunnel (and collage)
//
// Re-run any time you add/remove photos. This only writes the manifest's
// `archive` section; faces/letters/textures (from the Python pipeline) are left
// untouched.
import { readdirSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PHOTOS = join(ROOT, 'public', 'photos')
const MANIFEST = join(ROOT, 'public', 'manifest.json')
const EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'])

if (!existsSync(PHOTOS)) {
  mkdirSync(PHOTOS, { recursive: true })
  console.log('created public/photos/ — drop images in there and re-run.')
  process.exit(0)
}

const files = readdirSync(PHOTOS).filter((f) => EXT.has(f.slice(f.lastIndexOf('.')).toLowerCase()))
if (files.length === 0) {
  console.log('no images in public/photos/ — add some and re-run.')
  process.exit(0)
}

const archive = files.map((f, i) => ({
  src: `/photos/${f}`,
  theme: 'photo',
  depthHint: Math.round(Math.random() * 1000) / 1000,
  source: 'local',
}))

let manifest = {}
if (existsSync(MANIFEST)) {
  try {
    manifest = JSON.parse(readFileSync(MANIFEST, 'utf-8'))
  } catch {
    /* start fresh */
  }
}
manifest.archive = archive
manifest.faces ??= { male: [], female: [] }
manifest.letters ??= []
manifest.textures ??= {}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2))
console.log(`wrote ${archive.length} photo(s) to manifest.archive`)
files.forEach((f) => console.log('  +', f))
