#!/usr/bin/env python3
"""
teachers_reconcile.py — reconcile the Teachers Wing against the old-site ground truth.

Ground truth = scripts/parity/oneone/old_teachers_listings.json  → by_book["<top>/<book>"]["items"]
Each old item: {order_index, kind: series|lesson, title, title_norm, author, media, lesson_count}.

For every book we:
  1. load the OLD ordered item list (series + standalone lessons, in old order).
  2. query the DB teacher content for that book:
       - series   : audience_tags @> {teachers} AND bible_book = book
       - standalone lessons : teacher published lessons, bible_book = book, series_id IS NULL
  3. match OLD items → DB rows by normalized title (kind-aware).
  4. emit a PLAN:
       - sort_order   : DB row gets sort_order = old order_index (series & standalone lessons)
       - author_fix   : series author (rabbi) differs from old author  (REPORT — not auto-applied)
       - db_extra     : DB row not present in the old list (candidate phantom — REPORT)
       - old_missing  : old item with no DB match (candidate gap — REPORT, never fabricated)

Apply scope (--apply) is conservative & additive:
  * writes sort_order only (safe — hides nothing, only orders).
  * everything risky (author, extras, gaps) is reported for human review.

Usage:
  python3 teachers_reconcile.py [--book "תורה/בראשית"] [--apply] [--out plan.json]
"""
import sys, os, json, re, unicodedata, argparse, time
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import sbq

OLD = os.path.join(HERE, "oneone", "old_teachers_listings.json")

def nfc(s): return unicodedata.normalize("NFC", s or "")
def norm(s):
    s = nfc(s)
    s = re.sub(r"[֑-ׇ]", "", s)               # niqqud / cantillation
    s = re.sub(r"[\"'״׳`‘’“”|\-–—]", " ", s)  # quotes, gershayim, pipes, dashes
    s = re.sub(r"\s+", " ", s).strip()
    return s

def q(sql, _tries=4):
    """Run SQL via sbq, retrying transient infra errors (502/empty/HTML gateway pages)."""
    last = ""
    for attempt in range(_tries):
        out = sbq.run(sql)
        try:
            d = json.loads(out)
        except Exception:
            last = out[:200]
            time.sleep(2 * (attempt + 1)); continue   # transient (e.g. 502 Bad gateway HTML)
        if isinstance(d, dict) and d.get("message"):
            msg = json.dumps(d, ensure_ascii=False)
            if any(s in msg.lower() for s in ("timeout", "gateway", "temporar", "503", "502", "too many")):
                last = msg[:200]; time.sleep(2 * (attempt + 1)); continue
            raise SystemExit("SQL error: " + msg[:400])
        return d
    raise SystemExit("SQL parse error after retries: " + last)

def esc(s): return s.replace("'", "''")

def load_old():
    return json.load(open(OLD, encoding="utf-8"))["by_book"]

def db_pool_for_book(book):
    """Combined pool = teacher series (bible_book=book) + standalone teacher lessons (series_id NULL).
       Old-site 'kind' is unreliable (single-PDF items became DB series), so we match kind-agnostic."""
    series = q(f"""
      SELECT s.id, s.title, s.lesson_count, s.sort_order, s.status, r.name AS rabbi
      FROM series s LEFT JOIN rabbis r ON r.id = s.rabbi_id
      WHERE s.audience_tags @> ARRAY['teachers'] AND s.bible_book = '{esc(book)}'
    """)
    lessons = q(f"""
      SELECT l.id, l.title, l.sort_order, r.name AS rabbi, l.content_type
      FROM lessons l LEFT JOIN rabbis r ON r.id = l.rabbi_id
      WHERE l.audience_tags @> ARRAY['teachers'] AND l.status='published'
        AND l.bible_book = '{esc(book)}' AND l.series_id IS NULL
    """)
    pool = []
    for r in series:
        pool.append({"table": "series", "id": r["id"], "title": r["title"],
                     "lesson_count": r.get("lesson_count"), "rabbi": r.get("rabbi")})
    for r in lessons:
        pool.append({"table": "lessons", "id": r["id"], "title": r["title"],
                     "lesson_count": None, "rabbi": r.get("rabbi")})
    return pool

# nav-page titles the migration imported as standalone lessons — never real content
NAV_RE = re.compile(r"^(כל התכנים|דפי עבודה|פרשת|חידות לילדים)\b")

def match(old_items, pool):
    """Greedy kind-agnostic norm-title match. Prefers higher lesson_count on ties (the real series
       over a 1-item near-dup). Returns (matches[(old,row)], extra_rows, old_missing)."""
    idx = {}
    for r in pool:
        idx.setdefault(norm(r["title"]), []).append(r)
    for k in idx:
        idx[k].sort(key=lambda r: -(r.get("lesson_count") or 0))  # richest first
    matches, old_missing = [], []
    used = set()
    for it in old_items:
        key = norm(it.get("title_norm") or it["title"])
        cands = [r for r in idx.get(key, []) if r["id"] not in used]
        if cands:
            r = cands[0]; used.add(r["id"]); matches.append((it, r))
        else:
            old_missing.append(it)
    extra = [r for r in pool if r["id"] not in used]
    return matches, extra, old_missing

def reconcile_book(bookkey, data, plan):
    entry = data[bookkey]
    book = bookkey.split("/")[-1]
    items = entry.get("items", [])

    pool = db_pool_for_book(book)
    matches, extra, missing = match(items, pool)

    b = {"book": book, "bookkey": bookkey,
         "old_items": len(items), "db_pool": len(pool),
         "matched": len(matches),
         "sort_updates": [], "author_fix": [], "db_extra": [], "old_missing": []}

    for old, r in matches:
        b["sort_updates"].append({"table": r["table"], "id": r["id"], "title": r["title"], "sort_order": old["order_index"]})
        if r["table"] == "series" and old.get("author") and r.get("rabbi") and norm(old["author"]) != norm(r["rabbi"]):
            b["author_fix"].append({"id": r["id"], "title": r["title"], "db_rabbi": r["rabbi"], "old_author": old["author"]})

    for r in extra:
        b["db_extra"].append({"table": r["table"], "id": r["id"], "title": r["title"],
                              "lesson_count": r.get("lesson_count"), "rabbi": r.get("rabbi"),
                              "is_nav": bool(NAV_RE.match(norm(r["title"]))) and r["table"] == "lessons"})
    for it in missing:
        b["old_missing"].append({"kind": it["kind"], "title": it["title"], "author": it.get("author"), "lesson_count": it.get("lesson_count")})

    plan["books"].append(b)
    return b

def apply_sort(plan):
    """Apply sort_order updates only (additive/safe). Backup is taken by caller."""
    n = 0
    for b in plan["books"]:
        for tbl in ("series", "lessons"):
            batch = [u for u in b["sort_updates"] if u["table"] == tbl]
            for i in range(0, len(batch), 60):
                chunk = batch[i:i+60]
                cases = " ".join(f"WHEN '{u['id']}' THEN {int(u['sort_order'])}" for u in chunk)
                ids = ",".join(f"'{u['id']}'" for u in chunk)
                q(f"UPDATE {tbl} SET sort_order = CASE id {cases} END WHERE id IN ({ids});")
                n += len(chunk)
    return n

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--book", default=None)
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--out", default=os.path.join(HERE, "teachers-reconcile-plan.json"))
    args = ap.parse_args()

    data = load_old()
    keys = [args.book] if args.book else [k for k in data if "/" in k]  # skip פרשת השבוע / איך מלמדים
    plan = {"generated": time.strftime("%Y-%m-%d"), "apply": args.apply, "books": []}

    for k in keys:
        if k not in data:
            print("SKIP (not in old data):", k); continue
        b = reconcile_book(k, data, plan)
        print(f"{k:24s} old={b['old_items']:>3} pool={b['db_pool']:>3} matched={b['matched']:>3} "
              f"extra={len(b['db_extra']):>3} (nav={sum(1 for e in b['db_extra'] if e.get('is_nav'))}) "
              f"missing={len(b['old_missing']):>3} authorfix={len(b['author_fix'])}")

    tot_sort = sum(len(b["sort_updates"]) for b in plan["books"])
    tot_author = sum(len(b["author_fix"]) for b in plan["books"])
    tot_extra = sum(len(b["db_extra"]) for b in plan["books"])
    tot_missing = sum(len(b["old_missing"]) for b in plan["books"])
    plan["totals"] = {"sort_updates": tot_sort, "author_fix": tot_author, "db_extra": tot_extra, "old_missing": tot_missing}
    json.dump(plan, open(args.out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"\nTOTALS  sort_updates={tot_sort}  author_fix={tot_author}  db_extra={tot_extra}  old_missing={tot_missing}")
    print("plan →", args.out)

    if args.apply:
        n = apply_sort(plan)
        print(f"APPLIED sort_order to {n} rows.")

if __name__ == "__main__":
    main()
