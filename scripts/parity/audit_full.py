#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
audit_full.py — SITE-WIDE 1:1 parity audit (the real "everything must exist" check).

Recursively crawls BOTH old-site repositories:
  /מאגר-השיעורים-והמאמרים/  (public lessons & articles — organised by topic)
  /מאגר-עזרי-הלמידה/        (teachers wing — learning aids)
collecting every terminal lesson/article page (H1 title + attachments), then
diffs the whole old inventory against ALL lessons in Supabase.

Output: site-wide missing / extras / attachment-health, + JSON for follow-up.
Read-only. No DB writes.

Run (slow — full crawl; use --max-pages to bound):
  env -u HTTPS_PROXY -u HTTP_PROXY NO_PROXY='*' \
    SUPABASE_MANAGEMENT_API_TOKEN=sbp_... \
    python3 scripts/parity/audit_full.py --max-pages 4000
"""
from __future__ import annotations
import argparse, html as _html, json, re, sys, time
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote, unquote

sys.path.insert(0, str(Path(__file__).parent))
from parity_engine import OLD_SITE, normalize_he, sql_query, fetch_html  # noqa: E402

REPORTS = Path(__file__).parent / "reports"
REPORTS.mkdir(exist_ok=True)
ROOTS = ["/מאגר-השיעורים-והמאמרים/", "/מאגר-עזרי-הלמידה/"]


def enc(path: str) -> str:
    # path begins and ends with "/"; encode each segment
    return "/" + "/".join(quote(p, safe="") for p in path.strip("/").split("/")) + "/"


def h1_of(html: str) -> str:
    m = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.I | re.S)
    if m:
        return _html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip()
    m = re.search(r"<title>(.*?)</title>", html, re.I | re.S)
    return _html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip() if m else ""


def media_of(html: str) -> dict:
    pdf = re.findall(r'href="(/media/[^"]+\.(?:pdf|docx?|pptx?|xlsx?))"', html, re.I)
    aud = bool(re.search(r'\.(mp3|m4a|wav)"', html, re.I) or "soundcloud" in html.lower())
    vid = bool(re.search(r'(youtube\.com|youtu\.be|vimeo)', html, re.I))
    return {"pdfs": sorted(set(OLD_SITE + p for p in pdf)), "audio": aud, "video": vid}


def links_under_roots(html: str) -> list[str]:
    out = set()
    for href in re.findall(r'href="(/[^"#?]+)"', html):
        try:
            dec = unquote(href)
        except Exception:
            dec = href
        if any(dec.startswith(r) for r in ROOTS):
            out.add(dec if dec.endswith("/") else dec + "/")
    return sorted(out)


def crawl(max_pages: int) -> list[dict]:
    seen: set[str] = set()
    queue: deque[str] = deque()
    children: dict[str, list[str]] = {}
    pages: dict[str, dict] = {}  # path -> {h1, media}
    for r in ROOTS:
        queue.append(r); seen.add(r)
    n = 0
    while queue and n < max_pages:
        path = queue.popleft()
        html = fetch_html(OLD_SITE + enc(path))
        n += 1
        if n % 50 == 0:
            print(f"  ...{n} pages, {len(pages)} content pages", flush=True)
        if not html:
            continue
        kids = [l for l in links_under_roots(html) if l.startswith(path) and l != path]
        children[path] = kids
        pages[path] = {"h1": h1_of(html), "media": media_of(html)}
        for k in kids:
            if k not in seen:
                seen.add(k); queue.append(k)
        time.sleep(0.05)
    # An item = a real lesson/article page:
    #   has its own media file  OR  (terminal page AND deep enough to be content, not a category)
    # Category/nav pages (shallow, list children, repo roots, bare book names) are excluded.
    CATEGORY_TITLES = {normalize_he(t) for t in (
        "מאגר השיעורים והמאמרים", "מאגר עזרי הלמידה", "הפטרות", "פרשת השבוע",
        "תורה", "נביאים", "כתובים", "בראשית", "שמות", "ויקרא", "במדבר", "דברים",
    )}
    items = []
    for path, info in pages.items():
        depth = len([s for s in path.strip("/").split("/")])  # segments incl. repo root
        is_terminal = not children.get(path)
        has_media = bool(info["media"]["pdfs"] or info["media"]["audio"] or info["media"]["video"])
        title = info["h1"] or unquote(path.rstrip("/").split("/")[-1]).replace("-", " ")
        tnorm = normalize_he(title)
        if not tnorm or tnorm in CATEGORY_TITLES:
            continue
        if has_media or (is_terminal and depth >= 4):
            items.append({"title": title, "url": OLD_SITE + enc(path),
                          "repo": "teachers" if "עזרי-הלמידה" in path else "public",
                          "depth": depth, "pdfs": info["media"]["pdfs"],
                          "audio": info["media"]["audio"], "video": info["media"]["video"]})
    return items, n


def new_all() -> list[dict]:
    return sql_query("""
        SELECT l.id, l.title, l.attachment_url, l.audio_url, l.video_url, l.audience_tags, l.status
        FROM lessons l;
    """)


def build_index(items: list[dict], key="title"):
    idx = {}
    for it in items:
        idx.setdefault(normalize_he(it.get(key, "")), []).append(it)
    return idx


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-pages", type=int, default=4000)
    args = ap.parse_args()

    print(f"=== SITE-WIDE parity audit (max {args.max_pages} pages) ===\n")
    print("שלב A — crawl גלובלי של שני המאגרים הישנים...")
    old, crawled = crawl(args.max_pages)
    print(f"  נסרקו {crawled} עמודים → {len(old)} פריטי תוכן ישנים\n")

    print("שלב B — כל השיעורים בחדש (Supabase)...")
    new = new_all()
    print(f"  {len(new)} שיעורים בחדש\n")

    new_idx = build_index(new, "title")
    # MISSING: old item whose normalized title has no new lesson
    missing = []
    for it in old:
        nt = normalize_he(it["title"])
        if not nt:
            continue
        hit = new_idx.get(nt)
        if not hit:
            # try prefix-14 fallback against all new keys
            hit = next((v for k, v in new_idx.items()
                        if len(nt) >= 6 and len(k) >= 6 and nt[:14] == k[:14]), None)
        if not hit:
            missing.append(it)

    # attachment health on new side (Rule 13)
    on_old = [n["title"] for n in new if (n.get("attachment_url") or "").find("bneyzion.co.il") >= 0]

    parity = round(100 * (len(old) - len(missing)) / max(1, len(old)), 1)
    print("=" * 50)
    print("  דוח PARITY — האתר כולו")
    print("=" * 50)
    print(f"  פריטי תוכן בישן (נסרקו):  {len(old)}")
    print(f"  שיעורים בחדש:             {len(new)}")
    print(f"  נמצאו בחדש:               {len(old) - len(missing)}  ({parity}%)")
    print(f"  ⚠️ חוסרים (בישן, אין בחדש): {len(missing)}")
    print(f"  ⚠️ attachments על האתר הישן (Rule 13): {len(on_old)}")
    print("=" * 50)
    by_repo = {"public": 0, "teachers": 0}
    for m in missing:
        by_repo[m["repo"]] = by_repo.get(m["repo"], 0) + 1
    print(f"  חוסרים לפי מאגר: ציבורי {by_repo['public']} | מורים {by_repo['teachers']}")
    if missing[:12]:
        print("\n  דוגמת חוסרים:")
        for m in missing[:12]:
            print(f"   - [{m['repo']}] {m['title']}")

    out = REPORTS / f"parity-FULL-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M')}.json"
    out.write_text(json.dumps({
        "crawled_pages": crawled, "old_items": len(old), "new_lessons": len(new),
        "found": len(old) - len(missing), "parity_pct": parity,
        "missing": missing, "attachments_on_old_site": on_old,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nנשמר: {out}")


if __name__ == "__main__":
    main()
