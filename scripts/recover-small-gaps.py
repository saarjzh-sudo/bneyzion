#!/usr/bin/env python3
"""
recover-small-gaps.py
=====================
Recovers remaining small gaps:
  - איך לומדים תנ"ך: 5 accessible lessons
  - נושאים כלליים: real accessible lessons
  - Skips nodes with HTTP 400/404

Usage:
  DRY_RUN=1 python3 scripts/recover-small-gaps.py   # preview
  DRY_RUN=0 python3 scripts/recover-small-gaps.py   # execute
"""

import json, os, re, subprocess, sys, time, uuid, unicodedata
from urllib.parse import quote, unquote
from pathlib import Path

SUPABASE_TOKEN = os.environ.get("SUPABASE_MANAGEMENT_API_TOKEN")
PROJECT_REF = "pzvmwfexeiruelwiujxn"
DRY_RUN = os.environ.get("DRY_RUN", "1") == "1"
SCRIPTS_DIR = Path(__file__).parent


def sql_query(query):
    payload = json.dumps({"query": query})
    cmd = ["curl", "--noproxy", "*", "-s",
           "-H", f"Authorization: Bearer {SUPABASE_TOKEN}",
           "-H", "Content-Type: application/json",
           "-X", "POST",
           f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
           "-d", payload]
    result = subprocess.run(cmd, capture_output=True, text=True,
                           env={**os.environ, "HTTPS_PROXY": "", "HTTP_PROXY": ""})
    try:
        d = json.loads(result.stdout)
        return [] if isinstance(d, dict) else d
    except:
        return []


def check_url(url_path):
    """Return HTTP status code for a URL path on old site."""
    encoded = quote(url_path, safe="/")
    full_url = f"https://www.bneyzion.co.il{encoded}"
    result = subprocess.run(
        ["curl", "--noproxy", "*", "-s", "-o", "/dev/null", "-w", "%{http_code}", "-L", full_url],
        capture_output=True, text=True,
        env={**os.environ, "HTTPS_PROXY": "", "HTTP_PROXY": ""},
    )
    return result.stdout.strip()


def scrape_media(url_path):
    """Scrape page and return audio/video/pdf URLs."""
    encoded = quote(url_path, safe="/")
    full_url = f"https://www.bneyzion.co.il{encoded}"
    result = subprocess.run(
        ["curl", "--noproxy", "*", "-s", "-L", "-H", "Accept: text/html", full_url],
        capture_output=True, text=True,
        env={**os.environ, "HTTPS_PROXY": "", "HTTP_PROXY": ""},
    )
    html = result.stdout

    # Audio: S3 URLs (both bucket styles)
    audio = list(dict.fromkeys(re.findall(
        r'https://(?:bneyzion\.)?s3[^"\'<>\s]+\.mp3', html)))

    # PDFs
    pdfs = list(dict.fromkeys(re.findall(
        r'https?://[^"\'<>\s]+\.pdf', html, re.IGNORECASE)))

    # VP4 embed
    vp4 = re.findall(r'embed\.vp4\.me/LandingPage,([^,]+),(\d+)', html)
    video_url = f"https://embed.vp4.me/LandingPage,{vp4[0][0]},{vp4[0][1]}.aspx" if vp4 else None

    return {"audio": audio, "pdfs": pdfs, "video": video_url, "size": len(html)}


def esc(v):
    if v is None:
        return "NULL"
    if isinstance(v, str):
        return "'" + v.replace("'", "''") + "'"
    return "NULL"


def norm(s):
    s = "".join(c for c in s if not (0x0591 <= ord(c) <= 0x05C7))
    s = unicodedata.normalize("NFC", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


# ─── Lesson definitions ───────────────────────────────────────────────────────

LESSONS_TO_INSERT = [
    # ==== איך לומדים תנ"ך — 5 accessible ====
    {
        "title": 'הרב זלמן מלמד על לימוד תנ"ך',
        "url": "/מאגר-השיעורים-והמאמרים/איך-לומדים-תנך/הגישה-הראויה-ללימוד-תנך/הרב-זלמן-מלמד-על-לימוד-תנך/",
        "series_id": "8f089f22-3ccf-443d-8fc6-7ffe353e379d",
        "bible_book": None,
    },
    {
        "title": 'הגישה הראויה ללימוד תנ"ך',
        "url": "/מאגר-השיעורים-והמאמרים/איך-לומדים-תנך/הגישה-הראויה-ללימוד-תנך/הגישה-הראויה-ללימוד-תנך/",
        "series_id": "8f089f22-3ccf-443d-8fc6-7ffe353e379d",
        "bible_book": None,
    },
    {
        "title": "אם ראשונים כמלאכים",
        "url": "/מאגר-השיעורים-והמאמרים/איך-לומדים-תנך/היחס-הראוי-לאבות-ולחטאיהם/אם-ראשונים-כמלאכים/",
        "series_id": "224f701b-a542-42ff-a784-533ac7ccc112",
        "bible_book": None,
    },
    {
        "title": "היחס הראוי לאבות ולחטאיהם",
        "url": "/מאגר-השיעורים-והמאמרים/איך-לומדים-תנך/היחס-הראוי-לאבות-ולחטאיהם/היחס-הראוי-לאבות-ולחטאיהם/",
        "series_id": "224f701b-a542-42ff-a784-533ac7ccc112",
        "bible_book": None,
    },
    {
        "title": 'דרכי הפרשנות והמדרש בתנ"ך',
        "url": "/מאגר-השיעורים-והמאמרים/איך-לומדים-תנך/דרכי-הפרשנות-והמדרש-בתנך/דרכי-הפרשנות-והמדרש-בתנך/",
        "series_id": "2015e21e-be07-4800-8d15-eb19387d65d6",
        "bible_book": None,
    },
    # ==== נושאים כלליים — accessible lessons ====
    {
        "title": "אין עוד גלות לאחר הגאולה העתידה",
        "url": "/מאגר-השיעורים-והמאמרים/נושאים-כלליים-בתנך/גלות-וגאולה/אין-עוד-גלות-לאחר-הגאולה-העתידה/",
        "series_id": None,  # Will be looked up
        "series_title": "גלות וגאולה",
        "bible_book": None,
    },
    {
        "title": "עשרת העיקרים של מלחמת גוג ומגוג",
        "url": "/מאגר-השיעורים-והמאמרים/נושאים-כלליים-בתנך/מלחמת-גוג-ומגוג/עשרת-העיקרים-של-מלחמת-גוג-ומגוג/",
        "series_id": None,
        "series_title": "מלחמת גוג ומגוג",
        "bible_book": None,
    },
    {
        "title": "ההבדל בין נבואה לרוח הקודש",
        "url": "/מאגר-השיעורים-והמאמרים/נושאים-כלליים-בתנך/נבואה-ונביאים/ההבדל-בין-נבואה-לרוח-הקודש/",
        "series_id": None,
        "series_title": "נבואה ונביאים",
        "bible_book": None,
    },
    {
        "title": "הסבר פשוט על מבנה ארץ ישראל",
        "url": "/מאגר-השיעורים-והמאמרים/נושאים-כלליים-בתנך/ארץ-ישראל/הסבר-פשוט-על-מבנה-ארץ-ישראל/",
        "series_id": None,
        "series_title": "ארץ ישראל",
        "bible_book": None,
    },
    {
        "title": "בית המקדש והכהנים",
        "url": "/מאגר-השיעורים-והמאמרים/נושאים-כלליים-בתנך/בית-המקדש-והכהנים/בית-המקדש-והכהנים/",
        "series_id": None,
        "series_title": "בית המקדש והכהנים",
        "bible_book": None,
    },
]

# Blockers — not accessible
BLOCKERS = [
    ("איך לומדים תנ\"ך?", "HTTP 400 — ? in path"),
    ('הרב זלמן מלמד על לימוד תנ"ך (question mark URL)', "HTTP 400"),
    ("לכו אצל אבותיכם", "HTTP 404 — not published on old site"),
    ('מדוע התורה שבעל פה לא מובנת מפשיטות', "HTTP 400 — ? in path"),
    # כלי עזר — pipe char in URL = IIS 500
    ("ציר זמן - תקופת המלכים | כמות מידע מינימלית", "HTTP 500 — | char in URL"),
    ("ציר זמן - תקופת המלכים | כמות מידע בינונית", "HTTP 500 — | char in URL"),
    ("ציר זמן - תקופת המלכים | כל המידע", "HTTP 500 — | char in URL"),
    # חגי — פ (4)-(15) = 404
    *[(f"חגי פ ({n})", "HTTP 404 — not published") for n in range(4, 16)],
    # נושאים כלליים — artifact nodes
    ("פרק (1) (4)", "Umbraco artifact node — 404"),
    ("פרק (1) (5)", "Umbraco artifact node — 404"),
]


def resolve_series(lesson):
    """Look up series_id by title if not set."""
    if lesson.get("series_id"):
        return lesson["series_id"]
    series_title = lesson.get("series_title")
    if not series_title:
        return None
    rows = sql_query(f"SELECT id FROM series WHERE title = {esc(series_title)} LIMIT 1")
    return rows[0]["id"] if rows else None


def main():
    print(f"recover-small-gaps.py  DRY_RUN={DRY_RUN}")
    print("=" * 60)

    # First check which lessons are already in Supabase
    existing_rows = sql_query("SELECT title FROM lessons WHERE status = 'published'")
    import unicodedata as _u
    existing_normed = {norm(r["title"]) for r in existing_rows}
    print(f"Existing Supabase published lessons: {len(existing_rows)}")

    inserted = 0
    skipped_exists = 0
    skipped_blocked = 0
    log = []

    for i, lesson in enumerate(LESSONS_TO_INSERT, 1):
        title = lesson["title"]

        # Skip if already exists
        if norm(title) in existing_normed:
            print(f"  [{i}/{len(LESSONS_TO_INSERT)}] SKIP (already exists): '{title}'")
            skipped_exists += 1
            continue

        # Check URL accessibility
        status = check_url(lesson["url"])
        if status not in ("200",):
            print(f"  [{i}/{len(LESSONS_TO_INSERT)}] SKIP HTTP {status}: '{title}'")
            skipped_blocked += 1
            log.append({"title": title, "status": f"skipped_http_{status}", "url": lesson["url"]})
            continue

        # Resolve series
        series_id = resolve_series(lesson)

        # Scrape media
        scraped = scrape_media(lesson["url"])
        audio_url = scraped["audio"][0] if scraped["audio"] else None
        pdf_url = scraped["pdfs"][0] if scraped["pdfs"] else None
        video_url = scraped["video"]
        source_type = "video" if video_url else ("audio" if audio_url else ("pdf" if pdf_url else "text"))

        print(f"  [{i}/{len(LESSONS_TO_INSERT)}] {'WOULD INSERT' if DRY_RUN else 'INSERT'}: '{title}'")
        print(f"    series_id: {series_id}")
        print(f"    source: {source_type}")
        if audio_url:
            print(f"    audio: {unquote(audio_url).split('/')[-1]}")
        if video_url:
            print(f"    video: {video_url[:60]}")
        if pdf_url:
            print(f"    pdf: {pdf_url[-50:]}")

        if not DRY_RUN:
            lesson_id = str(uuid.uuid4())
            sql = f"""
                INSERT INTO lessons (id, title, status, series_id, bible_book, source_type, audio_url, video_url, attachment_url, content)
                VALUES (
                    {esc(lesson_id)},
                    {esc(title)},
                    'published',
                    {esc(series_id)},
                    {esc(lesson.get("bible_book"))},
                    {esc(source_type)},
                    {esc(audio_url)},
                    {esc(video_url)},
                    {esc(pdf_url)},
                    NULL
                )
                ON CONFLICT (id) DO NOTHING
            """
            result = sql_query(sql.strip())
            log.append({
                "title": title, "id": lesson_id, "status": "inserted",
                "series_id": series_id, "source_type": source_type,
                "audio_url": audio_url, "video_url": video_url,
            })
            inserted += 1
        else:
            inserted += 1  # Count as "would insert" for dry run

        time.sleep(0.3)

    print(f"\n{'DRY RUN — ' if DRY_RUN else ''}Inserted: {inserted} | Already existed: {skipped_exists} | Blocked: {skipped_blocked}")

    print(f"\n{'='*60}")
    print("BLOCKERS (not recoverable via scraping):")
    for title, reason in BLOCKERS:
        print(f"  BLOCKED: '{title}' — {reason}")

    if not DRY_RUN:
        log_path = SCRIPTS_DIR / "recover-small-gaps-log.json"
        json.dump(log, open(log_path, "w"), ensure_ascii=False, indent=2)
        print(f"\nLog saved: {log_path}")


if __name__ == "__main__":
    main()
