"""Finalise public/manifest.json: ensure every section exists and report counts.

The individual harvesters each write their own section; this just normalises the
shape the app expects and prints a summary. Safe to run any time.

    python tools/build_manifest.py
"""
from __future__ import annotations

import json

import common as C

SHAPE = {
    "archive": [],
    "faces": {"male": [], "female": []},
    "letters": [],
    "textures": {},
}


def main():
    m = {}
    if C.MANIFEST.exists():
        m = json.loads(C.MANIFEST.read_text(encoding="utf-8"))
    for k, default in SHAPE.items():
        m.setdefault(k, default)
    m["faces"].setdefault("male", [])
    m["faces"].setdefault("female", [])

    C.MANIFEST.write_text(json.dumps(m, indent=2), encoding="utf-8")

    print("[manifest] summary")
    print(f"  archive : {len(m['archive'])} images")
    print(f"  faces   : male {len(m['faces']['male'])}, female {len(m['faces']['female'])}")
    print(f"  letters : {len(m['letters'])} placed glyphs")
    print(f"  textures: {list(m['textures'].keys())}")
    credits = json.loads(C.CREDITS.read_text(encoding="utf-8")) if C.CREDITS.exists() else []
    print(f"  credits : {len(credits)} entries")
    if not m["archive"]:
        print("  (empty — the app will run on procedural placeholders)")


if __name__ == "__main__":
    main()
