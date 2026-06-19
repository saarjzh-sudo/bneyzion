#!/usr/bin/env python3
"""section_rabbi_fix.py — fix standalone-lesson author attribution 1:1 for SECTION leaves.
Section old-pages aren't in the book JSON, so fix_lesson_rabbis can't load them. Here we scrape
each section old leaf, build author maps (by audio basename + title), and for each emitted
standalone lesson in that section's public_book listing, set rabbi_id to the OLD author when it
resolves to exactly ONE real rabbi (else report). Mirrors fix_lesson_rabbis' golden-key logic.

  python3 section_rabbi_fix.py [--section X] [--apply]
"""
import sys, os, json, time, argparse, urllib.parse
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import sbq
from fix_lesson_rabbis import rb_norm, parse_old_authors, audio_base
from section_listing import fetch, parse_section_page  # reuse scrape
from teachers_reconcile import norm, esc

def q(s, _t=8):
    for i in range(_t):
        out = sbq.run(s)
        try:
            d = json.loads(out)
            if isinstance(d, dict) and d.get("message"): time.sleep(1.3*(i+1)); continue
            return d
        except Exception: time.sleep(1.3*(i+1))
    return []

# real rabbi index (name → id), normalized
_RB = None
def rabbi_index():
    global _RB
    if _RB is None:
        _RB = {}
        for r in (q("SELECT id,name FROM rabbis") or []):
            _RB.setdefault(rb_norm(r["name"]), []).append(r)
    return _RB
def resolve(author):
    rb = rabbi_index(); k = rb_norm(author)
    if k in rb and len(rb[k]) == 1: return rb[k][0]["id"], rb[k][0]["name"]
    cand = [recs[0] for nk, recs in rb.items() if len(recs) == 1 and (nk in k or k in nk) and len(nk) >= 4]
    return (cand[0]["id"], cand[0]["name"]) if len(cand) == 1 else (None, None)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--section"); ap.add_argument("--apply", action="store_true")
    a = ap.parse_args()
    man = [m for m in json.load(open(os.path.join(HERE, "section-manifest.json"), encoding="utf-8")) if m.get("new_node_id")]
    if a.section: man = [m for m in man if m["section"] == a.section]
    all_fixes, all_unres = [], []
    for m in man:
        title = m["title"]
        html = fetch(m["old_url"])
        by_audio, by_title = {}, {}
        for ln in parse_old_authors(html):
            if not ln.get("author"): continue
            if ln["audio"]: by_audio[ln["audio"]] = ln["author"]
            by_title.setdefault(ln["title_norm"], ln["author"])
        if not by_audio and not by_title:
            continue
        # emitted standalone lessons in this section's listing
        rows = q(f"""SELECT l.id,l.title,l.rabbi_id,r.name db_rabbi,l.audio_url
            FROM teacher_listing_items ti JOIN lessons l ON l.id=ti.lesson_id LEFT JOIN rabbis r ON r.id=l.rabbi_id
            WHERE ti.scope='public_book' AND ti.key='{esc(title)}' AND ti.kind='lesson'""")
        for l in (rows or []):
            ab = audio_base(l["audio_url"])
            # TITLE-primary for sections: the old leaf page lists each card by title→displayed author
            # (titles are ~unique per section page); DB audio can be mis-attached (H2) → wrong match.
            oa = by_title.get(norm(l["title"])) or (by_audio.get(ab) if ab else None)
            if not oa: continue
            if rb_norm(oa) == rb_norm(l["db_rabbi"] or ""): continue
            rid, rname = resolve(oa)
            if rid and rid != l["rabbi_id"]:
                all_fixes.append({"id": l["id"], "section": title, "title": l["title"], "from": l["db_rabbi"], "to": rname, "rid": rid})
            elif not rid:
                all_unres.append({"section": title, "title": l["title"], "old_author": oa, "db": l["db_rabbi"]})
        time.sleep(0.15)
    # dedup by lesson id (a lesson can be in several sections)
    seen, fixes = set(), []
    for f in all_fixes:
        if f["id"] in seen: continue
        seen.add(f["id"]); fixes.append(f)
    print(f"section standalone rabbi fixes: {len(fixes)} | unresolved: {len(all_unres)}")
    for f in fixes[:40]:
        print(f"   [{f['section'][:16]:16}] {f['title'][:30]:30} {f['from']} -> {f['to']}")
    json.dump({"fixes": fixes, "unresolved": all_unres}, open(os.path.join(HERE, "reports", "section-rabbi-fixes.json"), "w"), ensure_ascii=False, indent=1)
    if a.apply and fixes:
        q("DROP TABLE IF EXISTS lessons_rabbi_bak_section_20260618")
        ids = ",".join(f"'{f['id']}'" for f in fixes)
        q(f"CREATE TABLE lessons_rabbi_bak_section_20260618 AS SELECT id, rabbi_id FROM lessons WHERE id IN ({ids})")
        for i in range(0, len(fixes), 60):
            ch = fixes[i:i+60]
            cases = " ".join(f"WHEN id='{f['id']}' THEN '{f['rid']}'::uuid" for f in ch)
            idin = ",".join(f"'{f['id']}'" for f in ch)
            q(f"UPDATE lessons SET rabbi_id = CASE {cases} END WHERE id IN ({idin})")
        print(f"APPLIED {len(fixes)} section rabbi fixes (backup lessons_rabbi_bak_section_20260618)")

if __name__ == "__main__":
    main()
