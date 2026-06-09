#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
step_a_old_inventory.py
========================
שלב A: בונה אינוונטר מלא של בראשית (ושאר ספרים) מהאתר הישן bneyzion.co.il.

2 מקורות:
  1. /מאגר-השיעורים-והמאמרים/ — שיעורים ציבוריים (SSR)
  2. /מאגר-עזרי-הלמידה/        — אגף המורים (SSR)

פלט: scripts/parity/reports/old-inventory-{book}-{date}.json

Usage:
    env -u HTTPS_PROXY -u HTTP_PROXY \
    SUPABASE_MANAGEMENT_API_TOKEN=sbp_... \
    python3 scripts/parity/step_a_old_inventory.py --book בראשית [--section main|teachers|both]
"""

from __future__ import annotations

import json
import re
import sys
import time
import argparse
from datetime import date
from pathlib import Path
from urllib.parse import quote, urljoin, urlparse

# Add parent to path for parity_engine
sys.path.insert(0, str(Path(__file__).parent))
from parity_engine import fetch_html, normalize_he, OLD_SITE

REPORTS_DIR = Path(__file__).parent / "reports"
REPORTS_DIR.mkdir(exist_ok=True)

# ============================================================
# Argument parsing
# ============================================================

parser = argparse.ArgumentParser(description="Build old-site inventory for a book")
parser.add_argument("--book", default="בראשית", help="Hebrew book name (default: בראשית)")
parser.add_argument("--section", default="both", choices=["main","teachers","both"],
                    help="Which section to crawl (default: both)")
parser.add_argument("--max-pages", type=int, default=200,
                    help="Max pages to crawl per section (safety limit)")
parser.add_argument("--output", default=None, help="Output JSON path (default: auto)")
args = parser.parse_args()

BOOK    = args.book
SECTION = args.section
TODAY   = date.today().isoformat().replace("-","")
OUT     = Path(args.output) if args.output else REPORTS_DIR / f"old-inventory-{BOOK}-{TODAY}.json"

# ============================================================
# URL encoding helper
# ============================================================

def encode_path(path: str) -> str:
    parts = path.strip('/').split('/')
    return '/' + '/'.join(quote(p, safe='') for p in parts if p) + '/'


# ============================================================
# HTML parsing helpers
# ============================================================

def extract_h1(html: str) -> str:
    m = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.DOTALL | re.I)
    if m:
        return re.sub(r'<[^>]+>', '', m.group(1)).strip()
    return ""


def extract_title_tag(html: str) -> str:
    m = re.search(r'<title[^>]*>(.*?)</title>', html, re.DOTALL | re.I)
    if m:
        raw = re.sub(r'<[^>]+>', '', m.group(1)).strip()
        # Strip " | בני ציון" suffix
        return re.sub(r'\s*[|–]\s*.*$', '', raw).strip()
    return ""


def extract_links_from_html(html: str, base_url: str, filter_path: str = "") -> list[str]:
    """Extract all <a href> links from page, optionally filter by path prefix."""
    links = re.findall(r'<a[^>]+href=["\']([^"\']+)["\']', html, re.I)
    result = []
    for lnk in links:
        if lnk.startswith('#') or lnk.startswith('mailto:') or lnk.startswith('javascript:'):
            continue
        # Resolve relative
        if lnk.startswith('/'):
            full = OLD_SITE + lnk
        elif lnk.startswith('http'):
            full = lnk
        else:
            full = urljoin(base_url, lnk)
        # Must be on old site
        if not full.startswith(OLD_SITE):
            continue
        if filter_path and filter_path not in full:
            continue
        # Normalise trailing slash
        if not full.endswith('/') and '.' not in full.split('/')[-1]:
            full = full + '/'
        if full not in result:
            result.append(full)
    return result


def extract_attachments(html: str) -> dict:
    """Extract all attachment URLs from page (PDF, DOC, audio, video)."""
    out = {"attachment_url": None, "audio_url": None, "video_url": None}
    # PDFs/DOCs — bneyzion.co.il/media/...
    pdf_m = re.search(r'href="(/media/[^"]+\.pdf)"', html, re.I)
    if pdf_m:
        out["attachment_url"] = OLD_SITE + pdf_m.group(1)
    doc_m = re.search(r'href="(/media/[^"]+\.docx?)"', html, re.I)
    if doc_m and not out["attachment_url"]:
        out["attachment_url"] = OLD_SITE + doc_m.group(1)
    # Audio
    audio_m = re.search(r'<(?:source|audio)[^>]+src=["\']([^"\']+\.mp3)["\']', html, re.I)
    if audio_m:
        url = audio_m.group(1)
        out["audio_url"] = OLD_SITE + url if url.startswith('/') else url
    # Video (YouTube)
    yt_m = re.search(r'(?:youtube\.com/embed/|youtu\.be/)([A-Za-z0-9_-]{11})', html)
    if yt_m:
        out["video_url"] = f"https://www.youtube.com/watch?v={yt_m.group(1)}"
    return out


# ============================================================
# Per-page row extractor (single lesson page)
# ============================================================

def extract_lesson_item(url: str, parent_url: str = "", section: str = "main") -> dict | None:
    html = fetch_html(url)
    if not html:
        return None
    h1    = extract_h1(html)
    title = h1 or extract_title_tag(html)
    if not title:
        return None
    atts = extract_attachments(html)
    return {
        "url":            url,
        "title":          title,
        "h1":             h1,
        "parent_url":     parent_url,
        "section":        section,
        **atts,
    }


# ============================================================
# Section crawler
# ============================================================

def crawl_section(root_url: str, book: str, section_tag: str, max_pages: int) -> list[dict]:
    """
    Recursively crawl a section URL (e.g. /מאגר-השיעורים-והמאמרים/בראשית/).
    Returns list of lesson dicts.
    """
    print(f"\n[{section_tag}] Crawling: {root_url}")
    html = fetch_html(root_url)
    if not html:
        print(f"  ERROR: could not fetch {root_url}")
        return []

    items: list[dict] = []
    visited: set[str] = {root_url}
    queue: list[tuple[str, str]] = []   # (url, parent_url)

    # Find all links under book path
    book_path_encoded = quote(book, safe='')
    section_filter    = urlparse(root_url).path

    # First: look for pagination / sub-category links
    sub_links = extract_links_from_html(html, root_url, filter_path=section_filter)
    for lnk in sub_links:
        if lnk not in visited:
            visited.add(lnk)
            queue.append((lnk, root_url))

    # Process queue (BFS, depth-limited by max_pages)
    page_count = 0
    while queue and page_count < max_pages:
        url, parent = queue.pop(0)
        page_count += 1
        time.sleep(0.15)   # polite crawl

        print(f"  [{page_count}] {url}")
        html = fetch_html(url)
        if not html:
            continue

        # Extract item data for this page
        item = extract_lesson_item(url, parent_url=parent, section=section_tag)
        if item and normalize_he(book) in normalize_he(item["title"] + " " + url):
            items.append(item)
        elif item:
            items.append(item)   # include anyway — filter later

        # Enqueue children
        child_links = extract_links_from_html(html, url, filter_path=section_filter)
        for lnk in child_links:
            if lnk not in visited:
                visited.add(lnk)
                queue.append((lnk, url))

    print(f"  [{section_tag}] Done: {len(items)} items from {page_count} pages")
    return items


# ============================================================
# Main-section crawl: /מאגר-השיעורים-והמאמרים/ + /פרשת-השבוע/
# ============================================================

def crawl_main(book: str, max_pages: int) -> list[dict]:
    items: list[dict] = []
    # Try both "parasha" style and "book" style URLs
    book_slug = quote(book, safe='')
    urls_to_try = [
        f"{OLD_SITE}/{quote('מאגר-השיעורים-והמאמרים', safe='')}/{book_slug}/",
        f"{OLD_SITE}/{quote('פרשת-השבוע', safe='')}/?book={book_slug}",
        f"{OLD_SITE}/{book_slug}/",
    ]
    for url in urls_to_try:
        html = fetch_html(url)
        if html and len(html) > 1000:
            batch = crawl_section(url, book, "main", max_pages)
            items.extend(batch)
            break
    return items


# ============================================================
# Teachers-section crawl: /מאגר-עזרי-הלמידה/
# ============================================================

def crawl_teachers(book: str, max_pages: int) -> list[dict]:
    book_slug = quote(book, safe='')
    # Try both encoded and direct
    urls_to_try = [
        f"{OLD_SITE}/{quote('מאגר-עזרי-הלמידה', safe='')}/{book_slug}/",
        f"{OLD_SITE}/{quote('teachers', safe='')}/{book_slug}/",
    ]
    items: list[dict] = []
    for url in urls_to_try:
        html = fetch_html(url)
        if html and len(html) > 1000:
            batch = crawl_section(url, book, "teachers", max_pages)
            items.extend(batch)
            break
    return items


# ============================================================
# Series-level extraction (category pages with lesson cards)
# ============================================================

def extract_lesson_cards_from_category(html: str, cat_url: str, section: str) -> list[dict]:
    """
    Many category pages list lesson cards (swiper-slide lessonBlock).
    Extract title + attachment from each card without visiting sub-pages.
    """
    items: list[dict] = []
    # lessonBlock pattern
    blocks = re.findall(
        r'<div class="[^"]*lessonBlock[^"]*">(.*?)</div>\s*</div>',
        html, re.DOTALL
    )
    for block in blocks:
        # Title
        h3_m = re.search(r'<h3[^>]*>(?:.*?title="([^"]+)".*?|([^<]+))</h3>', block, re.DOTALL)
        raw_title = ""
        if h3_m:
            raw_title = (h3_m.group(1) or h3_m.group(2) or "").strip()
        if not raw_title:
            continue
        raw_title = re.sub(r'&quot;', '"', raw_title)
        raw_title = re.sub(r'&#39;', "'", raw_title)
        raw_title = re.sub(r'&amp;', '&', raw_title)

        # Link
        link_m = re.search(r'<a[^>]+href=["\']([^"\']+)["\']', block)
        item_url = ""
        if link_m:
            href = link_m.group(1)
            item_url = OLD_SITE + href if href.startswith('/') else href

        # Attachment
        atts = {"attachment_url": None, "audio_url": None, "video_url": None}
        pdf_m = re.search(r'href="(/media/[^"]+\.pdf)"', block, re.I)
        if pdf_m:
            atts["attachment_url"] = OLD_SITE + pdf_m.group(1)
        doc_m = re.search(r'href="(/media/[^"]+\.docx?)"', block, re.I)
        if doc_m and not atts["attachment_url"]:
            atts["attachment_url"] = OLD_SITE + doc_m.group(1)

        items.append({
            "url":        item_url,
            "title":      raw_title,
            "h1":         "",
            "parent_url": cat_url,
            "section":    section,
            **atts,
        })

    # Also: tr[data-tooltip] table rows
    rows = re.findall(r'<tr[^>]+data-tooltip[^>]*>(.*?)</tr>', html, re.DOTALL)
    for row in rows:
        h_m = re.search(r'<h\d[^>]*>(.*?)</h\d>', row, re.DOTALL)
        if not h_m:
            continue
        raw_title = re.sub(r'<[^>]+>', '', h_m.group(1)).strip()
        if not raw_title:
            continue
        atts = {"attachment_url": None, "audio_url": None, "video_url": None}
        pdf_m = re.search(r'href="(/media/[^"]+\.pdf)"', row, re.I)
        if pdf_m:
            atts["attachment_url"] = OLD_SITE + pdf_m.group(1)
        link_m = re.search(r'href="([^"]+)"', row)
        item_url = ""
        if link_m:
            href = link_m.group(1)
            item_url = OLD_SITE + href if href.startswith('/') else href

        items.append({
            "url":        item_url,
            "title":      raw_title,
            "h1":         "",
            "parent_url": cat_url,
            "section":    section,
            **atts,
        })

    return items


# ============================================================
# Main entry point
# ============================================================

def main():
    print(f"=== שלב A: אינוונטר ישן — ספר {BOOK} ===")
    all_items: list[dict] = []

    if SECTION in ("main", "both"):
        main_items = crawl_main(BOOK, args.max_pages)
        print(f"  ציבורי (main): {len(main_items)} פריטים")
        all_items.extend(main_items)

    if SECTION in ("teachers", "both"):
        teacher_items = crawl_teachers(BOOK, args.max_pages)
        print(f"  מורים (teachers): {len(teacher_items)} פריטים")
        all_items.extend(teacher_items)

    # Deduplicate by URL
    seen_urls: set[str] = set()
    deduped: list[dict] = []
    for item in all_items:
        url = item.get("url", "")
        if url and url in seen_urls:
            continue
        seen_urls.add(url)
        deduped.append(item)

    print(f"\nסה\"כ (אחרי dedup): {len(deduped)} פריטים")

    OUT.write_text(json.dumps(deduped, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"נשמר: {OUT}")
    return deduped


if __name__ == "__main__":
    main()
