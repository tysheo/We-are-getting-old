"""Find the letters of "close to you" hidden inside the harvested archive.

Runs OCR (Tesseract) over public/assets/archive/, crops out individual glyphs
that match the letters we need, then assembles a target collage layout. The
finale message is therefore *discovered in the found material*, not authored.

Requires the Tesseract binary on PATH (https://github.com/tesseract-ocr/tesseract).

    python tools/find_letters.py

Output -> public/assets/letters/ + manifest 'letters'.
"""
from __future__ import annotations

from collections import defaultdict

import common as C

PHRASE = "close to you"
NEEDED = [ch for ch in PHRASE if ch != " "]


def main():
    from PIL import Image
    import pytesseract

    archive_dir = C.ASSETS / "archive"
    imgs = sorted(archive_dir.glob("*.webp")) if archive_dir.exists() else []
    if not imgs:
        print("[letters] no archive images found — run harvest_archive.py first")
        return

    pool = defaultdict(list)  # char -> [Path,...]
    want = set(c.lower() for c in NEEDED)
    idx = 0

    for p in imgs:
        try:
            im = Image.open(p).convert("RGB")
        except Exception:
            continue
        w, h = im.size
        try:
            boxes = pytesseract.image_to_boxes(im)
        except pytesseract.TesseractNotFoundError:
            print("[letters] Tesseract binary not found on PATH — skipping")
            return
        for line in boxes.splitlines():
            parts = line.split()
            if len(parts) < 5:
                continue
            ch = parts[0].lower()
            if ch not in want:
                continue
            x1, y1, x2, y2 = map(int, parts[1:5])
            # tesseract boxes use bottom-left origin
            crop = im.crop((x1, h - y2, x2, h - y1))
            if crop.width < 12 or crop.height < 12:
                continue
            pad = max(crop.width, crop.height)
            crop = crop.resize((pad, pad))
            out = C.ASSETS / "letters" / f"{ch}_{idx:03d}.webp"
            out.parent.mkdir(parents=True, exist_ok=True)
            crop.save(out, "WEBP", quality=88)
            pool[ch].append(out)
            idx += 1

    found = {c: len(v) for c, v in pool.items()}
    print(f"[letters] found glyphs: {found}")

    # assemble the target layout for "close to you"
    spacing = 1.0 / (len(NEEDED) + 1)
    cursor = defaultdict(int)
    letters = []
    pos = 0
    for ch in PHRASE:
        if ch == " ":
            pos += 1
            continue
        c = ch.lower()
        if pool.get(c):
            chosen = pool[c][cursor[c] % len(pool[c])]
            cursor[c] += 1
            letters.append({
                "src": C.web_path(chosen),
                "char": c,
                "x": round((pos + 1) * spacing, 3),
                "y": 0.5,
            })
        pos += 1

    C.set_section("letters", letters)
    missing = [c for c in want if not pool.get(c)]
    if missing:
        print(f"[letters] WARNING missing glyphs {missing} — app will fall back "
              f"to procedural letterforms for those")
    print(f"[letters] wrote {len(letters)} placed glyphs")


if __name__ == "__main__":
    main()
