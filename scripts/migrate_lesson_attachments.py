#!/usr/bin/env python3
"""
migrate_lesson_attachments.py
==============================
Migrates lesson attachment files from bneyzion.co.il (Umbraco /media/ URLs)
to Supabase Storage (lesson-attachments bucket).

For each lesson with an attachment_url pointing to bneyzion.co.il:
  1. Download the file from Umbraco
  2. Upload to Supabase Storage (lesson-attachments bucket)
  3. Update DB via PostgREST (PATCH /rest/v1/lessons?id=eq.{lesson_id})
     - attachment_url → new Supabase URL
     - legacy_attachment_url → old bneyzion.co.il URL

State is saved to migrate_lesson_attachments_state.json (thread-safe).

Usage:
    python3 scripts/migrate_lesson_attachments.py [--workers N] [--resume] [--limit N] [--dry-run]

Options:
    --workers N    Parallel workers (default 1, max 10)
    --resume       Resume from state file (skip already-done lessons)
    --limit N      Process at most N lessons (for testing)
    --dry-run      Show what would be done without making changes
"""

from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import os
import re
import subprocess
import sys
import tempfile
import threading
import time
import urllib.parse
from pathlib import Path

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SUPABASE_URL = "https://pzvmwfexeiruelwiujxn.supabase.co"
SUPABASE_REST_URL = f"{SUPABASE_URL}/rest/v1"
SUPABASE_STORAGE_URL = f"{SUPABASE_URL}/storage/v1"
SUPABASE_BUCKET = "lesson-attachments"

# Key from .env (fallback to env var)
_env_file = Path(__file__).parent.parent / ".env"
def _load_env_key() -> str:
    """Load SUPABASE_SERVICE_ROLE_KEY from .env or environment."""
    # Check environment first
    key = os.environ.get("SUPABASE_SERVICE_ROLE") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if key:
        return key.strip()
    # Load from .env
    if _env_file.exists():
        for line in _env_file.read_text().splitlines():
            if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
                return line.split("=", 1)[1].strip()
    raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY not found in .env or environment")

SUPABASE_SERVICE_ROLE = _load_env_key()

BNEYZION_BASE = "https://www.bneyzion.co.il"
STATE_FILE = Path(__file__).parent / "migrate_lesson_attachments_state.json"

# PostgREST headers (used for all DB operations)
POSTGREST_HEADERS = {
    "apikey": SUPABASE_SERVICE_ROLE,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

# ---------------------------------------------------------------------------
# Thread-safe state management
# ---------------------------------------------------------------------------
_state_lock = threading.Lock()

def load_state() -> dict:
    if STATE_FILE.exists():
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"done": [], "errors": [], "pending": []}

def save_state(state: dict):
    """Atomic write to state file."""
    tmp = str(STATE_FILE) + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)
    os.replace(tmp, STATE_FILE)

def record_done(lesson_id: str, old_url: str, new_url: str, repaired: bool = False):
    with _state_lock:
        state = load_state()
        # Remove from errors if present
        state["errors"] = [e for e in state["errors"] if e.get("lesson_id") != lesson_id]
        # Remove from pending if present
        state["pending"] = [p for p in state.get("pending", []) if p != lesson_id]
        # Add to done
        entry = {"lesson_id": lesson_id, "old_url": old_url, "new_url": new_url}
        if repaired:
            entry["repaired"] = True
        # Avoid duplicates
        state["done"] = [d for d in state["done"] if d.get("lesson_id") != lesson_id]
        state["done"].append(entry)
        save_state(state)

def record_error(lesson_id: str, old_url: str, error: str, new_url: str = None):
    with _state_lock:
        state = load_state()
        state["pending"] = [p for p in state.get("pending", []) if p != lesson_id]
        # Remove previous error for same lesson
        state["errors"] = [e for e in state["errors"] if e.get("lesson_id") != lesson_id]
        entry = {"lesson_id": lesson_id, "old_url": old_url, "error": error}
        if new_url:
            entry["new_url"] = new_url
        state["errors"].append(entry)
        save_state(state)

# ---------------------------------------------------------------------------
# HTTP helpers (using curl --noproxy for NetSpark)
# ---------------------------------------------------------------------------

def curl_request(method: str, url: str, headers: dict = None,
                 data: bytes = None, json_data: dict = None,
                 output_file: str = None, timeout: int = 60) -> tuple[int, str]:
    """
    Execute a curl request with --noproxy '*' (NetSpark workaround).
    Returns (status_code, response_text).
    """
    cmd = ["curl", "-s", "--noproxy", "*", "-X", method,
           "--max-time", str(timeout)]

    if headers:
        for k, v in headers.items():
            cmd += ["-H", f"{k}: {v}"]

    if json_data is not None:
        cmd += ["-H", "Content-Type: application/json"]
        cmd += ["--data-raw", json.dumps(json_data, ensure_ascii=False)]

    if data is not None:
        # Write to temp file to avoid shell escaping issues
        with tempfile.NamedTemporaryFile(delete=False) as f:
            f.write(data)
            tmp_path = f.name
        cmd += ["--data-binary", f"@{tmp_path}"]
    else:
        tmp_path = None

    if output_file:
        cmd += ["-o", output_file]
        cmd += ["-w", "%{http_code}"]
    else:
        cmd += ["-w", "\n%{http_code}"]

    cmd.append(url)

    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout + 5)
        output = r.stdout.strip()
        if output_file:
            # Last line is status code
            status = int(output.strip()) if output.strip().isdigit() else 0
            return status, ""
        else:
            lines = output.rsplit("\n", 1)
            body = lines[0] if len(lines) > 1 else ""
            status_str = lines[-1].strip()
            status = int(status_str) if status_str.isdigit() else 0
            return status, body
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

def curl_download(url: str, output_path: str, timeout: int = 30) -> bool:
    """Download file with curl. Returns True on success."""
    # --globoff: disable glob patterns so Hebrew/special chars in URL work
    # -L: follow redirects
    cmd = [
        "curl", "-s", "--noproxy", "*", "-L", "--globoff",
        "--max-time", str(timeout),
        "-o", output_path,
        "-w", "%{http_code}",
        url
    ]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout + 5)
        status_str = r.stdout.strip()
        status = int(status_str) if status_str.isdigit() else 0
        if status != 200:
            return False
        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
            return False
        # Verify not an HTML error page (Umbraco sometimes returns 200 HTML)
        with open(output_path, "rb") as f:
            header = f.read(10)
        # Reject HTML pages (<!DOCTYPE or <html)
        if header[:5].lower() in (b"<!doc", b"<html"):
            return False
        return True
    except Exception as e:
        print(f"  Download error: {e}", flush=True)
        return False

# ---------------------------------------------------------------------------
# PostgREST DB update (replaces Management API)
# ---------------------------------------------------------------------------

def update_lesson_db_postgrest(lesson_id: str, new_url: str, legacy_url: str,
                                max_retries: int = 3) -> bool:
    """
    Update lesson in DB via PostgREST PATCH.
    Returns True on success.
    """
    url = f"{SUPABASE_REST_URL}/lessons?id=eq.{lesson_id}"
    payload = {
        "attachment_url": new_url,
        "legacy_attachment_url": legacy_url,
    }

    for attempt in range(max_retries):
        status, body = curl_request(
            "PATCH", url,
            headers=POSTGREST_HEADERS,
            json_data=payload,
            timeout=30,
        )
        if status in (200, 204):
            return True
        if status == 429:
            wait = 10 * (attempt + 1)
            print(f"  PostgREST 429 (attempt {attempt+1}) — waiting {wait}s", flush=True)
            time.sleep(wait)
            continue
        if status == 0:
            wait = 5 * (attempt + 1)
            print(f"  PostgREST timeout/network error (attempt {attempt+1}) — waiting {wait}s", flush=True)
            time.sleep(wait)
            continue
        # Other error
        print(f"  PostgREST error {status}: {body[:200]}", flush=True)
        if attempt < max_retries - 1:
            time.sleep(3)
    return False

# ---------------------------------------------------------------------------
# Supabase Storage upload
# ---------------------------------------------------------------------------

def build_storage_key(lesson_id: str, filename: str) -> str:
    """
    Build a stable storage key: {lesson_id}_{lang}-{hash8}.{ext}
    Hash is based on filename to detect content changes.
    """
    ext = Path(filename).suffix.lower() or ".bin"
    # Short hash for deduplication
    h = hashlib.md5(filename.encode()).hexdigest()[:10]
    # Language hint (Hebrew filenames)
    lang = "he"
    safe_stem = re.sub(r"[^\w\-]", "_", Path(filename).stem)[:20]
    return f"{lesson_id}_{lang}-{h}{ext}"

def guess_content_type(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    mime_map = {
        ".pdf": "application/pdf",
        ".doc": "application/msword",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".ppt": "application/vnd.ms-powerpoint",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".xls": "application/vnd.ms-excel",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".mp3": "audio/mpeg",
        ".mp4": "video/mp4",
        ".zip": "application/zip",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
    }
    return mime_map.get(ext, "application/octet-stream")

def upload_to_storage(local_path: str, storage_key: str, content_type: str,
                      max_retries: int = 3) -> tuple[bool, str]:
    """
    Upload file to Supabase Storage via POST.
    Returns (success, public_url).
    """
    upload_url = f"{SUPABASE_STORAGE_URL}/object/{SUPABASE_BUCKET}/{storage_key}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE}",
        "Content-Type": content_type,
        "Cache-Control": "3600",
        "x-upsert": "true",
    }

    with open(local_path, "rb") as f:
        file_data = f.read()

    for attempt in range(max_retries):
        status, body = curl_request(
            "POST", upload_url,
            headers=headers,
            data=file_data,
            timeout=120,
        )
        if status in (200, 201):
            public_url = (
                f"{SUPABASE_STORAGE_URL}/object/public/{SUPABASE_BUCKET}/{storage_key}"
            )
            return True, public_url
        if status == 429:
            wait = 15 * (attempt + 1)
            print(f"  Storage 429 (attempt {attempt+1}) — waiting {wait}s", flush=True)
            time.sleep(wait)
            continue
        print(f"  Storage upload error {status}: {body[:200]}", flush=True)
        if attempt < max_retries - 1:
            time.sleep(3)
    return False, ""

# ---------------------------------------------------------------------------
# Fetch lessons to migrate from DB
# ---------------------------------------------------------------------------

def fetch_lessons_to_migrate() -> list[dict]:
    """
    Fetch all lessons from DB where attachment_url points to bneyzion.co.il.
    Uses PostgREST with range headers for pagination.
    """
    lessons = []
    page_size = 1000
    offset = 0

    print("Fetching lessons to migrate from DB...", flush=True)
    while True:
        url = (
            f"{SUPABASE_REST_URL}/lessons"
            f"?select=id,attachment_url"
            f"&attachment_url=ilike.*bneyzion.co.il*"
            f"&limit={page_size}&offset={offset}"
        )
        headers = {
            "apikey": SUPABASE_SERVICE_ROLE,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE}",
            "Accept": "application/json",
        }
        status, body = curl_request("GET", url, headers=headers, timeout=30)
        if status != 200:
            print(f"  DB fetch error {status}: {body[:200]}", flush=True)
            break
        try:
            batch = json.loads(body)
        except json.JSONDecodeError:
            print(f"  JSON parse error: {body[:200]}", flush=True)
            break
        if not batch:
            break
        lessons.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size
        print(f"  fetched {len(lessons)} so far...", flush=True)

    print(f"Total lessons to migrate: {len(lessons)}", flush=True)
    return lessons

# ---------------------------------------------------------------------------
# Single lesson migration
# ---------------------------------------------------------------------------

def migrate_lesson(lesson: dict, dry_run: bool = False) -> str:
    """
    Migrate a single lesson attachment.
    Returns: 'done' | 'skipped' | 'error:<reason>'
    """
    lesson_id = lesson["id"]
    old_url = lesson["attachment_url"]

    # Build absolute URL
    if old_url.startswith("/"):
        download_url = BNEYZION_BASE + old_url
    elif old_url.startswith("http"):
        download_url = old_url
    else:
        download_url = BNEYZION_BASE + "/" + old_url

    # Extract filename from URL
    parsed = urllib.parse.urlparse(old_url)
    filename = urllib.parse.unquote(Path(parsed.path).name)
    if not filename:
        filename = "attachment.bin"

    # Skip URLs that look like HTML pages (no file extension)
    # These are Umbraco navigation URLs, not downloadable files
    ext = Path(filename).suffix.lower()
    known_file_exts = {
        ".pdf", ".doc", ".docx", ".ppt", ".pptx",
        ".xls", ".xlsx", ".mp3", ".mp4", ".zip",
        ".jpg", ".jpeg", ".png", ".gif", ".bmp",
        ".odt", ".rtf", ".txt",
    }
    if not ext or ext not in known_file_exts:
        record_error(lesson_id, old_url, f"skipped_no_file_ext|ext={ext}")
        return "error:skipped_no_file_ext"

    storage_key = build_storage_key(lesson_id, filename)
    content_type = guess_content_type(filename)
    public_url = f"{SUPABASE_STORAGE_URL}/object/public/{SUPABASE_BUCKET}/{storage_key}"

    if dry_run:
        print(f"  [DRY RUN] {lesson_id[:8]}... | {filename} → {storage_key}", flush=True)
        return "done"

    # Download to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix) as f:
        tmp_path = f.name

    try:
        ok = curl_download(download_url, tmp_path, timeout=60)
        if not ok:
            record_error(lesson_id, old_url, "download_failed")
            return "error:download_failed"

        file_size = os.path.getsize(tmp_path)

        # Upload to Supabase Storage
        ok, new_url = upload_to_storage(tmp_path, storage_key, content_type)
        if not ok:
            record_error(lesson_id, old_url, "upload_failed", new_url=public_url)
            return "error:upload_failed"

        # Update DB via PostgREST
        ok = update_lesson_db_postgrest(lesson_id, new_url, old_url)
        if not ok:
            # File is in storage, DB failed
            record_error(lesson_id, old_url,
                         f"db_update_failed|new_url={new_url}",
                         new_url=new_url)
            return "error:db_update_failed"

        record_done(lesson_id, old_url, new_url)
        return "done"

    except Exception as e:
        err_msg = f"exception:{e}"
        record_error(lesson_id, old_url, err_msg)
        return f"error:{err_msg}"
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Migrate bneyzion lesson attachments to Supabase Storage")
    parser.add_argument("--workers", type=int, default=1,
                        help="Parallel workers (default 1)")
    parser.add_argument("--resume", action="store_true",
                        help="Skip already-done lessons from state file")
    parser.add_argument("--limit", type=int, default=None,
                        help="Process at most N lessons")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would be done, no changes")
    args = parser.parse_args()

    print("=== migrate_lesson_attachments.py ===", flush=True)
    print(f"Workers: {args.workers} | Resume: {args.resume} | Limit: {args.limit} | Dry run: {args.dry_run}", flush=True)
    print(f"PostgREST URL: {SUPABASE_REST_URL}", flush=True)
    print()

    # Load current state
    state = load_state()
    done_ids = {d["lesson_id"] for d in state.get("done", [])}
    print(f"Already done (from state): {len(done_ids)}", flush=True)

    # Fetch lessons from DB
    lessons = fetch_lessons_to_migrate()

    if args.resume:
        lessons = [l for l in lessons if l["id"] not in done_ids]
        print(f"After resume filter: {len(lessons)} lessons remaining", flush=True)

    if args.limit:
        lessons = lessons[:args.limit]
        print(f"After --limit: {len(lessons)} lessons", flush=True)

    if not lessons:
        print("Nothing to do.", flush=True)
        return

    print()
    print(f"Starting migration of {len(lessons)} lessons with {args.workers} workers...", flush=True)
    print()

    # Counters
    counter = {"done": 0, "error": 0, "total": len(lessons)}
    counter_lock = threading.Lock()
    start_time = time.time()

    def process_batch(batch: list[dict]):
        for lesson in batch:
            result = migrate_lesson(lesson, dry_run=args.dry_run)
            with counter_lock:
                if result == "done":
                    counter["done"] += 1
                else:
                    counter["error"] += 1
                processed = counter["done"] + counter["error"]
                if processed % 10 == 0 or processed == counter["total"]:
                    elapsed = time.time() - start_time
                    rate = processed / elapsed * 60 if elapsed > 0 else 0
                    print(
                        f"  Progress: {processed}/{counter['total']} "
                        f"| done={counter['done']} errors={counter['error']} "
                        f"| {rate:.0f}/min",
                        flush=True
                    )

    if args.workers <= 1:
        process_batch(lessons)
    else:
        import concurrent.futures
        chunk_size = max(1, len(lessons) // args.workers)
        chunks = [lessons[i:i+chunk_size] for i in range(0, len(lessons), chunk_size)]
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
            futures = [executor.submit(process_batch, chunk) for chunk in chunks]
            concurrent.futures.wait(futures)

    elapsed = time.time() - start_time
    print()
    print("=== MIGRATION COMPLETE ===", flush=True)
    print(f"Total: {counter['total']} | Done: {counter['done']} | Errors: {counter['error']}", flush=True)
    print(f"Time: {elapsed:.1f}s ({elapsed/60:.1f} min)", flush=True)
    print(f"Rate: {counter['total']/elapsed*60:.0f} lessons/min", flush=True)

    # Final state summary
    final_state = load_state()
    db_fail_count = sum(
        1 for e in final_state.get("errors", [])
        if "db_update_failed" in e.get("error", "")
    )
    print()
    print(f"State summary: done={len(final_state.get('done',[]))} | errors={len(final_state.get('errors',[]))} | db_failures={db_fail_count}", flush=True)


if __name__ == "__main__":
    main()
