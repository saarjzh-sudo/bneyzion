#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fill-teacher-attachments.py
============================
שלב 1: ספירה + פילוח של שיעורי מורים ריקים (published, audience_tags⊇teachers, ללא attachment/audio/video).
שלב 2: דגימה מייצגת (~10 שיעורים על פני 4-5 ספרים).
שלב 3 (אחרי אישור): ריצה מלאה.

Usage:
    # ספירה בלבד:
    SUPABASE_MANAGEMENT_API_TOKEN=sbp_... env -u HTTPS_PROXY -u HTTP_PROXY python3 scripts/fill-teacher-attachments.py --count

    # דגימה (10 שיעורים מ-5 ספרים):
    SUPABASE_MANAGEMENT_API_TOKEN=sbp_... env -u HTTPS_PROXY -u HTTP_PROXY python3 scripts/fill-teacher-attachments.py --sample

    # ריצה מלאה (רק אחרי אישור סאר):
    SUPABASE_MANAGEMENT_API_TOKEN=sbp_... env -u HTTPS_PROXY -u HTTP_PROXY python3 scripts/fill-teacher-attachments.py --run

    # dry-run (לא כותב ל-DB):
    SUPABASE_MANAGEMENT_API_TOKEN=sbp_... env -u HTTPS_PROXY -u HTTP_PROXY python3 scripts/fill-teacher-attachments.py --run --dry-run
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
import unicodedata
from pathlib import Path
from urllib.parse import quote

# ============================================================
# Config
# ============================================================
PROJECT_REF = "pzvmwfexeiruelwiujxn"
OLD_SITE = "https://www.bneyzion.co.il"
SCRIPTS_DIR = Path(__file__).parent

SUPABASE_PAT = os.environ.get("SUPABASE_MANAGEMENT_API_TOKEN", "")
if not SUPABASE_PAT:
    print("ERROR: SUPABASE_MANAGEMENT_API_TOKEN env var required", file=sys.stderr)
    sys.exit(1)

DRY_RUN = "--dry-run" in sys.argv
MODE_COUNT = "--count" in sys.argv
MODE_SAMPLE = "--sample" in sys.argv
MODE_RUN = "--run" in sys.argv

if not (MODE_COUNT or MODE_SAMPLE or MODE_RUN):
    print("Usage: script.py --count | --sample | --run [--dry-run]", file=sys.stderr)
    sys.exit(1)

# ============================================================
# Supabase helpers (Management API — no direct service_role)
# ============================================================

def sql_query(q: str) -> list:
    """Run SQL via Supabase Management API."""
    result = subprocess.run([
        "curl", "--noproxy", "*", "-s",
        "-H", f"Authorization: Bearer {SUPABASE_PAT}",
        "-H", "Content-Type: application/json",
        "-X", "POST",
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
        "-d", json.dumps({"query": q})
    ], capture_output=True, text=True, timeout=60)
    try:
        data = json.loads(result.stdout)
        if isinstance(data, dict) and "message" in data:
            print(f"  SQL ERROR: {data['message'][:200]}", file=sys.stderr)
            return []
        return data if isinstance(data, list) else []
    except Exception as e:
        print(f"  JSON error: {e} | raw: {result.stdout[:200]}", file=sys.stderr)
        return []


def sql_exec(q: str) -> dict:
    """Execute a write SQL statement, return raw response."""
    result = subprocess.run([
        "curl", "--noproxy", "*", "-s",
        "-H", f"Authorization: Bearer {SUPABASE_PAT}",
        "-H", "Content-Type: application/json",
        "-X", "POST",
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
        "-d", json.dumps({"query": q})
    ], capture_output=True, text=True, timeout=60)
    try:
        return json.loads(result.stdout)
    except Exception as e:
        return {"error": str(e), "raw": result.stdout[:200]}

# ============================================================
# Old-site helpers
# ============================================================

_page_cache: dict[str, str | None] = {}


def fetch_html(url: str) -> str | None:
    if url in _page_cache:
        return _page_cache[url]
    safe_url = url.replace('"', '%22')
    result = subprocess.run([
        "curl", "--noproxy", "*", "-sL", "--max-time", "30",
        "-A", "Mozilla/5.0", safe_url
    ], capture_output=True, timeout=35, errors='replace')
    html = result.stdout.decode("utf-8", errors="replace") if isinstance(result.stdout, bytes) else result.stdout
    if not html or len(html) < 500 or ("Page not found" in html and len(html) < 2000):
        html = None
    _page_cache[url] = html
    return html


def normalize(s: str) -> str:
    if not s:
        return ""
    s = s.strip()
    # Remove nikud
    s = ''.join(c for c in s if not (0x0591 <= ord(c) <= 0x05C7))
    s = unicodedata.normalize('NFC', s)
    s = re.sub(r'\s+', ' ', s)
    s = re.sub(r'[""״\'"׳]', '', s)
    s = re.sub(r'[|–—-]', ' ', s)  # also strip hyphens
    return re.sub(r'\s+', ' ', s).strip().lower()


def encode_he_path(path: str) -> str:
    """Encode Hebrew path segments for URL."""
    parts = path.split('/')
    return '/' + '/'.join(quote(p, safe='') for p in parts if p) + '/'


# ============================================================
# Scraper — find PDF on old site
# ============================================================

def find_pdf_in_html(html: str, lesson_title: str) -> str | None:
    """
    Try to find a PDF (or DOC/DOCX) href in the page HTML.
    Two strategies:
    1. lessonBlock swiper-slide — match h3 title → get attachment href in same block.
    2. tr[data-tooltip] table row — match h3 → get href in same row.
    Returns full URL or None.
    """
    title_norm = normalize(lesson_title)

    # Strategy 1: swiper-slide lessonBlock
    # Each block: <div class="lessonBlock ..."><h3>...</h3>...PDF links...</div>
    blocks = re.findall(
        r'<div class="[^"]*lessonBlock[^"]*">(.*?)</div>\s*</div>',
        html, re.DOTALL
    )
    for block in blocks:
        h3_m = re.search(r'<h3[^>]*>.*?title="([^"]+)".*?</h3>', block, re.DOTALL)
        if not h3_m:
            h3_m = re.search(r'<h3[^>]*>(.*?)</h3>', block, re.DOTALL)
        if not h3_m:
            continue
        raw_title = re.sub(r'<[^>]+>', '', h3_m.group(1))
        raw_title = raw_title.replace('&quot;', '"').replace('&#39;', "'").replace('&amp;', '&')
        block_title_norm = normalize(raw_title)

        if block_title_norm == title_norm or (len(title_norm) >= 6 and block_title_norm.startswith(title_norm[:min(len(title_norm), 12)])):
            # Found matching block — look for PDF
            pdf_m = re.search(r'href="(/media/[^"]+\.pdf)"', block, re.I)
            if pdf_m:
                return OLD_SITE + pdf_m.group(1)
            doc_m = re.search(r'href="(/media/[^"]+\.docx?)"', block, re.I)
            if doc_m:
                return OLD_SITE + doc_m.group(1)

    # Strategy 2: tr[data-tooltip] table row
    rows = re.findall(r'<tr[^>]+data-tooltip[^>]*>(.*?)</tr>', html, re.DOTALL)
    for row in rows:
        h3_m = re.search(r'<h3[^>]*>.*?title="([^"]+)".*?</h3>', row, re.DOTALL)
        if not h3_m:
            h3_m = re.search(r'<h3[^>]*>(.*?)</h3>', row, re.DOTALL)
        if not h3_m:
            continue
        raw_title = re.sub(r'<[^>]+>', '', h3_m.group(1))
        raw_title = raw_title.replace('&quot;', '"').replace('&#39;', "'").replace('&amp;', '&')
        row_title_norm = normalize(raw_title)

        if row_title_norm == title_norm or (len(title_norm) >= 6 and row_title_norm.startswith(title_norm[:min(len(title_norm), 12)])):
            pdf_m = re.search(r'href="(/media/[^"]+\.pdf)"', row, re.I)
            if pdf_m:
                return OLD_SITE + pdf_m.group(1)
            doc_m = re.search(r'href="(/media/[^"]+\.docx?)"', row, re.I)
            if doc_m:
                return OLD_SITE + doc_m.group(1)

    return None


BOOK_TO_PATH = {
    "בראשית": "תורה/בראשית", "שמות": "תורה/שמות",
    "ויקרא": "תורה/ויקרא", "במדבר": "תורה/במדבר", "דברים": "תורה/דברים",
    "יהושע": "נביאים/יהושע", "שופטים": "נביאים/שופטים",
    "שמואל א": "נביאים/שמואל-א", "שמואל ב": "נביאים/שמואל-ב",
    "שמואל": "נביאים/שמואל-א",  # fallback for ambiguous
    "מלכים א": "נביאים/מלכים-א", "מלכים ב": "נביאים/מלכים-ב",
    "ישעיהו": "נביאים/ישעיהו", "ירמיהו": "נביאים/ירמיהו",
    "יחזקאל": "נביאים/יחזקאל", "הושע": "נביאים/הושע",
    "יואל": "נביאים/יואל", "עמוס": "נביאים/עמוס",
    "עובדיה": "נביאים/עובדיה", "יונה": "נביאים/יונה",
    "מיכה": "נביאים/מיכה", "נחום": "נביאים/נחום",
    "חבקוק": "נביאים/חבקוק", "צפניה": "נביאים/צפניה",
    "חגי": "נביאים/חגי", "זכריה": "נביאים/זכריה",
    "מלאכי": "נביאים/מלאכי", "תהלים": "כתובים/תהלים",
    "משלי": "כתובים/משלי", "איוב": "כתובים/איוב",
    "שיר השירים": "כתובים/שיר-השירים", "רות": "כתובים/רות",
    "איכה": "כתובים/איכה", "קהלת": "כתובים/קהלת",
    "אסתר": "כתובים/אסתר", "דניאל": "כתובים/דניאל",
    "עזרא": "כתובים/עזרא", "נחמיה": "כתובים/נחמיה",
    "דברי הימים א": "כתובים/דברי-הימים-א",
    "דברי הימים ב": "כתובים/דברי-הימים-ב",
}

# Cache: book_he → list of series URLs found in sidebar
_book_series_urls: dict[str, list[str]] = {}


def get_series_urls_for_book(book_he: str) -> list[str]:
    """
    Scrape the book page on old site and collect all series-level URLs
    from the sidebar navigation. Returns list of absolute URLs.
    """
    if book_he in _book_series_urls:
        return _book_series_urls[book_he]

    book_path = BOOK_TO_PATH.get(book_he, "")
    if not book_path:
        _book_series_urls[book_he] = []
        return []

    book_url = OLD_SITE + encode_he_path(f"מאגר-עזרי-הלמידה/{book_path}")
    html = fetch_html(book_url)
    if not html:
        _book_series_urls[book_he] = []
        return []

    # Extract all /מאגר-עזרי-הלמידה/... links that are deeper than book level
    prefix = f"/מאגר-עזרי-הלמידה/{book_path}/"
    found = re.findall(r'href="(/מאגר-עזרי-הלמידה/[^"]+)"', html)
    # Filter: must be sub-paths of this book, not the book itself
    series_paths = sorted(set(p for p in found if p.startswith(prefix) and len(p) > len(prefix)))
    urls = [OLD_SITE + p for p in series_paths]

    _book_series_urls[book_he] = urls
    return urls


def find_first_pdf_in_html(html: str) -> str | None:
    """Return the first PDF href found anywhere in the page."""
    m = re.search(r'href="(/media/[^"]+\.pdf)"', html, re.I)
    if m:
        return OLD_SITE + m.group(1)
    # Try docx as fallback
    m = re.search(r'href="(/media/[^"]+\.docx?)"', html, re.I)
    if m:
        return OLD_SITE + m.group(1)
    return None


def find_pdf_for_lesson(lesson: dict, series_title: str | None, book_he: str | None) -> str | None:
    """
    Try to find the PDF for a lesson by scraping the old site.
    Strategy:
    1. Get list of all series URLs for this book from sidebar
    2. Find the matching series URL by matching series title
    3. On matched series page: try title-match first, then first-PDF fallback
    4. Fallback: try the book-level page with title-match
    """
    from urllib.parse import unquote
    lesson_title = lesson.get("title", "")
    if not lesson_title:
        return None

    # Step 1: find series URLs that match series title
    matched_series_urls = []
    if book_he and series_title:
        series_norm = normalize(series_title)
        series_urls = get_series_urls_for_book(book_he)
        for url in series_urls:
            parts = [p for p in url.rstrip('/').split('/') if p]
            if not parts:
                continue
            # Decode all path segments and join as title-like string
            decoded_parts = []
            for seg in parts:
                try:
                    decoded_parts.append(unquote(seg))
                except Exception:
                    decoded_parts.append(seg)
            # The series title could match any suffix of the path
            for seg in decoded_parts[3:]:  # skip מאגר-עזרי-הלמידה/תורה/ספר/
                seg_norm = normalize(seg.replace('-', ' '))
                if (seg_norm == series_norm or
                    (len(series_norm) > 4 and seg_norm.startswith(series_norm[:min(len(series_norm), 10)])) or
                    (len(seg_norm) > 4 and series_norm.startswith(seg_norm[:min(len(seg_norm), 10)]))):
                    matched_series_urls.append(url)
                    break

    # Step 2: try title-match on matched series pages first
    for url in matched_series_urls:
        html = fetch_html(url)
        if not html:
            continue
        pdf_url = find_pdf_in_html(html, lesson_title)
        if pdf_url:
            return pdf_url

    # Step 3: if no title-match found, try first-PDF in matched series
    # (for "per-series" PDFs like ושננתם that don't have per-lesson titles)
    for url in matched_series_urls:
        html = fetch_html(url)
        if not html:
            continue
        pdf_url = find_first_pdf_in_html(html)
        if pdf_url:
            return pdf_url

    # Step 4: try book-level page with title-match
    if book_he:
        book_path = BOOK_TO_PATH.get(book_he, "")
        if book_path:
            book_url = OLD_SITE + encode_he_path(f"מאגר-עזרי-הלמידה/{book_path}")
            html = fetch_html(book_url)
            if html:
                pdf_url = find_pdf_in_html(html, lesson_title)
                if pdf_url:
                    return pdf_url

    return None

# ============================================================
# Phase 1: Count + breakdown
# ============================================================

def do_count():
    print("\n=== שלב 1: ספירת שיעורי מורים ריקים ===\n")

    # Total count
    count_rows = sql_query("""
        SELECT COUNT(*) as cnt
        FROM lessons
        WHERE status = 'published'
          AND audience_tags @> ARRAY['teachers']
          AND attachment_url IS NULL
          AND audio_url IS NULL
          AND video_url IS NULL
    """)
    total = count_rows[0]["cnt"] if count_rows else "?"
    print(f"סה\"כ שיעורים ריקים לחלוטין: {total}")

    # Also count where description is also null
    count_nodesc = sql_query("""
        SELECT COUNT(*) as cnt
        FROM lessons
        WHERE status = 'published'
          AND audience_tags @> ARRAY['teachers']
          AND attachment_url IS NULL
          AND audio_url IS NULL
          AND video_url IS NULL
          AND (description IS NULL OR description = '')
    """)
    no_desc = count_nodesc[0]["cnt"] if count_nodesc else "?"
    print(f"מתוכם גם ללא description: {no_desc}")
    print(f"שיעורים עם description בלבד (טקסט לגיטימי): {int(total)-int(no_desc) if total != '?' and no_desc != '?' else '?'}")

    # Breakdown by series
    print("\n--- פילוח לפי סדרה (top 30) ---")
    series_rows = sql_query("""
        SELECT s.title as series_title, s.bible_book, COUNT(*) as cnt
        FROM lessons l
        JOIN series s ON l.series_id = s.id
        WHERE l.status = 'published'
          AND l.audience_tags @> ARRAY['teachers']
          AND l.attachment_url IS NULL
          AND l.audio_url IS NULL
          AND l.video_url IS NULL
        GROUP BY s.title, s.bible_book
        ORDER BY cnt DESC
        LIMIT 30
    """)
    if series_rows:
        print(f"{'סדרה':<45} {'ספר':<15} {'ריקים'}")
        print("-" * 70)
        for r in series_rows:
            print(f"{(r['series_title'] or '')[:44]:<45} {(r['bible_book'] or '')[:14]:<15} {r['cnt']}")
    else:
        print("  (אין נתונים)")

    # Breakdown by bible_book
    print("\n--- פילוח לפי ספר ---")
    book_rows = sql_query("""
        SELECT l.bible_book, COUNT(*) as cnt
        FROM lessons l
        WHERE l.status = 'published'
          AND l.audience_tags @> ARRAY['teachers']
          AND l.attachment_url IS NULL
          AND l.audio_url IS NULL
          AND l.video_url IS NULL
        GROUP BY l.bible_book
        ORDER BY cnt DESC
    """)
    if book_rows:
        print(f"{'ספר':<20} {'ריקים'}")
        print("-" * 30)
        for r in book_rows:
            book = r['bible_book'] or '(ללא ספר)'
            print(f"{book:<20} {r['cnt']}")
    else:
        print("  (אין נתונים)")

    print()

# ============================================================
# Phase 2: Sample (~10 lessons across 4-5 books)
# ============================================================

def do_sample():
    print("\n=== שלב 2: דגימה מייצגת ===\n")

    # Fetch ~2 per book from top 5 books
    sample_rows = sql_query("""
        WITH ranked AS (
            SELECT l.id, l.title, l.bible_book, l.series_id,
                   s.title as series_title,
                   ROW_NUMBER() OVER (PARTITION BY l.bible_book ORDER BY l.id) as rn
            FROM lessons l
            JOIN series s ON l.series_id = s.id
            WHERE l.status = 'published'
              AND l.audience_tags @> ARRAY['teachers']
              AND l.attachment_url IS NULL
              AND l.audio_url IS NULL
              AND l.video_url IS NULL
              AND l.bible_book IN (
                SELECT bible_book FROM lessons
                WHERE status='published' AND audience_tags @> ARRAY['teachers']
                  AND attachment_url IS NULL AND audio_url IS NULL AND video_url IS NULL
                  AND bible_book IS NOT NULL
                GROUP BY bible_book ORDER BY COUNT(*) DESC LIMIT 5
              )
        )
        SELECT id, title, bible_book, series_id, series_title
        FROM ranked
        WHERE rn <= 2
        LIMIT 10
    """)

    if not sample_rows:
        print("לא נמצאו שיעורים לדגימה")
        return

    print(f"נבחרו {len(sample_rows)} שיעורים לדגימה\n")

    found = 0
    not_found = 0
    results = []

    for i, lesson in enumerate(sample_rows, 1):
        print(f"[{i}/{len(sample_rows)}] '{lesson['title'][:50]}' | ספר: {lesson['bible_book']} | סדרה: {lesson['series_title'][:30]}")
        series_title = lesson.get("series_title", "")
        pdf_url = find_pdf_for_lesson(lesson, series_title, lesson.get("bible_book"))
        if pdf_url:
            found += 1
            print(f"  ✓ נמצא: {pdf_url}")
            results.append({**lesson, "pdf_url": pdf_url, "status": "found"})
            if not DRY_RUN:
                update_result = sql_exec(f"""
                    UPDATE lessons
                    SET attachment_url = '{pdf_url.replace("'", "''")}',
                        updated_at = NOW()
                    WHERE id = '{lesson['id']}'
                """)
                ok = isinstance(update_result, list) or (isinstance(update_result, dict) and not update_result.get("error"))
                print(f"  {'  DB updated ✓' if ok else '  DB ERROR: ' + str(update_result)}")
            else:
                print(f"  [DRY-RUN] לא עודכן DB")
        else:
            not_found += 1
            print(f"  ✗ לא נמצא")
            results.append({**lesson, "pdf_url": None, "status": "not_found"})
        time.sleep(0.5)

    print(f"\n=== תוצאות דגימה ===")
    print(f"נמצאו: {found}/{len(sample_rows)} ({100*found//len(sample_rows)}%)")
    print(f"לא נמצאו: {not_found}/{len(sample_rows)}")

    out_path = SCRIPTS_DIR / "fill-teacher-attachments-sample.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\nתוצאות שמורות: {out_path}")


# ============================================================
# Phase 3: Full run
# ============================================================

def do_full_run():
    print("\n=== שלב 3: ריצה מלאה ===")
    if DRY_RUN:
        print("  [DRY-RUN] — לא יבוצעו כתיבות ל-DB\n")
    else:
        print("  [LIVE] — יתבצעו עדכוני DB!\n")

    # Load or create state file
    state_path = SCRIPTS_DIR / "fill-teacher-attachments-state.json"
    if state_path.exists():
        with open(state_path, encoding="utf-8") as f:
            state = json.load(f)
        print(f"ממשיך מ-state קיים: {len(state)} שיעורים כבר טופלו")
    else:
        state = {}

    # Fetch all empty teacher lessons
    all_lessons = []
    offset = 0
    page_size = 500
    while True:
        page = sql_query(f"""
            SELECT l.id, l.title, l.bible_book, l.series_id,
                   s.title as series_title
            FROM lessons l
            JOIN series s ON l.series_id = s.id
            WHERE l.status = 'published'
              AND l.audience_tags @> ARRAY['teachers']
              AND l.attachment_url IS NULL
              AND l.audio_url IS NULL
              AND l.video_url IS NULL
            ORDER BY l.id
            LIMIT {page_size} OFFSET {offset}
        """)
        if not page:
            break
        all_lessons.extend(page)
        offset += page_size
        if len(page) < page_size:
            break

    # Filter already-done
    todo = [l for l in all_lessons if l["id"] not in state]
    print(f"סה\"כ: {len(all_lessons)} שיעורים ריקים | טופלו: {len(all_lessons)-len(todo)} | נשאר: {len(todo)}\n")

    # Create backup table once
    if not DRY_RUN and not state:
        print("יוצר גיבוי: lessons_bak_20260609 ...", end=" ")
        res = sql_exec("CREATE TABLE IF NOT EXISTS lessons_bak_20260609 AS SELECT * FROM lessons")
        print("✓" if isinstance(res, list) or (isinstance(res, dict) and not res.get("error")) else f"⚠ {res}")

    found_total = 0
    not_found_total = 0
    not_found_list = []

    for i, lesson in enumerate(todo, 1):
        lid = lesson["id"]
        title = lesson["title"] or ""
        book = lesson.get("bible_book", "")
        series = lesson.get("series_title", "")
        series_title_val = lesson.get("series_title", "")

        if i % 20 == 1:
            print(f"\n[{i}/{len(todo)}] מעבד: '{title[:40]}' | ספר: {book} | סדרה: {series[:30]}")

        pdf_url = find_pdf_for_lesson(lesson, series_title_val, book)

        if pdf_url:
            found_total += 1
            state[lid] = {"status": "found", "pdf_url": pdf_url}
            if not DRY_RUN:
                update_result = sql_exec(f"""
                    UPDATE lessons
                    SET attachment_url = '{pdf_url.replace("'", "''")}',
                        updated_at = NOW()
                    WHERE id = '{lid}'
                """)
                ok = isinstance(update_result, list) or (isinstance(update_result, dict) and not update_result.get("error"))
                if not ok:
                    print(f"  DB ERROR for {lid}: {update_result}", file=sys.stderr)
            if i % 10 == 0:
                print(f"  ✓ {i}: '{title[:40]}' → {pdf_url[:60]}")
        else:
            not_found_total += 1
            state[lid] = {"status": "not_found", "title": title, "series": series, "book": book}
            not_found_list.append({"id": lid, "title": title, "series": series, "book": book})

        # Save state every 25 lessons
        if i % 25 == 0:
            with open(state_path, "w", encoding="utf-8") as f:
                json.dump(state, f, ensure_ascii=False, indent=2)

        time.sleep(0.3)

    # Final state save
    with open(state_path, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)

    # Save not-found list for yoav
    not_found_path = SCRIPTS_DIR / "fill-teacher-attachments-not-found.json"
    with open(not_found_path, "w", encoding="utf-8") as f:
        json.dump(not_found_list, f, ensure_ascii=False, indent=2)

    print(f"\n=== סיכום ===")
    print(f"סה\"כ טופלו: {len(todo)}")
    print(f"נמצאו PDF: {found_total} ({100*found_total//max(len(todo),1)}%)")
    print(f"לא נמצאו: {not_found_total} ({100*not_found_total//max(len(todo),1)}%)")
    print(f"\nState: {state_path}")
    print(f"לא נמצאו (לשליחה ליואב): {not_found_path}")


# ============================================================
# Entry point
# ============================================================

if __name__ == "__main__":
    if MODE_COUNT:
        do_count()
    elif MODE_SAMPLE:
        do_sample()
    elif MODE_RUN:
        do_full_run()
