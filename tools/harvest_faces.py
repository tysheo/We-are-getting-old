"""Build the aligned aging-face stacks from a local folder of found faces.

Point it at an age-labelled face dataset (UTKFace is the default: filenames are
`<age>_<gender>_<race>_<date>.jpg`, gender 0=male 1=female). Each face is
detected and warped so the eyes land on a fixed canonical template -> the whole
0..100 stack is jump-matched by construction. Identity flickers between the
people found at each age, which is on-concept.

Uses OpenCV Haar cascades only (no mediapipe — it has no Python 3.13 wheels):
eyes pin the alignment; if eyes aren't found we fall back to a face-box crop.

    python tools/harvest_faces.py --input data/UTKFace
    python tools/harvest_faces.py --input data/UTKFace --max-per-age 5

Output -> public/assets/faces/{male,female}/ + manifest 'faces'.
"""
from __future__ import annotations

import argparse
import re
from collections import defaultdict
from pathlib import Path

import numpy as np

import common as C

OUT_W, OUT_H = 512, 640
# canonical eye positions (normalised): eyes high, symmetric about centre
TL = (0.36 * OUT_W, 0.42 * OUT_H)  # left eye (image-left)
TR = (0.64 * OUT_W, 0.42 * OUT_H)  # right eye

UTK = re.compile(r"^(\d{1,3})_(\d)_")


def parse_label(name: str):
    m = UTK.match(name)
    if not m:
        return None, None
    age = int(m.group(1))
    sex = "male" if m.group(2) == "0" else "female"
    return (age, sex) if 0 <= age <= 100 else (None, None)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, help="folder of age-labelled faces")
    ap.add_argument("--max-per-age", type=int, default=5)
    args = ap.parse_args()

    import cv2

    face_cc = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    eye_cc = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_eye.xml")

    in_dir = Path(args.input)
    files = [p for p in in_dir.glob("**/*") if p.suffix.lower() in {".jpg", ".jpeg", ".png"}]
    print(f"[faces] scanning {len(files)} files in {in_dir}", flush=True)

    per_bucket = defaultdict(int)  # (sex, age) -> count
    faces = {"male": [], "female": []}
    kept = aligned_by_eyes = fallback = 0

    for n, p in enumerate(files):
        if n % 1000 == 0 and n:
            print(f"[faces] ...scanned {n}, kept {kept}", flush=True)

        age, sex = parse_label(p.name)
        if age is None or per_bucket[(sex, age)] >= args.max_per_age:
            continue

        img = cv2.imread(str(p))
        if img is None:
            continue
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        faces_found = face_cc.detectMultiScale(gray, 1.1, 5, minSize=(60, 60))
        if len(faces_found) == 0:
            continue
        fx, fy, fw, fh = max(faces_found, key=lambda r: r[2] * r[3])

        # eyes in the upper face region
        roi = gray[fy : fy + int(fh * 0.6), fx : fx + fw]
        eyes = eye_cc.detectMultiScale(roi, 1.1, 6, minSize=(int(fw * 0.12), int(fw * 0.12)))
        M = None
        if len(eyes) >= 2:
            # the two widest-apart eyes, as full-image centre points
            eyes = sorted(eyes, key=lambda e: e[2] * e[3], reverse=True)[:3]
            pts = [(fx + ex + ew / 2, fy + ey + eh / 2) for (ex, ey, ew, eh) in eyes]
            pts = sorted(pts, key=lambda q: q[0])
            le, re = pts[0], pts[-1]
            src = np.float32([le, re])
            dst = np.float32([TL, TR])
            M, _ = cv2.estimateAffinePartial2D(src, dst, method=cv2.LMEDS)

        if M is None:
            # fallback: scale the face box into the canonical frame, no rotation
            scale = (OUT_W * 0.62) / fw
            cx, cy = fx + fw / 2, fy + fh * 0.45
            M = np.float32([[scale, 0, OUT_W / 2 - scale * cx], [0, scale, OUT_H / 2 - scale * cy]])
            fallback += 1
        else:
            aligned_by_eyes += 1

        out_img = cv2.warpAffine(
            img, M, (OUT_W, OUT_H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT
        )

        out = C.ASSETS / "faces" / sex / f"{age:03d}_{per_bucket[(sex, age)]}.webp"
        out.parent.mkdir(parents=True, exist_ok=True)
        ok, buf = cv2.imencode(".webp", out_img, [cv2.IMWRITE_WEBP_QUALITY, 86])
        if not ok:
            continue
        out.write_bytes(buf.tobytes())
        faces[sex].append({"src": C.web_path(out), "age": age})
        per_bucket[(sex, age)] += 1
        kept += 1

    faces["male"].sort(key=lambda f: f["age"])
    faces["female"].sort(key=lambda f: f["age"])
    C.set_section("faces", faces)
    print(
        f"[faces] kept {kept} (eye-aligned {aligned_by_eyes}, box-fallback {fallback}) "
        f"-> male {len(faces['male'])}, female {len(faces['female'])}",
        flush=True,
    )


if __name__ == "__main__":
    main()
