#!/usr/bin/env python3
"""gap1: build old-site ground truth for the teachers wing (אגף מורים).

Crawls bneyzion.co.il /מאגר-עזרי-הלמידה/ (BFS over parent/series pages) plus
the 31 creator pages (/יוצרים/?rav=NAME), and extracts for every lesson:
title, page href, author (from .author / מאת column), parent series, media links.

Output: scripts/parity/reports/gap1-old-inventory-<ts>.json
Read-only with respect to DB. NetSpark: curl --noproxy '*'.
"""
import json
import re
import subprocess
import sys
import unicodedata
import urllib.parse
import html as H
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE = "https://www.bneyzion.co.il"
SECTION = "/מאגר-עזרי-הלמידה/"
STATE = "scripts/parity/audit_full_state.json"
WORKERS = 8


def fetch(path):
    url = BASE + urllib.parse.quote(path, safe="/?=&%")
    r = subprocess.run(["curl", "--noproxy", "*", "-sL", "--max-time", "60", url],
                       capture_output=True)
    return r.stdout.decode("utf-8", errors="replace")


def norm_path(href):
    href = H.unescape(href)
    href = urllib.parse.unquote(href)
    if href.startswith(BASE):
        href = href[len(BASE):]
    if not href.endswith("/") and "?" not in href and "." not in href.rsplit("/", 1)[-1]:
        href += "/"
    return href


def norm_he(s):
    s = H.unescape(s or "")
    s = "".join(c for c in s if not (0x0591 <= ord(c) <= 0x05C7))
    s = unicodedata.normalize("NFC", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


TR_RE = re.compile(r"<tr data-tooltip.*?</tr>", re.S)
TITLE_RE = re.compile(r'<h3><a[^>]*href="([^"]+)"[^>]*>([^<]+)</a>')
AUTHOR_RE = re.compile(r'\?rav=([^"&]+)"')
MEDIA_RE = re.compile(r'href="(/media/\d+/[^"]+)"')
COUNT_RE = re.compile(r"(\d+)\s*שיעורים")
BLOCK_RE = re.compile(r'class="lessonBlock(.*?)(?=class="lessonBlock|swiper-pagination|</body)', re.S)
SERIES_LINK_RE = re.compile(r'<a href="([^"]+)"[^>]*>\s*<div class="lessonBlock lessonSeriesBlock')


def parse_page(path, html):
    """Return (lessons, series_links). lessons: dicts with title/author/href/media/parent."""
    lessons = []
    series_links = set()
    body = html[html.find("<body"):] if "<body" in html else html

    # 1) table rows — authoritative: type | icon | title | author | len | download
    for row in TR_RE.findall(body):
        cells_type = "סדרה" if re.search(r"<td>\s*סדרה", row) else "שיעור"
        t = TITLE_RE.search(row)
        if not t:
            continue
        href = norm_path(t.group(1))
        title = norm_he(t.group(2))
        a = AUTHOR_RE.search(row)
        author = norm_he(urllib.parse.unquote(H.unescape(a.group(1)))) if a else None
        media = [norm_path(m) for m in MEDIA_RE.findall(row)]
        cnt = COUNT_RE.search(row)
        if cells_type == "סדרה":
            if href.startswith(SECTION):
                series_links.add(href)
            lessons.append({"kind": "series", "href": href, "title": title,
                            "author": author, "count": int(cnt.group(1)) if cnt else None,
                            "parent": path})
        else:
            lessons.append({"kind": "lesson", "href": href, "title": title,
                            "author": author, "media": media, "parent": path})

    # 2) swiper series blocks → discover series pages
    for m in SERIES_LINK_RE.finditer(body):
        href = norm_path(m.group(1))
        if href.startswith(SECTION):
            series_links.add(href)

    # 3) plain child links inside the section (category pages without tables)
    for m in re.finditer(r'href="(/מאגר-עזרי-הלמידה/[^"?#]+/)"', body):
        href = norm_path(m.group(1))
        series_links.add(href)

    return lessons, series_links


def main():
    with open(STATE) as f:
        state = json.load(f)
    children = state["children"]

    # seed: all known teachers-section parent pages + section roots
    queue = {k for k, v in children.items()
             if k.startswith(SECTION) and len(v) > 0}
    queue.add(SECTION)
    # known leaves — pages with 0 children we never need to fetch (their data
    # comes from the parent listing); we still allow fetching if discovered as series
    known_leaf = {k for k, v in children.items()
                  if k.startswith(SECTION) and len(v) == 0}

    creators_idx = fetch(SECTION + "יוצרים/")
    creators = []
    for l in re.findall(r'href="[^"]*יוצרים/\?rav=([^"&]+)"', creators_idx):
        name = norm_he(urllib.parse.unquote(H.unescape(l)))
        if name and name not in creators:
            creators.append(name)
    print(f"creators: {len(creators)}", flush=True)

    all_rows = []          # every parsed row
    fetched = set()
    skip_prefixes = (SECTION + "יוצרים/",)

    def should_fetch(p):
        if p in fetched:
            return False
        if not p.startswith(SECTION):
            return False
        if any(p.startswith(sp) and "?" not in p for sp in skip_prefixes):
            return False
        return True

    pending = {p for p in queue if should_fetch(p)}
    rounds = 0
    while pending and rounds < 6:
        rounds += 1
        batch = sorted(pending)
        pending = set()
        print(f"round {rounds}: fetching {len(batch)} pages", flush=True)
        with ThreadPoolExecutor(max_workers=WORKERS) as ex:
            futs = {ex.submit(fetch, p): p for p in batch}
            for fut in as_completed(futs):
                p = futs[fut]
                fetched.add(p)
                try:
                    html = fut.result()
                except Exception as e:
                    print(f"  ERR {p}: {e}", flush=True)
                    continue
                rows, series_links = parse_page(p, html)
                all_rows.append({"page": p, "rows": rows})
                for s in series_links:
                    # fetch newly discovered non-leaf series pages
                    if should_fetch(s) and s not in batch:
                        # only fetch if it can hold listings (skip known leaf lessons)
                        if s in known_leaf:
                            continue
                        pending.add(s)

    # creator pages (cross-check, 50-row cap acknowledged)
    creator_rows = {}
    def fetch_creator(name):
        html = fetch(SECTION + "יוצרים/?rav=" + name)
        rows, _ = parse_page("creator:" + name, html)
        return name, rows
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futs = [ex.submit(fetch_creator, c) for c in creators]
        for fut in as_completed(futs):
            name, rows = fut.result()
            creator_rows[name] = rows

    out = {"pages": all_rows, "creators": creator_rows,
           "fetched_count": len(fetched)}
    ts = sys.argv[1] if len(sys.argv) > 1 else "manual"
    path = f"scripts/parity/reports/gap1-old-inventory-{ts}.json"
    with open(path, "w") as f:
        json.dump(out, f, ensure_ascii=False)
    print(f"wrote {path}: {len(fetched)} pages, "
          f"{sum(len(p['rows']) for p in all_rows)} rows, "
          f"{len(creator_rows)} creators", flush=True)


if __name__ == "__main__":
    main()
