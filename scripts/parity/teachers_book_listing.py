#!/usr/bin/env python3
"""
teachers_book_listing.py — build the 1:1 Teachers-Wing BOOK listing (R6, Saar 16.6.2026).

Round 4 only wrote sort_order (additive) → extras/phantoms/parsha-leaks still showed and
the book page jumbled series & lessons. Saar (R6): "כל לחיצה בסיידבר תפתח את אותן סדרות
בדיוק באותם שמות, מתחתיהן את אותם שיעורים ומאמרים — הכל לפי אותו סדר. 1:1 כמו הישן."

This builds an EXPLICIT, ORDERED, ALLOW-LIST listing per book in `teacher_listing_items`
(scope='book', key=<book>), mirroring the old teachers page row-for-row:
  - old kind=series  → matched DB series  → kind='series'
  - old kind=lesson  → matched DB entity (series OR lesson, kind-agnostic) rendered per its
    real nature, but positioned at the OLD order_index.
  - DB extras NOT in the old list (phantom dups, parsha-event leaks, nav pages) → excluded
    (allow-list). Nothing is deleted; they stay reachable via series/rabbi/search.
  - old items with NO DB match → resolved globally (cross-book NULL-book copies), else
    reported as a real gap (never fabricated).

Ground truth = oneone/old_teachers_listings.json  → by_book["<top>/<book>"]["items"].

Usage:
  python3 teachers_book_listing.py [--book "תורה/שמות"] [--apply] [--out plan.json]
  (no --book → all 37 books)
"""
import sys, os, json, re, unicodedata, argparse, time
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import sbq
from teachers_reconcile import nfc, norm, q, esc, load_old, db_pool_for_book, match, NAV_RE

# ── canonical parsha → chumash, for disambiguating whole-Torah NULL-book series ──
PARSHIOT = {
 "בראשית": ["בראשית","נח","לך לך","וירא","חיי שרה","תולדות","ויצא","וישלח","וישב","מקץ","ויגש","ויחי"],
 "שמות": ["שמות","וארא","בא","בשלח","יתרו","משפטים","תרומה","תצוה","תצווה","כי תשא","ויקהל","פקודי"],
 "ויקרא": ["ויקרא","צו","שמיני","תזריע","מצורע","אחרי מות","קדושים","אמור","בהר","בחוקותי"],
 "במדבר": ["במדבר","נשא","בהעלותך","שלח","קרח","חקת","בלק","פינחס","פנחס","מטות","מסעי"],
 "דברים": ["דברים","ואתחנן","עקב","ראה","שופטים","כי תצא","כי תבוא","ניצבים","נצבים","וילך","האזינו","וזאת הברכה","ברכה"],
}

def parsha_overlap(book, lesson_titles):
    ps = PARSHIOT.get(book)
    if not ps:
        return 0
    blob = " ".join(lesson_titles)
    return sum(1 for p in ps if p in blob)

_GLOBAL_CACHE = {}
def _load_global():
    if _GLOBAL_CACHE:
        return _GLOBAL_CACHE
    series = q("""SELECT s.id, s.title, s.bible_book, s.lesson_count, r.name AS rabbi
      FROM series s LEFT JOIN rabbis r ON r.id=s.rabbi_id
      WHERE s.audience_tags @> ARRAY['teachers']""")
    # All teacher lessons (NOT just series_id IS NULL) — the listing points by explicit id,
    # so a shared helper lesson that lives inside some series is still a valid target.
    lessons = q("""SELECT l.id, l.title, l.bible_book, r.name AS rabbi
      FROM lessons l LEFT JOIN rabbis r ON r.id=l.rabbi_id
      WHERE l.audience_tags @> ARRAY['teachers'] AND l.status='published'""")
    _GLOBAL_CACHE["series"] = [dict(r, table="series") for r in series]
    _GLOBAL_CACHE["lessons"] = [dict(r, table="lessons") for r in lessons]
    return _GLOBAL_CACHE

def global_candidates(title):
    """All teacher-tagged series + lessons site-wide whose norm-title == title (book-agnostic)."""
    key = norm(title)
    g = _load_global()
    cs = [c for c in g["series"] if norm(c["title"]) == key]
    cl = [c for c in g["lessons"] if norm(c["title"]) == key]
    return cs + cl

def series_lesson_titles(series_id):
    rows = q(f"SELECT title FROM lessons WHERE series_id='{esc(series_id)}' AND status='published'")
    return [r["title"] for r in rows]

def inner_lesson(series_id):
    """The single published lesson of a 1-lesson wrapper series (id+title), or None."""
    rows = q(f"SELECT id, title FROM lessons WHERE series_id='{esc(series_id)}' AND status='published' ORDER BY sort_order, title LIMIT 1")
    return rows[0] if rows else None

def resolve_gap(book, it):
    """Find the best site-wide DB entity for an old item with no in-book match, HONORING the
       old kind: old-series → prefer a DB series (whole-Torah split series lose their bible_book
       tag, so match by parsha-overlap); old-lesson (shared cross-book helper) → prefer a
       book-tagged lesson copy. Returns (row|None, reason)."""
    cands = global_candidates(it.get("title_norm") or it["title"])
    if not cands:
        # no exact-title match anywhere → conservative near-miss (e.g. 'על פי' vs 'לפי')
        fz = fuzzy_match(book, it)
        return (fz, "fuzzy") if fz else (None, "absent")
    series_cands = [c for c in cands if c["table"] == "series"]
    lesson_cands = [c for c in cands if c["table"] == "lessons"]

    if it["kind"] == "series":
        # a) book-tagged series
        bt = sorted([c for c in series_cands if (c.get("bible_book") or "") == book],
                    key=lambda c: -(c.get("lesson_count") or 0))
        if bt:
            return bt[0], "series_book_tag"
        # b) whole-Torah NULL-book series — pick the copy whose lessons cover THIS book's parshiot
        best, best_ov = None, 0
        for c in series_cands:
            ov = parsha_overlap(book, series_lesson_titles(c["id"]))
            if ov > best_ov:
                best, best_ov = c, ov
        if best and best_ov >= 2:
            return best, f"series_parsha_overlap={best_ov}"
        # c) lesson_count closeness
        if series_cands and it.get("lesson_count"):
            sc = sorted(series_cands, key=lambda c: abs((c.get("lesson_count") or 0) - it["lesson_count"]))
            if abs((sc[0].get("lesson_count") or 0) - it["lesson_count"]) <= 2:
                return sc[0], "series_lc_close"
        if series_cands:
            return series_cands[0], "series_any"
        # fall through to a lesson copy if truly no series exists
        if lesson_cands:
            return lesson_cands[0], "lesson_fallback"
        return None, "absent"

    # old kind == lesson (shared cross-book helper, or single PDF)
    bt = [c for c in lesson_cands if (c.get("bible_book") or "") == book]
    if bt:
        return bt[0], "book_tag"
    # single-PDF→series promotion
    sbt = sorted([c for c in series_cands if (c.get("bible_book") or "") == book],
                 key=lambda c: -(c.get("lesson_count") or 0))
    if sbt:
        return sbt[0], "series_book_tag"
    if lesson_cands:
        return lesson_cands[0], "lesson_copy"
    if series_cands:
        return series_cands[0], "series_any"
    return None, "absent"

def fuzzy_match(book, it):
    """Last-resort near-miss match (e.g. 'על פי' vs 'לפי'). Requires the first 3 normalized
       tokens to match AND Jaccard token overlap >= 0.7. Prefers same-kind, book-tag/NULL."""
    g = _load_global()
    toks = norm(it.get("title_norm") or it["title"]).split()
    if len(toks) < 3:
        return None
    head = " ".join(toks[:3]); tset = set(toks)
    pool = g["series"] if it["kind"] == "series" else (g["lessons"] + g["series"])
    best, best_j = None, 0.0
    for c in pool:
        ct = norm(c["title"]).split()
        if " ".join(ct[:3]) != head:
            continue
        cset = set(ct)
        j = len(tset & cset) / max(1, len(tset | cset))
        # prefer book-tagged / NULL-book over other-book copies on ties
        bonus = 0.05 if (c.get("bible_book") in (book, None, "")) else 0.0
        if j + bonus > best_j and j >= 0.7:
            best, best_j = c, j + bonus
    return best

def build_book(bookkey, data):
    book = bookkey.split("/")[-1]
    items = data[bookkey].get("items", [])
    pool = db_pool_for_book(book)
    matches, extra, missing = match(items, pool)

    rows = []          # listing rows: {order_index, kind, table, id, title}
    matched_by_oi = {}
    for old, r in matches:
        matched_by_oi[old["order_index"]] = r
    gaps_resolved, gaps_unresolved, nav_skipped = [], [], []
    for it in missing:
        # "מעבר ל..." rows on the old page are cross-section NAV LINKS, not content — skip them
        # (don't emit, don't count as a gap). Round-4 classified these as nav links.
        if re.match(r"^מעבר\s", norm(it.get("title_norm") or it["title"])):
            nav_skipped.append(it["title"]); continue
        r, reason = resolve_gap(book, it)
        if r:
            matched_by_oi[it["order_index"]] = r
            gaps_resolved.append({"order_index": it["order_index"], "title": it["title"], "via": reason,
                                   "table": r["table"], "id": r["id"]})
        else:
            gaps_unresolved.append({"order_index": it["order_index"], "kind": it["kind"],
                                     "title": it["title"], "author": it.get("author")})

    # Emit listing rows in old order_index sequence
    for it in items:
        oi = it["order_index"]
        r = matched_by_oi.get(oi)
        if not r:
            continue
        table, rid, title = r["table"], r["id"], r["title"]
        # An OLD standalone lesson that the migration wrapped in a 1-lesson series →
        # render it as the inner lesson (opens the PDF/article directly), not a series card.
        # Multi-lesson series that legitimately grew richer (e.g. "ספר שמות עם ביאור" 62) stay series.
        if it["kind"] == "lesson" and table == "series" and (r.get("lesson_count") == 1):
            inner = inner_lesson(rid)
            if inner:
                table, rid = "lessons", inner["id"]
                title = inner["title"]
        kind = "series" if table == "series" else "lesson"
        rows.append({"order_index": oi, "kind": kind,
                     "series_id": rid if kind == "series" else None,
                     "lesson_id": rid if kind == "lesson" else None,
                     "title": title})

    extras_excluded = [{"table": r["table"], "id": r["id"], "title": r["title"],
                        "lesson_count": r.get("lesson_count"),
                        "is_nav": bool(NAV_RE.match(norm(r["title"]))) and r["table"] == "lessons"}
                       for r in extra]
    return {"book": book, "bookkey": bookkey, "old_items": len(items),
            "emitted": len(rows), "gaps_resolved": gaps_resolved,
            "gaps_unresolved": gaps_unresolved, "nav_skipped": nav_skipped,
            "extras_excluded": extras_excluded, "rows": rows}

def apply_book(b):
    """Replace scope='book' key=<book> listing rows transactionally-ish: delete then insert."""
    book = b["book"]
    q(f"DELETE FROM teacher_listing_items WHERE scope='book' AND key='{esc(book)}';")
    vals = []
    for r in b["rows"]:
        sid = f"'{r['series_id']}'" if r["series_id"] else "NULL"
        lid = f"'{r['lesson_id']}'" if r["lesson_id"] else "NULL"
        vals.append(f"('book','{esc(book)}','{r['kind']}',{sid},{lid},{r['order_index']})")
    for i in range(0, len(vals), 100):
        chunk = ",".join(vals[i:i+100])
        q(f"INSERT INTO teacher_listing_items (scope,key,kind,series_id,lesson_id,sort_order) VALUES {chunk};")
    return len(b["rows"])

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--book", default=None)
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--out", default=os.path.join(HERE, "teachers-book-listing-plan.json"))
    args = ap.parse_args()
    data = load_old()
    keys = [args.book] if args.book else [k for k in data if "/" in k]
    plan = {"generated": time.strftime("%Y-%m-%d %H:%M"), "apply": args.apply, "books": []}
    for k in keys:
        if k not in data:
            print("SKIP:", k); continue
        b = build_book(k, data)
        plan["books"].append(b)
        print(f"{k:22s} old={b['old_items']:>3} emitted={b['emitted']:>3} "
              f"gaps_res={len(b['gaps_resolved']):>2} gaps_UNRES={len(b['gaps_unresolved']):>2} "
              f"nav_skip={len(b['nav_skipped']):>2} extras_excl={len(b['extras_excluded']):>3}")
        if args.apply:
            n = apply_book(b)
            print(f"   → applied {n} listing rows")
    json.dump(plan, open(args.out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    tot = {kk: sum(len(b[kk]) for b in plan["books"]) for kk in ("gaps_resolved","gaps_unresolved","extras_excluded")}
    tot["emitted"] = sum(b["emitted"] for b in plan["books"])
    plan["totals"] = tot
    json.dump(plan, open(args.out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"\nTOTALS emitted={tot['emitted']} gaps_resolved={tot['gaps_resolved']} "
          f"gaps_UNRESOLVED={tot['gaps_unresolved']} extras_excluded={tot['extras_excluded']}")
    print("plan →", args.out)

if __name__ == "__main__":
    main()
