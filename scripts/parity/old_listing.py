#!/usr/bin/env python3
"""
old_listing.py — UNIFIED loader for the old-site book pages across BOTH scrape formats.

torah_ketuvim.json : sub_links=[dict series {title,url,rabbi,n_lessons_text,order_index}],
                     items=[dict lessons {title,rabbi,href,type,duration,media,order_index}].
neviim_moadim.json : sub_links=[url strings]; items=[dict series+lessons mixed
                     {type:'סדרה'|'שיעור', title, href, author, meta, media, order}].

Returns one ordered, normalized row list so every engine (public_book_listing,
series_lesson_listing, fix_lesson_rabbis) consumes a single shape:
  {order_index, kind('series'|'lesson'), title, title_norm, author, length,
   lesson_count, url, media[list]}.
"""
import os, json, re, html as _html
HERE = os.path.dirname(os.path.abspath(__file__))
from teachers_reconcile import norm

FILES = ["oneone/old_listings_torah_ketuvim.json", "oneone/old_listings_neviim_moadim.json"]
BASE = "https://www.bneyzion.co.il"

def _abs(u):
    """Absolutize an old-site href. neviim-format hrefs are relative ('/מאגר-...') which
       breaks curl (rc=3). torah/ketuvim hrefs are already absolute. Idempotent."""
    if not u:
        return u
    if u.startswith("http://") or u.startswith("https://"):
        return u
    if u.startswith("//"):
        return "https:" + u
    return BASE + ("" if u.startswith("/") else "/") + u

def _digits(s):
    m = re.search(r"\d+", s or ""); return int(m.group()) if m else None

def _clean(t):
    return _html.unescape(t or "").strip()

CATS = {"תורה", "נביאים", "כתובים"}

def find_page(book):
    """The CANONICAL book page: last segment == book AND its parent segment is a real
       category (תורה/נביאים/כתובים) — never a same-named sub-page like .../ליווי-תתים/שופטים/
       or .../נביאים/שופטים/כל-השיעורים/. Among matches, prefer the richest (most rows)."""
    canon, other = [], []
    for f in FILES:
        p = os.path.join(HERE, f)
        if not os.path.exists(p):
            continue
        doc = json.load(open(p, encoding="utf-8")); pages = doc.get("pages", doc)
        for url, pg in pages.items():
            segs = [s for s in url.split("/") if s.strip()]
            if not segs or norm(segs[-1]) != norm(book):
                continue
            (canon if len(segs) >= 2 and segs[-2] in CATS else other).append((url, pg))
    pool = canon or other
    if not pool:
        return None, None
    url, pg = max(pool, key=lambda c: len(c[1].get("sub_links") or []) + len(c[1].get("items") or []))
    return url, pg

def load_book(book):
    """(page_url, rows[]) — rows ordered by order_index, normalized across both formats."""
    page_url, pg = find_page(book)
    if not pg:
        return None, []
    rows = []
    sl = pg.get("sub_links") or []
    if sl and isinstance(sl[0], dict):
        # ── torah/ketuvim format ──
        for s in sl:
            t = _clean(s["title"])
            rows.append({"order_index": s["order_index"], "kind": "series", "title": t,
                         "author": s.get("rabbi"), "length": s.get("n_lessons_text"),
                         "lesson_count": _digits(s.get("n_lessons_text")), "url": _abs(s.get("url")), "media": []})
        for it in (pg.get("items") or []):
            t = _clean(it["title"])
            rows.append({"order_index": it["order_index"], "kind": "lesson", "title": t,
                         "author": it.get("rabbi"), "length": it.get("duration"), "lesson_count": None,
                         "url": _abs(it.get("href")), "media": it.get("media") or [], "type": it.get("type")})
    else:
        # ── neviim/moadim format: series + lessons both in items, by 'type' + 'order' ──
        for it in (pg.get("items") or []):
            kind = "series" if it.get("type") == "סדרה" else "lesson"
            t = _clean(it["title"])
            rows.append({"order_index": it.get("order", len(rows)), "kind": kind, "title": t,
                         "author": it.get("author"), "length": it.get("meta"),
                         "lesson_count": _digits(it.get("meta")) if kind == "series" else None,
                         "url": _abs(it.get("href")), "media": it.get("media") or [], "type": it.get("type")})
    rows.sort(key=lambda r: r["order_index"])
    for i, r in enumerate(rows):
        r["order_index"] = i               # re-index contiguously (both arrays merged in order)
        r["title_norm"] = norm(r["title"])
    return page_url, rows

def series_urls(book):
    """{order_index: {'title','url'}} for the book's SERIES rows (for per-series scraping)."""
    _, rows = load_book(book)
    return {r["order_index"]: {"title": r["title"], "url": r["url"]}
            for r in rows if r["kind"] == "series"}
