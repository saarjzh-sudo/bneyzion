#!/usr/bin/env python3
"""
parity-audit.py
Full parity audit: old site (umbraco-index.json + teachers-scrape-result.json)
vs new site (Supabase).

Produces:
  scripts/new-site-full-map.json    — all lessons in Supabase
  scripts/old-site-full-map.json    — all lessons from old site (both מאגרים)
  scripts/parity-report.json        — comparison results

Usage:
  env -u HTTPS_PROXY -u HTTP_PROXY python3 scripts/parity-audit.py
"""

import json
import re
import subprocess
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path
from urllib.parse import unquote

SUPABASE_URL = "https://pzvmwfexeiruelwiujxn.supabase.co"
SUPABASE_PAT = __import__("os").environ.get("SUPABASE_MANAGEMENT_API_TOKEN") or __import__("sys").exit("SUPABASE_MANAGEMENT_API_TOKEN env var required")
PROJECT_REF  = "pzvmwfexeiruelwiujxn"
SCRIPTS_DIR  = Path(__file__).parent

# ============================================================
# Helpers
# ============================================================

def normalize(s):
    """Normalize Hebrew title for fuzzy comparison."""
    if not s:
        return ""
    s = s.strip()
    # Remove niqqud and cantillation marks (U+0591–U+05C7)
    s = ''.join(c for c in s if not (0x0591 <= ord(c) <= 0x05C7))
    # Normalize unicode
    s = unicodedata.normalize('NFC', s)
    # Collapse whitespace
    s = re.sub(r'\s+', ' ', s)
    # Remove common punctuation noise
    s = re.sub(r'[""״\'"׳-]', '', s)
    # Remove pipes and dashes used as separators
    s = re.sub(r'[|–—]', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip().lower()
    return s


def sql_query(query):
    """Run a SQL query via Supabase Management API. Returns list of row dicts."""
    payload = json.dumps({"query": query})
    cmd = [
        "curl", "--noproxy", "*", "-s",
        "-H", f"Authorization: Bearer {SUPABASE_PAT}",
        "-H", "Content-Type: application/json",
        "-X", "POST",
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
        "-d", payload
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"ERROR: curl failed: {result.stderr}", file=sys.stderr)
        return []
    try:
        data = json.loads(result.stdout)
        if isinstance(data, dict) and "message" in data:
            print(f"SQL ERROR: {data['message']}", file=sys.stderr)
            return []
        return data
    except Exception as e:
        print(f"JSON parse error: {e}\n{result.stdout[:500]}", file=sys.stderr)
        return []


# ============================================================
# Step A: Build new-site map from Supabase
# ============================================================

def build_new_site_map():
    """Fetch all lessons from Supabase with series info."""
    print("=== Step A: Building new-site map from Supabase ===")

    all_lessons = []
    offset = 0
    batch = 1000

    while True:
        rows = sql_query(f"""
            SELECT
                l.id, l.title, l.status, l.audio_url, l.video_url,
                l.attachment_url, l.additional_attachments,
                l.content, l.source_type, l.audience_tags,
                s.id as series_id, s.title as series_title, s.audience_tags as series_tags
            FROM lessons l
            LEFT JOIN series s ON l.series_id = s.id
            LIMIT {batch} OFFSET {offset}
        """)
        if not rows:
            break
        all_lessons.extend(rows)
        print(f"  Fetched {len(all_lessons)} lessons so far...")
        if len(rows) < batch:
            break
        offset += batch

    print(f"  Total lessons in Supabase: {len(all_lessons)}")

    # Build normalized title index
    title_index = {}  # normalized_title -> [lesson]
    for lesson in all_lessons:
        key = normalize(lesson.get("title", ""))
        if key not in title_index:
            title_index[key] = []
        title_index[key].append(lesson)

    return all_lessons, title_index


# ============================================================
# Step B: Build old-site map from JSON files
# ============================================================

def build_old_site_map():
    """Build old-site map from umbraco-index.json and teachers-scrape-result.json."""
    print("\n=== Step B: Building old-site map from JSON files ===")

    all_old_lessons = []

    # ---- Part 1: Main מאגר from umbraco-index.json ----
    umbraco_path = SCRIPTS_DIR / "umbraco-index.json"
    if not umbraco_path.exists():
        print("  ERROR: umbraco-index.json not found!", file=sys.stderr)
    else:
        with open(umbraco_path) as f:
            umbraco_data = json.load(f)

        # Extract lessons and QAs (both are lesson-type content)
        lesson_types = {"lesson", "QAs", "QA"}
        for item in umbraco_data:
            if item.get("contentType") in lesson_types:
                url = unquote(item.get("url", ""))
                parts = [p for p in url.split("/") if p]
                # Determine section (תורה/נביאים/כתובים/etc.)
                section = parts[1] if len(parts) > 1 else ""
                subsection = parts[2] if len(parts) > 2 else ""

                all_old_lessons.append({
                    "name": item.get("name", ""),
                    "url": url,
                    "umbraco_id": item.get("id", ""),
                    "content_type": item.get("contentType", ""),
                    "section": section,
                    "subsection": subsection,
                    "source": "main_maagarim",
                    "has_children": item.get("hasChildren", False),
                })

        main_count = len([x for x in all_old_lessons if x["source"] == "main_maagarim"])
        print(f"  Main מאגר (umbraco-index): {main_count} lesson-type items")

    # ---- Part 2: Teachers מאגר from teachers-scrape-result.json ----
    teachers_path = SCRIPTS_DIR / "teachers-scrape-result.json"
    if not teachers_path.exists():
        print("  ERROR: teachers-scrape-result.json not found!", file=sys.stderr)
    else:
        with open(teachers_path) as f:
            teachers_data = json.load(f)

        def flatten_teachers(node, category_path=None):
            if category_path is None:
                category_path = []

            results = []
            name = node.get("name", "")
            url = node.get("url", "")
            is_lesson = node.get("isLesson", False)
            is_series = node.get("isSeries", False)

            if is_lesson:
                attachment_url = node.get("attachmentUrl", "")
                audio_url = node.get("audioUrl", "")
                video_url = node.get("videoUrl", "")
                results.append({
                    "name": name,
                    "url": url,
                    "umbraco_id": str(node.get("umbId", "")),
                    "content_type": "lesson",
                    "section": category_path[0] if category_path else "",
                    "subsection": category_path[1] if len(category_path) > 1 else "",
                    "source": "teachers_maagarim",
                    "attachment_url": attachment_url,
                    "audio_url": audio_url,
                    "video_url": video_url,
                    "category_path": " > ".join(category_path),
                })

            for child in node.get("children", []):
                child_path = category_path + [name] if (is_series or (not is_lesson and not is_series)) else category_path
                results.extend(flatten_teachers(child, child_path))

            return results

        teachers_lessons = []
        for top_node in teachers_data.get("tree", []):
            teachers_lessons.extend(flatten_teachers(top_node, []))

        all_old_lessons.extend(teachers_lessons)
        print(f"  Teachers מאגר (teachers-scrape): {len(teachers_lessons)} lessons")

    print(f"  Total old-site lessons: {len(all_old_lessons)}")
    return all_old_lessons


# ============================================================
# Step C: Compare
# ============================================================

def compare(old_lessons, new_lessons, title_index):
    """Compare old vs new, identify missing, media mismatches."""
    print("\n=== Step C: Running comparison ===")

    missing = []
    matched = []
    media_mismatches = []

    for old in old_lessons:
        old_title = old.get("name", "")
        old_key = normalize(old_title)

        if not old_key or len(old_key) < 3:
            continue  # skip empty/trivial titles

        # Try to find in new site
        candidates = title_index.get(old_key, [])

        if not candidates:
            # Try partial match (old title contains new title or vice versa)
            # This catches minor whitespace/punctuation differences
            found = None
            for new_key, new_list in title_index.items():
                if len(old_key) > 5 and len(new_key) > 5:
                    if old_key in new_key or new_key in old_key:
                        found = new_list[0]
                        break

            if not found:
                missing.append({
                    "old_title": old_title,
                    "old_url": old.get("url", ""),
                    "old_section": old.get("section", ""),
                    "old_subsection": old.get("subsection", ""),
                    "source": old.get("source", ""),
                    "umbraco_id": old.get("umbraco_id", ""),
                    "old_attachment": old.get("attachment_url", ""),
                    "old_audio": old.get("audio_url", ""),
                    "old_video": old.get("video_url", ""),
                })
            else:
                matched.append((old, found))
        else:
            matched.append((old, candidates[0]))
            # Check media completeness for lessons with known media from teachers scrape
            if old.get("source") == "teachers_maagarim":
                new_lesson = candidates[0]
                mismatch_fields = []
                if old.get("attachment_url") and not new_lesson.get("attachment_url"):
                    mismatch_fields.append("attachment_url")
                if old.get("audio_url") and not new_lesson.get("audio_url"):
                    mismatch_fields.append("audio_url")
                if old.get("video_url") and not new_lesson.get("video_url"):
                    mismatch_fields.append("video_url")
                if mismatch_fields:
                    media_mismatches.append({
                        "lesson_id": new_lesson["id"],
                        "title": old_title,
                        "missing_fields": mismatch_fields,
                        "old_attachment": old.get("attachment_url", ""),
                        "old_audio": old.get("audio_url", ""),
                        "old_video": old.get("video_url", ""),
                    })

    return missing, matched, media_mismatches


# ============================================================
# Step D: Category-level analysis
# ============================================================

def category_analysis(old_lessons):
    """Analyze which categories have the most missing lessons."""
    missing_by_section = defaultdict(int)
    all_by_section = defaultdict(int)

    # We'll compute this after comparison
    return missing_by_section, all_by_section


# ============================================================
# Main
# ============================================================

def main():
    # Build maps
    new_lessons, title_index = build_new_site_map()
    old_lessons = build_old_site_map()

    # Save maps
    new_map_path = SCRIPTS_DIR / "new-site-full-map.json"
    with open(new_map_path, "w") as f:
        json.dump(new_lessons, f, ensure_ascii=False, indent=2)
    print(f"\n  Saved new-site map: {new_map_path}")

    old_map_path = SCRIPTS_DIR / "old-site-full-map.json"
    with open(old_map_path, "w") as f:
        json.dump(old_lessons, f, ensure_ascii=False, indent=2)
    print(f"  Saved old-site map: {old_map_path}")

    # Compare
    missing, matched, media_mismatches = compare(old_lessons, new_lessons, title_index)

    # Category breakdown for missing
    missing_by_section = defaultdict(list)
    for m in missing:
        key = f"{m['source']}:{m['old_section']}"
        missing_by_section[key].append(m["old_title"])

    all_by_section = defaultdict(int)
    for old in old_lessons:
        key = f"{old.get('source','')}:{old.get('section','')}"
        all_by_section[key] += 1

    # Produce report
    report = {
        "summary": {
            "old_site_lessons": len(old_lessons),
            "new_site_lessons": len(new_lessons),
            "matched": len(matched),
            "missing_in_new": len(missing),
            "media_mismatches": len(media_mismatches),
        },
        "missing_by_section": {k: {"count": len(v), "titles": v[:10]} for k, v in sorted(missing_by_section.items(), key=lambda x: -len(x[1]))},
        "missing_lessons": missing,
        "media_mismatches": media_mismatches[:50],  # first 50 for readability
    }

    report_path = SCRIPTS_DIR / "parity-report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    # Print summary
    print(f"\n{'='*60}")
    print(f"PARITY REPORT SUMMARY")
    print(f"{'='*60}")
    print(f"Old site total lessons: {report['summary']['old_site_lessons']}")
    print(f"New site total lessons: {report['summary']['new_site_lessons']}")
    print(f"Matched (found in both): {report['summary']['matched']}")
    print(f"Missing in new site: {report['summary']['missing_in_new']}")
    print(f"Media mismatches: {report['summary']['media_mismatches']}")
    print(f"\nMissing by section:")
    for k, v in report["missing_by_section"].items():
        print(f"  {k}: {v['count']} missing")
    print(f"\nSaved: {report_path}")

    return report


if __name__ == "__main__":
    main()
