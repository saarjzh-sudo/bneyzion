#!/usr/bin/env python3
"""
reconcile-mirror.py  —  Bnei Zion DB cleanup + fill — DETERMINISTIC DRY-RUN
=============================================================================

Usage:
    python3 reconcile-mirror.py [--dry-run] [--live] [--skip-recover]

    --dry-run       (default) Write candidate JSON files, NO writes to Supabase.
    --live          Actually execute DELETEs / UPDATEs / INSERTs. Requires
                    explicit confirmation prompt.
    --skip-recover  Skip the RECOVER analysis entirely (use when running LIVE
                    after dry-run verified; RECOVER is unreliable until v2 fix).

Categories detected
-------------------
  PLACEHOLDER   : Synthetic-UUID lesson (pattern *-0001-4000-8000-*) that has a
                  true-UUID twin in the same series with matching title.
                  → delete synthetic, keep real.

  EMPTY         : No audio_url, no video_url, no attachment_url, no content.
                  Sub-check: if AUTHORITATIVE-OLD has a matching entry (same series+title)
                  → reclassify as FILL (will be enriched), NOT deleted.

  EXACT_DUP     : (series_id + normalized-NFC title + canonical media_url) appears ≥2 times.
                  Keep: prefer real UUID + has content/media. If both have different content → UNCERTAIN.

  MISFILED_PSALM: lesson titled "מזמור <Heb-number>" sitting in a series whose
                  bible_book is "איוב" or "משלי".
                  Check if the corresponding "קריאה וביאור בקצרה של ספר תהלים" series
                  already has that psalm → DELETE; else → MOVE.

Protective guards
-----------------
  - audience_tags contains 'teachers' → SKIP entirely (no read, no write).
  - Any uncertain EXACT_DUP (both copies have differing non-null content) → UNCERTAIN bucket.
  - Dry-run writes only JSON; never touches Supabase.
  - Idempotent: each run derives candidates fresh from DB state; no local state.

LIVE execution
--------------
  Backup first: every deleted/updated row is written to /tmp/bneyzion-cleanup/backups/FINAL-deleted.jsonl
  before any DELETE. MOVE and FILL also backed up.
  Operations are batched in chunks of 50 to avoid Supabase timeout.
  Teacher guard re-verified server-side during LIVE (belt-and-suspenders).
"""

import argparse
import json
import os
import re
import subprocess
import sys
import unicodedata
import urllib.parse
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

SUPABASE_PROJECT = "pzvmwfexeiruelwiujxn"
SUPABASE_TOKEN   = os.environ.get("SUPABASE_MANAGEMENT_API_TOKEN","")
SUPABASE_URL     = f"https://api.supabase.com/v1/projects/{SUPABASE_PROJECT}/database/query"

AUTHORITATIVE_PATH = Path("/tmp/bneyzion-cleanup/AUTHORITATIVE-OLD.json")
OUTPUT_DIR         = Path("/tmp/bneyzion-cleanup/final")
BACKUP_DIR         = Path("/tmp/bneyzion-cleanup/backups")
FINAL_DELETED_LOG  = BACKUP_DIR / "FINAL-deleted.jsonl"
FINAL_MOVE_LOG     = BACKUP_DIR / "FINAL-moved.jsonl"
FINAL_FILL_LOG     = BACKUP_DIR / "FINAL-filled.jsonl"

# Synthetic-UUID regex pattern (PostgreSQL): matches *-0001-4000-8000-* variants
SYNTHETIC_UUID_PATTERN = r"^[a-f0-9]{8}-[a-f0-9]{4}-4000-8000-[a-f0-9]{12}$"

# Misfile target books (both Hebrew and slug forms)
MISFILE_BOOKS = {"איוב", "משלי", "iyov", "mishlei"}

# Tehilim series that should receive moved psalms
TEHILIM_KRIA_SERIES_TITLE = "קריאה וביאור בקצרה של ספר תהילים"

# Page size for paginated Supabase queries
PAGE_SIZE = 500

# Batch size for LIVE operations
BATCH_SIZE = 50


# ---------------------------------------------------------------------------
# Helper: run SQL against Supabase Management API
# ---------------------------------------------------------------------------

def run_sql(sql: str, retry: int = 5) -> list[dict]:
    """Run a SQL query via Supabase Management API. Returns list of row dicts.
    Automatically retries on ThrottlerException with exponential backoff."""
    import time
    payload = json.dumps({"query": sql})
    cmd = [
        "curl", "-s", "--noproxy", "*",
        "-X", "POST", SUPABASE_URL,
        "-H", f"Authorization: Bearer {SUPABASE_TOKEN}",
        "-H", "Content-Type: application/json",
        "-d", payload,
    ]
    for attempt in range(retry):
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            raise RuntimeError(f"curl failed: {result.stderr}")
        try:
            data = json.loads(result.stdout)
        except json.JSONDecodeError as e:
            raise RuntimeError(f"JSON parse error: {e}\nRaw: {result.stdout[:500]}")
        # Handle throttle: {"message": "ThrottlerException: Too Many Requests"}
        if isinstance(data, dict) and "message" in data and "ThrottlerException" in data["message"]:
            wait = 10 * (2 ** attempt)
            print(f"  [throttle] Supabase rate-limited. Waiting {wait}s (attempt {attempt+1}/{retry}) ...")
            time.sleep(wait)
            continue
        if isinstance(data, dict) and "error" in data:
            raise RuntimeError(f"Supabase error: {data}")
        return data
    raise RuntimeError(f"Supabase API throttled after {retry} retries. SQL: {sql[:100]}")


def run_sql_paginated(base_sql: str, order_col: str = "id") -> list[dict]:
    """Paginate a SELECT using OFFSET. base_sql must NOT have LIMIT/OFFSET."""
    rows = []
    offset = 0
    while True:
        page_sql = f"{base_sql} ORDER BY {order_col} LIMIT {PAGE_SIZE} OFFSET {offset}"
        page = run_sql(page_sql)
        rows.extend(page)
        if len(page) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return rows


# ---------------------------------------------------------------------------
# Helper: normalize text for matching
# ---------------------------------------------------------------------------

def norm(s: str | None) -> str:
    if s is None:
        return ""
    return unicodedata.normalize("NFC", s.strip())


def strip_nikud(s: str) -> str:
    """Remove Hebrew vowel marks (nikud) and cantillation marks."""
    return "".join(c for c in s if unicodedata.category(c) not in ("Mn",))


def norm_title_for_recover(s: str | None) -> str:
    """NFC + strip nikud + remove common punctuation for robust title matching."""
    if s is None:
        return ""
    s = unicodedata.normalize("NFC", s.strip())
    s = strip_nikud(s)
    # Remove common punctuation (keep Hebrew letters, digits, spaces)
    s = re.sub(r'[^\w\sא-ת]', '', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def norm_url_for_recover(url: str | None) -> str:
    """
    Normalize a URL for comparison:
    1. URL-decode (handle percent-encoding, including Hebrew chars).
    2. NFC normalize the decoded string.
    3. Strip query params and fragments (tracking params etc).
    4. Lowercase scheme+host, keep path as-is (Hebrew filenames are case-preserving).
    """
    if not url:
        return ""
    try:
        decoded = urllib.parse.unquote(url)
        decoded = unicodedata.normalize("NFC", decoded)
        parsed = urllib.parse.urlparse(decoded)
        # Rebuild without query/fragment
        clean = urllib.parse.urlunparse((
            parsed.scheme.lower(),
            parsed.netloc.lower(),
            parsed.path,
            "", "", ""
        ))
        return clean
    except Exception:
        return url


def url_basename(url: str | None) -> str:
    """Extract just the filename from a URL (last path component, decoded)."""
    if not url:
        return ""
    try:
        decoded = urllib.parse.unquote(url)
        return Path(decoded).name
    except Exception:
        return ""


def canonical_media(lesson: dict) -> str | None:
    """Return the first non-null media URL, normalized."""
    for field in ("audio_url", "video_url", "attachment_url"):
        v = lesson.get(field)
        if v:
            return norm(v)
    return None


def is_synthetic(uuid_str: str) -> bool:
    """True if the ID matches the synthetic-UUID pattern *-0001-4000-8000-*"""
    parts = uuid_str.split("-")
    if len(parts) != 5:
        return False
    return parts[2] == "4000" and parts[3] == "8000"


def has_teachers_tag(tags) -> bool:
    if not tags:
        return False
    if isinstance(tags, list):
        return "teachers" in tags
    if isinstance(tags, str):
        return "teachers" in tags
    return False


# ---------------------------------------------------------------------------
# Load Authoritative Old inventory
# ---------------------------------------------------------------------------

def load_authoritative() -> list[dict]:
    """
    Flatten AUTHORITATIVE-OLD.json into a list of lesson dicts, each with:
      node_id, title, book, series, subseries, audio_url, video_url,
      attachment_url, has_content, old_url, is_duplicate
    """
    print(f"[AUTH] Loading {AUTHORITATIVE_PATH} ...")
    with open(AUTHORITATIVE_PATH, encoding="utf-8") as f:
        data = json.load(f)

    lessons = []
    books = data.get("books", {})
    for book_name, series_map in books.items():
        for series_name, v in series_map.items():
            if isinstance(v, list):
                # 2-level: book → series → [lessons]
                for lesson in v:
                    lessons.append({
                        **lesson,
                        "book": book_name,
                        "series": series_name,
                        "subseries": series_name,
                    })
            elif isinstance(v, dict):
                # 3-level: book → series → subseries → [lessons]
                for subseries_name, lesson_list in v.items():
                    if isinstance(lesson_list, list):
                        for lesson in lesson_list:
                            lessons.append({
                                **lesson,
                                "book": book_name,
                                "series": series_name,
                                "subseries": subseries_name,
                            })

    print(f"[AUTH] Total authoritative lessons: {len(lessons)}")
    return lessons


# ---------------------------------------------------------------------------
# Fetch all Supabase lessons (non-teachers)
# ---------------------------------------------------------------------------

def fetch_supabase_lessons() -> list[dict]:
    """
    Fetch all lessons from Supabase where audience_tags does NOT contain 'teachers'.
    Fields: id, title, series_id, content, audio_url, video_url, attachment_url,
            audience_tags, bible_book (from joined series)
    """
    print("[SB] Fetching all non-teacher lessons from Supabase ...")
    base_sql = """
        SELECT
            l.id,
            l.title,
            l.series_id,
            l.content,
            l.audio_url,
            l.video_url,
            l.attachment_url,
            l.audience_tags,
            l.legacy_attachment_url,
            s.title  AS series_title,
            s.bible_book,
            s.audience_tags AS series_audience_tags
        FROM lessons l
        LEFT JOIN series s ON s.id = l.series_id
        WHERE NOT (COALESCE(l.audience_tags, ARRAY[]::text[]) @> ARRAY['teachers'])
    """
    rows = run_sql_paginated(base_sql, order_col="l.id")
    print(f"[SB] Fetched {len(rows)} non-teacher lessons.")
    return rows


def fetch_supabase_series() -> list[dict]:
    """Fetch all series for lookup."""
    print("[SB] Fetching all series ...")
    base_sql = "SELECT id, title, bible_book, audience_tags FROM series"
    rows = run_sql_paginated(base_sql, order_col="id")
    print(f"[SB] Fetched {len(rows)} series.")
    return rows


def fetch_lesson_full(lesson_id: str) -> dict | None:
    """Fetch all fields for a single lesson (for backup before delete)."""
    sql = f"SELECT * FROM lessons WHERE id = '{lesson_id}'"
    rows = run_sql(sql)
    return rows[0] if rows else None


# ---------------------------------------------------------------------------
# Category 1: PLACEHOLDER detection
# ---------------------------------------------------------------------------

def find_placeholders(sb_lessons: list[dict]) -> tuple[list[dict], int]:
    """
    Find synthetic-UUID lessons that have a real-UUID twin in the same series
    with the same normalized title.

    Returns: (delete_candidates, total_synthetic_count)
    """
    print("[PLACEHOLDER] Scanning ...")

    synthetic = [l for l in sb_lessons if is_synthetic(l["id"])]
    real      = [l for l in sb_lessons if not is_synthetic(l["id"])]

    # Build lookup: (series_id, norm_title) → list of real lessons
    real_index: dict[tuple, list[dict]] = {}
    for l in real:
        key = (l["series_id"], norm(l["title"]))
        real_index.setdefault(key, []).append(l)

    candidates = []
    for s_lesson in synthetic:
        key = (s_lesson["series_id"], norm(s_lesson["title"]))
        real_matches = real_index.get(key, [])
        if real_matches:
            # Only delete if real match has media OR content (not double-empty)
            real_match = real_matches[0]
            real_has_content = (
                real_match.get("audio_url") or
                real_match.get("video_url") or
                real_match.get("attachment_url") or
                real_match.get("content")
            )
            candidates.append({
                "id": s_lesson["id"],
                "title": s_lesson["title"],
                "series_id": s_lesson["series_id"],
                "series": s_lesson.get("series_title", ""),
                "book": s_lesson.get("bible_book", ""),
                "category": "PLACEHOLDER",
                "reason": f"synthetic UUID; real twin {real_match['id']} exists in same series",
                "evidence": {
                    "synthetic_id": s_lesson["id"],
                    "real_twin_id": real_match["id"],
                    "real_has_content": bool(real_has_content),
                },
                "media": canonical_media(s_lesson),
                "audio_url": s_lesson.get("audio_url"),
                "video_url": s_lesson.get("video_url"),
                "attachment_url": s_lesson.get("attachment_url"),
                "content_preview": (s_lesson.get("content") or "")[:100],
                "audience_tags": s_lesson.get("audience_tags"),
            })

    print(f"[PLACEHOLDER] {len(synthetic)} synthetic total → {len(candidates)} have real UUID twins → DELETE candidates")
    no_twin = len(synthetic) - len(candidates)
    print(f"[PLACEHOLDER] {no_twin} synthetic WITHOUT a real twin → kept (will appear in EMPTY/FILL checks)")
    return candidates, len(synthetic)


# ---------------------------------------------------------------------------
# Category 2: EMPTY detection (with FILL reclassification)
# ---------------------------------------------------------------------------

def find_empty_and_fill(
    sb_lessons: list[dict],
    auth_lessons: list[dict],
    placeholder_ids: set[str],
) -> tuple[list[dict], list[dict]]:
    """
    EMPTY: no audio/video/attachment/content AND no match in AUTHORITATIVE.
    FILL:  no media in Supabase BUT has a matching entry in AUTHORITATIVE with media.

    Skips lessons already flagged as PLACEHOLDER.
    Returns: (empty_delete_candidates, fill_candidates)
    """
    print("[EMPTY/FILL] Scanning ...")

    # Build authoritative lookup: (subseries_norm, title_norm) → lesson
    auth_by_title: dict[tuple, list[dict]] = {}
    for al in auth_lessons:
        key = (norm(al["subseries"]), norm(al["title"]))
        auth_by_title.setdefault(key, []).append(al)

    # Also by title alone (weaker match)
    auth_by_title_only: dict[str, list[dict]] = {}
    for al in auth_lessons:
        key = norm(al["title"])
        auth_by_title_only.setdefault(key, []).append(al)

    empty_deletes = []
    fill_candidates = []

    for lesson in sb_lessons:
        if lesson["id"] in placeholder_ids:
            continue

        has_media = (
            lesson.get("audio_url") or
            lesson.get("video_url") or
            lesson.get("attachment_url") or
            lesson.get("legacy_attachment_url")
        )
        has_content = bool(lesson.get("content"))

        if has_media or has_content:
            continue  # Not empty

        # Truly empty — look for match in AUTHORITATIVE
        series_norm = norm(lesson.get("series_title", ""))
        title_norm  = norm(lesson.get("title", ""))

        auth_matches = auth_by_title.get((series_norm, title_norm), [])
        if not auth_matches:
            # Weaker match: title only
            auth_matches = auth_by_title_only.get(title_norm, [])

        if auth_matches:
            # Has an authoritative match — FILL candidate
            am = auth_matches[0]
            if am.get("audio_url") or am.get("video_url") or am.get("attachment_url") or am.get("has_content"):
                fill_candidates.append({
                    "id": lesson["id"],
                    "title": lesson["title"],
                    "series_id": lesson["series_id"],
                    "series": lesson.get("series_title", ""),
                    "book": lesson.get("bible_book", ""),
                    "category": "FILL",
                    "old_node_id": am.get("node_id"),
                    "fill_audio_url": am.get("audio_url"),
                    "fill_video_url": am.get("video_url"),
                    "fill_attachment_url": am.get("attachment_url"),
                    "fill_has_content": am.get("has_content"),
                    "fill_old_url": am.get("old_url"),
                })
            else:
                # Auth match is also empty — DELETE
                empty_deletes.append({
                    "id": lesson["id"],
                    "title": lesson["title"],
                    "series_id": lesson["series_id"],
                    "series": lesson.get("series_title", ""),
                    "book": lesson.get("bible_book", ""),
                    "category": "EMPTY",
                    "reason": "no media/content in Supabase; AUTHORITATIVE match also empty",
                    "evidence": {"auth_node_id": am.get("node_id"), "auth_has_content": am.get("has_content")},
                    "media": None,
                    "audio_url": None,
                    "video_url": None,
                    "attachment_url": None,
                    "content_preview": "",
                    "audience_tags": lesson.get("audience_tags"),
                })
        else:
            # No auth match — DELETE
            empty_deletes.append({
                "id": lesson["id"],
                "title": lesson["title"],
                "series_id": lesson["series_id"],
                "series": lesson.get("series_title", ""),
                "book": lesson.get("bible_book", ""),
                "category": "EMPTY",
                "reason": "no media/content in Supabase; no matching entry in AUTHORITATIVE",
                "evidence": {"looked_up_series": series_norm, "looked_up_title": title_norm},
                "media": None,
                "audio_url": None,
                "video_url": None,
                "attachment_url": None,
                "content_preview": "",
                "audience_tags": lesson.get("audience_tags"),
            })

    print(f"[EMPTY/FILL] EMPTY→DELETE: {len(empty_deletes)}  FILL candidates: {len(fill_candidates)}")
    return empty_deletes, fill_candidates


# ---------------------------------------------------------------------------
# Category 3: EXACT_DUP detection
# ---------------------------------------------------------------------------

def find_exact_dups(
    sb_lessons: list[dict],
    placeholder_ids: set[str],
) -> tuple[list[dict], int]:
    """
    Find groups where (series_id, norm_title, canonical_media) appear ≥2 times.
    Returns: (delete_candidates, uncertain_count)
    If both copies have different non-null content → UNCERTAIN, excluded from delete.
    """
    print("[EXACT_DUP] Scanning ...")

    # Build groups
    groups: dict[tuple, list[dict]] = {}
    for lesson in sb_lessons:
        if lesson["id"] in placeholder_ids:
            continue
        key = (
            lesson["series_id"],
            norm(lesson["title"]),
            canonical_media(lesson) or "",
        )
        groups.setdefault(key, []).append(lesson)

    dup_groups = {k: v for k, v in groups.items() if len(v) >= 2}
    print(f"[EXACT_DUP] {len(dup_groups)} duplicate groups found")

    delete_candidates = []
    uncertain_count = 0

    for key, group in dup_groups.items():
        series_id, norm_title, media = key

        # Detect uncertain: both copies have different non-null content
        contents = [norm(l.get("content") or "") for l in group]
        non_empty_contents = [c for c in contents if c]
        if len(set(non_empty_contents)) >= 2:
            uncertain_count += 1
            continue  # Don't delete — uncertain

        # Choose keeper: prefer real UUID, then prefer has_media, then prefer has_content
        def keeper_score(l: dict) -> tuple:
            is_real = 0 if is_synthetic(l["id"]) else 1
            has_m   = 1 if canonical_media(l) else 0
            has_c   = 1 if l.get("content") else 0
            return (is_real, has_m, has_c)

        group_sorted = sorted(group, key=keeper_score, reverse=True)
        keeper   = group_sorted[0]
        to_delete = group_sorted[1:]

        for dup in to_delete:
            delete_candidates.append({
                "id": dup["id"],
                "title": dup["title"],
                "series_id": dup["series_id"],
                "series": dup.get("series_title", ""),
                "book": dup.get("bible_book", ""),
                "category": "EXACT_DUP",
                "reason": f"exact duplicate of keeper {keeper['id']} (same series+title+media)",
                "evidence": {
                    "keeper_id": keeper["id"],
                    "keeper_is_real": not is_synthetic(keeper["id"]),
                    "group_size": len(group),
                },
                "media": canonical_media(dup),
                "audio_url": dup.get("audio_url"),
                "video_url": dup.get("video_url"),
                "attachment_url": dup.get("attachment_url"),
                "content_preview": (dup.get("content") or "")[:100],
                "audience_tags": dup.get("audience_tags"),
            })

    print(f"[EXACT_DUP] → DELETE: {len(delete_candidates)}  UNCERTAIN (skip): {uncertain_count}")
    return delete_candidates, uncertain_count


# ---------------------------------------------------------------------------
# Category 4: MISFILED_PSALM detection
# ---------------------------------------------------------------------------

def find_misfiled_psalms(
    sb_lessons: list[dict],
    all_series: list[dict],
    placeholder_ids: set[str],
) -> tuple[list[dict], list[dict]]:
    """
    Find lessons titled "מזמור <Heb>" in iyov/mishlei series.
    If tehilim series already has that psalm → DELETE.
    Else → MOVE to tehilim series.
    Returns: (delete_candidates, move_candidates)
    """
    print("[MISFILED_PSALM] Scanning ...")

    # Find the tehilim "kriya" series
    tehilim_series = None
    for s in all_series:
        if norm(s["title"]) == norm(TEHILIM_KRIA_SERIES_TITLE):
            tehilim_series = s
            break

    if not tehilim_series:
        print(f"[MISFILED_PSALM] WARNING: Could not find tehilim series '{TEHILIM_KRIA_SERIES_TITLE}'")
        return [], []

    tehilim_series_id = tehilim_series["id"]

    # Index what's already in the tehilim series
    tehilim_titles = set()
    for lesson in sb_lessons:
        if lesson["series_id"] == tehilim_series_id:
            tehilim_titles.add(norm(lesson["title"]))

    # Find misfiled
    psalm_pattern = re.compile(r"^מזמור\s+[א-ת]+$")

    delete_candidates = []
    move_candidates   = []

    for lesson in sb_lessons:
        if lesson["id"] in placeholder_ids:
            continue
        book = lesson.get("bible_book") or ""
        if book not in MISFILE_BOOKS:
            continue
        title_n = norm(lesson.get("title", ""))
        if not psalm_pattern.match(title_n):
            continue

        # It's a misfiled psalm
        if title_n in tehilim_titles:
            delete_candidates.append({
                "id": lesson["id"],
                "title": lesson["title"],
                "series_id": lesson["series_id"],
                "series": lesson.get("series_title", ""),
                "book": lesson.get("bible_book", ""),
                "category": "MISFILED_PSALM_DELETE",
                "reason": f"misfiled in {book} series; tehilim series '{TEHILIM_KRIA_SERIES_TITLE}' already has this psalm",
                "evidence": {
                    "tehilim_series_id": tehilim_series_id,
                    "tehilim_series_title": tehilim_series["title"],
                    "psalm_already_there": True,
                },
                "media": canonical_media(lesson),
                "audio_url": lesson.get("audio_url"),
                "video_url": lesson.get("video_url"),
                "attachment_url": lesson.get("attachment_url"),
                "content_preview": (lesson.get("content") or "")[:100],
                "audience_tags": lesson.get("audience_tags"),
            })
        else:
            move_candidates.append({
                "id": lesson["id"],
                "title": lesson["title"],
                "from_series_id": lesson["series_id"],
                "from_series": lesson.get("series_title", ""),
                "from_book": lesson.get("bible_book", ""),
                "to_series_id": tehilim_series_id,
                "to_series": tehilim_series["title"],
                "to_book": "תהלים",
                "category": "MISFILED_PSALM_MOVE",
                "reason": f"misfiled in {book} series; not yet in tehilim series",
                "media": canonical_media(lesson),
                "audio_url": lesson.get("audio_url"),
                "video_url": lesson.get("video_url"),
                "attachment_url": lesson.get("attachment_url"),
            })

    print(f"[MISFILED_PSALM] DELETE (already in tehilim): {len(delete_candidates)}  MOVE: {len(move_candidates)}")
    return delete_candidates, move_candidates


# ---------------------------------------------------------------------------
# RECOVER v2: find authoritative lessons missing from Supabase (improved)
# ---------------------------------------------------------------------------

def find_recover_candidates_v2(
    auth_lessons: list[dict],
    sb_lessons: list[dict],
) -> list[dict]:
    """
    Improved RECOVER matching to eliminate false positives.

    For each authoritative lesson (with media or content), check if a matching
    lesson exists in Supabase by:
      1. Primary match: URL-normalized audio/video/attachment_url
         (urldecode + NFC + strip query/fragment)
      2. Basename match: filename of audio/attachment (handles path differences)
      3. Fallback: NFC-normalized title (strip nikud + punctuation) + series title
         (both series and subseries checked)

    If no match found → RECOVER candidate.

    This is significantly stricter than v1 which compared raw URLs character-by-character,
    causing URL-encoded Hebrew chars to produce false "missing" entries.
    """
    print("[RECOVER-v2] Scanning for missing lessons (improved URL normalization) ...")

    # Build Supabase lookup indexes
    sb_url_norm_index: set[str] = set()       # normalized full URLs
    sb_basename_index: set[str] = set()       # just filenames
    sb_title_series_index: set[tuple] = set() # (norm_title, norm_series)

    for l in sb_lessons:
        for field in ("audio_url", "video_url", "attachment_url", "legacy_attachment_url"):
            v = l.get(field)
            if v:
                normed = norm_url_for_recover(v)
                sb_url_norm_index.add(normed)
                bn = url_basename(v)
                if bn:
                    sb_basename_index.add(bn)

        # Title + series index (two variants: series_title and series_title normalized)
        t = norm_title_for_recover(l.get("title", ""))
        s1 = norm_title_for_recover(l.get("series_title", ""))
        if t:
            sb_title_series_index.add((t, s1))
            sb_title_series_index.add((t, ""))  # title-only fallback

    recover = []
    for al in auth_lessons:
        # Only recover if there's something to recover
        has_media = al.get("audio_url") or al.get("video_url") or al.get("attachment_url")
        has_content = al.get("has_content")
        if not has_media and not has_content:
            continue

        # Skip authoritative duplicates
        if al.get("is_duplicate"):
            continue

        # 1. Primary: normalized URL match
        matched = False
        for field in ("audio_url", "video_url", "attachment_url"):
            v = al.get(field)
            if v:
                if norm_url_for_recover(v) in sb_url_norm_index:
                    matched = True
                    break

        if matched:
            continue

        # 2. Basename match (handles path-only differences)
        for field in ("audio_url", "video_url", "attachment_url"):
            v = al.get(field)
            if v:
                bn = url_basename(v)
                if bn and bn in sb_basename_index:
                    matched = True
                    break

        if matched:
            continue

        # 3. Normalized title + series match
        t = norm_title_for_recover(al.get("title", ""))
        s_sub = norm_title_for_recover(al.get("subseries", ""))
        s_par = norm_title_for_recover(al.get("series", ""))

        if t and ((t, s_sub) in sb_title_series_index or
                  (t, s_par) in sb_title_series_index or
                  (t, "") in sb_title_series_index):
            continue

        # Truly missing
        recover.append({
            "old_node_id": al.get("node_id"),
            "title": al["title"],
            "book": al["book"],
            "series": al["series"],
            "subseries": al["subseries"],
            "old_url": al.get("old_url"),
            "audio_url": al.get("audio_url"),
            "video_url": al.get("video_url"),
            "attachment_url": al.get("attachment_url"),
            "has_content": al.get("has_content"),
            "is_duplicate": al.get("is_duplicate"),
            # debug fields for sampling
            "_norm_title": t,
            "_norm_series_sub": s_sub,
            "_norm_series_par": s_par,
        })

    print(f"[RECOVER-v2] {len(recover)} lessons appear missing from Supabase")
    return recover


# ---------------------------------------------------------------------------
# Safety check: verify zero teacher rows in delete candidates
# ---------------------------------------------------------------------------

def audit_teacher_safety(candidates: list[dict], label: str) -> int:
    """Returns count of teacher-tagged rows (should always be 0)."""
    hits = [c for c in candidates if has_teachers_tag(c.get("audience_tags"))]
    if hits:
        print(f"[SAFETY] WARNING: {len(hits)} TEACHER-TAGGED rows in {label} candidates!")
        for h in hits[:5]:
            print(f"  → {h['id']} | {h['title']}")
    else:
        print(f"[SAFETY] {label}: 0 teacher rows — OK")
    return len(hits)


# ---------------------------------------------------------------------------
# LIVE execution helpers
# ---------------------------------------------------------------------------

def append_backup(path: Path, rows: list[dict]) -> None:
    """Append rows to a JSONL backup file (one JSON object per line)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def escape_sql_string(s: str) -> str:
    """Escape a string for embedding in SQL (single-quote doubling)."""
    return s.replace("'", "''")


def live_backup_and_delete(delete_candidates: list[dict]) -> dict:
    """
    Batch approach:
    1. Fetch all candidate rows in batches of 50 (avoids per-row throttle).
    2. Server-side verify: teacher rows → SKIP.
    3. Backup ALL full rows to FINAL-deleted.jsonl BEFORE any deletes.
    4. DELETE in batches of 50 using IN (...).

    Returns: {"deleted": N, "skipped_teacher": N, "not_found": N, "errors": N}
    """
    print(f"\n[LIVE-DELETE] Starting deletion of {len(delete_candidates)} candidates ...")
    stats = {"deleted": 0, "skipped_teacher": 0, "not_found": 0, "errors": 0}

    # Build ID→candidate lookup
    cand_by_id = {c["id"]: c for c in delete_candidates}
    all_ids = list(cand_by_id.keys())

    # Step 1: Fetch all rows in batches for backup
    print(f"[LIVE-DELETE] Step 1: Fetching full rows for backup ({len(all_ids)} IDs, batch {BATCH_SIZE}) ...")
    fetched_rows: dict[str, dict] = {}
    for batch_start in range(0, len(all_ids), BATCH_SIZE):
        batch_ids = all_ids[batch_start:batch_start + BATCH_SIZE]
        ids_str = ",".join(f"'{escape_sql_string(i)}'" for i in batch_ids)
        rows = run_sql(f"SELECT * FROM lessons WHERE id IN ({ids_str})")
        for row in rows:
            fetched_rows[row["id"]] = row
        print(f"  fetched batch {batch_start//BATCH_SIZE + 1}: {len(rows)} rows")

    print(f"[LIVE-DELETE] Fetched {len(fetched_rows)}/{len(all_ids)} rows total.")

    # Step 2: Teacher guard + backup
    safe_to_delete_ids = []
    ts = datetime.now(timezone.utc).isoformat()
    backup_entries = []

    for lesson_id in all_ids:
        cand = cand_by_id[lesson_id]
        if lesson_id not in fetched_rows:
            print(f"  NOT FOUND (already deleted?): {lesson_id} | {cand.get('title','?')[:50]}")
            stats["not_found"] += 1
            continue
        full_row = fetched_rows[lesson_id]
        if has_teachers_tag(full_row.get("audience_tags")):
            print(f"  SKIPPED (teacher tag): {lesson_id} | {full_row.get('title','?')[:50]}")
            stats["skipped_teacher"] += 1
            continue
        safe_to_delete_ids.append(lesson_id)
        backup_entries.append({
            **full_row,
            "_candidate_category": cand.get("category"),
            "_candidate_reason": cand.get("reason"),
            "_deleted_at": ts,
        })

    # Write ALL backups BEFORE any deletes
    print(f"[LIVE-DELETE] Step 2: Writing backup ({len(backup_entries)} rows) → {FINAL_DELETED_LOG}")
    append_backup(FINAL_DELETED_LOG, backup_entries)

    if stats["skipped_teacher"] > 0:
        print(f"[LIVE-DELETE] ABORT: {stats['skipped_teacher']} teacher rows in delete set!")
        return stats

    # Step 3: DELETE in batches — first clean child FK tables, then delete parent
    # FK tables referencing lessons.id:
    #   lesson_topics, lesson_comments, lesson_dedications,
    #   user_favorites, user_history, user_enrollments (last_lesson_id)
    CHILD_FK_TABLES = [
        ("lesson_topics",     "lesson_id"),
        ("lesson_comments",   "lesson_id"),
        ("lesson_dedications","lesson_id"),
        ("user_favorites",    "lesson_id"),
        ("user_history",      "lesson_id"),
        ("user_enrollments",  "last_lesson_id"),
    ]
    print(f"[LIVE-DELETE] Step 3a: Cleaning FK child rows for {len(safe_to_delete_ids)} IDs ...")
    total = len(safe_to_delete_ids)
    for batch_start in range(0, total, BATCH_SIZE):
        batch_ids = safe_to_delete_ids[batch_start:batch_start + BATCH_SIZE]
        ids_str = ",".join(f"'{escape_sql_string(i)}'" for i in batch_ids)
        for child_table, fk_col in CHILD_FK_TABLES:
            try:
                sql = f"DELETE FROM {child_table} WHERE {fk_col} IN ({ids_str})"
                run_sql(sql)
            except Exception as e:
                print(f"  [FK-clean] {child_table}.{fk_col} batch {batch_start//BATCH_SIZE+1}: {e}")
        print(f"  FK-clean batch {batch_start//BATCH_SIZE + 1}/{(total+BATCH_SIZE-1)//BATCH_SIZE} done")

    print(f"[LIVE-DELETE] Step 3b: Deleting {total} lesson rows in batches of {BATCH_SIZE} ...")
    for batch_start in range(0, total, BATCH_SIZE):
        batch_ids = safe_to_delete_ids[batch_start:batch_start + BATCH_SIZE]
        ids_str = ",".join(f"'{escape_sql_string(i)}'" for i in batch_ids)
        try:
            sql = (
                f"DELETE FROM lessons "
                f"WHERE id IN ({ids_str}) "
                f"AND NOT (COALESCE(audience_tags, ARRAY[]::text[]) @> ARRAY['teachers'])"
            )
            run_sql(sql)
            stats["deleted"] += len(batch_ids)
            print(f"  batch {batch_start//BATCH_SIZE + 1}: deleted {len(batch_ids)} rows "
                  f"(total so far: {stats['deleted']}/{total})")
        except Exception as e:
            stats["errors"] += len(batch_ids)
            print(f"  batch {batch_start//BATCH_SIZE + 1}: ERROR: {e}")

    print(f"\n[LIVE-DELETE] Done. {stats}")
    return stats


def live_backup_and_move(move_candidates: list[dict]) -> dict:
    """
    For each MOVE candidate: backup full rows (batch), then UPDATE series_id (batch).
    Returns: {"moved": N, "not_found": N, "errors": N}
    """
    print(f"\n[LIVE-MOVE] Starting move of {len(move_candidates)} candidates ...")
    stats = {"moved": 0, "not_found": 0, "errors": 0}

    if not move_candidates:
        return stats

    cand_by_id = {c["id"]: c for c in move_candidates}
    all_ids = list(cand_by_id.keys())

    # Fetch all rows for backup
    ids_str = ",".join(f"'{escape_sql_string(i)}'" for i in all_ids)
    rows = run_sql(f"SELECT * FROM lessons WHERE id IN ({ids_str})")
    fetched = {r["id"]: r for r in rows}

    ts = datetime.now(timezone.utc).isoformat()
    backup_entries = []
    for lesson_id, cand in cand_by_id.items():
        if lesson_id not in fetched:
            stats["not_found"] += 1
            print(f"  NOT FOUND: {lesson_id}")
            continue
        backup_entries.append({
            **fetched[lesson_id],
            "_from_series_id": cand.get("from_series_id"),
            "_from_series": cand.get("from_series"),
            "_to_series_id": cand.get("to_series_id"),
            "_to_series": cand.get("to_series"),
            "_moved_at": ts,
        })
    append_backup(FINAL_MOVE_LOG, backup_entries)
    print(f"[LIVE-MOVE] Backed up {len(backup_entries)} rows → {FINAL_MOVE_LOG}")

    # Execute UPDATEs one-by-one (each has different to_series_id)
    for i, cand in enumerate(move_candidates, 1):
        lesson_id = cand["id"]
        if lesson_id not in fetched:
            continue
        to_series_id = cand["to_series_id"]
        try:
            sql = f"UPDATE lessons SET series_id = '{escape_sql_string(to_series_id)}' WHERE id = '{escape_sql_string(lesson_id)}'"
            run_sql(sql)
            stats["moved"] += 1
            print(f"  [{i}/{len(move_candidates)}] MOVED: {lesson_id} | {cand.get('title','?')[:50]}")
            print(f"    → from: {cand.get('from_series','?')[:60]}")
            print(f"    → to:   {cand.get('to_series','?')[:60]}")
        except Exception as e:
            stats["errors"] += 1
            print(f"  [{i}/{len(move_candidates)}] ERROR: {e}")

    print(f"\n[LIVE-MOVE] Done. {stats}")
    return stats


def live_backup_and_fill(fill_candidates: list[dict]) -> dict:
    """
    For each FILL candidate: backup current row (batch), then UPDATE media fields.
    Only fills fields that are currently NULL/empty in Supabase.
    Returns: {"filled": N, "skipped_already_has_media": N, "not_found": N, "errors": N}
    """
    print(f"\n[LIVE-FILL] Starting fill of {len(fill_candidates)} candidates ...")
    stats = {"filled": 0, "skipped_already_has_media": 0, "not_found": 0, "errors": 0}

    if not fill_candidates:
        return stats

    cand_by_id = {c["id"]: c for c in fill_candidates}
    all_ids = list(cand_by_id.keys())

    # Fetch all rows for backup
    ids_str = ",".join(f"'{escape_sql_string(i)}'" for i in all_ids)
    rows = run_sql(f"SELECT * FROM lessons WHERE id IN ({ids_str})")
    fetched = {r["id"]: r for r in rows}

    ts = datetime.now(timezone.utc).isoformat()
    backup_entries = []
    for lesson_id, cand in cand_by_id.items():
        if lesson_id in fetched:
            backup_entries.append({
                **fetched[lesson_id],
                "_fill_audio_url": cand.get("fill_audio_url"),
                "_fill_video_url": cand.get("fill_video_url"),
                "_fill_attachment_url": cand.get("fill_attachment_url"),
                "_filled_at": ts,
            })
    append_backup(FINAL_FILL_LOG, backup_entries)
    print(f"[LIVE-FILL] Backed up {len(backup_entries)} rows → {FINAL_FILL_LOG}")

    for i, cand in enumerate(fill_candidates, 1):
        lesson_id = cand["id"]
        if lesson_id not in fetched:
            print(f"  [{i}/{len(fill_candidates)}] NOT FOUND: {lesson_id}")
            stats["not_found"] += 1
            continue

        full_row = fetched[lesson_id]
        still_empty = not (
            full_row.get("audio_url") or
            full_row.get("video_url") or
            full_row.get("attachment_url") or
            full_row.get("content")
        )
        if not still_empty:
            print(f"  [{i}/{len(fill_candidates)}] SKIP (already has media): {lesson_id}")
            stats["skipped_already_has_media"] += 1
            continue

        set_parts = []
        if cand.get("fill_audio_url"):
            set_parts.append(f"audio_url = '{escape_sql_string(cand['fill_audio_url'])}'")
        if cand.get("fill_video_url"):
            set_parts.append(f"video_url = '{escape_sql_string(cand['fill_video_url'])}'")
        if cand.get("fill_attachment_url"):
            set_parts.append(f"attachment_url = '{escape_sql_string(cand['fill_attachment_url'])}'")

        if not set_parts:
            print(f"  [{i}/{len(fill_candidates)}] SKIP (no fill data): {lesson_id} | {cand.get('title','?')[:50]}")
            continue

        try:
            set_clause = ", ".join(set_parts)
            sql = f"UPDATE lessons SET {set_clause} WHERE id = '{escape_sql_string(lesson_id)}'"
            run_sql(sql)
            stats["filled"] += 1
            print(f"  [{i}/{len(fill_candidates)}] FILLED: {lesson_id} | {cand.get('title','?')[:50]}")
        except Exception as e:
            stats["errors"] += 1
            print(f"  [{i}/{len(fill_candidates)}] ERROR: {e}")

    print(f"\n[LIVE-FILL] Done. {stats}")
    return stats


# ---------------------------------------------------------------------------
# Post-LIVE verification queries
# ---------------------------------------------------------------------------

def verify_live_results(
    delete_candidates: list[dict],
    move_candidates: list[dict],
    fill_candidates: list[dict],
) -> None:
    """Run SELECT queries to confirm the LIVE operations took effect."""
    print("\n[VERIFY] Post-LIVE verification ...")

    # 1. Count remaining by category in DB
    placeholder_ids_str = ",".join(f"'{c['id']}'" for c in delete_candidates if c["category"] == "PLACEHOLDER")
    empty_ids_str = ",".join(f"'{c['id']}'" for c in delete_candidates if c["category"] == "EMPTY")
    dup_ids_str = ",".join(f"'{c['id']}'" for c in delete_candidates if c["category"] == "EXACT_DUP")
    misfile_del_ids_str = ",".join(f"'{c['id']}'" for c in delete_candidates if c["category"] == "MISFILED_PSALM_DELETE")

    for label, ids_str in [
        ("PLACEHOLDER still in DB (expect 0)", placeholder_ids_str),
        ("EMPTY still in DB (expect 0)", empty_ids_str),
        ("EXACT_DUP still in DB (expect 0)", dup_ids_str),
        ("MISFILED_PSALM_DELETE still in DB (expect 0)", misfile_del_ids_str),
    ]:
        if not ids_str:
            print(f"  {label}: [no candidates in this category]")
            continue
        rows = run_sql(f"SELECT COUNT(*) as cnt FROM lessons WHERE id IN ({ids_str})")
        cnt = rows[0]["cnt"] if rows else "?"
        status = "OK" if str(cnt) == "0" else "PROBLEM"
        print(f"  {label}: {cnt} [{status}]")

    # 2. Verify MOVE: check that moved lessons are now in tehilim series
    if move_candidates:
        move_ids_str = ",".join(f"'{m['id']}'" for m in move_candidates)
        tehilim_series_id = move_candidates[0]["to_series_id"]
        rows = run_sql(f"""
            SELECT COUNT(*) as cnt FROM lessons
            WHERE id IN ({move_ids_str}) AND series_id = '{tehilim_series_id}'
        """)
        cnt = rows[0]["cnt"] if rows else "?"
        expected = len(move_candidates)
        status = "OK" if int(cnt) == expected else "PROBLEM"
        print(f"  MOVED lessons now in tehilim (expect {expected}): {cnt} [{status}]")

    # 3. Verify FILL: check that filled lessons now have media
    fill_with_media = [f for f in fill_candidates if f.get("fill_audio_url") or f.get("fill_video_url") or f.get("fill_attachment_url")]
    if fill_with_media:
        fill_ids_str = ",".join(f"'{f['id']}'" for f in fill_with_media)
        rows = run_sql(f"""
            SELECT COUNT(*) as cnt FROM lessons
            WHERE id IN ({fill_ids_str})
            AND (audio_url IS NOT NULL OR video_url IS NOT NULL OR attachment_url IS NOT NULL)
        """)
        cnt = rows[0]["cnt"] if rows else "?"
        expected = len(fill_with_media)
        status = "OK" if int(cnt) == expected else "PROBLEM"
        print(f"  FILLED lessons now have media (expect {expected}): {cnt} [{status}]")

    # 4. Teacher safety: verify 0 teacher rows were touched
    all_ids = [c["id"] for c in delete_candidates] + [m["id"] for m in move_candidates] + [f["id"] for f in fill_candidates]
    if all_ids:
        ids_str = ",".join(f"'{i}'" for i in all_ids)
        rows = run_sql(f"""
            SELECT COUNT(*) as cnt FROM lessons
            WHERE id IN ({ids_str})
            AND audience_tags @> ARRAY['teachers']
        """)
        cnt = rows[0]["cnt"] if rows else "?"
        status = "OK" if str(cnt) == "0" else "CRITICAL PROBLEM"
        print(f"  Teacher rows in operated set (expect 0): {cnt} [{status}]")

    # 5. Backup file line count
    if FINAL_DELETED_LOG.exists():
        with open(FINAL_DELETED_LOG) as f:
            lines = sum(1 for _ in f)
        print(f"  FINAL-deleted.jsonl lines: {lines}")
    else:
        print(f"  FINAL-deleted.jsonl: not found")


# ---------------------------------------------------------------------------
# Output helpers
# ---------------------------------------------------------------------------

def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[OUT] Wrote {path} ({len(data)} items)")


def print_report(
    placeholder_deletes: list[dict],
    synthetic_total: int,
    empty_deletes: list[dict],
    fill_candidates: list[dict],
    exact_dup_deletes: list[dict],
    uncertain_count: int,
    misfile_deletes: list[dict],
    misfile_moves: list[dict],
    recover_candidates: list[dict] | None,
    teacher_rows_skipped: int,
    is_live: bool = False,
) -> None:

    all_deletes = placeholder_deletes + empty_deletes + exact_dup_deletes + misfile_deletes
    total_delete = len(all_deletes)

    mode = "LIVE EXECUTION" if is_live else "DRY-RUN"

    print()
    print("=" * 70)
    print(f"{mode} REPORT — Bnei Zion reconcile-mirror.py")
    print(f"Generated: {datetime.now(timezone.utc).isoformat()}")
    print("=" * 70)
    print()
    print(f"DELETE {'EXECUTED' if is_live else 'CANDIDATES'}")
    print(f"  PLACEHOLDER (synthetic with real twin):  {len(placeholder_deletes):5d}")
    print(f"    (total synthetic UUIDs in DB):         {synthetic_total:5d}")
    print(f"  EMPTY (no media/content, no auth match): {len(empty_deletes):5d}")
    print(f"  EXACT_DUP:                               {len(exact_dup_deletes):5d}")
    print(f"    UNCERTAIN (excluded, conflicting):     {uncertain_count:5d}")
    print(f"  MISFILED_PSALM → DELETE (in tehilim):    {len(misfile_deletes):5d}")
    print(f"  MISFILED_PSALM → MOVE:                   {len(misfile_moves):5d}")
    print(f"  ─────────────────────────────────────────")
    print(f"  TOTAL DELETE:                            {total_delete:5d}")
    print()
    print(f"FILL {'EXECUTED' if is_live else 'CANDIDATES'} (empty in SB, but auth has media):")
    print(f"  {len(fill_candidates):5d}")
    print()

    if recover_candidates is not None:
        print("RECOVER CANDIDATES (present in authoritative, absent from SB):")
        book_counts = Counter(r["book"] for r in recover_candidates)
        for book, cnt in sorted(book_counts.items(), key=lambda x: -x[1]):
            marker = " *** PRIORITY" if book in ("נביאים", "שמואל א", "יהושע") else ""
            print(f"    {book:<30s}: {cnt:4d}{marker}")
        print(f"  TOTAL RECOVER:                           {len(recover_candidates):5d}")
    else:
        print("RECOVER: skipped (--skip-recover)")
    print()
    print(f"TEACHER ROWS SKIPPED (guard = 0):          {teacher_rows_skipped:5d}")
    print()

    if not is_live:
        print("─" * 70)
        print("SAMPLE DELETE CANDIDATES (10)")
        for i, c in enumerate(all_deletes[:10]):
            print(f"  {i+1:2d}. [{c['category']}] {c['id']}")
            print(f"      Title: {c['title']}")
            print(f"      Series: {c.get('series','')}")
            print(f"      Reason: {c['reason']}")
            ev = c.get("evidence", {})
            if ev:
                print(f"      Evidence: {ev}")
            print()

        if recover_candidates:
            print("─" * 70)
            print("SAMPLE RECOVER CANDIDATES (10)")
            for i, r in enumerate(recover_candidates[:10]):
                print(f"  {i+1:2d}. node_id={r['old_node_id']} | {r['title']}")
                print(f"      Book: {r['book']} | Series: {r['subseries']}")
                media = r.get("audio_url") or r.get("video_url") or r.get("attachment_url")
                print(f"      Media: {(media or 'content_only')[:70]}")
                print()

    print("=" * 70)
    print("Output files:")
    print(f"  {OUTPUT_DIR}/delete-candidates.json")
    print(f"  {OUTPUT_DIR}/fill-candidates.json")
    print(f"  {OUTPUT_DIR}/recover-candidates.json (v1)")
    print(f"  {OUTPUT_DIR}/recover-candidates-v2.json (improved matching)")
    print(f"  {OUTPUT_DIR}/move-candidates.json")
    if is_live:
        print(f"  {FINAL_DELETED_LOG} (backup of deleted rows)")
        print(f"  {FINAL_MOVE_LOG} (backup of moved rows)")
        print(f"  {FINAL_FILL_LOG} (backup of filled rows)")
    print("=" * 70)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Bnei Zion DB reconcile — deterministic dry-run")
    parser.add_argument("--dry-run", action="store_true", default=True,
                        help="Dry run (default). Write JSON only, no DB writes.")
    parser.add_argument("--live", action="store_true", default=False,
                        help="Actually execute changes (requires explicit confirmation).")
    parser.add_argument("--skip-recover", action="store_true", default=False,
                        help="Skip RECOVER analysis (use during LIVE run; recover is unreliable until v2 is validated).")
    args = parser.parse_args()

    if args.live:
        print("WARNING: --live mode requested. This will write to the database.")
        print(f"  DELETE: up to 626 lessons")
        print(f"  MOVE:   up to 12 lessons (misfiled psalms → tehilim)")
        print(f"  FILL:   up to 15 lessons (add media URLs)")
        print(f"  Backups: {BACKUP_DIR}")
        print()
        confirm = input("Type CONFIRM to proceed: ")
        if confirm.strip() != "CONFIRM":
            print("Aborted.")
            sys.exit(1)
        print("[LIVE MODE] Executing changes ...")
    else:
        print("[DRY-RUN MODE] No database writes will be performed.")

    # 1. Load data sources
    auth_lessons = load_authoritative()
    sb_lessons   = fetch_supabase_lessons()
    all_series   = fetch_supabase_series()

    # 2. Category 1: PLACEHOLDER
    placeholder_deletes, synthetic_total = find_placeholders(sb_lessons)
    placeholder_ids = {c["id"] for c in placeholder_deletes}

    # 3. Category 2: EMPTY + FILL
    empty_deletes, fill_candidates = find_empty_and_fill(
        sb_lessons, auth_lessons, placeholder_ids
    )

    # 4. Category 3: EXACT_DUP
    already_flagged = placeholder_ids | {c["id"] for c in empty_deletes}
    exact_dup_deletes, uncertain_count = find_exact_dups(sb_lessons, already_flagged)

    # 5. Category 4: MISFILED_PSALM
    all_flagged = already_flagged | {c["id"] for c in exact_dup_deletes}
    misfile_deletes, misfile_moves = find_misfiled_psalms(
        sb_lessons, all_series, all_flagged
    )

    # 6. RECOVER (v1 for backward compat + v2 improved)
    if args.skip_recover:
        recover_candidates_v1 = None
        recover_candidates_v2 = None
        print("[RECOVER] Skipped (--skip-recover).")
    else:
        # Legacy v1 (kept for reference)
        recover_candidates_v1 = _find_recover_v1(auth_lessons, sb_lessons)
        # Improved v2
        recover_candidates_v2 = find_recover_candidates_v2(auth_lessons, sb_lessons)

    # 7. Safety audit — teacher tags must be 0 in all delete buckets
    teacher_rows_skipped = 0
    for label, bucket in [
        ("PLACEHOLDER", placeholder_deletes),
        ("EMPTY", empty_deletes),
        ("EXACT_DUP", exact_dup_deletes),
        ("MISFILED_DELETE", misfile_deletes),
    ]:
        teacher_rows_skipped += audit_teacher_safety(bucket, label)

    # 8. Write outputs
    all_deletes = placeholder_deletes + empty_deletes + exact_dup_deletes + misfile_deletes
    write_json(OUTPUT_DIR / "delete-candidates.json", all_deletes)
    write_json(OUTPUT_DIR / "fill-candidates.json",   fill_candidates)
    write_json(OUTPUT_DIR / "move-candidates.json",   misfile_moves)

    if recover_candidates_v1 is not None:
        write_json(OUTPUT_DIR / "recover-candidates.json",    recover_candidates_v1)
    if recover_candidates_v2 is not None:
        write_json(OUTPUT_DIR / "recover-candidates-v2.json", recover_candidates_v2)

    # 9. Report
    print_report(
        placeholder_deletes,
        synthetic_total,
        empty_deletes,
        fill_candidates,
        exact_dup_deletes,
        uncertain_count,
        misfile_deletes,
        misfile_moves,
        recover_candidates_v2,
        teacher_rows_skipped,
        is_live=args.live,
    )

    # 10. If --live: execute (DELETE → MOVE → FILL, with backup before each)
    if args.live:
        if teacher_rows_skipped > 0:
            print(f"[LIVE] ABORT: {teacher_rows_skipped} teacher rows detected in delete set. Exiting.")
            sys.exit(2)

        print("\n[LIVE] Starting execution sequence: DELETE → MOVE → FILL")
        print("=" * 70)

        delete_stats = live_backup_and_delete(all_deletes)
        move_stats   = live_backup_and_move(misfile_moves)
        fill_stats   = live_backup_and_fill(fill_candidates)

        print("\n[LIVE] Execution summary:")
        print(f"  DELETE: {delete_stats}")
        print(f"  MOVE:   {move_stats}")
        print(f"  FILL:   {fill_stats}")

        # 11. Post-live verification
        verify_live_results(all_deletes, misfile_moves, fill_candidates)


def _find_recover_v1(auth_lessons: list[dict], sb_lessons: list[dict]) -> list[dict]:
    """Legacy v1 RECOVER matching (raw NFC URL compare). Kept for reference."""
    sb_media_index: set[str] = set()
    sb_series_title_index: dict[tuple, bool] = {}

    for l in sb_lessons:
        for field in ("audio_url", "video_url", "attachment_url", "legacy_attachment_url"):
            v = l.get(field)
            if v:
                sb_media_index.add(norm(v))
        key = (norm(l.get("series_title", "")), norm(l.get("title", "")))
        sb_series_title_index[key] = True

    recover = []
    for al in auth_lessons:
        has_media = al.get("audio_url") or al.get("video_url") or al.get("attachment_url")
        has_content = al.get("has_content")
        if not has_media and not has_content:
            continue
        if al.get("is_duplicate"):
            continue

        matched_by_media = False
        for field in ("audio_url", "video_url", "attachment_url"):
            v = al.get(field)
            if v and norm(v) in sb_media_index:
                matched_by_media = True
                break

        if matched_by_media:
            continue

        key = (norm(al["subseries"]), norm(al["title"]))
        if key in sb_series_title_index:
            continue

        key2 = (norm(al["series"]), norm(al["title"]))
        if key2 in sb_series_title_index:
            continue

        recover.append({
            "old_node_id": al.get("node_id"),
            "title": al["title"],
            "book": al["book"],
            "series": al["series"],
            "subseries": al["subseries"],
            "old_url": al.get("old_url"),
            "audio_url": al.get("audio_url"),
            "video_url": al.get("video_url"),
            "attachment_url": al.get("attachment_url"),
            "has_content": al.get("has_content"),
            "is_duplicate": al.get("is_duplicate"),
        })

    return recover


if __name__ == "__main__":
    main()
