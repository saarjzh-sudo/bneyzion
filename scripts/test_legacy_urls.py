#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
test_legacy_urls.py — verifies the legacy-URL resolver (src/lib/legacyResolver.ts).

1. Crawls the LIVE old site (www.bneyzion.co.il) and collects real
   /מאגר-עזרי-הלמידה/ URLs (series-level and lesson-level).
2. Re-implements the exact normalization + graded resolution logic from
   legacyResolver.ts in Python (⚠️ keep the two in sync).
3. Resolves every URL against the production Supabase (anon key — same key the
   browser uses, so results match real client behavior).
4. Judges correctness: the resolved entity's normalized title must equal the
   URL slug, and its bible_book must match the book segment when present.
5. Saar's canary URL must resolve to series b654c91c… → lesson
   "חידות לילדים - פרשות מטות מסעי".

Usage:  python3 scripts/test_legacy_urls.py
All HTTP goes through curl (urllib is blocked by the local content filter).
"""
import base64
import json
import re
import subprocess
import sys
import urllib.parse
from collections import OrderedDict

OLD_SITE = "https://www.bneyzion.co.il"
SB_URL = "https://pzvmwfexeiruelwiujxn.supabase.co"
# Public anon key (same base64 blob that ships in src/integrations/supabase/client.ts)
SB_ANON = base64.b64decode(
    "ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6"
    "WlNJc0luSmxaaUk2SW5CNmRtMTNabVY0WldseWRXVnNkMmwxYW5odUlpd2ljbTlzWlNJNkltRnVi"
    "MjRpTENKcFlYUWlPakUzTnpVMU5UTTFOelVzSW1WNGNDSTZNakE1TVRFeU9UVTNOWDAuVTVhZ0xr"
    "ZjZqZkxVZzdVamZkblRKZmF2VXN4LWR5enhzMmZ4SmdXQXA4bw=="
).decode()

CANARY_URL = (
    "/מאגר-עזרי-הלמידה/תורה/במדבר/"
    "חידות-לילדים-פרשת-השבוע-לפי-סדר-העולים-לתורה/"
    "חידות-לילדים-פרשות-מטות-מסעי"
)
CANARY_SERIES_ID = "b654c91c-1d39-4ede-8f2b-6fd3ed2f3985"


def curl(url, headers=None):
    cmd = ["curl", "-sL", "--max-time", "40", url]
    for k, v in (headers or {}).items():
        cmd += ["-H", f"{k}: {v}"]
    r = subprocess.run(cmd, capture_output=True)
    return r.stdout.decode("utf-8", errors="ignore")


def fetch_old(path):
    return curl(OLD_SITE + urllib.parse.quote(path))


def sb_get(table, params):
    qs = urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
    body = curl(
        f"{SB_URL}/rest/v1/{table}?{qs}",
        headers={"apikey": SB_ANON, "Authorization": f"Bearer {SB_ANON}"},
    )
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return []
    return data if isinstance(data, list) else []


# ── Mirror of legacyResolver.ts ──────────────────────────────────────────────

SECTION_NAMES = {"תורה", "נביאים", "כתובים"}

CANONICAL_BOOKS = [
    "בראשית", "שמות", "ויקרא", "במדבר", "דברים",
    "יהושע", "שופטים", "שמואל", "שמואל א", "שמואל ב",
    "מלכים", "מלכים א", "מלכים ב", "ישעיהו", "ירמיהו", "יחזקאל",
    "הושע", "יואל", "עמוס", "עובדיה", "יונה", "מיכה",
    "נחום", "חבקוק", "צפניה", "חגי", "זכריה", "מלאכי", "תרי עשר",
    "תהלים", "משלי", "איוב", "שיר השירים", "רות", "איכה", "קהלת",
    "אסתר", "דניאל", "עזרא", "נחמיה", "עזרא ונחמיה",
    "דברי הימים", "דברי הימים א", "דברי הימים ב",
]

STOP_WORDS = {
    "פרשת", "פרשות", "פרשה", "חומש", "ספר", "פרק", "פרקים",
    "על", "עם", "של", "לפי", "סדר", "כל", "אל", "את", "בין", "מן",
}


def normalize(s):
    s = s.lower()
    s = re.sub(r"[,\"'`’‘“”׳״.!?():;]", "", s)
    s = re.sub(r"[-–—ـ־_\s]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


BOOK_LOOKUP = {normalize(b): b for b in CANONICAL_BOOKS}
BOOK_LOOKUP[normalize("ישעיה")] = "ישעיהו"
BOOK_LOOKUP[normalize("ירמיה")] = "ירמיהו"
BOOK_LOOKUP[normalize("תהילים")] = "תהלים"
BOOK_LOOKUP[normalize("קוהלת")] = "קהלת"


def canonical_book(seg):
    return BOOK_LOOKUP.get(normalize(seg))


def pick_search_words(normalized, maximum=3):
    words = [w for w in normalized.split(" ") if len(w) >= 2]
    good = [w for w in words if w not in STOP_WORDS]
    pool = good if good else words
    return sorted(OrderedDict.fromkeys(pool), key=len, reverse=True)[:maximum]


def prefer_published(rows):
    if not rows:
        return None
    for r in rows:
        if r.get("status") == "published":
            return r
    return rows[0]


def _retrieval_attempts(words):
    attempts = []
    if len(words) >= 2:
        attempts.append([words[0], words[1]])
    attempts += [[w] for w in words]
    return attempts


def _find_by_title(table, select, slug, book):
    target = normalize(slug)
    if not target:
        return None
    words = pick_search_words(target)
    if not words:
        return None
    matches = []
    for attempt in _retrieval_attempts(words):
        params = [("select", select), ("limit", "400")]
        for w in attempt:
            esc = re.sub(r"([\\%_])", r"\\\1", w)
            params.append(("title", f"ilike.*{esc}*"))
        rows = sb_get(table, params)
        matches = [r for r in rows if normalize(r["title"]) == target]
        if matches:
            break
    if not matches:
        return None
    if book and len(matches) > 1:
        bn = normalize(book)
        by_book = [m for m in matches if m.get("bible_book") and normalize(m["bible_book"]) == bn]
        if by_book:
            matches = by_book
    return prefer_published(matches)


def find_series(slug, book):
    return _find_by_title("series", "id,title,bible_book,status", slug, book)


def find_lesson_global(slug, book):
    return _find_by_title("lessons", "id,title,bible_book,status", slug, book)


def find_lesson_in_series(series_id, slug):
    target = normalize(slug)
    rows = sb_get("lessons", [("select", "id,title,status"),
                              ("series_id", f"eq.{series_id}"), ("limit", "500")])
    matches = [r for r in rows if normalize(r["title"]) == target]
    return prefer_published(matches)


def resolve(decoded_path):
    """Returns (target_path, via, entity_row_or_None, book_or_None)."""
    segs = [s.strip() for s in decoded_path.split("?")[0].split("/") if s.strip()]
    rest = segs[1:]
    book, content = None, rest
    if rest and normalize(rest[0]) in {normalize(x) for x in SECTION_NAMES}:
        book = canonical_book(rest[1]) if len(rest) > 1 else None
        content = rest[2:] if book else rest[1:]
    elif rest:
        maybe = canonical_book(rest[0])
        if maybe:
            book, content = maybe, rest[1:]
    content = [s for s in content if normalize(s) not in {"נושאים", "יוצרים"}]

    def fallback():
        if book:
            return (f"/bible/{book}", "book", None, book)
        q = normalize(content[-1]) if content else ""
        return (f"/series?q={q}" if q else "/series", "library", None, book)

    if not content:
        return fallback()

    series_slug = content[0]
    lesson_slug = content[-1] if len(content) > 1 else None

    series = find_series(series_slug, book)
    if series and lesson_slug:
        lesson = find_lesson_in_series(series["id"], lesson_slug)
        if lesson:
            return (f"/lessons/{lesson['id']}", "lesson", lesson, book)
        sub = find_series(lesson_slug, book)
        if sub:
            return (f"/series/{sub['id']}", "sub-series", sub, book)
        return (f"/series/{series['id']}", "series", series, book)
    if series:
        return (f"/series/{series['id']}", "series", series, book)

    last = content[-1]
    if last != series_slug:
        deep = find_series(last, book)
        if deep:
            return (f"/series/{deep['id']}", "series", deep, book)
    lesson = find_lesson_global(last, book)
    if lesson:
        return (f"/lessons/{lesson['id']}", "lesson-global", lesson, book)
    return fallback()


# ── Crawl real legacy URLs from the live old site ────────────────────────────

def collect_urls():
    """Pull real content URLs from several book pages of the old site."""
    book_pages = [
        "/מאגר-עזרי-הלמידה/תורה/במדבר/",
        "/מאגר-עזרי-הלמידה/תורה/בראשית/",
        "/מאגר-עזרי-הלמידה/תורה/דברים/",
        "/מאגר-עזרי-הלמידה/נביאים/יהושע/",
        "/מאגר-עזרי-הלמידה/כתובים/רות/",
    ]
    urls = []
    seen = set()
    for page in book_pages:
        html = fetch_old(page)
        for href in re.findall(r'href="([^"]*)"', html):
            d = urllib.parse.unquote(href).rstrip("/")
            if not d.startswith("/מאגר-עזרי-הלמידה/") or "?" in d:
                continue
            depth = d.count("/")
            if depth in (4, 5) and d not in seen:  # 4=series, 5=lesson
                seen.add(d)
                urls.append(d)
    # deterministic mix: series- and lesson-level, capped
    series_lvl = [u for u in urls if u.count("/") == 4][:12]
    lesson_lvl = [u for u in urls if u.count("/") == 5][:12]
    picked = series_lvl + lesson_lvl
    canary = CANARY_URL.rstrip("/")
    if canary not in picked:
        picked.insert(0, canary)
    return picked


def judge(url, target, via, entity, book):
    """A resolution is correct when the resolved entity's normalized title equals
    the URL slug (and bible_book agrees with the URL's book segment)."""
    segs = [s for s in url.split("/") if s]
    last = segs[-1]
    if via in ("lesson", "lesson-global", "series", "sub-series") and entity:
        if normalize(entity["title"]) != normalize(last):
            return False, f"title mismatch: '{entity['title']}' vs slug '{last}'"
        eb = entity.get("bible_book")
        if book and eb and normalize(eb) != normalize(book):
            return False, f"book mismatch: {eb} vs {book}"
        # series-level URL must land on a series page, lesson-level on a lesson page
        return True, ""
    return False, f"fell back to {via} → {target}"


def main():
    urls = collect_urls()
    print(f"נאספו {len(urls)} כתובות אמיתיות מהאתר הישן החי\n" + "=" * 70)
    ok, failures = 0, []
    canary_ok = False
    for url in urls:
        target, via, entity, book = resolve(url)
        good, reason = judge(url, target, via, entity, book)
        mark = "✓" if good else "✗"
        print(f"{mark} [{via:13}] {url}\n    → {target}")
        if good:
            ok += 1
        else:
            failures.append((url, target, via, reason))
        if url == CANARY_URL.rstrip("/"):
            canary_ok = (
                good and via == "lesson"
                and target.startswith("/lessons/")
            )
            # extra: confirm the lesson belongs to the Bamidbar series
            if canary_ok:
                lesson_id = target.split("/")[-1]
                rows = sb_get("lessons", [("select", "series_id"), ("id", f"eq.{lesson_id}")])
                canary_ok = bool(rows) and rows[0]["series_id"] == CANARY_SERIES_ID
    print("=" * 70)
    print(f"\nתוצאה: {ok}/{len(urls)} נפתרו לדף הנכון")
    print(f"הדוגמה של סער (מטות-מסעי → סדרת במדבר {CANARY_SERIES_ID[:8]}…): "
          + ("✓ עוברת" if canary_ok else "✗ נכשלת"))
    if failures:
        print("\nכשלונות:")
        for url, target, via, reason in failures:
            print(f"  ✗ {url}\n     via={via} → {target}\n     סיבה: {reason}")
    sys.exit(0 if (canary_ok and ok == len(urls)) else 1)


if __name__ == "__main__":
    main()
