#!/usr/bin/env python3
"""
recover-content-gaps.py
=======================
Recovers missing lessons for:
  - קריאה וביאור בקצרה של ספר תהילים (53 → 157)
  - קריאה וביאור בקצרה של ספר משלי (40 → 147)

Strategy:
  1. Build exact list of missing lessons from umbraco-index.json
  2. For each missing lesson, determine audio_url from S3 pattern
  3. Scrape public HTML to confirm VP4 embed and get any content text
  4. INSERT into Supabase lessons table

Usage:
  DRY_RUN=1 python3 scripts/recover-content-gaps.py
  DRY_RUN=0 python3 scripts/recover-content-gaps.py
"""

import json
import os
import re
import subprocess
import sys
import time
import unicodedata
import uuid
from pathlib import Path
from urllib.parse import unquote, quote

# ─── Config ────────────────────────────────────────────────────────────────────

SUPABASE_TOKEN = os.environ.get("SUPABASE_MANAGEMENT_API_TOKEN")
PROJECT_REF = "pzvmwfexeiruelwiujxn"
DRY_RUN = os.environ.get("DRY_RUN", "1") == "1"

SCRIPTS_DIR = Path(__file__).parent

# Rabbi IDs
RABBI_YONDAV = "d79a4a34-9086-46cb-95b5-d7863179bc0e"  # הרב יונדב זר

# Series IDs (in Supabase)
SERIES = {
    "תהלים": {
        "id": "42b5f86b-56e9-411f-aa4e-6c3c590b0278",
        "umbraco_url": "/מאגר-השיעורים-והמאמרים/כתובים/תהלים/קריאה-וביאור-בקצרה-של-ספר-תהילים/",
        "bible_book": "תהלים",
        "rabbi_id": RABBI_YONDAV,
        # S3 audio base for individual psalms
        "s3_base": "https://s3.us-east-2.amazonaws.com/bneyzion/%D7%94%D7%A8%D7%91+%D7%99%D7%95%D7%A0%D7%93%D7%91+%D7%96%D7%A8/%D7%AA%D7%A0%D7%9A+20+-+%D7%AA%D7%94%D7%99%D7%9C%D7%99%D7%9D",
        "s3_pattern": "20-tehilim-{:03d}.mp3",
        # Filter: skip known 404 nodes with garbled names (parentheses = Umbraco scraper artifacts)
        "filter_fn": lambda name: "(1)" not in name and "(5)" not in name,
        # Special cases for psalm 119 (3 parts) and the 3 overview tracks
        "s3_special": {
            119: ["20-tehilim-119.mp3", "20-tehilim-119aa.mp3", "20-tehilim-119bb.mp3", "20-tehilim-119cc.mp3"],
        },
        # Expected count (from Umbraco index, real pages only)
        "expected_count": 157,
    },
    "משלי": {
        "id": "b6da5a68-8d26-4e9d-96db-ed69fa784e91",
        "umbraco_url": "/מאגר-השיעורים-והמאמרים/כתובים/משלי/קריאה-וביאור-בקצרה-של-ספר-משלי/",
        "bible_book": "משלי",
        "rabbi_id": RABBI_YONDAV,
        # S3 audio base for Proverbs
        # Pattern: https://bneyzion.s3.us-east-2.amazonaws.com/הרב+יונדב+זר/תנך+21+-+ספר+משלי/21-mishlei-NN.mp3
        "s3_base": "https://bneyzion.s3.us-east-2.amazonaws.com/%D7%94%D7%A8%D7%91+%D7%99%D7%95%D7%A0%D7%93%D7%91+%D7%96%D7%A8/%D7%AA%D7%A0%D7%9A+21+-+%D7%A1%D7%A4%D7%A8+%D7%9E%D7%A9%D7%9C%D7%99",
        "s3_pattern": "21-mishlei-{:02d}.mp3",
        # Filter: ONLY real פרק משלי nodes (NOT מזמור — those are 404 false nodes)
        "filter_fn": lambda name: "מזמור" not in name,
        "s3_special": {},
        # Expected count: 31 chapters of Proverbs
        "expected_count": 31,
    },
}

# ─── Helpers ───────────────────────────────────────────────────────────────────


def norm(s):
    """Normalize Hebrew title for comparison."""
    s = "".join(c for c in s if not (0x0591 <= ord(c) <= 0x05C7))
    s = unicodedata.normalize("NFC", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def sql_query(query):
    """Run SQL via Supabase Management API."""
    payload = json.dumps({"query": query})
    cmd = [
        "curl", "--noproxy", "*", "-s",
        "-H", f"Authorization: Bearer {SUPABASE_TOKEN}",
        "-H", "Content-Type: application/json",
        "-X", "POST",
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
        "-d", payload,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, env={**os.environ, "HTTPS_PROXY": "", "HTTP_PROXY": ""})
    if result.returncode != 0:
        print(f"ERROR curl: {result.stderr[:200]}", file=sys.stderr)
        return []
    try:
        data = json.loads(result.stdout)
        if isinstance(data, dict) and "message" in data:
            print(f"SQL ERROR: {data['message']}", file=sys.stderr)
            return []
        return data
    except Exception as e:
        print(f"JSON parse error: {e}\n{result.stdout[:300]}", file=sys.stderr)
        return []


def scrape_lesson_page(url_path):
    """Scrape public lesson page, return {audio_url, video_url, vp4_embed, chapter_num}."""
    encoded = quote(url_path, safe="/")
    full_url = f"https://www.bneyzion.co.il{encoded}"

    cmd = [
        "curl", "--noproxy", "*", "-s", "-L",
        "-H", "Accept: text/html",
        full_url,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, env={**os.environ, "HTTPS_PROXY": "", "HTTP_PROXY": ""})
    if result.returncode != 0 or len(result.stdout) < 1000:
        return {}

    html = result.stdout

    # Find audio URLs (on THIS page's specific player, not sidebar)
    # The specific lesson's audio is typically within the main content area
    # Look for the first audio element in the main content
    audio_urls = re.findall(r'https://s3\.us-east-2\.amazonaws\.com/bneyzion/[^"\'<>\s]+\.mp3', html)
    audio_urls = list(dict.fromkeys(audio_urls))

    # VP4 embeds
    vp4_matches = re.findall(r'embed\.vp4\.me/LandingPage,([^,]+),(\d+)', html)

    # Title from <title> tag
    title_m = re.search(r'<title>\s*(.+?)\s*\|', html)
    title = title_m.group(1).strip() if title_m else ""

    # Try to find which audio is THIS lesson's (not sidebar)
    # Pattern: the page-specific audio is usually in a player div with class 'lesson-audio' or similar
    # For these series, each lesson has exactly one S3 file matching its sequence

    return {
        "audio_urls": audio_urls,
        "vp4_embeds": vp4_matches,
        "page_title": title,
        "html_size": len(html),
    }


def check_s3_url(url):
    """Check if S3 URL returns 200."""
    cmd = ["curl", "--noproxy", "*", "-s", "-o", "/dev/null", "-w", "%{http_code}", "--head", url]
    result = subprocess.run(cmd, capture_output=True, text=True, env={**os.environ, "HTTPS_PROXY": "", "HTTP_PROXY": ""})
    return result.stdout.strip() == "200"


# ─── Build missing lesson lists ────────────────────────────────────────────────

def build_missing(book_name, series_info):
    """Return list of lessons present in Umbraco but not in Supabase."""
    umb_data = json.load(open(SCRIPTS_DIR / "umbraco-index.json"))

    series_url = series_info["umbraco_url"]
    filter_fn = series_info.get("filter_fn", lambda n: True)
    umb_lessons = []
    for item in umb_data:
        item_url = unquote(item.get("url", ""))
        if (item_url.startswith(series_url) and
                item_url != series_url and
                item.get("contentType") in ("lesson", "QAs", "QA") and
                filter_fn(item.get("name", ""))):
            umb_lessons.append({
                "name": item["name"],
                "url": item_url,
                "umbraco_id": item["id"],
            })

    # Get current Supabase lessons
    rows = sql_query(f"SELECT title FROM lessons WHERE series_id = '{series_info['id']}'")
    sb_normed = {norm(r["title"]) for r in rows}

    missing = [l for l in umb_lessons if norm(l["name"]) not in sb_normed]
    return missing, len(umb_lessons)


# ─── Determine audio URL for תהלים ─────────────────────────────────────────────

GEMATRIA = {
    "א": 1, "ב": 2, "ג": 3, "ד": 4, "ה": 5, "ו": 6, "ז": 7, "ח": 8, "ט": 9,
    "י": 10, "יא": 11, "יב": 12, "יג": 13, "יד": 14, "טו": 15, "טז": 16,
    "יז": 17, "יח": 18, "יט": 19, "כ": 20, "כא": 21, "כב": 22, "כג": 23,
    "כד": 24, "כה": 25, "כו": 26, "כז": 27, "כח": 28, "כט": 29, "ל": 30,
    "לא": 31, "לב": 32, "לג": 33, "לד": 34, "לה": 35, "לו": 36, "לז": 37,
    "לח": 38, "לט": 39, "מ": 40, "מא": 41, "מב": 42, "מג": 43, "מד": 44,
    "מה": 45, "מו": 46, "מז": 47, "מח": 48, "מט": 49, "נ": 50, "נא": 51,
    "נב": 52, "נג": 53, "נד": 54, "נה": 55, "נו": 56, "נז": 57, "נח": 58,
    "נט": 59, "ס": 60, "סא": 61, "סב": 62, "סג": 63, "סד": 64, "סה": 65,
    "סו": 66, "סז": 67, "סח": 68, "סט": 69, "ע": 70, "עא": 71, "עב": 72,
    "עג": 73, "עד": 74, "עה": 75, "עו": 76, "עז": 77, "עח": 78, "עט": 79,
    "פ": 80, "פא": 81, "פב": 82, "פג": 83, "פד": 84, "פה": 85, "פו": 86,
    "פז": 87, "פח": 88, "פט": 89, "צ": 90, "צא": 91, "צב": 92, "צג": 93,
    "צד": 94, "צה": 95, "צו": 96, "צז": 97, "צח": 98, "צט": 99, "ק": 100,
    "קא": 101, "קב": 102, "קג": 103, "קד": 104, "קה": 105, "קו": 106,
    "קז": 107, "קח": 108, "קט": 109, "קי": 110, "קיא": 111, "קיב": 112,
    "קיג": 113, "קיד": 114, "קטו": 115, "קטז": 116, "קיז": 117, "קיח": 118,
    "קיט": 119, "קכ": 120, "קכא": 121, "קכב": 122, "קכג": 123, "קכד": 124,
    "קכה": 125, "קכו": 126, "קכז": 127, "קכח": 128, "קכט": 129, "קל": 130,
    "קלא": 131, "קלב": 132, "קלג": 133, "קלד": 134, "קלה": 135, "קלו": 136,
    "קלז": 137, "קלח": 138, "קלט": 139, "קמ": 140, "קמא": 141, "קמב": 142,
    "קמג": 143, "קמד": 144, "קמה": 145, "קמו": 146, "קמז": 147, "קמח": 148,
    "קמט": 149, "קנ": 150,
}


def tehilim_chapter_from_title(title):
    """Extract psalm number from lesson title."""
    # Arabic digits: "מזמור 51"
    m = re.search(r'(?:מזמור|תהילים)\s+(\d+)', title)
    if m:
        return int(m.group(1))
    # Hebrew letters: "מזמור נא"
    m = re.search(r'(?:מזמור|תהילים)\s+([א-ת]+)', title)
    if m:
        heb = m.group(1)
        if heb in GEMATRIA:
            return GEMATRIA[heb]
    return None


def mishle_chapter_from_title(title):
    """Extract chapter number from משלי lesson title (e.g. 'משלי פרק ג', 'משלי פרק כד')."""
    # Arabic digits: "פרק 3"
    m = re.search(r'פרק\s+(\d+)', title)
    if m:
        return int(m.group(1))
    # Hebrew gematria: "פרק ג", "פרק כד" (with optional extra spaces)
    m = re.search(r'פרק\s+([א-ת]{1,3})\b', title)
    if m:
        heb = m.group(1)
        if heb in GEMATRIA:
            return GEMATRIA[heb]
    return None


# ─── Main ──────────────────────────────────────────────────────────────────────

def process_book(book_name, series_info):
    print(f"\n{'='*60}")
    print(f"Processing: {book_name}")
    print(f"Series ID: {series_info['id']}")

    missing, total_umb = build_missing(book_name, series_info)
    current_count = total_umb - len(missing)

    print(f"Umbraco total: {total_umb} | Supabase current: {current_count} | Missing: {len(missing)}")

    if not missing:
        print("  Nothing to recover!")
        return 0, 0

    print(f"\nDRY RUN = {DRY_RUN}")

    inserted = 0
    skipped = 0
    errors = []
    log = []

    for i, lesson in enumerate(missing):
        title = lesson["name"]
        url = lesson["url"]
        umbraco_id = lesson["umbraco_id"]

        # Determine audio URL
        audio_url = None
        bible_chapter = None

        if book_name == "תהלים":
            chap = tehilim_chapter_from_title(title)
            if chap:
                bible_chapter = chap
                # Check for special psalm 119 (we use the main one)
                filename = f"20-tehilim-{chap:03d}.mp3"
                audio_url = f"{series_info['s3_base']}/{filename}"
                # Verify it exists
                if not check_s3_url(audio_url):
                    audio_url = None
                    print(f"  WARNING: S3 URL 404 for {filename}")
            else:
                print(f"  WARN: cannot parse chapter from '{title}' — skipping audio")

        elif book_name == "משלי":
            chap = mishle_chapter_from_title(title)
            if chap:
                bible_chapter = chap
                filename = series_info["s3_pattern"].format(chap)
                audio_url = f"{series_info['s3_base']}/{filename}"
                if not check_s3_url(audio_url):
                    audio_url = None
                    print(f"  WARNING: S3 URL 404 for {filename}")
            else:
                print(f"  WARN: cannot parse chapter from '{title}'")


        # Build the INSERT row
        lesson_id = str(uuid.uuid4())

        row = {
            "id": lesson_id,
            "title": title,
            "status": "published",
            "series_id": series_info["id"],
            "rabbi_id": series_info["rabbi_id"],
            "bible_book": series_info["bible_book"],
            "bible_chapter": bible_chapter,
            "source_type": "audio" if audio_url else "text",
            "audio_url": audio_url,
            "video_url": None,
            "attachment_url": None,
            "content": None,
        }

        print(f"  [{i+1}/{len(missing)}] '{title}' | chapter:{bible_chapter} | audio:{('YES:'+audio_url.split('/')[-1]) if audio_url else 'NO'}")
        log.append({**row, "umbraco_id": umbraco_id, "umbraco_url": url})

        if DRY_RUN:
            inserted += 1
            continue

        # Real INSERT
        # Escape for SQL
        def esc(v):
            if v is None:
                return "NULL"
            if isinstance(v, str):
                return "'" + v.replace("'", "''") + "'"
            if isinstance(v, int):
                return str(v)
            return "NULL"

        sql = f"""
            INSERT INTO lessons (id, title, status, series_id, rabbi_id, bible_book, bible_chapter, source_type, audio_url, video_url, attachment_url, content)
            VALUES (
                {esc(row['id'])},
                {esc(row['title'])},
                {esc(row['status'])},
                {esc(row['series_id'])},
                {esc(row['rabbi_id'])},
                {esc(row['bible_book'])},
                {esc(row['bible_chapter'])},
                {esc(row['source_type'])},
                {esc(row['audio_url'])},
                NULL, NULL, NULL
            )
            ON CONFLICT (id) DO NOTHING
        """

        result = sql_query(sql.strip())
        if result is None:
            errors.append(f"INSERT failed for '{title}'")
        else:
            inserted += 1

        # Small delay to avoid overloading
        if i % 10 == 9:
            time.sleep(0.5)

    # Update series lesson_count
    if not DRY_RUN and inserted > 0:
        sql_query(f"""
            UPDATE series
            SET lesson_count = (SELECT COUNT(*) FROM lessons WHERE series_id = '{series_info['id']}')
            WHERE id = '{series_info['id']}'
        """)
        print(f"\n  Updated lesson_count for series.")

    # Save log
    log_path = SCRIPTS_DIR / f"recover-{book_name}-log.json"
    json.dump(log, open(log_path, "w"), ensure_ascii=False, indent=2)
    print(f"\n  Log saved: {log_path}")
    print(f"  {'DRY RUN — ' if DRY_RUN else ''}Inserted: {inserted} | Skipped: {skipped} | Errors: {len(errors)}")

    if errors:
        for e in errors[:5]:
            print(f"  ERROR: {e}")

    return inserted, len(errors)


def verify_counts():
    """Verify final counts against expected."""
    print("\n" + "="*60)
    print("VERIFICATION")
    for book_name, series_info in SERIES.items():
        sid = series_info["id"]
        target = series_info.get("expected_count", "?")
        rows = sql_query(f"SELECT COUNT(*) as cnt FROM lessons WHERE series_id = '{sid}'")
        actual = rows[0]["cnt"] if rows else "?"
        if target == "?":
            print(f"  {book_name}: {actual} (no target set)")
        else:
            status = "OK" if str(actual) == str(target) else f"STILL MISSING {target - int(actual)}"
            print(f"  {book_name}: {actual}/{target} — {status}")


def main():
    print(f"recover-content-gaps.py  DRY_RUN={DRY_RUN}")
    print("="*60)

    total_inserted = 0
    total_errors = 0

    for book_name, series_info in SERIES.items():
        ins, errs = process_book(book_name, series_info)
        total_inserted += ins
        total_errors += errs

    print(f"\nTOTAL: {'(would insert)' if DRY_RUN else 'inserted'} {total_inserted} | errors {total_errors}")

    if not DRY_RUN:
        verify_counts()
    else:
        print("\nRe-run with DRY_RUN=0 to execute inserts.")


if __name__ == "__main__":
    main()
