#!/usr/bin/env python3
"""
Phase 3 — Series images for bnei-zion
======================================
Generates one watercolor image per series that has no image_url.
Uploads to Supabase Storage bnei-zion-thumbnails/series/
Updates series.image_url for matching rows.
Supports resume via scripts/image-batch-state.json.

Vision gate (added 26.5.2026): every generated image verified by Gemini Vision
for absence of human figures. Up to 3 retries; failures logged and skipped.

REQUIRES: Phase 2 completed and approved by Saar.

Usage:
  python3 scripts/image-batch-phase3.py           # live run
  DRY_RUN=1 python3 scripts/image-batch-phase3.py # dry run
"""

import json
import os
import subprocess
import time
import base64
import tempfile
import urllib.parse
from pathlib import Path

# Vision gate import
try:
    from lib.vision_gate import verify_no_humans
except ImportError:
    import sys as _sys
    _sys.path.insert(0, str(Path(__file__).parent))
    from lib.vision_gate import verify_no_humans

# ── Config — load from environment (never hardcode secrets) ───
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://pzvmwfexeiruelwiujxn.supabase.co")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
MGMT_PAT = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
PROJECT_REF = "pzvmwfexeiruelwiujxn"
BUCKET = "bnei-zion-thumbnails"
COST_PER_IMAGE = 0.06
CHECKPOINT_EVERY = 200

SCRIPT_DIR = Path(__file__).parent
STATE_FILE = SCRIPT_DIR / "image-batch-state.json"
DRY_RUN = os.environ.get("DRY_RUN", "0") == "1"

# ── Style (locked — pilot approved 26.5.2026 · NEGATIVE added 26.5.2026) ─────
STYLE = (
    "Minimalist watercolor painting on white textured paper. "
    "Ultra-clean, gentle, soft, ethereal, atmospheric, meditative, spiritually evocative. "
    "Loose watercolor washes, muted pastel tones — sage green, dusty teal, soft blue-gray, "
    "warm sand, wheat, pale gold, quiet lavender, blush rose. "
    "Visible paper grain, gentle gradients, completely soft edges. "
    "No harsh lines. No dark outlines. "
    "ABSOLUTELY NO TEXT, NO LETTERS, NO HEBREW CHARACTERS, NO ENGLISH CHARACTERS, "
    "NO TYPOGRAPHY, NO CALLIGRAPHY anywhere in the image. "
    "Generous white space — leave the center open and luminous. "
    "Abstract representation, impressionistic style, spiritual ambiance. "
    "NEGATIVE: absolutely no people, no humans, no figures, no human silhouettes, "
    "no faces, no body parts, no hair, no clothing, no dresses, no gowns, no robes, "
    "no hands, no feet, no arms, no legs, no children, no men, no women, "
    "no portraits, no anthropomorphic shapes, no characters, no persons whatsoever."
)

# Vision gate retry limit
VISION_MAX_RETRIES = 3

def run_curl(args):
    cmd = ["curl", "--noproxy", "*"] + args
    result = subprocess.run(cmd, capture_output=True, text=False)
    return result

# ── State management ──────────────────────────────────────────
def load_state():
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {
        "phase1": {"completed": [], "failed": []},
        "phase2": {"completed": [], "failed": []},
        "phase3": {"completed": [], "failed": []},
        "total_cost": 0.0
    }

def save_state(state):
    STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2))

# ── Fetch series without images ───────────────────────────────
def fetch_series_without_images():
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
        tmp_path = tmp.name
    result = run_curl(["-s", "-o", tmp_path,
                       "-H", f"Authorization: Bearer {MGMT_PAT}",
                       "-H", "Content-Type: application/json",
                       "-d", json.dumps({"query":
                           "SELECT id, title, bible_book, lesson_count "
                           "FROM series "
                           "WHERE status = 'published' "
                           "AND (image_url IS NULL OR image_url = '' "
                           "OR image_url LIKE '%placeholder%' OR image_url LIKE '%default%') "
                           "ORDER BY lesson_count DESC, title"}),
                       f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"])
    data = json.loads(Path(tmp_path).read_text())
    os.unlink(tmp_path)
    return data

# ── Build series prompt ───────────────────────────────────────
BOOK_EN = {
    "בראשית": "Genesis", "שמות": "Exodus", "ויקרא": "Leviticus",
    "במדבר": "Numbers", "דברים": "Deuteronomy", "יהושע": "Joshua",
    "שופטים": "Judges", "שמואל א": "First Samuel", "שמואל ב": "Second Samuel",
    "מלכים א": "First Kings", "מלכים ב": "Second Kings", "ישעיהו": "Isaiah",
    "ירמיהו": "Jeremiah", "יחזקאל": "Ezekiel", "תהילים": "Psalms",
    "משלי": "Proverbs", "איוב": "Job", "שיר השירים": "Song of Songs",
    "רות": "Ruth", "קהלת": "Ecclesiastes", "דניאל": "Daniel",
}

def series_prompt(title: str, bible_book: str | None) -> str:
    book_hint = ""
    if bible_book and bible_book in BOOK_EN:
        book_hint = f"This series is from the book of {BOOK_EN[bible_book]}. "
    return (
        f"Abstract spiritual representation for a Torah/Bible lecture series. "
        f"{book_hint}"
        f"Inspired by the essence of Jewish biblical study — wisdom, holiness, and devoted learning. "
        f"Gentle watercolor washes in muted pastels. "
        f"Completely abstract — no text, no figures, only atmosphere. "
        f"Meditative, luminous, spiritually uplifting."
    )

# ── Generate image ────────────────────────────────────────────
def generate_image(content: str, outfile: Path) -> bool:
    prompt = f"{STYLE}\n\nContent to visualize: {content}"
    payload = json.dumps({
        "instances": [{"prompt": prompt}],
        "parameters": {
            "sampleCount": 1,
            "aspectRatio": "16:9",
            "personGeneration": "dont_allow",
            "safetySetting": "block_low_and_above"
        }
    })
    url = f"https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-ultra-generate-001:predict?key={GEMINI_KEY}"

    for attempt in range(3):
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
            tmp_path = tmp.name
        result = run_curl(["-s", "-o", tmp_path, "-w", "%{http_code}",
                           "-X", "POST", url, "-H", "Content-Type: application/json",
                           "--data", payload])
        http_code = result.stdout.decode().strip()
        if http_code == "200":
            resp = json.loads(Path(tmp_path).read_text())
            os.unlink(tmp_path)
            b64 = resp["predictions"][0]["bytesBase64Encoded"]
            outfile.write_bytes(base64.b64decode(b64))
            size_kb = outfile.stat().st_size // 1024
            print(f"  [IMG OK] {size_kb}KB")
            return True
        elif http_code == "429":
            wait = 120 * (attempt + 1)  # 120s / 240s / 360s — Imagen Ultra quota is strict
            print(f"  [RATE LIMIT] waiting {wait}s")
            os.unlink(tmp_path)
            time.sleep(wait)
        else:
            err = Path(tmp_path).read_text()[:200]
            print(f"  [IMG FAIL] {http_code}: {err}")
            os.unlink(tmp_path)
            return False
    return False

# ── Upload ────────────────────────────────────────────────────
def upload_to_storage(filepath: Path, storage_path: str) -> str | None:
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}"
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
        tmp_path = tmp.name
    result = run_curl(["-s", "-o", tmp_path, "-w", "%{http_code}",
                       "-X", "POST", url,
                       "-H", f"Authorization: Bearer {SERVICE_KEY}",
                       "-H", "Content-Type: image/png",
                       "-H", "x-upsert: true",
                       "--data-binary", f"@{filepath}"])
    http_code = result.stdout.decode().strip()
    if http_code == "200":
        os.unlink(tmp_path)
        return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{storage_path}"
    else:
        err = Path(tmp_path).read_text()[:200]
        print(f"  [UPLOAD FAIL] {http_code}: {err}")
        os.unlink(tmp_path)
        return None

# ── DB update ─────────────────────────────────────────────────
def update_series_image(series_id: str, public_url: str):
    filter_params = f"id=eq.{series_id}"
    url = f"{SUPABASE_URL}/rest/v1/series?{filter_params}"
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
        tmp_path = tmp.name
    result = run_curl(["-s", "-o", tmp_path, "-w", "%{http_code}",
                       "-X", "PATCH", url,
                       "-H", f"Authorization: Bearer {SERVICE_KEY}",
                       "-H", f"apikey: {SERVICE_KEY}",
                       "-H", "Content-Type: application/json",
                       "-H", "Prefer: return=minimal",
                       "-d", json.dumps({"image_url": public_url})])
    http_code = result.stdout.decode().strip()
    os.unlink(tmp_path)
    if http_code in ("200", "204"):
        print(f"  [DB OK] Updated series image_url")
    else:
        print(f"  [DB WARN] HTTP {http_code}")

# ── Main ──────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("bnei-zion image batch — Phase 3 (Series)")
    print(f"DRY_RUN={DRY_RUN}")
    print("Fetching series without images...")

    state = load_state()
    series_list = fetch_series_without_images()
    print(f"Total series needing images: {len(series_list)}")
    print("=" * 60)

    completed = set(state["phase3"]["completed"])
    count = 0
    skipped = 0
    failed = 0

    for i, row in enumerate(series_list, 1):
        series_id = row["id"]
        title = row["title"]
        bible_book = row.get("bible_book")
        key = series_id

        if key in completed:
            skipped += 1
            continue

        storage_path = f"series/{series_id}.png"

        print(f"\n[{i}/{len(series_list)}] {title[:50]}")

        if DRY_RUN:
            p = series_prompt(title, bible_book)
            print(f"  [DRY RUN] Prompt: {p[:100]}...")
            count += 1
            continue

        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp_path = Path(tmp.name)

        try:
            # ── Generate + Vision gate (up to VISION_MAX_RETRIES) ───
            vision_passed = False
            prompt_str = series_prompt(title, bible_book)
            for vision_attempt in range(1, VISION_MAX_RETRIES + 1):
                if not generate_image(prompt_str, tmp_path):
                    print(f"  [FAIL] Generation failed (attempt {vision_attempt}/{VISION_MAX_RETRIES})")
                    if vision_attempt < VISION_MAX_RETRIES:
                        time.sleep(15)
                    continue

                state["total_cost"] = round(state["total_cost"] + COST_PER_IMAGE, 4)

                passed, reason = verify_no_humans(str(tmp_path), GEMINI_KEY)
                if passed:
                    print(f"  [VISION OK] {reason[:80]}")
                    vision_passed = True
                    break
                else:
                    print(f"  [VISION FAIL {vision_attempt}/{VISION_MAX_RETRIES}] {reason[:120]}")
                    if vision_attempt < VISION_MAX_RETRIES:
                        time.sleep(30)

            if not vision_passed:
                print(f"  [SKIP] {series_id} ({title[:40]}) — all vision attempts failed")
                if key not in state["phase3"]["failed"]:
                    state["phase3"]["failed"].append(key)
                save_state(state)
                failed += 1
                continue

            public_url = upload_to_storage(tmp_path, storage_path)
            if not public_url:
                state["phase3"]["failed"].append(key)
                save_state(state)
                failed += 1
                continue

            update_series_image(series_id, public_url)
            state["phase3"]["completed"].append(key)
            # Note: total_cost already incremented inside vision gate loop
            save_state(state)
            count += 1

        finally:
            tmp_path.unlink(missing_ok=True)

        if count > 0 and count % CHECKPOINT_EVERY == 0:
            print(f"\n--- CHECKPOINT: {count} done, ${state['total_cost']:.2f} total ---\n")

        if i < len(series_list):
            time.sleep(90)  # 90s between images — Imagen Ultra quota ~1/min observed

    print("\n" + "=" * 60)
    print(f"Phase 3: {count} generated | {skipped} skipped | {failed} failed")
    print(f"Total cost: ${state['total_cost']:.2f}")
    print("=" * 60)

if __name__ == "__main__":
    main()
