#!/usr/bin/env python3
"""
teachers_parity.py — substance-level parity of the Teachers Wing vs the old site.

Two kinds of "חוסר מהות" (substantive gap):
  A. DEPTH gap   — a series that EXISTS but is missing lessons inside it
                   (old lesson_count > DB published count). The "1 of 18" problem.
  B. ITEM gap    — an old listing item with NO DB counterpart at all.

For every ITEM gap we deep-search the WHOLE DB (series + lessons, any audience/book) to
classify it, so we never call something "missing" when it merely lives elsewhere:
  - RECOVERABLE_TAG    : exists but tagged 'general' only (→ teacher wing can't see it)
  - RECOVERABLE_LINK   : exists in DB under a different book/series (mis-linked)
  - FALSE_POSITIVE     : exists in the book's own pool (matcher just missed the title)
  - REAL_ABSENT        : nowhere in DB → genuine gap (flag for re-scrape, NEVER fabricate)

Output: scripts/parity/teachers-parity-report.json  + a human summary.
Used both for the one-time fix and the 3×/day watchdog (--watch prints a one-line drift status).

Usage:
  python3 teachers_parity.py [--book "תורה/בראשית"] [--watch]
"""
import sys, os, json, re, unicodedata, argparse, time
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import sbq
import teachers_reconcile as R   # reuse load_old, db_pool_for_book, match, norm

def q(sql):
    d = json.loads(sbq.run(sql))
    if isinstance(d, dict) and d.get("message"):
        raise SystemExit("SQL error: " + json.dumps(d, ensure_ascii=False)[:300])
    return d

def esc(s): return s.replace("'", "''")

# ── global DB index (built once) ───────────────────────────────────────────────
def build_index():
    """norm(title) → list of {kind, id, title, book, audience, status, rabbi, series}."""
    idx = {}
    series = q("""
      SELECT s.id, s.title, s.bible_book AS book, s.audience_tags AS aud, s.status, s.lesson_count,
             r.name AS rabbi
      FROM series s LEFT JOIN rabbis r ON r.id = s.rabbi_id
    """)
    for s in series:
        idx.setdefault(R.norm(s["title"]), []).append(
            {"kind": "series", "id": s["id"], "title": s["title"], "book": s.get("book"),
             "aud": s.get("aud") or [], "status": s.get("status"), "lc": s.get("lesson_count"),
             "rabbi": s.get("rabbi")})
    # lessons: teacher OR general, published — paged
    start = 0
    while True:
        rows = q(f"""
          SELECT l.id, l.title, l.bible_book AS book, l.audience_tags AS aud, l.status,
                 r.name AS rabbi, l.series_id
          FROM lessons l LEFT JOIN rabbis r ON r.id = l.rabbi_id
          WHERE l.status='published'
          ORDER BY l.id OFFSET {start} LIMIT 2000
        """)
        if not rows: break
        for l in rows:
            idx.setdefault(R.norm(l["title"]), []).append(
                {"kind": "lesson", "id": l["id"], "title": l["title"], "book": l.get("book"),
                 "aud": l.get("aud") or [], "status": l.get("status"), "rabbi": l.get("rabbi"),
                 "series_id": l.get("series_id")})
        start += 2000
        if len(rows) < 2000: break
    return idx

def classify_missing(item, book, idx):
    key = R.norm(item.get("title_norm") or item["title"])
    hits = idx.get(key, [])
    if not hits:
        return {"verdict": "REAL_ABSENT", "title": item["title"], "author": item.get("author"), "where": None}
    # exists somewhere — figure out why the teacher wing doesn't show it
    def has_teacher(h): return "teachers" in (h["aud"] or [])
    in_book_teacher = [h for h in hits if has_teacher(h) and (h.get("book") == book)]
    if in_book_teacher:
        return {"verdict": "FALSE_POSITIVE", "title": item["title"], "where": in_book_teacher[0]["id"]}
    teacher_elsewhere = [h for h in hits if has_teacher(h)]
    if teacher_elsewhere:
        h = teacher_elsewhere[0]
        return {"verdict": "RECOVERABLE_LINK", "title": item["title"], "where": h["id"],
                "kind": h["kind"], "db_book": h.get("book"), "note": "teacher-tagged but wrong bible_book"}
    general_only = [h for h in hits if not has_teacher(h)]
    if general_only:
        h = general_only[0]
        return {"verdict": "RECOVERABLE_TAG", "title": item["title"], "where": h["id"],
                "kind": h["kind"], "db_book": h.get("book"), "aud": h["aud"],
                "note": "exists but tagged general-only → invisible to teacher wing"}
    return {"verdict": "REAL_ABSENT", "title": item["title"], "author": item.get("author"), "where": None}

def real_published_counts(book):
    rows = q(f"""
      SELECT s.id, count(l.*) FILTER (WHERE l.status='published') AS published
      FROM series s LEFT JOIN lessons l ON l.series_id = s.id
      WHERE s.audience_tags @> ARRAY['teachers'] AND s.bible_book = '{esc(book)}'
      GROUP BY s.id
    """)
    return {r["id"]: r["published"] for r in rows}

def run(books, idx):
    data = R.load_old()
    report = {"generated": time.strftime("%Y-%m-%d %H:%M"), "books": []}
    for bk in books:
        if bk not in data: continue
        book = bk.split("/")[-1]
        items = data[bk].get("items", [])
        pool = R.db_pool_for_book(book)
        matches, extra, missing = R.match(items, pool)
        pubcount = real_published_counts(book)

        depth_gaps = []
        for old, r in matches:
            if r["table"] != "series": continue
            old_lc = old.get("lesson_count") or 0
            db_lc = pubcount.get(r["id"], 0)
            if old_lc >= 2 and db_lc < old_lc:           # missing lessons inside a real series
                depth_gaps.append({"series": r["title"], "id": r["id"], "old": old_lc, "db": db_lc, "missing": old_lc - db_lc})

        item_gaps = [classify_missing(it, book, idx) for it in missing]
        buckets = {}
        for g in item_gaps: buckets.setdefault(g["verdict"], []).append(g)

        report["books"].append({
            "book": book, "matched": len(matches),
            "depth_gaps": depth_gaps,
            "item_gaps": {k: v for k, v in buckets.items()},
        })
    return report

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--book", default=None)
    ap.add_argument("--watch", action="store_true")
    ap.add_argument("--out", default=os.path.join(HERE, "teachers-parity-report.json"))
    args = ap.parse_args()

    data = R.load_old()
    books = [args.book] if args.book else [k for k in data if "/" in k]
    idx = build_index()
    report = run(books, idx)

    tot_depth = sum(len(b["depth_gaps"]) for b in report["books"])
    tot_absent = sum(len(b["item_gaps"].get("REAL_ABSENT", [])) for b in report["books"])
    tot_tag = sum(len(b["item_gaps"].get("RECOVERABLE_TAG", [])) for b in report["books"])
    tot_link = sum(len(b["item_gaps"].get("RECOVERABLE_LINK", [])) for b in report["books"])
    tot_fp = sum(len(b["item_gaps"].get("FALSE_POSITIVE", [])) for b in report["books"])
    report["totals"] = {"depth_gaps": tot_depth, "real_absent": tot_absent,
                        "recoverable_tag": tot_tag, "recoverable_link": tot_link, "false_positive": tot_fp}
    json.dump(report, open(args.out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    if args.watch:
        print(f"[teachers-parity {report['generated']}] depth_gaps={tot_depth} real_absent={tot_absent} "
              f"recoverable(tag={tot_tag},link={tot_link}) false_pos={tot_fp}")
        return

    print(f"=== TEACHERS PARITY ({report['generated']}) ===")
    print(f"DEPTH gaps (series missing internal lessons): {tot_depth}")
    print(f"ITEM gaps → REAL_ABSENT={tot_absent}  RECOVERABLE_TAG={tot_tag}  RECOVERABLE_LINK={tot_link}  FALSE_POSITIVE={tot_fp}")
    print(f"report → {args.out}")
    # show top depth gaps
    alldepth = [(b["book"], g) for b in report["books"] for g in b["depth_gaps"]]
    alldepth.sort(key=lambda x: -x[1]["missing"])
    if alldepth:
        print("\nTop DEPTH gaps:")
        for book, g in alldepth[:20]:
            print(f"  [{book}] {g['series'][:45]:45s} old={g['old']:>3} db={g['db']:>3} missing={g['missing']}")

if __name__ == "__main__":
    main()
