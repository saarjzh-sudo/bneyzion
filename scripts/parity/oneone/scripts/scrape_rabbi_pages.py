#!/usr/bin/env python3
"""
Scrape ALL old-site (bneyzion.co.il) rabbi pages — canonical "what a user sees
when clicking a rabbi" extraction for the 1:1 migration-parity project.

READ-ONLY w.r.t. everything except:
  - cache HTML  -> oneone/cache/rav_*.html
  - output JSON -> oneone/old_rabbi_pages.json

Findings baked into this scraper (verified by hand before writing it):
  * The 3rd sideNav on the home page (inside div.swiper-container.ravSwiper)
    lists every rabbi as <a href="/מאגר-השיעורים-והמאמרים/רבנים?rav=NAME">NAME (N)</a>.
  * A rabbi page (/מאגר-השיעורים-והמאמרים/רבנים?rav=NAME) renders TWO views of
    the SAME flat list (no group headers):
      1. blocks view (default): div.swiper-container.categorySwiper >
         div.swiper-slide > div.lessonBlock — standalone lessons
         (h3 > a.pjaxer) and series (div.lessonBlock.lessonSeriesBlock,
         h4 "סדרת שיעורים", "<N> שיעורים"). שו"ת items are NOT in this view.
      2. table view (#switch2list): div.categoryTable table rows
         <tr data-tooltip> with columns:
         [0] item type text: שיעור / סדרה / שו"ת
         [1] media icon: fa-volume-up / fa-video-camera / fa-file-text /
             fa-question-circle
         [2] h3 > a title+href (series rows: <a> WITHOUT class=pjaxer)
         [3] author/rabbi link
         [4] duration ("כ - 70 דק'") or series size ("70 שיעורים")
         [5] download links (div.lessonLinks a[href])
    The table view is the superset — items are taken from it, in order.
  * There is NO pagination of any kind. Verified: ?page/pg/skip/start/
    pageNumber/p/offset are all ignored by the server; the whole site JS
    bundle (DependencyHandler.axd, 7KB) contains no ajax/load-more — pjax is
    only used to open single-lesson modals. Repeated fetches are
    deterministic (same block/row counts and byte size). => n_pages == 1.
  * The (N) expected count in the nav does NOT equal the number of rows the
    page shows: the page aggregates series into a single row. We therefore
    report both raw row count and an "effective" lesson count
    (= lessons + שו"ת + sum of series sizes) vs expected.

Re-runnable / idempotent: cached pages are reused when they look complete.
"""

import html as html_mod
import json
import re
import sys
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ONEONE = Path("/Users/srhlq/Downloads/saar-workspace/bneyzion/scripts/parity/oneone")
CACHE = ONEONE / "cache"
HOME_HTML = ONEONE / "old_home_20260611.html"
OUT_JSON = ONEONE / "old_rabbi_pages.json"

BASE = "https://www.bneyzion.co.il"
RABBIS_PATH = "/מאגר-השיעורים-והמאמרים/רבנים"
CONCURRENCY = 6
RETRIES = 3  # 1 try + 2 retries
TIMEOUT = 90

NIQQUD = re.compile(r"[֑-ׇ]")


def norm_he(s: str) -> str:
    """Hebrew normalization for matching: NFC, strip niqqud, collapse ws, lower."""
    s = unicodedata.normalize("NFC", s)
    s = NIQQUD.sub("", s)
    s = re.sub(r"\s+", " ", s).strip().lower()
    return s


def safe_filename(name: str) -> str:
    return re.sub(r'[^\w֐-׿()-]+', "_", name).strip("_")


# ---------------------------------------------------------------- nav parse
def parse_home_rabbis():
    """Parse the 3rd sideNav (ravSwiper) -> [{name, url, expected_count}]."""
    raw = HOME_HTML.read_text(encoding="utf-8", errors="replace")
    i = raw.find('ravSwiper')
    if i == -1:
        sys.exit("FATAL: ravSwiper not found in home HTML")
    soup = BeautifulSoup(raw[i - 200: i + 200000], "lxml")
    nav = soup.select_one("nav.sideNav ul.nav.cats")
    rabbis = []
    for a in nav.select("li > a[href]"):
        href = a.get("href", "")
        if "rav=" not in href:
            continue
        label = a.get_text(" ", strip=True)
        m = re.search(r"\((\d+)\)\s*$", label)
        expected = int(m.group(1)) if m else None
        name = re.sub(r"\s*\(\d+\)\s*$", "", label).strip()
        # name as used in the query param (after the literal 'rav=')
        qname = html_mod.unescape(href.split("rav=", 1)[1])
        rabbis.append({
            "name": name,
            "rav_param": qname,
            "url": BASE + html_mod.unescape(href),
            "expected_count": expected,
        })
    return rabbis


# ---------------------------------------------------------------- fetching
def make_session():
    s = requests.Session()
    s.trust_env = False                      # NetSpark MITM bypass
    s.proxies = {"http": "", "https": ""}
    s.headers["User-Agent"] = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                               "AppleWebKit/537.36 parity-scraper")
    return s


def page_looks_complete(text: str) -> bool:
    return text.rstrip().endswith("</html>") and "categoryTable" in text


def fetch_rabbi(session, rav_param: str, cache_file: Path) -> str:
    if cache_file.exists():
        t = cache_file.read_text(encoding="utf-8", errors="replace")
        if page_looks_complete(t):
            return t
    last_err = None
    for attempt in range(RETRIES):
        try:
            r = session.get(BASE + RABBIS_PATH, params={"rav": rav_param},
                            timeout=TIMEOUT)
            if r.status_code == 200 and page_looks_complete(r.text):
                cache_file.write_text(r.text, encoding="utf-8")
                return r.text
            last_err = f"status={r.status_code} complete={page_looks_complete(r.text)}"
        except Exception as e:  # noqa
            last_err = repr(e)
        time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"fetch failed for rav={rav_param}: {last_err}")


# ---------------------------------------------------------------- page parse
ICON2MEDIA = {
    "fa-volume-up": "audio",
    "fa-video-camera": "video",
    "fa-file-text": "text",
    "fa-file-pdf-o": "pdf",
    "fa-question-circle": "qa",
}


def parse_rabbi_page(html_text: str):
    soup = BeautifulSoup(html_text, "lxml")
    out = {}

    h1 = soup.select_one("h1")
    out["h1"] = h1.get_text(" ", strip=True) if h1 else None

    # media-type filter pills shown to the user
    out["media_filters"] = [a.get_text(" ", strip=True)
                            for a in soup.select(".secFilter .nav-pills a")]

    # ---- blocks (swiper / default) view ----
    swiper = soup.select_one(".swiper-container.categorySwiper")
    blocks_summary = {"n_blocks": 0, "n_lesson_blocks": 0, "n_series_blocks": 0}
    if swiper:
        blocks = swiper.select(".lessonBlock")
        blocks_summary["n_blocks"] = len(blocks)
        for b in blocks:
            cls = b.get("class") or []
            if "lessonSeriesBlock" in cls:
                blocks_summary["n_series_blocks"] += 1
            else:
                blocks_summary["n_lesson_blocks"] += 1
    out["blocks_view"] = blocks_summary

    # group headers: any h2/h4 between the filter bar and the table that is
    # NOT inside a lessonBlock (series blocks contain h4 "סדרת שיעורים").
    group_headers = []
    col = soup.select_one("div.col-md-9.nopadding") or soup
    for h in col.select("h2, h4"):
        if h.find_parent(class_="lessonBlock") is None and \
           h.find_parent(class_="modal") is None and \
           h.find_parent(id="askQ") is None:
            txt = h.get_text(" ", strip=True)
            if txt:
                group_headers.append(txt)
    out["group_headers_found"] = group_headers

    # ---- table (list) view — the canonical superset, ordered ----
    items = []
    table = soup.select_one(".categoryTable table")
    current_group = None  # stays None unless real group headers exist
    if table:
        for idx, tr in enumerate(table.select("tbody tr")):
            tds = tr.find_all("td", recursive=False)
            if len(tds) < 6:
                continue
            item_type = tds[0].get_text(" ", strip=True)
            icon = tds[1].select_one("i[class*='fa-']")
            media = None
            if icon:
                for c in icon.get("class", []):
                    if c in ICON2MEDIA:
                        media = ICON2MEDIA[c]
                        break
            a = tds[2].select_one("h3 a")
            title = a.get_text(" ", strip=True) if a else tds[2].get_text(" ", strip=True)
            href = a.get("href") if a else None
            promo = tds[2].select_one("span")
            author_a = tds[3].select_one("a")
            rabbi_shown = (author_a.get_text(" ", strip=True) if author_a
                           else tds[3].get_text(" ", strip=True))
            dur_raw = tds[4].get_text(" ", strip=True)
            series_count = None
            if item_type == "סדרה":
                m = re.search(r"(\d+)\s*שיעור", dur_raw)
                if m:
                    series_count = int(m.group(1))
            atts = [x.get("href") for x in tds[5].select(".lessonLinks a[href]")]
            items.append({
                "order_index": idx,
                "item_type": item_type,            # שיעור / סדרה / שו"ת
                "title": title,
                "title_norm": norm_he(title),
                "href": href,
                "rabbi_shown": rabbi_shown,
                "media": media,                    # audio/video/text/qa
                "duration_raw": dur_raw,
                "series_lesson_count": series_count,
                "promo": promo.get_text(" ", strip=True) if promo else None,
                "attachment_href": atts[0] if atts else None,
                "attachment_hrefs": atts,
                "group_header": current_group,     # no headers on rav pages
            })
    out["items"] = items

    # effective lesson count = each שיעור/שו"ת row = 1, each series = its size
    eff = 0
    for it in items:
        if it["item_type"] == "סדרה":
            eff += it["series_lesson_count"] or 1
        else:
            eff += 1
    out["effective_lesson_count"] = eff
    return out


STRUCTURE_NOTE = (
    "Old rav page = /מאגר-השיעורים-והמאמרים/רבנים?rav=<name>. Layout: breadcrumbs; "
    "<h1> with the rabbi name; a 'בחר סוג מדיה' filter bar (כל הסוגים / וידאו / אודיו / "
    "טקסט-PDF / שאלות ותשובות) plus a blocks/list view switcher; then ONE FLAT list "
    "(no group headers, single page, NO pagination — verified server ignores page/skip "
    "params and site JS has no load-more). The list is rendered twice: (a) default "
    "blocks view — a 3x2 Swiper carousel of div.lessonBlock cards (standalone lessons "
    "with title-link+author+promo+download+duration, and series cards "
    "div.lessonSeriesBlock labeled 'סדרת שיעורים' with '<N> שיעורים'); שו\"ת items are "
    "ABSENT from this view; (b) table/list view div.categoryTable — columns: סוג מדיה "
    "(שיעור/סדרה/שו\"ת + media icon), שם השיעור (h3>a; series link to the series page, "
    "lessons open a pjax modal), מאת (rabbi link), אורך (minutes, or '<N> שיעורים' for "
    "a series), להורדה (mp3/pdf links). The table is the superset and defines item "
    "order here. Series appear AGGREGATED as one row — hence the nav's expected (N) "
    "of individual lessons ≠ number of rows on the page. The NEW rabbi page must "
    "render: name header, media-type filters, and the rabbi's standalone lessons + "
    "series-as-cards (with lesson counts) + שו\"ת, flat, with downloads and durations."
)


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    rabbis = parse_home_rabbis()
    print(f"[nav] parsed {len(rabbis)} rabbis from 3rd sideNav (ravSwiper)")

    sessions = [make_session() for _ in range(CONCURRENCY)]
    results, errors = {}, {}

    def work(i_rabbi):
        i, rabbi = i_rabbi
        sess = sessions[i % CONCURRENCY]
        cf = CACHE / f"rav_{safe_filename(rabbi['name'])}.html"
        text = fetch_rabbi(sess, rabbi["rav_param"], cf)
        parsed = parse_rabbi_page(text)
        return rabbi, parsed, cf.name

    with ThreadPoolExecutor(max_workers=CONCURRENCY) as ex:
        futs = {ex.submit(work, (i, r)): r for i, r in enumerate(rabbis)}
        done = 0
        for fut in as_completed(futs):
            rabbi = futs[fut]
            done += 1
            try:
                rabbi, parsed, cache_name = fut.result()
            except Exception as e:  # noqa
                errors[rabbi["name"]] = repr(e)
                print(f"  [{done}/{len(rabbis)}] ERROR {rabbi['name']}: {e}")
                continue
            entry = {
                "url": rabbi["url"],
                "rav_param": rabbi["rav_param"],
                "expected_count": rabbi["expected_count"],
                "h1": parsed["h1"],
                "n_pages": 1,  # verified: no pagination exists on the old site
                "media_filters": parsed["media_filters"],
                "blocks_view": parsed["blocks_view"],
                "group_headers_found": parsed["group_headers_found"],
                "n_items": len(parsed["items"]),
                "effective_lesson_count": parsed["effective_lesson_count"],
                "items": parsed["items"],
                "cache_file": f"cache/{cache_name}",
            }
            results[rabbi["name"]] = entry
            if done % 20 == 0 or done == len(rabbis):
                print(f"  [{done}/{len(rabbis)}] ...")

    # structure notes only for the first 3 rabbis (per task spec)
    noted = 0
    for rabbi in rabbis:
        if rabbi["name"] in results and noted < 3:
            results[rabbi["name"]]["structure_notes"] = STRUCTURE_NOTE
            noted += 1

    # ---- verification ----
    mismatch_rows, mismatch_eff = [], []
    for rabbi in rabbis:
        name = rabbi["name"]
        if name not in results:
            continue
        e = results[name]
        exp = e["expected_count"]
        if exp is not None and e["n_items"] != exp:
            mismatch_rows.append((name, exp, e["n_items"], e["effective_lesson_count"]))
        if exp is not None and e["effective_lesson_count"] != exp:
            mismatch_eff.append((name, exp, e["effective_lesson_count"]))

    summary = {
        "scraped_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "n_rabbis_in_nav": len(rabbis),
        "n_rabbis_scraped": len(results),
        "n_fetch_errors": len(errors),
        "fetch_errors": errors,
        "sum_expected": sum(r["expected_count"] or 0 for r in rabbis),
        "sum_items_rows": sum(e["n_items"] for e in results.values()),
        "sum_effective_lessons": sum(e["effective_lesson_count"] for e in results.values()),
        "n_rabbis_rows_neq_expected": len(mismatch_rows),
        "n_rabbis_effective_neq_expected": len(mismatch_eff),
        "pagination_finding": ("NO pagination exists on old rav pages: server ignores "
                               "page/pg/skip/start/pageNumber/p/offset; site JS bundle "
                               "has no ajax list loading (pjax = lesson modals only); "
                               "repeated fetches deterministic. n_pages=1 everywhere."),
        "count_semantics_finding": ("nav (N) counts individual lessons incl. those inside "
                                    "series; the rav page row count aggregates each series "
                                    "into ONE row, so rows != N by design. "
                                    "effective_lesson_count = lessons + שו\"ת + Σ series "
                                    "sizes approximates N but still differs for some "
                                    "rabbis (see mismatches)."),
        "rabbis_rows_neq_expected": [
            {"rabbi": n, "expected": x, "rows_shown": r, "effective": ef}
            for n, x, r, ef in sorted(mismatch_rows, key=lambda t: -(t[1] or 0))],
        "rabbis_effective_neq_expected": [
            {"rabbi": n, "expected": x, "effective": ef}
            for n, x, ef in sorted(mismatch_eff, key=lambda t: -(t[1] or 0))],
    }

    # top level = {rabbi_name: {...}} per spec; "_summary" holds metadata
    # (underscore prefix cannot collide with a rabbi name).
    out = {"_summary": summary}
    out.update(results)
    OUT_JSON.write_text(
        json.dumps(out, ensure_ascii=False, indent=1),
        encoding="utf-8")
    print(f"\n[out] {OUT_JSON} written")
    print(f"[verify] nav rabbis={len(rabbis)} scraped={len(results)} errors={len(errors)}")
    print(f"[verify] sum expected={summary['sum_expected']} "
          f"rows={summary['sum_items_rows']} effective={summary['sum_effective_lessons']}")
    print(f"[verify] rows!=expected for {len(mismatch_rows)} rabbis; "
          f"effective!=expected for {len(mismatch_eff)} rabbis")


if __name__ == "__main__":
    main()
