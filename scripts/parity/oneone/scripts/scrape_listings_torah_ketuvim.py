#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scrape_listings_torah_ketuvim.py — Bnei-Zion 1:1 migration parity (oneone).

Scrapes ordered item-lists for every PUBLIC TREE page of the old site
(https://www.bneyzion.co.il) in the sections:
  - איך לומדים תנ"ך
  - תורה            (all 5 books + every sub-collection in the sideNav subtree)
  - כתובים          (all books + chapter pages)
  - ניווט באתר לפי ספר ופרק
  - פרשת השבוע

READ-ONLY everywhere except NEW files under scripts/parity/oneone/.
Network: NetSpark MITM proxy bypassed (trust_env=False, empty proxies).

Method
------
1. Seeds = every URL under the 5 target sections in the FIRST <nav class="sideNav">
   of oneone/old_home_20260611.html (parsed at every nesting level).
2. BFS crawl (8 threads, 3 attempts/URL). Each page is parsed for:
     h1, ordered items, sub-series/category links, pagination.
   Series links discovered in page bodies/tables that live under the 5 section
   prefixes are enqueued too (they are real public tree pages not in the sideNav).
3. Raw HTML cached under oneone/cache/<sha1(canonical-url)>.html  (idempotent reruns).
4. Output: oneone/old_listings_torah_ketuvim.json
     {url: {h1, items:[{title, rabbi, media, attachment_href, order_index, ...}],
            sub_links:[{title, url, kind, ...}], n_pages, ...}}

Selectors used (verified by manual inspection 11.6.2026):
  - canonical complete ordered list  = div.categoryTable table tr  (NOT the
    swiper lessonBlock grid, which is capped: e.g. book bereshit grid=67 vs table=87)
    row cols: [0]=type שיעור/שו"ת/סדרה, [1]=media icon <i class=fa-*>,
              [2]=h3>a title+href + promo span, [3]=rabbi a, [4]=duration,
              [5]=div.lessonLinks download anchors (mp3 / pdf attachment).
  - fallback when no table rows: div.lessonBlock grid
    (h3>a title, .author rabbi, .lessonLinks media; series tiles =
     .lessonSeriesBlock wrapped in parent <a>).
  - sub-series/category links in body: anchors under the content container
    pointing into /מאגר-השיעורים-והמאמרים/ that are NOT sidenav/breadcrumb/table/
    grid/lesson-item/rav links.
  - pagination: any a[href*="page="] on same path (none observed on old site —
    tables render fully server-side; "כל השיעורים ב..." URLs 302-redirect to the
    parent category page; redirects are recorded as redirected_to).
"""
import hashlib
import json
import os
import re
import sys
import threading
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import unquote, urljoin, urlparse

import requests
from bs4 import BeautifulSoup

ROOT = "/Users/srhlq/Downloads/saar-workspace/bneyzion/scripts/parity/oneone"
HOME_HTML = os.path.join(ROOT, "old_home_20260611.html")
CACHE = os.path.join(ROOT, "cache")
OUT = os.path.join(ROOT, "old_listings_torah_ketuvim.json")
BASE = "https://www.bneyzion.co.il"
MAAGAR = "/מאגר-השיעורים-והמאמרים/"

TARGET_SECTIONS = {
    'איך לומדים תנ"ך',
    "תורה",
    "כתובים",
    "ניווט באתר לפי ספר ופרק",
    "פרשת השבוע",
}
# url path prefixes (unicode, unquoted) for the 5 sections — filled from sideNav
SECTION_PREFIXES = []

os.makedirs(CACHE, exist_ok=True)

NIQQUD = re.compile("[֑-ׇ]")


def norm_he(s: str) -> str:
    """Hebrew normalization for matching: NFC, strip niqqud, collapse ws, lower."""
    if not s:
        return ""
    s = unicodedata.normalize("NFC", s)
    s = NIQQUD.sub("", s)
    s = re.sub(r"\s+", " ", s).strip().lower()
    return s


def canon_url(href: str) -> str:
    """Canonical absolute unicode URL with trailing slash (dedupe + output key)."""
    if not href:
        return ""
    href = href.strip()
    if href.startswith("http"):
        p = urlparse(href)
        path = unquote(p.path)
    else:
        path = unquote(urlparse(href).path)
    path = unicodedata.normalize("NFC", path)
    if not path.startswith("/"):
        path = "/" + path
    if not path.endswith("/"):
        path += "/"
    return BASE + path


def sha1_of(url: str) -> str:
    return hashlib.sha1(url.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------- sideNav seeds
def parse_sidenav_seeds():
    html = open(HOME_HTML, encoding="utf-8").read()
    start = html.find('<nav class="sideNav">')
    end = html.find("</nav>", start)
    block = html[start:end] + "</nav>"
    soup = BeautifulSoup(block, "lxml")
    top = soup.find("ul", class_="cats")

    nodes = []  # (depth, title_path tuple, canon_url)

    def walk(ul, depth=0, path=()):
        for li in ul.find_all("li", recursive=False):
            a = li.find("a", recursive=False)
            if not a or not a.get("href"):
                continue
            title = " ".join(a.get_text().split())
            href = a["href"]
            nodes.append((depth, path + (title,), canon_url(href)))
            for sub in li.find_all("ul", recursive=False):
                walk(sub, depth + 1, path + (title,))

    walk(top)
    seeds = []
    for depth, tpath, url in nodes:
        if tpath[0] in TARGET_SECTIONS:
            seeds.append({"url": url, "title_path": list(tpath), "depth": depth})
            if depth == 0:
                SECTION_PREFIXES.append(url)
    return seeds


# ---------------------------------------------------------------- fetching
_tls = threading.local()


def get_session():
    if not hasattr(_tls, "s"):
        s = requests.Session()
        s.trust_env = False
        s.proxies = {"http": "", "https": ""}
        s.headers["User-Agent"] = (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        )
        _tls.s = s
    return _tls.s


def fetch(url: str):
    """Fetch with cache. Returns (html, final_url, status, from_cache) or raises."""
    cp = os.path.join(CACHE, sha1_of(url) + ".html")
    mp = cp + ".meta.json"
    if os.path.exists(cp) and os.path.getsize(cp) > 500 and os.path.exists(mp):
        meta = json.load(open(mp))
        return open(cp, encoding="utf-8").read(), meta["final_url"], meta["status"], True
    last_err = None
    for attempt in range(3):  # original + 2 retries
        try:
            r = get_session().get(url, timeout=90)
            if r.status_code != 200:
                last_err = f"HTTP {r.status_code}"
                time.sleep(2 * (attempt + 1))
                continue
            final_url = canon_url(r.url)
            open(cp, "w", encoding="utf-8").write(r.text)
            json.dump({"url": url, "final_url": final_url, "status": r.status_code},
                      open(mp, "w"), ensure_ascii=False)
            return r.text, final_url, r.status_code, False
        except Exception as e:
            last_err = repr(e)
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"fetch failed after 3 attempts: {url} :: {last_err}")


# ---------------------------------------------------------------- parsing
MEDIA_EXT = {
    "audio": (".mp3", ".m4a", ".wma", ".wav"),
    "video": (".mp4", ".mov"),
    "attachment": (".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".zip"),
}


def classify_media(href: str, icon: str, title: str):
    h = (href or "").lower()
    for kind, exts in MEDIA_EXT.items():
        if any(h.split("?")[0].endswith(e) for e in exts):
            return kind
    if "youtube" in h or "youtu.be" in h or "vimeo" in h:
        return "video"
    if "volume-up" in (icon or ""):
        return "audio"
    if "film" in (icon or "") or "video" in (icon or ""):
        return "video"
    if "file" in (icon or ""):
        return "attachment"
    return "other"


def parse_lesson_links(container):
    """div.lessonLinks → media list."""
    media = []
    if not container:
        return media
    for a in container.find_all("a", href=True):
        icon = " ".join(
            c for i in a.find_all("i") for c in (i.get("class") or [])
        )
        m = {
            "href": a["href"],
            "icon": icon,
            "title": a.get("title", ""),
            "kind": classify_media(a["href"], icon, a.get("title", "")),
        }
        media.append(m)
    return media


def parse_page(html: str, page_url: str):
    """Returns dict: h1, items, sub_links, table_used, raw counts."""
    soup = BeautifulSoup(html, "lxml")
    # kill nav chrome so body-link extraction is clean
    for sel in ["nav.sideNav", ".sideNavBar", "header", "footer", ".breadcrumbs",
                ".mobileNav", "#mobileMenu"]:
        for el in soup.select(sel):
            el.decompose()

    h1el = soup.find("h1")
    h1 = " ".join(h1el.get_text().split()) if h1el else None

    items = []
    sub_links = []
    seen_sub = set()
    item_hrefs = set()

    # ---- canonical ordered list: categoryTable ----
    rows = soup.select(".categoryTable table tr")
    data_rows = [r for r in rows if r.find("td")]
    table_used = bool(data_rows)
    order = 0
    for r in data_rows:
        tds = r.find_all("td")
        if len(tds) < 3:
            continue
        rtype = " ".join(tds[0].get_text().split())
        icon = " ".join(
            c for i in tds[1].find_all("i") for c in (i.get("class") or [])
        ) if len(tds) > 1 else ""
        ta = tds[2].find("a")
        title = " ".join(ta.get_text().split()) if ta else " ".join(
            tds[2].get_text().split())
        href = canon_url(ta["href"]) if ta and ta.get("href") else None
        rabbi_a = tds[3].find("a") if len(tds) > 3 else None
        rabbi = (" ".join(rabbi_a.get_text().split()) if rabbi_a
                 else (" ".join(tds[3].get_text().split()) if len(tds) > 3 else ""))
        duration = " ".join(tds[4].get_text().split()) if len(tds) > 4 else ""
        media = parse_lesson_links(tds[5].find(class_="lessonLinks")
                                   if len(tds) > 5 else None)
        promo_sp = tds[2].find("span")
        promo = " ".join(promo_sp.get_text().split()) if promo_sp else ""

        if rtype == "סדרה":
            key = norm_he(title) + "|" + (href or "")
            if key not in seen_sub:
                seen_sub.add(key)
                sub_links.append({
                    "title": title, "url": href, "kind": "series",
                    "rabbi": rabbi, "n_lessons_text": duration,
                    "order_index": order,
                })
        else:
            attachment = next((m["href"] for m in media
                               if m["kind"] == "attachment"), None)
            if href:
                item_hrefs.add(href)
            items.append({
                "title": title, "title_norm": norm_he(title),
                "rabbi": rabbi, "rabbi_norm": norm_he(rabbi),
                "href": href, "type": rtype, "duration": duration,
                "promo": promo, "media": media,
                "attachment_href": attachment, "order_index": order,
            })
        order += 1

    # ---- fallback / supplement: lessonBlock grid (only when table empty) ----
    grid_blocks = soup.select(".lessonBlock")
    if not table_used and grid_blocks:
        order = 0
        for b in grid_blocks:
            classes = b.get("class") or []
            if "lessonSeriesBlock" in classes:
                wrap = b.find_parent("a")
                href = canon_url(wrap["href"]) if wrap and wrap.get("href") else None
                t = b.find("h3")
                title = " ".join(t.get_text().split()) if t else ""
                aut = b.find(class_="author")
                rabbi = " ".join(aut.get_text().split()) if aut else ""
                key = norm_he(title) + "|" + (href or "")
                if key not in seen_sub:
                    seen_sub.add(key)
                    sub_links.append({"title": title, "url": href,
                                      "kind": "series", "rabbi": rabbi,
                                      "n_lessons_text": "", "order_index": order})
            else:
                t = b.find("h3")
                ta = t.find("a") if t else None
                title = " ".join((ta or t).get_text().split()) if t else ""
                href = canon_url(ta["href"]) if ta and ta.get("href") else None
                aut = b.find(class_="author")
                rabbi = " ".join(aut.get_text().split()) if aut else ""
                media = parse_lesson_links(b.find(class_="lessonLinks"))
                promo_el = b.find(class_="lessonPromo")
                promo = " ".join(promo_el.get_text().split()) if promo_el else ""
                dur = b.find(class_="duration")
                attachment = next((m["href"] for m in media
                                   if m["kind"] == "attachment"), None)
                if href:
                    item_hrefs.add(href)
                items.append({
                    "title": title, "title_norm": norm_he(title),
                    "rabbi": rabbi, "rabbi_norm": norm_he(rabbi),
                    "href": href, "type": "שיעור",
                    "duration": " ".join(dur.get_text().split()) if dur else "",
                    "promo": promo, "media": media,
                    "attachment_href": attachment, "order_index": order,
                })
            order += 1

    # ---- body category/series links (grids like ניווט page, current-parasha) ----
    # remove the structures already harvested, then scan remaining body anchors
    for el in soup.select(".categoryTable, .lessonBlock, .categorySwiper"):
        el.decompose()
    page_path = unquote(urlparse(page_url).path).rstrip("/")
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "rav=" in href or "?" in href:
            continue
        path = unquote(urlparse(href).path)
        if not path.startswith(MAAGAR):
            continue
        cu = canon_url(href)
        if cu.rstrip("/") == BASE + page_path:
            continue
        if cu in item_hrefs:
            continue
        title = " ".join(a.get_text().split())
        if not title:
            img = a.find("img")
            title = (img.get("alt") or "").strip() if img else ""
        key = norm_he(title) + "|" + cu
        if key in seen_sub:
            continue
        seen_sub.add(key)
        sub_links.append({"title": title, "url": cu, "kind": "body",
                          "rabbi": "", "n_lessons_text": "", "order_index": None})

    # ---- pagination ----
    page_links = []
    full = BeautifulSoup(html, "lxml")
    for a in full.find_all("a", href=True):
        if re.search(r"[?&]page=\d+", a["href"]):
            pp = unquote(urlparse(a["href"]).path).rstrip("/")
            if pp == page_path:
                page_links.append(a["href"])

    return {"h1": h1, "items": items, "sub_links": sub_links,
            "table_used": table_used, "page_links": page_links}


# ---------------------------------------------------------------- crawl
def in_scope(url: str) -> bool:
    return any(url.startswith(p) for p in SECTION_PREFIXES)


def crawl():
    seeds = parse_sidenav_seeds()
    print(f"sideNav seeds in target sections: {len(seeds)}")
    print("section prefixes:", [unquote(p) for p in SECTION_PREFIXES])

    results = {}          # canon url -> page record
    failures = {}         # canon url -> error
    queued = set()
    meta = {}             # canon url -> {source, title_path}
    queue = []
    for s in seeds:
        u = s["url"]
        if u not in queued:
            queued.add(u)
            queue.append(u)
            meta[u] = {"source": "sidenav", "title_path": s["title_path"]}

    def process(url):
        html, final_url, status, cached = fetch(url)
        parsed = parse_page(html, url)
        n_pages = 1
        # follow pagination (all pages, merged, order preserved)
        seen_pages = set()
        for pl in parsed["page_links"]:
            absu = urljoin(BASE, pl)
            if absu in seen_pages:
                continue
            seen_pages.add(absu)
            html2, _, _, _ = fetch(absu)
            p2 = parse_page(html2, url)
            base_idx = max((it["order_index"] for it in parsed["items"]),
                           default=-1) + 1
            for it in p2["items"]:
                it["order_index"] += base_idx
                parsed["items"].append(it)
            n_pages += 1
        return url, final_url, parsed, n_pages, cached

    rounds = 0
    while queue:
        rounds += 1
        batch, queue = queue, []
        print(f"-- round {rounds}: fetching {len(batch)} pages")
        with ThreadPoolExecutor(max_workers=8) as ex:
            futs = {ex.submit(process, u): u for u in batch}
            for fut in as_completed(futs):
                u = futs[fut]
                try:
                    url, final_url, parsed, n_pages, cached = fut.result()
                except Exception as e:
                    failures[u] = str(e)
                    print(f"  FAIL {unquote(u)} :: {e}", file=sys.stderr)
                    continue
                rec = {
                    "h1": parsed["h1"],
                    "items": parsed["items"],
                    "sub_links": parsed["sub_links"],
                    "n_pages": n_pages,
                    "n_items": len(parsed["items"]),
                    "table_used": parsed["table_used"],
                    "source": meta[u]["source"],
                    "title_path": meta[u].get("title_path"),
                }
                if final_url != u:
                    rec["redirected_to"] = final_url
                results[u] = rec
                # enqueue discovered series pages under target prefixes
                for sl in parsed["sub_links"]:
                    su = sl.get("url")
                    if (sl["kind"] == "series" and su and in_scope(su)
                            and su not in queued):
                        queued.add(su)
                        queue.append(su)
                        meta[su] = {"source": f"series-discovered:{unquote(u)}",
                                    "title_path": None}
        print(f"   done. total results={len(results)}, failures={len(failures)}, "
              f"next queue={len(queue)}")

    return results, failures


def main():
    t0 = time.time()
    results, failures = crawl()
    out = {
        "_meta": {
            "generated": time.strftime("%Y-%m-%d %H:%M:%S"),
            "base": BASE,
            "sections": sorted(TARGET_SECTIONS),
            "n_pages": len(results),
            "n_failures": len(failures),
            "failures": failures,
            "total_items": sum(r["n_items"] for r in results.values()),
            "pages_zero_items": sorted(unquote(u) for u, r in results.items()
                                       if r["n_items"] == 0),
            "note": "items = categoryTable rows (full server-side list); "
                    "sub_links kind=series/body; redirected_to recorded for "
                    "alias URLs like 'כל-השיעורים-ב...' that 302 to parent.",
        },
        "pages": {u: r for u, r in sorted(results.items())},
    }
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    zero = out["_meta"]["pages_zero_items"]
    print("=" * 70)
    print(f"pages scraped : {len(results)}")
    print(f"total items   : {out['_meta']['total_items']}")
    print(f"zero-item pgs : {len(zero)}")
    print(f"failures      : {len(failures)}")
    for u, e in failures.items():
        print("  FAIL", unquote(u), "::", e)
    print(f"output        : {OUT}")
    print(f"elapsed       : {time.time()-t0:.0f}s")


if __name__ == "__main__":
    main()
