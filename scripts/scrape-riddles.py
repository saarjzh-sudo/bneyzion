#!/usr/bin/env python3
"""
Scrape missing riddle content from bneyzion.co.il old site.
Targets series c852edd8-d959-4c8d-bf7e-17b5881275fa (חידות לילדים - פרשת השבוע)

Usage:
  python3 scripts/scrape-riddles.py          # scrape and save to scripts/riddles-scraped.json
  python3 scripts/scrape-riddles.py --dry-run # just print first 2 parashiot

The old site structure for riddles:
  /מאגר-עזרי-הלמידה/תורה/{chumash}/פרשת-{name}/
Each page contains multiple sections (ראשון, שני, שלישי...) with questions and multiple-choice answers.
"""

import re
import json
import time
import sys
import urllib.request
import urllib.parse
from html.parser import HTMLParser

BASE_URL = "https://www.bneyzion.co.il"
SERIES_ID = "c852edd8-d959-4c8d-bf7e-17b5881275fa"

# 22 missing parashiot with their old-site URL path
MISSING_PARASHIOT = [
    # (parasha_name, url_path)
    ("ויצא",       "/מאגר-עזרי-הלמידה/תורה/בראשית/פרשת-ויצא/"),
    ("וישלח",      "/מאגר-עזרי-הלמידה/תורה/בראשית/פרשת-וישלח/"),
    ("וישב",       "/מאגר-עזרי-הלמידה/תורה/בראשית/פרשת-וישב/"),
    ("מקץ",        "/מאגר-עזרי-הלמידה/תורה/בראשית/פרשת-מקץ/"),
    ("ויגש",       "/מאגר-עזרי-הלמידה/תורה/בראשית/פרשת-ויגש/"),
    ("ויחי",       "/מאגר-עזרי-הלמידה/תורה/בראשית/פרשת-ויחי/"),
    ("שמות",       "/מאגר-עזרי-הלמידה/תורה/שמות/פרשת-שמות/"),
    ("וארא",       "/מאגר-עזרי-הלמידה/תורה/שמות/פרשת-וארא/"),
    ("בא",         "/מאגר-עזרי-הלמידה/תורה/שמות/פרשת-בא/"),
    ("בשלח",       "/מאגר-עזרי-הלמידה/תורה/שמות/פרשת-בשלח/"),
    ("יתרו",       "/מאגר-עזרי-הלמידה/תורה/שמות/פרשת-יתרו/"),
    ("משפטים",     "/מאגר-עזרי-הלמידה/תורה/שמות/פרשת-משפטים/"),
    ("תרומה",      "/מאגר-עזרי-הלמידה/תורה/שמות/פרשת-תרומה/"),
    ("כי תשא",     "/מאגר-עזרי-הלמידה/תורה/שמות/פרשת-כי-תשא/"),
    ("ויקהל",      "/מאגר-עזרי-הלמידה/תורה/שמות/פרשת-ויקהל/"),
    ("פקודי",      "/מאגר-עזרי-הלמידה/תורה/שמות/פרשת-פקודי/"),
    ("ויקרא",      "/מאגר-עזרי-הלמידה/תורה/ויקרא/פרשת-ויקרא/"),
    ("מצורע",      "/מאגר-עזרי-הלמידה/תורה/ויקרא/פרשת-מצורע/"),
    ("אחרי מות",   "/מאגר-עזרי-הלמידה/תורה/ויקרא/פרשת-אחרי-מות/"),
    ("במדבר",      "/מאגר-עזרי-הלמידה/תורה/במדבר/פרשת-במדבר/"),
    ("מסעי",       "/מאגר-עזרי-הלמידה/תורה/במדבר/פרשת-מסעי/"),
    ("נצבים",      "/מאגר-עזרי-הלמידה/תורה/דברים/פרשת-נצבים/"),
    # Note: וזאת הברכה not in the requested list from Saar's original message as separate,
    # but was mentioned. Adding it:
    ("וזאת הברכה", "/מאגר-עזרי-הלמידה/תורה/דברים/פרשת-וזאת-הברכה/"),
]


def fetch_url(url, max_retries=3):
    """Fetch a URL with retries, bypassing proxy."""
    import os
    # Remove proxy env vars
    for k in ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']:
        os.environ.pop(k, None)

    full_url = BASE_URL + url if url.startswith('/') else url
    # URL-encode Hebrew characters
    parsed = urllib.parse.urlparse(full_url)
    path_encoded = urllib.parse.quote(parsed.path, safe='/-_.~')
    full_url_encoded = parsed._replace(path=path_encoded).geturl()

    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(
                full_url_encoded,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                    'Accept': 'text/html,application/xhtml+xml',
                    'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
                }
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                return resp.read().decode('utf-8', errors='replace')
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(2)
            else:
                return None
    return None


def extract_riddle_content(html, parasha_name):
    """
    Extract riddle content from the old site HTML.

    The riddle pages have a main content div with the question text.
    We look for the section with חידות content specifically.
    Returns raw HTML of the riddle section, or None if not found.
    """
    if not html:
        return None, None

    # Strategy 1: Look for a section specifically about riddles
    # The pages have divs with class "field-item even" or similar containing the riddle text

    # Find content blocks — try multiple patterns
    content_patterns = [
        # Pattern for div.field-items or .umb-grid content
        r'<div[^>]+class="[^"]*field-item[^"]*"[^>]*>(.*?)</div>\s*</div>',
        # Pattern for article body
        r'<article[^>]*>(.*?)</article>',
        # Pattern for .content or #content
        r'<div[^>]+(?:id|class)="[^"]*content[^"]*"[^>]*>(.*?)</div>',
    ]

    # First look for riddle-specific blocks (ראשון, שני patterns = quiz questions)
    riddle_section_pattern = r'(?:<p[^>]*>|<div[^>]*>).*?(?:ראשון|שני|שלישי|רביעי).*?(?:</p>|</div>)'

    # Check if page even has riddle content
    if 'ראשון' not in html and 'שני' not in html:
        return None, "no_riddle_content"

    # Extract title from page
    title_match = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.DOTALL)
    page_title = title_match.group(1).strip() if title_match else ""
    page_title = re.sub(r'<[^>]+>', '', page_title).strip()

    # Strategy: find the main content area
    # Try to extract content between <div class="field-item"> and similar

    # Find all <p> tags with substantial content (the quiz questions)
    # The riddle text follows a pattern: bold section header + questions with options

    # Broad extraction: get everything in the main content div
    # Look for the zone that has "ראשון" and quiz content

    # Try to find the .umb-rte or .field-item block
    content_block = None

    # Pattern 1: umb-rte div
    m = re.search(r'<div[^>]+class="[^"]*umb-rte[^"]*"[^>]*>(.*?)</div>\s*(?:</div>|<div)', html, re.DOTALL | re.IGNORECASE)
    if m:
        content_block = m.group(1)

    if not content_block:
        # Pattern 2: field-items block
        m = re.search(r'<div[^>]+class="[^"]*field-items[^"]*"[^>]*>(.*?)</div>\s*</div>', html, re.DOTALL | re.IGNORECASE)
        if m:
            content_block = m.group(1)

    if not content_block:
        # Pattern 3: just grab everything between first <p>...<strong> (riddle pattern) and end of article
        # Find first paragraph with quiz-like content
        first_p = re.search(r'(<p[^>]*>.*?<strong[^>]*>.*?(?:ראשון|שני|שלישי).*?</strong>.*?</p>)', html, re.DOTALL | re.IGNORECASE)
        if first_p:
            start = html.index(first_p.group(1))
            # Find the end — look for next major section or footer
            end_markers = ['<footer', '</article', '<div class="sidebar', '<div id="sidebar', '</main']
            end = len(html)
            for marker in end_markers:
                pos = html.find(marker, start + 100)
                if pos != -1 and pos < end:
                    end = pos
            content_block = html[start:end]

    if not content_block:
        # Fallback: extract all <p> tags that contain quiz keywords
        paragraphs = re.findall(r'<p[^>]*>.*?</p>', html, re.DOTALL | re.IGNORECASE)
        relevant_ps = []
        in_riddle = False
        for p in paragraphs:
            text = re.sub(r'<[^>]+>', '', p).strip()
            if any(k in text for k in ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שביעי', 'מפטיר']):
                in_riddle = True
            if in_riddle and len(text) > 5:
                relevant_ps.append(p)
            # Stop after finding the תשובות section or a very long pause
            if in_riddle and ('תשובות' in text or 'תשובה' in text.lower()):
                relevant_ps.append(p)
                break
        if relevant_ps:
            content_block = '\n'.join(relevant_ps)

    if not content_block:
        return None, "extraction_failed"

    # Clean up the content block
    # Remove script/style tags
    content_block = re.sub(r'<script[^>]*>.*?</script>', '', content_block, flags=re.DOTALL)
    content_block = re.sub(r'<style[^>]*>.*?</style>', '', content_block, flags=re.DOTALL)
    # Remove nav/header/footer remnants
    content_block = re.sub(r'<nav[^>]*>.*?</nav>', '', content_block, flags=re.DOTALL)
    # Normalize whitespace
    content_block = re.sub(r'\n{3,}', '\n\n', content_block)
    content_block = content_block.strip()

    return content_block, page_title


def build_supabase_row(parasha_name, content_html, page_title):
    """
    Build the Supabase row dict for a riddle lesson.
    Matches the schema of existing lessons in series c852edd8.
    """
    # Title format matches existing: "חידות לילדים - פרשת X"
    title = f"חידות לילדים - פרשת {parasha_name}"
    description = f"חידות לילדים על פרשת {parasha_name} לפי סדר העולים לתורה"

    return {
        "series_id": SERIES_ID,
        "title": title,
        "description": description,
        "content": content_html,
        "status": "published",
        "source_type": "text",
        "rabbi_id": None,
        "audio_url": None,
        "video_url": None,
        "attachment_url": None,
        "duration": None,
    }


def main():
    dry_run = '--dry-run' in sys.argv
    output_path = '/Users/saarj/Downloads/saar-workspace/bneyzion/scripts/riddles-scraped.json'

    print(f"Starting riddle scrape — {len(MISSING_PARASHIOT)} parashiot to scrape")
    print(f"Dry run: {dry_run}")
    print()

    results = []
    failed = []

    for i, (parasha_name, url_path) in enumerate(MISSING_PARASHIOT):
        print(f"[{i+1}/{len(MISSING_PARASHIOT)}] Scraping פרשת {parasha_name}...")

        html = fetch_url(url_path)
        if not html:
            print(f"  FAIL: could not fetch {url_path}")
            failed.append({"parasha": parasha_name, "url": url_path, "reason": "fetch_failed"})
            continue

        content_html, page_title = extract_riddle_content(html, parasha_name)

        if not content_html:
            print(f"  SKIP: no riddle content found ({page_title})")
            failed.append({"parasha": parasha_name, "url": url_path, "reason": page_title or "no_content"})
            continue

        row = build_supabase_row(parasha_name, content_html, page_title)
        results.append({
            "parasha": parasha_name,
            "url": url_path,
            "page_title": page_title,
            "content_length": len(content_html),
            "row": row,
        })

        print(f"  OK: {len(content_html)} chars extracted")

        if dry_run and i >= 1:
            print(f"\n[DRY RUN] Stopping after 2 parashiot")
            break

        # Be polite to the server
        if not dry_run:
            time.sleep(0.5)

    print(f"\n=== Results ===")
    print(f"Scraped: {len(results)}")
    print(f"Failed/Skipped: {len(failed)}")

    if failed:
        print("\nFailed:")
        for f in failed:
            print(f"  {f['parasha']}: {f['reason']}")

    output = {
        "scraped_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "series_id": SERIES_ID,
        "total_scraped": len(results),
        "total_failed": len(failed),
        "results": results,
        "failed": failed,
    }

    if not dry_run:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        print(f"\nSaved to {output_path}")

    # Always print sample for Saar to review
    print(f"\n=== SAMPLE (first 2 parashiot) ===")
    for item in results[:2]:
        print(f"\nParasha: פרשת {item['parasha']}")
        print(f"Title: {item['row']['title']}")
        print(f"Description: {item['row']['description']}")
        print(f"Content ({item['content_length']} chars):")
        # Show first 500 chars of content
        print(item['row']['content'][:600])
        print("...")

    return results, failed


if __name__ == '__main__':
    main()
