#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
step_d_item_checks.py
======================
שלב D: בדיקות HTTP + PDF אמיתי לכל פריט ב-inventory.

לכל שיעור בחדש שיש לו attachment_url:
  1. curl -sI --noproxy '*'
  2. status == 200
  3. Content-Type: application/pdf (לא gview!)
  4. Content-Length > 0

לכל URL שיעור (כדי לוודא שהדף נפתח):
  5. status == 200

פלט: {input_file}_checks_{date}.json

Usage:
    env -u HTTPS_PROXY -u HTTP_PROXY \
    SUPABASE_MANAGEMENT_API_TOKEN=sbp_... \
    python3 scripts/parity/step_d_item_checks.py \
      --inventory scripts/parity/reports/new-inventory-בראשית-YYYYMMDD.json \
      [--max 50] [--skip-pages]
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from parity_engine import check_url, is_real_pdf

REPORTS_DIR = Path(__file__).parent / "reports"
REPORTS_DIR.mkdir(exist_ok=True)

parser = argparse.ArgumentParser()
parser.add_argument("--inventory", required=True, help="Path to new-inventory JSON")
parser.add_argument("--max", type=int, default=0, help="Max lessons to check (0=all)")
parser.add_argument("--skip-pages", action="store_true", help="Skip lesson page URL checks")
parser.add_argument("--output", default=None)
args = parser.parse_args()

TODAY = date.today().isoformat().replace("-", "")
INV_PATH = Path(args.inventory)
if not INV_PATH.exists():
    print(f"ERROR: inventory file not found: {INV_PATH}", file=sys.stderr)
    sys.exit(1)

OUT = Path(args.output) if args.output else REPORTS_DIR / f"{INV_PATH.stem}_checks_{TODAY}.json"

# ============================================================
# Lesson URL on the new site
# ============================================================
NEW_SITE = "https://bneyzion.vercel.app"

def lesson_url(lesson: dict) -> str | None:
    """Build URL for lesson on new site."""
    lid = lesson.get("id", "")
    if lid:
        return f"{NEW_SITE}/lessons/{lid}"
    return None


# ============================================================
# Check single lesson
# ============================================================

def check_lesson(lesson: dict, check_page: bool = True) -> dict:
    result = {
        "id":    lesson.get("id"),
        "title": lesson.get("title"),
        "series_title": lesson.get("series_title"),
    }

    # 1. Page URL
    if check_page:
        url = lesson_url(lesson)
        if url:
            status, ctype, clen = check_url(url)
            result["page"] = {"url": url, "status": status, "ok": status == 200}
        else:
            result["page"] = {"ok": False, "reason": "no id"}

    # 2. Attachment
    att = lesson.get("attachment_url", "") or ""
    if att:
        valid, reason = is_real_pdf(att)
        result["attachment"] = {
            "url":   att,
            "valid": valid,
            "reason": reason,
        }
    else:
        result["attachment"] = {"url": None, "valid": None, "reason": "no attachment"}

    # 3. Audio
    audio = lesson.get("audio_url", "") or ""
    if audio:
        status, ctype, clen = check_url(audio)
        result["audio"] = {"url": audio, "status": status, "ok": status == 200}

    # 4. Video (just record — don't HEAD YouTube)
    video = lesson.get("video_url", "") or ""
    if video:
        result["video"] = {"url": video, "ok": "youtube" in video or "vimeo" in video}

    return result


# ============================================================
# Main
# ============================================================

def main():
    inv = json.loads(INV_PATH.read_text(encoding="utf-8"))

    # Gather all lessons from both sections
    lessons: list[dict] = []
    for section_key in ("main", "teachers"):
        sec = inv.get(section_key, {})
        lessons.extend(sec.get("lessons", []))

    # Dedup by id
    seen: set[str] = set()
    deduped: list[dict] = []
    for l in lessons:
        lid = str(l.get("id", ""))
        if lid and lid not in seen:
            seen.add(lid)
            deduped.append(l)
    lessons = deduped

    # Limit
    if args.max > 0:
        lessons = lessons[:args.max]

    print(f"=== שלב D: בדיקות HTTP — {len(lessons)} שיעורים ===")

    results       = []
    att_ok        = 0
    att_broken    = 0
    att_missing   = 0
    page_ok       = 0
    page_broken   = 0

    for i, lesson in enumerate(lessons):
        print(f"  [{i+1}/{len(lessons)}] {lesson.get('title','')[:60]}")
        check = check_lesson(lesson, check_page=not args.skip_pages)
        results.append(check)

        # Tally
        att = check.get("attachment", {})
        if att["url"] is None:
            att_missing += 1
        elif att["valid"]:
            att_ok += 1
        else:
            att_broken += 1
            print(f"    ⚠ attachment BROKEN: {att['url'][:80]} — {att['reason']}")

        page = check.get("page", {})
        if page:
            if page.get("ok"):
                page_ok += 1
            else:
                page_broken += 1
                print(f"    ✗ page {page.get('status',0)}: {page.get('url','')[:80]}")

        time.sleep(0.1)

    summary = {
        "total":          len(results),
        "attachment_ok":  att_ok,
        "attachment_broken": att_broken,
        "attachment_missing": att_missing,
        "page_ok":        page_ok,
        "page_broken":    page_broken,
    }
    print(f"\n--- סיכום ---")
    for k, v in summary.items():
        print(f"  {k}: {v}")

    output = {"summary": summary, "items": results}
    OUT.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nנשמר: {OUT}")
    return output


if __name__ == "__main__":
    main()
