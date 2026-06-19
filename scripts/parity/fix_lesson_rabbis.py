#!/usr/bin/env python3
"""
fix_lesson_rabbis.py — fix per-lesson author (rabbi) attribution 1:1 with the OLD site
(Yoav, 17.6.2026: "מבט מגבוה" lessons showed phantom 'הרב יצחק בן ישראל' instead of יואב אוריאל).

Migration mis-attributed many lessons to wrong/phantom rabbi records. Ground truth = the OLD
series page's div.author per lesson. We scrape each old series page, map old author by audio
basename (primary, survives rehosting) and by normalized title (fallback for text articles),
then for each DB lesson set rabbi_id to the rabbi record matching the OLD author — but ONLY
when the old author resolves to exactly ONE real rabbi (else report, never guess).

Usage:
  python3 fix_lesson_rabbis.py --book שמות [--apply]
"""
import sys, os, json, re, time, argparse, urllib.parse, html as _html
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import sbq
from series_lesson_listing import fetch, q  # reuse curl-fetch + resilient query
from teachers_reconcile import norm, esc

def rb_norm(s):
    """Normalize a rabbi name: drop הה prefix 'הרב'/'הרבנית', niqqud, punctuation, spaces."""
    s = _html.unescape(s or "")
    s = re.sub(r'^(הרב|הרבנית|הג"ר|מורנו)\s+', '', s.strip())
    s = re.sub(r'\([^)]*\)', '', s)               # drop "(לנשים)" etc.
    s = re.sub(r"[֑-ׇ]", "", s)
    s = re.sub(r'[\"\'״׳`’]', '', s)
    return re.sub(r'\s+', ' ', s).strip()

def parse_old_authors(html):
    """[{audio, title, author}] per lessonBlock from an old series page."""
    out = []
    for b in re.split(r'(?=<div[^>]*lessonBlock)', html):
        if "lessonBlock" not in b:
            continue
        mt = re.search(r'<h3[^>]*>(.*?)</h3>', b, re.S)
        title = _html.unescape(re.sub(r'<[^>]+>', '', mt.group(1))).strip() if mt else None
        ma = re.search(r'<div class="author"[^>]*>(.*?)</div>', b, re.S)
        author = _html.unescape(re.sub(r'<[^>]+>', '', ma.group(1))).strip() if ma else None
        mm = re.search(r'https?://[^"\'\s]+\.mp3', b)
        audio = urllib.parse.unquote(mm.group(0).split('/')[-1]).lower() if mm else None
        if title:
            out.append({"audio": audio, "title_norm": norm(title), "author": author})
    return out

def audio_base(u):
    return urllib.parse.unquote((u or "").split('/')[-1]).lower() if u else None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--book", required=True)
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args(); book = args.book

    # 1. old author maps: scrape EVERY old series page for this book (robust — no fragile
    #    sort_order join, which mis-aligned DB-listing order vs old re-indexed order), plus fold
    #    in standalone-lesson authors the old category page lists directly. URLs are absolutized
    #    by old_listing (neviim hrefs were relative → curl rc=3 → silent empty map).
    import old_listing
    _, old_rows = old_listing.load_book(book)
    by_audio, by_title = {}, {}
    seen = set()
    for r in old_rows:
        if r["kind"] == "series" and r.get("url") and r["url"] not in seen:
            seen.add(r["url"])
            for ln in parse_old_authors(fetch(r["url"])):
                if not ln.get("author"):
                    continue
                if ln["audio"]:
                    by_audio[ln["audio"]] = ln["author"]
                by_title.setdefault(ln["title_norm"], ln["author"])
            time.sleep(0.2)
        elif r["kind"] == "lesson" and r.get("author"):
            by_title.setdefault(norm(r["title"]), r["author"])
            for m in (r.get("media") or []):
                if isinstance(m, str) and m.lower().endswith(".mp3"):
                    by_audio.setdefault(urllib.parse.unquote(m.split('/')[-1]).lower(), r["author"])
    print(f"old author map: {len(by_audio)} by-audio, {len(by_title)} by-title")

    # 2. real rabbi records (name → id), normalized
    rabbis = q("SELECT id, name FROM rabbis")
    rb_by_norm = {}
    for r in (rabbis or []):
        rb_by_norm.setdefault(rb_norm(r["name"]), []).append(r)
    def resolve(author):
        k = rb_norm(author)
        if k in rb_by_norm and len(rb_by_norm[k]) == 1:
            return rb_by_norm[k][0]["id"], rb_by_norm[k][0]["name"]
        # variant: a single real rabbi whose norm-name contains / is contained by the author
        cand = []
        for nk, recs in rb_by_norm.items():
            if len(recs) == 1 and (nk in k or k in nk) and len(nk) >= 4:
                cand.append(recs[0])
        if len(cand) == 1:
            return cand[0]["id"], cand[0]["name"]
        return None, None

    # 3. audit every שמות lesson
    sid_rows = q(f"SELECT DISTINCT series_id FROM teacher_listing_items WHERE scope='public_book' AND key='{esc(book)}' AND kind='series'")
    sids = [r["series_id"] for r in (sid_rows or [])]
    fixes, unresolved, ok = [], [], 0
    for sid in sids:
        rows = q(f"""SELECT l.id,l.title,l.rabbi_id,r.name db_rabbi,l.audio_url
            FROM lessons l LEFT JOIN rabbis r ON r.id=l.rabbi_id
            WHERE l.series_id='{esc(sid)}' AND l.status='published'""")
        for l in (rows or []):
            ab = audio_base(l["audio_url"])
            old_author = (by_audio.get(ab) if ab else None) or by_title.get(norm(l["title"]))
            if not old_author:
                continue
            if rb_norm(old_author) == rb_norm(l["db_rabbi"] or ""):
                ok += 1; continue
            rid, rname = resolve(old_author)
            if rid and rid != l["rabbi_id"]:
                fixes.append({"id": l["id"], "title": l["title"], "from": l["db_rabbi"], "to": rname, "rid": rid})
            elif not rid:
                unresolved.append({"title": l["title"], "old_author": old_author, "db_rabbi": l["db_rabbi"]})

    # 3b. also audit STANDALONE lessons in the public_book listing (kind='lesson') — they sit in no
    #     series so the series loop misses them, yet their displayed author must match the old site.
    st_rows = q(f"""SELECT l.id,l.title,l.rabbi_id,r.name db_rabbi,l.audio_url
        FROM teacher_listing_items ti JOIN lessons l ON l.id=ti.lesson_id LEFT JOIN rabbis r ON r.id=l.rabbi_id
        WHERE ti.scope='public_book' AND ti.key='{esc(book)}' AND ti.kind='lesson' AND l.status='published'""")
    seen_ids = {f["id"] for f in fixes}
    for l in (st_rows or []):
        ab = audio_base(l["audio_url"])
        old_author = (by_audio.get(ab) if ab else None) or by_title.get(norm(l["title"]))
        if not old_author:
            continue
        if rb_norm(old_author) == rb_norm(l["db_rabbi"] or ""):
            ok += 1; continue
        rid, rname = resolve(old_author)
        if rid and rid != l["rabbi_id"] and l["id"] not in seen_ids:
            fixes.append({"id": l["id"], "title": l["title"], "from": l["db_rabbi"], "to": rname, "rid": rid}); seen_ids.add(l["id"])
        elif not rid:
            unresolved.append({"title": l["title"], "old_author": old_author, "db_rabbi": l["db_rabbi"]})

    print(f"already-correct={ok}  fixes={len(fixes)}  unresolved={len(unresolved)}")
    from collections import Counter
    c = Counter((f["from"], f["to"]) for f in fixes)
    for (fr, to), n in c.most_common():
        print(f"   {n:>3}  '{fr}'  →  '{to}'")
    if unresolved:
        print("UNRESOLVED (old author not a single real rabbi) — sample:")
        for u in unresolved[:8]:
            print("   ?", u["old_author"], "| db:", u["db_rabbi"], "|", u["title"][:34])
    json.dump({"fixes": fixes, "unresolved": unresolved},
              open(os.path.join(HERE, f"rabbi-fix-{book}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    if args.apply and fixes:
        # backup current rabbi_id for exactly the lessons we touch
        ids = ",".join(f"'{f['id']}'" for f in fixes)
        q("DROP TABLE IF EXISTS lessons_rabbi_bak_20260617b")
        q(f"CREATE TABLE lessons_rabbi_bak_20260617b AS SELECT id, rabbi_id FROM lessons WHERE id IN ({ids})")
        for i in range(0, len(fixes), 60):
            ch = fixes[i:i+60]
            cases = " ".join(f"WHEN id='{f['id']}' THEN '{f['rid']}'::uuid" for f in ch)
            idin = ",".join(f"'{f['id']}'" for f in ch)
            q(f"UPDATE lessons SET rabbi_id = CASE {cases} END WHERE id IN ({idin})")
        print(f"APPLIED {len(fixes)} rabbi fixes (backup: lessons_rabbi_bak_20260617b)")

if __name__ == "__main__":
    main()
