#!/usr/bin/env python3
"""
dedup_copy_lessons.py — site-wide removal of migration COPY-duplicate lessons.

Defect class (audit 19.6): a lesson inserted multiple times with a '(N)' title suffix —
IDENTICAL content: same series + same base-title (modulo '(N)') + same audio file. Renders
the same recording 2..N times (e.g. 'יחזקאל פרק יח' shown 22×). Distinct from generic-filename
collisions (different title, same short audio) and mislabels (different title) — those are NOT
touched (we require SAME base-title AND SAME audio).

Fix: per (series, base-title, audio) group keep ONE canonical lesson, set the rest to status='draft'
(reversible — no deletion; everything filters status='published'). Curated references
(teacher_listing_items / rabbi_page_items / lesson_topics / series_topics) pointing at a dropped
copy are RE-POINTED to the kept lesson first, so no list loses a row.

Keep priority: (1) already referenced in a curated list, (2) clean title (no '(N)'), (3) has content,
(4) lowest sort_order / id. Snapshot: lessons_status_bak_dedup_20260619.

Usage: python3 dedup_copy_lessons.py [--apply]
"""
import sys, os, json, re, time, argparse
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import sbq
SNAP = "lessons_status_bak_dedup_20260619"


def q(sql, _t=8):
    last = ""
    for i in range(_t):
        out = sbq.run(sql)
        try:
            d = json.loads(out)
        except Exception:
            last = (out or "")[:160]; time.sleep(1.5 * (i + 1)); continue
        if isinstance(d, dict) and d.get("message"):
            last = json.dumps(d, ensure_ascii=False)[:160]; time.sleep(1.5 * (i + 1)); continue
        return d
    print("  [q] gave up:", last); return None


def refs(lid):
    """count curated references to a lesson id."""
    r = q(f"""SELECT
      (SELECT COUNT(*) FROM teacher_listing_items WHERE lesson_id='{lid}') tli,
      (SELECT COUNT(*) FROM rabbi_page_items WHERE lesson_id='{lid}') rpi,
      (SELECT COUNT(*) FROM lesson_topics WHERE lesson_id='{lid}') lt""")
    return (r[0]["tli"] + r[0]["rpi"] + r[0]["lt"]) if r else 0


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--apply", action="store_true"); args = ap.parse_args()

    groups = q(r"""WITH g AS (
      SELECT l.series_id,
        btrim(regexp_replace(regexp_replace(l.title,'\s*\([0-9]+\)\s*',' ','g'),'\s+',' ','g')) bt,
        lower(split_part(COALESCE(l.audio_url,l.legacy_attachment_url),'/',-1)) ab
      FROM lessons l WHERE l.status='published' AND COALESCE(l.audio_url,l.legacy_attachment_url) IS NOT NULL
        AND l.series_id IS NOT NULL
      GROUP BY 1,2,3 HAVING COUNT(*)>1
        AND lower(split_part(COALESCE(l.audio_url,l.legacy_attachment_url),'/',-1))<>'')
      SELECT series_id, bt, ab FROM g""") or []
    print(f"{len(groups)} COPY-dup groups")

    if args.apply:
        r = q(f"SELECT to_regclass('public.{SNAP}') t")
        if not (r and r[0].get("t")):
            q(f"CREATE TABLE {SNAP} AS SELECT id, status FROM lessons WHERE status='published';")

    total_drop, total_repoint, plan = 0, 0, []
    for g in groups:
        sid, bt, ab = g["series_id"], g["bt"], g["ab"]
        ab_e = ab.replace("'", "''")
        bt_e = bt.replace("'", "''")
        rows = q(f"""SELECT id, title, (content IS NOT NULL AND btrim(content)<>'') hc, sort_order
            FROM lessons l WHERE l.series_id='{sid}' AND l.status='published'
            AND lower(split_part(COALESCE(l.audio_url,l.legacy_attachment_url),'/',-1))='{ab_e}'
            AND btrim(regexp_replace(regexp_replace(l.title,'\\s*\\([0-9]+\\)\\s*',' ','g'),'\\s+',' ','g'))='{bt_e}'
            ORDER BY sort_order NULLS LAST, id""") or []
        if len(rows) < 2:
            continue
        # rank to pick KEEP
        for r in rows:
            r["_ref"] = refs(r["id"]) if args.apply else 0
            r["_clean"] = 0 if re.search(r"\([0-9]+\)", r["title"] or "") else 1
        rows.sort(key=lambda r: (r["_ref"], r["_clean"], 1 if r["hc"] else 0), reverse=True)
        keep = rows[0]; drops = rows[1:]
        plan.append({"series_id": sid, "bt": bt, "keep": keep["title"], "drop_n": len(drops)})
        total_drop += len(drops)
        if args.apply:
            kid = keep["id"]
            for d in drops:
                did = d["id"]
                if d["_ref"]:
                    # re-point curated references to the kept lesson, then unpublish
                    q(f"UPDATE teacher_listing_items SET lesson_id='{kid}' WHERE lesson_id='{did}';")
                    q(f"UPDATE rabbi_page_items SET lesson_id='{kid}' WHERE lesson_id='{did}';")
                    q(f"UPDATE lesson_topics SET lesson_id='{kid}' WHERE lesson_id='{did}' AND NOT EXISTS (SELECT 1 FROM lesson_topics x WHERE x.lesson_id='{kid}' AND x.topic_id=lesson_topics.topic_id);")
                    q(f"DELETE FROM lesson_topics WHERE lesson_id='{did}';")
                    total_repoint += 1
                q(f"UPDATE lessons SET status='draft' WHERE id='{did}';")
                time.sleep(0.05)
    json.dump(plan, open(os.path.join(HERE, "dedup-copy-plan.json"), "w"), ensure_ascii=False, indent=1)
    print(f"\n{'APPLIED' if args.apply else 'DRY'}: {total_drop} copy-dup lessons → draft "
          f"({total_repoint} re-pointed) across {len(plan)} groups. plan → dedup-copy-plan.json")


if __name__ == "__main__":
    main()
