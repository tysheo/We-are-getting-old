# close to you

An interactive web artwork — a small ritual, not a website. The viewer pulls a
flower out of sealed concrete, enters it, travels an emotional image-archive,
watches two bodies age 0→100, then watches them dissolve into water as the
phrase **close to you** resolves out of found image-fragments.

> **pull → rupture → bloom → memory tunnel → aging → dissolve → message**

The defining idea: **the piece assembles its own memory from public archives.**
Nothing is hand-picked. A Python pipeline harvests imagery from museum/PD and
stock APIs, aligns found faces by age, and even finds the letters of the final
message hidden inside the photographs. Re-running the pipeline *reshuffles* the
whole piece.

## Run the app

```bash
npm install
npm run dev
```

It runs immediately on **procedural placeholders** — no assets required. Walk
the acts:

- **Act 1 — pull:** grab the flower head and drag up. The ground resists; let go
  early and it slips back; pull past the threshold and the concrete shatters.
- **Act 2 — bloom:** click the flower to open it.
- **Act 3 — tunnel:** the camera flies through the floating archive; move the
  mouse to make planes yaw.
- **Act 4 — aging:** scroll to scrub both faces 0→100 (cuts, not a morph).
- **Act 5 — dissolve:** the faces bleed into water and "close to you" assembles.

Dev keys: `d` toggles a HUD, `r` resets the ritual.

## Harvest real assets

```bash
pip install -r tools/requirements.txt
cp .env.example .env          # add whatever API keys you have (all optional)

python tools/harvest_archive.py                 # tunnel + collage imagery
python tools/harvest_faces.py --input data/UTKFace   # aligned aging stacks
python tools/find_letters.py                    # glyphs hidden in the archive
python tools/fetch_textures.py                  # CC0 concrete / water maps
python tools/build_manifest.py                  # finalise + report
```

Each script writes into `public/assets/`, merges its section into
`public/manifest.json` (the single source of truth the app reads), and records
provenance + license per asset in `public/CREDITS.json`. The app picks up real
assets automatically when the manifest is non-empty.

Sources used (keyless ones work out of the box): **The Met**, **Wikimedia
Commons**, **Poly Haven** (CC0); **Unsplash**, **Pexels**, **Pixabay**,
**Smithsonian**, **Europeana**, **Rijksmuseum** (need a free key). Faces expect
an age-labelled dataset such as **UTKFace** (`<age>_<gender>_…jpg`).

## Stack

Vite · React 19 · @react-three/fiber + drei · @react-three/rapier (Act 1
physics) · GSAP (act choreography) · Zustand (the act state machine) · custom
GLSL (dissolve + water). See `.claude/plans/` for the full design.

## Layout

```
src/
  Experience.jsx        # mounts one act at a time (the state machine)
  acts/Act1..Act5       # the five movements
  components/           # Flower, ConcreteField, ImagePlane, WaterSurface, Overlay
  physics/springChain   # spring + verlet chain for the pull
  shaders/              # dissolve.glsl, water.glsl
  lib/                  # manifest loader + procedural fallbacks
tools/                  # the Python harvest pipeline
```
