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


STATE = Path(__file__).parent / "audit_full_state.json"


def _fetch(path: str) -> str | None:
    import subprocess
    try:
        r = subprocess.run(["curl", "--noproxy", "*", "-sL", "--max-time", "25",
                            "-A", "Mozilla/5.0", OLD_SITE + enc(path)],
                           capture_output=True, timeout=30)
    except Exception:
        return None
    html = r.stdout.decode("utf-8", errors="replace")
    if not html or len(html) < 200 or "Page not found" in html:
        return None
    return html


def _save_state(seen, frontier, pages, children, n):
    STATE.write_text(json.dumps({
        "seen": list(seen), "frontier": list(frontier),
        "pages": pages, "children": children, "n": n,
    }, ensure_ascii=False), encoding="utf-8")


def _load_state():
    d = json.loads(STATE.read_text(encoding="utf-8"))
    return set(d["seen"]), deque(d["frontier"]), d["pages"], d["children"], d.get("n", 0)


def build_items(pages: dict, children: dict) -> list[dict]:
    """Filter crawled pages → real lesson/article items (exclude category/nav pages)."""
    CATEGORY_TITLES = {normalize_he(t) for t in (
        "מאגר השיעורים והמאמרים", "מאגר עזרי הלמידה", "הפטרות", "פרשת השבוע",
        "תורה", "נביאים", "כתובים", "בראשית", "שמות", "ויקרא", "במדבר", "דברים",
    )}
    items = []
    for path, info in pages.items():
        depth = len([s for s in path.strip("/").split("/")])
        is_terminal = not children.get(path)
        media = info.get("media", {})
        has_media = bool(media.get("pdfs") or media.get("audio") or media.get("video"))
        title = info.get("h1") or unquote(path.rstrip("/").split("/")[-1]).replace("-", " ")
        tnorm = normalize_he(title)
        if not tnorm or tnorm in CATEGORY_TITLES:
            continue
        if has_media or (is_terminal and depth >= 4):
            items.append({"title": title, "url": OLD_SITE + enc(path),
                          "repo": "teachers" if "עזרי-הלמידה" in path else "public",
                          "depth": depth, "pdfs": media.get("pdfs", []),
                          "audio": media.get("audio", False), "video": media.get("video", False)})
    return items


def crawl(max_pages: int, resume: bool = False, workers: int = 8):
    """Concurrent BFS over both repos, checkpointed to disk so it survives kills.
    Returns (items, pages_done, complete: bool)."""
    from concurrent.futures import ThreadPoolExecutor
    if resume and STATE.exists():
        seen, frontier, pages, children, n = _load_state()
        print(f"  resume: {n} עמודים, {len(frontier)} בתור, {len(pages)} נשמרו", flush=True)
    else:
        seen, frontier, pages, children, n = set(), deque(), {}, {}, 0
        for r in ROOTS:
            seen.add(r); frontier.append(r)
    budget = max_pages
    with ThreadPoolExecutor(max_workers=workers) as ex:
        while frontier and budget > 0:
            batch = [frontier.popleft() for _ in range(min(workers, len(frontier)))]
            for path, html in ex.map(lambda p: (p, _fetch(p)), batch):
                n += 1; budget -= 1
                if not html:
                    pages[path] = {"h1": "", "media": {"pdfs": [], "audio": False, "video": False}}
                    children[path] = []
                    continue
                kids = [l for l in links_under_roots(html) if l.startswith(path) and l != path]
                children[path] = kids
                pages[path] = {"h1": h1_of(html), "media": media_of(html)}
                for k in kids:
                    if k not in seen:
                        seen.add(k); frontier.append(k)
            if n % 100 < workers:
                _save_state(seen, frontier, pages, children, n)
                print(f"  ...{n} עמודים, {len(frontier)} בתור, {len(pages)} נשמרו", flush=True)
    _save_state(seen, frontier, pages, children, n)
    complete = not frontier
    return build_items(pages, children), n, complete


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
    ap.add_argument("--max-pages", type=int, default=4000,
                    help="עמודים לסבב הנוכחי (resume ממשיך מהמצב השמור)")
    ap.add_argument("--resume", action="store_true", help="המשך מה-checkpoint")
    ap.add_argument("--workers", type=int, default=8)
    args = ap.parse_args()

    print(f"=== SITE-WIDE parity audit (batch {args.max_pages} pages, resume={args.resume}) ===\n")
    print("שלב A — crawl גלובלי של שני המאגרים הישנים...")
    old, crawled, complete = crawl(args.max_pages, resume=args.resume, workers=args.workers)
    status = "הושלם ✓" if complete else "חלקי — הרץ שוב עם --resume"
    print(f"  נסרקו {crawled} עמודים (סבב זה) → {len(old)} פריטי תוכן · crawl {status}\n")

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

    if not complete:
        print("\n  ⚠️ ה-crawl עוד לא הושלם — הרץ שוב עם --resume להמשך. המספרים חלקיים.")
    out = REPORTS / f"parity-FULL-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M')}.json"
    out.write_text(json.dumps({
        "crawl_complete": complete, "crawled_pages": crawled,
        "old_items": len(old), "new_lessons": len(new),
        "found": len(old) - len(missing), "parity_pct": parity,
        "missing": missing, "attachments_on_old_site": on_old,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nנשמר: {out}")


if __name__ == "__main__":
    main()
