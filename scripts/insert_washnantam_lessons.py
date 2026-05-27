#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Insert lessons for all washnantam series.
Reads washnantam_full.json (43 series, 931 lessons),
matches each series title to Supabase series.id,
batch-inserts lessons.

Run:
  env -u HTTPS_PROXY -u HTTP_PROXY python3 scripts/insert_washnantam_lessons.py
"""

import json, os, subprocess, sys, time, re
from pathlib import Path
from datetime import datetime

SUPABASE_TOKEN = os.environ.get("SUPABASE_TOKEN", "")
PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "pzvmwfexeiruelwiujxn")
WASHNANTAM_RABBI_ID = "6f4b2572-b019-4832-9547-de7e8bc6d909"

BASE_DIR = Path("/Users/srhlq/Downloads/saar-workspace/bneyzion/migrations/firecrawl_deep_scrape_2026_05_27")
FULL_JSON = BASE_DIR / "washnantam_full.json"
RESULTS_FILE = BASE_DIR / "washnantam_lesson_insert_results.json"


def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


def sql_str(s):
    """Safely quote a string for PostgreSQL."""
    return "'" + str(s).replace("'", "''") + "'"


def supabase_query(sql):
    payload = json.dumps({"query": sql})
    cmd = [
        "curl", "-s", "--noproxy", "*",
        "-X", "POST",
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
        "-H", f"Authorization: Bearer {SUPABASE_TOKEN}",
        "-H", "Content-Type: application/json",
        "-d", payload
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    try:
        return json.loads(result.stdout)
    except Exception as e:
        log(f"  JSON parse error: {e} - stdout: {result.stdout[:200]}")
        return []


def normalize_title(t):
    """Normalize title for matching - strip punctuation, collapse spaces."""
    t = t.replace("\\-", "-").replace("\\'", "'")
    # normalize various Hebrew and Unicode quote chars to standard ASCII double-quote
    # covers: Hebrew geresh/gershayim, curly quotes, backtick
    t = re.sub(u'[״׳“”‘’`´]', '"', t)
    t = t.replace("'", '"')
    t = re.sub(r'\s+', ' ', t).strip()
    return t


def clean_lesson_title(t):
    """Clean up scraped lesson title (remove markdown escape sequences)."""
    t = t.replace("\\-", "-").replace("\\'", "'").replace("\\\\", "\\")
    t = re.sub(r'\s+', ' ', t).strip()
    return t


def main():
    # Load the full washnantam data
    with open(FULL_JSON) as f:
        washnantam_data = json.load(f)

    log(f"Loaded {len(washnantam_data)} washnantam series from JSON")
    total_lessons = sum(len(s.get("sub_lessons", [])) for s in washnantam_data)
    log(f"Total sub_lessons to insert: {total_lessons}")

    # Query all washnantam series from Supabase
    rows = supabase_query(
        "SELECT id, title FROM series WHERE rabbi_id = '" + WASHNANTAM_RABBI_ID + "' ORDER BY title"
    )
    if not isinstance(rows, list):
        log(f"ERROR querying series: {rows}")
        sys.exit(1)
    if rows and isinstance(rows[0], dict) and "message" in rows[0]:
        log(f"DB ERROR: {rows[0]}")
        sys.exit(1)

    log(f"Found {len(rows)} washnantam series in Supabase")

    # Build lookup: normalized_title -> series_id
    db_series = {}
    for r in rows:
        key = normalize_title(r["title"])
        db_series[key] = r["id"]

    # Debug: show all keys
    log("DB series normalized keys (sample):")
    for k, v in list(db_series.items())[:5]:
        log(f"  {k!r}")

    results = {
        "inserted": [],
        "skipped_no_match": [],
        "skipped_existing": [],
        "errors": []
    }

    total_inserted = 0
    total_skipped = 0

    for series_data in washnantam_data:
        series_title = series_data["series_title"]
        norm_title = normalize_title(series_title)
        sub_lessons = series_data.get("sub_lessons", [])

        if not sub_lessons:
            log(f"  SKIP (no lessons): {series_title}")
            continue

        # Find matching series_id
        series_id = db_series.get(norm_title)
        if not series_id:
            # Try stripping all quotes
            bare = re.sub(r'["\'"\'`]', '', norm_title).strip()
            for k, v in db_series.items():
                bare_k = re.sub(r'["\'"\'`]', '', k).strip()
                if bare == bare_k:
                    series_id = v
                    break

        if not series_id:
            log(f"  NO MATCH: {series_title!r} (norm: {norm_title!r})")
            results["skipped_no_match"].append(series_title)
            continue

        # Check if lessons already exist
        existing = supabase_query(
            "SELECT COUNT(*) as n FROM lessons WHERE series_id = '" + series_id + "'"
        )
        existing_count = 0
        if existing and isinstance(existing, list) and isinstance(existing[0], dict):
            existing_count = int(existing[0].get("n", 0))

        if existing_count > 0:
            log(f"  ALREADY HAS {existing_count} LESSONS: {series_title}")
            results["skipped_existing"].append({"title": series_title, "existing": existing_count})
            total_skipped += existing_count
            continue

        # Insert all lessons in batches
        log(f"  Inserting {len(sub_lessons)} lessons for: {series_title}")

        inserted_this_series = 0
        batch_size = 50

        for batch_start in range(0, len(sub_lessons), batch_size):
            batch = sub_lessons[batch_start:batch_start + batch_size]
            value_rows = []

            for i, lesson in enumerate(batch):
                idx = batch_start + i + 1
                lesson_title = clean_lesson_title(lesson.get("title", f"shiur {idx}"))
                lesson_url = lesson.get("url", "")

                if len(lesson_title) > 200:
                    lesson_title = lesson_title[:200]

                val = (
                    "(" + sql_str(lesson_title) + ", "
                    + "'" + series_id + "', "
                    + "'" + WASHNANTAM_RABBI_ID + "', "
                    + sql_str(lesson_url) + ", "
                    + "'published', "
                    + "'text', "
                    + "ARRAY['teachers', 'general']::text[])"
                )
                value_rows.append(val)

            insert_sql = (
                "INSERT INTO lessons (title, series_id, rabbi_id, attachment_url, status, source_type, audience_tags) "
                "VALUES " + ", ".join(value_rows) + " "
                "ON CONFLICT DO NOTHING RETURNING id"
            )

            res = supabase_query(insert_sql)

            if isinstance(res, dict) and "message" in res:
                log(f"    ERROR batch {batch_start//batch_size + 1}: {res}")
                results["errors"].append({
                    "series": series_title,
                    "batch": batch_start,
                    "error": str(res)[:300]
                })
                continue
            if isinstance(res, list) and res and isinstance(res[0], dict) and "message" in res[0]:
                log(f"    ERROR batch {batch_start//batch_size + 1}: {res[0]}")
                results["errors"].append({
                    "series": series_title,
                    "batch": batch_start,
                    "error": str(res[0])[:300]
                })
                continue

            batch_count = len(res) if isinstance(res, list) else 0
            inserted_this_series += batch_count

        log(f"    -> Inserted {inserted_this_series} lessons")
        results["inserted"].append({"title": series_title, "count": inserted_this_series, "series_id": series_id})
        total_inserted += inserted_this_series

        # Update lesson_count on the series
        supabase_query(
            "UPDATE series SET lesson_count = (SELECT COUNT(*) FROM lessons WHERE series_id = '" + series_id + "') WHERE id = '" + series_id + "'"
        )

    # Final summary
    log("")
    log("=== FINAL SUMMARY ===")
    log(f"Total lessons inserted: {total_inserted}")
    log(f"Total lessons skipped (already existed): {total_skipped}")
    log(f"Series with no DB match: {len(results['skipped_no_match'])}")
    log(f"Errors: {len(results['errors'])}")

    if results["skipped_no_match"]:
        log("No DB match for:")
        for t in results["skipped_no_match"]:
            log(f"  - {t}")

    if results["errors"]:
        log("Errors:")
        for e in results["errors"]:
            log(f"  - {e['series']}: {e['error']}")

    # Verify final state
    log("")
    log("Verifying final state...")
    verify = supabase_query(
        "SELECT s.title, s.lesson_count, COUNT(l.id) as actual_lessons "
        "FROM series s LEFT JOIN lessons l ON l.series_id = s.id "
        "WHERE s.rabbi_id = '" + WASHNANTAM_RABBI_ID + "' "
        "GROUP BY s.id, s.title, s.lesson_count ORDER BY s.title"
    )

    log("Final lesson counts per series:")
    for r in verify:
        actual = int(r.get("actual_lessons", 0))
        status = "OK" if actual > 0 else "EMPTY"
        log(f"  [{status}] {actual:3d} lessons - {r['title']}")

    # Save results
    with open(RESULTS_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    log(f"Results saved to {RESULTS_FILE}")


if __name__ == "__main__":
    main()
