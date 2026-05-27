#!/usr/bin/env python3
"""
Full Teachers Wing Scrape — 2026-05-27
Scrapes all creators + series from bneyzion.co.il/מאגר-עזרי-הלמידה/
Outputs: migrations/umbraco_full_scrape_2026_05_27.json

Run: env -u HTTPS_PROXY -u HTTP_PROXY python3 scripts/full-teachers-scrape-2026-05-27.py
"""

import json, time, subprocess, sys, os, re
from urllib.parse import unquote, urlencode, quote

FIRECRAWL_KEY = "fc-85c9d5413dbd41e692e68832e804f31d"
OLD_SITE = "https://www.bneyzion.co.il"
OUTPUT_PATH = "migrations/umbraco_full_scrape_2026_05_27.json"

# All 30 creators from the old site
CREATORS = [
    {"name": "אוריה כראדי", "entity_type": "content_creator"},
    {"name": "הרב אורי שטמלר", "entity_type": "rabbi"},
    {"name": "הרב אשי בלייכר", "entity_type": "rabbi"},
    {"name": "הרב בניה כהן", "entity_type": "rabbi"},
    {"name": "הרב גדי שר שלום", "entity_type": "rabbi"},
    {"name": "הרב דביר אפלבוים", "entity_type": "rabbi"},
    {"name": "הרב חסדאי בר אור", "entity_type": "rabbi"},
    {"name": "הרב ידידיה שילה", "entity_type": "rabbi"},
    {"name": "הרב יהודה בשושה", "entity_type": "rabbi"},
    {"name": "הרב יונתן לוי", "entity_type": "rabbi"},
    {"name": "הרב יורם אליהו", "entity_type": "rabbi"},
    {"name": "הרב יצחק עמראני", "entity_type": "rabbi"},
    {"name": "הרב מאיר גרשונזון", "entity_type": "rabbi"},
    {"name": "הרב מאיר הילביץ'", "entity_type": "rabbi"},
    {"name": "הרב מנחם אליהו", "entity_type": "rabbi"},
    {"name": "הרב נחום אריאל", "entity_type": "rabbi"},
    {"name": "הרב ניסים כהן", "entity_type": "rabbi"},
    {"name": "הרב עדי איצקוביץ'", "entity_type": "rabbi"},
    {"name": "הרב עמוס נתנאל", "entity_type": "rabbi"},
    {"name": "הרב עמירם אלבה", "entity_type": "rabbi"},
    {"name": "הרב עמנואל בן ארצי", "entity_type": "rabbi"},
    {"name": "הרב שלמה כץ", "entity_type": "rabbi"},
    {"name": "הרב שמעון לוי והרב נתן מולאיוף", "entity_type": "rabbi"},
    {"name": "הרב שמעון שוהם", "entity_type": "rabbi"},
    {"name": "ושננתם - אוצר התורה", "entity_type": "content_creator"},
    {"name": "ישקו העדרים", "entity_type": "content_creator"},
    {"name": "מחבר לא ידוע", "entity_type": "content_creator"},
    {"name": "מכון דעת סופרים", "entity_type": "content_creator"},
    {"name": "נתן מארגל", "entity_type": "content_creator"},
    {"name": "סידור שים שלום", "entity_type": "content_creator"},
    {"name": "תלמוד תורה מורשה", "entity_type": "content_creator"},
]

def firecrawl_scrape(url):
    """Call Firecrawl v2 scrape endpoint, return markdown or None."""
    payload = json.dumps({
        "url": url,
        "formats": ["markdown"],
        "onlyMainContent": True,
        "timeout": 30000
    })
    cmd = [
        "curl", "-s", "--noproxy", "*",
        "-X", "POST", "https://api.firecrawl.dev/v2/scrape",
        "-H", f"Authorization: Bearer {FIRECRAWL_KEY}",
        "-H", "Content-Type: application/json",
        "-d", payload
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        d = json.loads(result.stdout)
        if d.get("success"):
            return d["data"]["markdown"]
        else:
            print(f"  Firecrawl error: {d}", file=sys.stderr)
            return None
    except Exception as e:
        print(f"  Exception: {e}", file=sys.stderr)
        return None

def parse_series_from_markdown(md):
    """
    Parse series cards from markdown. Each card looks like:
    - itur image link
    - series title link
    - creator link
    - "N שיעורים"
    - page number
    Returns list of {title, url, creator, lesson_count, page}
    """
    series = []
    lines = md.split("\n")

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # Look for lesson count line: "N שיעורים"
        count_match = re.match(r'^(\d+)\s+שיעורים\s*$', line)
        if count_match:
            lesson_count = int(count_match.group(1))

            # Look backwards for series title and creator
            title = None
            url = None
            creator = None

            for j in range(i-1, max(i-15, -1), -1):
                prev_line = lines[j].strip()

                # Match: [series title](url "creator")
                title_match = re.search(r'\[([^\]]+)\]\((https://www\.bneyzion\.co\.il[^\)]+)\s+"[^"]*"\)', prev_line)
                if title_match and not title:
                    title = title_match.group(1).strip()
                    url = title_match.group(2).strip()

                # Match creator link: [creator name](url "שיעורי X")
                creator_match = re.search(r'\[([^\]]+)\]\(https://www\.bneyzion\.co\.il[^\)]+יוצרים[^\)]+\s+"שיעורי[^"]*"\)', prev_line)
                if creator_match and not creator:
                    creator = creator_match.group(1).strip()

            if title and url:
                series.append({
                    "title": title,
                    "url": url,
                    "creator": creator,
                    "lesson_count": lesson_count
                })

        i += 1

    return series

def scrape_creator_all_pages(creator_name):
    """Scrape all pages for a creator, return list of series."""
    encoded = quote(creator_name)
    base_url = f"{OLD_SITE}/מאגר-עזרי-הלמידה/יוצרים/?rav={encoded}"

    all_series = []
    page = 1

    while True:
        if page == 1:
            url = base_url
        else:
            url = f"{base_url}&p={page}"

        print(f"  Page {page}: {url[:80]}...")
        md = firecrawl_scrape(url)

        if not md:
            print(f"  No markdown for page {page}")
            break

        series = parse_series_from_markdown(md)

        if not series:
            # Check if there's more content by looking for pagination
            if f"עמוד {page+1}" in md or f">{page+1}<" in md or f"p={page+1}" in md:
                print(f"  No series parsed but pagination found, continuing...")
                page += 1
                time.sleep(2)
                continue
            else:
                if page == 1:
                    print(f"  WARNING: No series found on page 1!")
                break

        all_series.extend(series)
        print(f"  Found {len(series)} series on page {page} (total: {len(all_series)})")

        # Check for next page
        if f"p={page+1}" in md or f"עמוד {page+1}" in md:
            page += 1
            time.sleep(2)
        else:
            break

    return all_series


def scrape_series_lessons(series_url):
    """Scrape individual series page to get lesson list."""
    md = firecrawl_scrape(series_url)
    if not md:
        return []

    lessons = []
    lines = md.split("\n")

    # Pattern: lesson entries as links
    for line in lines:
        line = line.strip()
        # Match lesson links under the series
        lesson_match = re.search(r'\[([^\]]+)\]\((https://www\.bneyzion\.co\.il[^)]+)\)', line)
        if lesson_match:
            title = lesson_match.group(1).strip()
            url = lesson_match.group(2).strip()

            # Filter out navigation, media type, creator links
            if any(x in url for x in ["יוצרים", "נושאים", "ראשי", "mediaType"]):
                continue
            if any(x in title for x in ["ראשי", "סוג תוכן", "יוצרים", "כל הסוגים", "וידאו", "אודיו", "טקסט"]):
                continue
            if len(title) < 3:
                continue

            # Detect media type from URL
            media_type = "pdf"
            if "audio" in url.lower() or ".mp3" in url.lower():
                media_type = "audio"
            elif "video" in url.lower() or ".mp4" in url.lower():
                media_type = "video"

            lessons.append({
                "title": title,
                "url": url,
                "media_type": media_type
            })

    return lessons


def main():
    print("=== Full Teachers Wing Scrape 2026-05-27 ===")
    print(f"Scraping {len(CREATORS)} creators from {OLD_SITE}")
    print()

    os.makedirs("migrations", exist_ok=True)

    results = {
        "scraped_at": "2026-05-27",
        "creators": [],
        "total_series": 0,
        "total_lesson_count_from_site": 0,
    }

    for creator in CREATORS:
        name = creator["name"]
        entity_type = creator["entity_type"]

        print(f"\n[{entity_type.upper()}] {name}")

        series_list = scrape_creator_all_pages(name)

        total_lessons = sum(s["lesson_count"] for s in series_list)

        creator_result = {
            "name": name,
            "entity_type": entity_type,
            "series": series_list,
            "total_series": len(series_list),
            "total_lessons_on_site": total_lessons
        }

        results["creators"].append(creator_result)
        results["total_series"] += len(series_list)
        results["total_lesson_count_from_site"] += total_lessons

        print(f"  TOTAL: {len(series_list)} series, {total_lessons} lessons")

        # Save incrementally
        with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)

        time.sleep(1.5)

    print(f"\n=== DONE ===")
    print(f"Total creators: {len(results['creators'])}")
    print(f"Total series: {results['total_series']}")
    print(f"Total lessons (from site counts): {results['total_lesson_count_from_site']}")
    print(f"Output: {OUTPUT_PATH}")

    # Print summary table
    print("\n=== CREATOR SUMMARY ===")
    for c in sorted(results["creators"], key=lambda x: -x["total_lessons_on_site"]):
        print(f"{c['name']}: {c['total_series']} series, {c['total_lessons_on_site']} lessons")


if __name__ == "__main__":
    main()
