#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fill-teacher-attachments-v2.py
================================
התאמה חכמה (confidence-gated) של PDFים לשיעורי מורים ריקים.

שיפורים מגרסה 1:
- זיווג מדויק: h3-title ↔ pdf-href ישירות מ-<tr data-tooltip> (לא first-pdf-in-page)
- אבחנה אוטומטית: per-parasha (כמה PDFים בדף → חייב title-match) vs per-series (PDF אחד → מותר לכולם)
- confidence gate: רק EXACT match (NFC normalized, ניקוד מוסר) → עדכון. partial match → ריק + manual list
- אפס/אחד fallback: אם per-series ויש בדיוק 1 PDF → נותן לכל שיעורי הסדרה
- אפס→ריק: אם per-series ויש 0 PDFים → משאיר ריק
- דורס שגיאות מהדגימה הישנה (sample.json): מאפס attachment_url לשיעורים שקיבלו PDF שגוי

Usage:
    SUPABASE_MANAGEMENT_API_TOKEN=sbp_... env -u HTTPS_PROXY -u HTTP_PROXY python3 scripts/fill-teacher-attachments-v2.py --count
    SUPABASE_MANAGEMENT_API_TOKEN=sbp_... env -u HTTPS_PROXY -u HTTP_PROXY python3 scripts/fill-teacher-attachments-v2.py --dry-run
    SUPABASE_MANAGEMENT_API_TOKEN=sbp_... env -u HTTPS_PROXY -u HTTP_PROXY python3 scripts/fill-teacher-attachments-v2.py --run

    # לאחר ריצה — מאפס שגויים מהדגימה הישנה ומוסיף את ה-missing:
    SUPABASE_MANAGEMENT_API_TOKEN=sbp_... env -u HTTPS_PROXY -u HTTP_PROXY python3 scripts/fill-teacher-attachments-v2.py --fix-sample-errors
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
from urllib.parse import quote, unquote

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
MODE_RUN = "--run" in sys.argv or DRY_RUN
MODE_FIX_SAMPLE = "--fix-sample-errors" in sys.argv

if not (MODE_COUNT or MODE_RUN or MODE_FIX_SAMPLE):
    print("Usage: script.py --count | --dry-run | --run | --fix-sample-errors", file=sys.stderr)
    sys.exit(1)

# ============================================================
# Supabase helpers
# ============================================================

def sql_query(q: str) -> list:
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
            print(f"  SQL ERROR: {data['message'][:300]}", file=sys.stderr)
            return []
        return data if isinstance(data, list) else []
    except Exception as e:
        print(f"  JSON error: {e} | raw: {result.stdout[:200]}", file=sys.stderr)
        return []


def sql_exec(q: str) -> dict:
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


def db_update(lesson_id: str, pdf_url: str | None) -> bool:
    """עדכן attachment_url (או אפס לNULL). מחזיר True אם הצליח."""
    if pdf_url is None:
        q = f"UPDATE lessons SET attachment_url = NULL, updated_at = NOW() WHERE id = '{lesson_id}'"
    else:
        safe = pdf_url.replace("'", "''")
        q = f"UPDATE lessons SET attachment_url = '{safe}', updated_at = NOW() WHERE id = '{lesson_id}'"
    res = sql_exec(q)
    ok = isinstance(res, list) or (isinstance(res, dict) and not res.get("error"))
    if not ok:
        print(f"  DB ERROR for {lesson_id}: {res}", file=sys.stderr)
    return ok

# ============================================================
# Normalization
# ============================================================

def normalize(s: str) -> str:
    """NFC + remove nikud + strip punct + lower."""
    if not s:
        return ""
    s = s.strip()
    # Remove nikud (Hebrew diacritics)
    s = ''.join(c for c in s if not (0x0591 <= ord(c) <= 0x05C7))
    s = unicodedata.normalize('NFC', s)
    s = re.sub(r'\s+', ' ', s)
    # Remove quotes and special chars
    s = re.sub(r'[""״\'"׳]', '', s)
    # Normalize hyphens and dashes to space
    s = re.sub(r'[|–—\-]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip().lower()


def encode_he_path(path: str) -> str:
    parts = path.split('/')
    return '/' + '/'.join(quote(p, safe='') for p in parts if p) + '/'


# ============================================================
# Fetching
# ============================================================

_page_cache: dict[str, str | None] = {}


def fetch_html(url: str) -> str | None:
    if url in _page_cache:
        return _page_cache[url]
    result = subprocess.run([
        "curl", "--noproxy", "*", "-sL", "--max-time", "30",
        "-A", "Mozilla/5.0", url.replace('"', '%22')
    ], capture_output=True, timeout=35)
    html = result.stdout.decode("utf-8", errors="replace") if isinstance(result.stdout, bytes) else result.stdout
    if not html or len(html) < 500 or ("Page not found" in html and len(html) < 2000):
        html = None
    _page_cache[url] = html
    return html


# ============================================================
# Core: extract structured map of title → pdf_url from a page
# ============================================================

def extract_title_pdf_map(html: str) -> list[tuple[str, str]]:
    """
    Returns list of (title_norm, full_pdf_url) pairs from TR data-tooltip rows.
    These rows contain the exact h3 title AND the PDF href in the same element.

    This is the primary extraction strategy — direct h3↔pdf coupling.
    """
    results = []
    # <tr ... data-tooltip ...> ... <h3 ... title="X"> ... href="/media/..." ... </tr>
    rows = re.findall(r'<tr[^>]+data-tooltip[^>]*>(.*?)</tr>', html, re.DOTALL)
    for row in rows:
        # Extract title
        h3_m = re.search(r'<h3[^>]*>(.*?)</h3>', row, re.DOTALL)
        if not h3_m:
            continue
        h3_inner = h3_m.group(1)
        # Prefer title attribute
        title_attr = re.search(r'\btitle=["\']([^"\']+)["\']', h3_inner)
        if title_attr:
            raw_title = title_attr.group(1)
        else:
            raw_title = re.sub(r'<[^>]+>', '', h3_inner)
        raw_title = raw_title.replace('&quot;', '"').replace('&#39;', "'").replace('&amp;', '&')
        title_norm = normalize(raw_title)
        if not title_norm:
            continue
        # Extract PDF href
        pdf_m = re.search(r'href="(/media/[^"]+\.(?:pdf))"', row, re.I)
        if not pdf_m:
            # Try docx
            pdf_m = re.search(r'href="(/media/[^"]+\.(?:docx?))"', row, re.I)
        if pdf_m:
            full_url = OLD_SITE + pdf_m.group(1)
            results.append((title_norm, full_url))
    return results


def extract_all_pdfs(html: str) -> list[str]:
    """כל ה-PDFs שבדף, ללא קשר לכותרת."""
    pdfs = re.findall(r'href="(/media/[^"]+\.pdf)"', html, re.I)
    unique = list(dict.fromkeys(OLD_SITE + p for p in pdfs))
    if not unique:
        docs = re.findall(r'href="(/media/[^"]+\.docx?)"', html, re.I)
        unique = list(dict.fromkeys(OLD_SITE + d for d in docs))
    return unique


# ============================================================
# Book → URL mapping
# ============================================================

BOOK_TO_PATH = {
    "בראשית": "תורה/בראשית", "שמות": "תורה/שמות",
    "ויקרא": "תורה/ויקרא", "במדבר": "תורה/במדבר", "דברים": "תורה/דברים",
    "יהושע": "נביאים/יהושע", "שופטים": "נביאים/שופטים",
    "שמואל א": "נביאים/שמואל-א", "שמואל ב": "נביאים/שמואל-ב",
    "שמואל": "נביאים/שמואל-א",
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

_book_series_urls_cache: dict[str, list[str]] = {}


def get_series_urls_for_book(book_he: str) -> list[str]:
    if book_he in _book_series_urls_cache:
        return _book_series_urls_cache[book_he]
    book_path = BOOK_TO_PATH.get(book_he, "")
    if not book_path:
        _book_series_urls_cache[book_he] = []
        return []
    book_url = OLD_SITE + encode_he_path(f"מאגר-עזרי-הלמידה/{book_path}")
    html = fetch_html(book_url)
    if not html:
        _book_series_urls_cache[book_he] = []
        return []
    prefix = f"/מאגר-עזרי-הלמידה/{book_path}/"
    found = re.findall(r'href="(/מאגר-עזרי-הלמידה/[^"]+)"', html)
    series_paths = sorted(set(p for p in found if p.startswith(prefix) and len(p) > len(prefix)))
    urls = [OLD_SITE + p for p in series_paths]
    _book_series_urls_cache[book_he] = urls
    return urls


# ============================================================
# Series URL match — by series title slug
# ============================================================

def find_series_urls(series_title: str, book_he: str) -> list[str]:
    """מוצא URLs של הסדרה באתר הישן לפי שם הסדרה."""
    series_norm = normalize(series_title)
    all_urls = get_series_urls_for_book(book_he)
    matched = []
    for url in all_urls:
        parts = [p for p in url.rstrip('/').split('/') if p]
        # Try each segment of the path (after root segments)
        for seg in parts[3:]:  # skip מאגר-עזרי-הלמידה, category, book
            try:
                seg_decoded = unquote(seg).replace('-', ' ')
            except Exception:
                seg_decoded = seg.replace('-', ' ')
            seg_norm = normalize(seg_decoded)
            # Exact match on normalized
            if seg_norm == series_norm:
                matched.append(url)
                break
            # Substantial prefix match (>5 chars)
            if len(series_norm) > 5 and len(seg_norm) > 5:
                min_len = min(len(series_norm), len(seg_norm), 14)
                if series_norm[:min_len] == seg_norm[:min_len]:
                    matched.append(url)
                    break
    return matched


# ============================================================
# Core confidence-gated PDF finder
# ============================================================

class MatchResult:
    __slots__ = ['pdf_url', 'confidence', 'reason']
    def __init__(self, pdf_url: str | None, confidence: str, reason: str):
        self.pdf_url = pdf_url
        self.confidence = confidence  # 'exact', 'series-single', 'not-found'
        self.reason = reason


def find_pdf_for_lesson_v2(lesson: dict, series_title: str, book_he: str) -> MatchResult:
    """
    Confidence-gated PDF match.

    שני מצבים:
    1. per-parasha (דף מכיל >1 PDFs): דרוש title match מדויק. אחרת → not-found.
    2. per-series (דף מכיל 1 PDF): נותן לכל שיעורי הסדרה. confidence=series-single.

    Returns MatchResult.
    """
    lesson_title = lesson.get("title", "")
    if not lesson_title or not book_he:
        return MatchResult(None, 'not-found', 'missing title or book')

    lesson_norm = normalize(lesson_title)

    # Find series URLs on old site
    if series_title:
        series_urls = find_series_urls(series_title, book_he)
    else:
        series_urls = []

    # Fallback: try book-level URL if no series URLs found
    if not series_urls:
        book_path = BOOK_TO_PATH.get(book_he, "")
        if book_path:
            book_url = OLD_SITE + encode_he_path(f"מאגר-עזרי-הלמידה/{book_path}")
            series_urls = [book_url]

    for url in series_urls:
        html = fetch_html(url)
        if not html:
            continue

        # Build title→pdf map from TR rows (exact coupling)
        title_pdf_map = extract_title_pdf_map(html)
        all_pdfs = extract_all_pdfs(html)

        if len(all_pdfs) == 0:
            # No PDFs at all — nothing to do
            continue

        if len(title_pdf_map) > 1:
            # Per-parasha: must title-match
            for (page_title_norm, pdf_url) in title_pdf_map:
                if page_title_norm == lesson_norm:
                    return MatchResult(pdf_url, 'exact', f'exact match "{lesson_title}" on {url}')

            # Try relaxed match: lesson_norm is suffix or prefix of page_title_norm (or vice versa)
            # e.g. lesson = "מדריך למורה - יהושע פרק א" vs page = "מדריך למורה - יהושע פרק א"
            for (page_title_norm, pdf_url) in title_pdf_map:
                if lesson_norm and page_title_norm and (
                    lesson_norm == page_title_norm or
                    lesson_norm in page_title_norm or
                    page_title_norm in lesson_norm
                ):
                    # Only if one is a proper substring of the other (high confidence)
                    shorter = min(len(lesson_norm), len(page_title_norm))
                    longer = max(len(lesson_norm), len(page_title_norm))
                    # If shorter is >70% of longer, accept
                    if shorter >= 4 and shorter / longer >= 0.75:
                        return MatchResult(pdf_url, 'exact', f'substring match "{lesson_title}" ≈ "{page_title_norm}" on {url}')

            # No confident match found — per-parasha mode requires exact
            # Don't fall back to first PDF here (that was the bug)
            continue

        elif len(all_pdfs) == 1:
            # Single PDF for entire series — give to all lessons in this series
            return MatchResult(all_pdfs[0], 'series-single', f'single PDF in series "{series_title}" on {url}')

        # Multiple PDFs but no TR rows (unusual) — skip (safer than wrong)
        # This handles edge cases where title_pdf_map is empty but all_pdfs > 1
        # Could be a different layout — don't guess

    return MatchResult(None, 'not-found', f'no match found for "{lesson_title}" in series "{series_title}"')


# ============================================================
# Count mode
# ============================================================

def do_count():
    print("\n=== ספירת שיעורי מורים ריקים ===\n")
    rows = sql_query("""
        SELECT COUNT(*) as cnt FROM lessons
        WHERE status='published' AND audience_tags @> ARRAY['teachers']
          AND attachment_url IS NULL AND audio_url IS NULL AND video_url IS NULL
    """)
    total = rows[0]["cnt"] if rows else "?"
    print(f"סה\"כ שיעורים ריקים: {total}")

    rows2 = sql_query("""
        SELECT s.title as series_title, s.bible_book, COUNT(l.id) as cnt
        FROM lessons l JOIN series s ON l.series_id=s.id
        WHERE l.status='published' AND l.audience_tags @> ARRAY['teachers']
          AND l.attachment_url IS NULL AND l.audio_url IS NULL AND l.video_url IS NULL
        GROUP BY s.title, s.bible_book ORDER BY COUNT(l.id) DESC LIMIT 20
    """)
    print(f"\nTop 20 סדרות:")
    for r in rows2:
        print(f"  {(r['series_title'] or '')[:50]:<52} ספר: {(r['bible_book'] or ''):<12} {r['cnt']}")


# ============================================================
# Fix sample errors — reset wrong attachment_urls from old sample
# ============================================================

def do_fix_sample_errors():
    """
    מאפס שיעורים שקיבלו PDF שגוי מהדגימה הישנה (sample.json).
    רק מאפס ל-NULL — הריצה המלאה תמלא מחדש בצורה נכונה.
    """
    sample_path = SCRIPTS_DIR / "fill-teacher-attachments-sample.json"
    if not sample_path.exists():
        print("לא נמצא sample.json — כלום לאפס")
        return

    with open(sample_path, encoding="utf-8") as f:
        sample = json.load(f)

    # IDs שקיבלו PDF שגוי — נאפס ל-NULL
    # הלוגיקה: כל שיעור עם status=found בדגימה, שנבדוק מחדש עם v2
    # שיעורים ריקים עם description הם בסדר (אין attachment_url, לא השתנו)
    # שיעורים שה-sample שינה — אפס ל-NULL כדי שהריצה החדשה תעבד אותם
    ids_to_reset = []
    for item in sample:
        if item.get("status") == "found" and item.get("pdf_url"):
            ids_to_reset.append(item["id"])

    print(f"\n=== מאפס {len(ids_to_reset)} שיעורים מהדגימה הישנה ===")

    if not ids_to_reset:
        print("כלום לאפס")
        return

    for lid in ids_to_reset:
        if DRY_RUN:
            print(f"  [DRY-RUN] יאפס: {lid}")
            continue
        ok = db_update(lid, None)
        print(f"  {'✓ אופס' if ok else '✗ שגיאה'}: {lid}")
        time.sleep(0.2)

    print(f"\n{'[DRY-RUN] ' if DRY_RUN else ''}הושלם. {len(ids_to_reset)} שיעורים אופסו ל-NULL.")
    print("עכשיו הרץ --run כדי למלא מחדש בצורה נכונה.")


# ============================================================
# Full run
# ============================================================

def do_full_run():
    print(f"\n=== ריצה מלאה {'[DRY-RUN]' if DRY_RUN else '[LIVE]'} ===\n")

    # State file — resume support
    state_path = SCRIPTS_DIR / "fill-teacher-attachments-v2-state.json"
    if state_path.exists():
        with open(state_path, encoding="utf-8") as f:
            state = json.load(f)
        print(f"ממשיך מ-state קיים: {len(state)} שיעורים כבר טופלו")
    else:
        state = {}

    # Backup (once, before first run)
    if not DRY_RUN and not state:
        print("יוצר גיבוי lessons_bak_20260609 ...", end=" ", flush=True)
        res = sql_exec("CREATE TABLE IF NOT EXISTS lessons_bak_20260609 AS SELECT * FROM lessons")
        ok = isinstance(res, list) or (isinstance(res, dict) and not res.get("error"))
        print("✓" if ok else f"⚠ {res}")

    # Fetch all empty teacher lessons with series info
    print("שולף שיעורים ריקים מ-DB...", flush=True)
    all_lessons = []
    offset = 0
    while True:
        page = sql_query(f"""
            SELECT l.id::text, l.title, l.bible_book, l.series_id::text,
                   s.title as series_title
            FROM lessons l
            JOIN series s ON l.series_id = s.id
            WHERE l.status = 'published'
              AND l.audience_tags @> ARRAY['teachers']
              AND l.attachment_url IS NULL
              AND l.audio_url IS NULL
              AND l.video_url IS NULL
            ORDER BY s.title, l.title
            LIMIT 500 OFFSET {offset}
        """)
        if not page:
            break
        all_lessons.extend(page)
        offset += 500
        if len(page) < 500:
            break

    todo = [l for l in all_lessons if l["id"] not in state]
    print(f"סה\"כ ריקים: {len(all_lessons)} | טופלו: {len(all_lessons)-len(todo)} | נשאר: {len(todo)}\n")

    # Counters
    cnt_exact = 0
    cnt_series_single = 0
    cnt_not_found = 0
    not_found_list = []

    # Series-level PDF cache to avoid re-scraping same series for each lesson
    # series_id → MatchResult (cached for single-PDF series)
    series_single_pdf_cache: dict[str, str | None] = {}

    prev_series_id = None

    for i, lesson in enumerate(todo, 1):
        lid = lesson["id"]
        title = lesson.get("title") or ""
        book = lesson.get("bible_book") or ""
        series_id = lesson.get("series_id") or ""
        series = lesson.get("series_title") or ""

        if i % 30 == 1:
            print(f"\n--- [{i}/{len(todo)}] '{title[:45]}' | ספר: {book} | סדרה: {series[:35]}")

        result = find_pdf_for_lesson_v2(lesson, series, book)

        if result.confidence == 'exact':
            cnt_exact += 1
            state[lid] = {"status": "exact", "pdf_url": result.pdf_url, "reason": result.reason}
            if not DRY_RUN:
                ok = db_update(lid, result.pdf_url)
                if i % 10 == 0 or not ok:
                    print(f"  {'✓' if ok else '✗'} exact: '{title[:40]}' → {(result.pdf_url or '')[:55]}")
            else:
                if i % 10 == 0:
                    print(f"  [DRY] exact: '{title[:40]}' → {(result.pdf_url or '')[:55]}")

        elif result.confidence == 'series-single':
            cnt_series_single += 1
            state[lid] = {"status": "series-single", "pdf_url": result.pdf_url, "reason": result.reason}
            if not DRY_RUN:
                ok = db_update(lid, result.pdf_url)
                if i % 10 == 0 or not ok:
                    print(f"  {'✓' if ok else '✗'} single: '{title[:40]}' → {(result.pdf_url or '')[:55]}")
            else:
                if i % 10 == 0:
                    print(f"  [DRY] single: '{title[:40]}' → {(result.pdf_url or '')[:55]}")

        else:  # not-found
            cnt_not_found += 1
            state[lid] = {"status": "not_found", "title": title, "series": series, "book": book, "reason": result.reason}
            not_found_list.append({"id": lid, "title": title, "series": series, "book": book})

        # Save state every 25
        if i % 25 == 0:
            with open(state_path, "w", encoding="utf-8") as f:
                json.dump(state, f, ensure_ascii=False, indent=2)

        time.sleep(0.25)

    # Final state save
    with open(state_path, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)

    # Save not-found list
    not_found_path = SCRIPTS_DIR / "fill-teacher-attachments-v2-not-found.json"
    with open(not_found_path, "w", encoding="utf-8") as f:
        json.dump(not_found_list, f, ensure_ascii=False, indent=2)

    total = len(todo)
    print(f"\n{'='*50}")
    print(f"=== סיכום {'DRY-RUN' if DRY_RUN else 'LIVE'} ===")
    print(f"סה\"כ טופלו:          {total}")
    print(f"מולאו (exact match):  {cnt_exact} ({100*cnt_exact//max(total,1)}%)")
    print(f"מולאו (PDF-סדרה):     {cnt_series_single} ({100*cnt_series_single//max(total,1)}%)")
    print(f"סה\"כ מולאו:           {cnt_exact+cnt_series_single} ({100*(cnt_exact+cnt_series_single)//max(total,1)}%)")
    print(f"הושארו ריקים:         {cnt_not_found} ({100*cnt_not_found//max(total,1)}%)")
    print(f"\nState: {state_path}")
    print(f"לא נמצאו (לשליחה ליואב): {not_found_path}")

    if not_found_list:
        print(f"\n--- רשימת {len(not_found_list)} שיעורים ריקים לטיפול יואב (top 30) ---")
        # Group by series
        by_series: dict[str, list] = {}
        for item in not_found_list:
            k = f"{item['series']} | {item['book']}"
            by_series.setdefault(k, []).append(item['title'])

        count = 0
        for key, titles in sorted(by_series.items(), key=lambda x: -len(x[1])):
            if count >= 30:
                break
            print(f"  סדרה: {key} ({len(titles)} שיעורים)")
            for t in titles[:3]:
                print(f"    - {t[:60]}")
            if len(titles) > 3:
                print(f"    ... ועוד {len(titles)-3}")
            count += 1


# ============================================================
# Entry
# ============================================================

if __name__ == "__main__":
    if MODE_COUNT:
        do_count()
    elif MODE_FIX_SAMPLE:
        do_fix_sample_errors()
    elif MODE_RUN:
        do_full_run()
