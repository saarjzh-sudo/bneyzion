#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
rehost_bneyzion_attachments.py
===============================
Re-hosts lesson PDFs that still point to bneyzion.co.il → Supabase Storage.

Iron rule (2026-06-09): attachment_url חייב להיות על Supabase Storage בלבד.
bneyzion.co.il עומד להיסגר + DNS יצביע על האתר החדש.

Usage:
    # דגימת 5 (חובה לפני ריצה מלאה):
    SUPABASE_SERVICE_ROLE=eyJ... SUPABASE_MANAGEMENT_TOKEN=sbp_... \\
      env -u HTTPS_PROXY -u HTTP_PROXY python3 scripts/rehost_bneyzion_attachments.py --sample 5

    # ריצה מלאה (אחרי אישור סאר):
    SUPABASE_SERVICE_ROLE=eyJ... SUPABASE_MANAGEMENT_TOKEN=sbp_... \\
      env -u HTTPS_PROXY -u HTTP_PROXY python3 scripts/rehost_bneyzion_attachments.py --run

    # המשך ריצה (resume):
    ... python3 scripts/rehost_bneyzion_attachments.py --run --resume

State: scripts/rehost_bneyzion_attachments_state.json
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import urllib.parse
from pathlib import Path

# ── Config ───────────────────────────────────────────────────────────────────
SUPABASE_URL = "https://pzvmwfexeiruelwiujxn.supabase.co"
PROJECT_REF = "pzvmwfexeiruelwiujxn"
BUCKET = "lesson-attachments"
STATE_FILE = Path(__file__).parent / "rehost_bneyzion_attachments_state.json"

# Read credentials from env — NEVER hardcode
SUPABASE_SERVICE_ROLE = os.environ.get("SUPABASE_SERVICE_ROLE", "")
SUPABASE_MANAGEMENT_TOKEN = os.environ.get("SUPABASE_MANAGEMENT_TOKEN", "")

DOWNLOAD_DELAY = 0.5   # seconds between downloads
UPLOAD_DELAY = 0.3     # seconds between uploads
RETRY_COUNT = 3
RETRY_BASE = 1.0


# ── HTTP helpers (noproxy) ───────────────────────────────────────────────────

def _run_curl(args, timeout=90) -> tuple[int, bytes]:
    """Run curl with --noproxy '*'. Returns (status_code, body_bytes)."""
    result = subprocess.run(
        ["curl", "-s", "--noproxy", "*"] + args + ["-w", "\n__STATUS__%{http_code}"],
        capture_output=True, timeout=timeout
    )
    out = result.stdout
    parts = out.rsplit(b"\n__STATUS__", 1)
    body = parts[0]
    status = int(parts[1].strip()) if len(parts) > 1 else 0
    return status, body


def db_query(sql: str) -> list[dict]:
    """Run a SQL query via Supabase Management API."""
    payload = json.dumps({"query": sql}).encode("utf-8")
    with tempfile.NamedTemporaryFile(delete=False, suffix=".json") as tmp:
        tmp.write(payload)
        tmp_path = tmp.name
    try:
        status, body = _run_curl([
            "-X", "POST",
            f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
            "-H", f"Authorization: Bearer {SUPABASE_MANAGEMENT_TOKEN}",
            "-H", "Content-Type: application/json",
            "--data-binary", f"@{tmp_path}",
        ], timeout=30)
    finally:
        os.unlink(tmp_path)
    if status not in (200, 201):
        raise RuntimeError(f"DB query failed ({status}): {body[:300].decode('utf-8', errors='replace')}")
    result = json.loads(body)
    if isinstance(result, dict) and "message" in result:
        raise RuntimeError(f"DB error: {result['message']}")
    return result


# ── File helpers ─────────────────────────────────────────────────────────────

def normalize_url(url: str) -> str | None:
    """Normalize attachment_url to a downloadable URL."""
    url = re.sub(r'\s+"[^"]*"\s*$', '', url.strip())
    url = url.strip()
    if url.startswith("/"):
        url = "https://www.bneyzion.co.il" + url
    if not url.startswith("http"):
        return None
    parsed = urllib.parse.urlparse(url)
    encoded_path = urllib.parse.quote(parsed.path, safe='/%')
    return urllib.parse.urlunparse((
        parsed.scheme, parsed.netloc, encoded_path,
        parsed.params, parsed.query, parsed.fragment,
    ))


def safe_storage_key(url: str, lesson_id: str) -> str:
    """Generate a deterministic, ASCII-safe storage key."""
    url_clean = re.sub(r'\s+"[^"]*"\s*$', '', url.strip())
    raw = urllib.parse.unquote(url_clean.split("?")[0].split("#")[0])
    basename = raw.split("/")[-1]
    lower = basename.lower()
    if lower.endswith(".pdf"):
        ext = ".pdf"
    elif lower.endswith(".docx"):
        ext = ".docx"
    elif lower.endswith(".doc"):
        ext = ".doc"
    else:
        ext = ""
    try:
        basename.encode("ascii")
        name_part = re.sub(r'[^\w\-._]', '-', basename).lstrip('-.')
    except UnicodeEncodeError:
        name_hash = hashlib.sha1(basename.encode("utf-8")).hexdigest()[:10]
        name_part = f"he-{name_hash}{ext}"
    if not name_part:
        name_part = f"attachment{ext}"
    # Use lesson_id prefix for uniqueness
    return f"{lesson_id[:8]}_{name_part}"


def get_mime(url: str) -> str:
    url = re.sub(r'\s+"[^"]*"\s*$', '', url.strip())
    lower = url.lower().split("?")[0]
    if lower.endswith(".pdf"):
        return "application/pdf"
    if lower.endswith(".docx"):
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    if lower.endswith(".doc"):
        return "application/msword"
    return "application/octet-stream"


def download_file(url: str) -> bytes | None:
    """Download file from bneyzion.co.il. Returns bytes or None."""
    normalized = normalize_url(url)
    if not normalized:
        return None
    for attempt in range(RETRY_COUNT):
        try:
            status, body = _run_curl([
                "-L", "--max-filesize", "10485760",  # 10MB
                normalized,
            ], timeout=90)
            if 200 <= status < 300 and body:
                return body
            if status == 404:
                print(f"    404 not found: {normalized}", flush=True)
                return None
            print(f"    Download attempt {attempt+1} failed: HTTP {status}", flush=True)
        except Exception as e:
            print(f"    Download attempt {attempt+1} exception: {e}", flush=True)
        if attempt < RETRY_COUNT - 1:
            time.sleep(RETRY_BASE * (2 ** attempt))
    return None


def is_real_pdf(content: bytes, mime: str) -> bool:
    """Validate the downloaded content is actually a PDF (not an HTML error page)."""
    if len(content) < 100:
        return False
    # PDF magic bytes
    if content[:4] == b'%PDF':
        return True
    # For docx/doc, accept if large enough (>5KB) and mime matches
    if mime in ("application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/msword"):
        return len(content) > 5000
    return False


def upload_to_storage(storage_key: str, content: bytes, mime: str) -> str | None:
    """Upload to Supabase Storage. Returns public URL or None."""
    storage_path = urllib.parse.quote(storage_key, safe='')
    upload_url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}"
    for attempt in range(RETRY_COUNT):
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=Path(storage_key).suffix) as tmp:
                tmp.write(content)
                tmp_path = tmp.name
            status, body = _run_curl([
                "-X", "PUT",
                "-H", f"Authorization: Bearer {SUPABASE_SERVICE_ROLE}",
                "-H", f"Content-Type: {mime}",
                "-H", "x-upsert: true",
                "--data-binary", f"@{tmp_path}",
                upload_url,
            ], timeout=120)
            os.unlink(tmp_path)
            if 200 <= status < 300:
                return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{storage_path}"
            print(f"    Upload attempt {attempt+1} failed: HTTP {status} — {body[:200].decode('utf-8', errors='replace')}", flush=True)
        except Exception as e:
            print(f"    Upload attempt {attempt+1} exception: {e}", flush=True)
        if attempt < RETRY_COUNT - 1:
            time.sleep(RETRY_BASE * (2 ** attempt))
    return None


def update_db(lesson_id: str, old_url: str, new_url: str) -> bool:
    """Save old URL to legacy_attachment_url, set new attachment_url."""
    old_safe = old_url.replace("'", "''")
    new_safe = new_url.replace("'", "''")
    sql = f"""
        UPDATE lessons
        SET legacy_attachment_url = '{old_safe}',
            attachment_url = '{new_safe}'
        WHERE id = '{lesson_id}';
    """
    try:
        db_query(sql)
        return True
    except RuntimeError as e:
        print(f"    DB update error: {e}", flush=True)
        return False


# ── State ────────────────────────────────────────────────────────────────────

def load_state() -> dict:
    if STATE_FILE.exists():
        with open(STATE_FILE, encoding="utf-8") as f:
            return json.load(f)
    return {"done": [], "errors": [], "skipped": []}


def save_state(state: dict):
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


# ── Main ─────────────────────────────────────────────────────────────────────

def fetch_targets(limit: int | None = None, specific_ids: list[str] | None = None) -> list[dict]:
    """Fetch lessons where attachment_url is on bneyzion.co.il."""
    if specific_ids:
        id_list = ", ".join(f"'{i}'" for i in specific_ids)
        where = f"id IN ({id_list})"
    else:
        where = "attachment_url LIKE '%bneyzion.co.il%'"
    limit_clause = f"LIMIT {limit}" if limit else ""
    sql = f"""
        SELECT id, title, attachment_url, bible_book
        FROM lessons
        WHERE {where}
        ORDER BY bible_book NULLS LAST, id
        {limit_clause};
    """
    return db_query(sql)


def process_lesson(lesson: dict, dry_run: bool = False) -> dict:
    """
    Process a single lesson: download → validate → upload → update DB.
    Returns a result dict with status, new_url, error.
    """
    lid = lesson["id"]
    title = lesson["title"]
    old_url = lesson["attachment_url"]
    book = lesson.get("bible_book", "unknown")

    print(f"\n[{lid[:8]}] {title} ({book})", flush=True)
    print(f"  old: {old_url}", flush=True)

    mime = get_mime(old_url)

    # Download
    content = download_file(old_url)
    if content is None:
        return {"lesson_id": lid, "status": "error", "error": "download_failed", "old_url": old_url}

    # Validate
    if not is_real_pdf(content, mime):
        # Check if it's an HTML error page
        try:
            text_preview = content[:200].decode("utf-8", errors="replace")
        except Exception:
            text_preview = repr(content[:50])
        print(f"    SKIP: not a valid PDF ({len(content)} bytes). Preview: {text_preview[:100]}", flush=True)
        return {"lesson_id": lid, "status": "error", "error": f"not_pdf_{len(content)}_bytes", "old_url": old_url}

    print(f"  downloaded: {len(content):,} bytes ({mime})", flush=True)

    if dry_run:
        print(f"  DRY-RUN: would upload + update DB", flush=True)
        return {"lesson_id": lid, "status": "dry_run", "bytes": len(content)}

    # Upload
    storage_key = safe_storage_key(old_url, lid)
    new_url = upload_to_storage(storage_key, content, mime)
    if new_url is None:
        return {"lesson_id": lid, "status": "error", "error": "upload_failed", "old_url": old_url}

    print(f"  new:  {new_url}", flush=True)

    # Update DB
    ok = update_db(lid, old_url, new_url)
    if not ok:
        return {"lesson_id": lid, "status": "error", "error": "db_update_failed",
                "old_url": old_url, "new_url": new_url}

    return {"lesson_id": lid, "status": "done", "old_url": old_url, "new_url": new_url}


def main():
    parser = argparse.ArgumentParser(description="Re-host bneyzion.co.il attachments → Supabase Storage")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--sample", type=int, metavar="N",
                      help="Process N lessons as a sample (dry-run)")
    mode.add_argument("--sample-ids", nargs="+", metavar="ID",
                      help="Process specific lesson IDs as a sample (dry-run)")
    mode.add_argument("--run", action="store_true",
                      help="Full run — process all 373+ bneyzion.co.il URLs")
    mode.add_argument("--audit", action="store_true",
                      help="Count-only audit — show stats, no changes")
    parser.add_argument("--resume", action="store_true",
                        help="Resume from state file (skip done lessons)")
    parser.add_argument("--dry-run", action="store_true",
                        help="With --run: download+validate but don't upload or update DB")
    args = parser.parse_args()

    # Validate credentials (not needed for --audit)
    if not args.audit:
        if not SUPABASE_SERVICE_ROLE:
            print("ERROR: SUPABASE_SERVICE_ROLE env var not set.", flush=True)
            sys.exit(1)
        if not SUPABASE_MANAGEMENT_TOKEN:
            print("ERROR: SUPABASE_MANAGEMENT_TOKEN env var not set.", flush=True)
            sys.exit(1)

    # ── Audit mode ──
    if args.audit:
        print("=== Attachment URL Audit ===")
        rows = db_query("""
            SELECT
              COUNT(*) FILTER (WHERE attachment_url IS NOT NULL) as total_with_attachment,
              COUNT(*) FILTER (WHERE attachment_url LIKE '%bneyzion.co.il%') as bneyzion_co_il,
              COUNT(*) FILTER (WHERE attachment_url LIKE '%supabase.co%') as supabase_storage,
              COUNT(*) FILTER (WHERE attachment_url LIKE '%amazonaws.com%') as s3_amazon,
              COUNT(*) FILTER (WHERE attachment_url IS NOT NULL
                AND attachment_url NOT LIKE '%supabase.co%'
                AND attachment_url NOT LIKE '%amazonaws.com%'
                AND attachment_url NOT LIKE '%bneyzion.co.il%') as other_external
            FROM lessons;
        """)
        r = rows[0]
        print(f"  Total with attachment_url:  {r['total_with_attachment']}")
        print(f"  On Supabase Storage:         {r['supabase_storage']}  (OK)")
        print(f"  On bneyzion.co.il:           {r['bneyzion_co_il']}  (MUST REHOST)")
        print(f"  On S3 Amazon:                {r['s3_amazon']}  (OK — not affected by DNS cutover)")
        print(f"  Other external:              {r['other_external']}  (investigate)")
        return

    # ── Sample mode ──
    is_sample = args.sample or args.sample_ids
    dry_run = is_sample or args.dry_run

    if args.sample_ids:
        lessons = fetch_targets(specific_ids=args.sample_ids)
        print(f"=== SAMPLE (specific IDs: {args.sample_ids}) ===", flush=True)
    elif args.sample:
        lessons = fetch_targets(limit=args.sample)
        print(f"=== SAMPLE ({args.sample} lessons, dry-run) ===", flush=True)
    else:
        lessons = fetch_targets()
        print(f"=== FULL RUN ({len(lessons)} lessons) ===", flush=True)

    state = load_state() if args.resume else {"done": [], "errors": [], "skipped": []}
    done_ids = {r["lesson_id"] for r in state["done"]}

    total = len(lessons)
    succeeded = 0
    failed = 0
    skipped = 0

    for i, lesson in enumerate(lessons, 1):
        lid = lesson["id"]
        print(f"\n[{i}/{total}]", flush=True)

        if lid in done_ids:
            print(f"  SKIP (already done): {lid[:8]}", flush=True)
            skipped += 1
            continue

        result = process_lesson(lesson, dry_run=dry_run)

        if result["status"] == "done":
            succeeded += 1
            state["done"].append(result)
        elif result["status"] == "dry_run":
            succeeded += 1
        else:
            failed += 1
            state["errors"].append(result)

        if not dry_run:
            save_state(state)

        time.sleep(DOWNLOAD_DELAY)

    print(f"\n=== Summary ===")
    print(f"  Total:     {total}")
    print(f"  Succeeded: {succeeded}")
    print(f"  Failed:    {failed}")
    print(f"  Skipped:   {skipped}")
    if not dry_run and state["errors"]:
        print(f"\nErrors ({len(state['errors'])}):")
        for e in state["errors"]:
            print(f"  {e['lesson_id'][:8]}: {e.get('error', '?')}")
    print(f"\nState saved to: {STATE_FILE}")


if __name__ == "__main__":
    main()
