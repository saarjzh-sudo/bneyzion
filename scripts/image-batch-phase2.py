#!/usr/bin/env python3
"""
Phase 2 — Chapter images for bnei-zion
=======================================
Generates one watercolor image per unique (bible_book, bible_chapter) tuple.
Uploads to Supabase Storage bnei-zion-thumbnails/chapters/
Updates lessons.thumbnail_url for matching rows.
Supports resume via scripts/image-batch-state.json.

REQUIRES: Phase 1 completed and approved by Saar.

Usage:
  python3 scripts/image-batch-phase2.py           # live run
  DRY_RUN=1 python3 scripts/image-batch-phase2.py # dry run
"""

import json
import os
import subprocess
import sys
import time
import base64
import tempfile
import urllib.parse
from pathlib import Path

# ── Config — load from environment (never hardcode secrets) ───
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://pzvmwfexeiruelwiujxn.supabase.co")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
MGMT_PAT = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
PROJECT_REF = "pzvmwfexeiruelwiujxn"
BUCKET = "bnei-zion-thumbnails"
COST_PER_IMAGE = 0.06
CHECKPOINT_EVERY = 200  # print progress every N images

SCRIPT_DIR = Path(__file__).parent
STATE_FILE = SCRIPT_DIR / "image-batch-state.json"
DRY_RUN = os.environ.get("DRY_RUN", "0") == "1"

# ── Style (locked — pilot approved 26.5.2026) ─────────────────
STYLE = (
    "Minimalist watercolor painting on white textured paper. "
    "Ultra-clean, gentle, soft, ethereal, atmospheric, meditative, spiritually evocative. "
    "Loose watercolor washes, muted pastel tones — sage green, dusty teal, soft blue-gray, "
    "warm sand, wheat, pale gold, quiet lavender, blush rose. "
    "Visible paper grain, gentle gradients, completely soft edges. "
    "No harsh lines. No dark outlines. No explicit human figures. "
    "ABSOLUTELY NO TEXT, NO LETTERS, NO HEBREW CHARACTERS, NO ENGLISH CHARACTERS, "
    "NO TYPOGRAPHY, NO CALLIGRAPHY anywhere in the image. "
    "Generous white space — leave the center open and luminous. "
    "Abstract representation, impressionistic style, spiritual ambiance."
)

# ── English book names for prompts ────────────────────────────
BOOK_EN = {
    "בראשית": "Genesis", "שמות": "Exodus", "ויקרא": "Leviticus",
    "במדבר": "Numbers", "דברים": "Deuteronomy", "יהושע": "Joshua",
    "שופטים": "Judges", "שמואל": "Samuel", "שמואל א": "First Samuel",
    "שמואל ב": "Second Samuel", "מלכים": "Kings", "מלכים א": "First Kings",
    "מלכים ב": "Second Kings", "ישעיהו": "Isaiah", "ירמיהו": "Jeremiah",
    "יחזקאל": "Ezekiel", "הושע": "Hosea", "יואל": "Joel", "עמוס": "Amos",
    "עובדיה": "Obadiah", "יונה": "Jonah", "מיכה": "Micah", "נחום": "Nahum",
    "חבקוק": "Habakkuk", "צפניה": "Zephaniah", "חגי": "Haggai",
    "זכריה": "Zechariah", "מלאכי": "Malachi", "תהילים": "Psalms",
    "תהלים": "Psalms", "משלי": "Proverbs", "איוב": "Job",
    "שיר השירים": "Song of Songs", "רות": "Ruth", "קהלת": "Ecclesiastes",
    "איכה": "Lamentations", "אסתר": "Esther", "דניאל": "Daniel",
    "עזרא": "Ezra", "נחמיה": "Nehemiah", "דברי הימים": "Chronicles",
    "דברי הימים א": "First Chronicles", "דברי הימים ב": "Second Chronicles",
}

BOOK_SLUG = {
    "בראשית": "bereshit", "שמות": "shemot", "ויקרא": "vayikra",
    "במדבר": "bamidbar", "דברים": "devarim", "יהושע": "yehoshua",
    "שופטים": "shoftim", "שמואל": "shmuel", "שמואל א": "shmuel-alef",
    "שמואל ב": "shmuel-bet", "מלכים": "melachim", "מלכים א": "melachim-alef",
    "מלכים ב": "melachim-bet", "ישעיהו": "yeshayahu", "ירמיהו": "yirmeyahu",
    "יחזקאל": "yechezkel", "הושע": "hoshea", "יואל": "yoel", "עמוס": "amos",
    "עובדיה": "ovadya", "יונה": "yona", "מיכה": "micha", "נחום": "nachum",
    "חבקוק": "chavakuk", "צפניה": "tzfanya", "חגי": "chagai",
    "זכריה": "zecharia", "מלאכי": "malachi", "תהילים": "tehilim",
    "תהלים": "tehilim-alt", "משלי": "mishlei", "איוב": "iyov",
    "שיר השירים": "shir-hashirim", "רות": "rut", "קהלת": "kohelet",
    "איכה": "eicha", "אסתר": "esther", "דניאל": "daniel",
    "עזרא": "ezra", "נחמיה": "nehemia", "דברי הימים": "divrei-hayamim",
    "דברי הימים א": "divrei-hayamim-alef", "דברי הימים ב": "divrei-hayamim-bet",
}

def book_to_en(book):
    return BOOK_EN.get(book, book)

def book_to_slug(book):
    return BOOK_SLUG.get(book, book.replace(' ', '-'))

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

def is_completed(key, phase, state):
    return key in state[phase]["completed"]

def run_curl(args):
    cmd = ["curl", "--noproxy", "*"] + args
    result = subprocess.run(cmd, capture_output=True, text=False)
    return result

# ── Imagen generation ─────────────────────────────────────────
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
            wait = 60 * (attempt + 1)
            print(f"  [RATE LIMIT] 429 — waiting {wait}s")
            os.unlink(tmp_path)
            time.sleep(wait)
        else:
            err = Path(tmp_path).read_text()[:200]
            print(f"  [IMG FAIL] HTTP {http_code}: {err}")
            os.unlink(tmp_path)
            return False
    print("  [IMG FAIL] Max retries exceeded")
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
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{storage_path}"
        print(f"  [UPLOAD OK] {storage_path}")
        return public_url
    else:
        err = Path(tmp_path).read_text()[:200]
        print(f"  [UPLOAD FAIL] HTTP {http_code}: {err}")
        os.unlink(tmp_path)
        return None

# ── DB update ─────────────────────────────────────────────────
def update_lessons_chapter(bible_book: str, bible_chapter: int, public_url: str):
    encoded_book = urllib.parse.quote(bible_book)
    filter_params = (
        f"bible_book=eq.{encoded_book}"
        f"&bible_chapter=eq.{bible_chapter}"
        f"&or=(thumbnail_url.is.null,thumbnail_url.eq.,thumbnail_url.like.*placeholder*,thumbnail_url.like.*default*)"
    )
    url = f"{SUPABASE_URL}/rest/v1/lessons?{filter_params}"
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
        tmp_path = tmp.name
    result = run_curl(["-s", "-o", tmp_path, "-w", "%{http_code}",
                       "-X", "PATCH", url,
                       "-H", f"Authorization: Bearer {SERVICE_KEY}",
                       "-H", f"apikey: {SERVICE_KEY}",
                       "-H", "Content-Type: application/json",
                       "-H", "Prefer: return=minimal,count=exact",
                       "-d", json.dumps({"thumbnail_url": public_url})])
    http_code = result.stdout.decode().strip()
    os.unlink(tmp_path)
    if http_code in ("200", "204"):
        print(f"  [DB OK] Updated lessons for {bible_book} ch.{bible_chapter}")
    else:
        print(f"  [DB WARN] HTTP {http_code}")

# ── Fetch chapter tuples from DB ──────────────────────────────
def fetch_chapter_tuples():
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
        tmp_path = tmp.name
    result = run_curl(["-s", "-o", tmp_path,
                       "-H", f"Authorization: Bearer {MGMT_PAT}",
                       "-H", "Content-Type: application/json",
                       "-d", json.dumps({"query":
                           "SELECT DISTINCT bible_book, bible_chapter "
                           "FROM lessons "
                           "WHERE bible_book IS NOT NULL AND bible_chapter IS NOT NULL AND bible_chapter > 0 "
                           "ORDER BY bible_book, bible_chapter"}),
                       f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"])
    data = json.loads(Path(tmp_path).read_text())
    os.unlink(tmp_path)
    return data

# ── Build chapter prompt ──────────────────────────────────────
def chapter_prompt(book: str, chapter: int) -> str:
    book_en = book_to_en(book)
    return (
        f"Abstract spiritual representation of {book_en} chapter {chapter}. "
        f"A unique meditative scene inspired by the themes and atmosphere of this specific biblical chapter. "
        f"Watercolor washes in muted pastels — sage green, dusty teal, soft blue-gray, warm sand, pale gold. "
        f"Completely abstract — no figures, no recognizable symbols, only atmosphere and feeling. "
        f"Gentle, luminous, spiritual."
    )

# ── Main ──────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("bnei-zion image batch — Phase 2 (Chapters)")
    print(f"DRY_RUN={DRY_RUN}")
    print("Fetching chapter tuples from DB...")

    state = load_state()
    tuples = fetch_chapter_tuples()
    print(f"Total unique (book, chapter) tuples: {len(tuples)}")
    print("=" * 60)

    completed = set(state["phase2"]["completed"])
    count = 0
    skipped = 0
    failed = 0

    for i, row in enumerate(tuples, 1):
        book = row["bible_book"]
        chapter = row["bible_chapter"]
        key = f"{book}:{chapter}"

        if key in completed:
            skipped += 1
            continue

        slug = book_to_slug(book)
        storage_path = f"chapters/{slug}-{chapter:03d}.png"

        print(f"\n[{i}/{len(tuples)}] {book} פרק {chapter}")

        if DRY_RUN:
            p = chapter_prompt(book, chapter)
            print(f"  [DRY RUN] Prompt: {p[:100]}...")
            print(f"  [DRY RUN] Storage: {storage_path}")
            count += 1
            continue

        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp_path = Path(tmp.name)

        try:
            if not generate_image(chapter_prompt(book, chapter), tmp_path):
                state["phase2"]["failed"].append(key)
                save_state(state)
                failed += 1
                continue

            public_url = upload_to_storage(tmp_path, storage_path)
            if not public_url:
                state["phase2"]["failed"].append(key)
                save_state(state)
                failed += 1
                continue

            update_lessons_chapter(book, chapter, public_url)
            state["phase2"]["completed"].append(key)
            state["total_cost"] = round(state["total_cost"] + COST_PER_IMAGE, 4)
            save_state(state)
            count += 1

        finally:
            tmp_path.unlink(missing_ok=True)

        # Checkpoint every 200
        if count > 0 and count % CHECKPOINT_EVERY == 0:
            print(f"\n--- CHECKPOINT: {count} done, ${state['total_cost']:.2f} spent ---\n")

        if i < len(tuples):
            time.sleep(7)

    print("\n" + "=" * 60)
    print(f"Phase 2: {count} generated | {skipped} skipped | {failed} failed")
    print(f"Total cost: ${state['total_cost']:.2f}")
    if state["phase2"]["failed"]:
        print(f"Failed: {state['phase2']['failed'][:10]}...")
    print("=" * 60)

if __name__ == "__main__":
    main()
