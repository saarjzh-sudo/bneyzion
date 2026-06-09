#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
step_g_report.py
=================
שלב G: מייצר דוח parity מסכם מ-JSON של שלבים A+B+D.

Usage:
    python3 scripts/parity/step_g_report.py \
        --old   scripts/parity/reports/old-inventory-בראשית-YYYYMMDD.json \
        --new   scripts/parity/reports/new-inventory-בראשית-YYYYMMDD.json \
        --checks scripts/parity/reports/new-inventory-..._checks_YYYYMMDD.json \
        [--output scripts/parity/reports/parity-report-בראשית-YYYYMMDD.md]
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from parity_engine import diff_inventories, normalize_he

REPORTS_DIR = Path(__file__).parent / "reports"
REPORTS_DIR.mkdir(exist_ok=True)

parser = argparse.ArgumentParser()
parser.add_argument("--old",    required=True)
parser.add_argument("--new",    required=True)
parser.add_argument("--checks", default=None)
parser.add_argument("--book",   default="")
parser.add_argument("--output", default=None)
args = parser.parse_args()

TODAY = date.today().isoformat().replace("-", "")


def load_json(path: str) -> dict | list:
    p = Path(path)
    if not p.exists():
        print(f"ERROR: file not found: {p}", file=sys.stderr)
        sys.exit(1)
    return json.loads(p.read_text(encoding="utf-8"))


# ============================================================
# Scorecard formatter
# ============================================================

def scorecard(book: str, old_data: list, new_data: dict, checks_data: dict | None) -> str:
    lines = []

    # === OLD inventory stats ===
    old_main     = [i for i in old_data if i.get("section") == "main"]
    old_teachers = [i for i in old_data if i.get("section") == "teachers"]

    # === NEW inventory stats ===
    new_main_sec     = new_data.get("main", {})
    new_teachers_sec = new_data.get("teachers", {})
    new_main_lessons     = new_main_sec.get("lessons", [])
    new_teachers_lessons = new_teachers_sec.get("lessons", [])
    new_main_series      = new_main_sec.get("series", [])
    new_teachers_series  = new_teachers_sec.get("series", [])

    # === DIFF ===
    diff_main     = diff_inventories(old_main,     new_main_lessons)
    diff_teachers = diff_inventories(old_teachers, new_teachers_lessons)

    # === CHECKS ===
    checks_summary = checks_data.get("summary", {}) if checks_data else {}
    att_ok      = checks_summary.get("attachment_ok",      0)
    att_broken  = checks_summary.get("attachment_broken",  0)
    att_missing = checks_summary.get("attachment_missing", 0)
    page_ok     = checks_summary.get("page_ok",            0)
    page_broken = checks_summary.get("page_broken",        0)

    # === PARITY % ===
    def parity_pct(d) -> str:
        total = len(d.matched) + len(d.missing)
        if total == 0:
            return "N/A"
        return f"{100 * len(d.matched) / total:.1f}%"

    # Header
    lines.append(f"# דוח parity — ספר {book}")
    lines.append(f"**תאריך:** {TODAY}")
    lines.append("")
    lines.append("---")
    lines.append("")

    # ── Section: ציבורי ──
    lines.append("## ציבורי (main / general)")
    lines.append("")
    lines.append(f"| מדד | ישן | חדש |")
    lines.append(f"|-----|-----|-----|")
    lines.append(f"| סדרות | {len(set(i.get('parent_url','') for i in old_main))} | {len(new_main_series)} |")
    lines.append(f"| שיעורים | {len(old_main)} | {len(new_main_lessons)} |")
    lines.append("")
    lines.append("### diff")
    lines.append(f"- מותאמים: **{len(diff_main.matched)}** ({parity_pct(diff_main)})")
    lines.append(f"- חוסרים (בישן, לא בחדש): **{len(diff_main.missing)}**")
    lines.append(f"- תוספות (בחדש, לא בישן): **{len(diff_main.extras)}**")
    lines.append(f"- אי-התאמות: **{len(diff_main.mismatches)}**")
    if diff_main.missing:
        lines.append("")
        lines.append("#### חוסרים (ראשונים 10)")
        for item in diff_main.missing[:10]:
            lines.append(f"  - {item.get('title','?')} — {item.get('url','')}")
    if diff_main.mismatches:
        lines.append("")
        lines.append("#### אי-התאמות (ראשונים 10)")
        for item in diff_main.mismatches[:10]:
            issues = item.get("issues", [])
            ot = item.get("old", {}).get("title", "?")
            nt = item.get("new", {}).get("title", "?")
            lines.append(f"  - ישן: '{ot}' | חדש: '{nt}' | {', '.join(issues)}")
    lines.append("")

    # ── Section: מורים ──
    lines.append("## אגף המורים (teachers)")
    lines.append("")
    lines.append(f"| מדד | ישן | חדש |")
    lines.append(f"|-----|-----|-----|")
    lines.append(f"| סדרות | {len(set(i.get('parent_url','') for i in old_teachers))} | {len(new_teachers_series)} |")
    lines.append(f"| שיעורים | {len(old_teachers)} | {len(new_teachers_lessons)} |")
    lines.append("")
    lines.append("### diff")
    lines.append(f"- מותאמים: **{len(diff_teachers.matched)}** ({parity_pct(diff_teachers)})")
    lines.append(f"- חוסרים (בישן, לא בחדש): **{len(diff_teachers.missing)}**")
    lines.append(f"- תוספות (בחדש, לא בישן): **{len(diff_teachers.extras)}**")
    lines.append(f"- אי-התאמות: **{len(diff_teachers.mismatches)}**")
    if diff_teachers.missing:
        lines.append("")
        lines.append("#### חוסרים (ראשונים 10)")
        for item in diff_teachers.missing[:10]:
            lines.append(f"  - {item.get('title','?')} — {item.get('url','')}")
    if diff_teachers.mismatches:
        lines.append("")
        lines.append("#### אי-התאמות (ראשונים 10)")
        for item in diff_teachers.mismatches[:10]:
            issues = item.get("issues", [])
            ot = item.get("old", {}).get("title", "?")
            nt = item.get("new", {}).get("title", "?")
            lines.append(f"  - ישן: '{ot}' | חדש: '{nt}' | {', '.join(issues)}")
    lines.append("")

    # ── בדיקות HTTP ──
    if checks_data:
        lines.append("## בדיקות HTTP (שלב D)")
        lines.append("")
        lines.append(f"| בדיקה | תוצאה |")
        lines.append(f"|-------|-------|")
        lines.append(f"| דפי שיעור תקינים (200) | {page_ok} |")
        lines.append(f"| דפי שיעור שבורים | {page_broken} |")
        lines.append(f"| PDF תקין | {att_ok} |")
        lines.append(f"| PDF שבור | {att_broken} |")
        lines.append(f"| ללא attachment | {att_missing} |")
        lines.append("")
        # Broken PDFs list
        broken_att = [i for i in checks_data.get("items", [])
                      if i.get("attachment", {}).get("valid") is False]
        if broken_att:
            lines.append(f"### PDFs שבורים ({len(broken_att)})")
            for item in broken_att[:20]:
                att = item.get("attachment", {})
                lines.append(f"  - [{item.get('title','?')}] {att.get('url','?')} — {att.get('reason','')}")
            lines.append("")

    # ── Overall parity score ──
    total_old = len(old_main) + len(old_teachers)
    total_matched = len(diff_main.matched) + len(diff_teachers.matched)
    total_missing = len(diff_main.missing) + len(diff_teachers.missing)
    total_extras  = len(diff_main.extras) + len(diff_teachers.extras)

    if total_old > 0:
        overall_pct = f"{100 * total_matched / total_old:.1f}%"
    else:
        overall_pct = "N/A (אינוונטר ישן ריק)"

    lines.append("---")
    lines.append("")
    lines.append("## Scorecard מסכם")
    lines.append("")
    lines.append(f"```")
    lines.append(f"ספר: {book}")
    lines.append(f"============================")
    lines.append(f"שיעורים בישן (ציבורי):   {len(old_main)}")
    lines.append(f"שיעורים בחדש (ציבורי):   {len(new_main_lessons)}")
    lines.append(f"שיעורים בישן (מורים):    {len(old_teachers)}")
    lines.append(f"שיעורים בחדש (מורים):    {len(new_teachers_lessons)}")
    lines.append(f"")
    lines.append(f"מותאמים (ציבורי):  {len(diff_main.matched)}")
    lines.append(f"מותאמים (מורים):   {len(diff_teachers.matched)}")
    lines.append(f"")
    lines.append(f"חוסרים (ציבורי):   {len(diff_main.missing)}")
    lines.append(f"חוסרים (מורים):    {len(diff_teachers.missing)}")
    lines.append(f"תוספות (ציבורי):   {len(diff_main.extras)}")
    lines.append(f"תוספות (מורים):    {len(diff_teachers.extras)}")
    lines.append(f"")
    lines.append(f"PDF תקין:          {att_ok}")
    lines.append(f"PDF שבור:          {att_broken}")
    lines.append(f"")
    lines.append(f"אחוז parity:       {overall_pct}")
    lines.append(f"יעד: 100%")
    lines.append(f"```")
    lines.append("")

    return "\n".join(lines)


# ============================================================
# Main
# ============================================================

def main():
    old_data    = load_json(args.old)
    new_data    = load_json(args.new)
    checks_data = load_json(args.checks) if args.checks else None

    # Normalise old_data (list of items)
    if isinstance(old_data, list):
        old_items = old_data
    else:
        old_items = old_data.get("items", [])

    book = args.book or new_data.get("book", "?")

    report_md = scorecard(book, old_items, new_data, checks_data)

    out_path = Path(args.output) if args.output else REPORTS_DIR / f"parity-report-{book}-{TODAY}.md"
    out_path.write_text(report_md, encoding="utf-8")
    print(report_md)
    print(f"\n=== דוח נשמר: {out_path} ===")


if __name__ == "__main__":
    main()
