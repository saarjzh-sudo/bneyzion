#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fill-teacher-content.py
========================
מלא description/content לשיעורי מורים שעדיין ריקים (312 ב-not-found.json).

שני מצבים:
1. יש content בDB (>50 תווים) → חלץ description (strip HTML, 250 תווים)
2. content ריק → שלוף מהאתר הישן (bneyzion.co.il), אמת H1≡כותרת (80%+), עדכן content+description

confidence gate:
- description מ-content קיים: תמיד (אין סיכון — data כבר בDB)
- content מהאתר הישן: רק אם H1 מאומת (title match >= 75%)
- אין התאמה ודאית → description ריק + רשומה ב-not-found

Usage:
    SUPABASE_MANAGEMENT_API_TOKEN=sbp_... env -u HTTPS_PROXY -u HTTP_PROXY python3 scripts/fill-teacher-content.py --dry-run
    SUPABASE_MANAGEMENT_API_TOKEN=sbp_... env -u HTTPS_PROXY -u HTTP_PROXY python3 scripts/fill-teacher-content.py --run
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
MODE_RUN = "--run" in sys.argv or DRY_RUN

if not MODE_RUN:
    print("Usage: fill-teacher-content.py --dry-run | --run", file=sys.stderr)
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


def db_update_description(lesson_id: str, description: str, content: str | None = None) -> bool:
    """עדכן description (ואולי content). מחזיר True אם הצליח."""
    desc_safe = description.replace("'", "''").replace("\\", "\\\\")
    if content is not None:
        cont_safe = content.replace("'", "''").replace("\\", "\\\\")
        q = f"UPDATE lessons SET description = '{desc_safe}', content = '{cont_safe}', updated_at = NOW() WHERE id = '{lesson_id}'"
    else:
        q = f"UPDATE lessons SET description = '{desc_safe}', updated_at = NOW() WHERE id = '{lesson_id}'"
    res = sql_exec(q)
    ok = isinstance(res, list) or (isinstance(res, dict) and not res.get("error"))
    if not ok:
        print(f"  DB ERROR for {lesson_id}: {res}", file=sys.stderr)
    return ok


# ============================================================
# Text helpers
# ============================================================

def strip_html(html: str) -> str:
    """מסיר HTML tags ומחזיר טקסט נקי."""
    if not html:
        return ""
    text = re.sub(r'<[^>]+>', ' ', html)
    text = text.replace('&nbsp;', ' ').replace('&quot;', '"').replace('&amp;', '&')
    text = text.replace('&lt;', '<').replace('&gt;', '>').replace('&#39;', "'")
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def make_description(content_html: str, max_chars: int = 250) -> str:
    """חלץ description קצר מ-HTML content."""
    text = strip_html(content_html)
    if len(text) <= max_chars:
        return text
    # Cut at word boundary
    cut = text[:max_chars]
    last_space = cut.rfind(' ')
    if last_space > max_chars * 0.7:
        cut = cut[:last_space]
    return cut.rstrip('.,;:') + '...'


def normalize(s: str) -> str:
    """NFC + remove nikud + strip punct + lower."""
    if not s:
        return ""
    s = s.strip()
    s = ''.join(c for c in s if not (0x0591 <= ord(c) <= 0x05C7))
    s = unicodedata.normalize('NFC', s)
    s = re.sub(r'\s+', ' ', s)
    s = re.sub(r'[""״\'"׳]', '', s)
    s = re.sub(r'[|–—\-]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip().lower()


def h1_match_score(h1_text: str, lesson_title: str) -> float:
    """מחזיר 0-1: כמה H1 ב-HTML תואם את כותרת השיעור."""
    h1_norm = normalize(h1_text)
    title_norm = normalize(lesson_title)
    if not h1_norm or not title_norm:
        return 0.0
    if h1_norm == title_norm:
        return 1.0
    shorter = min(len(h1_norm), len(title_norm))
    longer = max(len(h1_norm), len(title_norm))
    if longer == 0:
        return 0.0
    # Substring match
    if h1_norm in title_norm or title_norm in h1_norm:
        return shorter / longer
    # Prefix match
    min_len = min(shorter, 12)
    if min_len >= 4 and h1_norm[:min_len] == title_norm[:min_len]:
        return min_len / longer
    return 0.0


# ============================================================
# Fetching
# ============================================================

_page_cache: dict[str, str | None] = {}


def fetch_html(url: str) -> str | None:
    if url in _page_cache:
        return _page_cache[url]
    result = subprocess.run([
        "curl", "--noproxy", "*", "-sL", "--max-time", "30",
        "-A", "Mozilla/5.0", url
    ], capture_output=True, timeout=35)
    html = result.stdout.decode("utf-8", errors="replace") if isinstance(result.stdout, bytes) else result.stdout
    if not html or len(html) < 200 or "Page not found" in html:
        html = None
    _page_cache[url] = html
    return html


def encode_he_path(path: str) -> str:
    parts = path.split('/')
    return '/' + '/'.join(quote(p, safe='') for p in parts if p) + '/'


# ============================================================
# Book → URL mapping (same as v2)
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


def get_series_urls_for_book(book_he: str) -> list[str]:
    book_path = BOOK_TO_PATH.get(book_he, "")
    if not book_path:
        return []
    book_url = OLD_SITE + encode_he_path(f"מאגר-עזרי-הלמידה/{book_path}")
    html = fetch_html(book_url)
    if not html:
        return []
    prefix = f"/מאגר-עזרי-הלמידה/{book_path}/"
    found = re.findall(r'href="(/מאגר-עזרי-הלמידה/[^"]+)"', html)
    series_paths = sorted(set(p for p in found if p.startswith(prefix) and len(p) > len(prefix)))
    return [OLD_SITE + p for p in series_paths]


def find_series_urls(series_title: str, book_he: str) -> list[str]:
    series_norm = normalize(series_title)
    all_urls = get_series_urls_for_book(book_he)
    matched = []
    for url in all_urls:
        parts = [p for p in url.rstrip('/').split('/') if p]
        for seg in parts[3:]:
            try:
                seg_decoded = unquote(seg).replace('-', ' ')
            except Exception:
                seg_decoded = seg.replace('-', ' ')
            seg_norm = normalize(seg_decoded)
            if seg_norm == series_norm:
                matched.append(url)
                break
            if len(series_norm) > 5 and len(seg_norm) > 5:
                min_len = min(len(series_norm), len(seg_norm), 14)
                if series_norm[:min_len] == seg_norm[:min_len]:
                    matched.append(url)
                    break
    return matched


# ============================================================
# Extract lesson content from old site page
# ============================================================

def extract_lesson_content_from_page(html: str, lesson_title: str) -> tuple[str | None, str | None, float]:
    """
    מחפש תוכן שיעור בדף האתר הישן.
    מחזיר (h1_text, content_html, confidence_score)

    confidence_score: 0-1 (match between H1 and lesson_title)
    """
    # Extract H1
    h1_matches = re.findall(r'<h1[^>]*>(.*?)</h1>', html, re.DOTALL | re.I)
    if not h1_matches:
        return None, None, 0.0

    h1_text = strip_html(h1_matches[0]).strip()
    score = h1_match_score(h1_text, lesson_title)

    if score < 0.75:
        return h1_text, None, score

    # Extract main content block
    # Strategy 1: .lessonContent div
    content_m = re.search(r'<div[^>]*class=["\'][^"\']*lessonContent[^"\']*["\'][^>]*>(.*?)</div\s*>\s*(?:<div|<footer|<script)', html, re.DOTALL | re.I)
    if content_m:
        return h1_text, content_m.group(1).strip(), score

    # Strategy 2: article main content
    content_m = re.search(r'<article[^>]*>(.*?)</article>', html, re.DOTALL | re.I)
    if content_m:
        inner = content_m.group(1)
        # Remove nav, header, footer inside article
        inner = re.sub(r'<nav[^>]*>.*?</nav>', '', inner, flags=re.DOTALL | re.I)
        inner = re.sub(r'<header[^>]*>.*?</header>', '', inner, flags=re.DOTALL | re.I)
        # Keep only paragraphs
        paras = re.findall(r'<(?:p|ul|ol|table|h[2-6])[^>]*>.*?</(?:p|ul|ol|table|h[2-6])>', inner, re.DOTALL | re.I)
        if paras:
            return h1_text, '\n'.join(paras), score

    # Strategy 3: main element
    content_m = re.search(r'<main[^>]*>(.*?)</main>', html, re.DOTALL | re.I)
    if content_m:
        inner = content_m.group(1)
        inner = re.sub(r'<(?:nav|header|footer|script|style)[^>]*>.*?</(?:nav|header|footer|script|style)>', '', inner, flags=re.DOTALL | re.I)
        paras = re.findall(r'<(?:p|ul|ol|h[2-6])[^>]*>.*?</(?:p|ul|ol|h[2-6])>', inner, re.DOTALL | re.I)
        if len(paras) >= 2:
            return h1_text, '\n'.join(paras), score

    # No content found but H1 matched
    return h1_text, None, score


def try_fetch_lesson_from_old_site(lesson_title: str, series_title: str, book_he: str) -> tuple[str | None, str | None, float, str]:
    """
    מנסה לשלוף content מהאתר הישן.
    מחזיר (description, content_html, confidence, reason)
    """
    # Build series URLs
    if series_title and book_he:
        series_urls = find_series_urls(series_title, book_he)
    else:
        series_urls = []

    # Try each series URL
    lesson_norm = normalize(lesson_title)

    for series_url in series_urls:
        html = fetch_html(series_url)
        if not html:
            continue

        # Look for lesson link within the series page
        # Format: href="/מאגר-עזרי-הלמידה/.../lesson-slug/"
        lesson_links = re.findall(r'href="(/מאגר-עזרי-הלמידה/[^"]+)"', html)
        prefix = series_url.replace(OLD_SITE, '').rstrip('/')

        for link_path in lesson_links:
            if not link_path.startswith(prefix + '/'):
                continue
            # Check if link text/slug matches lesson title
            seg = link_path.rstrip('/').split('/')[-1]
            try:
                seg_decoded = unquote(seg).replace('-', ' ')
            except Exception:
                seg_decoded = seg
            seg_norm = normalize(seg_decoded)

            if len(lesson_norm) < 4 or len(seg_norm) < 4:
                continue

            # Check match
            min_match = min(len(lesson_norm), len(seg_norm), 10)
            if lesson_norm[:min_match] != seg_norm[:min_match]:
                continue

            lesson_url = OLD_SITE + link_path
            lesson_html = fetch_html(lesson_url)
            if not lesson_html:
                continue

            h1, content, score = extract_lesson_content_from_page(lesson_html, lesson_title)
            if score >= 0.75:
                desc = make_description(content) if content else (h1 or "")
                return desc, content, score, f"scraped from {lesson_url} (H1 match {score:.2f})"

    return None, None, 0.0, f"no page found for '{lesson_title}'"


# ============================================================
# Main run
# ============================================================

def do_run():
    print(f"\n=== ריצת תוכן {'[DRY-RUN]' if DRY_RUN else '[LIVE]'} ===")
    print(f"מלא description/content לשיעורים הריקים\n")

    # Load not-found list
    nf_path = SCRIPTS_DIR / "fill-teacher-attachments-v2-not-found.json"
    if not nf_path.exists():
        print("לא נמצא fill-teacher-attachments-v2-not-found.json", file=sys.stderr)
        sys.exit(1)

    with open(nf_path, encoding="utf-8") as f:
        not_found_list = json.load(f)

    lesson_ids = [item["id"] for item in not_found_list]
    print(f"סה\"כ שיעורים ב-not-found.json: {len(lesson_ids)}")

    # Fetch current state from DB for all these lessons
    # (content, description)
    print("שולף מצב נוכחי מ-DB...", flush=True)
    id_list_sql = "','".join(lesson_ids)
    all_rows = sql_query(f"""
        SELECT l.id::text, l.title, l.description, l.content, l.bible_book,
               s.title as series_title
        FROM lessons l JOIN series s ON l.series_id=s.id
        WHERE l.id IN ('{id_list_sql}')
        ORDER BY s.title, l.title
    """)

    print(f"נשלפו {len(all_rows)} שיעורים מה-DB")

    # Counters
    cnt_desc_from_content = 0  # description generated from existing content
    cnt_scraped_full = 0        # content+description scraped from old site
    cnt_skipped = 0             # already has description
    cnt_failed = 0              # truly failed
    still_empty = []            # truly empty after all attempts

    # State file
    state_path = SCRIPTS_DIR / "fill-teacher-content-state.json"
    if state_path.exists():
        with open(state_path, encoding="utf-8") as f:
            state = json.load(f)
        print(f"ממשיך מ-state קיים: {len(state)} כבר טופלו")
    else:
        state = {}

    todo = [r for r in all_rows if r["id"] not in state]
    print(f"נשאר לטיפול: {len(todo)}\n")

    for i, row in enumerate(todo, 1):
        lid = row["id"]
        title = row.get("title") or ""
        description = row.get("description") or ""
        content = row.get("content") or ""
        book = row.get("bible_book") or ""
        series = row.get("series_title") or ""

        if i % 30 == 1:
            print(f"\n--- [{i}/{len(todo)}] '{title[:50]}' | סדרה: {series[:35]}")

        # Skip if already has description (>=20 chars)
        if len(description) >= 20:
            cnt_skipped += 1
            state[lid] = {"status": "skip", "reason": "already has description"}
            continue

        # Case 1: content exists — extract description from it
        if len(content) > 80:
            new_desc = make_description(content)
            state[lid] = {"status": "desc_from_content", "description": new_desc[:80]}
            if not DRY_RUN:
                ok = db_update_description(lid, new_desc)
                if not ok:
                    cnt_failed += 1
                    state[lid]["status"] = "failed"
                    continue
            cnt_desc_from_content += 1
            if i % 20 == 0:
                print(f"  {'[DRY] ' if DRY_RUN else ''}desc_from_content: '{title[:40]}' → '{new_desc[:50]}'")
            continue

        # Case 2: content empty — try scraping from old site
        if not title:
            cnt_failed += 1
            state[lid] = {"status": "failed", "reason": "no title"}
            still_empty.append({"id": lid, "title": title, "series": series, "book": book, "reason": "no title"})
            continue

        desc, content_html, score, reason = try_fetch_lesson_from_old_site(title, series, book)

        if score >= 0.75 and desc:
            state[lid] = {"status": "scraped", "score": score, "reason": reason, "description": (desc or "")[:80]}
            if not DRY_RUN:
                ok = db_update_description(lid, desc, content_html)
                if not ok:
                    cnt_failed += 1
                    state[lid]["status"] = "failed"
                    continue
            cnt_scraped_full += 1
            if i % 5 == 0:
                print(f"  {'[DRY] ' if DRY_RUN else ''}scraped: '{title[:40]}' score={score:.2f} → '{(desc or '')[:50]}'")
        else:
            cnt_failed += 1
            state[lid] = {"status": "failed", "score": score, "reason": reason}
            still_empty.append({"id": lid, "title": title, "series": series, "book": book, "reason": reason})

        # Save state every 20
        if i % 20 == 0:
            with open(state_path, "w", encoding="utf-8") as f:
                json.dump(state, f, ensure_ascii=False, indent=2)

        time.sleep(0.2)

    # Final state save
    with open(state_path, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)

    # Save remaining empty list
    remaining_path = SCRIPTS_DIR / "fill-teacher-content-still-empty.json"
    with open(remaining_path, "w", encoding="utf-8") as f:
        json.dump(still_empty, f, ensure_ascii=False, indent=2)

    total = len(todo)
    filled = cnt_desc_from_content + cnt_scraped_full

    print(f"\n{'='*55}")
    print(f"=== סיכום {'DRY-RUN' if DRY_RUN else 'LIVE'} ===")
    print(f"סה\"כ טופלו:                  {total}")
    print(f"description מ-content קיים:  {cnt_desc_from_content} ({100*cnt_desc_from_content//max(total,1)}%)")
    print(f"scraped מהאתר הישן:           {cnt_scraped_full} ({100*cnt_scraped_full//max(total,1)}%)")
    print(f"כבר יש description:           {cnt_skipped}")
    print(f"נכשלו (ריקים):               {cnt_failed} ({100*cnt_failed//max(total,1)}%)")
    print(f"סה\"כ מולאו:                  {filled} ({100*filled//max(total,1)}%)")
    print(f"\nState: {state_path}")
    print(f"עדיין ריקים: {remaining_path} ({len(still_empty)} שיעורים)")

    if still_empty:
        print(f"\n--- {len(still_empty)} שיעורים עדיין ריקים (ליואב) ---")
        from collections import defaultdict
        by_series: dict = defaultdict(list)
        for item in still_empty:
            by_series[item['series']].append(item['title'])
        for s, titles in sorted(by_series.items(), key=lambda x: -len(x[1])):
            print(f"  סדרה: {s} ({len(titles)})")
            for t in titles[:3]:
                print(f"    - {t[:60]}")
            if len(titles) > 3:
                print(f"    ... ועוד {len(titles)-3}")


if __name__ == "__main__":
    do_run()
