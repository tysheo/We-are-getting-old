"""Fetch CC0 surface textures from Poly Haven (no key required).

Concrete albedo for Act 1's ground, and a water normal/displacement map for the
Act 5 puddle when available. All Poly Haven assets are CC0.

    python tools/fetch_textures.py

Output -> public/assets/textures/ + manifest 'textures'.
The app falls back to procedural concrete/water for any map not present.
"""
from __future__ import annotations

import common as C

API = "https://api.polyhaven.com"


def first_asset(s, category):
    data = C.get_json(s, f"{API}/assets?type=textures&categories={category}")
    if not data:
        return None
    return next(iter(data.keys()), None)


def pick_file(files, mapkey, res="1k"):
    """Walk Poly Haven's file tree to a downloadable url for a given map."""
    node = files.get(mapkey)
    if not node:
        return None
    res_node = node.get(res) or next(iter(node.values()), None)
    if not res_node:
        return None
    fmt = res_node.get("jpg") or res_node.get("png") or next(iter(res_node.values()), None)
    return (fmt or {}).get("url")


def grab(s, asset_id, mapkey, out_name, textures, credits):
    if not asset_id:
        return
    files = C.get_json(s, f"{API}/files/{asset_id}")
    if not files:
        return
    url = pick_file(files, mapkey)
    if not url:
        print(f"  ! no {mapkey} for {asset_id}")
        return
    data = C.download(s, url)
    if not data:
        return
    out = C.ASSETS / "textures" / out_name
    if C.save_image(data, out, max_size=1024, dedupe=False):
        key = out_name.split(".")[0]
        textures[key] = C.web_path(out)
        credits.append({
            "src": C.web_path(out), "source": "Poly Haven",
            "title": f"{asset_id} ({mapkey})", "license": "CC0",
            "url": f"https://polyhaven.com/a/{asset_id}",
        })
        print(f"  + {key} <- {asset_id}")


def main():
    s = C.session()
    textures, credits = {}, []

    concrete = first_asset(s, "concrete")
    grab(s, concrete, "Diffuse", "concrete.webp", textures, credits)

    water = first_asset(s, "water") or first_asset(s, "fabric")  # fallback for ripple normals
    grab(s, water, "nor_gl", "waterNormal.webp", textures, credits)
    grab(s, water, "Displacement", "waterDisp.webp", textures, credits)

    C.set_section("textures", textures)
    C.add_credits(credits)
    print(f"[textures] wrote {list(textures.keys())}")


if __name__ == "__main__":
    main()
