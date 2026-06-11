#!/usr/bin/env python3
"""1:1 parity — scrape ordered item-lists for public TREE pages of the old site.

Scope (top-level sections from the FIRST sideNav of old_home_20260611.html):
  - נביאים (all 21 books incl the 12 of תרי עשר as individual book pages)
  - מועדים
  - all remaining root public sections NOT handled elsewhere:
    נושאים-כלליים-בתנך, הפטרות, ימי-עיון-בתנך,
    כלי-עזר-טבלאות-זמני-המאורעות-ומפות, פרוייקט-התנך-המוקלט-מתעדכן, ליווי-תתים
  Excluded per task: איך-לומדים-תנך, תורה, כתובים, ניווט-באתר-לפי-ספר-ופרק,
  פרשת-השבוע, נושאים (tags tab), רבנים (rabbis tab).

Selectors documented (inspected live 11.6.2026):
  - Listing pages render BOTH a swiper card view and a table view of the same
    items; the TABLE is the more complete one (שופטים: 58 rows vs 45 cards).
  - Table row: <tr data-tooltip ...> with cells:
      td1 = type (שיעור / סדרה), td2 = icon, td3 = <h3><a href title>TITLE</a></h3>,
      td4 = author <a href="...רבנים?rav=NAME">NAME</a>, td5 = duration / "N שיעורים",
      td6 = <div class="lessonLinks"> media/attachment <a href>s (s3, /media/, vp4 ...)
  - Card fallback (pages without a table): <div class="swiper-slide"> →
      <a href> wrapping <div class="lessonBlock [lessonSeriesBlock]"> with <h3> title,
      <div class="author">, order number in <div class="sbn">.
  - h1: first <h1> in the document (content-only; the embedded nav has none).
  - Pagination: none found server-side (full lists are rendered; "swiper-pagination"
    is carousel dots). Defensive ?page=N detection implemented anyway; n_pages
    reports how many pages were actually fetched per URL.

READ-ONLY everywhere; writes only under scripts/parity/oneone/.
NetSpark MITM: curl --noproxy '*'.
Re-runnable: raw HTML cached under oneone/cache/<sha1-of-url>.html (skip if exists).
"""
import hashlib
import html as H
import json
import os
import re
import subprocess
import sys
import unicodedata
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE = "https://www.bneyzion.co.il"
ROOT = "/Users/srhlq/Downloads/saar-workspace/bneyzion/scripts/parity/oneone"
HOME = os.path.join(ROOT, "old_home_20260611.html")
CACHE = os.path.join(ROOT, "cache")
OUT = os.path.join(ROOT, "old_listings_neviim_moadim.json")
WORKERS = 8
RETRIES = 2  # extra attempts after the first

SECTIONS = [
    "נביאים",
    "מועדים",
    "נושאים-כלליים-בתנך",
    "הפטרות",
    "ימי-עיון-בתנך",
    "כלי-עזר-טבלאות-זמני-המאורעות-ומפות",
    "פרוייקט-התנך-המוקלט-מתעדכן",
    "ליווי-תתים",
]
TOP = "מאגר-השיעורים-והמאמרים"
SCOPE_PREFIXES = tuple(f"/{TOP}/{s}/" for s in SECTIONS)

# ---------------------------------------------------------------- helpers

def norm_he(s: str) -> str:
    """Hebrew matching normalization: strip niqqud, NFC, collapse ws, lower."""
    s = H.unescape(s or "")
    s = "".join(c for c in s if not (0x0591 <= ord(c) <= 0x05C7))
    s = unicodedata.normalize("NFC", s)
    s = re.sub(r"\s+", " ", s).strip().lower()
    return s


def clean_text(s: str) -> str:
    s = H.unescape(s or "")
    s = re.sub(r"<[^>]+>", "", s)
    s = unicodedata.normalize("NFC", s)
    return re.sub(r"\s+", " ", s).strip()


def norm_path(href: str) -> str:
    """Normalize an href to a decoded site-relative path with trailing slash."""
    href = H.unescape((href or "").strip())
    href = urllib.parse.unquote(href)
    if href.startswith(BASE):
        href = href[len(BASE):]
    if href.startswith("http"):
        return href  # external — return as-is
    if not href.startswith("/"):
        href = "/" + href
    if "?" not in href and "#" not in href and not href.endswith("/"):
        last = href.rsplit("/", 1)[-1]
        if "." not in last:
            href += "/"
    return href


def in_scope(path: str) -> bool:
    return path.startswith(SCOPE_PREFIXES)


def cache_path(url: str) -> str:
    return os.path.join(CACHE, hashlib.sha1(url.encode("utf-8")).hexdigest() + ".html")


def fetch(path: str) -> tuple[str, str]:
    """Fetch a site path (unicode). Returns (html, status). Cached by sha1(url)."""
    url = BASE + path
    cp = cache_path(url)
    if os.path.exists(cp) and os.path.getsize(cp) > 5000:
        with open(cp, encoding="utf-8") as f:
            return f.read(), "cache"
    enc = BASE + urllib.parse.quote(path, safe="/?=&%")
    last_code = "000"
    for attempt in range(1 + RETRIES):
        r = subprocess.run(
            ["curl", "--noproxy", "*", "-sL", "--max-time", "90",
             "-w", "\n@@HTTP_CODE:%{http_code}@@", enc],
            capture_output=True)
        body = r.stdout.decode("utf-8", errors="replace")
        m = re.search(r"@@HTTP_CODE:(\d+)@@\s*$", body)
        code = m.group(1) if m else "000"
        body = re.sub(r"\n@@HTTP_CODE:\d+@@\s*$", "", body)
        last_code = code
        if code == "200" and len(body) > 5000:
            with open(cp, "w", encoding="utf-8") as f:
                f.write(body)
            return body, code
    return "", last_code


# ---------------------------------------------------------------- parsers

TR_RE = re.compile(r"<tr data-tooltip.*?</tr>", re.S)
TD_RE = re.compile(r"<td[^>]*>(.*?)</td>", re.S)
H3A_RE = re.compile(r'<h3>\s*<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>', re.S)
A_RE = re.compile(r'<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>', re.S)
LINKS_RE = re.compile(r'<div class="lessonLinks">(.*?)</div>', re.S)
HREF_RE = re.compile(r'href="([^"]+)"')
H1_RE = re.compile(r"<h1[^>]*>(.*?)</h1>", re.S)
SLIDE_RE = re.compile(r'<div class="swiper-slide">(.*?)(?=<div class="swiper-slide">|<!-- If we need)', re.S)
CARD_RE = re.compile(r'class="lessonBlock([^"]*)"')
AUTHOR_DIV_RE = re.compile(r'<div class="author">(.*?)</div>', re.S)
PAGE_LINK_RE = re.compile(r'href="([^"]*[?&]page=\d+[^"]*)"')


def content_after_nav(html: str) -> str:
    """Cut off the 3 embedded sideNav blocks so cards/links come from content only."""
    i = html.rfind('<nav class="sideNav">')
    if i == -1:
        return html
    j = html.find("</nav>", i)
    return html[j:] if j != -1 else html


def parse_rows(html: str):
    """Parse table rows (authoritative ordered list). Returns list of item dicts."""
    items = []
    for row in TR_RE.findall(html):
        tds = TD_RE.findall(row)
        t = H3A_RE.search(row)
        if not t:
            continue
        typ = clean_text(tds[0]) if tds else ""
        href = norm_path(t.group(1))
        title = clean_text(t.group(2))
        author = None
        if len(tds) >= 4:
            a = A_RE.search(tds[3])
            author = clean_text(a.group(2)) if a else (clean_text(tds[3]) or None)
        meta = clean_text(tds[4]) if len(tds) >= 5 else ""
        media = []
        lm = LINKS_RE.search(row)
        if lm:
            media = [H.unescape(u) for u in HREF_RE.findall(lm.group(1))]
        items.append({
            "type": typ, "title": title, "title_norm": norm_he(title),
            "href": href, "author": author, "author_norm": norm_he(author or ""),
            "meta": meta, "media": media,
        })
    return items


def parse_cards(html: str):
    """Fallback: swiper lessonBlock cards (content area only)."""
    body = content_after_nav(html)
    items = []
    for slide in SLIDE_RE.findall(body):
        cm = CARD_RE.search(slide)
        if not cm:
            continue
        is_series = "lessonSeriesBlock" in cm.group(1)
        href_m = re.search(r'<a[^>]*href="([^"]+)"', slide)
        h3_m = re.search(r"<h3[^>]*>(.*?)</h3>", slide, re.S)
        if not h3_m:
            continue
        title = clean_text(h3_m.group(1))
        author = None
        am = AUTHOR_DIV_RE.search(slide)
        if am:
            author = clean_text(am.group(1))
        cnt = re.search(r">\s*(\d+\s*שיעורים)\s*<", slide)
        media = [H.unescape(u) for u in HREF_RE.findall(slide)
                 if "/media/" in u or "s3." in u or "amazonaws" in u]
        items.append({
            "type": "סדרה" if is_series else "שיעור",
            "title": title, "title_norm": norm_he(title),
            "href": norm_path(href_m.group(1)) if href_m else None,
            "author": author, "author_norm": norm_he(author or ""),
            "meta": clean_text(cnt.group(1)) if cnt else "", "media": media,
        })
    return items


def parse_page(html: str):
    h1 = ""
    m = H1_RE.search(html)
    if m:
        h1 = clean_text(m.group(1))
    items = parse_rows(html)
    layout = "table"
    if not items:
        items = parse_cards(html)
        layout = "cards" if items else "none"
    for i, it in enumerate(items, 1):
        it["order"] = i
    sub_links = []
    seen = set()
    for it in items:
        if it["type"] == "סדרה" and it["href"] and it["href"] not in seen:
            seen.add(it["href"])
            sub_links.append(it["href"])
    # defensive pagination detection (content area)
    body = content_after_nav(html)
    page_links = sorted({H.unescape(u) for u in PAGE_LINK_RE.findall(body)})
    return h1, items, sub_links, layout, page_links


# ---------------------------------------------------------------- seeds

def seeds_from_home():
    html = open(HOME, encoding="utf-8").read()
    start = html.find('<nav class="sideNav">')
    end = html.find("</nav>", start)
    block = html[start:end]
    seen, out = set(), []
    for href in re.findall(r'<a[^>]*href="([^"]*)"', block):
        p = norm_path(href)
        if in_scope(p) and p not in seen:
            seen.add(p)
            out.append(p)
    return out


def nav_children_map(seeds):
    """Direct nav-tree children of each in-scope nav URL (order preserved).

    NOTE: the old site's book pages do NOT list their event/chapter sub-pages in
    the content table (only rabbi/project series rows); the events live in the
    global sideNav tree. E.g. שופטים's 10 golden event-series are nav children.
    """
    kids = {}
    for p in seeds:
        for q in seeds:
            if q != p and q.startswith(p):
                rest = q[len(p):].strip("/")
                if rest and "/" not in rest:
                    kids.setdefault(p, []).append(q)
    return kids


# ---------------------------------------------------------------- crawl

def main():
    os.makedirs(CACHE, exist_ok=True)
    seeds = seeds_from_home()
    print(f"seeds from first sideNav (in scope): {len(seeds)}")

    results = {}      # path -> page dict
    failures = {}     # path -> status
    visited = set(seeds)
    frontier = list(seeds)
    wave = 0
    while frontier:
        wave += 1
        print(f"wave {wave}: fetching {len(frontier)} pages ...")
        fetched = {}
        with ThreadPoolExecutor(max_workers=WORKERS) as ex:
            futs = {ex.submit(fetch, p): p for p in frontier}
            for fut in as_completed(futs):
                p = futs[fut]
                html_doc, status = fut.result()
                fetched[p] = (html_doc, status)
        next_frontier = []
        for p, (html_doc, status) in fetched.items():
            if not html_doc:
                failures[p] = status
                continue
            h1, items, sub_links, layout, page_links = parse_page(html_doc)
            n_pages = 1
            # follow real pagination if it ever exists
            followed = set()
            while page_links:
                nxt = [u for u in page_links if u not in followed]
                if not nxt:
                    break
                u = norm_path(nxt[0])
                followed.add(nxt[0])
                more_html, st = fetch(u)
                if not more_html:
                    break
                _, more_items, more_subs, _, more_pl = parse_page(more_html)
                known = {(it["href"], it["title_norm"]) for it in items}
                added = 0
                for it in more_items:
                    if (it["href"], it["title_norm"]) not in known:
                        it["order"] = len(items) + 1
                        items.append(it)
                        added += 1
                for s in more_subs:
                    if s not in sub_links:
                        sub_links.append(s)
                n_pages += 1
                if added == 0:
                    break
                page_links = [x for x in more_pl if x not in followed]
            results[p] = {
                "url": BASE + p, "h1": h1, "h1_norm": norm_he(h1),
                "layout": layout, "items": items,
                "sub_links": sub_links, "n_pages": n_pages,
            }
            for s in sub_links:
                if in_scope(s) and s not in visited:
                    visited.add(s)
                    next_frontier.append(s)
        frontier = next_frontier

    # ---------------------------------------------------- nav-children merge
    # The global sideNav is the tree authority: book pages don't list their
    # event/chapter sub-pages in the content table. Merge nav children into
    # sub_links (content series first, then nav-only children, order kept).
    kids = nav_children_map(seeds)
    for p, v in results.items():
        nav_kids = kids.get(p, [])
        v["sub_links_nav"] = nav_kids
        merged = list(v["sub_links"])
        for k in nav_kids:
            if k not in merged:
                merged.append(k)
        v["sub_links"] = merged

    # ------------------------------------------------------------ report
    n_items = sum(len(v["items"]) for v in results.values())
    empties = sorted(p for p, v in results.items()
                     if not v["items"] and not v["sub_links"])
    print(f"pages: {len(results)}  items: {n_items}  empty: {len(empties)}  failures: {len(failures)}")
    for p, st in sorted(failures.items()):
        print(f"  FAIL[{st}] {p}")
    for p in empties:
        print(f"  EMPTY[h1={results[p]['h1']}] {p}")
    no_items = sorted(p for p, v in results.items() if not v["items"])
    print(f"pages with 0 items (any sub_links): {len(no_items)}")
    for p in no_items:
        print(f"  NO-ITEMS[h1={results[p]['h1']}, subs={len(results[p]['sub_links'])}] {p}")

    out = {BASE + p: {k: v[k] for k in
                      ("h1", "items", "sub_links", "sub_links_nav", "n_pages", "layout")}
           for p, v in sorted(results.items())}
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f"wrote {OUT}")

    # ------------------------------------------------------------ verify שופטים
    key = BASE + f"/{TOP}/נביאים/שופטים/"
    GOLDEN = ["מצב הכיבושים", "מבוא לתקופת השופטים", "עתניאל, אהוד ושמגר",
              "דבורה וברק", "גדעון", "אבימלך", "השופטים השקטים ויפתח",
              "שמשון", "פסל מיכה", "פילגש בגבעה"]
    if key in out:
        print("\n--- שופטים verification (golden 10 event-series) ---")
        subs = out[key]["sub_links"]
        sub_titles = {}
        for s in subs:
            r = results.get(s)
            sub_titles[s] = r["h1"] if r else "(not crawled)"
        for g in GOLDEN:
            gn = norm_he(g)
            hit = [(s, t) for s, t in sub_titles.items() if gn in norm_he(t) or gn in norm_he(s)]
            if hit:
                s, t = hit[0]
                n = len(results[s]["items"]) if s in results else "?"
                print(f"  OK  {g}  →  {s}  (h1='{t}', items={n})")
            else:
                print(f"  MISSING  {g}")
        print(f"  book-page content items: {len(out[key]['items'])} "
              f"(series rows: {sum(1 for i in out[key]['items'] if i['type']=='סדרה')})")
        print(f"  sub_links total: {len(subs)} (nav children: {len(out[key]['sub_links_nav'])})")
    else:
        print("WARNING: שופטים page missing from results")


if __name__ == "__main__":
    main()
