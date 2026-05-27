#!/usr/bin/env python3
"""
migrate_phase2.py
=================
Phase 2 comprehensive attachment migration.

Sub-task D: Null out empty-string attachment_url (71 rows)
Sub-task A: Relative /media/... paths (3,035 rows, 318 distinct)
             - 307 distinct already in Supabase via legacy match → DB UPDATE only
             - 11 distinct need fresh upload first
Sub-task B: Absolute bneyzion.co.il/media/ paths still unmigrated (3 rows)

Does NOT touch:
  - Page URLs (/מאגר-... / bneyzion.co.il/מאגר-...) — awaiting Saar decision
  - Already-migrated rows (supabase.co URLs)

Safety:
  - Always saves legacy_attachment_url before changing attachment_url
  - Atomic DB updates per row via PostgREST
  - State file for resume

Usage:
    python3 scripts/migrate_phase2.py [--dry-run] [--workers N] [--task D|A|B|ALL]
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
BNEYZION_BASE = "https://www.bneyzion.co.il"

_env_file = Path(__file__).parent.parent / ".env"

def _load_env_key() -> str:
    key = os.environ.get("SUPABASE_SERVICE_ROLE") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if key:
        return key.strip()
    if _env_file.exists():
        for line in _env_file.read_text().splitlines():
            if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
                return line.split("=", 1)[1].strip()
    raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY not found in .env or environment")

SUPABASE_SERVICE_ROLE = _load_env_key()

STATE_FILE = Path(__file__).parent / "migrate_phase2_state.json"

POSTGREST_HEADERS = {
    "apikey": SUPABASE_SERVICE_ROLE,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

KNOWN_FILE_EXTS = {
    ".pdf", ".doc", ".docx", ".ppt", ".pptx",
    ".xls", ".xlsx", ".mp3", ".mp4", ".zip",
    ".jpg", ".jpeg", ".png", ".gif", ".bmp",
    ".odt", ".rtf", ".txt",
}

# ---------------------------------------------------------------------------
# State management
# ---------------------------------------------------------------------------
_state_lock = threading.Lock()

def load_state() -> dict:
    if STATE_FILE.exists():
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"done_d": 0, "done_a": [], "done_b": [], "errors_a": [], "errors_b": [], "upload_cache": {}}

def save_state(state: dict):
    tmp = str(STATE_FILE) + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)
    os.replace(tmp, STATE_FILE)

# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

def curl_request(method: str, url: str, headers: dict = None,
                 data: bytes = None, json_data: dict = None,
                 timeout: int = 60) -> tuple[int, str]:
    cmd = ["curl", "-s", "--noproxy", "*", "-X", method, "--max-time", str(timeout)]
    if headers:
        for k, v in headers.items():
            cmd += ["-H", f"{k}: {v}"]
    if json_data is not None:
        cmd += ["-H", "Content-Type: application/json"]
        cmd += ["--data-raw", json.dumps(json_data, ensure_ascii=False)]
    tmp_path = None
    if data is not None:
        with tempfile.NamedTemporaryFile(delete=False) as f:
            f.write(data)
            tmp_path = f.name
        cmd += ["--data-binary", f"@{tmp_path}"]
    cmd += ["-w", "\n%{http_code}"]
    cmd.append(url)
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout + 5)
        output = r.stdout.strip()
        lines = output.rsplit("\n", 1)
        body = lines[0] if len(lines) > 1 else ""
        status_str = lines[-1].strip()
        status = int(status_str) if status_str.isdigit() else 0
        return status, body
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

def curl_download(url: str, output_path: str, timeout: int = 60) -> bool:
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
        with open(output_path, "rb") as f:
            header = f.read(10)
        if header[:5].lower() in (b"<!doc", b"<html"):
            return False
        return True
    except Exception as e:
        print(f"  Download error: {e}", flush=True)
        return False

# ---------------------------------------------------------------------------
# DB helpers (PostgREST)
# ---------------------------------------------------------------------------

def fetch_postgrest(filter_str: str, select: str = "id,attachment_url,legacy_attachment_url",
                    limit: int = 5000) -> list[dict]:
    """Fetch rows via PostgREST with pagination."""
    results = []
    page_size = 1000
    offset = 0
    while True:
        url = f"{SUPABASE_REST_URL}/lessons?select={select}&{filter_str}&limit={page_size}&offset={offset}"
        status, body = curl_request("GET", url, headers={
            "apikey": SUPABASE_SERVICE_ROLE,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE}",
            "Accept": "application/json",
        }, timeout=30)
        if status != 200:
            print(f"  DB fetch error {status}: {body[:200]}", flush=True)
            break
        try:
            batch = json.loads(body)
        except:
            print(f"  JSON parse error: {body[:200]}", flush=True)
            break
        if not batch:
            break
        results.extend(batch)
        if len(batch) < page_size or len(results) >= limit:
            break
        offset += page_size
    return results

def patch_lesson(lesson_id: str, new_url: str | None, legacy_url: str,
                 max_retries: int = 3) -> bool:
    """PATCH lesson in DB. new_url=None means null it out."""
    url = f"{SUPABASE_REST_URL}/lessons?id=eq.{lesson_id}"
    payload: dict = {"legacy_attachment_url": legacy_url}
    if new_url is None:
        payload["attachment_url"] = None
    else:
        payload["attachment_url"] = new_url
    for attempt in range(max_retries):
        status, body = curl_request("PATCH", url, headers=POSTGREST_HEADERS,
                                    json_data=payload, timeout=30)
        if status in (200, 204):
            return True
        if status == 429:
            time.sleep(10 * (attempt + 1))
            continue
        if status == 0:
            time.sleep(5 * (attempt + 1))
            continue
        print(f"  PATCH error {status}: {body[:200]}", flush=True)
        if attempt < max_retries - 1:
            time.sleep(3)
    return False

def patch_lesson_null_attachment(lesson_id: str, legacy_url: str,
                                  max_retries: int = 3) -> bool:
    """Null out attachment_url, save legacy."""
    url = f"{SUPABASE_REST_URL}/lessons?id=eq.{lesson_id}"
    payload = {"attachment_url": None, "legacy_attachment_url": legacy_url}
    for attempt in range(max_retries):
        status, body = curl_request("PATCH", url, headers=POSTGREST_HEADERS,
                                    json_data=payload, timeout=30)
        if status in (200, 204):
            return True
        if status in (429, 0):
            time.sleep(5 * (attempt + 1))
            continue
        print(f"  PATCH null error {status}: {body[:200]}", flush=True)
        if attempt < max_retries - 1:
            time.sleep(3)
    return False

# ---------------------------------------------------------------------------
# Storage upload
# ---------------------------------------------------------------------------

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
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".png": "image/png",
    }
    return mime_map.get(ext, "application/octet-stream")

def build_storage_key(lesson_id: str, filename: str) -> str:
    ext = Path(filename).suffix.lower() or ".bin"
    h = hashlib.md5(filename.encode()).hexdigest()[:10]
    return f"{lesson_id}_he-{h}{ext}"

def upload_to_storage(local_path: str, storage_key: str, content_type: str,
                      max_retries: int = 3) -> tuple[bool, str]:
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
        status, body = curl_request("POST", upload_url, headers=headers,
                                    data=file_data, timeout=120)
        if status in (200, 201):
            public_url = f"{SUPABASE_STORAGE_URL}/object/public/{SUPABASE_BUCKET}/{storage_key}"
            return True, public_url
        if status == 429:
            time.sleep(15 * (attempt + 1))
            continue
        print(f"  Storage upload error {status}: {body[:200]}", flush=True)
        if attempt < max_retries - 1:
            time.sleep(3)
    return False, ""

def upload_one_file(relative_path: str, lesson_id: str, dry_run: bool) -> tuple[bool, str]:
    """Download from Umbraco + upload to Supabase. Returns (ok, supabase_url)."""
    filename = urllib.parse.unquote(Path(relative_path).name)
    ext = Path(filename).suffix.lower()
    if ext not in KNOWN_FILE_EXTS:
        return False, f"bad_ext:{ext}"

    download_url = BNEYZION_BASE + relative_path
    storage_key = build_storage_key(lesson_id, filename)
    content_type = guess_content_type(filename)
    public_url = f"{SUPABASE_STORAGE_URL}/object/public/{SUPABASE_BUCKET}/{storage_key}"

    if dry_run:
        print(f"  [DRY RUN] Would upload {filename} → {storage_key}", flush=True)
        return True, public_url

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as f:
        tmp_path = f.name
    try:
        ok = curl_download(download_url, tmp_path, timeout=60)
        if not ok:
            return False, "download_failed"
        ok, url = upload_to_storage(tmp_path, storage_key, content_type)
        if not ok:
            return False, "upload_failed"
        return True, url
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

# ---------------------------------------------------------------------------
# Sub-task D: empty strings → null
# ---------------------------------------------------------------------------

def run_subtask_d(dry_run: bool) -> int:
    print("\n=== Sub-task D: Null empty-string attachment_urls ===", flush=True)
    rows = fetch_postgrest("attachment_url=eq.", select="id,attachment_url")
    print(f"  Found {len(rows)} rows with empty-string attachment_url", flush=True)

    count = 0
    for row in rows:
        lesson_id = row["id"]
        if dry_run:
            print(f"  [DRY RUN] Would null {lesson_id}", flush=True)
            count += 1
            continue
        # Save '' as legacy (preserves the original value, even though empty)
        ok = patch_lesson_null_attachment(lesson_id, legacy_url="")
        if ok:
            count += 1
        else:
            print(f"  FAIL to null {lesson_id}", flush=True)
        if count % 20 == 0:
            print(f"  D progress: {count}/{len(rows)}", flush=True)

    print(f"  D complete: {count}/{len(rows)} nulled", flush=True)
    return count

# ---------------------------------------------------------------------------
# Sub-task A: relative paths
# ---------------------------------------------------------------------------

def run_subtask_a(dry_run: bool, workers: int) -> dict:
    print("\n=== Sub-task A: Relative /media/ paths ===", flush=True)

    # 1. Fetch all relative-path lessons
    rows = fetch_postgrest(
        "attachment_url=like./media/*&attachment_url=not.ilike.http*",
        select="id,attachment_url,legacy_attachment_url"
    )
    print(f"  Found {len(rows)} rows with relative attachment_url", flush=True)

    # 2. Build dedup map: rel_path → supabase_url (from Phase 1 legacy matches)
    print("  Building dedup map from legacy_attachment_url...", flush=True)
    # Fetch done rows (have legacy that matches bneyzion.co.il + /media/)
    done_rows = fetch_postgrest(
        "legacy_attachment_url=ilike.https://www.bneyzion.co.il/media/*",
        select="attachment_url,legacy_attachment_url",
        limit=10000,
    )
    dedup_map: dict[str, str] = {}  # rel_path → supabase_url
    for r in done_rows:
        if r["legacy_attachment_url"] and r["attachment_url"] and "supabase" in r["attachment_url"]:
            # Extract relative path from legacy URL
            legacy = r["legacy_attachment_url"]
            if legacy.startswith("https://www.bneyzion.co.il"):
                rel = legacy[len("https://www.bneyzion.co.il"):]
                dedup_map[rel] = r["attachment_url"]
    print(f"  Dedup map: {len(dedup_map)} known relative paths with Supabase URLs", flush=True)

    state = load_state()
    done_ids = {d["lesson_id"] for d in state.get("done_a", [])}

    # Classify
    need_db_update_only = []  # rel_path known in dedup_map
    need_upload = []           # rel_path not in dedup_map
    upload_cache: dict[str, str] = dict(state.get("upload_cache", {}))

    for row in rows:
        if row["id"] in done_ids:
            continue
        rel = row["attachment_url"]
        if rel in dedup_map:
            need_db_update_only.append(row)
        else:
            need_upload.append(row)

    # Distinct paths needing upload
    upload_paths = list({r["attachment_url"] for r in need_upload})
    print(f"  DB-update-only: {len(need_db_update_only)} rows ({len(set(r['attachment_url'] for r in need_db_update_only))} distinct paths)", flush=True)
    print(f"  Need fresh upload: {len(need_upload)} rows ({len(upload_paths)} distinct paths)", flush=True)

    counters = {"db_only": 0, "uploaded": 0, "dedupe_reuse": 0, "error": 0, "total": len(rows) - len(done_ids)}
    c_lock = threading.Lock()
    start = time.time()

    def progress():
        processed = counters["db_only"] + counters["uploaded"] + counters["dedupe_reuse"] + counters["error"]
        elapsed = time.time() - start
        rate = processed / elapsed * 60 if elapsed > 0 else 0
        print(
            f"  A progress: {processed}/{counters['total']} | "
            f"db_only={counters['db_only']} uploaded={counters['uploaded']} "
            f"dedupe_reuse={counters['dedupe_reuse']} errors={counters['error']} | "
            f"{rate:.0f}/min",
            flush=True
        )

    # Phase A1: Upload the distinct paths that aren't in dedup_map yet
    print(f"\n  Phase A1: Uploading {len(upload_paths)} distinct new paths...", flush=True)
    for i, rel_path in enumerate(upload_paths):
        if rel_path in upload_cache:
            print(f"  A1 [{i+1}/{len(upload_paths)}] cache hit: {rel_path}", flush=True)
            continue

        # Use first lesson_id that has this path as the storage key holder
        representative = next(r for r in need_upload if r["attachment_url"] == rel_path)
        print(f"  A1 [{i+1}/{len(upload_paths)}] uploading: {rel_path}", flush=True)

        ok, url = upload_one_file(rel_path, representative["id"], dry_run)
        if ok:
            with _state_lock:
                upload_cache[rel_path] = url
                s = load_state()
                s["upload_cache"] = upload_cache
                save_state(s)
            print(f"    → {url[:60]}...", flush=True)
        else:
            print(f"    FAIL: {url}", flush=True)
            # Mark all lessons with this path as error
            with c_lock:
                affected = [r for r in need_upload if r["attachment_url"] == rel_path]
                counters["error"] += len(affected)
                s = load_state()
                for r in affected:
                    s["errors_a"].append({"lesson_id": r["id"], "rel_path": rel_path, "error": url})
                save_state(s)

    # Phase A2: DB updates — batch all rows
    def process_row_a(row: dict):
        lesson_id = row["id"]
        rel_path = row["attachment_url"]
        old_legacy = row.get("legacy_attachment_url")

        # Determine the Supabase URL to set
        if rel_path in dedup_map:
            supabase_url = dedup_map[rel_path]
            tag = "db_only"
        elif rel_path in upload_cache:
            supabase_url = upload_cache[rel_path]
            tag = "uploaded"
        else:
            # Upload failed for this path — skip
            with c_lock:
                counters["error"] += 1
            return

        # Set legacy = https://www.bneyzion.co.il + rel_path (unless already set)
        legacy_to_save = old_legacy if old_legacy else (BNEYZION_BASE + rel_path)

        if dry_run:
            with c_lock:
                counters[tag] += 1
            return

        ok = patch_lesson(lesson_id, supabase_url, legacy_to_save)
        with c_lock:
            if ok:
                counters[tag] += 1
                s = load_state()
                s["done_a"].append({"lesson_id": lesson_id, "rel_path": rel_path, "new_url": supabase_url})
                save_state(s)
            else:
                counters["error"] += 1
                s = load_state()
                s["errors_a"].append({"lesson_id": lesson_id, "rel_path": rel_path, "error": "db_patch_failed"})
                save_state(s)
            processed = counters["db_only"] + counters["uploaded"] + counters["dedupe_reuse"] + counters["error"]
            if processed % 50 == 0:
                progress()

    all_a_rows = need_db_update_only + need_upload
    print(f"\n  Phase A2: DB-updating {len(all_a_rows)} rows...", flush=True)

    if workers <= 1:
        for row in all_a_rows:
            process_row_a(row)
    else:
        import concurrent.futures
        chunk_size = max(1, len(all_a_rows) // workers)
        chunks = [all_a_rows[i:i+chunk_size] for i in range(0, len(all_a_rows), chunk_size)]
        with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as ex:
            futures = [ex.submit(lambda c: [process_row_a(r) for r in c], chunk) for chunk in chunks]
            concurrent.futures.wait(futures)

    progress()
    return counters

# ---------------------------------------------------------------------------
# Sub-task B: remaining absolute bneyzion.co.il/media/ paths
# ---------------------------------------------------------------------------

def run_subtask_b(dry_run: bool) -> dict:
    print("\n=== Sub-task B: Absolute bneyzion.co.il/media/ paths still unmigrated ===", flush=True)

    rows = fetch_postgrest(
        "attachment_url=ilike.https://www.bneyzion.co.il/media/*&legacy_attachment_url=is.null",
        select="id,attachment_url"
    )
    print(f"  Found {len(rows)} rows", flush=True)

    state = load_state()
    done_ids = {d["lesson_id"] for d in state.get("done_b", [])}

    counters = {"done": 0, "error": 0, "total": len(rows)}
    start = time.time()

    for i, row in enumerate(rows):
        lesson_id = row["id"]
        old_url = row["attachment_url"]

        if lesson_id in done_ids:
            counters["done"] += 1
            continue

        # Extract relative path from absolute URL
        rel_path = old_url.replace("https://www.bneyzion.co.il", "")
        filename = urllib.parse.unquote(Path(rel_path).name)
        ext = Path(filename).suffix.lower()

        print(f"  B [{i+1}/{len(rows)}] {old_url}", flush=True)

        if ext not in KNOWN_FILE_EXTS:
            print(f"    skip: no file ext ({ext})", flush=True)
            state["errors_b"].append({"lesson_id": lesson_id, "url": old_url, "error": f"bad_ext:{ext}"})
            save_state(state)
            counters["error"] += 1
            continue

        if dry_run:
            print(f"    [DRY RUN] Would download+upload {filename}", flush=True)
            counters["done"] += 1
            continue

        ok, result = upload_one_file(rel_path, lesson_id, dry_run=False)
        if not ok:
            print(f"    FAIL: {result}", flush=True)
            state["errors_b"].append({"lesson_id": lesson_id, "url": old_url, "error": result})
            save_state(state)
            counters["error"] += 1
            continue

        supabase_url = result
        ok = patch_lesson(lesson_id, supabase_url, old_url)
        if ok:
            print(f"    done → {supabase_url[:60]}...", flush=True)
            state["done_b"].append({"lesson_id": lesson_id, "old_url": old_url, "new_url": supabase_url})
            save_state(state)
            counters["done"] += 1
        else:
            print(f"    DB patch FAILED", flush=True)
            state["errors_b"].append({"lesson_id": lesson_id, "url": old_url, "error": "db_patch_failed"})
            save_state(state)
            counters["error"] += 1

    elapsed = time.time() - start
    print(f"  B complete: done={counters['done']} errors={counters['error']} in {elapsed:.1f}s", flush=True)
    return counters

# ---------------------------------------------------------------------------
# Final sanity query
# ---------------------------------------------------------------------------

def run_sanity_check():
    print("\n=== Final DB sanity check ===", flush=True)
    url = (
        f"{SUPABASE_REST_URL}/lessons"
        f"?select=attachment_url"
        f"&attachment_url=not.is.null"
        f"&limit=1"  # just check connectivity
    )
    # Use management API for aggregate
    import subprocess as sp
    import json

    SUPA_TOKEN = "sbp_539f16334f9c71e7fa4c036a2ab0a33fe8493c7a"
    SUPA_REF = "pzvmwfexeiruelwiujxn"
    query = """
SELECT
  COUNT(*) FILTER (WHERE attachment_url IS NULL) AS null_count,
  COUNT(*) FILTER (WHERE attachment_url = '') AS empty_count,
  COUNT(*) FILTER (WHERE attachment_url ILIKE '%supabase%') AS supabase_count,
  COUNT(*) FILTER (WHERE attachment_url ILIKE '%bneyzion.co.il/media/%') AS bneyzion_media_count,
  COUNT(*) FILTER (WHERE attachment_url ILIKE '%bneyzion.co.il%' AND attachment_url NOT ILIKE '%/media/%') AS bneyzion_page_count,
  COUNT(*) FILTER (WHERE attachment_url LIKE '/media/%') AS relative_count,
  COUNT(*) FILTER (WHERE attachment_url IS NOT NULL AND attachment_url != ''
                   AND attachment_url NOT ILIKE '%supabase%'
                   AND attachment_url NOT ILIKE '%bneyzion%'
                   AND attachment_url NOT LIKE '/media/%') AS other_count
FROM lessons;
"""
    payload = json.dumps({"query": query})
    cmd = [
        "curl", "-s", "--noproxy", "*",
        "-X", "POST",
        f"https://api.supabase.com/v1/projects/{SUPA_REF}/database/query",
        "-H", f"Authorization: Bearer {SUPA_TOKEN}",
        "-H", "Content-Type: application/json",
        "-d", payload,
    ]
    r = sp.run(cmd, capture_output=True, text=True, timeout=30)
    try:
        result = json.loads(r.stdout)
        if isinstance(result, list) and result:
            row = result[0]
            print(f"  null_count:          {row['null_count']}", flush=True)
            print(f"  empty_count:         {row['empty_count']}", flush=True)
            print(f"  supabase_count:      {row['supabase_count']}", flush=True)
            print(f"  bneyzion_media_count:{row['bneyzion_media_count']}", flush=True)
            print(f"  bneyzion_page_count: {row['bneyzion_page_count']}", flush=True)
            print(f"  relative_count:      {row['relative_count']}", flush=True)
            print(f"  other_count:         {row['other_count']}", flush=True)
        else:
            print(f"  Unexpected: {r.stdout[:300]}", flush=True)
    except:
        print(f"  Parse error: {r.stdout[:300]}", flush=True)

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Phase 2 migration")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--workers", type=int, default=3)
    parser.add_argument("--task", choices=["D", "A", "B", "ALL"], default="ALL")
    args = parser.parse_args()

    print("=== migrate_phase2.py ===", flush=True)
    print(f"Task: {args.task} | Workers: {args.workers} | Dry-run: {args.dry_run}", flush=True)

    results = {}

    if args.task in ("D", "ALL"):
        results["D"] = run_subtask_d(args.dry_run)

    if args.task in ("A", "ALL"):
        results["A"] = run_subtask_a(args.dry_run, args.workers)

    if args.task in ("B", "ALL"):
        results["B"] = run_subtask_b(args.dry_run)

    print("\n=== SUMMARY ===", flush=True)
    if "D" in results:
        print(f"D (empty→null):  {results['D']} rows nulled", flush=True)
    if "A" in results:
        a = results["A"]
        print(f"A (relative):    db_only={a.get('db_only',0)} uploaded={a.get('uploaded',0)} errors={a.get('error',0)} total={a.get('total',0)}", flush=True)
    if "B" in results:
        b = results["B"]
        print(f"B (abs media):   done={b.get('done',0)} errors={b.get('error',0)}", flush=True)

    run_sanity_check()


if __name__ == "__main__":
    main()
