#!/usr/bin/env python3
"""verify_mechanical.py — verify-BEFORE-apply for the mechanical L1 fixes (#3,#4,#5).
Read-only. Prints current DB state of every target so we apply with eyes open."""
import os, sys, json, time
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import sbq

def q(sql, _t=8):
    for i in range(_t):
        out = sbq.run(sql)
        try:
            d = json.loads(out)
            if isinstance(d, dict) and d.get("message"):
                time.sleep(1.2 * (i + 1)); continue
            return d
        except Exception:
            time.sleep(1.2 * (i + 1))
    return []

def show(label, rows):
    print(f"\n=== {label} ===")
    print(json.dumps(rows, ensure_ascii=False, indent=1) if rows else "  (none)")

# #3a שופטים — two ושננתם series variants
show("שופטים ושננתם series (status + lesson count + listing row?)", q("""
SELECT s.id, s.title, s.status,
  (SELECT COUNT(*) FROM lessons l WHERE l.series_id=s.id AND l.status='published') pub_lessons,
  (SELECT COUNT(*) FROM teacher_listing_items ti WHERE ti.series_id=s.id AND ti.scope='public_book' AND ti.key='שופטים') in_listing
FROM series s WHERE s.id::text LIKE 'ee16bb53%' OR s.id::text LIKE '9aa7afdb%'
   OR (s.title LIKE '%ושננתם%' AND s.title LIKE '%שופטים%')
ORDER BY s.title"""))

# #3b שמואל ב — ושננתם series 527f4aca
show("שמואל ב ושננתם series", q("""
SELECT s.id, s.title, s.status,
  (SELECT COUNT(*) FROM lessons l WHERE l.series_id=s.id AND l.status='published') pub_lessons,
  (SELECT COUNT(*) FROM teacher_listing_items ti WHERE ti.series_id=s.id AND ti.scope='public_book' AND ti.key=$$שמואל ב$$) in_listing
FROM series s WHERE s.id::text LIKE '527f4aca%'
   OR (s.title LIKE '%ושננתם%' AND s.title LIKE '%שמואל ב%')
ORDER BY s.title"""))

# #4 דניאל pollution — ארבע מלכויות standalone listing row
show("דניאל ארבע מלכויות (pollution listing rows to remove)", q("""
SELECT ti.id ti_id, ti.scope, ti.kind, ti.key, ti.sort_order, l.id lesson_id, l.title, r.name rabbi
FROM teacher_listing_items ti JOIN lessons l ON l.id=ti.lesson_id LEFT JOIN rabbis r ON r.id=l.rabbi_id
WHERE ti.scope='public_book' AND ti.key='דניאל' AND l.title LIKE '%ארבע מלכויות%'"""))

# #5a בראשית NULL — האמת והשלום אהבו
show("בראשית NULL-author lesson 'האמת והשלום אהבו'", q("""
SELECT l.id, l.title, l.rabbi_id, l.audio_url FROM lessons l
WHERE l.title LIKE '%האמת והשלום אהבו%' AND l.rabbi_id IS NULL"""))
# #5b עובדיה NULL — עובדיה פרק א
show("עובדיה NULL-author lesson 'עובדיה פרק א'", q("""
SELECT l.id, l.title, l.rabbi_id, l.audio_url FROM lessons l
WHERE l.title LIKE '%עובדיה פרק א%' AND l.rabbi_id IS NULL"""))
# rabbi ids for the NULL fills
show("rabbi ids (יהושע שפירא / יונדב זר)", q("""
SELECT id, name FROM rabbis WHERE name LIKE '%יהושע שפירא%' OR name LIKE '%יונדב זר%' ORDER BY name"""))

# safety: confirm the full rollback snapshot exists
show("rollback snapshot table exists?", q("""
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('lessons_rabbi_bak_fullrun_20260618','teacher_listing_items_bak_fullrun_20260618')"""))
