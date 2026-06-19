#!/usr/bin/env python3
"""
series_lesson_listing.py — 1:1 lesson list INSIDE each series (Yoav, 17.6.2026).

The book listing (public_book_listing.py) fixed WHICH series/lessons appear on a category
page. But Yoav found the contents INSIDE a series are also wrong: e.g. "הרב קשתיאל על פרשיות
שמות" shows 24 lessons (old=23) and the extra one carries Kashtiel's title but ABINER's audio
(a corrupted migration duplicate). And whole-Torah series ("לשון הקודש בפרשה") show all 149
lessons unscoped, vs the per-book subset the old series page showed.

Fix = extend the proven allow-list ONE LEVEL DOWN. For each series we scrape its OLD series
page (each sub_link in old_listings carries its url) → ordered lessons, each with an mp3
basename. We match every old lesson to its canonical DB lesson by AUDIO BASENAME (the golden
key — survives rehosting, and instantly rejects the wrong-audio intruder), title as fallback.
We write an ordered allow-list to teacher_listing_items scope='series_lessons', key=<db
series_id>. The series page renders from it (useSeriesLessonListing); intruders are excluded
by construction, whole-Torah series are scoped to exactly what the old page showed.

Usage:
  python3 series_lesson_listing.py --book שמות [--apply] [--only "הרב קשתיאל..."] [--out plan.json]
"""
import sys, os, json, re, time, argparse, subprocess, urllib.parse, html as _html
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import sbq
from teachers_reconcile import norm, esc

def q(sql, _tries=8):
    """Resilient SQL: retry ANY transient infra error (incl 'connection termination'/'reset'/
       'upstream'/502/503/timeout) with backoff; return [] after exhausting tries (never crash
       a long scrape run mid-way)."""
    last = ""
    for i in range(_tries):
        out = sbq.run(sql)
        try:
            d = json.loads(out)
        except Exception:
            last = (out or "")[:160]; time.sleep(1.5 * (i + 1)); continue
        if isinstance(d, dict) and d.get("message"):
            last = json.dumps(d, ensure_ascii=False)[:160]
            time.sleep(1.5 * (i + 1)); continue   # treat all API errors as transient → retry
        return d
    print("   [q] gave up:", last)
    return []

OLD_FILES = ["oneone/old_listings_torah_ketuvim.json", "oneone/old_listings_neviim_moadim.json"]

def fetch(url, _tries=3):
    """GET old-site HTML via curl (handles Hebrew URLs + redirects), NetSpark-safe."""
    env = dict(os.environ)
    for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy"): env.pop(k, None)
    env["NO_PROXY"] = "*"
    last = ""
    for i in range(_tries):
        p = subprocess.run(["curl","-sL","--noproxy","*","-A","Mozilla/5.0 parity",
            "--max-time","45", url], capture_output=True, text=True, env=env)
        if p.returncode == 0 and p.stdout and len(p.stdout) > 500:
            return p.stdout
        last = f"rc={p.returncode} len={len(p.stdout or '')}"
        time.sleep(2 * (i + 1))
    print("   fetch failed:", url[:70], last)
    return ""

def parse_old_series(html):
    """Ordered [{title, audio}] from old series-page lessonBlocks."""
    blocks = re.split(r'(?=<div[^>]*lessonBlock)', html)
    out = []
    for b in blocks:
        if "lessonBlock" not in b:
            continue
        mt = re.search(r'<h3[^>]*>(.*?)</h3>', b, re.S)
        title = _html.unescape(re.sub(r'<[^>]+>', '', mt.group(1))).strip() if mt else None
        mm = re.search(r'https?://[^"\'\s]+\.mp3', b)
        audio = urllib.parse.unquote(mm.group(0).split('/')[-1]).lower() if mm else None
        if title:
            out.append({"order_index": len(out), "title": title, "audio": audio})
    return out

def old_sublinks(book):
    """{order_index: {title,url}} for the book's series rows — unified across both formats."""
    import old_listing
    return old_listing.series_urls(book)

def db_series_for_book(book):
    """The public_book listing's series rows: [(sort_order, series_id, title)]."""
    rows = q(f"""SELECT ti.sort_order, ti.series_id, s.title
        FROM teacher_listing_items ti JOIN series s ON s.id=ti.series_id
        WHERE ti.scope='public_book' AND ti.key='{esc(book)}' AND ti.kind='lesson' IS FALSE
          AND ti.kind='series' ORDER BY ti.sort_order""")
    return rows

def match_lesson(db_series_id, old_lesson):
    """Resolve an old lesson → canonical DB lesson id. AUDIO basename first (golden key),
       then title within the series, then title globally (non-teacher published)."""
    audio = old_lesson.get("audio")
    if audio:
        a = esc(audio)
        # within-series first (fast, indexed by series_id) — the common case
        rows = q(f"""SELECT id FROM lessons WHERE series_id='{esc(db_series_id)}' AND status='published'
            AND (audio_url ILIKE '%{a}%' OR legacy_attachment_url ILIKE '%{a}%') LIMIT 1""")
        if isinstance(rows, list) and rows:
            return rows[0]["id"], "audio_in_series"
        # else any non-teacher published copy site-wide (the intruder/cross-series case)
        rows = q(f"""SELECT id FROM lessons WHERE status='published'
            AND NOT (audience_tags @> ARRAY['teachers'])
            AND (audio_url ILIKE '%{a}%' OR legacy_attachment_url ILIKE '%{a}%') LIMIT 1""")
        if isinstance(rows, list) and rows:
            return rows[0]["id"], "audio_global"
    # title fallback within series
    key = norm(old_lesson["title"])
    rows = q(f"""SELECT id, title FROM lessons WHERE series_id='{esc(db_series_id)}' AND status='published'""")
    for r in (rows if isinstance(rows, list) else []):
        if norm(r["title"]) == key:
            return r["id"], "title_in_series"
    # global title (non-teacher)
    rows = q(f"""SELECT id FROM lessons WHERE status='published'
        AND NOT (audience_tags @> ARRAY['teachers']) AND title='{esc(old_lesson["title"])}' LIMIT 1""")
    if isinstance(rows, list) and rows:
        return rows[0]["id"], "title_global"
    return None, "absent"

def build_series(db_series_id, title, old_url):
    html = fetch(old_url) if old_url else ""
    old = parse_old_series(html)
    rows, resolved, unresolved = [], [], []
    used = set()
    for ol in old:
        lid, via = match_lesson(db_series_id, ol)
        if lid and lid not in used:
            used.add(lid)
            rows.append({"order_index": ol["order_index"], "lesson_id": lid})
            resolved.append({"title": ol["title"], "audio": ol["audio"], "via": via, "lesson_id": lid})
        elif lid in used:
            # old listed twice (rare) — keep first; note
            resolved.append({"title": ol["title"], "via": "dup_skip"})
        else:
            unresolved.append({"title": ol["title"], "audio": ol["audio"]})
    # intruders = DB lessons currently in this series but NOT in the allow-list (e.g. wrong-audio dup)
    dbrows = q(f"""SELECT l.id, l.title, l.audio_url, r.name rabbi FROM lessons l
        LEFT JOIN rabbis r ON r.id=l.rabbi_id
        WHERE l.series_id='{esc(db_series_id)}' AND l.status='published'""")
    intruders = [{"id": r["id"], "title": r["title"], "rabbi": r.get("rabbi"),
                  "audio": (r.get("audio_url") or "").split('/')[-1]}
                 for r in (dbrows if isinstance(dbrows, list) else []) if r["id"] not in used]
    # drop emitted lessons that are EMPTY (no content/media) — never render an empty lesson row
    if rows:
        idin = ",".join(f"'{esc(r['lesson_id'])}'" for r in rows)
        emp = q(f"""SELECT id FROM lessons WHERE id IN ({idin})
            AND (content IS NULL OR content='') AND audio_url IS NULL AND video_url IS NULL
            AND attachment_url IS NULL AND legacy_attachment_url IS NULL""")
        empset = {r["id"] for r in (emp or [])}
        if empset:
            for r in rows:
                if r["lesson_id"] in empset:
                    unresolved.append({"title": r.get("title"), "audio": None, "reason": "empty_lesson_in_db"})
            rows = [r for r in rows if r["lesson_id"] not in empset]
    return {"series_id": db_series_id, "title": title, "old_url": old_url,
            "old_count": len(old), "emitted": len(rows),
            "resolved": resolved, "unresolved": unresolved, "intruders": intruders, "rows": rows}

def series_is_shared(sid, book):
    """A SHARED whole-Torah series (appears under multiple chumashim under one series_id) must
       NOT be scoped on the global series page (would regress other books) — it gets a
       book-scoped key '<id>|<book>'. Signal: its lessons are mostly NOT this book (cross-book
       bible_book) OR null-dominated whole-Torah with ≤2 of this book. Book-specific → plain key."""
    rows = q(f"""SELECT bible_book, COUNT(*) n FROM lessons WHERE series_id='{esc(sid)}'
        AND status='published' GROUP BY bible_book""")
    tot = sum(r["n"] for r in rows) or 1
    sh = sum(r["n"] for r in rows if r["bible_book"] == book)
    nul = sum(r["n"] for r in rows if r["bible_book"] is None)
    oth = tot - sh - nul
    return (oth >= 5) or (nul >= 40 and sh <= 2)

def apply_series(b, book):
    sid = b["series_id"]
    if not b["rows"]:
        return 0, None
    key = f"{sid}|{book}" if series_is_shared(sid, book) else sid
    vals = ",".join(f"('series_lessons','{esc(key)}','lesson',NULL,'{r['lesson_id']}',{r['order_index']})"
                    for r in b["rows"])
    q("BEGIN;"
      f"DELETE FROM teacher_listing_items WHERE scope='series_lessons' AND key='{esc(key)}';"
      "INSERT INTO teacher_listing_items (scope,key,kind,series_id,lesson_id,sort_order) VALUES "
      + vals + ";COMMIT;")
    return len(b["rows"]), key

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--book", required=True)
    ap.add_argument("--only", default=None, help="substring filter on series title")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--out", default=os.path.join(HERE, "series-lesson-listing-plan.json"))
    args = ap.parse_args()

    subs = old_sublinks(args.book)
    series = db_series_for_book(args.book)
    plan = {"book": args.book, "apply": args.apply, "series": []}
    tot_intr = tot_unres = applied = 0
    for s in (series if isinstance(series, list) else []):
        title = s["title"]
        if args.only and args.only not in title:
            continue
        old = subs.get(s["sort_order"]) or {}
        # match old sub_link by order_index; fall back to title match
        old_url = old.get("url")
        if not old_url:
            for o in subs.values():
                if norm(o["title"]) == norm(title):
                    old_url = o.get("url"); break
        b = build_series(s["series_id"], title, old_url)
        plan["series"].append(b)
        tot_intr += len(b["intruders"]); tot_unres += len(b["unresolved"])
        mark = ""
        if b["intruders"]: mark += f"  INTRUDERS={len(b['intruders'])}"
        if b["unresolved"]: mark += f"  UNRES={len(b['unresolved'])}"
        if b["emitted"] != b["old_count"]: mark += f"  (old={b['old_count']} emit={b['emitted']})"
        print(f"  {title[:40]:40} old={b['old_count']:>3} emit={b['emitted']:>3}{mark}")
        if args.apply:
            n, key = apply_series(b, args.book)
            applied += n
        time.sleep(0.3)
    json.dump(plan, open(args.out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"\nTOTALS  series={len(plan['series'])}  intruders={tot_intr}  unresolved={tot_unres}"
          + (f"  applied_rows={applied}" if args.apply else ""))
    print("plan →", args.out)

if __name__ == "__main__":
    main()
