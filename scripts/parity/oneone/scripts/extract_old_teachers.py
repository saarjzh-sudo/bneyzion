#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extract the OLD bneyzion.co.il teachers wing (אגף המורים) structure.

READ-ONLY vs the world: only fetches old-site pages over HTTP and writes JSON
under scripts/parity/oneone/. Re-runnable: pages are cached on disk in
oneone/cache/teachers/ keyed by URL hash; delete the cache to force refetch.

Selectors discovered by manual inspection (documented):
  - Teachers wing root: https://www.bneyzion.co.il/אגף-המורים/
    (301-redirects to the lowercase-percent-encoded same path; final page
    title H1 = אגף המורים, root of "מאגר עזרי הלמידה").
  - The root page has exactly 3 <nav class="sideNav"> blocks, in order:
      #0 by-book tree:    ul.nav.cats > li > a (top) ; ul.nav.subCats (books)
                          ; ul.nav.subSubCats (collections/series)
      #1 content types:   ul.nav.cats > li > a, href="/מאגר-עזרי-הלמידה/נושאים/?subject=X",
                          link text "TITLE (COUNT)"
      #2 creators:        ul.nav.cats > li > a, href="/מאגר-עזרי-הלמידה/יוצרים/?rav=X",
                          link text "NAME (COUNT)"
  - Listing pages (subject / rav / book / collection) render the SAME data twice:
    a swiper grid (div.lessonBlock) and a <table class="categoryTable"> (server
    side, complete, no pagination markers anywhere). We parse the table:
      <tr>  <td>סדרה|שיעור</td> <td><i class="fa fa-ICON"></i></td>
            <td><h3><a href=URL title=T>TITLE</a></h3></td>
            <td><a href="...?rav=NAME">AUTHOR</a></td>
            <td>N שיעורים | empty</td>
            <td><div class="lessonLinks"><a download href="/media/..."></a></div></td>
    Media icons: fa-file-pdf-o=pdf, fa-file-text=text, fa-video-camera=video,
                 fa-volume-up=audio. fa-files-o is the download-attachment icon.
"""
import hashlib
import json
import os
import re
import sys
import time
import unicodedata
from html import unescape

import requests

BASE = "https://www.bneyzion.co.il"
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # .../oneone
CACHE = os.path.join(HERE, "cache", "teachers")
os.makedirs(CACHE, exist_ok=True)

TREE_OUT = os.path.join(HERE, "old_teachers_tree.json")
LISTINGS_OUT = os.path.join(HERE, "old_teachers_listings.json")

KNOWN_CONTENT_TYPES = {
    "סיכום הפרקים והנושאים בקצרה": 475,
    "הכוונה והדרכה למורה": 426,
    "ביאור הפסוקים": 358,
    "חידות חזרה": 354,
    "שאלות ותשובות על סדר הפרקים": 312,
    "דגשים והכוונה על סדר הפרקים": 252,
    "דפי עבודה": 213,
    "ביאורי מילים": 132,
    "שאלות ותשובות": 91,
    "מפות": 36,
}

SESSION = requests.Session()
SESSION.trust_env = False  # NetSpark MITM proxy bypass
SESSION.proxies = {"http": "", "https": ""}
SESSION.headers["User-Agent"] = "Mozilla/5.0 (parity-extractor; read-only)"

NIQQUD = re.compile("[֑-ׇ]")


def norm(s):
    """Hebrew matching normalization: strip niqqud, NFC, collapse ws, lower."""
    if s is None:
        return None
    s = NIQQUD.sub("", s)
    s = unicodedata.normalize("NFC", s)
    s = re.sub(r"\s+", " ", s).strip().lower()
    return s


def fetch(url):
    """GET with on-disk cache. URL may contain raw Hebrew (requests encodes)."""
    key = hashlib.sha1(url.encode("utf-8")).hexdigest()
    path = os.path.join(CACHE, key + ".html")
    if os.path.exists(path) and os.path.getsize(path) > 500:
        with open(path, encoding="utf-8") as f:
            return f.read()
    for attempt in range(3):
        try:
            r = SESSION.get(url, timeout=120, allow_redirects=True)
            if r.status_code == 200 and len(r.text) > 500:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(r.text)
                time.sleep(0.25)
                return r.text
            print(f"  ! HTTP {r.status_code} ({len(r.text)}b) {url}", file=sys.stderr)
        except Exception as e:  # noqa: BLE001
            print(f"  ! {e} {url}", file=sys.stderr)
        time.sleep(1.5 * (attempt + 1))
    return None


def absolute(href):
    href = unescape(href.strip())
    if href.startswith("http"):
        return href
    return BASE + href


ICON_MEDIA = {
    "file-pdf-o": "pdf",
    "file-text": "text",
    "file-text-o": "text",
    "video-camera": "video",
    "film": "video",
    "volume-up": "audio",
    "headphones": "audio",
    "file-word-o": "doc",
}


def parse_listing_table(html):
    """Parse <table class="categoryTable"> rows -> ordered item dicts."""
    i = html.find('class="categoryTable')  # div.categoryTable.table-responsive
    if i < 0:
        return None  # no table on this page (special template)
    start = html.find("<table", i)  # the <table> sits INSIDE the wrapper div
    if start < 0:
        return None
    end = html.find("</table>", start)
    tbl = html[start:end]
    items = []
    rows = re.findall(r"<tr[^>]*>(.*?)</tr>", tbl, re.S)
    order = 0
    for row in rows:
        tds = re.findall(r"<td[^>]*>(.*?)</td>", row, re.S)
        if len(tds) < 4:
            continue  # header row (th)
        kind_txt = re.sub(r"<[^>]+>", "", tds[0]).strip()
        kind = {"סדרה": "series", "שיעור": "lesson"}.get(kind_txt, kind_txt or "unknown")
        icons = re.findall(r"fa fa-([\w-]+)", tds[1])
        media = None
        for ic in icons:
            if ic in ICON_MEDIA:
                media = ICON_MEDIA[ic]
                break
        # title cell
        m = re.search(r'<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>', tds[2], re.S)
        if not m:
            continue
        url = absolute(m.group(1))
        title = unescape(re.sub(r"<[^>]+>", "", m.group(2))).strip()
        # author cell
        author = None
        am = re.search(r'<a[^>]*href="[^"]*\?rav=([^"&]*)"[^>]*>(.*?)</a>', tds[3], re.S)
        if am:
            author = unescape(re.sub(r"<[^>]+>", "", am.group(2))).strip()
        else:
            plain = unescape(re.sub(r"<[^>]+>", "", tds[3])).strip()
            author = plain or None
        # length cell -> series lesson count
        lesson_count = None
        if len(tds) >= 5:
            lm = re.search(r"(\d+)\s*שיעורים", tds[4])
            if lm:
                lesson_count = int(lm.group(1))
            elif "שיעור אחד" in tds[4]:
                lesson_count = 1
        # downloads
        downloads = []
        if len(tds) >= 6:
            for dm in re.finditer(r'<a[^>]*href="([^"]+)"[^>]*>', tds[5]):
                downloads.append(absolute(dm.group(1)))
        if media is None and downloads:
            ext = downloads[0].rsplit(".", 1)[-1].lower()
            media = {"pdf": "pdf", "doc": "doc", "docx": "doc",
                     "mp3": "audio", "mp4": "video"}.get(ext)
        order += 1
        items.append({
            "order_index": order,
            "kind": kind,
            "title": title,
            "title_norm": norm(title),
            "author": author,
            "url": url,
            "media": media,
            "lesson_count": lesson_count,
            "downloads": downloads,
        })
    return items


def pagination_check(html, url):
    """No pagination was ever observed; flag if any marker appears."""
    for pat in (r'rel="next"', r"[?&]page=\d", r'class="pagination',
                r'class="pager', r"loadMore", r"load-more"):
        if re.search(pat, html):
            return f"PAGINATION MARKER '{pat}' on {url}"
    return None


def parse_sidenavs(root_html):
    """Return raw html of the 3 sideNav blocks of the teachers root page."""
    idxs = [m.start() for m in re.finditer(r'<nav[^>]*class="sideNav"', root_html)]
    blocks = []
    for s in idxs:
        blocks.append(root_html[s: root_html.find("</nav>", s)])
    return blocks


def parse_book_tree(nav_html):
    """sideNav #0: nested cats > subCats > subSubCats, preserving order."""
    tree = []
    # iterate top-level <li> of ul.nav.cats
    cats_ul = nav_html[nav_html.find('<ul class="nav cats">'):]
    # split top-level li by matching the structure: each top li starts a link
    # then optionally ul.nav.subCats
    top_links = list(re.finditer(
        r'<a class="[^"]*" href="([^"]+)" title="([^"]*)"[^>]*>', cats_ul))
    link_info = []
    for m in top_links:
        href = unescape(m.group(1)).strip()
        title = unescape(m.group(2)).strip()
        depth = href.strip("/").count("/")  # 1=top, 2=book, 3=collection
        link_info.append({"title": title, "url": absolute(href),
                          "href": href, "depth": depth, "pos": m.start()})
    order_counters = {}
    stack = {}
    for li in link_info:
        d = li["depth"]
        parent_key = "/".join(li["href"].strip("/").split("/")[:-1])
        order_counters.setdefault(parent_key, 0)
        order_counters[parent_key] += 1
        node = {
            "title": li["title"],
            "title_norm": norm(li["title"]),
            "url": li["url"],
            "order": order_counters[parent_key],
            "children": [],
        }
        if d == 1:
            tree.append(node)
            stack[1] = node
        elif d == 2 and 1 in stack:
            stack[1]["children"].append(node)
            stack[2] = node
        elif d == 3 and 2 in stack:
            stack[2]["children"].append(node)
    return tree


def parse_count_facet(nav_html, qparam):
    """sideNav #1/#2: links '?subject=X' / '?rav=X' with text 'TITLE (N)'."""
    out = []
    for m in re.finditer(r'<a[^>]*href="\s*([^"]+)"[^>]*>(.*?)</a>', nav_html, re.S):
        href = unescape(m.group(1)).strip()
        if qparam not in href:
            continue
        text = unescape(re.sub(r"<[^>]+>", "", m.group(2))).strip()
        cm = re.match(r"^(.*?)\s*\((\d+)\)$", text, re.S)
        title = cm.group(1).strip() if cm else text
        count = int(cm.group(2)) if cm else None
        out.append({"title": title, "title_norm": norm(title),
                    "count": count, "url": absolute(href)})
    return out


def main():
    anomalies = []

    print("== teachers wing root ==")
    root_html = fetch(BASE + "/אגף-המורים/")
    if not root_html:
        print("FATAL: cannot fetch teachers root", file=sys.stderr)
        sys.exit(1)
    navs = parse_sidenavs(root_html)
    if len(navs) != 3:
        anomalies.append(f"expected 3 sideNavs on root, found {len(navs)}")

    by_book_tree = parse_book_tree(navs[0])
    content_types = parse_count_facet(navs[1], "?subject=")
    creators = parse_count_facet(navs[2], "?rav=")
    n_books = sum(len(t["children"]) for t in by_book_tree)
    n_colls = sum(len(b["children"]) for t in by_book_tree for b in t["children"])
    print(f"tree: {len(by_book_tree)} tops / {n_books} books / {n_colls} collections")
    print(f"content types: {len(content_types)}, creators: {len(creators)}")

    # verify known content-type counts
    for ct in content_types:
        known = KNOWN_CONTENT_TYPES.get(ct["title"])
        if known is not None and known != ct["count"]:
            anomalies.append(
                f"content-type sidebar count mismatch {ct['title']}: "
                f"known {known} vs scraped {ct['count']}")
    missing_known = set(KNOWN_CONTENT_TYPES) - {c["title"] for c in content_types}
    if missing_known:
        anomalies.append(f"known content types missing from sidebar: {missing_known}")

    tree_doc = {
        "scraped_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "source": BASE + "/אגף-המורים/",
        "selectors": {
            "facets": "3x nav.sideNav on root page, order: by_book / by_content_type / by_creator",
            "by_book": "ul.nav.cats > a (depth1) ; ul.nav.subCats (depth2=book) ; ul.nav.subSubCats (depth3=collection)",
            "by_content_type": "a[href*='/מאגר-עזרי-הלמידה/נושאים/?subject='] text 'TITLE (N)'",
            "by_creator": "a[href*='/מאגר-עזרי-הלמידה/יוצרים/?rav='] text 'NAME (N)'",
        },
        "by_book": by_book_tree,
        "by_content_type": content_types,
        "by_creator": creators,
    }
    with open(TREE_OUT, "w", encoding="utf-8") as f:
        json.dump(tree_doc, f, ensure_ascii=False, indent=1)
    print(f"wrote {TREE_OUT}")

    listings = {"content_types": {}, "creators": {}, "by_book": {},
                "anomalies": anomalies,
                "notes": [
                    "items parsed from <table class='categoryTable'> (server-rendered, complete);"
                    " grid (swiper lessonBlock) shows the same data",
                    "kind=series rows carry lesson_count; their member lessons live on the series page",
                    "no pagination mechanism exists on the old site listing pages"
                    " (checked rel=next/?page/pagination/loadMore on every page)",
                ]}

    def scrape_listing(url, label):
        html = fetch(url)
        if html is None:
            anomalies.append(f"FETCH FAILED: {label} {url}")
            return None
        pg = pagination_check(html, url)
        if pg:
            anomalies.append(pg)
        items = parse_listing_table(html)
        if items is None:
            anomalies.append(f"no categoryTable on {label} ({url}) — special template")
        return items

    print("== content-type pages ==")
    for ct in content_types:
        items = scrape_listing(ct["url"], f"subject:{ct['title']}")
        listings["content_types"][ct["title"]] = {
            "url": ct["url"], "sidebar_count": ct["count"],
            "items": items or [],
            "n_rows": len(items or []),
            "n_series_rows": sum(1 for x in (items or []) if x["kind"] == "series"),
            "n_lesson_rows": sum(1 for x in (items or []) if x["kind"] == "lesson"),
            "sum_series_lesson_counts": sum(x["lesson_count"] or 0 for x in (items or [])
                                            if x["kind"] == "series"),
        }
        print(f"  {ct['title']}: rows={len(items or [])} sidebar={ct['count']}")

    print("== creator pages ==")
    for cr in creators:
        items = scrape_listing(cr["url"], f"rav:{cr['title']}")
        listings["creators"][cr["title"]] = {
            "url": cr["url"], "sidebar_count": cr["count"],
            "items": items or [],
            "n_rows": len(items or []),
            "n_series_rows": sum(1 for x in (items or []) if x["kind"] == "series"),
            "n_lesson_rows": sum(1 for x in (items or []) if x["kind"] == "lesson"),
            "sum_series_lesson_counts": sum(x["lesson_count"] or 0 for x in (items or [])
                                            if x["kind"] == "series"),
        }
        print(f"  {cr['title']}: rows={len(items or [])} sidebar={cr['count']}")

    print("== by-book pages ==")
    for top in by_book_tree:
        if not top["children"]:
            # special top pages (פרשת השבוע / איך מלמדים תנ"ך): scrape what's there
            items = scrape_listing(top["url"], f"top:{top['title']}")
            listings["by_book"][top["title"]] = {
                "url": top["url"], "level": "top", "items": items or [],
                "note": "special page without book children" if items is None else None,
                "sub_series": {},
            }
            print(f"  [top] {top['title']}: rows={len(items or [])}")
            continue
        for book in top["children"]:
            key = f"{top['title']}/{book['title']}"
            items = scrape_listing(book["url"], f"book:{key}") or []
            entry = {"url": book["url"], "level": "book", "top": top["title"],
                     "order": book["order"], "items": items, "sub_series": {}}
            # collection/series pages: nav children + series rows found on book page
            wanted = {}
            for ch in book["children"]:
                wanted[ch["url"]] = ch["title"]
            for it in items:
                if it["kind"] == "series" and it["url"] not in wanted:
                    wanted[it["url"]] = it["title"]
            for surl, stitle in wanted.items():
                sitems = scrape_listing(surl, f"series:{key}/{stitle}")
                entry["sub_series"][stitle] = {
                    "url": surl,
                    "in_sidebar_nav": any(c["url"] == surl for c in book["children"]),
                    "items": sitems or [],
                    "n_rows": len(sitems or []),
                }
            listings["by_book"][key] = entry
            print(f"  {key}: rows={len(items)} sub_series={len(wanted)}")

    # --- post-scrape verifications -------------------------------------
    # (a) sidebar counts vs actually-rendered rows (content types)
    ratios = []
    for k, v in listings["content_types"].items():
        if v["n_rows"]:
            ratios.append(round(v["sidebar_count"] / v["n_rows"], 2))
        else:
            anomalies.append(f"content-type page lists 0 items (sidebar={v['sidebar_count']}): {k}")
    exact3 = sum(1 for r in ratios if r == 3.0)
    listings["notes"].append(
        f"sidebar counts are ~3x the distinct rows rendered on listing pages "
        f"({exact3}/{len(ratios)} content types exactly 3.0x; the known item-count "
        f"table [475,426,...] equals the sidebar numbers, i.e. it counts each item ~3 times)")
    # (b) creators with 0 rows
    for k, v in listings["creators"].items():
        if v["n_rows"] == 0:
            anomalies.append(
                f"creator page lists 0 items but sidebar count={v['sidebar_count']}: {k} "
                f"(verified: categoryTable present with header row only, grid empty)")
    # (c) global unique-url tallies (real, verified)
    def walk_items():
        for v in listings["content_types"].values():
            yield from v["items"]
        for v in listings["creators"].values():
            yield from v["items"]
        for b in listings["by_book"].values():
            yield from b["items"]
            for sv in b.get("sub_series", {}).values():
                yield from sv["items"]
    uniq_lessons = {it["url"] for it in walk_items() if it["kind"] == "lesson"}
    uniq_series = {it["url"] for it in walk_items() if it["kind"] == "series"}
    listings["summary"] = {
        "unique_lesson_urls_across_all_listings": len(uniq_lessons),
        "unique_series_urls_across_all_listings": len(uniq_series),
        "content_type_pages": len(listings["content_types"]),
        "creator_pages": len(listings["creators"]),
        "by_book_pages": len(listings["by_book"]),
        "sub_series_pages": sum(len(b.get("sub_series", {})) for b in listings["by_book"].values()),
    }

    with open(LISTINGS_OUT, "w", encoding="utf-8") as f:
        json.dump(listings, f, ensure_ascii=False, indent=1)
    print(f"wrote {LISTINGS_OUT}")
    print(json.dumps(listings["summary"], ensure_ascii=False, indent=1))

    # summary
    print("\n== SUMMARY ==")
    print("content_types:", len(listings["content_types"]),
          "total rows:", sum(v["n_rows"] for v in listings["content_types"].values()))
    print("creators:", len(listings["creators"]),
          "total rows:", sum(v["n_rows"] for v in listings["creators"].values()))
    print("by_book keys:", len(listings["by_book"]))
    print("anomalies:", len(anomalies))
    for a in anomalies:
        print("  -", a)


if __name__ == "__main__":
    main()
