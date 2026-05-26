#!/usr/bin/env python3
"""
Phase 1 — Book images for bnei-zion
====================================
Generates one watercolor image per unique bible_book (where bible_chapter is NULL).
Uploads to Supabase Storage bnei-zion-thumbnails/books/
Updates lessons.thumbnail_url for matching rows.
Supports resume via scripts/image-batch-state.json.

Usage:
  python3 scripts/image-batch-phase1.py           # live run
  DRY_RUN=1 python3 scripts/image-batch-phase1.py # dry run (no API calls)
"""

import json
import os
import subprocess
import sys
import time
import base64
import tempfile
from pathlib import Path

# ── Config ────────────────────────────────────────────────────
GEMINI_KEY = "AIzaSyDSFo7xhRUELzqw8ra8z1fIWvS-FqqbLV8"
SUPABASE_URL = "https://pzvmwfexeiruelwiujxn.supabase.co"
SERVICE_KEY = "SUPABASE_SERVICE_ROLE_REDACTED"
MGMT_PAT = "SUPABASE_MGMT_PAT_REDACTED"
PROJECT_REF = "pzvmwfexeiruelwiujxn"
BUCKET = "bnei-zion-thumbnails"
COST_PER_IMAGE = 0.06

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

# ── Book descriptions (English, for Imagen) ──────────────────
BOOK_DESC = {
    "בראשית": "Genesis — the book of creation, the founding narratives of humanity and the patriarchs. Swirling cosmic light separating from darkness, the first dawn, gentle forms of earth and water taking shape.",
    "שמות": "Exodus — liberation from Egypt, the journey through the desert, and the revelation at Sinai. Parting waters, desert sands, luminous cloud and fire pillars, the awe of divine encounter.",
    "ויקרא": "Leviticus — the sacred order of priestly service, holiness, and moral law. Soft altar flames, incense wisps rising, the radiance of sanctity and purity.",
    "במדבר": "Numbers — forty years of wandering in the wilderness, tribal community, and faith tested. Vast desert landscapes, the wandering cloud, encampments of tents under an infinite sky.",
    "דברים": "Deuteronomy — Moses' final teachings and the covenant renewed before entering the land. A solitary figure on a mountain peak, the promised land shimmering in the distance.",
    "יהושע": "Joshua — the crossing of the Jordan and the conquest of the land of Israel. Flowing river waters, the walls of a city dissolving into light, dawn breaking over a promised land.",
    "שופטים": "Judges — the cycles of faith, failure, and redemption in the early settlement period. Alternating light and shadow, turbulent yet ultimately hopeful atmosphere.",
    "שמואל": "Samuel — the rise of prophecy, the first kings, and the establishment of the monarchy in Israel. Royal purple and gold, a young prophet listening in the night, an anointing with oil.",
    "שמואל א": "First Samuel — Eli and Samuel, the ark of the covenant, and the transition to kingship. Lamp light in the Tabernacle, the ark carried in reverence, the anointing of a shepherd king.",
    "שמואל ב": "Second Samuel — King David's reign, his psalms, triumphs, and failures. A harp silhouetted against a golden sky, the City of David on a hill, complex human emotion in warm tones.",
    "מלכים": "Kings — the divided monarchy, prophets like Elijah, the Temple and its destruction. The Temple's golden glory fading into twilight, a prophet's cloak blowing in the wind.",
    "מלכים א": "First Kings — Solomon's wisdom and the Temple's construction, then the kingdom's division. The Temple's radiant glory at its peak, architectural grandeur in warm gold and cedar.",
    "מלכים ב": "Second Kings — the fall of the northern and southern kingdoms, exile to Babylon. A city dissolving into mist, exiles journeying under a weeping sky, hope still glowing on the horizon.",
    "ישעיהו": "Isaiah — majestic prophetic visions of justice, redemption, and the messianic era. Soaring heavenly light breaking through storm clouds, a luminous vision of peace and universal hope.",
    "ירמיהו": "Jeremiah — the prophet of anguish witnessing Jerusalem's destruction and calling for return. Tears and grief dissolving into hope, dark storm lifting, green shoots emerging from ruins.",
    "יחזקאל": "Ezekiel — visionary prophecy, the divine chariot, the valley of dry bones restored. Radiant cosmic wheels, a valley of bones rising with new life, ethereal divine presence.",
    "הושע": "Hosea — the metaphor of faithful love, Israel's straying and the call to return. A tender reunion suggested in soft light, longing and forgiveness woven in warm rose and gold.",
    "יואל": "Joel — the locust plague, repentance, and the outpouring of divine spirit. Agricultural abundance followed by desolation then restoration, the spirit poured like rain.",
    "עמוס": "Amos — the prophet of justice, speaking for the poor against social injustice. Bold scales of justice, market scenes in muted tones, a prophetic voice cutting through complacency.",
    "עובדיה": "Obadiah — the shortest prophetic book, addressing Edom's fall and Zion's future. A mountain landscape, an eagle descending, ultimately the victory of justice.",
    "יונה": "Jonah — the reluctant prophet, the great fish, and divine compassion for all peoples. Deep ocean blues and greens, a small figure inside a luminous belly, dawn breaking after darkness.",
    "מיכה": "Micah — justice, mercy, and walking humbly — the essence of moral living. Humble village life, scales of justice, the promise of an era of peace.",
    "נחום": "Nahum — the downfall of Nineveh and divine justice against cruelty. A great city dissolving in turbulent water and wind, justice arriving like a storm.",
    "חבקוק": "Habakkuk — the prophet who dares to question God and receives a vision of patient faith. A lone watcher on a tower, cosmic tension resolving into luminous trust.",
    "צפניה": "Zephaniah — the day of judgment and the promise of joyful restoration. Dark clouds giving way to golden light, a remnant of quiet faithful souls.",
    "חגי": "Haggai — the call to rebuild the Temple after the return from exile. Foundations being laid, hands working together, the renewed Temple rising in soft light.",
    "זכריה": "Zechariah — visions of restoration, the messianic era, and Jerusalem's renewal. Luminous apocalyptic imagery softened into watercolor dreamscapes, candelabras and olive trees.",
    "מלאכי": "Malachi — the last prophet, calling for covenant renewal before the great day. A closing chapter, the setting sun of prophecy, a small flame kept burning.",
    "תהילים": "Psalms — the universal language of the human heart in prayer, praise, and lament. Musical waves of light, hands raised in prayer, the full emotional spectrum of human-divine relationship.",
    "תהלים": "Psalms (alternate transliteration) — songs of praise, lament, and trust across all human experiences. Lyrical waves of soft color, an open heart reaching upward in quiet devotion.",
    "משלי": "Proverbs — wisdom personified, practical moral teaching for everyday life. A wise elder and youth in conversation, the Tree of Life suggested in branching golden forms.",
    "איוב": "Job — the great trial of faith, suffering, and divine encounter beyond human comprehension. Storm clouds and whirlwind giving way to awe, a figure small before cosmic vastness.",
    "שיר השירים": "Song of Songs — the poetry of love, longing, and the sacred relationship between Israel and the divine. Blooming flowers, soft rose and gold light, the beauty of spring in the beloved's garden.",
    "רות": "Ruth — loyalty, kindness, and the beauty of choosing belonging. Golden fields of grain at harvest time, two women walking together, warmth of Bethlehem at dusk.",
    "קהלת": "Ecclesiastes — the search for meaning, the cycles of time, and wisdom beyond vanity. Sun rising and setting, rivers flowing to the sea, the quiet wisdom of accepting life's rhythms.",
    "איכה": "Lamentations — mourning Jerusalem's destruction, tears, and the beginning of hope. Tears falling on ancient stones, a city in ruins softened into watercolor, a single candle still burning.",
    "אסתר": "Esther — the hidden miracle, courage, and the reversal of decree. Royal court in soft purple and gold, a young woman standing with quiet courage, the hidden hand of providence.",
    "דניאל": "Daniel — faith in exile, prophetic visions, and divine protection. Lions' den lit by divine light, cosmic visions, gold and blue celestial imagery.",
    "עזרא": "Ezra — the return from exile and the restoration of Torah study. Scrolls unrolling, returnees streaming toward a rebuilt Jerusalem, the joy of homecoming.",
    "נחמיה": "Nehemiah — rebuilding Jerusalem's walls, communal renewal, and dedicated leadership. Walls rising stone by stone, a community working together, ancient gates renewed.",
    "דברי הימים": "Chronicles — the grand sweep of history retold with a focus on Temple worship and the covenant. Many generations, the Temple as the golden center of all history.",
    "דברי הימים א": "First Chronicles — genealogies leading to David, the preparation for the Temple. Ancient family trees becoming living light, the arc of history bending toward the sacred.",
    "דברי הימים ב": "Second Chronicles — Solomon's Temple and the kings of Judah through the exile. The Temple in its full glory, the long history of faithfulness, ending with hope of return.",
}

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

def run_curl(args, capture_output=True):
    """Run curl with --noproxy '*' prepended."""
    cmd = ["curl", "--noproxy", "*"] + args
    result = subprocess.run(cmd, capture_output=capture_output, text=False)
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

        result = run_curl([
            "-s", "-o", tmp_path, "-w", "%{http_code}",
            "-X", "POST", url,
            "-H", "Content-Type: application/json",
            "--data", payload
        ])
        http_code = result.stdout.decode().strip() if result.stdout else "000"

        if http_code == "200":
            resp = json.loads(Path(tmp_path).read_text())
            os.unlink(tmp_path)
            b64 = resp["predictions"][0]["bytesBase64Encoded"]
            outfile.write_bytes(base64.b64decode(b64))
            size_kb = outfile.stat().st_size // 1024
            print(f"  [OK] Generated {outfile.name} ({size_kb}KB)")
            return True
        elif http_code == "429":
            wait = 60 * (attempt + 1)
            print(f"  [RATE LIMIT] HTTP 429 — waiting {wait}s (attempt {attempt+1}/3)")
            os.unlink(tmp_path)
            time.sleep(wait)
        else:
            err = Path(tmp_path).read_text()[:200]
            print(f"  [FAIL] HTTP {http_code}: {err}")
            os.unlink(tmp_path)
            return False

    print("  [FAIL] Max retries exceeded")
    return False

# ── Upload to Storage ─────────────────────────────────────────
def upload_to_storage(filepath: Path, storage_path: str) -> str | None:
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}"

    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
        tmp_path = tmp.name

    result = run_curl([
        "-s", "-o", tmp_path, "-w", "%{http_code}",
        "-X", "POST", url,
        "-H", f"Authorization: Bearer {SERVICE_KEY}",
        "-H", "Content-Type: image/png",
        "-H", "x-upsert: true",
        "--data-binary", f"@{filepath}"
    ])
    http_code = result.stdout.decode().strip() if result.stdout else "000"

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

# ── DB update via Supabase REST API ──────────────────────────
def update_lessons_thumbnail(bible_book: str, public_url: str) -> int:
    """Update thumbnail_url for lessons of this book (no bible_chapter, no existing thumbnail)."""
    import urllib.parse
    encoded_book = urllib.parse.quote(bible_book)

    # Filter: bible_book = X, bible_chapter is null, no existing thumbnail
    filter_params = (
        f"bible_book=eq.{encoded_book}"
        f"&bible_chapter=is.null"
        f"&or=(thumbnail_url.is.null,thumbnail_url.eq.,thumbnail_url.like.*placeholder*,thumbnail_url.like.*default*)"
    )
    url = f"{SUPABASE_URL}/rest/v1/lessons?{filter_params}"

    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
        tmp_path = tmp.name

    result = run_curl([
        "-s", "-o", tmp_path, "-w", "%{http_code}",
        "-X", "PATCH", url,
        "-H", f"Authorization: Bearer {SERVICE_KEY}",
        "-H", f"apikey: {SERVICE_KEY}",
        "-H", "Content-Type: application/json",
        "-H", "Prefer: return=minimal,count=exact",
        "-d", json.dumps({"thumbnail_url": public_url})
    ])
    http_code = result.stdout.decode().strip() if result.stdout else "000"
    resp_text = Path(tmp_path).read_text()
    os.unlink(tmp_path)

    if http_code in ("200", "204"):
        print(f"  [DB OK] Updated lessons for '{bible_book}'")
    else:
        print(f"  [DB WARN] HTTP {http_code}: {resp_text[:100]}")
    return 0

# ── Hebrew → ASCII slug map for storage paths ─────────────────
# Supabase Storage rejects Hebrew characters in paths
BOOK_SLUG = {
    "בראשית": "bereshit",
    "שמות": "shemot",
    "ויקרא": "vayikra",
    "במדבר": "bamidbar",
    "דברים": "devarim",
    "יהושע": "yehoshua",
    "שופטים": "shoftim",
    "שמואל": "shmuel",
    "שמואל א": "shmuel-alef",
    "שמואל ב": "shmuel-bet",
    "מלכים": "melachim",
    "מלכים א": "melachim-alef",
    "מלכים ב": "melachim-bet",
    "ישעיהו": "yeshayahu",
    "ירמיהו": "yirmeyahu",
    "יחזקאל": "yechezkel",
    "הושע": "hoshea",
    "יואל": "yoel",
    "עמוס": "amos",
    "עובדיה": "ovadya",
    "יונה": "yona",
    "מיכה": "micha",
    "נחום": "nachum",
    "חבקוק": "chavakuk",
    "צפניה": "tzfanya",
    "חגי": "chagai",
    "זכריה": "zecharia",
    "מלאכי": "malachi",
    "תהילים": "tehilim",
    "תהלים": "tehilim-alt",
    "משלי": "mishlei",
    "איוב": "iyov",
    "שיר השירים": "shir-hashirim",
    "רות": "rut",
    "קהלת": "kohelet",
    "איכה": "eicha",
    "אסתר": "esther",
    "דניאל": "daniel",
    "עזרא": "ezra",
    "נחמיה": "nehemia",
    "דברי הימים": "divrei-hayamim",
    "דברי הימים א": "divrei-hayamim-alef",
    "דברי הימים ב": "divrei-hayamim-bet",
}

def make_safe_name(book: str) -> str:
    return BOOK_SLUG.get(book, book.replace(' ', '-'))

# ── Main ──────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("bnei-zion image batch — Phase 1 (Books)")
    print(f"DRY_RUN={DRY_RUN}")
    print(f"State file: {STATE_FILE}")
    print(f"Total books: {len(BOOK_DESC)}")
    print("=" * 60)

    state = load_state()
    completed = set(state["phase1"]["completed"])
    failed_list = state["phase1"]["failed"]

    count = 0
    skipped = 0
    failed = 0

    books = sorted(BOOK_DESC.keys())

    for i, book in enumerate(books, 1):
        if book in completed:
            print(f"[{i}/{len(books)}] SKIP {book} (already done)")
            skipped += 1
            continue

        print(f"\n[{i}/{len(books)}] {book}")
        desc = BOOK_DESC[book]

        if DRY_RUN:
            print(f"  [DRY RUN] Prompt preview: ...{STYLE[:60]}...")
            print(f"  [DRY RUN] Content: {desc[:100]}...")
            safe_name = make_safe_name(book)
            print(f"  [DRY RUN] Would upload: books/{safe_name}.png")
            print(f"  [DRY RUN] Would UPDATE lessons WHERE bible_book = '{book}'")
            count += 1
            continue

        safe_name = make_safe_name(book)
        storage_path = f"books/{safe_name}.png"

        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp_path = Path(tmp.name)

        try:
            if not generate_image(desc, tmp_path):
                state["phase1"]["failed"].append(book)
                save_state(state)
                failed += 1
                tmp_path.unlink(missing_ok=True)
                continue

            public_url = upload_to_storage(tmp_path, storage_path)
            if not public_url:
                state["phase1"]["failed"].append(book)
                save_state(state)
                failed += 1
                tmp_path.unlink(missing_ok=True)
                continue

            update_lessons_thumbnail(book, public_url)
            state["phase1"]["completed"].append(book)
            state["total_cost"] = round(state["total_cost"] + COST_PER_IMAGE, 4)
            save_state(state)
            count += 1

        finally:
            tmp_path.unlink(missing_ok=True)

        # Rate limit: 7s between requests
        if i < len(books):
            time.sleep(7)

    print("\n" + "=" * 60)
    print(f"Phase 1 complete: {count} generated | {skipped} skipped | {failed} failed")
    print(f"Total cost so far: ${state['total_cost']:.2f}")
    if state["phase1"]["failed"]:
        print(f"Failed: {state['phase1']['failed']}")
    print("=" * 60)

if __name__ == "__main__":
    main()
