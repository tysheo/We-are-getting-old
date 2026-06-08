"""Harvest the image archive for the tunnel + collage.

Queries an emotional keyword list across museum/PD APIs (The Met, Wikimedia)
and stock APIs (Unsplash, Pexels, Pixabay). Sources without a configured key
are skipped automatically. Output -> public/assets/archive/ + manifest 'archive'.

    python tools/harvest_archive.py
"""
from __future__ import annotations

import random
from urllib.parse import quote

import common as C


def from_met(s, theme, n):
    """The Met — public-domain only, no key."""
    base = "https://collectionapi.metmuseum.org/public/collection/v1"
    data = C.get_json(s, f"{base}/search?hasImages=true&q={quote(theme)}")
    out = []
    for oid in (data or {}).get("objectIDs", [])[: n * 4]:
        if len(out) >= n:
            break
        obj = C.get_json(s, f"{base}/objects/{oid}")
        if obj and obj.get("isPublicDomain") and obj.get("primaryImage"):
            out.append((obj["primaryImage"], {
                "source": "The Met", "title": obj.get("title", ""),
                "license": "CC0", "url": obj.get("objectURL", ""),
            }))
    return out


def from_wikimedia(s, theme, n):
    """Wikimedia Commons — no key."""
    url = ("https://commons.wikimedia.org/w/api.php?action=query&format=json"
           "&generator=search&gsrnamespace=6&gsrlimit=%d&gsrsearch=%s"
           "&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1600"
           % (n, quote(theme)))
    data = C.get_json(s, url)
    out = []
    for page in (data or {}).get("query", {}).get("pages", {}).values():
        info = (page.get("imageinfo") or [{}])[0]
        src = info.get("thumburl") or info.get("url")
        if src:
            meta = info.get("extmetadata", {})
            out.append((src, {
                "source": "Wikimedia Commons", "title": page.get("title", ""),
                "license": meta.get("LicenseShortName", {}).get("value", "see source"),
                "url": info.get("descriptionurl", ""),
            }))
    return out


def from_unsplash(s, theme, n):
    key = C.env("UNSPLASH_ACCESS_KEY")
    if not key:
        return []
    url = f"https://api.unsplash.com/search/photos?query={quote(theme)}&per_page={n}"
    data = C.get_json(s, url, headers={"Authorization": f"Client-ID {key}"})
    return [(r["urls"]["regular"], {
        "source": "Unsplash", "title": r.get("description") or "",
        "license": "Unsplash License", "url": r.get("links", {}).get("html", ""),
    }) for r in (data or {}).get("results", [])]


def from_pexels(s, theme, n):
    key = C.env("PEXELS_API_KEY")
    if not key:
        return []
    url = f"https://api.pexels.com/v1/search?query={quote(theme)}&per_page={n}"
    data = C.get_json(s, url, headers={"Authorization": key})
    return [(p["src"]["large"], {
        "source": "Pexels", "title": p.get("alt", ""),
        "license": "Pexels License", "url": p.get("url", ""),
    }) for p in (data or {}).get("photos", [])]


def from_pixabay(s, theme, n):
    key = C.env("PIXABAY_API_KEY")
    if not key:
        return []
    url = (f"https://pixabay.com/api/?key={key}&q={quote(theme)}"
           f"&image_type=photo&per_page={max(3, n)}")
    data = C.get_json(s, url)
    return [(h["largeImageURL"], {
        "source": "Pixabay", "title": h.get("tags", ""),
        "license": "Pixabay License", "url": h.get("pageURL", ""),
    }) for h in (data or {}).get("hits", [])]


SOURCES = [from_met, from_wikimedia, from_unsplash, from_pexels, from_pixabay]


def main():
    s = C.session()
    C.prime_dedupe("archive")
    archive, credits = [], []
    idx = 0
    for theme in C.THEMES:
        print(f"[archive] {theme}")
        for src_fn in SOURCES:
            try:
                results = src_fn(s, theme, C.PER_THEME)
            except Exception as e:
                print(f"  ! {src_fn.__name__}: {e}")
                continue
            for img_url, credit in results:
                data = C.download(s, img_url)
                if not data:
                    continue
                out = C.ASSETS / "archive" / f"a{idx:04d}.webp"
                if not C.save_image(data, out):
                    continue
                archive.append({
                    "src": C.web_path(out),
                    "theme": theme,
                    "depthHint": round(random.random(), 3),
                    "source": credit["source"],
                })
                credits.append({**credit, "src": C.web_path(out)})
                idx += 1
    C.set_section("archive", archive)
    C.add_credits(credits)
    print(f"[archive] wrote {len(archive)} images")


if __name__ == "__main__":
    main()
