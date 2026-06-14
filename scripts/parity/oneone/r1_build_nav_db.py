#!/usr/bin/env python3
"""Build bible_nav_db.json from the prescribed DB query and cross-check vs old bible_nav.json.
DB query rows: [{bible_book, bible_chapter, count}]
Output:
  r1/bible_nav_db.json : { book: { chapters: [{num, lessons}], total_chapters, total_lessons } }
Also prints the old-vs-new comparison.
"""
import json, os, subprocess, unicodedata, re

HERE = os.path.dirname(os.path.abspath(__file__))
SBQ = os.path.join(os.path.dirname(HERE), "sbq.py")  # ../sbq.py

SQL = ("SELECT bible_book, bible_chapter, count(*) FROM lessons "
       "WHERE status='published' AND bible_chapter IS NOT NULL "
       "AND NOT (audience_tags @> ARRAY['teachers']::text[] "
       "AND NOT audience_tags @> ARRAY['general']::text[]) "
       "GROUP BY 1,2 ORDER BY 1,2")

NIQQUD = re.compile(r"[֑-ׇ]")
def norm(s):
    if s is None:
        return ""
    s = NIQQUD.sub("", s)
    s = unicodedata.normalize("NFC", s)
    s = s.lower()
    for ch in '״"\'׳`|()-–—:,.!?':
        s = s.replace(ch, " ")
    return re.sub(r"\s+", " ", s).strip()

# canonical chapter counts to flag out-of-range DB values
TANACH_MAX = {
    'בראשית':50,'שמות':40,'ויקרא':27,'במדבר':36,'דברים':34,
    'יהושע':24,'שופטים':21,'שמואל א':31,'שמואל ב':24,'מלכים א':22,'מלכים ב':25,
    'ישעיהו':66,'ירמיהו':52,'יחזקאל':48,'הושע':14,'יואל':4,'עמוס':9,'עובדיה':1,
    'יונה':4,'מיכה':7,'נחום':3,'חבקוק':3,'צפניה':3,'חגי':2,'זכריה':14,'מלאכי':3,
    'תהלים':150,'משלי':31,'איוב':42,'שיר השירים':8,'רות':4,'איכה':5,'קהלת':12,
    'אסתר':10,'דניאל':12,'עזרא':10,'נחמיה':13,
    # split-book aggregates (no suffix) seen in DB
    'שמואל':31,'מלכים':25,
}

def run_sql(sql):
    env = dict(os.environ)
    p = subprocess.run(["python3", SBQ, sql], capture_output=True, text=True, env=env, timeout=200)
    return json.loads(p.stdout)

def main():
    rows = run_sql(SQL)
    if isinstance(rows, dict):
        print("DB ERROR:", rows); return
    db = {}
    none_rows = []
    for r in rows:
        b = r["bible_book"]
        ch = r["bible_chapter"]
        cnt = int(r["count"])
        if b is None:
            none_rows.append({"chapter": ch, "lessons": cnt})
            continue
        db.setdefault(b, {})[ch] = cnt
    out = {}
    for b, chmap in db.items():
        chapters = sorted(((c, n) for c, n in chmap.items() if isinstance(c, int)), key=lambda x: x[0])
        mx = TANACH_MAX.get(b)
        oor = [c for c, _ in chapters if mx and c > mx]
        out[b] = {
            "chapters": [{"num": c, "lessons": n} for c, n in chapters],
            "covered_chapters": [c for c, _ in chapters],
            "total_chapters": len(chapters),
            "total_lessons": sum(n for _, n in chapters),
            "out_of_range_chapters": oor,
            "canonical_max": mx,
        }
    payload = {"books": out, "null_book_rows": none_rows,
               "null_book_total_lessons": sum(r["lessons"] for r in none_rows)}
    dst = os.path.join(HERE, "r1", "bible_nav_db.json")
    with open(dst, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print("wrote", dst)

    # ---- cross-check old vs new ----
    old = json.load(open(os.path.join(HERE, "r1", "bible_nav.json"), encoding="utf-8"))
    # build normalized lookup for new db books
    new_by_norm = {norm(b): b for b in out}

    comp = {}
    tot_old_links = 0
    tot_old_chap = 0
    tot_new_chap = 0
    missing_books = []
    for ob, ov in old.items():
        tot_old_links += ov["total"]
        old_cov = set(ov["covered_chapters"])
        tot_old_chap += len(old_cov)
        nb = new_by_norm.get(norm(ob))
        if nb is None:
            missing_books.append(ob)
            comp[ob] = {"new_book": None, "old_chapters": sorted(old_cov),
                        "new_chapters": [], "missing_in_new": sorted(old_cov),
                        "old_links": ov["total"]}
            continue
        new_cov = set(out[nb]["covered_chapters"])
        tot_new_chap += len(new_cov & {c for c in new_cov if (TANACH_MAX.get(nb) is None or c <= TANACH_MAX[nb])})
        missing = sorted(old_cov - new_cov)
        extra = sorted(new_cov - old_cov)
        comp[ob] = {
            "new_book": nb,
            "old_links": ov["total"],
            "old_chapters_covered": len(old_cov),
            "new_chapters_covered": len(new_cov),
            "missing_in_new": missing,           # old has, new lacks
            "extra_in_new": extra,               # new has, old lacks (incl out-of-range)
        }
    report = {
        "totals": {
            "old_books": len(old),
            "new_db_books": len(out),
            "old_chapter_links": tot_old_links,
            "old_chapters_covered": tot_old_chap,
        },
        "books_missing_in_new_db": missing_books,
        "per_book": comp,
    }
    rep_path = os.path.join(HERE, "r1", "bible_nav_compare.json")
    with open(rep_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print("wrote", rep_path)

    print("\n=== TOTALS ===")
    print("old books:", len(old), "| new-db books:", len(out))
    print("old chapter-links:", tot_old_links, "| old chapters covered:", tot_old_chap)
    print("null-book lessons in DB:", payload["null_book_total_lessons"])
    print("\n=== BOOKS WHERE NEW DB IS MISSING CHAPTERS OLD HAS ===")
    any_missing = False
    for ob, c in comp.items():
        if c.get("missing_in_new"):
            any_missing = True
            nb = c.get("new_book")
            print(f"  {ob} (db={nb}): missing {len(c['missing_in_new'])} chapters -> {c['missing_in_new']}")
    if not any_missing:
        print("  (none — every old chapter is covered in new DB)")
    print("\n=== BOOKS MISSING ENTIRELY FROM NEW DB ===", missing_books or "(none)")
    print("\n=== OUT-OF-RANGE chapter numbers in DB (data bugs) ===")
    for b, v in out.items():
        if v["out_of_range_chapters"]:
            print(f"  {b}: max={v['canonical_max']} but has {v['out_of_range_chapters']}")

if __name__ == "__main__":
    main()
