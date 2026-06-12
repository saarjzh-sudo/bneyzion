#!/usr/bin/env python3
"""ROUND2.sql generator — bnei-zion 1:1, round-2 data fixes (teachers wing).
Reads /tmp/t1_lists.json (built from old_teachers_tree+tree_map+tree_plan) and
the old scrape JSONs; emits fixes/ROUND2.sql. READ-ONLY author tool — the SQL
is executed by the orchestrator."""
import json, os
HERE=os.path.dirname(os.path.abspath(__file__))
ONEONE=os.path.dirname(HERE)

t1=json.load(open('/tmp/t1_lists.json'))
PARENTS=t1['parents']; MEMBERS=t1['members']

# --- exact S3 audio urls from the old public listing scrape ---
def fetch_audio():
    d=json.load(open(os.path.join(ONEONE,'old_listings_torah_ketuvim.json')))
    d2=json.load(open(os.path.join(ONEONE,'old_listings_neviim_moadim.json')))
    found={}
    def walk(o):
        if isinstance(o,dict):
            t=o.get('title') or ''
            tgt={'בבל מול ירושלים - בקעה מול הרים שיעור ראשון':'L1',
                 'בבל מול ירושלים - בקעה מול הרים שיעור שני':'L2',
                 "תולדות קרבת ה' לאדם - ביציאת מצרים ובמתן תורה":'L3'}.get(t)
            if tgt and tgt not in found:
                m=o.get('media') or []
                h=m[0]['href'] if (m and isinstance(m[0],dict)) else (m[0] if m else None)
                if h: found[tgt]=h
            for v in o.values(): walk(v)
        elif isinstance(o,list):
            for v in o: walk(v)
    walk(d); walk(d2)
    assert set(found)=={'L1','L2','L3'}, found
    return found
AUD=fetch_audio()

L1='57bbbd2e-f522-4be8-8ea8-901837e48c71'
L2='151a5d32-5a96-4a5e-a4c2-b7ecd71d2100'
L3='e9ca1179-0d11-434e-86ea-37f72a514b16'
RAV_YOAV='acd34d0f-1288-47b8-9e8e-38e69599c294'
S_BAVEL='6be34cb5-732f-5d08-9c13-852928f121db'
S_TOLDOT='d7a37161-18f4-49a6-adcc-d88a2d1fbc56'

def idlist(ids, per=6):
    out=[]
    for i in range(0,len(ids),per):
        out.append('  '+', '.join(f"'{x}'" for x in ids[i:i+per]))
    return ',\n'.join(out)

def q(s):
    return s.replace("'","''")

TLI_INSERTS=[
 # key, kind, ref_col, ref_id, sort, comment
 ('ביאור הפסוקים','series','series_id','7e80baeb-7601-427b-b728-586aab817049',4,"old row #4 'פשט הפסוקים' (שמות copy, lc 9; old url /מאגר-עזרי-הלמידה/תורה/שמות/פשט-הפסוקים/)"),
 ('ביאור הפסוקים','lesson','lesson_id','638283fc-7174-439b-b6f7-c901d04fca05',79,"old row #79 'הודעה והבהרה' — the copy inside 'ביאור הפסוקים חומש שמות' (old url …/שמות/ביאור-הפסוקים-חומש-שמות/הודעה-והבהרה/)"),
 ('ביאור הפסוקים','lesson','lesson_id','cab5bf1d-f13b-494d-9606-067d87b68337',116,"old row #116 'מגילת רות עם ביאור ושננתם - פרק א' — same physical series (c57e8a68) as the live TLI rows 117-119; audience union below"),
 ('חידות חזרה','lesson','lesson_id','56f8e65e-92fe-429f-a2e5-4cb3a82c50a4',33,"old row #33 'חידות על פי א\"ב פרשת וישב' — the רש\"י-series copy (legacy /media/144142/וישב-רשי.doc)"),
 ('חידות חזרה','lesson','lesson_id','70baf51b-146e-4e21-a7d9-1ecc9e850ce9',34,"old row #34 'חידות על פי א\"ב פרשת מקץ' — רש\"י copy (legacy /media/144156/מקץ-רשי.doc)"),
 ('חידות חזרה','lesson','lesson_id','29538a7b-aa1d-4a25-a115-2097756c9e8e',35,"old row #35 'חידות על פי א\"ב פרשת ויגש' — רש\"י copy (legacy /media/144132/ויגש-רשי.doc)"),
 ('דגשים והכוונה על סדר הפרקים','series','series_id','ab14792d-d96a-4242-9dba-4474bebcdad1',4,"old row #4 'חוברות ת\"ת מורשה - חומש שמות' (lc 9; renamed below)"),
 ('דגשים והכוונה על סדר הפרקים','series','series_id','5d2ac1b3-1724-4623-a8bd-489eceec8e26',8,"old row #8 'חוברות ת\"ת מורשה - חומש במדבר' (lc 10; renamed below)"),
 ('סיכום הפרקים והנושאים בקצרה','lesson','lesson_id','c445b645-e43d-4119-9fb3-ffa5c87a9e47',14,"old row #14 'סיכום פרטי המשכן…' — the teachers-wing copy (sits in teachers שמות book 96ba287a; row #13 = public copy already in TLI)"),
 ('דפי עבודה','lesson','lesson_id','9e696ff0-979f-4070-8cb0-d0de5819d648',31,"old row #31 'חוברת עבודה והכוונה ללימוד עצמי על ספר יהושע' — lesson whose legacy_attachment_url IS the old page url; pdf rehosted (he-f1fb12bd0e.pdf)"),
 ('ביאורי מילים','lesson','lesson_id','9e696ff0-979f-4070-8cb0-d0de5819d648',39,"old row #39 — same physical workbook"),
 ('חוברת עבודה','lesson','lesson_id','9e696ff0-979f-4070-8cb0-d0de5819d648',1,"old row #1 — first TLI row for this key (page previously rendered via content_type fallback)"),
 ('ספר יהושע','lesson','lesson_id','9e696ff0-979f-4070-8cb0-d0de5819d648',1,"old row #1 — first TLI row for this key"),
]

RPI_INSERTS=[
 # rabbi, kind, ref_col, ref, sort, comment
 ('e1111111-1111-1111-1111-111111111121','series','series_id','7e80baeb-7601-427b-b728-586aab817049',4,"בניה כהן old row #4 'פשט הפסוקים' (שמות copy)"),
 ('e1111111-1111-1111-1111-111111111103','series','series_id','faaf06ea-0b08-4634-b1fb-d489249e7ed0',1,"נתן מארגל old row #1 חידות לילדים… (בראשית, lc 11)"),
 ('e1111111-1111-1111-1111-111111111103','series','series_id','26a2076b-f716-4d49-87f9-59673f18db07',2,"נתן מארגל old row #2 (שמות, lc 10)"),
 ('e1111111-1111-1111-1111-111111111103','series','series_id','b654c91c-1d39-4ede-8f2b-6fd3ed2f3985',4,"נתן מארגל old row #4 (במדבר, lc 11)"),
 ('e1111111-1111-1111-1111-111111111103','series','series_id','00b7226a-cb33-470b-8710-ba574662f406',5,"נתן מארגל old row #5 (דברים, lc 11)"),
 ('b5555555-5555-5555-5555-555555555555','series','series_id','ab14792d-d96a-4242-9dba-4474bebcdad1',2,"תלמוד תורה מורשה old row #2 'חוברות ת\"ת מורשה - חומש שמות'"),
 ('b5555555-5555-5555-5555-555555555555','series','series_id','5d2ac1b3-1724-4623-a8bd-489eceec8e26',5,"תלמוד תורה מורשה old row #5 'חוברות ת\"ת מורשה - חומש במדבר'"),
 ('744da303-22be-4062-a822-4ba8e8f1b02d','series','series_id','ff799d93-9eeb-4290-a987-936ddfb15e23',7,"בן ארצי old row #7 'פשט בפרשה' בראשית (lc 23) — note: live sorts for this dual-page rabbi are merged/renumbered; collisions documented in report"),
 ('744da303-22be-4062-a822-4ba8e8f1b02d','series','series_id','ef23357b-679b-49fa-b262-a01225edab87',9,"בן ארצי old row #9 'פשט בפרשה' ויקרא (lc 16) — שמות copy 3610bdba already present (old row #8)"),
 ('744da303-22be-4062-a822-4ba8e8f1b02d','series','series_id','fe1147aa-a2e8-4056-b53e-963a80461c40',10,"בן ארצי old row #10 'פשט בפרשה' במדבר (lc 11)"),
 ('744da303-22be-4062-a822-4ba8e8f1b02d','series','series_id','73a01cf4-28f5-4129-8992-a929fec29cd7',11,"בן ארצי old row #11 'פשט בפרשה' דברים (lc 11)"),
 ('744da303-22be-4062-a822-4ba8e8f1b02d','series','series_id','a69ddf30-9109-465d-a222-f83ce6535b5c',22,"בן ארצי old row #22 'לב הפרק' — the דניאל copy (lc 11; old url …/כתובים/דניאל/לב-הפרק/)"),
 ('744da303-22be-4062-a822-4ba8e8f1b02d','series','series_id','c8b151d0-7f65-4431-bd33-755240a2072c',26,"בן ארצי old row #26 'לב הפרק - ישעיהו' second copy (old lc=0; live twin is a draft, lc 0 — flagged in report)"),
]

sql=[]
A=sql.append
A("-- ============================================================================")
A("-- ROUND2.sql — bnei-zion 1:1 parity, ROUND-2 data fixes (teachers wing)")
A("-- Author: round-2 data-gaps author (read-only scoping via sbq.py; this file is")
A("--         EXECUTED BY THE ORCHESTRATOR, not by the author).")
A("-- Built from: reports/verify_results.json, old_teachers_tree.json,")
A("--   old_teachers_listings.json, match/{item_match,tree_map}.json,")
A("--   plans/{teachers_plan,rabbis_plan,tree_plan}.json, live SELECTs 2026-06-12.")
A("-- Band convention: series.sort_order 1..999 = sidebar member at position;")
A("--   0 = page-only; >=1000 = parked. All statements IDEMPOTENT (guarded).")
A("-- ============================================================================")
A("")
A("-- ============================================================================")
A("-- §1 TEACHERS BY-BOOK BAND HYGIENE — the teachers wing has its own subtree")
A("--    under root 6bfb7aaa (מאגר עזרי הלמידה). tree_plan's 50 teachers")
A("--    set_series_sort ops are ALREADY live (verified: 4 tops at 2-5, 35 books,")
A("--    11 'דפי עבודה' children — all at their old positions, 0 title mismatches).")
A("--    Residual gaps: 2 banded NON-members.")
A("-- ----------------------------------------------------------------------------")
A("-- scope: rows to demote (expect 2 pre-apply, 0 after)")
A("SELECT count(*) AS s1_to_demote FROM series")
A("WHERE sort_order BETWEEN 1 AND 999 AND id IN (")
A("  'e93c7a85-af4a-479b-8122-bd4f8d7e0f2c',  -- לב הפרק - ישעיהו (root child @1; old top #1 is the פרשת-השבוע CODE slot)")
A("  '08a87de3-2938-43aa-962f-8ea95096e564'   -- מפות על ספר יהושע (@12 under teachers יהושע book; not an old-tree child)")
A(");")
A("")
A("UPDATE series SET sort_order = 0")
A("WHERE sort_order BETWEEN 1 AND 999")
A("  AND id IN ('e93c7a85-af4a-479b-8122-bd4f8d7e0f2c','08a87de3-2938-43aa-962f-8ea95096e564');")
A("")
A("-- verification v1: banded children of the 40 policed teachers parents that are")
A("-- NOT old-tree members — expect 0 after apply (2 before).")
A("SELECT count(*) AS v1_banded_nonmembers FROM series")
A(f"WHERE sort_order BETWEEN 1 AND 999\n  AND parent_id IN (\n{idlist(PARENTS)}\n)")
A(f"  AND id NOT IN (\n{idlist(MEMBERS)}\n);")
A("")
A("-- verification v1b: all 50 old-tree members in band at their old position — expect 50.")
A("SELECT count(*) AS v1b_members_in_band FROM series")
A(f"WHERE sort_order BETWEEN 1 AND 999 AND id IN (\n{idlist(MEMBERS)}\n);")
A("")
A("-- ============================================================================")
A("-- §2 teacher_listing_items COMPLETION — 13 old content-type rows absent from")
A("--    TLI (multiset diff by normalize_he title per key; all 13 target sort")
A("--    positions verified VACANT live). + 2 ref corrections (rows 22/23 of")
A("--    חידות חזרה point at the רש\"י copies while the old rows are the plain")
A("--    א\"ב-series copies) + 2 series renames to the old listing labels + 1")
A("--    audience union (old shows the lesson on both a public and a teachers page).")
A("-- ----------------------------------------------------------------------------")
A("-- scope: missing TLI rows (expect 13 pre-apply, 0 after)")
A("SELECT 13 - count(*) AS s2_to_insert FROM teacher_listing_items t")
A("WHERE t.scope='content_type' AND (t.key, t.sort_order) IN (")
A("  ('ביאור הפסוקים',4),('ביאור הפסוקים',79),('ביאור הפסוקים',116),")
A("  ('חידות חזרה',33),('חידות חזרה',34),('חידות חזרה',35),")
A("  ('דגשים והכוונה על סדר הפרקים',4),('דגשים והכוונה על סדר הפרקים',8),")
A("  ('סיכום הפרקים והנושאים בקצרה',14),('דפי עבודה',31),('ביאורי מילים',39),")
A("  ('חוברת עבודה',1),('ספר יהושע',1)")
A(");")
A("")
for key,kind,col,ref,sort,comment in TLI_INSERTS:
    A(f"-- {comment}")
    A(f"INSERT INTO teacher_listing_items (scope, key, kind, {col}, sort_order)")
    A(f"SELECT 'content_type', '{q(key)}', '{kind}', '{ref}', {sort}")
    A(f"WHERE NOT EXISTS (SELECT 1 FROM teacher_listing_items WHERE scope='content_type' AND key='{q(key)}' AND sort_order={sort});")
    A("")
A("-- ref corrections: old rows 22/23 are the plain 'חידות על פי א\"ב - חומש בראשית'")
A("-- copies (legacy מקץ.doc / ויגש.doc); live rows point at the רש\"י copies that")
A("-- belong at 34/35 (row 21 = 1157a3cc is already the correct plain copy).")
A("UPDATE teacher_listing_items SET lesson_id='75d419b1-157d-408a-ae3a-955a2957d44d'  -- מקץ plain (series 697e6741)")
A("WHERE id='54fbd3f0-6241-4bf6-bf03-cc4cd33ede40' AND lesson_id='70baf51b-146e-4e21-a7d9-1ecc9e850ce9';")
A("UPDATE teacher_listing_items SET lesson_id='fba93d33-4edf-4356-9b21-63ca38d1188e'  -- ויגש plain (series 697e6741)")
A("WHERE id='113e8074-6c33-4506-b89a-e992f81312f7' AND lesson_id='29538a7b-aa1d-4a25-a115-2097756c9e8e';")
A("")
A("-- renames: old listing label (on BOTH the content-type page and the old שמות/במדבר")
A("-- book pages) is 'חוברות ת\"ת מורשה - חומש X'; live titles dropped the ת\"ת מורשה.")
A("-- Sibling collision pre-checked live: none.")
A("UPDATE series SET title = 'חוברות ת\"ת מורשה - חומש שמות'")
A("WHERE id='ab14792d-d96a-4242-9dba-4474bebcdad1' AND title <> 'חוברות ת\"ת מורשה - חומש שמות';")
A("UPDATE series SET title = 'חוברות ת\"ת מורשה - חומש במדבר'")
A("WHERE id='5d2ac1b3-1724-4623-a8bd-489eceec8e26' AND title <> 'חוברות ת\"ת מורשה - חומש במדבר';")
A("")
A("-- audience union: מגילת רות עם ביאור ושננתם - פרק א (copy in series c57e8a68, the")
A("-- one the live TLI rows 117-119 use for פרקים ב-ד). Old shows it on the public רות")
A("-- series page AND on the teachers ביאור-הפסוקים page → dual audience (ROUND1 §6 semantics).")
A("UPDATE lessons SET audience_tags = audience_tags || '{teachers}'")
A("WHERE id='cab5bf1d-f13b-494d-9606-067d87b68337' AND NOT (audience_tags @> '{teachers}');")
A("")
A("-- verification v2: per-key TLI row counts — expect (old counts):")
A("-- ביאור הפסוקים=119, ביאורי מילים=39, דגשים והכוונה על סדר הפרקים=84, דפי עבודה=70,")
A("-- חידות חזרה=118, סיכום הפרקים והנושאים בקצרה=159, חוברת עבודה=1, ספר יהושע=1")
A("SELECT key, count(*) AS rows FROM teacher_listing_items WHERE scope='content_type'")
A("AND key IN ('ביאור הפסוקים','ביאורי מילים','דגשים והכוונה על סדר הפרקים','דפי עבודה','חידות חזרה','סיכום הפרקים והנושאים בקצרה','חוברת עבודה','ספר יהושע')")
A("GROUP BY key ORDER BY key;")
A("")
A("-- verification v2b: riddles rows 21-23 now point at the plain copies, 33-35 at רש\"י — expect 6 rows, plain={1157a3cc,75d419b1,fba93d33}, rashi={56f8e65e,70baf51b,29538a7b}")
A("SELECT sort_order, lesson_id FROM teacher_listing_items")
A("WHERE scope='content_type' AND key='חידות חזרה' AND sort_order IN (21,22,23,33,34,35) ORDER BY sort_order;")
A("")
A("-- ============================================================================")
A("-- §3 CREATORS rabbi_page_items COMPLETENESS — multiset diff (normalize_he title)")
A("--    of the 282 old creator rows vs live RPI per rabbi: 26/31 creators complete;")
A("--    18 old rows unrepresented across 5 creators. 14 resolvable INSERTs +")
A("--    4 position fixes + 1 block shift + 2 lesson-title restores; 2 rows → yoav.")
A("-- ----------------------------------------------------------------------------")
A("-- scope: how many of the 14 insert targets already exist (expect 0 pre-apply, 14 after)")
A("SELECT count(*) AS s3_already_present FROM rabbi_page_items r")
A("WHERE (r.rabbi_id::text, COALESCE(r.series_id::text,r.lesson_id::text), r.sort_order) IN (")
rows=[]
for rid,kind,col,ref,sort,comment in RPI_INSERTS:
    rows.append(f"  ('{rid}','{ref}',{sort})")
# +1 for veshinantam insert listed separately below
rows.append("  ('6f4b2572-b019-4832-9547-de7e8bc6d909','c445b645-e43d-4119-9fb3-ffa5c87a9e47',11)")
A(",\n".join(rows))
A(");")
A("")
A("-- 3a. נתן מארגל — the old page lists the SAME display title 5×, one series per")
A("-- chumash. The single live row (id 20dd3db5) is the ויקרא copy sitting at #1;")
A("-- its old position is #3.")
A("UPDATE rabbi_page_items SET sort_order=3")
A("WHERE id='20dd3db5-452a-49e2-9dfa-83788b829ef8' AND sort_order=1;")
A("")
A("-- 3b. תלמוד תורה מורשה — live rows were renumbered dense 1-4; restore old slots 3/4/6.")
A("UPDATE rabbi_page_items SET sort_order=3 WHERE id='2ff1f568-e291-4e07-a7ba-40a22d79cbca' AND sort_order=2;  -- חוברת עבודה לתלמיד- חומש שמות → old #3")
A("UPDATE rabbi_page_items SET sort_order=4 WHERE id='5358d8f8-3449-4c8b-ac9d-b9475db256a5' AND sort_order=3;  -- חוברות - חומש ויקרא → old #4")
A("UPDATE rabbi_page_items SET sort_order=6 WHERE id='c0ed1ecc-b01d-4ad1-864e-bb8a64049e89' AND sort_order=4;  -- חוברת עבודה לתלמיד- חומש בראשית → old #6")
A("")
A("-- 3c. ושננתם - אוצר התורה — old #11 (the teachers-wing copy of סיכום פרטי המשכן)")
A("-- is missing; live rows 11..49 are old 12..50 shifted -1. Shift back then insert.")
A("-- Guarded by absence of the c445b645 row (makes the block idempotent).")
A("UPDATE rabbi_page_items SET sort_order = sort_order + 1")
A("WHERE rabbi_id='6f4b2572-b019-4832-9547-de7e8bc6d909' AND sort_order >= 11")
A("  AND NOT EXISTS (SELECT 1 FROM rabbi_page_items WHERE rabbi_id='6f4b2572-b019-4832-9547-de7e8bc6d909' AND lesson_id='c445b645-e43d-4119-9fb3-ffa5c87a9e47')")
A("  -- second guard: slot 11 must still be occupied (prevents a double shift if a")
A("  -- previous run crashed between this statement and the INSERT below)")
A("  AND EXISTS (SELECT 1 FROM rabbi_page_items WHERE rabbi_id='6f4b2572-b019-4832-9547-de7e8bc6d909' AND sort_order=11);")
A("")
A("INSERT INTO rabbi_page_items (rabbi_id, kind, lesson_id, sort_order)")
A("SELECT '6f4b2572-b019-4832-9547-de7e8bc6d909', 'lesson', 'c445b645-e43d-4119-9fb3-ffa5c87a9e47', 11")
A("WHERE NOT EXISTS (SELECT 1 FROM rabbi_page_items WHERE rabbi_id='6f4b2572-b019-4832-9547-de7e8bc6d909' AND lesson_id='c445b645-e43d-4119-9fb3-ffa5c87a9e47');")
A("")
A("-- 3d. resolvable INSERTs (each at the old creator-row position)")
for rid,kind,col,ref,sort,comment in RPI_INSERTS:
    A(f"-- {comment}")
    A(f"INSERT INTO rabbi_page_items (rabbi_id, kind, {col}, sort_order)")
    A(f"SELECT '{rid}', '{kind}', '{ref}', {sort}")
    A(f"WHERE NOT EXISTS (SELECT 1 FROM rabbi_page_items WHERE rabbi_id='{rid}' AND {col}='{ref}' AND sort_order={sort});")
    A("")
A("-- 3e. lesson-title restores — migration collapsed two distinct old titles into one:")
A("-- old public rav-page row #34 (and creator row #35) carry the SHORT title; the old")
A("-- והנחלות rows live on the teachers יהושע/מלכים-ב book pages (creator row #39).")
A("-- 5dae4141 is the rav-page-matched copy (rabbis_plan media match) → restore short title.")
A("UPDATE lessons SET title='הסבר פשוט על מבנה ארץ ישראל'")
A("WHERE id='5dae4141-3671-4afa-92cf-3ffd59bc1a17' AND title='הסבר פשוט על מבנה ארץ ישראל והנחלות';")
A("-- old rav-page row #40 + creator row #41 + teachers יחזקאל book page all read")
A("-- 'על פי שיטות'; 2752644d is the rav-page-matched copy → restore that variant.")
A("UPDATE lessons SET title='שרטוט בית המקדש ביחזקאל על פי שיטות המלבי\"ם רש\"י ומצודות'")
A("WHERE id='2752644d-3a66-45a1-beb7-41e4725a71fc' AND title='שרטוט בית המקדש ביחזקאל לפי שיטות המלבי\"ם רש\"י ומצודות';")
A("")
A("-- verification v3: per-creator RPI row counts — expect: בניה כהן(…121)=4,")
A("-- נתן מארגל(…103)=5, מורשה(b5555555)=6, ושננתם(6f4b2572)=50, בן ארצי(744da303)=53")
A("SELECT rabbi_id, count(*) AS rows FROM rabbi_page_items")
A("WHERE rabbi_id IN ('e1111111-1111-1111-1111-111111111121','e1111111-1111-1111-1111-111111111103',")
A("                   'b5555555-5555-5555-5555-555555555555','6f4b2572-b019-4832-9547-de7e8bc6d909',")
A("                   '744da303-22be-4062-a822-4ba8e8f1b02d')")
A("GROUP BY rabbi_id ORDER BY rabbi_id;")
A("")
A("-- verification v3b: ושננתם ladder intact after the shift — expect 50 rows, sorts 1..50, no dup")
A("SELECT count(*) AS rows, min(sort_order) AS lo, max(sort_order) AS hi, count(DISTINCT sort_order) AS distinct_sorts")
A("FROM rabbi_page_items WHERE rabbi_id='6f4b2572-b019-4832-9547-de7e8bc6d909';")
A("")
A("-- verification v3c: the two restored titles exist exactly once each")
A("SELECT title, count(*) FROM lessons")
A("WHERE title IN ('הסבר פשוט על מבנה ארץ ישראל','שרטוט בית המקדש ביחזקאל על פי שיטות המלבי\"ם רש\"י ומצודות')")
A("  AND status='published' GROUP BY title;")
A("")
A("-- ============================================================================")
A("-- §4 THREE MISSING COPY-SOURCE LESSONS — full row data recovered from the old")
A("--    public listings scrape (titles, rabbi הרב יואב אוריאל, S3 audio, series+slot).")
A("--    Media is on bneyzion.s3 (AWS), NOT bneyzion.co.il → NO Rule-13 rehost needed.")
A("--    Both parent series already exist live.")
A("-- ----------------------------------------------------------------------------")
A("-- scope: expect 3 pre-apply, 0 after")
A(f"SELECT 3 - count(*) AS s4_to_insert FROM lessons WHERE id IN ('{L1}','{L2}','{L3}');")
A("")
A("-- L1: בבל מול ירושלים שיעור ראשון → series 6be34cb5 (live, published, currently EMPTY) @10")
A(f"INSERT INTO lessons (id, title, series_id, rabbi_id, audio_url, source_type, status, audience_tags, sort_order)")
A(f"SELECT '{L1}', 'בבל מול ירושלים - בקעה מול הרים שיעור ראשון', '{S_BAVEL}', '{RAV_YOAV}',")
A(f"       '{AUD['L1']}',")
A(f"       'audio', 'published', '{{general}}', 10")
A(f"WHERE NOT EXISTS (SELECT 1 FROM lessons WHERE series_id='{S_BAVEL}' AND title='בבל מול ירושלים - בקעה מול הרים שיעור ראשון');")
A("")
A("-- L2: בבל מול ירושלים שיעור שני → same series @20")
A(f"INSERT INTO lessons (id, title, series_id, rabbi_id, audio_url, source_type, status, audience_tags, sort_order)")
A(f"SELECT '{L2}', 'בבל מול ירושלים - בקעה מול הרים שיעור שני', '{S_BAVEL}', '{RAV_YOAV}',")
A(f"       '{AUD['L2']}',")
A(f"       'audio', 'published', '{{general}}', 20")
A(f"WHERE NOT EXISTS (SELECT 1 FROM lessons WHERE series_id='{S_BAVEL}' AND title='בבל מול ירושלים - בקעה מול הרים שיעור שני');")
A("")
A("-- L3: תולדות קרבת ה' לאדם - ביציאת מצרים ובמתן תורה → series d7a37161 @15")
A("-- (old promo: 'שיעור שני בסדרה'; existing siblings sit at 10/20/30 → 15 lands it 2nd)")
A(f"INSERT INTO lessons (id, title, series_id, rabbi_id, audio_url, source_type, status, audience_tags, bible_book, sort_order)")
A(f"SELECT '{L3}', 'תולדות קרבת ה'' לאדם - ביציאת מצרים ובמתן תורה', '{S_TOLDOT}', '{RAV_YOAV}',")
A(f"       '{AUD['L3']}',")
A(f"       'audio', 'published', '{{general}}', 'בראשית', 15")
A(f"WHERE NOT EXISTS (SELECT 1 FROM lessons WHERE series_id='{S_TOLDOT}' AND title='תולדות קרבת ה'' לאדם - ביציאת מצרים ובמתן תורה');")
A("")
A("-- lesson_count sync (no trigger maintains it — checked pg_trigger)")
A(f"UPDATE series s SET lesson_count = (SELECT count(*) FROM lessons l WHERE l.series_id = s.id AND l.status='published')")
A(f"WHERE s.id IN ('{S_BAVEL}','{S_TOLDOT}')")
A(f"  AND s.lesson_count IS DISTINCT FROM (SELECT count(*) FROM lessons l WHERE l.series_id = s.id AND l.status='published');")
A("")
A("-- verification v4: expect 2 rows — בבל series lesson_count=2, תולדות=4; and the")
A("-- תולדות order: 06241e7e(10) < L3(15) < 2eabd61b(20) < 868860e6(30)")
A(f"SELECT id, title, lesson_count FROM series WHERE id IN ('{S_BAVEL}','{S_TOLDOT}');")
A(f"SELECT title, sort_order FROM lessons WHERE series_id='{S_TOLDOT}' ORDER BY sort_order;")
A(f"SELECT title, sort_order FROM lessons WHERE series_id='{S_BAVEL}' ORDER BY sort_order;")
A("")

open(os.path.join(HERE,'ROUND2.sql'),'w',encoding='utf-8').write('\n'.join(sql)+'\n')
print('wrote',os.path.join(HERE,'ROUND2.sql'),len(sql),'lines')
