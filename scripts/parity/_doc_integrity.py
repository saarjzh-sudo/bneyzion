import json, sys, time
sys.path.insert(0, ".")
import sbq
def q(s, _t=8):
    for i in range(_t):
        try:
            d = json.loads(sbq.run(s))
            if isinstance(d, dict) and d.get("message"): time.sleep(1.3*(i+1)); continue
            return d
        except Exception: time.sleep(1.3*(i+1))
    return []
print("=== DOCUMENTATION INTEGRITY CHECK (state-doc claims vs live DB) ===\n")
# 1. public_book listing keys: 37 books + ~122 sections
ks = q("SELECT COUNT(DISTINCT key) keys, COUNT(*) rows FROM teacher_listing_items WHERE scope='public_book'")
print(f"1. public_book listing: {ks[0]['keys']} keys, {ks[0]['rows']} rows  (expect ~159 keys = 37 books + ~122 sections)")
# 2. שמואל-א split: 2 'ספר שמואל א' series w/ דני(8)+טוביה(27)
sa = q("""SELECT r.name, (SELECT COUNT(*) FROM lessons l WHERE l.series_id=s.id AND l.status='published') pub
  FROM series s LEFT JOIN rabbis r ON r.id=s.rabbi_id WHERE s.title='ספר שמואל א' AND s.id IN
  ('1cad6653-1430-4379-8b76-a9aed5cf33e5','d05f0213-5ee5-4df4-a77f-1c168335bf85')""")
print(f"2. שמואל-א split: {sa}")
# 3. קופרמן 19
kp = q("SELECT COUNT(*) n FROM lessons WHERE series_id='48adc2eb-8857-5cc6-b80f-1a88a4a40000' AND status='published'")
print(f"3. במדבר קופרמן series: {kp[0]['n']} lessons (expect 19)")
# 4. haftarah bible_book cleared (0 of the 9 still set)
man = [m for m in json.load(open("section-manifest.json")) if m.get("new_node_id")]
ids = "','".join(m["new_node_id"] for m in man)
bb = q(f"SELECT COUNT(*) n FROM series WHERE id IN ('{ids}') AND bible_book IS NOT NULL")
print(f"4. section nodes still carrying bible_book: {bb[0]['n']} (expect 0)")
# 5. all rollback/backup tables exist
baks = ['lessons_rabbi_bak_fullrun_20260618','lessons_rabbi_bak_before101_20260618',
        'lessons_rabbi_bak_standalone_20260618','lessons_rabbi_bak_section_20260618',
        'lessons_nullfill_bak_20260618','shmuel_split_bak_20260618','series_status_bak_20260618',
        'section_biblebook_bak_20260618','teacher_listing_items_bak_fullrun_20260618']
got = {r["table_name"] for r in q("SELECT table_name FROM information_schema.tables WHERE table_name IN ('"+"','".join(baks)+"')")}
print("5. rollback tables present:")
for b in baks: print(f"     {'✓' if b in got else '✗ MISSING'} {b}")
# 6. teacher-exclusive leak in ALL public_book emitted (final guard)
leak = q("""SELECT COUNT(*) n FROM teacher_listing_items ti JOIN lessons l ON l.id=ti.lesson_id
  WHERE ti.scope='public_book' AND l.audience_tags @> ARRAY['teachers'] AND NOT l.audience_tags @> ARRAY['general']""")
print(f"6. teacher-EXCLUSIVE lessons in public_book listings: {leak[0]['n']} (MUST be 0)")
