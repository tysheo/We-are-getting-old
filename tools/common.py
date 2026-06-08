"""Shared helpers for the harvest pipeline.

Everything writes into ../public: image bytes go under public/assets/<section>/,
and each script merges its results into public/manifest.json (the single source
of truth the app reads) and appends per-asset provenance to public/CREDITS.json.

Re-running a harvester regenerates that section -> the piece "reshuffles".
"""
from __future__ import annotations

import io
import json
import os
import time
from pathlib import Path

import requests

try:
    from dotenv import load_dotenv
except ImportError:  # dotenv optional
    load_dotenv = None

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "public" / "assets"
MANIFEST = ROOT / "public" / "manifest.json"
CREDITS = ROOT / "public" / "CREDITS.json"

if load_dotenv:
    load_dotenv(ROOT / ".env")

PER_THEME = int(os.environ.get("PER_THEME", "12"))

# Wikimedia (and good API etiquette generally) requires a descriptive
# User-Agent with a real contact. https://meta.wikimedia.org/wiki/User-Agent_policy
_UA = {
    "User-Agent": "close-to-you/0.1 (art project; contact tyronoldroyd@gmail.com) python-requests"
}

# polite throttle: minimum seconds between any two network requests, so we stop
# tripping Wikimedia's 429 rate limiter.
_MIN_INTERVAL = 0.4
_last_req = [0.0]


def _throttle():
    import time as _t

    dt = _t.time() - _last_req[0]
    if dt < _MIN_INTERVAL:
        _t.sleep(_MIN_INTERVAL - dt)
    _last_req[0] = _t.time()


def env(name: str) -> str | None:
    v = os.environ.get(name)
    return v.strip() if v else None


def session() -> requests.Session:
    s = requests.Session()
    s.headers.update(_UA)
    return s


def get_json(s: requests.Session, url: str, **kw):
    for attempt in range(4):
        try:
            _throttle()
            r = s.get(url, timeout=30, **kw)
            if r.status_code == 429:  # rate limited -> back off harder
                time.sleep(2 ** attempt + 1)
                continue
            r.raise_for_status()
            return r.json()
        except requests.RequestException as e:
            if attempt == 3:
                print(f"  ! request failed: {url[:80]} ({e})")
                return None
            time.sleep(1.5 * (attempt + 1))
    return None


def download(s: requests.Session, url: str) -> bytes | None:
    for attempt in range(3):
        try:
            _throttle()
            r = s.get(url, timeout=60)
            if r.status_code == 429:
                time.sleep(2 ** attempt + 1)
                continue
            r.raise_for_status()
            return r.content
        except requests.RequestException as e:
            if attempt == 2:
                print(f"  ! download failed: {url[:80]} ({e})")
                return None
            time.sleep(1.5)
    return None


# --- image saving + dedupe -------------------------------------------------

_seen_hashes: set = set()


def _load_seen(section: str):
    """Seed the dedupe set from whatever is already on disk for this section."""
    from PIL import Image
    import imagehash

    folder = ASSETS / section
    if not folder.exists():
        return
    for p in folder.glob("**/*"):
        if p.suffix.lower() in {".webp", ".jpg", ".jpeg", ".png"}:
            try:
                _seen_hashes.add(str(imagehash.phash(Image.open(p))))
            except Exception:
                pass


def save_image(data: bytes, out: Path, max_size: int = 2048, dedupe: bool = True) -> bool:
    """Downscale to <= max_size, convert to webp, skip perceptual duplicates.

    Returns True if written, False if a duplicate/failed.
    """
    from PIL import Image
    import imagehash

    try:
        img = Image.open(io.BytesIO(data)).convert("RGB")
    except Exception:
        return False
    if dedupe:
        h = str(imagehash.phash(img))
        if h in _seen_hashes:
            return False
        _seen_hashes.add(h)
    img.thumbnail((max_size, max_size), Image.LANCZOS)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "WEBP", quality=82, method=4)
    return True


# --- manifest + credits ----------------------------------------------------

def _read(path: Path, default):
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            pass
    return default


def set_section(key: str, value):
    """Replace one top-level key of the manifest (e.g. 'archive', 'faces')."""
    m = _read(MANIFEST, {})
    m[key] = value
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(m, indent=2), encoding="utf-8")


def add_credits(entries: list[dict]):
    """Append provenance: {src, source, title, license, url}."""
    c = _read(CREDITS, [])
    c.extend(entries)
    CREDITS.parent.mkdir(parents=True, exist_ok=True)
    CREDITS.write_text(json.dumps(c, indent=2), encoding="utf-8")


# web path the app uses (relative to public/)
def web_path(out: Path) -> str:
    return "/" + out.relative_to(ROOT / "public").as_posix()


# Emotional vocabulary that curates the archive.
THEMES = [
    "hands", "bedsheet", "window light", "water", "hair", "skin",
    "letter handwriting", "domestic interior", "shadow", "old photograph portrait",
]

prime_dedupe = _load_seen
