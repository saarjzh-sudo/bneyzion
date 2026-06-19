#!/usr/bin/env python3
"""
public_book_listing.py — build the 1:1 PUBLIC book listing (Yoav R6, 17.6.2026).

The teacher wing got an explicit ordered allow-list (teacher_listing_items scope='book')
in round 6; the PUBLIC book categories never did, so CategoryPage rendered series-only
in alphabetical order with the standalone-lesson band empty (cat_standalone was flagged on
teacher copies, not public ones) — exactly Yoav's "רק סדרות, לא לפי הסדר" complaint.

This mirrors teachers_book_listing.py but for the PUBLIC pool, writing scope='public_book'
(NEVER 'book' — that is the precious teacher namespace). Ground truth = the public old-site
listing scrape in oneone/old_listings_{torah_ketuvim,neviim_moadim}.json: pages[<url>] with
'sub_links' (SERIES rows, order_index 0..) + 'items' (standalone LESSON/שו"ת rows). The two
arrays share one continuous order_index → one ordered interleaved table on the old page.

Resolution sidesteps the heavy DB duplication: match() picks the richest canonical copy per
old title from the public pool; the allow-list then names exactly those ids in old order, so
pollution (teacher חידות/worksheets that leak by title/book) is excluded by construction.

Usage:
  python3 public_book_listing.py --book שמות [--apply] [--out plan.json]
"""
import sys, os, json, re, glob, argparse, time, html as _html
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import sbq
from teachers_reconcile import nfc, norm, q, esc, match, NAV_RE

def _clean(t):
    """Decode HTML entities (&#39; etc.) in old-listing titles before matching — else norm()
       keeps '39' and the title never matches the clean DB title (the 'תולדות' mis-resolve)."""
    return _html.unescape(t or "")

ROOTS = {  # the 3 public book-category roots (mirror parity_watch ROOTS)
    "torah":  "bb14b5a5-9f8f-4b54-ae10-bea3e2ff610b",
    "neviim": "a0472c9f-8212-44ff-8937-ace5fea4b4dc",
    "ketuvim":"5cdd770c-9593-4b0d-9f9e-cda50cf5ef41",
}

def _digits(s):
    m = re.search(r"\d+", s or "")
    return int(m.group()) if m else None

def _aud(col):
    """Audience gate for the PUBLIC pool. Excludes TEACHER-EXCLUSIVE rows only (carry 'teachers'
    but NOT 'general'); allows dual-audience ('general'+'teachers') content, which appears on
    BOTH the old public page and the teacher wing (e.g. the ושננתם study-aid series, the כלי-עזר
    maps). Emission stays gated by matching an old PUBLIC-page row, so nothing surfaces that the
    old public page didn't list. This blocks the 5,033 teacher-EXCLUSIVE worksheets (14.6 "זה
    מחדל") while restoring the 21 dual series / 270 dual lessons that are genuinely public."""
    return f"((NOT {col}.audience_tags @> ARRAY['teachers']) OR {col}.audience_tags @> ARRAY['general'])"

# ── old public ground truth ─────────────────────────────────────────────────
def load_old_public(book):
    """Find the old book page across both public-listing files and return a flat ordered
       item list {order_index, kind, title, title_norm, author, length, lesson_count}."""
    import old_listing
    return old_listing.load_book(book)   # unified loader handles torah AND neviim/moadim formats

# ── public DB pool for the book ─────────────────────────────────────────────
def book_node_id(book):
    for rid in ROOTS.values():
        r = q(f"SELECT id FROM series WHERE parent_id='{rid}' AND title='{esc(book)}' LIMIT 1")
        if r:
            return r[0]["id"]
    return None

def public_pool_for_book(book, node_id):
    """PUBLIC (NOT teacher) pool: series that are descendants of the book node OR tagged
       bible_book=book, + published public lessons tagged bible_book=book. Kind-agnostic,
       like the teacher engine — the old 'kind' is unreliable after migration."""
    node_clause = f"OR s.parent_id='{node_id}'" if node_id else ""
    desc = ""
    if node_id:
        desc = (f"""OR s.id IN (WITH RECURSIVE d AS (SELECT id FROM series WHERE id='{node_id}'
                 UNION SELECT c.id FROM series c JOIN d ON c.parent_id=d.id) SELECT id FROM d)""")
    series = q(f"""
      SELECT s.id, s.title, s.lesson_count, r.name AS rabbi
      FROM series s LEFT JOIN rabbis r ON r.id = s.rabbi_id
      WHERE {_aud('s')}
        AND s.status IN ('active','published','category')
        AND (s.bible_book='{esc(book)}' {node_clause} {desc})
    """)
    lessons = q(f"""
      SELECT l.id, l.title, r.name AS rabbi,
             (COALESCE(NULLIF(l.content,''), l.video_url, l.audio_url,
                       l.attachment_url, l.legacy_attachment_url) IS NOT NULL)::int AS has_text
      FROM lessons l LEFT JOIN rabbis r ON r.id = l.rabbi_id
      WHERE {_aud('l')}
        AND l.status='published' AND l.bible_book='{esc(book)}'
    """)
    pool = []
    seen = set()
    for r in series:
        if r["id"] in seen: continue
        seen.add(r["id"])
        pool.append({"table": "series", "id": r["id"], "title": r["title"],
                     "lesson_count": r.get("lesson_count"), "rabbi": r.get("rabbi"), "rich": 0})
    for r in lessons:
        if r["id"] in seen: continue
        seen.add(r["id"])
        # rich score so match() ties break toward a lesson that actually has content
        pool.append({"table": "lessons", "id": r["id"], "title": r["title"],
                     "lesson_count": (r.get("has_text") or 0), "rabbi": r.get("rabbi"),
                     "rich": r.get("has_text") or 0})
    return pool

def descendants_sql(node_id):
    return (f"WITH RECURSIVE d AS (SELECT id FROM series WHERE id='{esc(node_id)}' "
            f"UNION SELECT c.id FROM series c JOIN d ON c.parent_id=d.id) SELECT id FROM d")

def public_pool_for_node(node_id):
    """Section/topic pool: NON-teacher series that are descendants of the node + NON-teacher
       published lessons whose series_id is the node or any descendant. NOT bible_book-based
       (מועדים/הפטרות/נושאים lessons carry no bible_book)."""
    series = q(f"""SELECT s.id, s.title, s.lesson_count, r.name AS rabbi
        FROM series s LEFT JOIN rabbis r ON r.id=s.rabbi_id
        WHERE {_aud('s')} AND s.status IN ('active','published','category')
          AND s.id IN ({descendants_sql(node_id)})""")
    lessons = q(f"""SELECT l.id, l.title, r.name AS rabbi,
            (COALESCE(NULLIF(l.content,''), l.video_url, l.audio_url, l.attachment_url, l.legacy_attachment_url) IS NOT NULL)::int AS has
        FROM lessons l LEFT JOIN rabbis r ON r.id=l.rabbi_id
        WHERE {_aud('l')} AND l.status='published'
          AND l.series_id IN ({descendants_sql(node_id)})""")
    pool, seen = [], set()
    for r in series:
        if r["id"] in seen: continue
        seen.add(r["id"]); pool.append({"table":"series","id":r["id"],"title":r["title"],
            "lesson_count":r.get("lesson_count"),"rabbi":r.get("rabbi"),"rich":0})
    for r in lessons:
        if r["id"] in seen: continue
        seen.add(r["id"]); pool.append({"table":"lessons","id":r["id"],"title":r["title"],
            "lesson_count":(r.get("has") or 0),"rabbi":r.get("rabbi"),"rich":r.get("has") or 0})
    return pool

def inner_lesson(series_id):
    rows = q(f"SELECT id,title FROM lessons WHERE series_id='{esc(series_id)}' AND status='published' ORDER BY sort_order,title LIMIT 1")
    return rows[0] if rows else None

# ── public site-wide gap resolution (NULL-book whole-Torah series etc.) ──────
_G = {}
_GC_FILE = os.path.join(HERE, "_global_public_cache.json")
def _global_public():
    """All non-teacher series+lessons (for gap resolution). Cached to a shared file (2h TTL) so
       the site-wide fleet doesn't fire these two heavy queries per book → ThrottlerException."""
    if _G:
        return _G
    try:
        if os.path.exists(_GC_FILE) and (time.time() - os.path.getmtime(_GC_FILE)) < 7200:
            d = json.load(open(_GC_FILE, encoding="utf-8"))
            _G["series"], _G["lessons"] = d["series"], d["lessons"]
            return _G
    except Exception:
        pass
    _G["series"] = [dict(r, table="series") for r in q(f"""SELECT s.id,s.title,s.bible_book,s.lesson_count
        FROM series s WHERE {_aud('s')}
        AND s.status IN ('active','published','category')""")]
    _G["lessons"] = [dict(r, table="lessons") for r in q(f"""SELECT l.id,l.title,l.bible_book
        FROM lessons l WHERE {_aud('l')} AND l.status='published'""")]
    try:
        json.dump({"series": _G["series"], "lessons": _G["lessons"]},
                  open(_GC_FILE, "w", encoding="utf-8"), ensure_ascii=False)
    except Exception:
        pass
    return _G

def resolve_gap(book, it):
    key = norm(it.get("title_norm") or it["title"])
    g = _global_public()
    cs = [c for c in g["series"]  if norm(c["title"]) == key]
    cl = [c for c in g["lessons"] if norm(c["title"]) == key]
    if it["kind"] == "series":
        bt = sorted([c for c in cs if (c.get("bible_book") or "")==book], key=lambda c:-(c.get("lesson_count") or 0))
        if bt: return bt[0], "series_book_tag"
        if cs:
            cs.sort(key=lambda c:-(c.get("lesson_count") or 0)); return cs[0], "series_any"
        if cl: return cl[0], "lesson_fallback"
        return None, "absent"
    bt = [c for c in cl if (c.get("bible_book") or "")==book]
    if bt: return bt[0], "lesson_book_tag"
    if cl: return cl[0], "lesson_any"
    if cs: return cs[0], "series_any"
    return None, "absent"

# ── build / apply ────────────────────────────────────────────────────────────
def build_book(book, node_id=None, node_pool=False, old_override=None):
    # old_override=(url, items): pre-scraped old ground truth (used for SECTION pages, whose old
    # listing isn't in the book-listing JSON — fed by section_listing.py).
    if old_override is not None:
        url, items = old_override
    else:
        url, items = load_old_public(book)
    if not items:
        return {"book": book, "error": "old listing not found"}
    if node_id is None:
        node_id = book_node_id(book)
    pool = public_pool_for_node(node_id) if node_pool else public_pool_for_book(book, node_id)
    # Augment the pool with cross-book / whole-Torah SERIES whose title matches an old row and
    # which actually have lessons. Without this, a phantom standalone lesson sharing the title
    # (e.g. 'תולדות קרבת ה'' — a real 4-lesson series) shadows the series and renders as an
    # empty lesson. match() prefers higher lesson_count → the real series wins over the phantom.
    old_norms = {norm(it.get("title_norm") or it["title"]) for it in items}
    have = {p["id"] for p in pool}
    for c in _global_public()["series"]:
        if c["id"] in have:
            continue
        if norm(c["title"]) in old_norms and (c.get("lesson_count") or 0) > 0:
            pool.append({"table": "series", "id": c["id"], "title": c["title"],
                         "lesson_count": c.get("lesson_count"), "rabbi": None, "rich": 0})
            have.add(c["id"])
    matches, extra, missing = match(items, pool)

    by_oi = {}
    for old, r in matches:
        by_oi[old["order_index"]] = r
    gaps_resolved, gaps_unresolved, nav_skipped = [], [], []
    for it in missing:
        if re.match(r"^מעבר\s", norm(it.get("title_norm") or it["title"])):
            nav_skipped.append(it["title"]); continue
        r, reason = resolve_gap(book, it)
        if r:
            by_oi[it["order_index"]] = r
            gaps_resolved.append({"order_index": it["order_index"], "title": it["title"], "via": reason, "table": r["table"], "id": r["id"]})
        else:
            gaps_unresolved.append({"order_index": it["order_index"], "kind": it["kind"], "title": it["title"], "author": it.get("author")})

    rows = []
    for it in items:
        r = by_oi.get(it["order_index"])
        if not r:
            continue
        table, rid, title = r["table"], r["id"], r["title"]
        # old standalone lesson the migration wrapped in a 1-lesson series → render inner lesson
        if it["kind"] == "lesson" and table == "series" and (r.get("lesson_count") == 1):
            inner = inner_lesson(rid)
            if inner:
                table, rid, title = "lessons", inner["id"], inner["title"]
        kind = "series" if table == "series" else "lesson"
        rows.append({"order_index": it["order_index"], "kind": kind,
                     "series_id": rid if kind == "series" else None,
                     "lesson_id": rid if kind == "lesson" else None,
                     "title": title, "old_title": it["title"],
                     "author": it.get("author"), "length": it.get("length")})

    # Final guard: never emit a SERIES card with 0 published lessons (empty placeholder —
    # genuine migration content-gap). Drop it from the listing, record as a content gap.
    ser_ids = [r["series_id"] for r in rows if r["kind"] == "series" and r["series_id"]]
    empty_ser = set()
    if ser_ids:
        idin = ",".join(f"'{x}'" for x in ser_ids)
        cnt = q(f"""SELECT s.id, (SELECT COUNT(*) FROM lessons l WHERE l.series_id=s.id AND l.status='published') pub
                    FROM series s WHERE s.id IN ({idin})""")
        empty_ser = {r["id"] for r in (cnt or []) if (r.get("pub") or 0) == 0}
    if empty_ser:
        for r in rows:
            if r["kind"] == "series" and r["series_id"] in empty_ser:
                gaps_unresolved.append({"order_index": r["order_index"], "kind": "series",
                                         "title": r.get("old_title") or r.get("title"), "reason": "empty_series_in_db"})
        rows = [r for r in rows if not (r["kind"] == "series" and r["series_id"] in empty_ser)]

    # Same guard for emitted LESSON rows that point to an empty lesson (no content/media).
    les_ids = [r["lesson_id"] for r in rows if r["kind"] == "lesson" and r["lesson_id"]]
    if les_ids:
        idin = ",".join(f"'{x}'" for x in les_ids)
        emp = q(f"""SELECT id FROM lessons WHERE id IN ({idin})
            AND (content IS NULL OR content='') AND audio_url IS NULL AND video_url IS NULL
            AND attachment_url IS NULL AND legacy_attachment_url IS NULL""")
        empl = {r["id"] for r in (emp or [])}
        if empl:
            for r in rows:
                if r["kind"] == "lesson" and r["lesson_id"] in empl:
                    gaps_unresolved.append({"order_index": r["order_index"], "kind": "lesson",
                                             "title": r.get("old_title") or r.get("title"), "reason": "empty_lesson_in_db"})
            rows = [r for r in rows if not (r["kind"] == "lesson" and r["lesson_id"] in empl)]

    extras_excluded = [{"table": r["table"], "id": r["id"], "title": r["title"]} for r in extra]
    return {"book": book, "url": url, "old_items": len(items), "emitted": len(rows),
            "gaps_resolved": gaps_resolved, "gaps_unresolved": gaps_unresolved,
            "nav_skipped": nav_skipped, "extras_excluded": extras_excluded, "rows": rows}

def apply_book(b):
    if not b.get("rows"):
        return 0
    book = b["book"]
    vals = []
    for r in b["rows"]:
        sid = f"'{r['series_id']}'" if r["series_id"] else "NULL"
        lid = f"'{r['lesson_id']}'" if r["lesson_id"] else "NULL"
        vals.append(f"('public_book','{esc(book)}','{r['kind']}',{sid},{lid},{r['order_index']})")
    sql = ("BEGIN;"
           f"DELETE FROM teacher_listing_items WHERE scope='public_book' AND key='{esc(book)}';"
           "INSERT INTO teacher_listing_items (scope,key,kind,series_id,lesson_id,sort_order) VALUES "
           + ",".join(vals) + ";COMMIT;")
    q(sql)
    return len(b["rows"])

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--book", required=True)
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--out", default=os.path.join(HERE, "public-book-listing-plan.json"))
    args = ap.parse_args()
    b = build_book(args.book)
    json.dump(b, open(args.out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    if b.get("error"):
        print("ERROR:", b["error"]); return
    print(f"{args.book}: old_items={b['old_items']} emitted={b['emitted']} "
          f"gaps_resolved={len(b['gaps_resolved'])} gaps_UNRES={len(b['gaps_unresolved'])} "
          f"nav_skip={len(b['nav_skipped'])} extras_excluded={len(b['extras_excluded'])}")
    if args.apply:
        n = apply_book(b)
        print(f"  → APPLIED {n} rows scope='public_book' key='{args.book}'")
    print("plan →", args.out)

if __name__ == "__main__":
    main()
