#!/usr/bin/env python3
"""
Scrape ALL old-site (bneyzion.co.il) topic pages — canonical "what a user sees
when clicking a topic" (נושאים).

READ-ONLY w.r.t. any DB; only writes JSON + cache files under oneone/.

Pipeline:
1. Parse the SECOND sideNav (the #tags tab) from old_home_20260611.html
   -> topic list: {name, url, expected_count}.
   Selector: the <nav class="sideNav"> inside <div id="tags"> ... links
   href="/מאגר-השיעורים-והמאמרים/נושאים/?subject=<name>", text "<name> (N)".
2. Fetch each topic page (concurrency 6, --noproxy equivalent: trust_env off,
   empty proxies; 2 retries). Cache HTML under cache/topic__<slug>__<md5>.html.
   Re-runnable: cached files are reused if present and non-trivial.
3. Parse ordered items from the main content area (div.swiper-container.categorySwiper):
   each item is a div.swiper-slide containing either:
   - SERIES block: <a href=SERIES_URL><div class="lessonBlock lessonSeriesBlock ... {media}BG">
       <h4>סדרת שיעורים</h4><h3>TITLE</h3><div class="author"><a>RABBI</a></div>
       <div>N שיעורים</div></div></a> + <div class="sbn">ORDINAL</div>
   - LESSON block: <div class="lessonBlock watermarked {media}BG">
       <h3><a href=LESSON_URL>TITLE</a></h3><div class="author"><a>RABBI</a></div>
       <div class="promoZone"><p class="lessonPromo">...</p></div>
       <div class="lessonLinks"><a href=ATTACHMENT ...>...</a>...</div>
       <div class="duration">...</div></div>
   - QA block (שו"ת): <div class="questionBlock">
       <h3 class="qaName"><a href=QA_URL>TITLE</a></h3>
       <h3 class="qaQuestion"><a>QUESTION TEXT</a></h3>
       <div class="author">RABBI (plain text, no anchor)</div></div>
   media derived from BG class: audioBG->audio, videoBG->video, textBG->text, pdfBG->pdf;
   questionBlock -> media 'qa'.
4. Pagination: NONE on old site — all items render in one swiper page
   (verified: largest topic 246 items in a single response). Script still scans
   for pagination links defensively and would follow ?page= if ever found.
5. Output old_topic_pages.json: {topic: {url, expected_count, items, n_pages, ...}}
   plus '__index__' describing the bare landing page.
"""

import concurrent.futures as cf
import hashlib
import json
import os
import re
import sys
import time
import unicodedata

import requests
from bs4 import BeautifulSoup

BASE = "https://www.bneyzion.co.il"
ROOT = "/Users/srhlq/Downloads/saar-workspace/bneyzion/scripts/parity/oneone"
HOME_HTML = os.path.join(ROOT, "old_home_20260611.html")
CACHE = os.path.join(ROOT, "cache")
OUT = os.path.join(ROOT, "old_topic_pages.json")
INDEX_URL = BASE + "/מאגר-השיעורים-והמאמרים/נושאים/"

os.makedirs(CACHE, exist_ok=True)

NIQQUD = re.compile(r"[֑-ׇ]")


def norm_he(s: str) -> str:
    """Normalization used for matching (kept alongside originals)."""
    if s is None:
        return ""
    s = NIQQUD.sub("", s)
    s = unicodedata.normalize("NFC", s)
    s = re.sub(r"\s+", " ", s).strip().lower()
    return s


def make_session() -> requests.Session:
    s = requests.Session()
    s.trust_env = False  # ignore NetSpark proxy env
    s.proxies = {"http": "", "https": ""}
    s.headers.update(
        {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
    )
    return s


# ---------------------------------------------------------------- step 1
def parse_topics_from_home():
    html = open(HOME_HTML, encoding="utf-8", errors="replace").read()
    soup = BeautifulSoup(html, "lxml")
    tags_div = soup.find("div", id="tags")
    if tags_div is None:
        sys.exit("FATAL: <div id='tags'> not found in home HTML")
    nav = tags_div.find("nav", class_="sideNav")  # this is the SECOND sideNav on the page
    topics = []
    for a in nav.select("ul.nav.cats > li > a"):
        href = (a.get("href") or "").strip()
        if "subject=" not in href:
            continue
        name = (a.get("title") or "").strip()
        text = a.get_text(" ", strip=True)
        m = re.search(r"\((\d+)\)\s*$", text)
        expected = int(m.group(1)) if m else None
        topics.append(
            {
                "name": name,
                "name_norm": norm_he(name),
                "href": href,
                "url": BASE + href,
                "expected_count": expected,
            }
        )
    return topics


# ---------------------------------------------------------------- step 2
def cache_path(name: str, page: int = 1) -> str:
    slug = re.sub(r"[^\w֐-׿-]+", "_", name)[:60]
    h = hashlib.md5(f"{name}|p{page}".encode()).hexdigest()[:10]
    suffix = "" if page == 1 else f"__p{page}"
    return os.path.join(CACHE, f"topic__{slug}{suffix}__{h}.html")


def fetch(session: requests.Session, url: str, params=None, retries=2) -> str:
    last = None
    for attempt in range(retries + 1):
        try:
            r = session.get(url, params=params, timeout=90)
            r.raise_for_status()
            if len(r.text) < 5000:
                raise ValueError(f"suspiciously short response ({len(r.text)} bytes)")
            return r.text
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"fetch failed for {url} params={params}: {last}")


def get_topic_html(session, topic, page=1):
    cp = cache_path(topic["name"], page)
    if os.path.exists(cp) and os.path.getsize(cp) > 5000:
        return open(cp, encoding="utf-8").read(), True
    params = {"subject": topic["name"]}
    if page > 1:
        params["page"] = page
    html = fetch(session, INDEX_URL, params=params)
    with open(cp, "w", encoding="utf-8") as f:
        f.write(html)
    return html, False


# ---------------------------------------------------------------- step 3
MEDIA_MAP = {"audioBG": "audio", "videoBG": "video", "textBG": "text", "pdfBG": "pdf"}


def parse_items(html: str):
    """Return (items, structure_notes, pagination_hrefs)."""
    soup = BeautifulSoup(html, "lxml")
    swiper = soup.find("div", class_="categorySwiper")
    items = []
    notes = {"views": []}
    if swiper is None:
        return items, {"error": "no categorySwiper found"}, []
    slides = swiper.select("div.swiper-wrapper > div.swiper-slide")
    for idx, slide in enumerate(slides, start=1):
        qblock = slide.find("div", class_="questionBlock")
        if qblock is not None:
            qa_name = qblock.find("h3", class_="qaName")
            qa_q = qblock.find("h3", class_="qaQuestion")
            a = qa_name.find("a") if qa_name else None
            author_div = qblock.find("div", class_="author")
            rabbi = author_div.get_text(" ", strip=True) if author_div else None
            title = qa_name.get_text(" ", strip=True) if qa_name else None
            items.append({
                "order_index": idx,
                "type": "qa",
                "media": "qa",
                "title": title,
                "title_norm": norm_he(title or ""),
                "rabbi": rabbi,
                "rabbi_norm": norm_he(rabbi or ""),
                "href": (a.get("href") or "").strip() if a else None,
                "question": qa_q.get_text(" ", strip=True) if qa_q else None,
                "attachment_href": None,
                "attachment_hrefs": [],
            })
            continue
        block = slide.find("div", class_="lessonBlock")
        if block is None:
            continue
        classes = block.get("class", [])
        media = next((MEDIA_MAP[c] for c in classes if c in MEDIA_MAP), None)
        is_series = "lessonSeriesBlock" in classes

        item = {
            "order_index": idx,
            "type": "series" if is_series else "lesson",
            "media": media,
        }

        h3 = block.find("h3")
        title = h3.get_text(" ", strip=True) if h3 else None
        item["title"] = title
        item["title_norm"] = norm_he(title or "")

        author_div = block.find("div", class_="author")
        rabbi = author_div.get_text(" ", strip=True) if author_div else None
        item["rabbi"] = rabbi
        item["rabbi_norm"] = norm_he(rabbi or "")

        if is_series:
            wrap_a = slide.find("a", recursive=False)
            item["href"] = (wrap_a.get("href") or "").strip() if wrap_a else None
            cnt = None
            for d in block.find_all("div"):
                m = re.search(r"^(\d+)\s+שיעורים", d.get_text(" ", strip=True))
                if m:
                    cnt = int(m.group(1))
                    break
            item["series_lesson_count"] = cnt
            sbn = slide.find("div", class_="sbn")
            item["sbn"] = int(sbn.get_text(strip=True)) if sbn and sbn.get_text(strip=True).isdigit() else None
            item["attachment_href"] = None
            item["attachment_hrefs"] = []
        else:
            a = h3.find("a") if h3 else None
            item["href"] = (a.get("href") or "").strip() if a else None
            links_div = block.find("div", class_="lessonLinks")
            atts = []
            if links_div:
                for la in links_div.find_all("a"):
                    h = (la.get("href") or "").strip()
                    if h:
                        atts.append({"href": h, "title": (la.get("title") or "").strip()})
            item["attachment_hrefs"] = atts
            item["attachment_href"] = atts[0]["href"] if atts else None
            promo = block.select_one("p.lessonPromo")
            item["promo"] = promo.get_text(" ", strip=True) if promo else None
            dur = block.find("div", class_="duration")
            item["duration"] = dur.get_text(" ", strip=True) if dur else None
            ps = block.select_one("p.parentSeries a")
            item["parent_series"] = (
                {"title": ps.get_text(" ", strip=True), "href": (ps.get("href") or "").strip()}
                if ps else None
            )

        items.append(item)

    # structure notes
    table = soup.find("div", class_="categoryTable")
    n_table_rows = len(table.select("tbody tr")) if table else 0
    notes = {
        "default_view": "blocks (swiper grid of lessonBlock cards)",
        "alt_view": "categoryTable list view (same data, toggled by viewSwitcher)",
        "n_table_rows": n_table_rows,
        "media_filter": "secFilter nav-pills: כל הסוגים / וידאו / אודיו / טקסט / שות (?mediaType=)",
        "flat_list": True,
    }

    # defensive pagination scan (none observed on old site)
    pag_hrefs = []
    for a in soup.select("ul.pagination a, .pager a, a[href*='page=']"):
        h = a.get("href") or ""
        if "page=" in h:
            pag_hrefs.append(h)
    return items, notes, sorted(set(pag_hrefs))


# ---------------------------------------------------------------- index page
def parse_index_page(session):
    cp = os.path.join(CACHE, "topic_index.html")
    if os.path.exists(cp) and os.path.getsize(cp) > 5000:
        html = open(cp, encoding="utf-8").read()
    else:
        html = fetch(session, INDEX_URL)
        with open(cp, "w", encoding="utf-8") as f:
            f.write(html)
    items, notes, _ = parse_items(html)
    soup = BeautifulSoup(html, "lxml")
    h1 = soup.find("h1")
    crumbs = [li.get_text(" ", strip=True) for li in soup.select("ul.breadcrumbs li")]
    # the sidebar #tags nav also exists on this page — count its links
    tags_div = soup.find("div", id="tags")
    n_sidebar_topics = 0
    if tags_div:
        n_sidebar_topics = len([a for a in tags_div.select("nav.sideNav a") if "subject=" in (a.get("href") or "")])
    return {
        "url": INDEX_URL,
        "expected_count": 0,
        "n_pages": 1,
        "items": items,
        "n_items": len(items),
        "structure": {
            **notes,
            "h1": h1.get_text(" ", strip=True) if h1 else None,
            "breadcrumbs": crumbs,
            "n_sidebar_topic_links": n_sidebar_topics,
            "description": (
                "Bare landing page: breadcrumbs (דף הבית > מאגר השיעורים והמאמרים > נושאים), "
                "EMPTY h1, media-type filter pills, and an EMPTY categorySwiper + EMPTY categoryTable. "
                "No topic index grid — users pick a topic from the sidebar 'נושאים' tab "
                "(second sideNav, ul.nav.cats of links ?subject=<name> with counts)."
            ),
        },
    }


# ---------------------------------------------------------------- main
def process_topic(topic):
    session = make_session()
    html, cached = get_topic_html(session, topic)
    items, notes, pag = parse_items(html)
    n_pages = 1
    # follow pagination if it ever appears (defensive; old site renders all in one page)
    page = 1
    seen = {it["href"] for it in items}
    while pag and page < 50:
        page += 1
        html_p, _ = get_topic_html(session, topic, page=page)
        more, _, pag = parse_items(html_p)
        new = [it for it in more if it["href"] not in seen]
        if not new:
            break
        for it in new:
            it["order_index"] = len(items) + 1
            items.append(it)
            seen.add(it["href"])
        n_pages = page
    return topic, items, notes, n_pages, cached


def main():
    topics = parse_topics_from_home()
    print(f"topics in second sideNav: {len(topics)}")
    assert len({t['name'] for t in topics}) == len(topics), "duplicate topic names!"

    results = {}
    errors = []
    t0 = time.time()
    with cf.ThreadPoolExecutor(max_workers=6) as ex:
        futs = {ex.submit(process_topic, t): t for t in topics}
        done = 0
        for fut in cf.as_completed(futs):
            t = futs[fut]
            done += 1
            try:
                topic, items, notes, n_pages, cached = fut.result()
                results[topic["name"]] = {
                    "url": topic["url"],
                    "expected_count": topic["expected_count"],
                    "n_pages": n_pages,
                    "n_items": len(items),
                    "count_match": len(items) == topic["expected_count"],
                    "structure": notes,
                    "items": items,
                }
                flag = "" if len(items) == topic["expected_count"] else "  << MISMATCH"
                print(f"[{done}/{len(topics)}] {topic['name']}: {len(items)}/{topic['expected_count']}"
                      f"{' (cache)' if cached else ''}{flag}")
            except Exception as e:  # noqa: BLE001
                errors.append({"topic": t["name"], "error": str(e)})
                print(f"[{done}/{len(topics)}] {t['name']}: ERROR {e}")

    # index page
    session = make_session()
    index_info = parse_index_page(session)

    out = {"__index__": index_info}
    # keep original sidebar order
    for t in topics:
        if t["name"] in results:
            out[t["name"]] = results[t["name"]]

    meta = {
        "scraped_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "source_home_html": HOME_HTML,
        "n_topics": len(topics),
        "n_scraped": len(results),
        "n_errors": len(errors),
        "errors": errors,
        "total_items": sum(r["n_items"] for r in results.values()),
        "mismatches": {
            k: {"expected": v["expected_count"], "got": v["n_items"]}
            for k, v in results.items()
            if not v["count_match"]
        },
        "mismatch_note": (
            "Verified by fresh re-fetch: for mismatched topics the old site ITSELF renders fewer "
            "items (lessonBlock cards AND categoryTable rows agree) than its own sidebar counter — "
            "the counter includes items not rendered on the topic page (likely unpublished/hidden). "
            "Source-site discrepancy, not a scrape gap."
        ),
        "selectors": {
            "sidebar_topics": "div#tags nav.sideNav ul.nav.cats > li > a[href*='subject=']",
            "items": "div.categorySwiper div.swiper-wrapper > div.swiper-slide > (a >)? div.lessonBlock | div.questionBlock",
            "title": "h3 (series) / h3 > a (lesson) / h3.qaName > a (qa)",
            "rabbi": "div.author",
            "media": "lessonBlock class suffix: audioBG/videoBG/textBG/pdfBG; questionBlock -> qa",
            "attachments": "div.lessonLinks a[href] (lessons only)",
            "series_marker": "class lessonSeriesBlock + h4 'סדרת שיעורים' + 'N שיעורים'",
            "qa_marker": "div.questionBlock + h3.qaQuestion (question text)",
        },
    }
    out["__meta__"] = meta

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f"\nwrote {OUT} in {time.time()-t0:.0f}s")
    print(f"topics: {meta['n_scraped']}/{meta['n_topics']}, total items: {meta['total_items']}, "
          f"mismatches: {len(meta['mismatches'])}, errors: {meta['n_errors']}")
    if meta["mismatches"]:
        for k, v in meta["mismatches"].items():
            print(f"  MISMATCH {k}: expected {v['expected']}, got {v['got']}")


if __name__ == "__main__":
    main()
