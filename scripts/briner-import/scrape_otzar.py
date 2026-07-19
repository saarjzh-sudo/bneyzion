#!/usr/bin/env python3
"""
Scrape Rabbi Yossi Briner's content ("veshinantam" / Otzar HaTorah) from otzar.org.il.

Two categories (per Rav Yoav's mapping, 19.7.2026):
  1. /בית-מדרש/אוצר-מפרשי-התנ-ך      (Otzar Mefarshei HaTanach — articles)
  2. /בית-מדרש/אוצר-המקרא-על-התנך    (Otzar HaMikra al HaTanach — per-chapter commentary)

Phase A: paginate each category root (?page=N, 10 lessonBlocks/page) -> item list.
Phase B: fetch each article page -> breadcrumb category path, lessonContent HTML,
         short share id, author, date, players/attachments.

Idempotent: articles already present in articles.jsonl (by url) are skipped.
Checkpoints: articles.jsonl appended after every article; catalog written at end.
Rate limit: ~1.4 req/s.
"""
import json, os, re, sys, time, html as htmllib
import urllib.request, urllib.parse

BASE = "https://www.otzar.org.il"
HERE = os.path.dirname(os.path.abspath(__file__))
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
SLEEP = 0.7

CATEGORIES = [
    ("otzar-mefarshei-hatanach", "/בית-מדרש/אוצר-מפרשי-התנ-ך/"),
    ("otzar-hamikra-al-hatanach", "/בית-מדרש/אוצר-המקרא-על-התנך/"),
]

ART_PATH = os.path.join(HERE, "articles.jsonl")
CAT_PATH = os.path.join(HERE, "otzar_catalog.json")
LOG_PATH = os.path.join(HERE, "scrape_log.jsonl")


def log(obj):
    obj["ts"] = time.strftime("%Y-%m-%dT%H:%M:%S")
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")
    print(json.dumps(obj, ensure_ascii=False), flush=True)


def fetch(path_or_url, retries=3):
    url = path_or_url if path_or_url.startswith("http") else BASE + urllib.parse.quote(path_or_url, safe="/?=&%")
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    last = None
    for i in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=45) as r:
                return r.read().decode("utf-8", errors="replace")
        except Exception as e:
            last = e
            time.sleep(2 + 2 * i)
    raise RuntimeError(f"fetch failed {url}: {last}")


BLOCK_RE = re.compile(
    r'<div class="lessonBlock[^"]*">.*?<a href="([^"]+)" title="([^"]*)">\s*<h3>(.*?)</h3>.*?'
    r'(?:<div class="spoiler">(.*?)</div>)?\s*<div class="lessonInfo',
    re.S,
)


def clean(s):
    if s is None:
        return ""
    return htmllib.unescape(re.sub(r"<[^>]+>", "", s)).strip()


def list_category(cat_key, cat_root):
    items, page = [], 1
    while True:
        url = cat_root + (f"?page={page}" if page > 1 else "")
        t = fetch(url)
        blocks = BLOCK_RE.findall(t)
        if not blocks:
            break
        for href, title_attr, h3, spoiler in blocks:
            items.append({
                "category_key": cat_key,
                "url": urllib.parse.unquote(href),
                "title": clean(h3) or clean(title_attr),
                "spoiler": clean(spoiler),
            })
        # highest page link visible
        pages = [int(p) for p in re.findall(r"\?page=(\d+)", t)]
        max_seen = max(pages) if pages else page
        log({"phase": "list", "cat": cat_key, "page": page, "items": len(blocks), "max_seen": max_seen})
        if page >= max_seen:
            break
        page += 1
        time.sleep(SLEEP)
    # dedup by url
    seen, out = set(), []
    for it in items:
        if it["url"] in seen:
            continue
        seen.add(it["url"])
        out.append(it)
    return out


BREAD_RE = re.compile(r'<ul class="breadcrumb[^"]*">(.*?)</ul>', re.S)
CRUMB_RE = re.compile(r"<li[^>]*>(?:<a[^>]*>)?(.*?)(?:</a>)?</li>", re.S)
CONTENT_RE = re.compile(r'<div class="lessonContent">(.*?)</div>\s*(?:<div class="row no-print|<div class="pt-4|</div>\s*</div>\s*</div>\s*</section>)', re.S)
SHARE_RE = re.compile(r'value="https://www\.otzar\.org\.il/(\d+)"')
AUTHOR_RE = re.compile(r'fa-user pr-1"></i>\s*(.*?)\s*</span>', re.S)
DATE_RE = re.compile(r'<span>([^<>]{2,40})</span>\s*<span class="lessonTools')
H1_RE = re.compile(r"<h1[^>]*>(.*?)</h1>", re.S)
TEASER_RE = re.compile(r'id="printArea">.*?<h3>(.*?)</h3>', re.S)
AUDIO_RE = re.compile(r'<div class="players">(.*?)</div>', re.S)
PDF_RE = re.compile(r'href="([^"]+\.pdf[^"]*)"', re.I)
MEDIA_RE = re.compile(r'(?:src|href)="(/media/[^"]+)"')


def parse_article(url, t):
    art = {"url": url}
    m = H1_RE.search(t)
    art["title"] = clean(m.group(1)) if m else None
    m = BREAD_RE.search(t)
    crumbs = [clean(c) for c in CRUMB_RE.findall(m.group(1))] if m else []
    crumbs = [c for c in crumbs if c and c not in ("דף הבית", "בית מדרש")]
    art["breadcrumb"] = crumbs  # [top-category, ...subcats, title]
    m = SHARE_RE.search(t)
    art["otzar_id"] = m.group(1) if m else None
    m = AUTHOR_RE.search(t)
    art["author"] = clean(m.group(1)) if m else None
    m = DATE_RE.search(t)
    art["date_label"] = clean(m.group(1)) if m else None
    m = TEASER_RE.search(t)
    art["teaser"] = clean(m.group(1)) if m else None
    # main content: greedy capture from lessonContent to prevNext/footer area
    i = t.find('<div class="lessonContent">')
    if i >= 0:
        j = t.find('id="disqus', i)
        if j < 0:
            j = t.find("<footer", i)
        seg = t[i + len('<div class="lessonContent">'):j]
        # trim trailing nav/buttons
        k = seg.find('prevNextLessonBtn')
        if k > 0:
            seg = seg[:seg.rfind('<div', 0, k)] if seg.rfind('<div', 0, k) > 0 else seg
        art["content_html"] = seg.strip()
    else:
        art["content_html"] = None
    m = AUDIO_RE.search(t)
    players = m.group(1).strip() if m else ""
    art["audio_srcs"] = re.findall(r'(?:src|data-src)="([^"]+)"', players)
    art["pdf_links"] = sorted(set(PDF_RE.findall(t)))
    art["media_links"] = sorted(set(MEDIA_RE.findall(t)))[:20]
    return art


def main():
    # Phase A
    catalog = {}
    for key, root in CATEGORIES:
        items = list_category(key, root)
        catalog[key] = items
        log({"phase": "list_done", "cat": key, "total": len(items)})
        time.sleep(SLEEP)
    all_items = [it for k in catalog for it in catalog[k]]
    with open(CAT_PATH, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=1)
    log({"phase": "catalog_written", "total": len(all_items)})

    # Phase B — idempotent
    done = set()
    if os.path.exists(ART_PATH):
        with open(ART_PATH, encoding="utf-8") as f:
            for line in f:
                try:
                    done.add(json.loads(line)["url"])
                except Exception:
                    pass
    todo = [it for it in all_items if it["url"] not in done]
    log({"phase": "articles_start", "todo": len(todo), "already": len(done)})
    for n, it in enumerate(todo, 1):
        try:
            t = fetch(it["url"])
            art = parse_article(it["url"], t)
            art["category_key"] = it["category_key"]
            art["spoiler"] = it["spoiler"]
            with open(ART_PATH, "a", encoding="utf-8") as f:
                f.write(json.dumps(art, ensure_ascii=False) + "\n")
        except Exception as e:
            log({"phase": "article_error", "url": it["url"], "error": str(e)})
        if n % 20 == 0:
            log({"phase": "articles_progress", "done": n, "of": len(todo)})
        time.sleep(SLEEP)
    log({"phase": "done", "fetched": len(todo)})


if __name__ == "__main__":
    main()
