-- ============================================================================
-- ROUND3-missing.sql — bnei-zion 1:1 parity, ROUND-3 LAST-MILE MISSING ITEMS
-- Author: round-3 missing-items analyst (read-only scoping via sbq.py; this file
--         is EXECUTED BY THE ORCHESTRATOR, not by the author).
-- Built from: reports/verify_results.json (listings: 172 pages / 1,290 missing
--   occurrences), fixes/analyze_missing_r3.py classification (fixes/r3_analysis.json),
--   match/item_match.json, plans/RESOLVED-OPS.jsonl, state/applied.jsonl,
--   old_listings_*.json, live SELECTs 2026-06-12.
-- POLICY: never DELETE (demotes are status='draft', reversible); every statement
--   carries old-page evidence; all statements IDEMPOTENT (guarded).
-- Copy semantics follow oneone_apply._copy_sql (clone + copied_from stamp) but with
--   gen_random_uuid() per ROUND-3 brief.
-- ============================================================================

-- ============================================================================
-- §1 STRAY-DRAFT-TWIN CHAINS — 5 old pages were matched to stray EMPTY/near-empty
--    draft twins parked at the נביאים root, while the plans (correctly) targeted the
--    ACTIVE twins. Reparenting each draft under its active twin's parent arms the
--    verifier's twin-repick (same parent + same normalized title + lessons>0), so the
--    page follows the real series. Drafts stay draft/sort 0 — invisible in the app.
--    Old pages: שיעורים-קצרים…מלכים-ב (61), שיעורים-על-התנך-יחזקאל (40),
--    ישעיהו-מוקלט-ללא-טעמים (36), שיעורים-יהושע (34), שיעורים-על-התנך-ירמיהו (20)
-- ----------------------------------------------------------------------------
-- scope: expect 5 rows still parented to the נביאים root pre-apply, 0 after
SELECT count(*) AS s1_twins_to_reparent FROM series WHERE id IN ('c466c2fc-a0e0-4a4d-81fd-53b218167dd5', '9064a41d-186c-4aba-94e6-48182b9616d5', '9675678a-6f50-4d18-ac90-5deebad36135', 'd5ef79b3-9d97-471f-80e3-2e4ff2deaf62', 'aeea0713-ae5c-4de6-b359-e69f79f0fbe5')
  AND parent_id = 'a0472c9f-8212-44ff-8937-ace5fea4b4dc';

-- stray draft twin of 'שיעורים קצרים - קריאה וביאור ספר מלכים ב' (5578c087); arming verify twin-repick for old page …/שיעורים-קצרים-קריאה-וביאור-ספר-מלכים-ב/
UPDATE series SET parent_id = '34cf4dfd-0b9e-4c6a-8970-bd03a46516b5'
WHERE id = 'c466c2fc-a0e0-4a4d-81fd-53b218167dd5' AND parent_id IS DISTINCT FROM '34cf4dfd-0b9e-4c6a-8970-bd03a46516b5';

-- stray draft twin of 'שיעורים על התנ"ך - יחזקאל' (b7b24b9b); arming verify twin-repick for old page …/שיעורים-על-התנך-יחזקאל/
UPDATE series SET parent_id = '5b0c3232-2ba9-4b6b-8b1e-4e8b1a82245d'
WHERE id = '9064a41d-186c-4aba-94e6-48182b9616d5' AND parent_id IS DISTINCT FROM '5b0c3232-2ba9-4b6b-8b1e-4e8b1a82245d';

-- stray draft twin of 'ישעיהו -  מוקלט | ללא טעמים' (cfb7da1a); arming verify twin-repick for old page …/ישעיהו-מוקלט-ללא-טעמים/
UPDATE series SET parent_id = '1fb20386-80be-4e03-a205-7ee9ea4a385b'
WHERE id = '9675678a-6f50-4d18-ac90-5deebad36135' AND parent_id IS DISTINCT FROM '1fb20386-80be-4e03-a205-7ee9ea4a385b';

-- stray draft twin of 'שיעורים - יהושע' (497d3550); arming verify twin-repick for old page …/שיעורים-יהושע/
UPDATE series SET parent_id = 'bd1c3a22-ed72-4c7b-811d-270dec1730f4'
WHERE id = 'd5ef79b3-9d97-471f-80e3-2e4ff2deaf62' AND parent_id IS DISTINCT FROM 'bd1c3a22-ed72-4c7b-811d-270dec1730f4';

-- stray draft twin of 'שיעורים על התנ"ך - ירמיהו' (6948ae1e); arming verify twin-repick for old page …/שיעורים-על-התנך-ירמיהו/
UPDATE series SET parent_id = '69c795d9-a415-43a2-afb1-8694fe2e2a60'
WHERE id = 'aeea0713-ae5c-4de6-b359-e69f79f0fbe5' AND parent_id IS DISTINCT FROM '69c795d9-a415-43a2-afb1-8694fe2e2a60';

-- ============================================================================
-- §2 MOVES — 17 lessons re-homed (each keeps every ancestor roll-up intact;
--    evidence per statement). Never deletes; sort set to the old-page slot.
-- ----------------------------------------------------------------------------
-- old page …/שיעורים-קצרים…מלכים-ב/ rows 60-61 ('פ (14)','פ (15)' הרב חנניה מלכה); rows currently stranded in the stray draft twin c466c2fc
UPDATE lessons SET series_id = '5578c087-d6cf-4319-b3c5-10cd555c9a3a', sort_order = 620
WHERE id = '78d7087b-8e31-4902-92e6-16dfa0c8413a' AND (series_id IS DISTINCT FROM '5578c087-d6cf-4319-b3c5-10cd555c9a3a' OR sort_order IS DISTINCT FROM 620);

-- old page …/שיעורים-קצרים…מלכים-ב/ rows 60-61 ('פ (14)','פ (15)' הרב חנניה מלכה); rows currently stranded in the stray draft twin c466c2fc
UPDATE lessons SET series_id = '5578c087-d6cf-4319-b3c5-10cd555c9a3a', sort_order = 630
WHERE id = 'c953bf5d-e5fa-4cb8-8c0d-72f95875578c' AND (series_id IS DISTINCT FROM '5578c087-d6cf-4319-b3c5-10cd555c9a3a' OR sort_order IS DISTINCT FROM 630);

-- twin 6948ae1e holds 'על מה אבדה הארץ' twice (a7160a62 sorted + c8775828 unsorted, same audio); old …/ירמיהו-פרק-ט/ lists the title twice and its series has one row
UPDATE lessons SET series_id = 'd1010001-0002-4000-8000-000000000040', sort_order = 90
WHERE id = 'c8775828-73a1-46d2-9b9a-db7c7895f12e' AND (series_id IS DISTINCT FROM 'd1010001-0002-4000-8000-000000000040' OR sort_order IS DISTINCT FROM 90);

-- old /כתובים/אסתר/כל-השיעורים-על-מגילת-אסתר/ row idx=9 'מגילת אסתר - פעולה חרישית' (pos 2) | home is the page's parent book node (direct lesson) — moving into the child series keeps every ancestor roll-up identical
UPDATE lessons SET series_id = '0ab89828-6005-4054-9e65-a724aa2ffb4d', sort_order = 20
WHERE id = '706a432d-068f-4dc9-97bc-42b5b81c4b21' AND (series_id IS DISTINCT FROM '0ab89828-6005-4054-9e65-a724aa2ffb4d' OR sort_order IS DISTINCT FROM 20);

-- old /כתובים/אסתר/כל-השיעורים-על-מגילת-אסתר/ row idx=10 'קריאה מחדש של סיפור מגילת אסתר' (pos 3) | home is the page's parent book node (direct lesson) — moving into the child series keeps every ancestor roll-up identical
UPDATE lessons SET series_id = '0ab89828-6005-4054-9e65-a724aa2ffb4d', sort_order = 30
WHERE id = '3b7b0f68-1ff2-4bb9-bd7d-68646ed44d37' AND (series_id IS DISTINCT FROM '0ab89828-6005-4054-9e65-a724aa2ffb4d' OR sort_order IS DISTINCT FROM 30);

-- old /כתובים/אסתר/כל-השיעורים-על-מגילת-אסתר/ row idx=11 'כתבוני לדורות' (pos 4) | home is the page's parent book node (direct lesson) — moving into the child series keeps every ancestor roll-up identical
UPDATE lessons SET series_id = '0ab89828-6005-4054-9e65-a724aa2ffb4d', sort_order = 40
WHERE id = '2858ddd9-113a-42e9-b071-df1c6913e48e' AND (series_id IS DISTINCT FROM '0ab89828-6005-4054-9e65-a724aa2ffb4d' OR sort_order IS DISTINCT FROM 40);

-- old /כתובים/אסתר/כל-השיעורים-על-מגילת-אסתר/ row idx=13 'אסתר קרקע עולם' (pos 6) | home is the page's parent book node (direct lesson) — moving into the child series keeps every ancestor roll-up identical
UPDATE lessons SET series_id = '0ab89828-6005-4054-9e65-a724aa2ffb4d', sort_order = 60
WHERE id = '5c961fd8-77d4-4684-a7ff-12894d312843' AND (series_id IS DISTINCT FROM '0ab89828-6005-4054-9e65-a724aa2ffb4d' OR sort_order IS DISTINCT FROM 60);

-- old /כתובים/אסתר/כל-השיעורים-על-מגילת-אסתר/ row idx=14 'קיום מצוות מחיית עמלק במגילת אסתר' (pos 7) | home is the page's parent book node (direct lesson) — moving into the child series keeps every ancestor roll-up identical
UPDATE lessons SET series_id = '0ab89828-6005-4054-9e65-a724aa2ffb4d', sort_order = 70
WHERE id = '06adb28d-7d9a-4cf1-a43b-533f94fbacab' AND (series_id IS DISTINCT FROM '0ab89828-6005-4054-9e65-a724aa2ffb4d' OR sort_order IS DISTINCT FROM 70);

-- old /כתובים/אסתר/כל-השיעורים-על-מגילת-אסתר/ row idx=15 'לבישת אסתר מלכות, פור וגורל' (pos 8) | home is the page's parent book node (direct lesson) — moving into the child series keeps every ancestor roll-up identical
UPDATE lessons SET series_id = '0ab89828-6005-4054-9e65-a724aa2ffb4d', sort_order = 80
WHERE id = 'a04393d4-1192-4c96-9943-6e9707dc5907' AND (series_id IS DISTINCT FROM '0ab89828-6005-4054-9e65-a724aa2ffb4d' OR sort_order IS DISTINCT FROM 80);

-- old /כתובים/אסתר/כל-השיעורים-על-מגילת-אסתר/ row idx=16 'מלכות אסתר' (pos 9) | home is the page's parent book node (direct lesson) — moving into the child series keeps every ancestor roll-up identical
UPDATE lessons SET series_id = '0ab89828-6005-4054-9e65-a724aa2ffb4d', sort_order = 90
WHERE id = '9b73f709-0dc6-4068-9365-726ffcf6e01c' AND (series_id IS DISTINCT FROM '0ab89828-6005-4054-9e65-a724aa2ffb4d' OR sort_order IS DISTINCT FROM 90);

-- old /כתובים/אסתר/כל-השיעורים-על-מגילת-אסתר/ row idx=17 'שתיקת אסתר' (pos 10) | home is the page's parent book node (direct lesson) — moving into the child series keeps every ancestor roll-up identical
UPDATE lessons SET series_id = '0ab89828-6005-4054-9e65-a724aa2ffb4d', sort_order = 100
WHERE id = '805ae410-0e15-4f16-8791-92d10cc07af4' AND (series_id IS DISTINCT FROM '0ab89828-6005-4054-9e65-a724aa2ffb4d' OR sort_order IS DISTINCT FROM 100);

-- old /כתובים/אסתר/כל-השיעורים-על-מגילת-אסתר/ row idx=18 'התקדמות הגאולה במגילה' (pos 11) | home is the page's parent book node (direct lesson) — moving into the child series keeps every ancestor roll-up identical
UPDATE lessons SET series_id = '0ab89828-6005-4054-9e65-a724aa2ffb4d', sort_order = 110
WHERE id = '7b256d3d-31c6-4334-bec9-36c5bfebbd84' AND (series_id IS DISTINCT FROM '0ab89828-6005-4054-9e65-a724aa2ffb4d' OR sort_order IS DISTINCT FROM 110);

-- old /כתובים/אסתר/כל-השיעורים-על-מגילת-אסתר/ row idx=19 'מלכות פירושה ראיית המהלך האלוקי' (pos 12) | home is the page's parent book node (direct lesson) — moving into the child series keeps every ancestor roll-up identical
UPDATE lessons SET series_id = '0ab89828-6005-4054-9e65-a724aa2ffb4d', sort_order = 120
WHERE id = 'fff6d263-7d62-46d3-8cb2-73b4257696ab' AND (series_id IS DISTINCT FROM '0ab89828-6005-4054-9e65-a724aa2ffb4d' OR sort_order IS DISTINCT FROM 120);

-- old /כתובים/אסתר/כל-השיעורים-על-מגילת-אסתר/ row idx=20 'עיון בסיפור המגילה' (pos 13) | home is the page's parent book node (direct lesson) — moving into the child series keeps every ancestor roll-up identical
UPDATE lessons SET series_id = '0ab89828-6005-4054-9e65-a724aa2ffb4d', sort_order = 130
WHERE id = 'ac33ddf3-b66c-41cf-a38e-c4b0b2e59919' AND (series_id IS DISTINCT FROM '0ab89828-6005-4054-9e65-a724aa2ffb4d' OR sort_order IS DISTINCT FROM 130);

-- old /כתובים/אסתר/כל-השיעורים-על-מגילת-אסתר/ row idx=21 '"ותלבש אסתר מלכות"' (pos 14) | home is the page's parent book node (direct lesson) — moving into the child series keeps every ancestor roll-up identical
UPDATE lessons SET series_id = '0ab89828-6005-4054-9e65-a724aa2ffb4d', sort_order = 140
WHERE id = 'b178a138-ceb9-4cdd-b3fe-efe45aa2ecc7' AND (series_id IS DISTINCT FROM '0ab89828-6005-4054-9e65-a724aa2ffb4d' OR sort_order IS DISTINCT FROM 140);

-- old /כתובים/אסתר/כל-השיעורים-על-מגילת-אסתר/ row idx=24 'מגילת אסתר וספרי הבית השני 1' (pos 17) | home is the page's parent book node (direct lesson) — moving into the child series keeps every ancestor roll-up identical
UPDATE lessons SET series_id = '0ab89828-6005-4054-9e65-a724aa2ffb4d', sort_order = 170
WHERE id = 'f99d125d-06a2-4334-ba13-ceae673319f3' AND (series_id IS DISTINCT FROM '0ab89828-6005-4054-9e65-a724aa2ffb4d' OR sort_order IS DISTINCT FROM 170);

-- old /כתובים/אסתר/כל-השיעורים-על-מגילת-אסתר/ row idx=25 'מגילת אסתר וספרי הבית השני 2' (pos 18) | home is the page's parent book node (direct lesson) — moving into the child series keeps every ancestor roll-up identical
UPDATE lessons SET series_id = '0ab89828-6005-4054-9e65-a724aa2ffb4d', sort_order = 180
WHERE id = '8644ccab-54d4-486a-9efb-e615e86baec1' AND (series_id IS DISTINCT FROM '0ab89828-6005-4054-9e65-a724aa2ffb4d' OR sort_order IS DISTINCT FROM 180);

-- ============================================================================
-- §3 COPIES — 79 guarded clones (oneone_apply copy semantics: full column
--    clone + copied_from stamp; id = gen_random_uuid(); status forced 'published';
--    audience union 'general' — an old PUBLIC page lists the row).
-- ----------------------------------------------------------------------------
-- old page …/שיעורים-על-התנך-יחזקאל/ row 27 '"אחד היה אברהם"' (הרב יצחק בן שחר); stage7 op b0a8460f…(idx 2511) errored no-row-in-scope — the copy that should have created the row was never planned
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'b7b24b9b-133f-495c-b88c-690a60154cea',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,270,id
FROM lessons WHERE id = '7c0ae70c-e31c-415a-be4f-2b9aa1211a14'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '7c0ae70c-e31c-415a-be4f-2b9aa1211a14' AND c.series_id = 'b7b24b9b-133f-495c-b88c-690a60154cea')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '7c0ae70c-e31c-415a-be4f-2b9aa1211a14' AND h.series_id = 'b7b24b9b-133f-495c-b88c-690a60154cea');

-- old /כתובים/אסתר/כל-השיעורים-על-מגילת-אסתר/ row idx=23 'מגילת אסתר – מגילת הסתר' (pos 16) | lesson anchored in 'פורים' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'0ab89828-6005-4054-9e65-a724aa2ffb4d',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,160,id
FROM lessons WHERE id = 'f5050501-a002-4000-a000-000000000001'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = 'f5050501-a002-4000-a000-000000000001' AND c.series_id = '0ab89828-6005-4054-9e65-a724aa2ffb4d')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = 'f5050501-a002-4000-a000-000000000001' AND h.series_id = '0ab89828-6005-4054-9e65-a724aa2ffb4d');

-- old /כתובים/אסתר/כל-השיעורים-על-מגילת-אסתר/ row idx=26 'שיבת ציון - אז והיום' (pos 19) | lesson anchored in 'יום העצמאות' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'0ab89828-6005-4054-9e65-a724aa2ffb4d',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,190,id
FROM lessons WHERE id = 'e6060601-c001-4000-8000-000000000001'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = 'e6060601-c001-4000-8000-000000000001' AND c.series_id = '0ab89828-6005-4054-9e65-a724aa2ffb4d')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = 'e6060601-c001-4000-8000-000000000001' AND h.series_id = '0ab89828-6005-4054-9e65-a724aa2ffb4d');

-- old /כתובים/אסתר/כל-השיעורים-על-מגילת-אסתר/ row idx=27 'תאריכים בימי שיבת ציון' (pos 20) | lesson anchored in 'תקופת הבית השני' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'0ab89828-6005-4054-9e65-a724aa2ffb4d',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,200,id
FROM lessons WHERE id = '4722a798-2749-40dd-af7b-6e5db440f3a3'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '4722a798-2749-40dd-af7b-6e5db440f3a3' AND c.series_id = '0ab89828-6005-4054-9e65-a724aa2ffb4d')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '4722a798-2749-40dd-af7b-6e5db440f3a3' AND h.series_id = '0ab89828-6005-4054-9e65-a724aa2ffb4d');

-- old /כתובים/אסתר/כל-השיעורים-על-מגילת-אסתר/ row idx=28 'ציר זמן גלות בבל' (pos 21) | lesson anchored in 'כלי עזר - טבלאות זמני המאורעות ומפות' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'0ab89828-6005-4054-9e65-a724aa2ffb4d',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,210,id
FROM lessons WHERE id = 'dcf80845-e11a-4e72-9fba-bbf2ccb7d4d6'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = 'dcf80845-e11a-4e72-9fba-bbf2ccb7d4d6' AND c.series_id = '0ab89828-6005-4054-9e65-a724aa2ffb4d')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = 'dcf80845-e11a-4e72-9fba-bbf2ccb7d4d6' AND h.series_id = '0ab89828-6005-4054-9e65-a724aa2ffb4d');

-- old /הפטרות/הפטרות-שמות/מאמרים-הפטרות-ספר-שמות/ row idx=1 'נצחיות עם ישראל וגאולת עם ישראל' (pos 1) | lesson anchored in 'הפטרת בא' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'269dc17c-0cc1-4484-82e5-b7538b28f948',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,10,id
FROM lessons WHERE id = '21c9e5c2-65a9-4cca-ad05-42f73e77f4c5'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '21c9e5c2-65a9-4cca-ad05-42f73e77f4c5' AND c.series_id = '269dc17c-0cc1-4484-82e5-b7538b28f948')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '21c9e5c2-65a9-4cca-ad05-42f73e77f4c5' AND h.series_id = '269dc17c-0cc1-4484-82e5-b7538b28f948');

-- old /הפטרות/הפטרות-שמות/מאמרים-הפטרות-ספר-שמות/ row idx=2 'עד כמה צריך להיזהר מלדבר רע על עם ישראל' (pos 2) | lesson anchored in 'ישעיהו פרק ו' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'269dc17c-0cc1-4484-82e5-b7538b28f948',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,20,id
FROM lessons WHERE id = '37a3c8fc-a008-4412-a6ae-d21d7b1fac54'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '37a3c8fc-a008-4412-a6ae-d21d7b1fac54' AND c.series_id = '269dc17c-0cc1-4484-82e5-b7538b28f948')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '37a3c8fc-a008-4412-a6ae-d21d7b1fac54' AND h.series_id = '269dc17c-0cc1-4484-82e5-b7538b28f948');

-- old /הפטרות/הפטרות-שמות/מאמרים-הפטרות-ספר-שמות/ row idx=3 'כיצד יתכן ששלמה המלך כרת ברית עם חירם מלך ' (pos 3) | lesson anchored in 'מאמרים - ספר מלכים א' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'269dc17c-0cc1-4484-82e5-b7538b28f948',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,30,id
FROM lessons WHERE id = '0b07e143-6eca-494e-b408-8ab506b2ea95'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '0b07e143-6eca-494e-b408-8ab506b2ea95' AND c.series_id = '269dc17c-0cc1-4484-82e5-b7538b28f948')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '0b07e143-6eca-494e-b408-8ab506b2ea95' AND h.series_id = '269dc17c-0cc1-4484-82e5-b7538b28f948');

-- old /הפטרות/הפטרות-שמות/מאמרים-הפטרות-ספר-שמות/ row idx=4 'מידות המשכן והמקדש' (pos 4) | lesson anchored in "המקדש ובית שלמה | פרקים ו'-ז'" → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'269dc17c-0cc1-4484-82e5-b7538b28f948',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,40,id
FROM lessons WHERE id = '23d0cdf1-e4ef-45e3-aa0b-f70883c487af'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '23d0cdf1-e4ef-45e3-aa0b-f70883c487af' AND c.series_id = '269dc17c-0cc1-4484-82e5-b7538b28f948')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '23d0cdf1-e4ef-45e3-aa0b-f70883c487af' AND h.series_id = '269dc17c-0cc1-4484-82e5-b7538b28f948');

-- old /הפטרות/הפטרות-שמות/מאמרים-הפטרות-ספר-שמות/ row idx=5 'מה היה גובהו של בית המקדש הראשון?' (pos 5) | lesson anchored in 'מאמרים - ספר מלכים א' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'269dc17c-0cc1-4484-82e5-b7538b28f948',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,50,id
FROM lessons WHERE id = '5893017d-b0d8-4488-848f-8373f4f5584e'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '5893017d-b0d8-4488-848f-8373f4f5584e' AND c.series_id = '269dc17c-0cc1-4484-82e5-b7538b28f948')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '5893017d-b0d8-4488-848f-8373f4f5584e' AND h.series_id = '269dc17c-0cc1-4484-82e5-b7538b28f948');

-- old /הפטרות/הפטרות-שמות/מאמרים-הפטרות-ספר-שמות/ row idx=6 'הברית על שילוח עבדים' (pos 6) | lesson anchored in 'מאמרים - ספר ירמיהו' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'269dc17c-0cc1-4484-82e5-b7538b28f948',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,60,id
FROM lessons WHERE id = '6c8bc438-1640-416b-a177-e0474c7eaece'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '6c8bc438-1640-416b-a177-e0474c7eaece' AND c.series_id = '269dc17c-0cc1-4484-82e5-b7538b28f948')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '6c8bc438-1640-416b-a177-e0474c7eaece' AND h.series_id = '269dc17c-0cc1-4484-82e5-b7538b28f948');

-- old /הפטרות/הפטרות-שמות/מאמרים-הפטרות-ספר-שמות/ row idx=7 'מדוע שילחו אנשי ירושלים את עבדיהם ומדוע הח' (pos 7) | lesson anchored in 'מאמרים - ספר ירמיהו' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'269dc17c-0cc1-4484-82e5-b7538b28f948',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,70,id
FROM lessons WHERE id = '3bf25e1c-6f74-4690-9642-d7ddcd12deb5'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '3bf25e1c-6f74-4690-9642-d7ddcd12deb5' AND c.series_id = '269dc17c-0cc1-4484-82e5-b7538b28f948')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '3bf25e1c-6f74-4690-9642-d7ddcd12deb5' AND h.series_id = '269dc17c-0cc1-4484-82e5-b7538b28f948');

-- old /נושאים-כלליים-בתנך/מלחמת-גוג-ומגוג/ row idx=3 'נבואות מלחמת גוג ומגוג' (pos 2) | lesson anchored in 'מעבר לשיעורים על גוג ומגוג' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'c76ac534-76b4-4f2c-ba9a-05ed95e7145c',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,20,id
FROM lessons WHERE id = 'd4040401-2003-4000-a000-000000000003'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = 'd4040401-2003-4000-a000-000000000003' AND c.series_id = 'c76ac534-76b4-4f2c-ba9a-05ed95e7145c')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = 'd4040401-2003-4000-a000-000000000003' AND h.series_id = 'c76ac534-76b4-4f2c-ba9a-05ed95e7145c');

-- old /נושאים-כלליים-בתנך/מלחמת-גוג-ומגוג/ row idx=4 'גוג ומגוג - מה זה?' (pos 3) | lesson anchored in 'ימי עיון בתנ"ך - תשע"ו' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'c76ac534-76b4-4f2c-ba9a-05ed95e7145c',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,30,id
FROM lessons WHERE id = '6388c942-b096-493a-b0f6-5ab69162351c'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '6388c942-b096-493a-b0f6-5ab69162351c' AND c.series_id = 'c76ac534-76b4-4f2c-ba9a-05ed95e7145c')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '6388c942-b096-493a-b0f6-5ab69162351c' AND h.series_id = 'c76ac534-76b4-4f2c-ba9a-05ed95e7145c');

-- old /נושאים-כלליים-בתנך/מלחמת-גוג-ומגוג/ row idx=5 'לב הפרק - הקדמה לגוג ומגוג' (pos 4) | lesson anchored in 'מעבר לשיעורים על גוג ומגוג' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'c76ac534-76b4-4f2c-ba9a-05ed95e7145c',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,40,id
FROM lessons WHERE id = '27049a7e-7410-43cb-b159-facd22c4865f'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '27049a7e-7410-43cb-b159-facd22c4865f' AND c.series_id = 'c76ac534-76b4-4f2c-ba9a-05ed95e7145c')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '27049a7e-7410-43cb-b159-facd22c4865f' AND h.series_id = 'c76ac534-76b4-4f2c-ba9a-05ed95e7145c');

-- old /נביאים/מלכים-ב/מנשה-ואמון-פרק-כא/ row idx=1 '"בצר לך ומצאוך... ושבת עד ד\' אלקיך"' (pos 1) | lesson anchored in 'מנשה ואמון | פרק כ"א' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'d2020001-0001-4000-8000-000000000012',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,10,id
FROM lessons WHERE id = 'a2c3087e-fa6a-41c2-b0eb-2522784213f7'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = 'a2c3087e-fa6a-41c2-b0eb-2522784213f7' AND c.series_id = 'd2020001-0001-4000-8000-000000000012')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = 'a2c3087e-fa6a-41c2-b0eb-2522784213f7' AND h.series_id = 'd2020001-0001-4000-8000-000000000012');

-- old /נביאים/מלכים-ב/מנשה-ואמון-פרק-כא/ row idx=2 'כיצד נגאלים?' (pos 2) | lesson anchored in 'מנשה ואמון | פרק כ"א' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'d2020001-0001-4000-8000-000000000012',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,20,id
FROM lessons WHERE id = '5ca7e97b-9f48-4c8b-b1a2-ffaab7c7756e'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '5ca7e97b-9f48-4c8b-b1a2-ffaab7c7756e' AND c.series_id = 'd2020001-0001-4000-8000-000000000012')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '5ca7e97b-9f48-4c8b-b1a2-ffaab7c7756e' AND h.series_id = 'd2020001-0001-4000-8000-000000000012');

-- old /נביאים/מלכים-ב/מנשה-ואמון-פרק-כא/ row idx=3 'מדוע נאמרו עשרת הדברות בסדר זה?' (pos 3) | lesson anchored in 'מנשה ואמון | פרק כ"א' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'d2020001-0001-4000-8000-000000000012',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,30,id
FROM lessons WHERE id = '15f0f9d4-ab73-4f95-9def-9198b25c62c0'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '15f0f9d4-ab73-4f95-9def-9198b25c62c0' AND c.series_id = 'd2020001-0001-4000-8000-000000000012')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '15f0f9d4-ab73-4f95-9def-9198b25c62c0' AND h.series_id = 'd2020001-0001-4000-8000-000000000012');

-- old /נביאים/מלכים-ב/מנשה-ואמון-פרק-כא/ row idx=4 "כיצד נגיע לאהבת ד'?" (pos 4) | lesson anchored in 'מנשה ואמון | פרק כ"א' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'d2020001-0001-4000-8000-000000000012',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,40,id
FROM lessons WHERE id = '7ef98398-6b4d-45dc-a36b-b2a7e87ab2e6'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '7ef98398-6b4d-45dc-a36b-b2a7e87ab2e6' AND c.series_id = 'd2020001-0001-4000-8000-000000000012')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '7ef98398-6b4d-45dc-a36b-b2a7e87ab2e6' AND h.series_id = 'd2020001-0001-4000-8000-000000000012');

-- old /נביאים/מלכים-ב/מנשה-ואמון-פרק-כא/ row idx=5 'מלכות מנשה' (pos 5) | lesson anchored in 'מנשה ואמון | פרק כ"א' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'d2020001-0001-4000-8000-000000000012',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,50,id
FROM lessons WHERE id = '473e00f9-c0bc-4d81-819e-eea1c7547d56'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '473e00f9-c0bc-4d81-819e-eea1c7547d56' AND c.series_id = 'd2020001-0001-4000-8000-000000000012')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '473e00f9-c0bc-4d81-819e-eea1c7547d56' AND h.series_id = 'd2020001-0001-4000-8000-000000000012');

-- old /נביאים/מלכים-ב/מנשה-ואמון-פרק-כא/ row idx=6 'תשובת מנשה' (pos 6) | lesson anchored in 'מנשה ואמון | פרק כ"א' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'d2020001-0001-4000-8000-000000000012',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,60,id
FROM lessons WHERE id = '29345c97-7c0b-45ce-b359-225ccf82e867'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '29345c97-7c0b-45ce-b359-225ccf82e867' AND c.series_id = 'd2020001-0001-4000-8000-000000000012')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '29345c97-7c0b-45ce-b359-225ccf82e867' AND h.series_id = 'd2020001-0001-4000-8000-000000000012');

-- old /נביאים/מלכים-ב/מנשה-ואמון-פרק-כא/ row idx=7 'כיצד יתכן שמנשה מלך יהודה עבד עבודה זרה?' (pos 7) | lesson anchored in 'מנשה ואמון | פרק כ"א' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'d2020001-0001-4000-8000-000000000012',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,70,id
FROM lessons WHERE id = 'a0407cdd-5894-47c9-8f55-45296367c41b'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = 'a0407cdd-5894-47c9-8f55-45296367c41b' AND c.series_id = 'd2020001-0001-4000-8000-000000000012')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = 'a0407cdd-5894-47c9-8f55-45296367c41b' AND h.series_id = 'd2020001-0001-4000-8000-000000000012');

-- old /נביאים/מלכים-ב/מנשה-ואמון-פרק-כא/ row idx=8 'מדוע לא נכתבה תשובת מנשה בספר מלכים?' (pos 8) | lesson anchored in 'מנשה ואמון | פרק כ"א' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'d2020001-0001-4000-8000-000000000012',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,80,id
FROM lessons WHERE id = '891716c6-e573-4a88-a879-5ac0fa33e7c6'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '891716c6-e573-4a88-a879-5ac0fa33e7c6' AND c.series_id = 'd2020001-0001-4000-8000-000000000012')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '891716c6-e573-4a88-a879-5ac0fa33e7c6' AND h.series_id = 'd2020001-0001-4000-8000-000000000012');

-- old /נביאים/מלכים-ב/מנשה-ואמון-פרק-כא/ row idx=9 'חטאי מנשה' (pos 9) | lesson anchored in 'מנשה ואמון | פרק כ"א' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'d2020001-0001-4000-8000-000000000012',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,90,id
FROM lessons WHERE id = '32765da2-a61b-4a03-9ba6-7760d67f5eec'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '32765da2-a61b-4a03-9ba6-7760d67f5eec' AND c.series_id = 'd2020001-0001-4000-8000-000000000012')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '32765da2-a61b-4a03-9ba6-7760d67f5eec' AND h.series_id = 'd2020001-0001-4000-8000-000000000012');

-- old /נביאים/מלכים-ב/מנשה-ואמון-פרק-כא/ row idx=10 'תשובת מנשה' (pos 10) | lesson anchored in 'שיעורים קצרים - קריאה וביאור ספר מלכים ב' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'d2020001-0001-4000-8000-000000000012',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,100,id
FROM lessons WHERE id = '6ea9d61c-3ca9-4a3a-a898-85bf4d7d3f93'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '6ea9d61c-3ca9-4a3a-a898-85bf4d7d3f93' AND c.series_id = 'd2020001-0001-4000-8000-000000000012')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '6ea9d61c-3ca9-4a3a-a898-85bf4d7d3f93' AND h.series_id = 'd2020001-0001-4000-8000-000000000012');

-- old /נביאים/מלכים-ב/מנשה-ואמון-פרק-כא/ row idx=11 'אמון' (pos 11) | lesson anchored in 'מנשה ואמון | פרק כ"א' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'d2020001-0001-4000-8000-000000000012',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,110,id
FROM lessons WHERE id = '460085c5-285a-46ef-8017-d7c77311dba1'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '460085c5-285a-46ef-8017-d7c77311dba1' AND c.series_id = 'd2020001-0001-4000-8000-000000000012')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '460085c5-285a-46ef-8017-d7c77311dba1' AND h.series_id = 'd2020001-0001-4000-8000-000000000012');

-- old /נביאים/מלכים-ב/מנשה-ואמון-פרק-כא/ row idx=12 'מלכים ב פרק כא' (pos 12) | lesson anchored in 'מנשה ואמון | פרק כ"א' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'d2020001-0001-4000-8000-000000000012',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,120,id
FROM lessons WHERE id = '215d7dde-da6c-4362-b2ad-8393b58ddefa'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '215d7dde-da6c-4362-b2ad-8393b58ddefa' AND c.series_id = 'd2020001-0001-4000-8000-000000000012')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '215d7dde-da6c-4362-b2ad-8393b58ddefa' AND h.series_id = 'd2020001-0001-4000-8000-000000000012');

-- old /נביאים/מלכים-ב/מנשה-ואמון-פרק-כא/ row idx=13 'מלכים ב מוקלט - פרק כא | ללא טעמים' (pos 13) | lesson anchored in 'מנשה ואמון | פרק כ"א' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'d2020001-0001-4000-8000-000000000012',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,130,id
FROM lessons WHERE id = '9829569f-9ada-4f32-8959-fb00f919b832'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '9829569f-9ada-4f32-8959-fb00f919b832' AND c.series_id = 'd2020001-0001-4000-8000-000000000012')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '9829569f-9ada-4f32-8959-fb00f919b832' AND h.series_id = 'd2020001-0001-4000-8000-000000000012');

-- old /נביאים/מלכים-ב/מנשה-ואמון-פרק-כא/ row idx=14 'תשובת מנשה' (pos 14) | lesson anchored in 'שיעורים על ספר מלכים ב' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'d2020001-0001-4000-8000-000000000012',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,140,id
FROM lessons WHERE id = '777eeb8a-0a8c-44d0-9aaf-5337e32e2383'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '777eeb8a-0a8c-44d0-9aaf-5337e32e2383' AND c.series_id = 'd2020001-0001-4000-8000-000000000012')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '777eeb8a-0a8c-44d0-9aaf-5337e32e2383' AND h.series_id = 'd2020001-0001-4000-8000-000000000012');

-- old /נביאים/מלכים-ב/מנשה-ואמון-פרק-כא/ row idx=15 'צרת הארבה ותשובת מנשה על פי יואל ונחום' (pos 15) | lesson anchored in 'מנשה ואמון | פרק כ"א' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'d2020001-0001-4000-8000-000000000012',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,150,id
FROM lessons WHERE id = '3c31cd9a-fd59-4561-9b85-aeef12f63ffe'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '3c31cd9a-fd59-4561-9b85-aeef12f63ffe' AND c.series_id = 'd2020001-0001-4000-8000-000000000012')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '3c31cd9a-fd59-4561-9b85-aeef12f63ffe' AND h.series_id = 'd2020001-0001-4000-8000-000000000012');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=1 'ביאור "ושננתם" לספר שופטים פרק י"ז' (pos 1) | lesson anchored in 'פסל מיכה | פרקים יז-יח' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,10,id
FROM lessons WHERE id = '6b124e1e-3e9b-46ad-9f59-9d7f62ccf75b'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '6b124e1e-3e9b-46ad-9f59-9d7f62ccf75b' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '6b124e1e-3e9b-46ad-9f59-9d7f62ccf75b' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=3 'פסל מיכה' (pos 3) | lesson anchored in 'פסל מיכה | פרקים יז-יח' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,30,id
FROM lessons WHERE id = '5593d207-c3eb-44df-9003-02c8c3eb0669'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '5593d207-c3eb-44df-9003-02c8c3eb0669' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '5593d207-c3eb-44df-9003-02c8c3eb0669' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=4 'פסל מיכה - המשך' (pos 4) | lesson anchored in 'פסל מיכה | פרקים יז-יח' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,40,id
FROM lessons WHERE id = '3f920e27-4a76-4aef-82ab-92b04e65ae92'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '3f920e27-4a76-4aef-82ab-92b04e65ae92' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '3f920e27-4a76-4aef-82ab-92b04e65ae92' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=5 'פסל מיכה - סיום' (pos 5) | lesson anchored in 'פסל מיכה | פרקים יז-יח' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,50,id
FROM lessons WHERE id = '4b1a45ec-b098-4ca2-b355-db84ac8ed36c'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '4b1a45ec-b098-4ca2-b355-db84ac8ed36c' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '4b1a45ec-b098-4ca2-b355-db84ac8ed36c' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=6 'פסל מיכה' (pos 6) | lesson anchored in 'פסל מיכה | פרקים יז-יח' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,60,id
FROM lessons WHERE id = '7966061d-f1c5-43d4-8457-0b2ab1035537'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '7966061d-f1c5-43d4-8457-0b2ab1035537' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '7966061d-f1c5-43d4-8457-0b2ab1035537' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=7 'גנבת הכסף' (pos 7) | lesson anchored in 'פסל מיכה | פרקים יז-יח' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,70,id
FROM lessons WHERE id = '1fc0eb40-3c79-4520-b96d-0e84c8294694'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '1fc0eb40-3c79-4520-b96d-0e84c8294694' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '1fc0eb40-3c79-4520-b96d-0e84c8294694' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=8 'הנער הלוי' (pos 8) | lesson anchored in 'פסל מיכה | פרקים יז-יח' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,80,id
FROM lessons WHERE id = 'fe7dd530-04d1-4dda-8d46-5b2fe247842c'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = 'fe7dd530-04d1-4dda-8d46-5b2fe247842c' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = 'fe7dd530-04d1-4dda-8d46-5b2fe247842c' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=9 'בני דן באים לליש' (pos 9) | lesson anchored in 'פסל מיכה | פרקים יז-יח' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,90,id
FROM lessons WHERE id = '27e899a9-1ed5-4b20-88a0-0d9211797b31'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '27e899a9-1ed5-4b20-88a0-0d9211797b31' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '27e899a9-1ed5-4b20-88a0-0d9211797b31' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=10 'מפגש בני דן עם הנער הלוי' (pos 10) | lesson anchored in 'פסל מיכה | פרקים יז-יח' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,100,id
FROM lessons WHERE id = 'f56426ec-adbf-4bc0-8ec7-86c2f1e0e635'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = 'f56426ec-adbf-4bc0-8ec7-86c2f1e0e635' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = 'f56426ec-adbf-4bc0-8ec7-86c2f1e0e635' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=11 'בני דן גונבים את פסל מיכה' (pos 11) | lesson anchored in 'פסל מיכה | פרקים יז-יח' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,110,id
FROM lessons WHERE id = '244d752d-54a2-45f8-8ab3-d160ccac89c7'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '244d752d-54a2-45f8-8ab3-d160ccac89c7' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '244d752d-54a2-45f8-8ab3-d160ccac89c7' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=12 'בני דן כובשים את ליש' (pos 12) | lesson anchored in 'פסל מיכה | פרקים יז-יח' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,120,id
FROM lessons WHERE id = '28b0b6f8-2e6a-4372-aff8-9de3f1fb6dc6'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '28b0b6f8-2e6a-4372-aff8-9de3f1fb6dc6' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '28b0b6f8-2e6a-4372-aff8-9de3f1fb6dc6' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=13 'פסל מיכה' (pos 13) | lesson anchored in 'שיעורים על התנ"ך - שופטים' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,130,id
FROM lessons WHERE id = '3709c10b-d17a-4251-b85e-94ad12127dc5'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '3709c10b-d17a-4251-b85e-94ad12127dc5' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '3709c10b-d17a-4251-b85e-94ad12127dc5' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=14 '"אלוהים" גנובים' (pos 14) | lesson anchored in 'פסל מיכה | פרקים יז-יח' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,140,id
FROM lessons WHERE id = '7db38f24-9e74-4221-afce-a0feefc693ed'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '7db38f24-9e74-4221-afce-a0feefc693ed' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '7db38f24-9e74-4221-afce-a0feefc693ed' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=15 'מדוע נכתבה פרשת פסל מיכה בסוף ספר שופטים?' (pos 15) | lesson anchored in 'פסל מיכה | פרקים יז-יח' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,150,id
FROM lessons WHERE id = '9544910e-0f9c-4492-b74b-a3fbbfe03579'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '9544910e-0f9c-4492-b74b-a3fbbfe03579' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '9544910e-0f9c-4492-b74b-a3fbbfe03579' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=16 'שבט דן - עבודה זרה עמהם ומנצחים במלחמה?!' (pos 16) | lesson anchored in 'פסל מיכה | פרקים יז-יח' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,160,id
FROM lessons WHERE id = 'c919ce59-2801-4d27-9931-99efdaa976b9'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = 'c919ce59-2801-4d27-9931-99efdaa976b9' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = 'c919ce59-2801-4d27-9931-99efdaa976b9' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=17 'הסכנה בנפילה לרוחניות קלה ושטחית' (pos 17) | lesson anchored in 'פסל מיכה | פרקים יז-יח' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,170,id
FROM lessons WHERE id = '941d2835-2797-4748-a5f3-b108125b6da5'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '941d2835-2797-4748-a5f3-b108125b6da5' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '941d2835-2797-4748-a5f3-b108125b6da5' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=18 'פסל מיכה,תחילת תמצות ספר שופטים' (pos 18) | lesson anchored in 'פסל מיכה | פרקים יז-יח' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,180,id
FROM lessons WHERE id = 'a0826a91-896e-40b4-a84c-eb817aa1060d'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = 'a0826a91-896e-40b4-a84c-eb817aa1060d' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = 'a0826a91-896e-40b4-a84c-eb817aa1060d' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=19 'הקדמה לפסל מיכה - פסל לשם שמים' (pos 19) | lesson anchored in 'פסל מיכה | פרקים יז-יח' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,190,id
FROM lessons WHERE id = '1723e100-e632-40cc-a091-19bd5cfddae7'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '1723e100-e632-40cc-a091-19bd5cfddae7' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '1723e100-e632-40cc-a091-19bd5cfddae7' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=20 'הסוד של פסל מיכה, חטא העגל ועגלי ירבעם' (pos 20) | lesson anchored in 'פסל מיכה | פרקים יז-יח' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,200,id
FROM lessons WHERE id = '351c36da-7965-4223-8254-bd542bdf4f6a'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '351c36da-7965-4223-8254-bd542bdf4f6a' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '351c36da-7965-4223-8254-bd542bdf4f6a' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=21 'מי הוא יהונתן בן גרשום בן משה?' (pos 21) | lesson anchored in 'פסל מיכה | פרקים יז-יח' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,210,id
FROM lessons WHERE id = '44d76172-0eba-4170-b391-a57ccc0159df'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '44d76172-0eba-4170-b391-a57ccc0159df' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '44d76172-0eba-4170-b391-a57ccc0159df' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=22 'ההתפתחויות בכיבוש הארץ בפסל מיכה ופילגש בג' (pos 22) | lesson anchored in 'פסל מיכה | פרקים יז-יח' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,220,id
FROM lessons WHERE id = '242d5bfa-8356-484e-bae5-ee0a49b31d9d'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '242d5bfa-8356-484e-bae5-ee0a49b31d9d' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '242d5bfa-8356-484e-bae5-ee0a49b31d9d' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=23 'צמיחת בנימין מפרשת פילגש בגבעה' (pos 23) | lesson anchored in 'פסל מיכה | פרקים יז-יח' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,230,id
FROM lessons WHERE id = '18005548-7313-4336-b930-b2c568f940c5'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '18005548-7313-4336-b930-b2c568f940c5' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '18005548-7313-4336-b930-b2c568f940c5' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=24 'מינוי הלוי לכהן לפסל מיכה' (pos 24) | lesson anchored in 'פסל מיכה | פרקים יז-יח' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,240,id
FROM lessons WHERE id = 'e86b73b0-e8ba-42b6-9338-8a39d44729f3'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = 'e86b73b0-e8ba-42b6-9338-8a39d44729f3' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = 'e86b73b0-e8ba-42b6-9338-8a39d44729f3' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=25 'בני דן מבקרים את מיכה' (pos 25) | lesson anchored in 'פסל מיכה | פרקים יז-יח' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,250,id
FROM lessons WHERE id = '6e768a01-cc5b-45e9-95c4-f38db1eaa429'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '6e768a01-cc5b-45e9-95c4-f38db1eaa429' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '6e768a01-cc5b-45e9-95c4-f38db1eaa429' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=26 'כיבוש ליש וגניבת הפסל' (pos 26) | lesson anchored in 'פסל מיכה | פרקים יז-יח' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,260,id
FROM lessons WHERE id = '645e72c8-c921-4b9f-9777-3950b20cdbf9'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '645e72c8-c921-4b9f-9777-3950b20cdbf9' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '645e72c8-c921-4b9f-9777-3950b20cdbf9' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=27 'שופטים פרק יז' (pos 27) | lesson anchored in 'פסל מיכה | פרקים יז-יח' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,270,id
FROM lessons WHERE id = '8d5950b5-dc0f-4a4a-a82a-2049fedb6091'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '8d5950b5-dc0f-4a4a-a82a-2049fedb6091' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '8d5950b5-dc0f-4a4a-a82a-2049fedb6091' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=28 'שופטים פרק יח' (pos 28) | lesson anchored in 'פסל מיכה | פרקים יז-יח' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,280,id
FROM lessons WHERE id = '95716b86-1d13-4b36-aa8b-657307012ed4'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '95716b86-1d13-4b36-aa8b-657307012ed4' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '95716b86-1d13-4b36-aa8b-657307012ed4' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=29 'ספר שופטים מוקלט - פרק יז' (pos 29) | lesson anchored in 'פסל מיכה | פרקים יז-יח' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,290,id
FROM lessons WHERE id = '559248db-fe20-4766-96e0-7a774f296308'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '559248db-fe20-4766-96e0-7a774f296308' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '559248db-fe20-4766-96e0-7a774f296308' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=30 'ספר שופטים מוקלט - פרק יח' (pos 30) | lesson anchored in 'פסל מיכה | פרקים יז-יח' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,300,id
FROM lessons WHERE id = 'b0e77318-083d-4352-9834-4a59acee6f85'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = 'b0e77318-083d-4352-9834-4a59acee6f85' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = 'b0e77318-083d-4352-9834-4a59acee6f85' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=31 'שופטים מוקלט - פרק יז | ללא טעמים' (pos 31) | lesson anchored in 'פסל מיכה | פרקים יז-יח' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,310,id
FROM lessons WHERE id = '662e3580-8db8-43e8-9c60-51b0c7936921'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '662e3580-8db8-43e8-9c60-51b0c7936921' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '662e3580-8db8-43e8-9c60-51b0c7936921' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=32 'שופטים מוקלט - פרק יח | ללא טעמים' (pos 32) | lesson anchored in 'פסל מיכה | פרקים יז-יח' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,320,id
FROM lessons WHERE id = '189c46b7-ea5a-4ac6-b037-3e6107498890'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '189c46b7-ea5a-4ac6-b037-3e6107498890' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '189c46b7-ea5a-4ac6-b037-3e6107498890' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שופטים/פסל-מיכה-פרקים-יז-יח/ row idx=33 'מי אתה שבואל בן גרשום?' (pos 33) | lesson anchored in 'נושאים כלליים בתנ"ך' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'f5050001-0001-4000-8000-000000000002',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,330,id
FROM lessons WHERE id = '1ae18ebb-08cd-44b4-a453-2d93d6033004'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '1ae18ebb-08cd-44b4-a453-2d93d6033004' AND c.series_id = 'f5050001-0001-4000-8000-000000000002')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '1ae18ebb-08cd-44b4-a453-2d93d6033004' AND h.series_id = 'f5050001-0001-4000-8000-000000000002');

-- old /נביאים/שמואל-ב/דוד-בת-שבע-ואוריה-פרק-יא/ row idx=1 'הקדמות למעשה דוד ובת שבע' (pos 1) | lesson anchored in 'דוד, בת שבע ואוריה | פרק י"א' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'b2020001-0001-4000-8000-000000000099',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,10,id
FROM lessons WHERE id = 'a9e27ae2-ec25-4c9b-90cf-918f2f05ec4a'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = 'a9e27ae2-ec25-4c9b-90cf-918f2f05ec4a' AND c.series_id = 'b2020001-0001-4000-8000-000000000099')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = 'a9e27ae2-ec25-4c9b-90cf-918f2f05ec4a' AND h.series_id = 'b2020001-0001-4000-8000-000000000099');

-- old /נביאים/שמואל-ב/דוד-בת-שבע-ואוריה-פרק-יא/ row idx=2 'דוד ובת שבע' (pos 2) | lesson anchored in 'דוד, בת שבע ואוריה | פרק י"א' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'b2020001-0001-4000-8000-000000000099',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,20,id
FROM lessons WHERE id = '9377ad79-33f1-457d-b426-df68d72fe37d'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '9377ad79-33f1-457d-b426-df68d72fe37d' AND c.series_id = 'b2020001-0001-4000-8000-000000000099')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '9377ad79-33f1-457d-b426-df68d72fe37d' AND h.series_id = 'b2020001-0001-4000-8000-000000000099');

-- old /נביאים/שמואל-ב/דוד-בת-שבע-ואוריה-פרק-יא/ row idx=3 'פרשת דוד ובת שבע' (pos 3) | lesson anchored in 'דוד, בת שבע ואוריה | פרק י"א' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'b2020001-0001-4000-8000-000000000099',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,30,id
FROM lessons WHERE id = 'ec57490a-7830-4164-a5be-92cba6532c1b'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = 'ec57490a-7830-4164-a5be-92cba6532c1b' AND c.series_id = 'b2020001-0001-4000-8000-000000000099')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = 'ec57490a-7830-4164-a5be-92cba6532c1b' AND h.series_id = 'b2020001-0001-4000-8000-000000000099');

-- old /נביאים/שמואל-ב/דוד-בת-שבע-ואוריה-פרק-יא/ row idx=4 'בת שבע - אם המלכות' (pos 4) | lesson anchored in 'דוד, בת שבע ואוריה | פרק י"א' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'b2020001-0001-4000-8000-000000000099',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,40,id
FROM lessons WHERE id = '5a27e67d-4e50-41f8-a454-f5f0d67da7bb'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '5a27e67d-4e50-41f8-a454-f5f0d67da7bb' AND c.series_id = 'b2020001-0001-4000-8000-000000000099')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '5a27e67d-4e50-41f8-a454-f5f0d67da7bb' AND h.series_id = 'b2020001-0001-4000-8000-000000000099');

-- old /נביאים/שמואל-ב/דוד-בת-שבע-ואוריה-פרק-יא/ row idx=5 'דוד המלך ובת שבע' (pos 5) | lesson anchored in 'דוד, בת שבע ואוריה | פרק י"א' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'b2020001-0001-4000-8000-000000000099',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,50,id
FROM lessons WHERE id = '8a7b6901-27e7-4178-bb74-b30b4ff17d8c'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '8a7b6901-27e7-4178-bb74-b30b4ff17d8c' AND c.series_id = 'b2020001-0001-4000-8000-000000000099')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '8a7b6901-27e7-4178-bb74-b30b4ff17d8c' AND h.series_id = 'b2020001-0001-4000-8000-000000000099');

-- old /נביאים/שמואל-ב/דוד-בת-שבע-ואוריה-פרק-יא/ row idx=6 'קונטרס דוד ובת שבע' (pos 6) | lesson anchored in 'דוד, בת שבע ואוריה | פרק י"א' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'b2020001-0001-4000-8000-000000000099',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,60,id
FROM lessons WHERE id = 'd50913d1-d6d7-4baf-9ef6-f9e07c2ded1a'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = 'd50913d1-d6d7-4baf-9ef6-f9e07c2ded1a' AND c.series_id = 'b2020001-0001-4000-8000-000000000099')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = 'd50913d1-d6d7-4baf-9ef6-f9e07c2ded1a' AND h.series_id = 'b2020001-0001-4000-8000-000000000099');

-- old /נביאים/שמואל-ב/דוד-בת-שבע-ואוריה-פרק-יא/ row idx=7 'מעשה דוד ובת שבע על פי הפשט' (pos 7) | lesson anchored in 'דוד, בת שבע ואוריה | פרק י"א' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'b2020001-0001-4000-8000-000000000099',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,70,id
FROM lessons WHERE id = '4cf1d0a6-872e-4924-8c89-30207bb78986'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '4cf1d0a6-872e-4924-8c89-30207bb78986' AND c.series_id = 'b2020001-0001-4000-8000-000000000099')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '4cf1d0a6-872e-4924-8c89-30207bb78986' AND h.series_id = 'b2020001-0001-4000-8000-000000000099');

-- old /נביאים/שמואל-ב/דוד-בת-שבע-ואוריה-פרק-יא/ row idx=8 'דוד ובת שבע' (pos 8) | lesson anchored in 'דוד, בת שבע ואוריה | פרק י"א' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'b2020001-0001-4000-8000-000000000099',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,80,id
FROM lessons WHERE id = '9377ad79-33f1-457d-b426-df68d72fe37d'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '9377ad79-33f1-457d-b426-df68d72fe37d' AND c.series_id = 'b2020001-0001-4000-8000-000000000099')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '9377ad79-33f1-457d-b426-df68d72fe37d' AND h.series_id = 'b2020001-0001-4000-8000-000000000099');

-- old /נביאים/שמואל-ב/דוד-בת-שבע-ואוריה-פרק-יא/ row idx=9 'דוד ובת שבע' (pos 9) | lesson anchored in 'שיעורים-שמואל ב' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'b2020001-0001-4000-8000-000000000099',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,90,id
FROM lessons WHERE id = 'c676df54-3173-4693-bfca-2c6e6f3e388d'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = 'c676df54-3173-4693-bfca-2c6e6f3e388d' AND c.series_id = 'b2020001-0001-4000-8000-000000000099')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = 'c676df54-3173-4693-bfca-2c6e6f3e388d' AND h.series_id = 'b2020001-0001-4000-8000-000000000099');

-- old /נביאים/שמואל-ב/דוד-בת-שבע-ואוריה-פרק-יא/ row idx=10 'דוד, בת שבע ואוריה' (pos 10) | lesson anchored in 'דוד, בת שבע ואוריה | פרק י"א' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'b2020001-0001-4000-8000-000000000099',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,100,id
FROM lessons WHERE id = '9bb03446-0fc6-46c4-b1af-1e24f83b985c'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '9bb03446-0fc6-46c4-b1af-1e24f83b985c' AND c.series_id = 'b2020001-0001-4000-8000-000000000099')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '9bb03446-0fc6-46c4-b1af-1e24f83b985c' AND h.series_id = 'b2020001-0001-4000-8000-000000000099');

-- old /נביאים/שמואל-ב/דוד-בת-שבע-ואוריה-פרק-יא/ row idx=11 'שמואל ב פרק יא' (pos 11) | lesson anchored in 'דוד, בת שבע ואוריה | פרק י"א' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'b2020001-0001-4000-8000-000000000099',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,110,id
FROM lessons WHERE id = 'f9075392-89e2-4738-b43b-3de3dbb1625a'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = 'f9075392-89e2-4738-b43b-3de3dbb1625a' AND c.series_id = 'b2020001-0001-4000-8000-000000000099')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = 'f9075392-89e2-4738-b43b-3de3dbb1625a' AND h.series_id = 'b2020001-0001-4000-8000-000000000099');

-- old /נביאים/שמואל-ב/דוד-בת-שבע-ואוריה-פרק-יא/ row idx=12 'שמואל ב מוקלט - פרק יא | ללא טעמים' (pos 12) | lesson anchored in 'דוד, בת שבע ואוריה | פרק י"א' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'b2020001-0001-4000-8000-000000000099',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,120,id
FROM lessons WHERE id = '40fc9146-2ba7-44cc-a024-4473351f8a0d'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '40fc9146-2ba7-44cc-a024-4473351f8a0d' AND c.series_id = 'b2020001-0001-4000-8000-000000000099')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '40fc9146-2ba7-44cc-a024-4473351f8a0d' AND h.series_id = 'b2020001-0001-4000-8000-000000000099');

-- old /נביאים/שמואל-ב/דוד-בת-שבע-ואוריה-פרק-יא/ row idx=13 'ביאור "ושננתם" לספר שמואל ב\' פרק י"א' (pos 13) | lesson anchored in 'דוד, בת שבע ואוריה | פרק י"א' → copy
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'b2020001-0001-4000-8000-000000000099',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,130,id
FROM lessons WHERE id = 'd0ef4bab-9753-4e25-8dd7-1c617553f5a1'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = 'd0ef4bab-9753-4e25-8dd7-1c617553f5a1' AND c.series_id = 'b2020001-0001-4000-8000-000000000099')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = 'd0ef4bab-9753-4e25-8dd7-1c617553f5a1' AND h.series_id = 'b2020001-0001-4000-8000-000000000099');

-- deferred-low op 7ce120ac0a (lessons_plan_ketuvim[2024]); old page /כתובים/עזרא-ונחמיה/נחמיה-הרב-מאיר-הילביץ/ row idx=0 lists it (old pos 1)
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'bc63eb4d-342c-42ca-8ba3-55972ed2eaed',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,10,id
FROM lessons WHERE id = '6ad3ce40-881c-46b0-aa26-e94c977bafb2'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '6ad3ce40-881c-46b0-aa26-e94c977bafb2' AND c.series_id = 'bc63eb4d-342c-42ca-8ba3-55972ed2eaed')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '6ad3ce40-881c-46b0-aa26-e94c977bafb2' AND h.series_id = 'bc63eb4d-342c-42ca-8ba3-55972ed2eaed');

-- deferred-low op e3fcfa1dec (lessons_plan_ketuvim[2026]); old page /כתובים/עזרא-ונחמיה/נחמיה-פרק-א/ row idx=1 lists it (old pos 2)
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'e4a3fdb6-fd3c-4dea-9c35-edc9680b7683',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,20,id
FROM lessons WHERE id = '6ad3ce40-881c-46b0-aa26-e94c977bafb2'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '6ad3ce40-881c-46b0-aa26-e94c977bafb2' AND c.series_id = 'e4a3fdb6-fd3c-4dea-9c35-edc9680b7683')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '6ad3ce40-881c-46b0-aa26-e94c977bafb2' AND h.series_id = 'e4a3fdb6-fd3c-4dea-9c35-edc9680b7683');

-- deferred-low op 48baff27ee (lessons_plan_ketuvim[2319]); old page /כתובים/עזרא-ונחמיה/עזרא-פרק-ב/ row idx=5 lists it (old pos 6)
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'b2f468b6-9d52-40cf-9476-c382d8fe573e',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,60,id
FROM lessons WHERE id = '931fbcab-b048-4909-9cb8-ab00eb41f56e'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '931fbcab-b048-4909-9cb8-ab00eb41f56e' AND c.series_id = 'b2f468b6-9d52-40cf-9476-c382d8fe573e')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '931fbcab-b048-4909-9cb8-ab00eb41f56e' AND h.series_id = 'b2f468b6-9d52-40cf-9476-c382d8fe573e');

-- deferred-low op 64eff875dc (lessons_plan_ketuvim[2318]); old page /כתובים/עזרא-ונחמיה/שיעורים-עזרא/ row idx=2 lists it (old pos 3)
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  status,audience_tags,additional_attachments,content_type,legacy_attachment_url,published_at,
  sort_order,copied_from)
SELECT gen_random_uuid(),title,description,content,rabbi_id,'0023f15c-4d0c-4877-8a57-e9f2a5c0d81f',video_url,audio_url,
  attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,
  'published',CASE WHEN audience_tags @> ARRAY['general'] THEN audience_tags
    ELSE array_append(coalesce(audience_tags,'{}'),'general') END,
  additional_attachments,content_type,legacy_attachment_url,published_at,30,id
FROM lessons WHERE id = '931fbcab-b048-4909-9cb8-ab00eb41f56e'
  AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = '931fbcab-b048-4909-9cb8-ab00eb41f56e' AND c.series_id = '0023f15c-4d0c-4877-8a57-e9f2a5c0d81f')
  AND NOT EXISTS (SELECT 1 FROM lessons h WHERE h.id = '931fbcab-b048-4909-9cb8-ab00eb41f56e' AND h.series_id = '0023f15c-4d0c-4877-8a57-e9f2a5c0d81f');

-- ============================================================================
-- §4 SORT REPACKS — 15 rows set to their old-page slot (10·position).
-- ----------------------------------------------------------------------------
-- repack שיעורים-על-התנ"ך-יחזקאל to old order (old pos 28)
UPDATE lessons SET sort_order = 280 WHERE id = 'c17c4370-cd1a-4695-8c62-2a34de99e73b' AND sort_order IS DISTINCT FROM 280;
-- repack שיעורים-על-התנ"ך-יחזקאל to old order (old pos 29)
UPDATE lessons SET sort_order = 290 WHERE id = '48a5e957-58fd-4987-8a53-bb45a17501a3' AND sort_order IS DISTINCT FROM 290;
-- repack שיעורים-על-התנ"ך-יחזקאל to old order (old pos 30)
UPDATE lessons SET sort_order = 300 WHERE id = 'ebc9d24c-722b-47d7-83a3-a8127445c2ce' AND sort_order IS DISTINCT FROM 300;
-- repack שיעורים-על-התנ"ך-יחזקאל to old order (old pos 31)
UPDATE lessons SET sort_order = 310 WHERE id = '0ba88de6-1885-46d5-bd06-3a05d1a04dd7' AND sort_order IS DISTINCT FROM 310;
-- repack שיעורים-על-התנ"ך-יחזקאל to old order (old pos 32)
UPDATE lessons SET sort_order = 320 WHERE id = 'df551fc9-fcf1-4c99-b4fc-8345c294fab1' AND sort_order IS DISTINCT FROM 320;
-- repack שיעורים-על-התנ"ך-יחזקאל to old order (old pos 33)
UPDATE lessons SET sort_order = 330 WHERE id = '9221ca6b-1c5a-4c64-b05f-f2ac0d2a1504' AND sort_order IS DISTINCT FROM 330;
-- repack שיעורים-על-התנ"ך-יחזקאל to old order (old pos 34)
UPDATE lessons SET sort_order = 340 WHERE id = '5b4f2ceb-609c-494a-aa5c-4979c04f307d' AND sort_order IS DISTINCT FROM 340;
-- repack שיעורים-על-התנ"ך-יחזקאל to old order (old pos 35)
UPDATE lessons SET sort_order = 350 WHERE id = '9d51a353-ae7a-4c24-b841-72158b21ab47' AND sort_order IS DISTINCT FROM 350;
-- repack שיעורים-על-התנ"ך-יחזקאל to old order (old pos 36)
UPDATE lessons SET sort_order = 360 WHERE id = 'c0bc6bd5-905d-4ec1-9e0e-3808be448284' AND sort_order IS DISTINCT FROM 360;
-- repack שיעורים-על-התנ"ך-יחזקאל to old order (old pos 37)
UPDATE lessons SET sort_order = 370 WHERE id = 'aae2a50e-3a47-4330-8b98-2e3f7ba907fc' AND sort_order IS DISTINCT FROM 370;
-- repack שיעורים-על-התנ"ך-יחזקאל to old order (old pos 38)
UPDATE lessons SET sort_order = 380 WHERE id = '6b3d6d82-1224-48e4-9513-8ed85b1d96b8' AND sort_order IS DISTINCT FROM 380;
-- repack שיעורים-על-התנ"ך-יחזקאל to old order (old pos 39)
UPDATE lessons SET sort_order = 390 WHERE id = 'a529fadf-b2ef-43f6-9077-65bd07906b87' AND sort_order IS DISTINCT FROM 390;
-- repack שיעורים-על-התנ"ך-יחזקאל to old order (old pos 40)
UPDATE lessons SET sort_order = 400 WHERE id = 'fea70588-aee3-414c-bf99-9d0f21be89ac' AND sort_order IS DISTINCT FROM 400;
-- old /כתובים/אסתר/כל-השיעורים-על-מגילת-אסתר/ row idx=8 'מגילת אסתר וספרי הבית השני' (pos 1)
UPDATE lessons SET sort_order = 10 WHERE id = 'c663b058-13f3-48f8-837f-facb86122bd9' AND sort_order IS DISTINCT FROM 10;
-- old /נושאים-כלליים-בתנך/מלחמת-גוג-ומגוג/ row idx=2 'עשרת העיקרים של מלחמת גוג ומגוג' (pos 1)
UPDATE lessons SET sort_order = 10 WHERE id = '374681eb-8173-4140-8592-d7ef92b94680' AND sort_order IS DISTINCT FROM 10;

-- ============================================================================
-- §5 DEMOTES — 3 rows hidden (status='draft', REVERSIBLE — never delete).
--    Each title is listed on NO old page (verified against the full ground-truth
--    demand index); each blocks an otherwise-1:1 page as an unexplained extra.
-- ----------------------------------------------------------------------------
-- title 'עיין חדש בחזון העצמות היבשות' (typo עיין) is listed on NO old page; old row 32 'חזון העצמות היבשות' is satisfied by df551fc9 in the same series; the demanded 'עיון חדש…' rows live in ימי-עיון (09ee99f9, 164cb9ef)
UPDATE lessons SET status = 'draft' WHERE id = '03011661-25dc-4f79-a7ac-6992c737dce8' AND status <> 'draft';

-- title 'קידוש ה' שיהיה בקיבוץ הגלויות' (audio ירמיהו/23655.mp3) is listed on NO old page; old row 19 has the ד' spelling and is satisfied by 422e624a (audio יחזקאל 18)
UPDATE lessons SET status = 'draft' WHERE id = 'f2010000-0001-4000-8000-000000000113' AND status <> 'draft';

-- twin 6948ae1e holds a second 'אפסות העבודה זרה' whose audio is ישעיהו '42 פרק מד.MP3' (another rabbi) — a misfiled ישעיהו recording; old ירמיהו page lists the title once (satisfied by 1df0344e, audio ירמיהו 15.mp3); ישעיהו pages are already satisfied
UPDATE lessons SET status = 'draft' WHERE id = 'c7a4171e-b4e8-43e7-b06d-80278d2d85ef' AND status <> 'draft';

-- ============================================================================
-- §6 PUBLISHES — 6 in-scope draft rows WITH media that an old public page lists.
-- ----------------------------------------------------------------------------
-- old /תורה/בראשית/בראשית-מוקלט-ללא-טעמים/ row idx=0 lists 'בראשית מוקלט - פרק א | ללא טעמים'; row already in scope with media — draft hides it
UPDATE lessons SET status = 'published' WHERE id = 'df0f7909-7208-435d-b3db-0170088fd547' AND status <> 'published';

-- old /תורה/בראשית/בראשית-מוקלט-ללא-טעמים/ row idx=1 lists 'בראשית מוקלט - פרק ב | ללא טעמים'; row already in scope with media — draft hides it
UPDATE lessons SET status = 'published' WHERE id = 'c772f43d-3bd6-4a7f-bbb6-6618fd6f231a' AND status <> 'published';

-- old /תורה/בראשית/בראשית-מוקלט-ללא-טעמים/ row idx=3 lists 'בראשית מוקלט - פרק ד | ללא טעמים'; row already in scope with media — draft hides it
UPDATE lessons SET status = 'published' WHERE id = '3cc30b10-deed-4259-9592-e407fd3e597e' AND status <> 'published';

-- old /תורה/בראשית/פרשת-בראשית-א-ו/ row idx=27 lists 'בראשית מוקלט - פרק א | ללא טעמים'; row already in scope with media — draft hides it
UPDATE lessons SET status = 'published' WHERE id = 'bf82a407-2e51-5814-b1ea-8dbb6837d147' AND status <> 'published';

-- old /תורה/בראשית/פרשת-בראשית-א-ו/ row idx=28 lists 'בראשית מוקלט - פרק ב | ללא טעמים'; row already in scope with media — draft hides it
UPDATE lessons SET status = 'published' WHERE id = '3689872a-2a76-5f43-a54a-c00fa3bc6fb7' AND status <> 'published';

-- old /תורה/בראשית/פרשת-בראשית-א-ו/ row idx=30 lists 'בראשית מוקלט - פרק ד | ללא טעמים'; row already in scope with media — draft hides it
UPDATE lessons SET status = 'published' WHERE id = '56d90243-47cf-593b-8c95-9439b392ef99' AND status <> 'published';

-- ============================================================================
-- §7 RETITLES — 17 rows renamed to the old-page title (nav truth). In every
--    case the CURRENT DB title appears on no old page (safe — nothing demands it).
-- ----------------------------------------------------------------------------
-- old /איך-לומדים-תנך/הגישה-הראויה-ללימוד-תנך/הקדמה-ללימוד-נב row idx=3 shows 'הקדמה ללימוד נביאים שיעור רביעי'; current DB title 'הקדמה ללימוד נביאים רביעי' appears on no old page (match method media_path, score 1.0)
UPDATE lessons SET title = 'הקדמה ללימוד נביאים שיעור רביעי' WHERE id = '9d95386a-a440-40e5-bf4d-6e0fe1dafa79' AND title = 'הקדמה ללימוד נביאים רביעי';

-- old /ימי-עיון-בתנך/ row idx=119 shows 'מגלות יהויכין עד חורבן הבית'; current DB title 'מגלת יהויכין עד חורבן הבית' appears on no old page (match method fuzzy_title, score 0.93)
UPDATE lessons SET title = 'מגלות יהויכין עד חורבן הבית' WHERE id = 'f1422687-d9a1-4bf2-a9aa-589b2e0cb676' AND title = 'מגלת יהויכין עד חורבן הבית';

-- old /ימי-עיון-בתנך/ימי-עיון-בתנך-תשעד/ row idx=16 shows 'מגלות יהויכין עד חורבן הבית'; current DB title 'מגלת יהויכין עד חורבן הבית' appears on no old page (match method fuzzy_title, score 0.93)
UPDATE lessons SET title = 'מגלות יהויכין עד חורבן הבית' WHERE id = 'f1422687-d9a1-4bf2-a9aa-589b2e0cb676' AND title = 'מגלת יהויכין עד חורבן הבית';

-- old /ימי-עיון-בתנך/כל-השיעורים-מימי-עיון-בתנך/ row idx=119 shows 'מגלות יהויכין עד חורבן הבית'; current DB title 'מגלת יהויכין עד חורבן הבית' appears on no old page (match method fuzzy_title, score 0.93)
UPDATE lessons SET title = 'מגלות יהויכין עד חורבן הבית' WHERE id = 'f1422687-d9a1-4bf2-a9aa-589b2e0cb676' AND title = 'מגלת יהויכין עד חורבן הבית';

-- old /כתובים/איוב/איוב-בבקיאות/ row idx=17 shows 'איוב בבקיאות פרקים לז- פרק לח פסוק יא'; current DB title 'פסוק יא איוב בבקיאות פרקים לז- פרק לח' appears on no old page (match method media_path, score 1.0)
UPDATE lessons SET title = 'איוב בבקיאות פרקים לז- פרק לח פסוק יא' WHERE id = '7295f00a-6c6b-45a7-bd22-25754ac9d100' AND title = 'פסוק יא איוב בבקיאות פרקים לז- פרק לח';

-- old /כתובים/תהלים/תהלים-בבקיאות/ row idx=1 shows 'קהלת בבקיאות פרקים כ-כב'; current DB title 'תהלים בבקיאות פרקים כ-כב' appears on no old page (match method media_path, score 1.0)
UPDATE lessons SET title = 'קהלת בבקיאות פרקים כ-כב' WHERE id = '9d5d333b-4d35-48c2-9f9b-a22616538e39' AND title = 'תהלים בבקיאות פרקים כ-כב';

-- old /כתובים/תהלים/תהלים-בבקיאות/ row idx=4 shows 'קהלת בבקיאות פרקים לב-לד'; current DB title 'תהלים בבקיאות פרקים לב-לד' appears on no old page (match method media_path, score 1.0)
UPDATE lessons SET title = 'קהלת בבקיאות פרקים לב-לד' WHERE id = '0ce70c4d-8037-4ada-bb72-298d5bf08a46' AND title = 'תהלים בבקיאות פרקים לב-לד';

-- old /כתובים/תהלים/תהלים-בבקיאות/ row idx=9 shows 'תהלים בבקיאות פרקים מן-מז'; current DB title 'תהלים בבקיאות פרקים מו-מז' appears on no old page (match method media_path, score 1.0)
UPDATE lessons SET title = 'תהלים בבקיאות פרקים מן-מז' WHERE id = '81bbb977-ed02-442d-9500-aa0204c7579d' AND title = 'תהלים בבקיאות פרקים מו-מז';

-- old /מועדים/יום-העצמאות/ row idx=16 shows 'חזון העצמות היבשות'; current DB title 'עיין חדש בחזון העצמות היבשות' appears on no old page (match method media_path, score 1.0)
UPDATE lessons SET title = 'חזון העצמות היבשות' WHERE id = '03011661-25dc-4f79-a7ac-6992c737dce8' AND title = 'עיין חדש בחזון העצמות היבשות';

-- old /מועדים/פורים/ row idx=30 shows 'קיום מצוות מחיית עמלק במגילת אסתר'; current DB title 'ושננתם, קיום מצוות מחיית עמלק במגילת אסתר' appears on no old page (match method media_path, score 1.0)
UPDATE lessons SET title = 'קיום מצוות מחיית עמלק במגילת אסתר' WHERE id = '06adb28d-7d9a-4cf1-a43b-533f94fbacab' AND title = 'ושננתם, קיום מצוות מחיית עמלק במגילת אסתר';

-- old /נביאים/יחזקאל/יחזקאל-פרק-יז/ row idx=2 shows 'יחזקאל'; current DB title 'יחזקאל פרקים יז-יח' appears on no old page (match method media_path, score 1.0)
UPDATE lessons SET title = 'יחזקאל' WHERE id = '94b02535-c549-45f3-ba91-c799f93a7adb' AND title = 'יחזקאל פרקים יז-יח';

-- old /נביאים/יחזקאל/יחזקאל-פרק-יח/ row idx=1 shows 'יחזקאל'; current DB title 'יחזקאל פרקים יז-יח' appears on no old page (match method media_path_dup, score 1.0)
UPDATE lessons SET title = 'יחזקאל' WHERE id = '94b02535-c549-45f3-ba91-c799f93a7adb' AND title = 'יחזקאל פרקים יז-יח';

-- old /נביאים/יחזקאל/יחזקאל-פרק-מא/ row idx=1 shows 'שרטוט בית המקדש ביחזקאל לפי שיטות המלבי"ם רש"'; current DB title 'שרטוט בית המקדש ביחזקאל על פי שיטות המלבי"ם ר' appears on no old page (match method media_path, score 1.0)
UPDATE lessons SET title = 'שרטוט בית המקדש ביחזקאל לפי שיטות המלבי"ם רש"י ומצודות' WHERE id = '2752644d-3a66-45a1-beb7-41e4725a71fc' AND title = 'שרטוט בית המקדש ביחזקאל על פי שיטות המלבי"ם רש"י ומצודות';

-- old /נביאים/יחזקאל/ספר-יחזקאל-כלל-ופרט/ row idx=6 shows 'יחזקאל'; current DB title 'יחזקאל פרקים יז-יח' appears on no old page (match method media_path, score 1.0)
UPDATE lessons SET title = 'יחזקאל' WHERE id = 'cccfa3b0-21db-47ec-9549-95a6f711edf3' AND title = 'יחזקאל פרקים יז-יח';

-- old /נביאים/יחזקאל/שיעורים-על-ספר-יחזקאל/ row idx=26 shows 'מלחמת גוג ומגוג'; current DB title 'עשרת העיקריים של מלחמת גוג ומגוג' appears on no old page (match method media_path, score 1.0)
UPDATE lessons SET title = 'מלחמת גוג ומגוג' WHERE id = 'd4040401-2001-4000-a000-000000000001' AND title = 'עשרת העיקריים של מלחמת גוג ומגוג';

-- old /תורה/דברים/פרשת-וזאת-הברכה-לג-לד/ row idx=17 shows 'אם משה היה נכנס לארץ - האם התורה היתה ממשיכה '; current DB title 'אם משה היה נכנס לארץ - האם התורה הייתה ממשיכה' appears on no old page (match method fuzzy_title, score 0.93)
UPDATE lessons SET title = 'אם משה היה נכנס לארץ - האם התורה היתה ממשיכה להיכתב גם בארץ ישראל?' WHERE id = '91bd2ced-488a-4796-af3c-67b2bd5f6020' AND title = 'אם משה היה נכנס לארץ - האם התורה הייתה ממשיכה להיכתב גם בארץ ישראל?';

-- old /תורה/דברים/פרשת-כי-תצא-כא-כה/ row idx=46 shows 'קיום מצוות מחיית עמלק במגילת אסתר'; current DB title 'ושננתם, קיום מצוות מחיית עמלק במגילת אסתר' appears on no old page (match method media_path, score 1.0)
UPDATE lessons SET title = 'קיום מצוות מחיית עמלק במגילת אסתר' WHERE id = '06adb28d-7d9a-4cf1-a43b-533f94fbacab' AND title = 'ושננתם, קיום מצוות מחיית עמלק במגילת אסתר';

-- ============================================================================
-- §8 INSERTS — 0 never-matched old rows with full data + external media.
-- ----------------------------------------------------------------------------
-- ============================================================================
-- §9 lesson_count SYNC for every series touched above (incl. move sources).
-- ----------------------------------------------------------------------------
UPDATE series s SET lesson_count = (
  SELECT count(*) FROM lessons l WHERE l.series_id = s.id AND l.status = 'published')
WHERE s.id IN (
  '0023f15c-4d0c-4877-8a57-e9f2a5c0d81f',
  '0ab89828-6005-4054-9e65-a724aa2ffb4d',
  '269dc17c-0cc1-4484-82e5-b7538b28f948',
  '3d600a33-c520-414d-a120-32d85789325c',
  '5578c087-d6cf-4319-b3c5-10cd555c9a3a',
  '6948ae1e-ad5a-4cbb-ae12-c08e7cd03eb5',
  '8600dfad-9e4d-41af-8b85-ccc325ee1298',
  'b2020001-0001-4000-8000-000000000099',
  'b2f468b6-9d52-40cf-9476-c382d8fe573e',
  'b7b24b9b-133f-495c-b88c-690a60154cea',
  'b8bfb329-6b3b-46a5-ab1f-eff2c4dda28e',
  'bc63eb4d-342c-42ca-8ba3-55972ed2eaed',
  'c466c2fc-a0e0-4a4d-81fd-53b218167dd5',
  'c76ac534-76b4-4f2c-ba9a-05ed95e7145c',
  'd1010001-0002-4000-8000-000000000040',
  'd2020001-0001-4000-8000-000000000012',
  'e4a3fdb6-fd3c-4dea-9c35-edc9680b7683',
  'f5050001-0001-4000-8000-000000000002'
);

-- ============================================================================
-- VERIFICATION (read-only, run after apply)
-- v1: 5 twins reparented — expect 0
SELECT count(*) AS v1_twins_still_at_root FROM series WHERE id IN ('c466c2fc-a0e0-4a4d-81fd-53b218167dd5', '9064a41d-186c-4aba-94e6-48182b9616d5', '9675678a-6f50-4d18-ac90-5deebad36135', 'd5ef79b3-9d97-471f-80e3-2e4ff2deaf62', 'aeea0713-ae5c-4de6-b359-e69f79f0fbe5') AND parent_id = 'a0472c9f-8212-44ff-8937-ace5fea4b4dc';
-- v2: copies landed — expect 79
SELECT count(*) AS v2_copies FROM (VALUES ('7c0ae70c-e31c-415a-be4f-2b9aa1211a14','b7b24b9b-133f-495c-b88c-690a60154cea'), ('f5050501-a002-4000-a000-000000000001','0ab89828-6005-4054-9e65-a724aa2ffb4d'), ('e6060601-c001-4000-8000-000000000001','0ab89828-6005-4054-9e65-a724aa2ffb4d'), ('4722a798-2749-40dd-af7b-6e5db440f3a3','0ab89828-6005-4054-9e65-a724aa2ffb4d'), ('dcf80845-e11a-4e72-9fba-bbf2ccb7d4d6','0ab89828-6005-4054-9e65-a724aa2ffb4d'), ('21c9e5c2-65a9-4cca-ad05-42f73e77f4c5','269dc17c-0cc1-4484-82e5-b7538b28f948'), ('37a3c8fc-a008-4412-a6ae-d21d7b1fac54','269dc17c-0cc1-4484-82e5-b7538b28f948'), ('0b07e143-6eca-494e-b408-8ab506b2ea95','269dc17c-0cc1-4484-82e5-b7538b28f948'), ('23d0cdf1-e4ef-45e3-aa0b-f70883c487af','269dc17c-0cc1-4484-82e5-b7538b28f948'), ('5893017d-b0d8-4488-848f-8373f4f5584e','269dc17c-0cc1-4484-82e5-b7538b28f948'), ('6c8bc438-1640-416b-a177-e0474c7eaece','269dc17c-0cc1-4484-82e5-b7538b28f948'), ('3bf25e1c-6f74-4690-9642-d7ddcd12deb5','269dc17c-0cc1-4484-82e5-b7538b28f948'), ('d4040401-2003-4000-a000-000000000003','c76ac534-76b4-4f2c-ba9a-05ed95e7145c'), ('6388c942-b096-493a-b0f6-5ab69162351c','c76ac534-76b4-4f2c-ba9a-05ed95e7145c'), ('27049a7e-7410-43cb-b159-facd22c4865f','c76ac534-76b4-4f2c-ba9a-05ed95e7145c'), ('a2c3087e-fa6a-41c2-b0eb-2522784213f7','d2020001-0001-4000-8000-000000000012'), ('5ca7e97b-9f48-4c8b-b1a2-ffaab7c7756e','d2020001-0001-4000-8000-000000000012'), ('15f0f9d4-ab73-4f95-9def-9198b25c62c0','d2020001-0001-4000-8000-000000000012'), ('7ef98398-6b4d-45dc-a36b-b2a7e87ab2e6','d2020001-0001-4000-8000-000000000012'), ('473e00f9-c0bc-4d81-819e-eea1c7547d56','d2020001-0001-4000-8000-000000000012'), ('29345c97-7c0b-45ce-b359-225ccf82e867','d2020001-0001-4000-8000-000000000012'), ('a0407cdd-5894-47c9-8f55-45296367c41b','d2020001-0001-4000-8000-000000000012'), ('891716c6-e573-4a88-a879-5ac0fa33e7c6','d2020001-0001-4000-8000-000000000012'), ('32765da2-a61b-4a03-9ba6-7760d67f5eec','d2020001-0001-4000-8000-000000000012'), ('6ea9d61c-3ca9-4a3a-a898-85bf4d7d3f93','d2020001-0001-4000-8000-000000000012'), ('460085c5-285a-46ef-8017-d7c77311dba1','d2020001-0001-4000-8000-000000000012'), ('215d7dde-da6c-4362-b2ad-8393b58ddefa','d2020001-0001-4000-8000-000000000012'), ('9829569f-9ada-4f32-8959-fb00f919b832','d2020001-0001-4000-8000-000000000012'), ('777eeb8a-0a8c-44d0-9aaf-5337e32e2383','d2020001-0001-4000-8000-000000000012'), ('3c31cd9a-fd59-4561-9b85-aeef12f63ffe','d2020001-0001-4000-8000-000000000012'), ('6b124e1e-3e9b-46ad-9f59-9d7f62ccf75b','f5050001-0001-4000-8000-000000000002'), ('5593d207-c3eb-44df-9003-02c8c3eb0669','f5050001-0001-4000-8000-000000000002'), ('3f920e27-4a76-4aef-82ab-92b04e65ae92','f5050001-0001-4000-8000-000000000002'), ('4b1a45ec-b098-4ca2-b355-db84ac8ed36c','f5050001-0001-4000-8000-000000000002'), ('7966061d-f1c5-43d4-8457-0b2ab1035537','f5050001-0001-4000-8000-000000000002'), ('1fc0eb40-3c79-4520-b96d-0e84c8294694','f5050001-0001-4000-8000-000000000002'), ('fe7dd530-04d1-4dda-8d46-5b2fe247842c','f5050001-0001-4000-8000-000000000002'), ('27e899a9-1ed5-4b20-88a0-0d9211797b31','f5050001-0001-4000-8000-000000000002'), ('f56426ec-adbf-4bc0-8ec7-86c2f1e0e635','f5050001-0001-4000-8000-000000000002'), ('244d752d-54a2-45f8-8ab3-d160ccac89c7','f5050001-0001-4000-8000-000000000002'), ('28b0b6f8-2e6a-4372-aff8-9de3f1fb6dc6','f5050001-0001-4000-8000-000000000002'), ('3709c10b-d17a-4251-b85e-94ad12127dc5','f5050001-0001-4000-8000-000000000002'), ('7db38f24-9e74-4221-afce-a0feefc693ed','f5050001-0001-4000-8000-000000000002'), ('9544910e-0f9c-4492-b74b-a3fbbfe03579','f5050001-0001-4000-8000-000000000002'), ('c919ce59-2801-4d27-9931-99efdaa976b9','f5050001-0001-4000-8000-000000000002'), ('941d2835-2797-4748-a5f3-b108125b6da5','f5050001-0001-4000-8000-000000000002'), ('a0826a91-896e-40b4-a84c-eb817aa1060d','f5050001-0001-4000-8000-000000000002'), ('1723e100-e632-40cc-a091-19bd5cfddae7','f5050001-0001-4000-8000-000000000002'), ('351c36da-7965-4223-8254-bd542bdf4f6a','f5050001-0001-4000-8000-000000000002'), ('44d76172-0eba-4170-b391-a57ccc0159df','f5050001-0001-4000-8000-000000000002'), ('242d5bfa-8356-484e-bae5-ee0a49b31d9d','f5050001-0001-4000-8000-000000000002'), ('18005548-7313-4336-b930-b2c568f940c5','f5050001-0001-4000-8000-000000000002'), ('e86b73b0-e8ba-42b6-9338-8a39d44729f3','f5050001-0001-4000-8000-000000000002'), ('6e768a01-cc5b-45e9-95c4-f38db1eaa429','f5050001-0001-4000-8000-000000000002'), ('645e72c8-c921-4b9f-9777-3950b20cdbf9','f5050001-0001-4000-8000-000000000002'), ('8d5950b5-dc0f-4a4a-a82a-2049fedb6091','f5050001-0001-4000-8000-000000000002'), ('95716b86-1d13-4b36-aa8b-657307012ed4','f5050001-0001-4000-8000-000000000002'), ('559248db-fe20-4766-96e0-7a774f296308','f5050001-0001-4000-8000-000000000002'), ('b0e77318-083d-4352-9834-4a59acee6f85','f5050001-0001-4000-8000-000000000002'), ('662e3580-8db8-43e8-9c60-51b0c7936921','f5050001-0001-4000-8000-000000000002'), ('189c46b7-ea5a-4ac6-b037-3e6107498890','f5050001-0001-4000-8000-000000000002'), ('1ae18ebb-08cd-44b4-a453-2d93d6033004','f5050001-0001-4000-8000-000000000002'), ('a9e27ae2-ec25-4c9b-90cf-918f2f05ec4a','b2020001-0001-4000-8000-000000000099'), ('9377ad79-33f1-457d-b426-df68d72fe37d','b2020001-0001-4000-8000-000000000099'), ('ec57490a-7830-4164-a5be-92cba6532c1b','b2020001-0001-4000-8000-000000000099'), ('5a27e67d-4e50-41f8-a454-f5f0d67da7bb','b2020001-0001-4000-8000-000000000099'), ('8a7b6901-27e7-4178-bb74-b30b4ff17d8c','b2020001-0001-4000-8000-000000000099'), ('d50913d1-d6d7-4baf-9ef6-f9e07c2ded1a','b2020001-0001-4000-8000-000000000099'), ('4cf1d0a6-872e-4924-8c89-30207bb78986','b2020001-0001-4000-8000-000000000099'), ('9377ad79-33f1-457d-b426-df68d72fe37d','b2020001-0001-4000-8000-000000000099'), ('c676df54-3173-4693-bfca-2c6e6f3e388d','b2020001-0001-4000-8000-000000000099'), ('9bb03446-0fc6-46c4-b1af-1e24f83b985c','b2020001-0001-4000-8000-000000000099'), ('f9075392-89e2-4738-b43b-3de3dbb1625a','b2020001-0001-4000-8000-000000000099'), ('40fc9146-2ba7-44cc-a024-4473351f8a0d','b2020001-0001-4000-8000-000000000099'), ('d0ef4bab-9753-4e25-8dd7-1c617553f5a1','b2020001-0001-4000-8000-000000000099'), ('6ad3ce40-881c-46b0-aa26-e94c977bafb2','bc63eb4d-342c-42ca-8ba3-55972ed2eaed'), ('6ad3ce40-881c-46b0-aa26-e94c977bafb2','e4a3fdb6-fd3c-4dea-9c35-edc9680b7683'), ('931fbcab-b048-4909-9cb8-ab00eb41f56e','b2f468b6-9d52-40cf-9476-c382d8fe573e'), ('931fbcab-b048-4909-9cb8-ab00eb41f56e','0023f15c-4d0c-4877-8a57-e9f2a5c0d81f')) AS w(src,tgt)
WHERE EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from = w.src::uuid AND c.series_id = w.tgt::uuid)
   OR EXISTS (SELECT 1 FROM lessons h WHERE h.id = w.src::uuid AND h.series_id = w.tgt::uuid);
-- v3: demotes hidden — expect 0 published
SELECT count(*) AS v3_demotes_still_published FROM lessons WHERE id IN ('03011661-25dc-4f79-a7ac-6992c737dce8', 'f2010000-0001-4000-8000-000000000113', 'c7a4171e-b4e8-43e7-b06d-80278d2d85ef') AND status = 'published';
