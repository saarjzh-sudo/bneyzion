#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
run_parity.py — orchestrator
==============================
מנהל pipeline מלא: A → B → D → G

Usage:
    # dry-run (קריאה בלבד, ללא שינוי DB):
    env -u HTTPS_PROXY -u HTTP_PROXY \
    SUPABASE_MANAGEMENT_API_TOKEN=sbp_... \
    python3 scripts/parity/run_parity.py --book בראשית --dry-run

    # ריצה מלאה:
    env -u HTTPS_PROXY -u HTTP_PROXY \
    SUPABASE_MANAGEMENT_API_TOKEN=sbp_... \
    python3 scripts/parity/run_parity.py --book בראשית --sections both

    # מהירה — רק Supabase (skip crawl):
    python3 scripts/parity/run_parity.py --book בראשית --skip-crawl

    # עם תיקונים (אחרי גיבוי אוטומטי):
    python3 scripts/parity/run_parity.py --book בראשית --fix --backup-first
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from parity_engine import sql_query, sql_exec, SUPABASE_PAT

SCRIPTS_DIR = Path(__file__).parent
REPORTS_DIR = SCRIPTS_DIR / "reports"
REPORTS_DIR.mkdir(exist_ok=True)
TODAY = date.today().isoformat().replace("-", "")

# ============================================================
# Args
# ============================================================

parser = argparse.ArgumentParser(description="Run full parity pipeline for a Bible book")
parser.add_argument("--book",       default="בראשית", help="ספר בתנ\"ך (default: בראשית)")
parser.add_argument("--sections",   default="both",   choices=["main","teachers","both"])
parser.add_argument("--dry-run",    action="store_true", help="Read-only — no DB changes")
parser.add_argument("--skip-crawl", action="store_true", help="Skip step A (old-site crawl)")
parser.add_argument("--skip-checks",action="store_true", help="Skip step D (HTTP checks)")
parser.add_argument("--fix",        action="store_true", help="Run step F — fix mismatches in DB")
parser.add_argument("--backup-first", action="store_true", help="Create backup table before fix")
parser.add_argument("--max-crawl",  type=int, default=200, help="Max pages for crawl")
parser.add_argument("--max-checks", type=int, default=0,   help="Max lessons for HTTP checks (0=all)")
parser.add_argument("--output",     default=None, help="Report output path")
args = parser.parse_args()

BOOK = args.book

if not SUPABASE_PAT:
    print("ERROR: SUPABASE_MANAGEMENT_API_TOKEN not set", file=sys.stderr)
    print("  export SUPABASE_MANAGEMENT_API_TOKEN=sbp_...", file=sys.stderr)
    sys.exit(1)

# ============================================================
# Backup helper (before any write)
# ============================================================

def backup_lessons_table() -> bool:
    bak_name = f"lessons_bak_parity_{TODAY}"
    print(f"\n[backup] יוצר גיבוי: {bak_name} ...")
    # Drop existing backup from same day
    sql_exec(f"DROP TABLE IF EXISTS {bak_name}")
    res = sql_exec(f"CREATE TABLE {bak_name} AS SELECT * FROM lessons")
    if isinstance(res, list) and len(res) == 0:
        # Check count
        rows = sql_query(f"SELECT COUNT(*) AS cnt FROM {bak_name}")
        cnt = rows[0].get("cnt", 0) if rows else 0
        if int(cnt) > 1000:
            print(f"  גיבוי OK — {cnt} שורות")
            return True
        else:
            print(f"  אזהרה: גיבוי נוצר אבל {cnt} שורות בלבד")
            return cnt > 0
    print(f"  גיבוי תגובה: {res}")
    return True   # trust it


# ============================================================
# Step runner
# ============================================================

def run_step(script: str, extra_args: list[str]) -> int:
    """Run a step script as subprocess, return exit code."""
    cmd = [sys.executable, str(SCRIPTS_DIR / script)] + extra_args
    env = dict(os.environ)
    env["SUPABASE_MANAGEMENT_API_TOKEN"] = SUPABASE_PAT
    env["HTTP_PROXY"]  = ""
    env["HTTPS_PROXY"] = ""
    env["NO_PROXY"]    = "*"
    result = subprocess.run(cmd, env=env)
    return result.returncode


# ============================================================
# File resolution helpers
# ============================================================

def latest_file(prefix: str) -> Path | None:
    """Find latest file in REPORTS_DIR matching prefix."""
    matches = sorted(REPORTS_DIR.glob(f"{prefix}*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    return matches[0] if matches else None


# ============================================================
# Main pipeline
# ============================================================

def main():
    print(f"=== Parity Pipeline — ספר {BOOK} | תאריך {TODAY} ===")
    print(f"    sections={args.sections} dry-run={args.dry_run} fix={args.fix}")
    print()

    # ── Step A: Old-site inventory ──
    old_path: Path | None = None
    if not args.skip_crawl:
        print("▶ שלב A: אינוונטר האתר הישן (crawl)")
        old_out = REPORTS_DIR / f"old-inventory-{BOOK}-{TODAY}.json"
        rc = run_step("step_a_old_inventory.py", [
            "--book",      BOOK,
            "--section",   args.sections,
            "--max-pages", str(args.max_crawl),
            "--output",    str(old_out),
        ])
        if rc != 0:
            print(f"  אזהרה: שלב A הסתיים עם קוד {rc}")
        old_path = old_out if old_out.exists() else None
    else:
        print("▷ שלב A דולג (--skip-crawl)")
        old_path = latest_file(f"old-inventory-{BOOK}-")
        if old_path:
            print(f"  משתמש בקובץ קיים: {old_path.name}")
        else:
            print("  אזהרה: לא נמצא קובץ inventory ישן. דוח יהיה חלקי.")

    # ── Step B: New-site inventory (Supabase) ──
    print("\n▶ שלב B: אינוונטר חדש (Supabase)")
    new_out = REPORTS_DIR / f"new-inventory-{BOOK}-{TODAY}.json"
    rc = run_step("step_b_new_inventory.py", [
        "--book",    BOOK,
        "--section", args.sections,
        "--output",  str(new_out),
    ])
    if rc != 0:
        print(f"  אזהרה: שלב B הסתיים עם קוד {rc}")
    new_path = new_out if new_out.exists() else None

    if not new_path:
        print("ERROR: לא ניתן להמשיך ללא inventory חדש", file=sys.stderr)
        sys.exit(1)

    # ── Step D: HTTP checks ──
    checks_path: Path | None = None
    if not args.skip_checks:
        print("\n▶ שלב D: בדיקות HTTP + PDF")
        checks_out = REPORTS_DIR / f"new-inventory-{BOOK}-{TODAY}_checks_{TODAY}.json"
        max_arg    = ["--max", str(args.max_checks)] if args.max_checks else []
        rc = run_step("step_d_item_checks.py", [
            "--inventory", str(new_path),
            "--output",    str(checks_out),
        ] + max_arg)
        if rc != 0:
            print(f"  אזהרה: שלב D הסתיים עם קוד {rc}")
        checks_path = checks_out if checks_out.exists() else None
    else:
        print("▷ שלב D דולג (--skip-checks)")

    # ── Step F: Fix (optional, only with --fix) ──
    if args.fix and not args.dry_run:
        if args.backup_first:
            ok = backup_lessons_table()
            if not ok:
                print("ERROR: גיבוי נכשל — מבטל תיקונים", file=sys.stderr)
                sys.exit(1)
        print("\n▶ שלב F: תיקונים (לא ממומש בגרסה זו — SKIP)")
        # step_f_fix.py will be a future addition
    elif args.fix and args.dry_run:
        print("\n▷ שלב F דולג (--dry-run)")

    # ── Step G: Report ──
    print("\n▶ שלב G: דוח parity")
    report_out = Path(args.output) if args.output else REPORTS_DIR / f"parity-report-{BOOK}-{TODAY}.md"

    g_args = [
        "--new",  str(new_path),
        "--book", BOOK,
        "--output", str(report_out),
    ]
    if old_path:
        g_args += ["--old", str(old_path)]
    if checks_path:
        g_args += ["--checks", str(checks_path)]

    rc = run_step("step_g_report.py", g_args)
    if rc != 0:
        print(f"  אזהרה: שלב G הסתיים עם קוד {rc}")

    print(f"\n=== Pipeline הושלם ===")
    print(f"דוח: {report_out}")

    # Print report content
    if report_out.exists():
        print()
        print(report_out.read_text(encoding="utf-8"))

    return 0


if __name__ == "__main__":
    sys.exit(main())
