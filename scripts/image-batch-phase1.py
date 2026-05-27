#!/usr/bin/env python3
"""
Phase 1 — Book images for bnei-zion
====================================
Generates one watercolor image per unique bible_book (where bible_chapter is NULL).
Uploads to Supabase Storage bnei-zion-thumbnails/books/
Updates lessons.thumbnail_url for matching rows.
Supports resume via scripts/image-batch-state.json.

Vision gate (added 26.5.2026): every generated image is verified by Gemini
Vision (gemini-2.0-flash) for absence of human figures. Up to 3 retries per
book; after 3 failures the book is logged to scripts/rejected-images.json
and skipped (not written to DB).

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

# Vision gate import — works when run from repo root or scripts/ dir
try:
    from lib.vision_gate import verify_no_humans
    from lib.vertex_auth import VertexAuth
except ImportError:
    import sys as _sys
    _sys.path.insert(0, str(Path(__file__).parent))
    from lib.vision_gate import verify_no_humans
    from lib.vertex_auth import VertexAuth

# ── Config — load from environment (never hardcode secrets) ───
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://pzvmwfexeiruelwiujxn.supabase.co")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
MGMT_PAT = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
PROJECT_REF = "pzvmwfexeiruelwiujxn"
BUCKET = "bnei-zion-thumbnails"
COST_PER_IMAGE = 0.06

SCRIPT_DIR = Path(__file__).parent
STATE_FILE = SCRIPT_DIR / "image-batch-state.json"
DRY_RUN = os.environ.get("DRY_RUN", "0") == "1"

# ── Vertex AI auth (initialized once, auto-refreshes every 50 min) ──
_vertex_auth: VertexAuth | None = None

def get_vertex_auth() -> VertexAuth:
    global _vertex_auth
    if _vertex_auth is None:
        _vertex_auth = VertexAuth()
    return _vertex_auth

# ── Style (locked — pilot approved 26.5.2026 · Vision gate added 26.5.2026) ───
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

# ── Book descriptions (English, for Imagen) ──────────────────
BOOK_DESC = {
    # v3-compliant descriptions — approved formula: abstract opening + single delicate element + emotional adjective + negation
    "בראשית": "Abstract spiritual representation of creation and the first dawn. A single soft orb of warm gold light emerging from swirling mist, gentle washes of sage green and warm sand spreading outward. Delicate atmospheric layers, completely soft edges. No human figures, no faces, no letters, no text.",
    "שמות": "Abstract spiritual representation of liberation and divine encounter in the desert. A single luminous pillar of soft light rising from warm desert washes, pale gold and dusty teal mist surrounding it. Quiet, awe-filled atmosphere. No human figures, no faces, no letters, no text.",
    "ויקרא": "Abstract spiritual representation of holiness and priestly sanctity. A single wisp of incense smoke rising through warm gold and pale white washes, soft and ethereal. Intimate, sacred atmosphere. No human figures, no faces, no letters, no text.",
    "במדבר": "Abstract spiritual representation of desert wandering and divine guidance. A single wandering cloud suggested in soft dusty blue-gray washes over warm sand and infinite sky. Vast, tender atmosphere. No human figures, no faces, no letters, no text.",
    "דברים": "Abstract spiritual representation of covenant and the promised land on the horizon. A single distant horizon glowing with warm gold light through soft mountain mist, quiet and contemplative. Subtle, meditative atmosphere. No human figures, no faces, no letters, no text.",
    "יהושע": "Abstract spiritual representation of crossing and homecoming. A single flowing river of soft blue-green dissolving into light, walls of mist parting on either side. Hopeful, luminous atmosphere. No human figures, no faces, no letters, no text.",
    "שופטים": "Abstract spiritual representation of cycles of light and shadow, faith and redemption. Turbulent washes of dark indigo and warm gold, dissolving into soft stillness and quiet light — no arc, no torch, no figure of any kind. Pure abstract color fields. Quiet, hopeful atmosphere. No human figures, no faces, no letters, no text.",
    "שמואל": "Abstract spiritual representation of prophecy and sacred calling in the night. A single lamp of warm amber light glowing softly in darkness, surrounded by royal purple and gold washes. Intimate, reverent atmosphere. No human figures, no faces, no letters, no text.",
    "שמואל א": "Abstract spiritual representation of covenant, the ark, and divine presence. A single radiant doorway of soft golden light in the Tabernacle, delicate warm washes surrounding it. Tender, reverent atmosphere. No human figures, no faces, no letters, no text.",
    "שמואל ב": "Abstract spiritual representation of the emotional depth of a kingdom in its fullness and grief. Warm ochre and dusky rose washes bleeding into pale gold, layers of soft color suggesting depth and feeling. Pure abstract color field — no instruments, no strings, no figures. Complex, intimate atmosphere. No human figures, no faces, no letters, no text.",
    "מלכים": "Abstract spiritual representation of prophetic fire and the fading of ancient light. Deep gold and twilight-indigo washes layered over each other, a glow at the horizon dissolving into soft mist. Pure abstract color fields — no throne, no crown, no flame shape, no figures. Meditative, tender atmosphere. No human figures, no faces, no letters, no text.",
    "מלכים א": "Abstract spiritual representation of Solomon's wisdom and the Temple's radiant glory. A single arch of warm cedar and gold light, architectural grandeur dissolved into soft watercolor. Luminous, intimate atmosphere. No human figures, no faces, no letters, no text.",
    "מלכים ב": "Abstract spiritual representation of exile and lingering hope. A single glowing ember of light on the far horizon, a city dissolving into soft mist and indigo washes. Quiet, tender atmosphere. No human figures, no faces, no letters, no text.",
    "ישעיהו": "Abstract spiritual representation of prophetic vision and messianic light. A single shaft of heavenly light breaking through storm-cloud washes, pure and luminous. Majestic, ethereal atmosphere. No human figures, no faces, no letters, no text.",
    "ירמיהו": "Abstract spiritual representation of grief and the green shoots of hope after destruction. A single green tendril emerging from dark storm washes, delicate and alive. Tender, sorrowful-yet-hopeful atmosphere. No human figures, no faces, no letters, no text.",
    "יחזקאל": "Abstract spiritual representation of divine vision and cosmic renewal. A single radiant wheel of soft light, ethereal and otherworldly, surrounded by gold and celestial blue washes. Awe-filled, meditative atmosphere. No human figures, no faces, no letters, no text.",
    "הושע": "Abstract spiritual representation of faithful love and the call to return. A single soft rose-gold glow suggested in mist, longing and forgiveness woven in warm rose and quiet gold washes. Tender, intimate atmosphere. No human figures, no faces, no letters, no text.",
    "יואל": "Abstract spiritual representation of repentance and the spirit poured like rain. A single drop of light falling into still water, ripples spreading outward in soft blue and green washes. Quiet, restorative atmosphere. No human figures, no faces, no letters, no text.",
    "עמוס": "Abstract spiritual representation of justice and the call to moral living. A single shaft of clear light cutting through heavy washes of dusty earth tones, resolving into stillness. Subtle, serious atmosphere. No human figures, no faces, no letters, no text.",
    "עובדיה": "Abstract spiritual representation of divine justice and Zion's future. A single mountain peak bathed in soft gold light above turbulent indigo washes, victorious and quiet. Delicate, hopeful atmosphere. No human figures, no faces, no letters, no text.",
    "יונה": "Abstract spiritual representation of deep ocean, darkness, and divine compassion. A single luminous orb glowing deep beneath soft ocean-blue washes, then a dawn breaking above. Quiet, tender atmosphere. No human figures, no faces, no letters, no text.",
    "מיכה": "Abstract spiritual representation of justice, mercy, and humble living. A single gentle pathway of warm light through muted earth tones, soft and unhurried. Intimate, quiet atmosphere. No human figures, no faces, no letters, no text.",
    "נחום": "Abstract spiritual representation of divine justice arriving like a storm. A single wave of turbulent water dissolving into mist and clearing light, power becoming stillness. Subtle, serious atmosphere. No human figures, no faces, no letters, no text.",
    "חבקוק": "Abstract spiritual representation of patient faith and luminous trust. A single watchtower silhouette suggested in misty washes, cosmic tension resolving into soft gold light. Quiet, contemplative atmosphere. No human figures, no faces, no letters, no text.",
    "צפניה": "Abstract spiritual representation of judgment giving way to joyful restoration. A single break of golden light piercing dark cloud washes, remnant warmth glowing softly. Delicate, hopeful atmosphere. No human figures, no faces, no letters, no text.",
    "חגי": "Abstract spiritual representation of rebuilding and renewed dedication. A single foundation stone of warm sandstone suggested in soft light, the Temple rising in misty gold above it. Quiet, hopeful atmosphere. No human figures, no faces, no letters, no text.",
    "זכריה": "Abstract spiritual representation of messianic visions and Jerusalem's renewal. A single candelabra of soft gold light dissolved into watercolor dreamscapes, olive branches as delicate washes. Luminous, ethereal atmosphere. No human figures, no faces, no letters, no text.",
    "מלאכי": "Abstract spiritual representation of the final prophet and covenant renewal. A single small flame kept burning at the edge of a setting sun, warm gold dissolving into soft indigo. Tender, contemplative atmosphere. No human figures, no faces, no letters, no text.",
    "תהילים": "Abstract spiritual representation of prayer, praise, and the full emotional range of the human heart reaching toward the divine. A single golden string of light vibrating gently in the center, surrounded by soft watercolor washes of warm gold, quiet lavender, and pale rose. Tender, intimate atmosphere, generous white space. No human figures, no faces, no letters, no text.",
    "תהלים": "Abstract spiritual representation of song, lament, and devotion — the psalms as living prayer. A single lyrical arc of soft warm light rising through pale lavender and rose washes. Quiet, tender atmosphere. No human figures, no faces, no letters, no text.",
    "משלי": "Abstract spiritual representation of wisdom and the Tree of Life. A single branching form of golden light, delicate and luminous, suggested in warm gold washes against soft white space. Intimate, gentle atmosphere. No human figures, no faces, no letters, no text.",
    "איוב": "Abstract spiritual representation of divine encounter through suffering and awe. A single figure-less whirlwind of soft indigo and silver light, immense yet somehow tender. Awe-filled, humble atmosphere. No human figures, no faces, no letters, no text.",
    "שיר השירים": "Abstract spiritual representation of sacred love and the season of blooming. Soft watercolor washes of warm rose, blush pink, and pale gold bleeding into cream-textured paper. Misty atmosphere, abstract organic shapes of foliage and petals in the distance — no human forms, no garden gateway, no figures. Tender and quiet. No human figures, no faces, no letters, no text.",
    "רות": "Abstract spiritual representation of loyalty, kindness, and harvest belonging. Wide warm washes of golden harvest light over flat earth tones — dusty amber, golden wheat-color, soft ochre — suggesting an open field at dusk. Pure abstract color field, no stalks as shapes, no figures, no silhouettes. Warm, quiet atmosphere. No human figures, no faces, no letters, no text.",
    "קהלת": "Abstract spiritual representation of time's cycles and the search for meaning. A single sun arc traced in warm ochre and gold, rivers of soft blue flowing beneath. Contemplative, wise atmosphere. No human figures, no faces, no letters, no text.",
    "איכה": "Abstract spiritual representation of mourning and the first ember of hope. A single candle flame in soft warm gold, ancient stone washes in muted grey and rose around it. Sorrowful, tender atmosphere. No human figures, no faces, no letters, no text.",
    "אסתר": "Abstract spiritual representation of hidden providence and quiet courage. Layered washes of soft purple, midnight blue, and warm gold — depth and mystery without any figure, arch, crown, or throne. Pure abstract color field, luminous center, gentle and mysterious. No human figures, no faces, no letters, no text.",
    "דניאל": "Abstract spiritual representation of faith in exile and celestial vision. A single orb of divine light illuminating deep gold and celestial blue washes, radiant and protected. Awe-filled, ethereal atmosphere. No human figures, no faces, no letters, no text.",
    "עזרא": "Abstract spiritual representation of return from exile and Torah restored. A single scroll-curve of soft warm light unfurling through Jerusalem-gold and sage green washes. Joyful, tender atmosphere. No human figures, no faces, no letters, no text.",
    "נחמיה": "Abstract spiritual representation of rebuilding and communal renewal. A single ancient gate suggested in warm sandstone washes, walls rising in soft light around it. Quiet, hopeful atmosphere. No human figures, no faces, no letters, no text.",
    "דברי הימים": "Abstract spiritual representation of history's arc bending toward the sacred. A single luminous Temple at the center of layered gold and earth-tone washes, generations of light converging. Meditative, grand atmosphere. No human figures, no faces, no letters, no text.",
    "דברי הימים א": "Abstract spiritual representation of sacred lineage and preparation for the Temple. A single arc of living light tracing a family tree, ancient gold and warm sand washes. Delicate, reverent atmosphere. No human figures, no faces, no letters, no text.",
    "דברי הימים ב": "Abstract spiritual representation of the Temple in its full glory and the long arc of faithfulness. A single radiant Temple silhouette suggested in warm gold light, ending with a horizon of hope. Luminous, tender atmosphere. No human figures, no faces, no letters, no text.",
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

# ── Imagen generation via Vertex AI ──────────────────────────
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

    auth = get_vertex_auth()

    for attempt in range(3):
        token = auth.get_token()
        url = auth.endpoint

        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
            tmp_path = tmp.name

        result = run_curl([
            "-s", "-o", tmp_path, "-w", "%{http_code}",
            "-X", "POST", url,
            "-H", "Content-Type: application/json",
            "-H", f"Authorization: Bearer {token}",
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
        elif http_code == "401":
            # Token expired mid-batch — force refresh and retry
            print(f"  [AUTH] 401 Unauthorized — force-refreshing token (attempt {attempt+1}/3)")
            os.unlink(tmp_path)
            auth._refresh()
            time.sleep(2)
        elif http_code == "429":
            wait = 10 * (attempt + 1)  # 10s / 20s / 30s — Vertex Tier 1 has 100 RPM, not 1/min
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
            # ── Generate + Vision gate (up to VISION_MAX_RETRIES) ───
            vision_passed = False
            for vision_attempt in range(1, VISION_MAX_RETRIES + 1):
                if not generate_image(desc, tmp_path):
                    print(f"  [FAIL] Image generation failed (attempt {vision_attempt}/{VISION_MAX_RETRIES})")
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
                        print(f"  [VISION RETRY] Re-generating...")
                        time.sleep(30)

            if not vision_passed:
                print(f"  [SKIP] {book} — all {VISION_MAX_RETRIES} vision attempts failed. Logged to rejected-images.json")
                if book not in state["phase1"]["failed"]:
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
            save_state(state)
            count += 1

        finally:
            tmp_path.unlink(missing_ok=True)

        # Vertex Tier 1 — 100 RPM, no need for long sleep
        if i < len(books):
            time.sleep(2)

    print("\n" + "=" * 60)
    print(f"Phase 1 complete: {count} generated | {skipped} skipped | {failed} failed")
    print(f"Total cost so far: ${state['total_cost']:.2f}")
    if state["phase1"]["failed"]:
        print(f"Failed: {state['phase1']['failed']}")
    print("=" * 60)

if __name__ == "__main__":
    main()
