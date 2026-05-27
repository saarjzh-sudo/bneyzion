#!/usr/bin/env python3
"""
Firecrawl Deep Scrape — bneyzion Teachers Wing
2026-05-27

Collects every static page under /מאגר-עזרי-הלמידה/ using Firecrawl,
parses series + lesson rows, saves to JSON, then upserts to Supabase.

Run:
  cd /Users/srhlq/Downloads/saar-workspace/bneyzion
  env -u HTTPS_PROXY -u HTTP_PROXY python3 scripts/firecrawl_deep_scrape.py

Phase control via PHASE env var:
  PHASE=discover  — scrape URLs only, save to migrations/firecrawl_deep_scrape_2026_05_27/url_map.json
  PHASE=scrape    — scrape each URL, save raw markdown per page
  PHASE=parse     — parse all saved markdown, build series+lesson objects
  PHASE=upsert    — insert/update into Supabase
  PHASE=all       — run all 4 phases (default)
"""

import json, time, subprocess, sys, os, re, hashlib
from urllib.parse import unquote, quote, urlencode
from pathlib import Path
from datetime import datetime

# ── Config ────────────────────────────────────────────────────────────────────
FIRECRAWL_KEY = os.environ.get("FIRECRAWL_KEY", "")
SUPABASE_TOKEN = os.environ.get("SUPABASE_TOKEN", "")
PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "pzvmwfexeiruelwiujxn")
OLD_SITE = "https://www.bneyzion.co.il"
PHASE = os.environ.get("PHASE", "all")

BASE_DIR = Path("/Users/srhlq/Downloads/saar-workspace/bneyzion/migrations/firecrawl_deep_scrape_2026_05_27")
URL_MAP_PATH = BASE_DIR / "url_map.json"
RAW_DIR = BASE_DIR / "raw_pages"
PARSED_PATH = BASE_DIR / "parsed_data.json"
RESULTS_PATH = BASE_DIR / "results.json"

RAW_DIR.mkdir(parents=True, exist_ok=True)

# Rate limiting (Firecrawl free: 10 req/min = 6s between requests)
RATE_DELAY = 7  # seconds between Firecrawl calls

# ── Helpers ───────────────────────────────────────────────────────────────────

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


def firecrawl_scrape(url, formats=None, retry=2):
    """Call Firecrawl v2 scrape. Returns markdown str or None."""
    if formats is None:
        formats = ["markdown", "links"]
    payload = json.dumps({
        "url": url,
        "formats": formats,
        "onlyMainContent": False,
        "timeout": 45000
    })
    cmd = [
        "curl", "-s", "--noproxy", "*",
        "-X", "POST", "https://api.firecrawl.dev/v2/scrape",
        "-H", f"Authorization: Bearer {FIRECRAWL_KEY}",
        "-H", "Content-Type: application/json",
        "-d", payload
    ]
    for attempt in range(retry + 1):
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
            d = json.loads(result.stdout)
            if d.get("success"):
                return d["data"]
            else:
                err = d.get("error", str(d))
                log(f"  Firecrawl error (attempt {attempt+1}): {err[:120]}")
                if attempt < retry:
                    time.sleep(10)
        except Exception as e:
            log(f"  Exception (attempt {attempt+1}): {e}")
            if attempt < retry:
                time.sleep(10)
    return None


def supabase_query(sql):
    """Run SQL via Supabase Management API. Returns list of dicts."""
    payload = json.dumps({"query": sql})
    cmd = [
        "curl", "-s", "--noproxy", "*",
        "-X", "POST", f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
        "-H", f"Authorization: Bearer {SUPABASE_TOKEN}",
        "-H", "Content-Type: application/json",
        "-d", payload
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        return json.loads(result.stdout)
    except Exception as e:
        log(f"  Supabase error: {e}")
        return []


def url_to_slug(url):
    """Convert URL path to a safe filename slug."""
    path = url.replace(OLD_SITE, "").strip("/")
    path = unquote(path)
    return re.sub(r'[^\w֐-׿/-]', '_', path)[:80]


def url_hash(url):
    return hashlib.md5(url.encode()).hexdigest()[:8]


# ── Phase 1: Discover URLs ────────────────────────────────────────────────────

SEED_URLS = [
    f"{OLD_SITE}/%D7%9E%D7%90%D7%92%D7%A8-%D7%A2%D7%96%D7%A8%D7%99-%D7%94%D7%9C%D7%9E%D7%99%D7%93%D7%94/",
]

# These are the known category paths we need to cover
KNOWN_CATEGORY_PATHS = [
    "/%D7%9E%D7%90%D7%92%D7%A8-%D7%A2%D7%96%D7%A8%D7%99-%D7%94%D7%9C%D7%9E%D7%99%D7%93%D7%94/",
    "/%D7%9E%D7%90%D7%92%D7%A8-%D7%A2%D7%96%D7%A8%D7%99-%D7%94%D7%9C%D7%9E%D7%99%D7%93%D7%94/%D7%90%D7%99%D7%9A-%D7%9E%D7%9C%D7%9E%D7%93%D7%99%D7%9D-%D7%AA%D7%A0%D7%9A/",
    "/%D7%9E%D7%90%D7%92%D7%A8-%D7%A2%D7%96%D7%A8%D7%99-%D7%94%D7%9C%D7%9E%D7%99%D7%93%D7%94/%D7%AA%D7%95%D7%A8%D7%94/",
    "/%D7%9E%D7%90%D7%92%D7%A8-%D7%A2%D7%96%D7%A8%D7%99-%D7%94%D7%9C%D7%9E%D7%99%D7%93%D7%94/%D7%AA%D7%95%D7%A8%D7%94/%D7%91%D7%A8%D7%90%D7%A9%D7%99%D7%AA/",
    "/%D7%9E%D7%90%D7%92%D7%A8-%D7%A2%D7%96%D7%A8%D7%99-%D7%94%D7%9C%D7%9E%D7%99%D7%93%D7%94/%D7%AA%D7%95%D7%A8%D7%94/%D7%A9%D7%9E%D7%95%D7%AA/",
    "/%D7%9E%D7%90%D7%92%D7%A8-%D7%A2%D7%96%D7%A8%D7%99-%D7%94%D7%9C%D7%9E%D7%99%D7%93%D7%94/%D7%AA%D7%95%D7%A8%D7%94/%D7%95%D7%99%D7%A7%D7%A8%D7%90/",
    "/%D7%9E%D7%90%D7%92%D7%A8-%D7%A2%D7%96%D7%A8%D7%99-%D7%94%D7%9C%D7%9E%D7%99%D7%93%D7%94/%D7%AA%D7%95%D7%A8%D7%94/%D7%91%D7%9E%D7%93%D7%91%D7%A8/",
    "/%D7%9E%D7%90%D7%92%D7%A8-%D7%A2%D7%96%D7%A8%D7%99-%D7%94%D7%9C%D7%9E%D7%99%D7%93%D7%94/%D7%AA%D7%95%D7%A8%D7%94/%D7%93%D7%91%D7%A8%D7%99%D7%9D/",
]


def discover_urls():
    """
    Scrape seed pages and collect all /מאגר-עזרי-הלמידה/ URLs.
    Returns dict: {url: {'type': 'category'|'series'|'lesson', 'depth': int}}
    """
    log("=== Phase 1: Discover URLs ===")

    # Load existing map if present
    if URL_MAP_PATH.exists():
        existing = json.loads(URL_MAP_PATH.read_text())
        log(f"Loaded {len(existing)} existing URLs from map")
        return existing

    url_map = {}
    queue = list(SEED_URLS)
    visited = set()

    magar_prefix = f"{OLD_SITE}/%D7%9E%D7%90%D7%92%D7%A8"

    log(f"Starting discovery from {len(queue)} seeds...")

    while queue:
        url = queue.pop(0)
        if url in visited:
            continue
        if "?" in url or "#" in url:
            continue
        if not url.startswith(magar_prefix):
            continue

        visited.add(url)
        log(f"  Discovering: {unquote(url)}")

        data = firecrawl_scrape(url, formats=["links"])
        time.sleep(RATE_DELAY)

        if not data:
            continue

        links = data.get("links", [])
        for link in links:
            # Only follow magar links without query params
            if link.startswith(magar_prefix) and "?" not in link and "#" not in link:
                if link not in visited and link not in queue:
                    queue.append(link)

            # Also collect links to specific series/lesson pages
            if link not in url_map and link.startswith(magar_prefix):
                # Determine type based on depth
                path = unquote(link.replace(OLD_SITE, "")).strip("/")
                parts = [p for p in path.split("/") if p]
                depth = len(parts)

                if depth <= 2:
                    url_type = "category"
                elif depth == 3:
                    url_type = "subcategory"
                else:
                    url_type = "series_or_lesson"

                url_map[link] = {"type": url_type, "depth": depth, "path": path}

        log(f"  Found {len(url_map)} unique URLs so far")

    # Save
    URL_MAP_PATH.write_text(json.dumps(url_map, ensure_ascii=False, indent=2))
    log(f"Saved {len(url_map)} URLs to {URL_MAP_PATH}")
    return url_map


# ── Phase 2: Scrape Each Page ─────────────────────────────────────────────────

def scrape_all_pages(url_map):
    """Download markdown for each URL and save to raw_pages/."""
    log("=== Phase 2: Scrape Pages ===")

    urls_to_scrape = [u for u in url_map.keys() if "?" not in u and "#" not in u]
    log(f"Scraping {len(urls_to_scrape)} pages...")

    scraped = 0
    skipped = 0
    failed = 0

    for i, url in enumerate(urls_to_scrape):
        slug = url_hash(url)
        out_path = RAW_DIR / f"{slug}.json"

        if out_path.exists():
            skipped += 1
            continue

        log(f"  [{i+1}/{len(urls_to_scrape)}] {unquote(url)[-60:]}")

        data = firecrawl_scrape(url, formats=["markdown"])

        if data:
            out_data = {
                "url": url,
                "scraped_at": datetime.now().isoformat(),
                "markdown": data.get("markdown", ""),
                "metadata": data.get("metadata", {})
            }
            out_path.write_text(json.dumps(out_data, ensure_ascii=False, indent=2))
            scraped += 1
        else:
            failed += 1
            log(f"  FAILED: {url}")

        time.sleep(RATE_DELAY)

        # Progress checkpoint every 20 pages
        if (i + 1) % 20 == 0:
            log(f"  Progress: {scraped} scraped, {skipped} skipped, {failed} failed")

    log(f"Done scraping: {scraped} scraped, {skipped} already existed, {failed} failed")


# ── Phase 3: Parse All Pages ──────────────────────────────────────────────────

def extract_table_rows(md):
    """
    Parse the lesson/series table from markdown.
    Table format:
    | סוג מדיה | שם השיעור | מאת | אורך | להורדה |
    | --- | --- | --- | --- | --- |
    | סדרה |  | ### [Title](url) | [Creator](creator_url) | N שיעורים |  |
    | שיעור |  | ### [Title](url) | [Creator](creator_url) | duration |  |

    Returns list of {row_type, title, url, creator, creator_url, lesson_count_or_duration}
    """
    rows = []

    # Find the data table (after the header row)
    table_match = re.search(
        r'\| סוג מדיה \| שם השיעור.*?\n\| [- ]+ \|',
        md, re.DOTALL
    )
    if not table_match:
        return rows

    table_start = table_match.end()
    table_section = md[table_start:]

    # Split into lines and parse each row
    for line in table_section.split("\n"):
        line = line.strip()
        if not line.startswith("|"):
            continue
        if "| ---" in line:
            continue

        cells = [c.strip() for c in line.split("|")]
        if len(cells) < 4:
            continue

        row_type_raw = cells[1] if len(cells) > 1 else ""
        content_cell = cells[3] if len(cells) > 3 else ""
        creator_cell = cells[4] if len(cells) > 4 else ""
        detail_cell = cells[5] if len(cells) > 5 else ""

        row_type = ""
        if "סדרה" in row_type_raw:
            row_type = "series"
        elif "שיעור" in row_type_raw:
            row_type = "lesson"
        else:
            continue

        # Extract title + URL from ### [Title](url)
        title_match = re.search(r'###\s*\[([^\]]+)\]\(([^)]+)\)', content_cell)
        if not title_match:
            # Try plain link
            title_match = re.search(r'\[([^\]]+)\]\(([^)]+)\)', content_cell)

        if not title_match:
            continue

        title = title_match.group(1).strip()
        url = title_match.group(2).strip()
        # Remove title tooltip if present
        url = re.sub(r'\s+"[^"]*"$', '', url)

        # Extract creator
        creator = ""
        creator_url = ""
        creator_match = re.search(r'\[([^\]]+)\]\(([^)]+)\)', creator_cell)
        if creator_match:
            creator = creator_match.group(1).strip()
            creator_url = creator_match.group(2).strip()
            creator_url = re.sub(r'\s+"[^"]*"$', '', creator_url)

        # Extract lesson count or duration
        lesson_count = 0
        duration = ""
        count_match = re.search(r'(\d+)\s+שיעורים', detail_cell)
        if count_match:
            lesson_count = int(count_match.group(1))
        else:
            duration = detail_cell.strip()

        rows.append({
            "row_type": row_type,
            "title": title,
            "url": url if url.startswith("http") else f"{OLD_SITE}{url}",
            "creator": creator,
            "creator_url": creator_url,
            "lesson_count": lesson_count,
            "duration": duration
        })

    return rows


def parse_lesson_page(md, url):
    """
    Parse individual lesson page.
    Returns {title, description, creator, duration, audio_url, video_url, attachment_url}
    """
    result = {
        "url": url,
        "title": "",
        "description": "",
        "creator": "",
        "duration": "",
        "audio_url": "",
        "video_url": "",
        "attachment_url": ""
    }

    # Title: usually first H1 or H2
    title_match = re.search(r'^#{1,2}\s+(.+)$', md, re.MULTILINE)
    if title_match:
        result["title"] = title_match.group(1).strip()

    # Audio URL
    audio_match = re.search(r'(https?://s3[^\s"\'<>]+\.mp3)', md)
    if audio_match:
        result["audio_url"] = audio_match.group(1)

    # Video URL (vp4.me or YouTube)
    video_match = re.search(r'(https?://(?:embed\.vp4\.me|www\.youtube\.com|youtu\.be)[^\s"\'<>]+)', md)
    if video_match:
        result["video_url"] = video_match.group(1)

    # PDF attachment
    pdf_match = re.search(r'(https?://www\.bneyzion\.co\.il/media/[^\s"\'<>]+\.(?:pdf|docx?))', md, re.IGNORECASE)
    if pdf_match:
        result["attachment_url"] = pdf_match.group(1)

    return result


def parse_all_pages():
    """Load all saved markdown, extract series/lesson data."""
    log("=== Phase 3: Parse Pages ===")

    all_series = {}  # url -> series object
    all_lessons = {}  # url -> lesson object

    raw_files = list(RAW_DIR.glob("*.json"))
    log(f"Parsing {len(raw_files)} raw pages...")

    for i, raw_file in enumerate(raw_files):
        try:
            page_data = json.loads(raw_file.read_text())
        except Exception as e:
            log(f"  Error reading {raw_file}: {e}")
            continue

        url = page_data.get("url", "")
        md = page_data.get("markdown", "")

        if not md or len(md) < 100:
            continue

        # Determine page type from URL path
        path = unquote(url.replace(OLD_SITE, "")).strip("/")
        parts = [p for p in path.split("/") if p]

        # Category/listing pages: contain table rows
        rows = extract_table_rows(md)
        if rows:
            for row in rows:
                if row["row_type"] == "series":
                    series_url = row["url"]
                    if series_url not in all_series:
                        all_series[series_url] = {
                            "url": series_url,
                            "title": row["title"],
                            "creator": row["creator"],
                            "creator_url": row["creator_url"],
                            "lesson_count": row["lesson_count"],
                            "found_on": url,
                            "path_parts": parts,
                        }
                    else:
                        # Update lesson count if better
                        if row["lesson_count"] > all_series[series_url].get("lesson_count", 0):
                            all_series[series_url]["lesson_count"] = row["lesson_count"]

                elif row["row_type"] == "lesson":
                    lesson_url = row["url"]
                    if lesson_url not in all_lessons:
                        all_lessons[lesson_url] = {
                            "url": lesson_url,
                            "title": row["title"],
                            "creator": row["creator"],
                            "creator_url": row["creator_url"],
                            "duration": row["duration"],
                            "found_on": url,
                        }

        # Individual lesson page: extract media
        elif len(parts) >= 4:
            lesson_info = parse_lesson_page(md, url)
            if lesson_info["title"] or lesson_info["audio_url"]:
                if url not in all_lessons:
                    all_lessons[url] = lesson_info
                else:
                    # Enrich existing entry
                    for k in ["title", "audio_url", "video_url", "attachment_url"]:
                        if lesson_info[k] and not all_lessons[url].get(k):
                            all_lessons[url][k] = lesson_info[k]

        if (i + 1) % 50 == 0:
            log(f"  Parsed {i+1}/{len(raw_files)}: {len(all_series)} series, {len(all_lessons)} lessons found")

    parsed = {
        "parsed_at": datetime.now().isoformat(),
        "series_count": len(all_series),
        "lesson_count": len(all_lessons),
        "series": list(all_series.values()),
        "lessons": list(all_lessons.values())
    }

    PARSED_PATH.write_text(json.dumps(parsed, ensure_ascii=False, indent=2))
    log(f"Parsed: {len(all_series)} series, {len(all_lessons)} lessons → saved to {PARSED_PATH}")
    return parsed


# ── Phase 4: Upsert to Supabase ───────────────────────────────────────────────

def get_or_create_rabbi(name, entity_type="content_creator"):
    """Get existing rabbi by name or create new one. Returns ID."""
    # Check by exact name
    result = supabase_query(
        f"SELECT id FROM rabbis WHERE name = {json.dumps(name)} LIMIT 1;"
    )
    if result and isinstance(result, list) and result[0].get("id"):
        return result[0]["id"]

    # Try partial match
    result = supabase_query(
        f"SELECT id, name FROM rabbis WHERE name ILIKE {json.dumps('%' + name[:10] + '%')} LIMIT 3;"
    )
    if result and isinstance(result, list) and len(result) == 1:
        log(f"  Rabbi match by partial: '{name}' -> '{result[0]['name']}'")
        return result[0]["id"]

    # Create new
    slug = re.sub(r'[^\w]', '-', name.lower())[:60].strip('-')
    slug = re.sub(r'-+', '-', slug)
    # Add random suffix to avoid collision
    slug = f"{slug}-{url_hash(name)}"

    create_result = supabase_query(f"""
        INSERT INTO rabbis (name, slug, entity_type, lesson_count)
        VALUES ({json.dumps(name)}, {json.dumps(slug)}, {json.dumps(entity_type)}, 0)
        ON CONFLICT (slug) DO UPDATE SET name = {json.dumps(name)}
        RETURNING id;
    """)

    if create_result and isinstance(create_result, list) and create_result[0].get("id"):
        log(f"  Created rabbi: '{name}' id={create_result[0]['id']}")
        return create_result[0]["id"]

    return None


def get_or_create_series(series_data, rabbi_id):
    """Get or create series. Returns series ID."""
    title = series_data["title"]
    url = series_data["url"]

    # Check by source URL
    result = supabase_query(
        f"SELECT id FROM series WHERE source_url = {json.dumps(url)} LIMIT 1;"
    )
    if result and isinstance(result, list) and result[0].get("id"):
        return result[0]["id"]

    # Check by title + rabbi
    result = supabase_query(f"""
        SELECT id FROM series
        WHERE title = {json.dumps(title)} AND rabbi_id = {json.dumps(str(rabbi_id))}
        LIMIT 1;
    """)
    if result and isinstance(result, list) and result[0].get("id"):
        # Update source_url if missing
        supabase_query(f"""
            UPDATE series SET source_url = {json.dumps(url)}
            WHERE id = {json.dumps(str(result[0]['id']))} AND source_url IS NULL;
        """)
        return result[0]["id"]

    # Create new
    create_result = supabase_query(f"""
        INSERT INTO series (title, rabbi_id, source_url, status, audience_tags, lesson_count)
        VALUES (
            {json.dumps(title)},
            {json.dumps(str(rabbi_id))},
            {json.dumps(url)},
            'published',
            ARRAY['teachers'],
            {series_data.get('lesson_count', 0)}
        )
        RETURNING id;
    """)

    if create_result and isinstance(create_result, list) and create_result[0].get("id"):
        log(f"  Created series: '{title[:50]}' id={create_result[0]['id']}")
        return create_result[0]["id"]

    return None


def upsert_lesson(lesson_data, series_id, rabbi_id, position):
    """Upsert a lesson. Returns lesson ID or None."""
    title = lesson_data["title"]
    url = lesson_data["url"]

    if not title:
        return None

    # Check by source URL
    result = supabase_query(
        f"SELECT id, title FROM lessons WHERE source_url = {json.dumps(url)} LIMIT 1;"
    )
    if result and isinstance(result, list) and result[0].get("id"):
        existing_id = result[0]["id"]
        existing_title = result[0].get("title", "")

        # Fix placeholder title
        if re.match(r'^.+ — שיעור \d+$', existing_title) and title and not re.match(r'^.+ — שיעור \d+$', title):
            supabase_query(f"""
                UPDATE lessons SET title = {json.dumps(title)}
                WHERE id = {json.dumps(str(existing_id))};
            """)
            log(f"  Fixed title: '{existing_title}' -> '{title}'")

        # Enrich media URLs if missing
        updates = []
        for field in ["audio_url", "video_url", "attachment_url"]:
            val = lesson_data.get(field, "")
            if val:
                updates.append(f"{field} = COALESCE(NULLIF({field}, ''), {json.dumps(val)})")

        if updates:
            supabase_query(f"""
                UPDATE lessons SET {', '.join(updates)}
                WHERE id = {json.dumps(str(existing_id))};
            """)

        return existing_id

    # Create new
    audio_url = lesson_data.get("audio_url", "")
    video_url = lesson_data.get("video_url", "")
    attachment_url = lesson_data.get("attachment_url", "")
    duration = lesson_data.get("duration", "")

    source_type = "audio" if audio_url else ("video" if video_url else ("text" if attachment_url else "audio"))

    create_result = supabase_query(f"""
        INSERT INTO lessons (
            title, rabbi_id, series_id, source_url, source_type,
            audio_url, video_url, attachment_url, status, audience_tags,
            duration, position
        ) VALUES (
            {json.dumps(title)},
            {json.dumps(str(rabbi_id))},
            {json.dumps(str(series_id))},
            {json.dumps(url)},
            {json.dumps(source_type)},
            {json.dumps(audio_url) if audio_url else 'NULL'},
            {json.dumps(video_url) if video_url else 'NULL'},
            {json.dumps(attachment_url) if attachment_url else 'NULL'},
            'published',
            ARRAY['teachers'],
            {json.dumps(duration) if duration else 'NULL'},
            {position}
        )
        RETURNING id;
    """)

    if create_result and isinstance(create_result, list) and create_result[0].get("id"):
        return create_result[0]["id"]

    return None


def upsert_all(parsed_data):
    """Upsert series + lessons from parsed data into Supabase."""
    log("=== Phase 4: Upsert to Supabase ===")

    results = {
        "started_at": datetime.now().isoformat(),
        "series_created": 0,
        "series_existing": 0,
        "lessons_created": 0,
        "lessons_fixed": 0,
        "lessons_failed": 0,
        "errors": []
    }

    # Process series
    log(f"Processing {len(parsed_data['series'])} series...")
    for s in parsed_data["series"]:
        creator_name = s.get("creator", "")
        if not creator_name:
            continue

        # Get or create rabbi
        rabbi_id = get_or_create_rabbi(creator_name)
        if not rabbi_id:
            log(f"  WARN: Could not find/create rabbi '{creator_name}'")
            results["errors"].append(f"Rabbi not found: {creator_name}")
            continue

        # Get or create series
        series_id = get_or_create_series(s, rabbi_id)
        if not series_id:
            log(f"  WARN: Could not create series '{s['title'][:50]}'")
            results["errors"].append(f"Series creation failed: {s['title'][:50]}")
            continue

    # Fix placeholder titles
    log("Fixing placeholder titles...")
    placeholder_rows = supabase_query("""
        SELECT l.id, l.title, l.source_url
        FROM lessons l
        WHERE l.title ~ '^.+ — שיעור [0-9]+$'
        AND l.source_url IS NOT NULL
        LIMIT 200;
    """)

    log(f"Found {len(placeholder_rows) if isinstance(placeholder_rows, list) else 0} placeholder titles")

    if isinstance(placeholder_rows, list):
        for row in placeholder_rows:
            lesson_url = row.get("source_url", "")
            if not lesson_url:
                continue

            # Check if we have a raw page for this URL
            slug = url_hash(lesson_url)
            raw_path = RAW_DIR / f"{slug}.json"

            if raw_path.exists():
                try:
                    page_data = json.loads(raw_path.read_text())
                    md = page_data.get("markdown", "")
                    lesson_info = parse_lesson_page(md, lesson_url)

                    if lesson_info["title"] and lesson_info["title"] != row["title"]:
                        supabase_query(f"""
                            UPDATE lessons SET title = {json.dumps(lesson_info['title'])}
                            WHERE id = {json.dumps(str(row['id']))};
                        """)
                        log(f"  Fixed: '{row['title']}' -> '{lesson_info['title']}'")
                        results["lessons_fixed"] += 1
                except Exception as e:
                    log(f"  Error fixing title for {lesson_url}: {e}")
            else:
                # Need to scrape this page
                log(f"  Need scrape for: {lesson_url}")
                data = firecrawl_scrape(lesson_url)
                time.sleep(RATE_DELAY)
                if data:
                    raw_path.write_text(json.dumps({
                        "url": lesson_url,
                        "scraped_at": datetime.now().isoformat(),
                        "markdown": data.get("markdown", "")
                    }, ensure_ascii=False, indent=2))

                    lesson_info = parse_lesson_page(data.get("markdown", ""), lesson_url)
                    if lesson_info["title"] and lesson_info["title"] != row["title"]:
                        supabase_query(f"""
                            UPDATE lessons SET title = {json.dumps(lesson_info['title'])}
                            WHERE id = {json.dumps(str(row['id']))};
                        """)
                        log(f"  Fixed: '{row['title']}' -> '{lesson_info['title']}'")
                        results["lessons_fixed"] += 1

    results["finished_at"] = datetime.now().isoformat()
    RESULTS_PATH.write_text(json.dumps(results, ensure_ascii=False, indent=2))
    log(f"Upsert complete: {results}")
    return results


# ── Targeted ושננתם Scrape ────────────────────────────────────────────────────

WASHNANTAM_SERIES_URLS = [
    # These are the known static category pages for ושננתם content
    "https://www.bneyzion.co.il/%D7%9E%D7%90%D7%92%D7%A8-%D7%A2%D7%96%D7%A8%D7%99-%D7%94%D7%9C%D7%9E%D7%99%D7%93%D7%94/%D7%AA%D7%95%D7%A8%D7%94/%D7%91%D7%A8%D7%90%D7%A9%D7%99%D7%AA/%D7%93%D7%A4%D7%99-%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%91%D7%A8%D7%90%D7%A9%D7%99%D7%AA/",
    "https://www.bneyzion.co.il/%D7%9E%D7%90%D7%92%D7%A8-%D7%A2%D7%96%D7%A8%D7%99-%D7%94%D7%9C%D7%9E%D7%99%D7%93%D7%94/%D7%AA%D7%95%D7%A8%D7%94/%D7%A9%D7%9E%D7%95%D7%AA/%D7%93%D7%A4%D7%99-%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%A9%D7%9E%D7%95%D7%AA/",
    "https://www.bneyzion.co.il/%D7%9E%D7%90%D7%92%D7%A8-%D7%A2%D7%96%D7%A8%D7%99-%D7%94%D7%9C%D7%9E%D7%99%D7%93%D7%94/%D7%AA%D7%95%D7%A8%D7%94/%D7%95%D7%99%D7%A7%D7%A8%D7%90/%D7%93%D7%A4%D7%99-%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%95%D7%99%D7%A7%D7%A8%D7%90/",
    "https://www.bneyzion.co.il/%D7%9E%D7%90%D7%92%D7%A8-%D7%A2%D7%96%D7%A8%D7%99-%D7%94%D7%9C%D7%9E%D7%99%D7%93%D7%94/%D7%AA%D7%95%D7%A8%D7%94/%D7%91%D7%9E%D7%93%D7%91%D7%A8/%D7%93%D7%A4%D7%99-%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%91%D7%9E%D7%93%D7%91%D7%A8/",
    "https://www.bneyzion.co.il/%D7%9E%D7%90%D7%92%D7%A8-%D7%A2%D7%96%D7%A8%D7%99-%D7%94%D7%9C%D7%9E%D7%93%D7%94/%D7%AA%D7%95%D7%A8%D7%94/%D7%93%D7%91%D7%A8%D7%99%D7%9D/%D7%93%D7%A4%D7%99-%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%93%D7%91%D7%A8%D7%99%D7%9D/",
]

def scrape_washnantam_targeted():
    """
    Targeted scrape for ושננתם - אוצר התורה.
    The creator has content in 'דפי עבודה' subcategories per book.
    """
    log("=== Targeted: ושננתם - אוצר התורה ===")

    # Get existing ושננתם rabbi IDs
    result = supabase_query("SELECT id, name FROM rabbis WHERE name ILIKE '%ושננתם%';")
    if isinstance(result, list):
        for r in result:
            log(f"  DB: {r['name']} id={r['id']}")

    all_rows = []

    for url in WASHNANTAM_SERIES_URLS:
        slug = url_hash(url)
        raw_path = RAW_DIR / f"{slug}.json"

        if raw_path.exists():
            page_data = json.loads(raw_path.read_text())
            md = page_data.get("markdown", "")
        else:
            log(f"  Scraping: {unquote(url)[-60:]}")
            data = firecrawl_scrape(url)
            time.sleep(RATE_DELAY)
            if not data:
                continue
            md = data.get("markdown", "")
            raw_path.write_text(json.dumps({
                "url": url, "markdown": md, "scraped_at": datetime.now().isoformat()
            }, ensure_ascii=False, indent=2))

        rows = extract_table_rows(md)
        washnantam_rows = [r for r in rows if "ושננתם" in r.get("creator", "")]
        log(f"  Found {len(washnantam_rows)} ושננתם rows in {unquote(url)[-40:]}")

        for row in washnantam_rows:
            row["found_on"] = url
            all_rows.append(row)

    log(f"Total ושננתם rows: {len(all_rows)}")
    return all_rows


# ── Count Verification ────────────────────────────────────────────────────────

def verify_counts():
    """Query DB and compare with old site targets."""
    log("=== Phase 5: Verification ===")

    result = supabase_query("""
        SELECT
            r.name as creator_name,
            r.entity_type,
            COUNT(DISTINCT s.id) as series_count,
            COUNT(DISTINCT l.id) as lesson_count
        FROM rabbis r
        LEFT JOIN series s ON s.rabbi_id = r.id AND s.audience_tags @> ARRAY['teachers']
        LEFT JOIN lessons l ON l.series_id = s.id
        WHERE r.entity_type = 'content_creator'
        GROUP BY r.id, r.name, r.entity_type
        ORDER BY lesson_count DESC;
    """)

    log("\n=== Content Creators — Teachers Wing ===")
    log(f"{'Creator':<45} {'Series':>8} {'Lessons':>8}")
    log("-" * 65)

    total_series = 0
    total_lessons = 0

    if isinstance(result, list):
        for row in result:
            name = row.get("creator_name", "")[:44]
            sc = row.get("series_count", 0)
            lc = row.get("lesson_count", 0)
            total_series += sc
            total_lessons += lc
            log(f"{name:<45} {sc:>8} {lc:>8}")

    log("-" * 65)
    log(f"{'TOTAL':<45} {total_series:>8} {total_lessons:>8}")

    # Overall teachers wing
    overall = supabase_query("""
        SELECT
            COUNT(DISTINCT s.id) as series_count,
            COUNT(DISTINCT l.id) as lesson_count
        FROM series s
        LEFT JOIN lessons l ON l.series_id = s.id
        WHERE s.audience_tags @> ARRAY['teachers'];
    """)

    if isinstance(overall, list) and overall:
        log(f"\nTotal teachers wing: {overall[0].get('series_count')} series, {overall[0].get('lesson_count')} lessons")

    # Placeholder count
    placeholders = supabase_query("""
        SELECT COUNT(*) as count FROM lessons
        WHERE title ~ '^.+ — שיעור [0-9]+$';
    """)
    if isinstance(placeholders, list) and placeholders:
        log(f"Remaining placeholder titles: {placeholders[0].get('count', 'unknown')}")

    return result


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    log(f"Starting Firecrawl Deep Scrape — Phase={PHASE}")
    log(f"Output dir: {BASE_DIR}")

    if PHASE in ("discover", "all"):
        url_map = discover_urls()
        log(f"URL map: {len(url_map)} entries")

    if PHASE in ("scrape", "all"):
        if not URL_MAP_PATH.exists():
            log("ERROR: url_map.json not found. Run PHASE=discover first.")
            sys.exit(1)
        url_map = json.loads(URL_MAP_PATH.read_text())
        scrape_all_pages(url_map)

    if PHASE in ("parse", "all"):
        parsed_data = parse_all_pages()
        log(f"Parsed: {parsed_data['series_count']} series, {parsed_data['lesson_count']} lessons")

    if PHASE in ("upsert", "all"):
        if not PARSED_PATH.exists():
            log("ERROR: parsed_data.json not found. Run PHASE=parse first.")
            sys.exit(1)
        parsed_data = json.loads(PARSED_PATH.read_text())
        upsert_all(parsed_data)

    if PHASE == "washnantam":
        rows = scrape_washnantam_targeted()
        out_path = BASE_DIR / "washnantam_rows.json"
        out_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2))
        log(f"Saved {len(rows)} rows to {out_path}")

    if PHASE == "verify":
        verify_counts()

    if PHASE == "all":
        verify_counts()

    log("Done.")


if __name__ == "__main__":
    main()
