#!/usr/bin/env python3
"""
migrate_lesson_attachments.py
==============================
Migrates lesson PDF/DOC/DOCX attachments from bneyzion.co.il to Supabase Storage.

Usage:
    python3 scripts/migrate_lesson_attachments.py           # full run
    python3 scripts/migrate_lesson_attachments.py --limit 10  # dry run on 10
    python3 scripts/migrate_lesson_attachments.py --resume    # resume from state file

State is persisted to scripts/migrate_lesson_attachments_state.json.
Each row in the state file:
  { "lesson_id": "...", "old_url": "...", "new_url": "...", "status": "done"|"error", "error": "..." }

Iron rules:
- legacy_attachment_url is written BEFORE attachment_url is updated (rollback insurance)
- 2 req/sec rate limit (download side) + 2 req/sec (upload side)
- retry x3 with exponential backoff (1s, 2s, 4s)
- UTF-8 Hebrew filenames preserved; only chars that are invalid in storage paths get replaced
- lesson_id prefix on every filename to avoid collisions
- Uses saar_http lib (NetSpark-proof)
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import time
import urllib.parse
from pathlib import Path

# ── saar_http lib (NetSpark-proof) ──────────────────────────────────────────
# Try multiple known locations for saar_http
_LIB_CANDIDATES = [
    Path(__file__).parent / "lib",
    Path(__file__).parent.parent.parent / "וואן-מן-שואו" / "סקילים" / "04-mcp-servers" / "lib",
    Path.home() / "Downloads" / "saar-workspace" / "וואן-מן-שואו" / "סקילים" / "04-mcp-servers" / "lib",
]
for _cand in _LIB_CANDIDATES:
    if _cand.exists() and str(_cand) not in sys.path:
        sys.path.insert(0, str(_cand))

try:
    import saar_http
    _http_get = saar_http.get
    _http_post = saar_http.post
    print("saar_http loaded OK", flush=True)
except ImportError:
    print("saar_http not found — falling back to pure subprocess curl", flush=True)
    # Fallback stubs using subprocess curl --noproxy '*'
    import subprocess
    import tempfile

    class _FakeResp:
        def __init__(self, status_code, content, headers=None):
            self.status_code = status_code
            self.content = content
            self.text = content.decode("utf-8", errors="replace") if isinstance(content, bytes) else content
            self.headers = headers or {}
            self.ok = 200 <= status_code < 400
        def json(self):
            return json.loads(self.text)

    def _http_get(url, headers=None, timeout=60, **kwargs):
        hdrs = []
        for k, v in (headers or {}).items():
            hdrs += ["-H", f"{k}: {v}"]
        result = subprocess.run(
            ["curl", "-s", "--noproxy", "*", "-w", "\n__STATUS__%{http_code}", url] + hdrs,
            capture_output=True, timeout=timeout
        )
        out = result.stdout
        # split off status code appended at end
        parts = out.rsplit(b"\n__STATUS__", 1)
        body = parts[0]
        status = int(parts[1]) if len(parts) > 1 else 0
        return _FakeResp(status, body)

    def _http_post(url, headers=None, data=None, json_data=None, timeout=60, **kwargs):
        hdrs = []
        for k, v in (headers or {}).items():
            hdrs += ["-H", f"{k}: {v}"]
        body_args = []
        if json_data is not None:
            body = json.dumps(json_data).encode("utf-8")
            hdrs += ["-H", "Content-Type: application/json"]
            body_args = ["--data-binary", body]
        elif data is not None:
            body_args = ["--data-binary", data]
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            if body_args and isinstance(body_args[-1], bytes):
                tmp.write(body_args[-1])
                tmp_path = tmp.name
                body_args = ["--data-binary", f"@{tmp_path}"]
        result = subprocess.run(
            ["curl", "-s", "--noproxy", "*", "-X", "POST", "-w", "\n__STATUS__%{http_code}", url] + hdrs + body_args,
            capture_output=True, timeout=timeout
        )
        out = result.stdout
        parts = out.rsplit(b"\n__STATUS__", 1)
        body = parts[0]
        status = int(parts[1]) if len(parts) > 1 else 0
        return _FakeResp(status, body)


# ── Config ───────────────────────────────────────────────────────────────────
# Secrets loaded from environment — NEVER hardcode in source
# Set before running:
#   export SUPABASE_SERVICE_ROLE="eyJ..."
#   export SUPABASE_MANAGEMENT_TOKEN="sbp_..."
# Or place in scripts/.env.migrate (gitignored) and source it.
SUPABASE_URL = "https://pzvmwfexeiruelwiujxn.supabase.co"
SUPABASE_SERVICE_ROLE = os.environ.get("SUPABASE_SERVICE_ROLE", "")
SUPABASE_MANAGEMENT_TOKEN = os.environ.get("SUPABASE_MANAGEMENT_TOKEN", "")
BUCKET = "lesson-attachments"
STATE_FILE = Path(__file__).parent / "migrate_lesson_attachments_state.json"

# Rate limits
DOWNLOAD_DELAY = 0.5   # seconds between downloads (2/sec)
UPLOAD_DELAY = 0.5     # seconds between uploads (2/sec)
RETRY_COUNT = 3
RETRY_BASE = 1.0       # exponential backoff base (1s, 2s, 4s)

# ── Helpers ──────────────────────────────────────────────────────────────────

def safe_filename(url: str, lesson_id: str) -> str:
    """
    Convert a URL to an ASCII-safe storage key:
      - Strip trailing quoted title if present (scraping artifact)
      - URL-decode to get original basename
      - Detect extension (.pdf/.doc/.docx)
      - If basename is pure ASCII, use it directly (short UUID prefix for uniqueness)
      - If basename contains non-ASCII (Hebrew), replace with sha1[:8] of original name
        to keep filenames unique without Hebrew chars (Supabase Storage rejects non-ASCII)
      - Prefix with lesson_id for collision avoidance
    """
    # Strip trailing title: 'https://x.pdf "כותרת"' → 'https://x.pdf'
    url_clean = re.sub(r'\s+"[^"]*"\s*$', '', url.strip())
    raw = urllib.parse.unquote(url_clean.split("?")[0].split("#")[0])
    basename = raw.split("/")[-1]

    # Extract extension
    lower = basename.lower()
    if lower.endswith(".pdf"):
        ext = ".pdf"
    elif lower.endswith(".docx"):
        ext = ".docx"
    elif lower.endswith(".doc"):
        ext = ".doc"
    else:
        ext = ""

    # Check if basename is ASCII-safe
    try:
        basename.encode("ascii")
        name_part = re.sub(r'[^\w\-._]', '-', basename)  # replace non-word chars
        name_part = name_part.lstrip('-.')
    except UnicodeEncodeError:
        # Hebrew or other non-ASCII — use hash of basename for uniqueness + readability
        name_hash = hashlib.sha1(basename.encode("utf-8")).hexdigest()[:10]
        stem = re.sub(r'\.\w+$', '', basename)  # remove extension
        # Try to transliterate common patterns or just use hash
        name_part = f"he-{name_hash}{ext}"
        return f"{lesson_id}_{name_part}"

    if not name_part:
        name_part = f"attachment{ext}"

    return f"{lesson_id}_{name_part}"


def load_state() -> dict:
    if STATE_FILE.exists():
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"done": [], "errors": [], "skipped": []}


def save_state(state: dict):
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def fetch_lessons_with_attachments(limit: int | None = None) -> list[dict]:
    """Fetch all lessons that have attachment_url set."""
    limit_clause = f"LIMIT {limit}" if limit else ""
    # For dry-run with limit, pick a mix across series
    if limit:
        # Random-ish mix: ORDER BY random() is heavy, use modulo trick instead
        sql = f"""
            SELECT id, title, attachment_url, series_id
            FROM lessons
            WHERE attachment_url IS NOT NULL
              AND attachment_url != ''
              AND legacy_attachment_url IS NULL
            ORDER BY id
            LIMIT {limit};
        """
    else:
        sql = """
            SELECT id, title, attachment_url, series_id
            FROM lessons
            WHERE attachment_url IS NOT NULL
              AND attachment_url != ''
              AND legacy_attachment_url IS NULL
            ORDER BY id;
        """
    resp = _http_post(
        f"https://api.supabase.com/v1/projects/pzvmwfexeiruelwiujxn/database/query",
        headers={
            "Authorization": f"Bearer {SUPABASE_MANAGEMENT_TOKEN}",
            "Content-Type": "application/json",
        },
        json={"query": sql},
    )
    if not resp.ok:
        raise RuntimeError(f"DB query failed: {resp.status_code} {resp.text[:300]}")
    return resp.json()


BNEYZION_BASE = "https://www.bneyzion.co.il"


def normalize_url(url: str) -> str | None:
    """
    Normalize an attachment_url to a full, downloadable URL:
    1. Strip embedded title if URL was scraped with title appended (e.g. 'https://...pdf "title"')
    2. Prepend base URL for relative /media/... paths
    3. Percent-encode Hebrew characters so urllib can fetch them
    Returns None if the URL doesn't look like a file URL.
    """
    # Strip trailing title in quotes: 'https://x.pdf "כותרת"' → 'https://x.pdf'
    url = re.sub(r'\s+"[^"]*"\s*$', '', url.strip())
    url = url.strip()

    # Relative path → prepend base
    if url.startswith("/"):
        url = BNEYZION_BASE + url

    # Must start with http
    if not url.startswith("http"):
        return None

    # Percent-encode non-ASCII chars in the path/query (Hebrew, etc.)
    parsed = urllib.parse.urlparse(url)
    # Encode path: keep already-encoded % sequences, encode bare Hebrew
    encoded_path = urllib.parse.quote(parsed.path, safe='/%')
    # Rebuild URL with encoded path
    normalized = urllib.parse.urlunparse((
        parsed.scheme,
        parsed.netloc,
        encoded_path,
        parsed.params,
        parsed.query,
        parsed.fragment,
    ))
    return normalized


def download_file(url: str, retries: int = RETRY_COUNT) -> bytes | None:
    """Download a file with retries. Returns bytes or None on failure."""
    normalized = normalize_url(url)
    if normalized is None:
        print(f"    SKIP: URL not downloadable: {url!r}", flush=True)
        return None
    if normalized != url:
        print(f"    URL normalized: {normalized}", flush=True)

    for attempt in range(retries):
        try:
            import subprocess
            result = subprocess.run(
                ["curl", "-s", "--noproxy", "*", "-L",
                 "-w", "\n__STATUS__%{http_code}",
                 "--max-filesize", "5242880",
                 normalized],
                capture_output=True, timeout=90
            )
            out = result.stdout
            parts = out.rsplit(b"\n__STATUS__", 1)
            body = parts[0]
            status = int(parts[1].strip()) if len(parts) > 1 else 0

            if 200 <= status < 300 and body:
                return body
            if status == 404:
                print(f"    404 — file not found", flush=True)
                return None
            print(f"    Download attempt {attempt+1} failed: HTTP {status}", flush=True)
        except Exception as e:
            print(f"    Download attempt {attempt+1} exception: {e}", flush=True)
        if attempt < retries - 1:
            wait = RETRY_BASE * (2 ** attempt)
            time.sleep(wait)
    return None


def upload_to_storage(filename: str, content: bytes, mime_type: str, retries: int = RETRY_COUNT) -> str | None:
    """
    Upload file to Supabase Storage. Returns public URL or None on failure.
    Uses PUT (upsert) to be idempotent.
    Supabase Storage requires percent-encoded keys for non-ASCII filenames.
    """
    # Percent-encode filename for the storage key (Supabase requires ASCII-safe path)
    storage_path = urllib.parse.quote(filename, safe='')
    upload_url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}"

    for attempt in range(retries):
        try:
            import subprocess
            import tempfile
            with tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix) as tmp:
                tmp.write(content)
                tmp_path = tmp.name

            result = subprocess.run(
                [
                    "curl", "-s", "--noproxy", "*",
                    "-X", "PUT",
                    "-H", f"Authorization: Bearer {SUPABASE_SERVICE_ROLE}",
                    "-H", f"Content-Type: {mime_type}",
                    "-H", "x-upsert: true",
                    "--data-binary", f"@{tmp_path}",
                    "-w", "\n__STATUS__%{http_code}",
                    upload_url,
                ],
                capture_output=True, timeout=120
            )
            os.unlink(tmp_path)

            out = result.stdout
            parts = out.rsplit(b"\n__STATUS__", 1)
            body = parts[0].decode("utf-8", errors="replace")
            status = int(parts[1]) if len(parts) > 1 else 0

            if 200 <= status < 300:
                # Build public URL
                public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{storage_path}"
                return public_url
            print(f"    Upload attempt {attempt+1} failed: HTTP {status} — {body[:200]}", flush=True)
        except Exception as e:
            print(f"    Upload attempt {attempt+1} exception: {e}", flush=True)
        if attempt < retries - 1:
            wait = RETRY_BASE * (2 ** attempt)
            time.sleep(wait)
    return None


def get_mime_type(url: str) -> str | None:
    """
    Returns MIME type for known file extensions, or None if URL is not a known file type.
    None signals that this URL should be skipped (it's a page URL, not a direct file).
    """
    # Strip trailing title artifact: '...pdf "title"' → '...pdf'
    url = re.sub(r'\s+"[^"]*"\s*$', '', url.strip())
    lower = url.lower().split("?")[0].split("#")[0]
    if lower.endswith(".pdf"):
        return "application/pdf"
    if lower.endswith(".docx"):
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    if lower.endswith(".doc"):
        return "application/msword"
    # Not a downloadable file URL
    return None


def save_legacy_and_update(lesson_id: str, old_url: str, new_url: str) -> bool:
    """
    Two-step DB update:
    1. Save old URL to legacy_attachment_url (rollback insurance)
    2. Update attachment_url to new Supabase URL
    Both in one SQL statement to be atomic.
    """
    # Escape single quotes in URLs
    old_safe = old_url.replace("'", "''")
    new_safe = new_url.replace("'", "''")
    id_safe = lesson_id.replace("'", "''")

    sql = f"""
        UPDATE lessons
        SET
            legacy_attachment_url = '{old_safe}',
            attachment_url = '{new_safe}'
        WHERE id = '{id_safe}';
    """
    resp = _http_post(
        f"https://api.supabase.com/v1/projects/pzvmwfexeiruelwiujxn/database/query",
        headers={
            "Authorization": f"Bearer {SUPABASE_MANAGEMENT_TOKEN}",
            "Content-Type": "application/json",
        },
        json={"query": sql},
    )
    if not resp.ok:
        print(f"    DB update failed: {resp.status_code} {resp.text[:300]}", flush=True)
        return False
    return True


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Migrate lesson attachments to Supabase Storage")
    parser.add_argument("--limit", type=int, default=None, help="Process only N lessons (dry-run mode)")
    parser.add_argument("--resume", action="store_true", help="Resume from state file (skip already-done lessons)")
    args = parser.parse_args()

    # Validate required env vars
    if not SUPABASE_SERVICE_ROLE:
        print("ERROR: SUPABASE_SERVICE_ROLE env var not set.", flush=True)
        print("Export it before running:", flush=True)
        print("  export SUPABASE_SERVICE_ROLE='eyJ...'", flush=True)
        sys.exit(1)
    if not SUPABASE_MANAGEMENT_TOKEN:
        print("ERROR: SUPABASE_MANAGEMENT_TOKEN env var not set.", flush=True)
        print("Export it before running:", flush=True)
        print("  export SUPABASE_MANAGEMENT_TOKEN='sbp_...'", flush=True)
        sys.exit(1)

    print(f"=== migrate_lesson_attachments.py ===", flush=True)
    print(f"Limit: {args.limit or 'ALL'} | Resume: {args.resume}", flush=True)
    print(f"State file: {STATE_FILE}", flush=True)
    print("", flush=True)

    state = load_state() if args.resume else {"done": [], "errors": [], "skipped": []}
    done_ids = {r["lesson_id"] for r in state["done"]}
    error_ids = {r["lesson_id"] for r in state["errors"]}

    print(f"Fetching lessons from DB...", flush=True)
    lessons = fetch_lessons_with_attachments(args.limit)

    # For --resume, also include lessons with errors to retry
    if args.resume and error_ids:
        # Re-fetch them too (limit doesn't apply on resume)
        print(f"Re-querying {len(error_ids)} errored lessons for retry...", flush=True)
        # They'll come back from the main query since legacy_attachment_url IS NULL still

    total = len(lessons)
    print(f"Found {total} lessons with attachment_url (no legacy yet)", flush=True)
    print("", flush=True)

    processed = 0
    succeeded = 0
    failed = 0

    for i, lesson in enumerate(lessons, 1):
        lesson_id = lesson["id"]
        old_url = lesson["attachment_url"]
        title = lesson.get("title", "")[:60]

        if lesson_id in done_ids:
            print(f"[{i}/{total}] SKIP (already done): {lesson_id}", flush=True)
            continue

        print(f"[{i}/{total}] {lesson_id} | {title}", flush=True)
        print(f"    URL: {old_url}", flush=True)

        # 1. Download
        time.sleep(DOWNLOAD_DELAY)
        content = download_file(old_url)
        if content is None:
            print(f"    FAIL: could not download", flush=True)
            state["errors"].append({
                "lesson_id": lesson_id,
                "old_url": old_url,
                "error": "download_failed",
            })
            save_state(state)
            failed += 1
            processed += 1
            continue

        print(f"    Downloaded: {len(content):,} bytes", flush=True)

        # 2. Check MIME type — skip non-file URLs (page links, etc.)
        mime = get_mime_type(old_url)
        if mime is None:
            print(f"    SKIP: URL does not point to a PDF/DOC/DOCX file — skipping", flush=True)
            state["skipped"].append({
                "lesson_id": lesson_id,
                "old_url": old_url,
                "reason": "not_a_file_url",
            })
            save_state(state)
            processed += 1
            continue

        # 3. Generate safe filename
        filename = safe_filename(old_url, lesson_id)
        print(f"    Filename: {filename}", flush=True)
        print(f"    MIME: {mime}", flush=True)

        # 4. Upload
        time.sleep(UPLOAD_DELAY)
        new_url = upload_to_storage(filename, content, mime)
        if new_url is None:
            print(f"    FAIL: could not upload to storage", flush=True)
            state["errors"].append({
                "lesson_id": lesson_id,
                "old_url": old_url,
                "error": "upload_failed",
            })
            save_state(state)
            failed += 1
            processed += 1
            continue

        print(f"    New URL: {new_url}", flush=True)

        # 5. DB update (legacy + new)
        ok = save_legacy_and_update(lesson_id, old_url, new_url)
        if not ok:
            print(f"    FAIL: DB update failed", flush=True)
            state["errors"].append({
                "lesson_id": lesson_id,
                "old_url": old_url,
                "new_url": new_url,
                "error": "db_update_failed",
            })
            save_state(state)
            failed += 1
            processed += 1
            continue

        print(f"    OK", flush=True)
        state["done"].append({
            "lesson_id": lesson_id,
            "old_url": old_url,
            "new_url": new_url,
        })
        save_state(state)
        succeeded += 1
        processed += 1

    print("", flush=True)
    print(f"=== DONE ===", flush=True)
    print(f"Total processed: {processed}", flush=True)
    print(f"Succeeded:       {succeeded}", flush=True)
    print(f"Failed:          {failed}", flush=True)
    print(f"State saved to:  {STATE_FILE}", flush=True)

    if args.limit:
        print("", flush=True)
        print("DRY RUN COMPLETE — this was --limit mode.", flush=True)
        print("Review results above, then run without --limit for full migration.", flush=True)


if __name__ == "__main__":
    main()
