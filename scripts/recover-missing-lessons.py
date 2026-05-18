#!/usr/bin/env python3
"""
recover-missing-lessons.py
Fetches 359 missing lessons from old bneyzion.co.il and inserts into Supabase.

Strategy:
- For each missing lesson, fetch the PARENT category page
- Find the specific row (tr[data-tooltip]) containing this lesson's title
- Extract media links from THAT row only (not the whole page)
- Insert into Supabase with correct series

Usage:
  SUPABASE_SERVICE_ROLE_KEY=... env -u HTTPS_PROXY -u HTTP_PROXY python3 scripts/recover-missing-lessons.py [--dry-run] [--limit=N]
"""

import json
import os
import re
import subprocess
import sys
import time
import unicodedata
from pathlib import Path
from urllib.parse import quote

SUPABASE_PAT = __import__("os").environ.get("SUPABASE_MANAGEMENT_API_TOKEN") or __import__("sys").exit("SUPABASE_MANAGEMENT_API_TOKEN env var required")
PROJECT_REF  = "pzvmwfexeiruelwiujxn"
OLD_SITE     = "https://www.bneyzion.co.il"
SCRIPTS_DIR  = Path(__file__).parent

DRY_RUN = "--dry-run" in sys.argv
LIMIT_ARG = next((a for a in sys.argv if a.startswith("--limit=")), None)
LIMIT = int(LIMIT_ARG.split("=")[1]) if LIMIT_ARG else None

# Cache for parent pages (avoid re-fetching same page for multiple lessons)
_page_cache = {}

# ============================================================
# Helpers
# ============================================================

def normalize(s):
    if not s: return ""
    s = s.strip()
    s = ''.join(c for c in s if not (0x0591 <= ord(c) <= 0x05C7))
    s = unicodedata.normalize('NFC', s)
    s = re.sub(r'\s+', ' ', s)
    s = re.sub(r'[""״\'"׳]', '', s)
    s = re.sub(r'[|–—]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip().lower()


def sql_query(q):
    result = subprocess.run([
        "curl", "--noproxy", "*", "-s",
        "-H", f"Authorization: Bearer {SUPABASE_PAT}",
        "-H", "Content-Type: application/json",
        "-X", "POST",
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
        "-d", json.dumps({"query": q})
    ], capture_output=True, text=True)
    try:
        data = json.loads(result.stdout)
        if isinstance(data, dict) and "message" in data:
            print(f"  SQL ERROR: {data['message'][:150]}", file=sys.stderr)
            return []
        return data
    except Exception as e:
        print(f"  JSON error: {e}: {result.stdout[:200]}", file=sys.stderr)
        return []


def fetch_html(url):
    """Fetch a URL and return HTML or None."""
    if url in _page_cache:
        return _page_cache[url]

    safe_url = url.replace('"', '%22')
    result = subprocess.run([
        "curl", "--noproxy", "*", "-sL", "--max-time", "30",
        "-A", "Mozilla/5.0", safe_url
    ], capture_output=True, text=True, errors='replace')
    html = result.stdout
    if not html or len(html) < 500:
        html = None
    elif "Page not found" in html and len(html) < 1000:
        html = None

    _page_cache[url] = html
    return html


def path_to_url(hebrew_path):
    """Encode Hebrew path for HTTP request."""
    parts = hebrew_path.split('/')
    return '/' + '/'.join(quote(p, safe='') for p in parts if p) + '/'


def find_row_for_lesson(html, title):
    """
    Find the specific tr[data-tooltip] row for a lesson by title.
    Returns dict with: icon, has_audio, has_pdf, has_doc, audio_url,
                       pdf_urls, doc_urls, snippet, rabbi
    """
    if not html:
        return None

    rows = re.findall(r'<tr[^>]+data-tooltip[^>]*>(.*?)</tr>', html, re.DOTALL)
    title_norm = normalize(title)
    title_short = title[:8]  # first 8 chars for partial matching

    for row in rows:
        # Get row's title
        title_m = re.search(r'<h3[^>]*>.*?title="([^"]+)".*?</h3>', row, re.DOTALL)
        if not title_m:
            title_m = re.search(r'<h3[^>]*>(.*?)</h3>', row, re.DOTALL)
        if not title_m:
            continue

        row_title = re.sub(r'<[^>]+>', '', title_m.group(1)).strip()
        row_title = row_title.replace('&quot;', '"').replace('&#39;', "'").replace('&amp;', '&')
        row_norm = normalize(row_title)

        # Match: exact or starts-with (handles truncated titles)
        if row_norm == title_norm or row_norm.startswith(title_norm[:10]):
            # Found the row — extract media
            # Icon
            icon_m = re.search(r'<i class="fa fa-([^"]+)"', row)
            icon = icon_m.group(1) if icon_m else ""

            # Audio
            audio_urls = re.findall(r'href="([^"]*\.(?:mp3|m4a|wav|ogg)[^"]*)"', row, re.I)
            if not audio_urls:
                # Also check for S3 URLs
                audio_urls = re.findall(r'(https?://s3[^"\'<>]+\.mp3[^"\'<>]*)', row, re.I)

            # PDF
            pdf_urls = re.findall(r'href="([^"]*\.pdf[^"]*)"', row, re.I)

            # Doc
            doc_urls = re.findall(r'href="([^"]*\.docx?[^"]*)"', row, re.I)

            # VP4 video
            vp4_m = re.search(r'embed\.vp4\.me/LandingPage,([^,]+),([^"\'.\s]+)', row, re.I)
            video_url = f"https://embed.vp4.me/LandingPage,{vp4_m.group(1)},{vp4_m.group(2)}.aspx" if vp4_m else None

            # YouTube
            yt_m = re.search(r'(?:youtube\.com/embed/|youtu\.be/)([a-zA-Z0-9_-]{11})', row, re.I)
            if yt_m and not video_url:
                video_url = f"https://www.youtube.com/watch?v={yt_m.group(1)}"

            # Snippet text
            snippet_m = re.search(r'<span>(.*?)</span>', row, re.DOTALL)
            snippet = re.sub(r'<[^>]+>', '', snippet_m.group(1)).strip()[:500] if snippet_m else ""

            # Rabbi link
            rabbi_m = re.search(r'<a href="/[^"]*\?rav=[^"]*" title="([^"]+)"', row)
            rabbi = rabbi_m.group(1).replace("שיעורי ", "").strip() if rabbi_m else ""

            return {
                "icon": icon,
                "has_audio": bool(audio_urls),
                "has_pdf": bool(pdf_urls),
                "has_doc": bool(doc_urls),
                "has_video": bool(video_url),
                "audio_url": audio_urls[0] if audio_urls else None,
                "video_url": video_url,
                "attachment_url": pdf_urls[0] if pdf_urls else (doc_urls[0] if doc_urls else None),
                "additional_attachments": (pdf_urls[1:] + doc_urls if len(pdf_urls) > 1 else doc_urls[1:] if doc_urls else []),
                "snippet": snippet,
                "rabbi": rabbi,
            }

    return None


# ============================================================
# Main
# ============================================================

def main():
    print("=== recover-missing-lessons.py ===")
    print(f"DRY_RUN: {DRY_RUN}")

    missing_path = SCRIPTS_DIR / "missing-lessons-to-recover.json"
    if not missing_path.exists():
        print("ERROR: missing-lessons-to-recover.json not found!", file=sys.stderr)
        sys.exit(1)

    with open(missing_path) as f:
        missing_lessons = json.load(f)

    if LIMIT:
        missing_lessons = missing_lessons[:LIMIT]

    print(f"Missing lessons to process: {len(missing_lessons)}")

    # Load series lookup
    print("\nLoading series from Supabase...")
    series_rows = sql_query("SELECT id, title, status FROM series LIMIT 5000;")
    series_by_title = {}
    for r in series_rows:
        key = normalize(r['title'])
        series_by_title[key] = r
        slug_key = r['title'].replace(' ', '-').replace('"', '').lower()
        series_by_title[slug_key] = r
    print(f"  Loaded {len(series_rows)} series")

    # Load rabbi lookup
    print("Loading rabbis from Supabase...")
    rabbi_rows = sql_query("SELECT id, name FROM rabbis LIMIT 1000;")
    rabbi_by_name = {}
    for r in rabbi_rows:
        key = normalize(r['name'])
        rabbi_by_name[key] = r
        # Also without "הרב" prefix
        clean = re.sub(r'^הרב\s+', '', r['name']).strip()
        rabbi_by_name[normalize(clean)] = r
    print(f"  Loaded {len(rabbi_rows)} rabbis")

    # Load existing titles
    print("Loading existing lesson titles...")
    existing_rows = sql_query("SELECT title FROM lessons LIMIT 20000;")
    existing_titles = {normalize(r['title']) for r in existing_rows}
    print(f"  Loaded {len(existing_titles)} existing titles")

    # Process
    inserted = 0
    skipped_exists = 0
    skipped_no_series = 0
    skipped_no_row = 0
    skipped_no_content = 0
    skipped_fetch_fail = 0
    errors = []
    log = []

    for i, lesson in enumerate(missing_lessons):
        title = lesson['old_title']
        url_path = lesson['old_url']

        print(f"\n[{i+1}/{len(missing_lessons)}] {title}")

        # Skip if exists
        title_key = normalize(title)
        if title_key in existing_titles:
            print(f"  SKIP: already exists")
            skipped_exists += 1
            log.append({"status": "exists", "title": title})
            continue

        # Find parent series from URL — try ancestor slugs from deepest to shallowest
        url_parts = [p for p in url_path.split('/') if p]
        # url_parts[-1] = lesson slug, url_parts[-2] = immediate parent, etc.
        candidate_slugs = [url_parts[i] for i in range(len(url_parts)-2, -1, -1)]

        series_id = None
        series_title = None
        matched_slug = None
        for parent_slug in candidate_slugs:
            for key in [
                normalize(parent_slug),
                normalize(parent_slug.replace('-', ' ')),
                parent_slug.lower()
            ]:
                if key in series_by_title:
                    series_id = series_by_title[key]['id']
                    series_title = series_by_title[key]['title']
                    matched_slug = parent_slug
                    break
            if series_id:
                break

        if not series_id:
            parent_slug = url_parts[-2] if len(url_parts) >= 2 else ""
            print(f"  SKIP: no series for '{parent_slug}' (tried {len(candidate_slugs)} ancestors)")
            skipped_no_series += 1
            log.append({"status": "no_series", "title": title, "parent": parent_slug, "tried": candidate_slugs})
            continue

        print(f"  Series: {series_title}")

        # Fetch the parent category page (NOT the individual lesson page)
        # Because the individual lesson page IS the category page with that lesson highlighted
        parent_parts = url_parts[:-1]
        parent_url = OLD_SITE + '/' + '/'.join(quote(p, safe='') for p in parent_parts) + '/'

        html = fetch_html(parent_url)
        if not html:
            print(f"  Fetch failed for parent: {parent_url[:80]}")
            skipped_fetch_fail += 1
            log.append({"status": "fetch_fail", "title": title, "url": parent_url})
            continue

        # Find row for this lesson
        row_data = find_row_for_lesson(html, title)
        if not row_data:
            # Try fetching the individual page
            individual_url = OLD_SITE + '/' + '/'.join(quote(p, safe='') for p in url_parts) + '/'
            html2 = fetch_html(individual_url)
            if html2 and html2 != html:
                row_data = find_row_for_lesson(html2, title)

        if not row_data:
            print(f"  SKIP: row not found on page")
            skipped_no_row += 1
            log.append({"status": "no_row", "title": title, "parent_url": parent_url})
            continue

        audio_url = row_data.get("audio_url")
        video_url = row_data.get("video_url")
        attachment_url = row_data.get("attachment_url")
        additional = row_data.get("additional_attachments", [])
        snippet = row_data.get("snippet", "")
        rabbi_name = row_data.get("rabbi", "")
        icon = row_data.get("icon", "")

        # Fix relative attachment URLs
        if attachment_url and attachment_url.startswith('/'):
            attachment_url = OLD_SITE + attachment_url

        has_content = bool(audio_url or video_url or attachment_url or snippet)
        if not has_content:
            print(f"  SKIP: no content (icon={icon})")
            skipped_no_content += 1
            log.append({"status": "no_content", "title": title})
            continue

        # Determine source_type
        if audio_url:
            source_type = 'audio'
        elif video_url:
            source_type = 'video'
        elif attachment_url:
            url_lower = attachment_url.lower()
            source_type = 'pdf' if '.pdf' in url_lower else 'text'
        else:
            source_type = 'text'

        # Find rabbi_id
        rabbi_id = None
        if rabbi_name:
            rabbi_key = normalize(rabbi_name)
            rabbi_clean = normalize(re.sub(r'^הרב\s+', '', rabbi_name).strip())
            for key in [rabbi_key, rabbi_clean]:
                if key in rabbi_by_name:
                    rabbi_id = rabbi_by_name[key]['id']
                    break

        print(f"  audio={bool(audio_url)}, video={bool(video_url)}, attach={bool(attachment_url)}, type={source_type}")
        if rabbi_id:
            print(f"  rabbi_id: {rabbi_id}")

        if not DRY_RUN:
            # Build INSERT
            def esc(s):
                return (s or '').replace("'", "''")

            content_val = f"'{esc(snippet)}'" if snippet else "NULL"
            audio_val = f"'{esc(audio_url)}'" if audio_url else "NULL"
            video_val = f"'{esc(video_url)}'" if video_url else "NULL"
            attach_val = f"'{esc(attachment_url)}'" if attachment_url else "NULL"
            add_val = "NULL"
            if additional:
                fixed_additional = [
                    (OLD_SITE + u) if u.startswith('/') else u
                    for u in additional
                ]
                # additional_attachments column is jsonb, not text[]
                import json as _json
                add_val = "'" + _json.dumps(fixed_additional, ensure_ascii=False).replace("'", "''") + "'::jsonb"
            rabbi_val = f"'{rabbi_id}'" if rabbi_id else "NULL"

            q = f"""
                INSERT INTO lessons (
                    title, series_id, rabbi_id,
                    audio_url, video_url, attachment_url,
                    additional_attachments, content, source_type,
                    status, audience_tags, views_count
                ) VALUES (
                    '{esc(title)}',
                    '{series_id}',
                    {rabbi_val},
                    {audio_val},
                    {video_val},
                    {attach_val},
                    {add_val},
                    {content_val},
                    '{source_type}',
                    'published',
                    ARRAY['general']::text[],
                    0
                )
                ON CONFLICT DO NOTHING
                RETURNING id;
            """
            result = sql_query(q)
            if result and result[0].get('id'):
                new_id = result[0]['id']
                print(f"  INSERTED: {new_id}")
                inserted += 1
                existing_titles.add(title_key)
                log.append({
                    "status": "inserted",
                    "title": title,
                    "id": new_id,
                    "series": series_title,
                    "source_type": source_type
                })
            else:
                print(f"  INSERT FAILED (conflict or error)")
                log.append({"status": "insert_fail", "title": title})
        else:
            print(f"  DRY_RUN: would insert as {source_type}")
            inserted += 1
            log.append({
                "status": "dry_run",
                "title": title,
                "series": series_title,
                "source_type": source_type,
                "audio_url": audio_url,
                "video_url": video_url,
                "attachment_url": attachment_url,
                "snippet": snippet[:100] if snippet else "",
            })

        # Light rate limiting
        time.sleep(0.15)

    # Save log
    log_path = SCRIPTS_DIR / "recover-missing-log.json"
    with open(log_path, 'w') as f:
        json.dump(log, f, ensure_ascii=False, indent=2)

    # Update lesson_count for all series
    if not DRY_RUN and inserted > 0:
        print("\nUpdating series lesson_count...")
        sql_query("""
            UPDATE series s
            SET lesson_count = (
                SELECT COUNT(*) FROM lessons l
                WHERE l.series_id = s.id AND l.status = 'published'
            );
        """)
        print("  Done.")

    print(f"\n{'='*60}")
    print(f"RECOVERY RESULTS")
    print(f"{'='*60}")
    print(f"Inserted:                {inserted}")
    print(f"Skipped (exists):        {skipped_exists}")
    print(f"Skipped (no series):     {skipped_no_series}")
    print(f"Skipped (row not found): {skipped_no_row}")
    print(f"Skipped (fetch failed):  {skipped_fetch_fail}")
    print(f"Skipped (no content):    {skipped_no_content}")
    print(f"Total:                   {len(missing_lessons)}")
    print(f"Log: {log_path}")


if __name__ == "__main__":
    main()
