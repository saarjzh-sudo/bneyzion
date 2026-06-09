#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
step_b_new_inventory.py
========================
שלב B: שאילתות Supabase לספר נבחר — ציבורי + מורים.

פלט: scripts/parity/reports/new-inventory-{book}-{date}.json

Usage:
    env -u HTTPS_PROXY -u HTTP_PROXY \
    SUPABASE_MANAGEMENT_API_TOKEN=sbp_... \
    python3 scripts/parity/step_b_new_inventory.py --book בראשית [--section main|teachers|both]
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from parity_engine import sql_query, normalize_he

REPORTS_DIR = Path(__file__).parent / "reports"
REPORTS_DIR.mkdir(exist_ok=True)

parser = argparse.ArgumentParser()
parser.add_argument("--book", default="בראשית")
parser.add_argument("--section", default="both", choices=["main", "teachers", "both"])
parser.add_argument("--output", default=None)
args = parser.parse_args()

BOOK  = args.book
TODAY = date.today().isoformat().replace("-", "")
OUT   = Path(args.output) if args.output else REPORTS_DIR / f"new-inventory-{BOOK}-{TODAY}.json"


# ============================================================
# Supabase queries
# ============================================================

def _escape_sql_str(s: str) -> str:
    return s.replace("'", "''")


def fetch_series_for_book(book: str, audience: str) -> list[dict]:
    """
    Fetch series rows for a book + audience tag.
    audience: 'general' | 'teachers'
    """
    book_esc = _escape_sql_str(book)
    # We use bible_book column OR title ILIKE match
    audience_filter = f"audience_tags @> ARRAY['{audience}']"
    q = f"""
    SELECT
      s.id,
      s.title,
      s.description,
      s.image_url,
      s.bible_book,
      s.audience_tags,
      s.status,
      COUNT(l.id) AS lesson_count
    FROM series s
    LEFT JOIN lessons l ON l.series_id = s.id AND l.status = 'published'
    WHERE (s.bible_book = '{book_esc}' OR s.title ILIKE '%{book_esc}%')
      AND {audience_filter}
    GROUP BY s.id
    ORDER BY s.title;
    """
    return sql_query(q)


def fetch_lessons_for_book(book: str, audience: str) -> list[dict]:
    """
    Fetch all published lessons for a book + audience tag (via series join).
    """
    book_esc = _escape_sql_str(book)
    audience_filter = f"s.audience_tags @> ARRAY['{audience}']"
    q = f"""
    SELECT
      l.id,
      l.title,
      l.description,
      l.content,
      l.attachment_url,
      l.audio_url,
      l.video_url,
      l.thumbnail_url,
      l.status,
      l.audience_tags,
      l.series_id,
      s.title AS series_title,
      s.bible_book,
      r.name AS rabbi_name
    FROM lessons l
    JOIN series s ON s.id = l.series_id
    LEFT JOIN rabbis r ON r.id = l.rabbi_id
    WHERE (s.bible_book = '{book_esc}' OR s.title ILIKE '%{book_esc}%')
      AND {audience_filter}
      AND l.status = 'published'
    ORDER BY s.title, l.title;
    """
    return sql_query(q)


def fetch_lessons_direct_tag(book: str, audience: str) -> list[dict]:
    """
    Also fetch lessons directly tagged (lesson.audience_tags) for book,
    in case series has different tagging.
    """
    book_esc = _escape_sql_str(book)
    audience_filter = f"l.audience_tags @> ARRAY['{audience}']"
    q = f"""
    SELECT
      l.id,
      l.title,
      l.description,
      l.content,
      l.attachment_url,
      l.audio_url,
      l.video_url,
      l.thumbnail_url,
      l.status,
      l.audience_tags,
      l.series_id,
      s.title AS series_title,
      s.bible_book,
      r.name AS rabbi_name
    FROM lessons l
    JOIN series s ON s.id = l.series_id
    LEFT JOIN rabbis r ON r.id = l.rabbi_id
    WHERE (s.bible_book = '{book_esc}' OR s.title ILIKE '%{book_esc}%')
      AND {audience_filter}
      AND l.status = 'published'
    ORDER BY s.title, l.title;
    """
    return sql_query(q)


# ============================================================
# Build inventory
# ============================================================

def build_section_inventory(book: str, audience: str, section_tag: str) -> dict:
    print(f"\n[{section_tag}] שאילתת Supabase — {book}...")

    series_rows   = fetch_series_for_book(book, audience)
    lesson_rows   = fetch_lessons_for_book(book, audience)
    lesson_direct = fetch_lessons_direct_tag(book, audience)

    # Merge lessons (dedup by id)
    seen_ids: set[str] = set()
    all_lessons: list[dict] = []
    for l in lesson_rows + lesson_direct:
        lid = str(l.get("id", ""))
        if lid and lid not in seen_ids:
            seen_ids.add(lid)
            all_lessons.append(l)

    print(f"  סדרות: {len(series_rows)}")
    print(f"  שיעורים: {len(all_lessons)}")

    # Attachment status summary
    with_att    = sum(1 for l in all_lessons if l.get("attachment_url"))
    with_audio  = sum(1 for l in all_lessons if l.get("audio_url"))
    with_video  = sum(1 for l in all_lessons if l.get("video_url"))
    with_none   = sum(1 for l in all_lessons if not any([
        l.get("attachment_url"), l.get("audio_url"), l.get("video_url")
    ]))

    print(f"  עם attachment: {with_att} | audio: {with_audio} | video: {with_video} | ריקים: {with_none}")

    return {
        "book":     book,
        "section":  section_tag,
        "series":   series_rows,
        "lessons":  all_lessons,
        "stats": {
            "series_count":   len(series_rows),
            "lesson_count":   len(all_lessons),
            "with_attachment": with_att,
            "with_audio":     with_audio,
            "with_video":     with_video,
            "empty":          with_none,
        }
    }


# ============================================================
# Main
# ============================================================

def main():
    print(f"=== שלב B: אינוונטר חדש (Supabase) — ספר {BOOK} ===")
    result: dict[str, Any] = {"book": BOOK, "date": TODAY}

    if SECTION in ("main", "both"):
        result["main"] = build_section_inventory(BOOK, "general", "main")

    if SECTION in ("teachers", "both"):
        result["teachers"] = build_section_inventory(BOOK, "teachers", "teachers")

    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nנשמר: {OUT}")
    return result


SECTION = args.section

if __name__ == "__main__":
    from typing import Any
    main()
