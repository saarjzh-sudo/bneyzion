#!/usr/bin/env python3
"""
audit_series_depth.py — the audit that would have caught "1 lesson of 18".

For each neviim book it compares, per event-series, the CURRENT DB published-lesson
count against the OLD-site event page's listed-lesson count, and flags any series
that is materially thinner than the old site. This is depth parity (count of lessons
inside each series), NOT just "does the title exist" — the flaw that produced the
false "100% migration" claim.

Reads the per-book scrape totals from reports/consolidate-plan-<book>.json (written by
consolidate.py) for the old-site ground truth, and queries the live DB for current counts.

Usage:
  python3 audit_series_depth.py                 # all neviim books with a plan file
  python3 audit_series_depth.py --book "שופטים"
"""
import sys, json, os, argparse, glob
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import sbq

def q(sql):
    return json.loads(sbq.run(sql))

def audit_book(plan_path):
    d = json.load(open(plan_path))
    book = d["book"]; book_id = d["book_id"]
    report = d["report"]
    # current DB counts for this book's event children
    rows = q(f"""
      SELECT id, title, status,
        (SELECT count(*) FROM lessons l WHERE l.series_id=s.id AND l.status='published') AS db_n
      FROM series s WHERE s.parent_id='{book_id}';
    """)
    db_by_title = {}
    for r in rows:
        db_by_title[r["title"].strip()] = r
    print(f"\n=== {book} ===")
    flagged = []
    for r in report:
        ev = r["event"].strip()
        old_n = r["old_lessons"]
        dbrow = db_by_title.get(ev)
        db_n = dbrow["db_n"] if dbrow else 0
        status = dbrow["status"] if dbrow else "MISSING"
        # flag: old has lessons but db has materially fewer (and event isn't a known super-event)
        gap = old_n - db_n
        mark = ""
        if old_n > 0 and db_n < max(1, old_n * 0.6):
            mark = f"  <<< THIN ({db_n}/{old_n})"
            flagged.append({"book": book, "event": ev, "db": db_n, "old": old_n, "status": status})
        print(f"  {ev}: DB={db_n} old={old_n} [{status}]{mark}")
    return flagged

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--book", default=None)
    args = ap.parse_args()
    plans = sorted(glob.glob(os.path.join(HERE, "reports/consolidate-plan-*.json")))
    all_flagged = []
    for p in plans:
        if args.book and args.book.replace(" ","-") not in p:
            continue
        all_flagged += audit_book(p)
    print("\n" + "="*50)
    if all_flagged:
        print(f"FLAGGED {len(all_flagged)} thin series (DB << old):")
        for f in all_flagged:
            print(f"  • {f['book']} / {f['event']}: {f['db']}/{f['old']} [{f['status']}]")
    else:
        print("✓ No thin series — every event's DB count ≥ 60% of old-site count.")

if __name__ == "__main__":
    main()
