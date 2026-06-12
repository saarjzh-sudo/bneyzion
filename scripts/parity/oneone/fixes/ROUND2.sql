-- ============================================================================
-- ROUND2.sql — bnei-zion 1:1 parity, ROUND-2 data fixes (teachers wing)
-- Author: round-2 data-gaps author (read-only scoping via sbq.py; this file is
--         EXECUTED BY THE ORCHESTRATOR, not by the author).
-- Built from: reports/verify_results.json, old_teachers_tree.json,
--   old_teachers_listings.json, match/{item_match,tree_map}.json,
--   plans/{teachers_plan,rabbis_plan,tree_plan}.json, live SELECTs 2026-06-12.
-- Band convention: series.sort_order 1..999 = sidebar member at position;
--   0 = page-only; >=1000 = parked. All statements IDEMPOTENT (guarded).
-- ============================================================================

-- ============================================================================
-- §1 TEACHERS BY-BOOK BAND HYGIENE — the teachers wing has its own subtree
--    under root 6bfb7aaa (מאגר עזרי הלמידה). tree_plan's 50 teachers
--    set_series_sort ops are ALREADY live (verified: 4 tops at 2-5, 35 books,
--    11 'דפי עבודה' children — all at their old positions, 0 title mismatches).
--    Residual gaps: 2 banded NON-members.
-- ----------------------------------------------------------------------------
-- scope: rows to demote (expect 2 pre-apply, 0 after)
SELECT count(*) AS s1_to_demote FROM series
WHERE sort_order BETWEEN 1 AND 999 AND id IN (
  'e93c7a85-af4a-479b-8122-bd4f8d7e0f2c',  -- לב הפרק - ישעיהו (root child @1; old top #1 is the פרשת-השבוע CODE slot)
  '08a87de3-2938-43aa-962f-8ea95096e564'   -- מפות על ספר יהושע (@12 under teachers יהושע book; not an old-tree child)
);

UPDATE series SET sort_order = 0
WHERE sort_order BETWEEN 1 AND 999
  AND id IN ('e93c7a85-af4a-479b-8122-bd4f8d7e0f2c','08a87de3-2938-43aa-962f-8ea95096e564');

-- verification v1: banded children of the 40 policed teachers parents that are
-- NOT old-tree members — expect 0 after apply (2 before).
SELECT count(*) AS v1_banded_nonmembers FROM series
WHERE sort_order BETWEEN 1 AND 999
  AND parent_id IN (
  '06c5e30d-3cec-4e53-83c5-d08745a9caf2', '1630784f-0614-4cca-ad7f-8590a7204e4a', '21619bb5-93ea-418e-b405-f9946af73ec2', '22eafbb1-a1aa-4510-ae9c-597bd3ca97ca', '26a5e728-38ef-47e9-8889-29809caf202b', '2e248097-b954-4c28-91dc-b84a19f9fabc',
  '32416e4c-1a50-4290-8b9b-fff1c6b891bd', '34c0bc26-e3e5-407d-97a4-5e1d141bbc5a', '380bbb1b-9957-4da6-83ad-d767e3f55f84', '395e79c4-e6bb-4c39-a497-c3ef27b86b7e', '42ac131e-631d-4518-8896-86cd1c49c07a', '4e41b21b-51d5-4b06-acff-5afdee59dd56',
  '547a1e32-e9c6-4c0b-a43f-f98dc76ce653', '6388d75b-9868-4ca7-a908-58d60c15c4c3', '6b1d14ee-5972-4778-ab8c-6e5ff6752494', '6bc73e42-a470-4a1d-84d7-fe15e59f45b7', '6bfb7aaa-cd9e-4562-b087-a37fcc24d295', '6cc5494b-7f6b-44b1-8ac5-b174798afb1d',
  '7eb63782-785f-4b5c-a37b-5b29411f7acb', '855cc4c0-0250-4c7d-b85b-d1138436a21a', '90452961-6c46-4737-9a91-55be017b3050', '96ba287a-bba7-471d-a53c-a16fd880dc67', 'a40742f5-36f4-46ab-a549-db41fbe41365', 'a6cea7e8-dd75-408c-bc93-b8d2a4503d0e',
  'a7d0ee40-14ee-476f-bccf-b0f4d8d8a8c7', 'ac922c58-a6ee-4d44-968a-6744c3478453', 'afbe1a78-1fa6-4747-8e1f-be7dbd488fd0', 'b1305678-d690-4670-b1ea-d30356b2f5e8', 'b6bc59ba-db50-49d0-b4e0-4fad8da8946e', 'b955595d-ddb9-4c88-bf4e-25ebcb4cbd43',
  'c0c7fc56-9f95-4958-b318-a1304bd42c9f', 'c1a3e4b5-bf06-4389-b11e-c272a7ad90a3', 'c3cf6ce3-a2a6-4df6-8b28-0618fdeabd56', 'cb088913-d868-4203-965a-117e5569e170', 'cfcb82bf-bc02-406b-b60d-ad204ba6075a', 'e048fc4e-c356-4f78-86e5-8a41d0327f25',
  'e20b0dfd-ced1-4d79-96d6-e8808ce785a8', 'e3929949-4c3d-4d5f-9872-685bf074227a', 'e90e30f2-c263-4ecd-a25a-ca0604ae421d', 'eb79e877-7892-43e5-ac0e-e39c86d9e5f4'
)
  AND id NOT IN (
  '06c5e30d-3cec-4e53-83c5-d08745a9caf2', '1630784f-0614-4cca-ad7f-8590a7204e4a', '21619bb5-93ea-418e-b405-f9946af73ec2', '22eafbb1-a1aa-4510-ae9c-597bd3ca97ca', '26a5e728-38ef-47e9-8889-29809caf202b', '2e248097-b954-4c28-91dc-b84a19f9fabc',
  '32416e4c-1a50-4290-8b9b-fff1c6b891bd', '34c0bc26-e3e5-407d-97a4-5e1d141bbc5a', '380bbb1b-9957-4da6-83ad-d767e3f55f84', '395e79c4-e6bb-4c39-a497-c3ef27b86b7e', '42ac131e-631d-4518-8896-86cd1c49c07a', '46365296-c89b-478d-b847-8b4b4f4a0d84',
  '4c712b7f-2b1a-4476-a23d-ad6f68ceaf5e', '4e41b21b-51d5-4b06-acff-5afdee59dd56', '4efe801f-11c9-4590-8ae1-5a7c8fe47f64', '52a0e29a-04d5-4e88-94ff-ff048f4951a6', '547a1e32-e9c6-4c0b-a43f-f98dc76ce653', '54fee423-4e88-4c55-b715-94a80044c617',
  '6388d75b-9868-4ca7-a908-58d60c15c4c3', '692bce33-4e4a-46e0-8bd4-a23865fcb44c', '6b1d14ee-5972-4778-ab8c-6e5ff6752494', '6bc73e42-a470-4a1d-84d7-fe15e59f45b7', '6cc5494b-7f6b-44b1-8ac5-b174798afb1d', '72867caf-be24-4df7-8eab-17af8b6b18ec',
  '7dd1cfa3-d3f9-46dd-8694-1c78c4a5a8bd', '7eb63782-785f-4b5c-a37b-5b29411f7acb', '855cc4c0-0250-4c7d-b85b-d1138436a21a', '90452961-6c46-4737-9a91-55be017b3050', '96ba287a-bba7-471d-a53c-a16fd880dc67', 'a40742f5-36f4-46ab-a549-db41fbe41365',
  'a6cd3003-f914-42b0-9244-0f4d08b08797', 'a6cea7e8-dd75-408c-bc93-b8d2a4503d0e', 'a7d0ee40-14ee-476f-bccf-b0f4d8d8a8c7', 'a837d566-6a00-4ad8-bb7b-c49eb73f92cc', 'ac922c58-a6ee-4d44-968a-6744c3478453', 'afbe1a78-1fa6-4747-8e1f-be7dbd488fd0',
  'b1305678-d690-4670-b1ea-d30356b2f5e8', 'b414cd52-32bf-450e-8bf5-0fa8e2c3b68e', 'b6bc59ba-db50-49d0-b4e0-4fad8da8946e', 'b955595d-ddb9-4c88-bf4e-25ebcb4cbd43', 'c0c7fc56-9f95-4958-b318-a1304bd42c9f', 'c1a3e4b5-bf06-4389-b11e-c272a7ad90a3',
  'c3cf6ce3-a2a6-4df6-8b28-0618fdeabd56', 'cb088913-d868-4203-965a-117e5569e170', 'cfcb82bf-bc02-406b-b60d-ad204ba6075a', 'e048fc4e-c356-4f78-86e5-8a41d0327f25', 'e20b0dfd-ced1-4d79-96d6-e8808ce785a8', 'e3929949-4c3d-4d5f-9872-685bf074227a',
  'e90e30f2-c263-4ecd-a25a-ca0604ae421d', 'eb79e877-7892-43e5-ac0e-e39c86d9e5f4'
);

-- verification v1b: all 50 old-tree members in band at their old position — expect 50.
SELECT count(*) AS v1b_members_in_band FROM series
WHERE sort_order BETWEEN 1 AND 999 AND id IN (
  '06c5e30d-3cec-4e53-83c5-d08745a9caf2', '1630784f-0614-4cca-ad7f-8590a7204e4a', '21619bb5-93ea-418e-b405-f9946af73ec2', '22eafbb1-a1aa-4510-ae9c-597bd3ca97ca', '26a5e728-38ef-47e9-8889-29809caf202b', '2e248097-b954-4c28-91dc-b84a19f9fabc',
  '32416e4c-1a50-4290-8b9b-fff1c6b891bd', '34c0bc26-e3e5-407d-97a4-5e1d141bbc5a', '380bbb1b-9957-4da6-83ad-d767e3f55f84', '395e79c4-e6bb-4c39-a497-c3ef27b86b7e', '42ac131e-631d-4518-8896-86cd1c49c07a', '46365296-c89b-478d-b847-8b4b4f4a0d84',
  '4c712b7f-2b1a-4476-a23d-ad6f68ceaf5e', '4e41b21b-51d5-4b06-acff-5afdee59dd56', '4efe801f-11c9-4590-8ae1-5a7c8fe47f64', '52a0e29a-04d5-4e88-94ff-ff048f4951a6', '547a1e32-e9c6-4c0b-a43f-f98dc76ce653', '54fee423-4e88-4c55-b715-94a80044c617',
  '6388d75b-9868-4ca7-a908-58d60c15c4c3', '692bce33-4e4a-46e0-8bd4-a23865fcb44c', '6b1d14ee-5972-4778-ab8c-6e5ff6752494', '6bc73e42-a470-4a1d-84d7-fe15e59f45b7', '6cc5494b-7f6b-44b1-8ac5-b174798afb1d', '72867caf-be24-4df7-8eab-17af8b6b18ec',
  '7dd1cfa3-d3f9-46dd-8694-1c78c4a5a8bd', '7eb63782-785f-4b5c-a37b-5b29411f7acb', '855cc4c0-0250-4c7d-b85b-d1138436a21a', '90452961-6c46-4737-9a91-55be017b3050', '96ba287a-bba7-471d-a53c-a16fd880dc67', 'a40742f5-36f4-46ab-a549-db41fbe41365',
  'a6cd3003-f914-42b0-9244-0f4d08b08797', 'a6cea7e8-dd75-408c-bc93-b8d2a4503d0e', 'a7d0ee40-14ee-476f-bccf-b0f4d8d8a8c7', 'a837d566-6a00-4ad8-bb7b-c49eb73f92cc', 'ac922c58-a6ee-4d44-968a-6744c3478453', 'afbe1a78-1fa6-4747-8e1f-be7dbd488fd0',
  'b1305678-d690-4670-b1ea-d30356b2f5e8', 'b414cd52-32bf-450e-8bf5-0fa8e2c3b68e', 'b6bc59ba-db50-49d0-b4e0-4fad8da8946e', 'b955595d-ddb9-4c88-bf4e-25ebcb4cbd43', 'c0c7fc56-9f95-4958-b318-a1304bd42c9f', 'c1a3e4b5-bf06-4389-b11e-c272a7ad90a3',
  'c3cf6ce3-a2a6-4df6-8b28-0618fdeabd56', 'cb088913-d868-4203-965a-117e5569e170', 'cfcb82bf-bc02-406b-b60d-ad204ba6075a', 'e048fc4e-c356-4f78-86e5-8a41d0327f25', 'e20b0dfd-ced1-4d79-96d6-e8808ce785a8', 'e3929949-4c3d-4d5f-9872-685bf074227a',
  'e90e30f2-c263-4ecd-a25a-ca0604ae421d', 'eb79e877-7892-43e5-ac0e-e39c86d9e5f4'
);

-- ============================================================================
-- §2 teacher_listing_items COMPLETION — 13 old content-type rows absent from
--    TLI (multiset diff by normalize_he title per key; all 13 target sort
--    positions verified VACANT live). + 2 ref corrections (rows 22/23 of
--    חידות חזרה point at the רש"י copies while the old rows are the plain
--    א"ב-series copies) + 2 series renames to the old listing labels + 1
--    audience union (old shows the lesson on both a public and a teachers page).
-- ----------------------------------------------------------------------------
-- scope: missing TLI rows (expect 13 pre-apply, 0 after)
SELECT 13 - count(*) AS s2_to_insert FROM teacher_listing_items t
WHERE t.scope='content_type' AND (t.key, t.sort_order) IN (
  ('ביאור הפסוקים',4),('ביאור הפסוקים',79),('ביאור הפסוקים',116),
  ('חידות חזרה',33),('חידות חזרה',34),('חידות חזרה',35),
  ('דגשים והכוונה על סדר הפרקים',4),('דגשים והכוונה על סדר הפרקים',8),
  ('סיכום הפרקים והנושאים בקצרה',14),('דפי עבודה',31),('ביאורי מילים',39),
  ('חוברת עבודה',1),('ספר יהושע',1)
);

-- old row #4 'פשט הפסוקים' (שמות copy, lc 9; old url /מאגר-עזרי-הלמידה/תורה/שמות/פשט-הפסוקים/)
INSERT INTO teacher_listing_items (scope, key, kind, series_id, sort_order)
SELECT 'content_type', 'ביאור הפסוקים', 'series', '7e80baeb-7601-427b-b728-586aab817049', 4
WHERE NOT EXISTS (SELECT 1 FROM teacher_listing_items WHERE scope='content_type' AND key='ביאור הפסוקים' AND sort_order=4);

-- old row #79 'הודעה והבהרה' — the copy inside 'ביאור הפסוקים חומש שמות' (old url …/שמות/ביאור-הפסוקים-חומש-שמות/הודעה-והבהרה/)
INSERT INTO teacher_listing_items (scope, key, kind, lesson_id, sort_order)
SELECT 'content_type', 'ביאור הפסוקים', 'lesson', '638283fc-7174-439b-b6f7-c901d04fca05', 79
WHERE NOT EXISTS (SELECT 1 FROM teacher_listing_items WHERE scope='content_type' AND key='ביאור הפסוקים' AND sort_order=79);

-- old row #116 'מגילת רות עם ביאור ושננתם - פרק א' — same physical series (c57e8a68) as the live TLI rows 117-119; audience union below
INSERT INTO teacher_listing_items (scope, key, kind, lesson_id, sort_order)
SELECT 'content_type', 'ביאור הפסוקים', 'lesson', 'cab5bf1d-f13b-494d-9606-067d87b68337', 116
WHERE NOT EXISTS (SELECT 1 FROM teacher_listing_items WHERE scope='content_type' AND key='ביאור הפסוקים' AND sort_order=116);

-- old row #33 'חידות על פי א"ב פרשת וישב' — the רש"י-series copy (legacy /media/144142/וישב-רשי.doc)
INSERT INTO teacher_listing_items (scope, key, kind, lesson_id, sort_order)
SELECT 'content_type', 'חידות חזרה', 'lesson', '56f8e65e-92fe-429f-a2e5-4cb3a82c50a4', 33
WHERE NOT EXISTS (SELECT 1 FROM teacher_listing_items WHERE scope='content_type' AND key='חידות חזרה' AND sort_order=33);

-- old row #34 'חידות על פי א"ב פרשת מקץ' — רש"י copy (legacy /media/144156/מקץ-רשי.doc)
INSERT INTO teacher_listing_items (scope, key, kind, lesson_id, sort_order)
SELECT 'content_type', 'חידות חזרה', 'lesson', '70baf51b-146e-4e21-a7d9-1ecc9e850ce9', 34
WHERE NOT EXISTS (SELECT 1 FROM teacher_listing_items WHERE scope='content_type' AND key='חידות חזרה' AND sort_order=34);

-- old row #35 'חידות על פי א"ב פרשת ויגש' — רש"י copy (legacy /media/144132/ויגש-רשי.doc)
INSERT INTO teacher_listing_items (scope, key, kind, lesson_id, sort_order)
SELECT 'content_type', 'חידות חזרה', 'lesson', '29538a7b-aa1d-4a25-a115-2097756c9e8e', 35
WHERE NOT EXISTS (SELECT 1 FROM teacher_listing_items WHERE scope='content_type' AND key='חידות חזרה' AND sort_order=35);

-- old row #4 'חוברות ת"ת מורשה - חומש שמות' (lc 9; renamed below)
INSERT INTO teacher_listing_items (scope, key, kind, series_id, sort_order)
SELECT 'content_type', 'דגשים והכוונה על סדר הפרקים', 'series', 'ab14792d-d96a-4242-9dba-4474bebcdad1', 4
WHERE NOT EXISTS (SELECT 1 FROM teacher_listing_items WHERE scope='content_type' AND key='דגשים והכוונה על סדר הפרקים' AND sort_order=4);

-- old row #8 'חוברות ת"ת מורשה - חומש במדבר' (lc 10; renamed below)
INSERT INTO teacher_listing_items (scope, key, kind, series_id, sort_order)
SELECT 'content_type', 'דגשים והכוונה על סדר הפרקים', 'series', '5d2ac1b3-1724-4623-a8bd-489eceec8e26', 8
WHERE NOT EXISTS (SELECT 1 FROM teacher_listing_items WHERE scope='content_type' AND key='דגשים והכוונה על סדר הפרקים' AND sort_order=8);

-- old row #14 'סיכום פרטי המשכן…' — the teachers-wing copy (sits in teachers שמות book 96ba287a; row #13 = public copy already in TLI)
INSERT INTO teacher_listing_items (scope, key, kind, lesson_id, sort_order)
SELECT 'content_type', 'סיכום הפרקים והנושאים בקצרה', 'lesson', 'c445b645-e43d-4119-9fb3-ffa5c87a9e47', 14
WHERE NOT EXISTS (SELECT 1 FROM teacher_listing_items WHERE scope='content_type' AND key='סיכום הפרקים והנושאים בקצרה' AND sort_order=14);

-- old row #31 'חוברת עבודה והכוונה ללימוד עצמי על ספר יהושע' — lesson whose legacy_attachment_url IS the old page url; pdf rehosted (he-f1fb12bd0e.pdf)
INSERT INTO teacher_listing_items (scope, key, kind, lesson_id, sort_order)
SELECT 'content_type', 'דפי עבודה', 'lesson', '9e696ff0-979f-4070-8cb0-d0de5819d648', 31
WHERE NOT EXISTS (SELECT 1 FROM teacher_listing_items WHERE scope='content_type' AND key='דפי עבודה' AND sort_order=31);

-- old row #39 — same physical workbook
INSERT INTO teacher_listing_items (scope, key, kind, lesson_id, sort_order)
SELECT 'content_type', 'ביאורי מילים', 'lesson', '9e696ff0-979f-4070-8cb0-d0de5819d648', 39
WHERE NOT EXISTS (SELECT 1 FROM teacher_listing_items WHERE scope='content_type' AND key='ביאורי מילים' AND sort_order=39);

-- old row #1 — first TLI row for this key (page previously rendered via content_type fallback)
INSERT INTO teacher_listing_items (scope, key, kind, lesson_id, sort_order)
SELECT 'content_type', 'חוברת עבודה', 'lesson', '9e696ff0-979f-4070-8cb0-d0de5819d648', 1
WHERE NOT EXISTS (SELECT 1 FROM teacher_listing_items WHERE scope='content_type' AND key='חוברת עבודה' AND sort_order=1);

-- old row #1 — first TLI row for this key
INSERT INTO teacher_listing_items (scope, key, kind, lesson_id, sort_order)
SELECT 'content_type', 'ספר יהושע', 'lesson', '9e696ff0-979f-4070-8cb0-d0de5819d648', 1
WHERE NOT EXISTS (SELECT 1 FROM teacher_listing_items WHERE scope='content_type' AND key='ספר יהושע' AND sort_order=1);

-- ref corrections: old rows 22/23 are the plain 'חידות על פי א"ב - חומש בראשית'
-- copies (legacy מקץ.doc / ויגש.doc); live rows point at the רש"י copies that
-- belong at 34/35 (row 21 = 1157a3cc is already the correct plain copy).
UPDATE teacher_listing_items SET lesson_id='75d419b1-157d-408a-ae3a-955a2957d44d'  -- מקץ plain (series 697e6741)
WHERE id='54fbd3f0-6241-4bf6-bf03-cc4cd33ede40' AND lesson_id='70baf51b-146e-4e21-a7d9-1ecc9e850ce9';
UPDATE teacher_listing_items SET lesson_id='fba93d33-4edf-4356-9b21-63ca38d1188e'  -- ויגש plain (series 697e6741)
WHERE id='113e8074-6c33-4506-b89a-e992f81312f7' AND lesson_id='29538a7b-aa1d-4a25-a115-2097756c9e8e';

-- renames: old listing label (on BOTH the content-type page and the old שמות/במדבר
-- book pages) is 'חוברות ת"ת מורשה - חומש X'; live titles dropped the ת"ת מורשה.
-- Sibling collision pre-checked live: none.
UPDATE series SET title = 'חוברות ת"ת מורשה - חומש שמות'
WHERE id='ab14792d-d96a-4242-9dba-4474bebcdad1' AND title <> 'חוברות ת"ת מורשה - חומש שמות';
UPDATE series SET title = 'חוברות ת"ת מורשה - חומש במדבר'
WHERE id='5d2ac1b3-1724-4623-a8bd-489eceec8e26' AND title <> 'חוברות ת"ת מורשה - חומש במדבר';

-- audience union: מגילת רות עם ביאור ושננתם - פרק א (copy in series c57e8a68, the
-- one the live TLI rows 117-119 use for פרקים ב-ד). Old shows it on the public רות
-- series page AND on the teachers ביאור-הפסוקים page → dual audience (ROUND1 §6 semantics).
UPDATE lessons SET audience_tags = audience_tags || '{teachers}'
WHERE id='cab5bf1d-f13b-494d-9606-067d87b68337' AND NOT (audience_tags @> '{teachers}');

-- verification v2: per-key TLI row counts — expect (old counts):
-- ביאור הפסוקים=119, ביאורי מילים=39, דגשים והכוונה על סדר הפרקים=84, דפי עבודה=70,
-- חידות חזרה=118, סיכום הפרקים והנושאים בקצרה=159, חוברת עבודה=1, ספר יהושע=1
SELECT key, count(*) AS rows FROM teacher_listing_items WHERE scope='content_type'
AND key IN ('ביאור הפסוקים','ביאורי מילים','דגשים והכוונה על סדר הפרקים','דפי עבודה','חידות חזרה','סיכום הפרקים והנושאים בקצרה','חוברת עבודה','ספר יהושע')
GROUP BY key ORDER BY key;

-- verification v2b: riddles rows 21-23 now point at the plain copies, 33-35 at רש"י — expect 6 rows, plain={1157a3cc,75d419b1,fba93d33}, rashi={56f8e65e,70baf51b,29538a7b}
SELECT sort_order, lesson_id FROM teacher_listing_items
WHERE scope='content_type' AND key='חידות חזרה' AND sort_order IN (21,22,23,33,34,35) ORDER BY sort_order;

-- ============================================================================
-- §3 CREATORS rabbi_page_items COMPLETENESS — multiset diff (normalize_he title)
--    of the 282 old creator rows vs live RPI per rabbi: 26/31 creators complete;
--    18 old rows unrepresented across 5 creators. 14 resolvable INSERTs +
--    4 position fixes + 1 block shift + 2 lesson-title restores; 2 rows → yoav.
-- ----------------------------------------------------------------------------
-- scope: how many of the 14 insert targets already exist (expect 0 pre-apply, 14 after)
SELECT count(*) AS s3_already_present FROM rabbi_page_items r
WHERE (r.rabbi_id::text, COALESCE(r.series_id::text,r.lesson_id::text), r.sort_order) IN (
  ('e1111111-1111-1111-1111-111111111121','7e80baeb-7601-427b-b728-586aab817049',4),
  ('e1111111-1111-1111-1111-111111111103','faaf06ea-0b08-4634-b1fb-d489249e7ed0',1),
  ('e1111111-1111-1111-1111-111111111103','26a2076b-f716-4d49-87f9-59673f18db07',2),
  ('e1111111-1111-1111-1111-111111111103','b654c91c-1d39-4ede-8f2b-6fd3ed2f3985',4),
  ('e1111111-1111-1111-1111-111111111103','00b7226a-cb33-470b-8710-ba574662f406',5),
  ('b5555555-5555-5555-5555-555555555555','ab14792d-d96a-4242-9dba-4474bebcdad1',2),
  ('b5555555-5555-5555-5555-555555555555','5d2ac1b3-1724-4623-a8bd-489eceec8e26',5),
  ('744da303-22be-4062-a822-4ba8e8f1b02d','ff799d93-9eeb-4290-a987-936ddfb15e23',7),
  ('744da303-22be-4062-a822-4ba8e8f1b02d','ef23357b-679b-49fa-b262-a01225edab87',9),
  ('744da303-22be-4062-a822-4ba8e8f1b02d','fe1147aa-a2e8-4056-b53e-963a80461c40',10),
  ('744da303-22be-4062-a822-4ba8e8f1b02d','73a01cf4-28f5-4129-8992-a929fec29cd7',11),
  ('744da303-22be-4062-a822-4ba8e8f1b02d','a69ddf30-9109-465d-a222-f83ce6535b5c',22),
  ('744da303-22be-4062-a822-4ba8e8f1b02d','c8b151d0-7f65-4431-bd33-755240a2072c',26),
  ('6f4b2572-b019-4832-9547-de7e8bc6d909','c445b645-e43d-4119-9fb3-ffa5c87a9e47',11)
);

-- 3a. נתן מארגל — the old page lists the SAME display title 5×, one series per
-- chumash. The single live row (id 20dd3db5) is the ויקרא copy sitting at #1;
-- its old position is #3.
UPDATE rabbi_page_items SET sort_order=3
WHERE id='20dd3db5-452a-49e2-9dfa-83788b829ef8' AND sort_order=1;

-- 3b. תלמוד תורה מורשה — live rows were renumbered dense 1-4; restore old slots 3/4/6.
UPDATE rabbi_page_items SET sort_order=3 WHERE id='2ff1f568-e291-4e07-a7ba-40a22d79cbca' AND sort_order=2;  -- חוברת עבודה לתלמיד- חומש שמות → old #3
UPDATE rabbi_page_items SET sort_order=4 WHERE id='5358d8f8-3449-4c8b-ac9d-b9475db256a5' AND sort_order=3;  -- חוברות - חומש ויקרא → old #4
UPDATE rabbi_page_items SET sort_order=6 WHERE id='c0ed1ecc-b01d-4ad1-864e-bb8a64049e89' AND sort_order=4;  -- חוברת עבודה לתלמיד- חומש בראשית → old #6

-- 3c. ושננתם - אוצר התורה — old #11 (the teachers-wing copy of סיכום פרטי המשכן)
-- is missing; live rows 11..49 are old 12..50 shifted -1. Shift back then insert.
-- Guarded by absence of the c445b645 row (makes the block idempotent).
UPDATE rabbi_page_items SET sort_order = sort_order + 1
WHERE rabbi_id='6f4b2572-b019-4832-9547-de7e8bc6d909' AND sort_order >= 11
  AND NOT EXISTS (SELECT 1 FROM rabbi_page_items WHERE rabbi_id='6f4b2572-b019-4832-9547-de7e8bc6d909' AND lesson_id='c445b645-e43d-4119-9fb3-ffa5c87a9e47')
  -- second guard: slot 11 must still be occupied (prevents a double shift if a
  -- previous run crashed between this statement and the INSERT below)
  AND EXISTS (SELECT 1 FROM rabbi_page_items WHERE rabbi_id='6f4b2572-b019-4832-9547-de7e8bc6d909' AND sort_order=11);

INSERT INTO rabbi_page_items (rabbi_id, kind, lesson_id, sort_order)
SELECT '6f4b2572-b019-4832-9547-de7e8bc6d909', 'lesson', 'c445b645-e43d-4119-9fb3-ffa5c87a9e47', 11
WHERE NOT EXISTS (SELECT 1 FROM rabbi_page_items WHERE rabbi_id='6f4b2572-b019-4832-9547-de7e8bc6d909' AND lesson_id='c445b645-e43d-4119-9fb3-ffa5c87a9e47');

-- 3d. resolvable INSERTs (each at the old creator-row position)
-- בניה כהן old row #4 'פשט הפסוקים' (שמות copy)
INSERT INTO rabbi_page_items (rabbi_id, kind, series_id, sort_order)
SELECT 'e1111111-1111-1111-1111-111111111121', 'series', '7e80baeb-7601-427b-b728-586aab817049', 4
WHERE NOT EXISTS (SELECT 1 FROM rabbi_page_items WHERE rabbi_id='e1111111-1111-1111-1111-111111111121' AND series_id='7e80baeb-7601-427b-b728-586aab817049' AND sort_order=4);

-- נתן מארגל old row #1 חידות לילדים… (בראשית, lc 11)
INSERT INTO rabbi_page_items (rabbi_id, kind, series_id, sort_order)
SELECT 'e1111111-1111-1111-1111-111111111103', 'series', 'faaf06ea-0b08-4634-b1fb-d489249e7ed0', 1
WHERE NOT EXISTS (SELECT 1 FROM rabbi_page_items WHERE rabbi_id='e1111111-1111-1111-1111-111111111103' AND series_id='faaf06ea-0b08-4634-b1fb-d489249e7ed0' AND sort_order=1);

-- נתן מארגל old row #2 (שמות, lc 10)
INSERT INTO rabbi_page_items (rabbi_id, kind, series_id, sort_order)
SELECT 'e1111111-1111-1111-1111-111111111103', 'series', '26a2076b-f716-4d49-87f9-59673f18db07', 2
WHERE NOT EXISTS (SELECT 1 FROM rabbi_page_items WHERE rabbi_id='e1111111-1111-1111-1111-111111111103' AND series_id='26a2076b-f716-4d49-87f9-59673f18db07' AND sort_order=2);

-- נתן מארגל old row #4 (במדבר, lc 11)
INSERT INTO rabbi_page_items (rabbi_id, kind, series_id, sort_order)
SELECT 'e1111111-1111-1111-1111-111111111103', 'series', 'b654c91c-1d39-4ede-8f2b-6fd3ed2f3985', 4
WHERE NOT EXISTS (SELECT 1 FROM rabbi_page_items WHERE rabbi_id='e1111111-1111-1111-1111-111111111103' AND series_id='b654c91c-1d39-4ede-8f2b-6fd3ed2f3985' AND sort_order=4);

-- נתן מארגל old row #5 (דברים, lc 11)
INSERT INTO rabbi_page_items (rabbi_id, kind, series_id, sort_order)
SELECT 'e1111111-1111-1111-1111-111111111103', 'series', '00b7226a-cb33-470b-8710-ba574662f406', 5
WHERE NOT EXISTS (SELECT 1 FROM rabbi_page_items WHERE rabbi_id='e1111111-1111-1111-1111-111111111103' AND series_id='00b7226a-cb33-470b-8710-ba574662f406' AND sort_order=5);

-- תלמוד תורה מורשה old row #2 'חוברות ת"ת מורשה - חומש שמות'
INSERT INTO rabbi_page_items (rabbi_id, kind, series_id, sort_order)
SELECT 'b5555555-5555-5555-5555-555555555555', 'series', 'ab14792d-d96a-4242-9dba-4474bebcdad1', 2
WHERE NOT EXISTS (SELECT 1 FROM rabbi_page_items WHERE rabbi_id='b5555555-5555-5555-5555-555555555555' AND series_id='ab14792d-d96a-4242-9dba-4474bebcdad1' AND sort_order=2);

-- תלמוד תורה מורשה old row #5 'חוברות ת"ת מורשה - חומש במדבר'
INSERT INTO rabbi_page_items (rabbi_id, kind, series_id, sort_order)
SELECT 'b5555555-5555-5555-5555-555555555555', 'series', '5d2ac1b3-1724-4623-a8bd-489eceec8e26', 5
WHERE NOT EXISTS (SELECT 1 FROM rabbi_page_items WHERE rabbi_id='b5555555-5555-5555-5555-555555555555' AND series_id='5d2ac1b3-1724-4623-a8bd-489eceec8e26' AND sort_order=5);

-- בן ארצי old row #7 'פשט בפרשה' בראשית (lc 23) — note: live sorts for this dual-page rabbi are merged/renumbered; collisions documented in report
INSERT INTO rabbi_page_items (rabbi_id, kind, series_id, sort_order)
SELECT '744da303-22be-4062-a822-4ba8e8f1b02d', 'series', 'ff799d93-9eeb-4290-a987-936ddfb15e23', 7
WHERE NOT EXISTS (SELECT 1 FROM rabbi_page_items WHERE rabbi_id='744da303-22be-4062-a822-4ba8e8f1b02d' AND series_id='ff799d93-9eeb-4290-a987-936ddfb15e23' AND sort_order=7);

-- בן ארצי old row #9 'פשט בפרשה' ויקרא (lc 16) — שמות copy 3610bdba already present (old row #8)
INSERT INTO rabbi_page_items (rabbi_id, kind, series_id, sort_order)
SELECT '744da303-22be-4062-a822-4ba8e8f1b02d', 'series', 'ef23357b-679b-49fa-b262-a01225edab87', 9
WHERE NOT EXISTS (SELECT 1 FROM rabbi_page_items WHERE rabbi_id='744da303-22be-4062-a822-4ba8e8f1b02d' AND series_id='ef23357b-679b-49fa-b262-a01225edab87' AND sort_order=9);

-- בן ארצי old row #10 'פשט בפרשה' במדבר (lc 11)
INSERT INTO rabbi_page_items (rabbi_id, kind, series_id, sort_order)
SELECT '744da303-22be-4062-a822-4ba8e8f1b02d', 'series', 'fe1147aa-a2e8-4056-b53e-963a80461c40', 10
WHERE NOT EXISTS (SELECT 1 FROM rabbi_page_items WHERE rabbi_id='744da303-22be-4062-a822-4ba8e8f1b02d' AND series_id='fe1147aa-a2e8-4056-b53e-963a80461c40' AND sort_order=10);

-- בן ארצי old row #11 'פשט בפרשה' דברים (lc 11)
INSERT INTO rabbi_page_items (rabbi_id, kind, series_id, sort_order)
SELECT '744da303-22be-4062-a822-4ba8e8f1b02d', 'series', '73a01cf4-28f5-4129-8992-a929fec29cd7', 11
WHERE NOT EXISTS (SELECT 1 FROM rabbi_page_items WHERE rabbi_id='744da303-22be-4062-a822-4ba8e8f1b02d' AND series_id='73a01cf4-28f5-4129-8992-a929fec29cd7' AND sort_order=11);

-- בן ארצי old row #22 'לב הפרק' — the דניאל copy (lc 11; old url …/כתובים/דניאל/לב-הפרק/)
INSERT INTO rabbi_page_items (rabbi_id, kind, series_id, sort_order)
SELECT '744da303-22be-4062-a822-4ba8e8f1b02d', 'series', 'a69ddf30-9109-465d-a222-f83ce6535b5c', 22
WHERE NOT EXISTS (SELECT 1 FROM rabbi_page_items WHERE rabbi_id='744da303-22be-4062-a822-4ba8e8f1b02d' AND series_id='a69ddf30-9109-465d-a222-f83ce6535b5c' AND sort_order=22);

-- בן ארצי old row #26 'לב הפרק - ישעיהו' second copy (old lc=0; live twin is a draft, lc 0 — flagged in report)
INSERT INTO rabbi_page_items (rabbi_id, kind, series_id, sort_order)
SELECT '744da303-22be-4062-a822-4ba8e8f1b02d', 'series', 'c8b151d0-7f65-4431-bd33-755240a2072c', 26
WHERE NOT EXISTS (SELECT 1 FROM rabbi_page_items WHERE rabbi_id='744da303-22be-4062-a822-4ba8e8f1b02d' AND series_id='c8b151d0-7f65-4431-bd33-755240a2072c' AND sort_order=26);

-- 3e. lesson-title restores — migration collapsed two distinct old titles into one:
-- old public rav-page row #34 (and creator row #35) carry the SHORT title; the old
-- והנחלות rows live on the teachers יהושע/מלכים-ב book pages (creator row #39).
-- 5dae4141 is the rav-page-matched copy (rabbis_plan media match) → restore short title.
UPDATE lessons SET title='הסבר פשוט על מבנה ארץ ישראל'
WHERE id='5dae4141-3671-4afa-92cf-3ffd59bc1a17' AND title='הסבר פשוט על מבנה ארץ ישראל והנחלות';
-- old rav-page row #40 + creator row #41 + teachers יחזקאל book page all read
-- 'על פי שיטות'; 2752644d is the rav-page-matched copy → restore that variant.
UPDATE lessons SET title='שרטוט בית המקדש ביחזקאל על פי שיטות המלבי"ם רש"י ומצודות'
WHERE id='2752644d-3a66-45a1-beb7-41e4725a71fc' AND title='שרטוט בית המקדש ביחזקאל לפי שיטות המלבי"ם רש"י ומצודות';

-- verification v3: per-creator RPI row counts — expect: בניה כהן(…121)=4,
-- נתן מארגל(…103)=5, מורשה(b5555555)=6, ושננתם(6f4b2572)=50, בן ארצי(744da303)=53
SELECT rabbi_id, count(*) AS rows FROM rabbi_page_items
WHERE rabbi_id IN ('e1111111-1111-1111-1111-111111111121','e1111111-1111-1111-1111-111111111103',
                   'b5555555-5555-5555-5555-555555555555','6f4b2572-b019-4832-9547-de7e8bc6d909',
                   '744da303-22be-4062-a822-4ba8e8f1b02d')
GROUP BY rabbi_id ORDER BY rabbi_id;

-- verification v3b: ושננתם ladder intact after the shift — expect 50 rows, sorts 1..50, no dup
SELECT count(*) AS rows, min(sort_order) AS lo, max(sort_order) AS hi, count(DISTINCT sort_order) AS distinct_sorts
FROM rabbi_page_items WHERE rabbi_id='6f4b2572-b019-4832-9547-de7e8bc6d909';

-- verification v3c: the two restored titles exist exactly once each
SELECT title, count(*) FROM lessons
WHERE title IN ('הסבר פשוט על מבנה ארץ ישראל','שרטוט בית המקדש ביחזקאל על פי שיטות המלבי"ם רש"י ומצודות')
  AND status='published' GROUP BY title;

-- ============================================================================
-- §4 THREE MISSING COPY-SOURCE LESSONS — full row data recovered from the old
--    public listings scrape (titles, rabbi הרב יואב אוריאל, S3 audio, series+slot).
--    Media is on bneyzion.s3 (AWS), NOT bneyzion.co.il → NO Rule-13 rehost needed.
--    Both parent series already exist live.
-- ----------------------------------------------------------------------------
-- scope: expect 3 pre-apply, 0 after
SELECT 3 - count(*) AS s4_to_insert FROM lessons WHERE id IN ('57bbbd2e-f522-4be8-8ea8-901837e48c71','151a5d32-5a96-4a5e-a4c2-b7ecd71d2100','e9ca1179-0d11-434e-86ea-37f72a514b16');

-- L1: בבל מול ירושלים שיעור ראשון → series 6be34cb5 (live, published, currently EMPTY) @10
INSERT INTO lessons (id, title, series_id, rabbi_id, audio_url, source_type, status, audience_tags, sort_order)
SELECT '57bbbd2e-f522-4be8-8ea8-901837e48c71', 'בבל מול ירושלים - בקעה מול הרים שיעור ראשון', '6be34cb5-732f-5d08-9c13-852928f121db', 'acd34d0f-1288-47b8-9e8e-38e69599c294',
       'https://bneyzion.s3.us-east-2.amazonaws.com/%D7%94%D7%A8%D7%91+%D7%99%D7%95%D7%90%D7%91+%D7%90%D7%95%D7%A8%D7%99%D7%90%D7%9C/%D7%91%D7%91%D7%9C+%D7%95%D7%99%D7%A8%D7%95%D7%A9%D7%9C%D7%99%D7%9D+-+%D7%91%D7%A7%D7%A2%D7%94+%D7%9E%D7%95%D7%9C+%D7%94%D7%A8%D7%99%D7%9D/%D7%91%D7%91%D7%9C+%D7%95%D7%90%D7%A8%D7%A5+%D7%99%D7%A9%D7%A8%D7%90%D7%9C+-+%D7%94%D7%91%D7%A7%D7%A2%D7%94+%D7%9E%D7%95%D7%9C+%D7%94%D7%94%D7%A8%D7%99%D7%9D.mp3',
       'audio', 'published', '{general}', 10
WHERE NOT EXISTS (SELECT 1 FROM lessons WHERE series_id='6be34cb5-732f-5d08-9c13-852928f121db' AND title='בבל מול ירושלים - בקעה מול הרים שיעור ראשון');

-- L2: בבל מול ירושלים שיעור שני → same series @20
INSERT INTO lessons (id, title, series_id, rabbi_id, audio_url, source_type, status, audience_tags, sort_order)
SELECT '151a5d32-5a96-4a5e-a4c2-b7ecd71d2100', 'בבל מול ירושלים - בקעה מול הרים שיעור שני', '6be34cb5-732f-5d08-9c13-852928f121db', 'acd34d0f-1288-47b8-9e8e-38e69599c294',
       'https://bneyzion.s3.us-east-2.amazonaws.com/%D7%94%D7%A8%D7%91+%D7%99%D7%95%D7%90%D7%91+%D7%90%D7%95%D7%A8%D7%99%D7%90%D7%9C/%D7%91%D7%91%D7%9C+%D7%95%D7%99%D7%A8%D7%95%D7%A9%D7%9C%D7%99%D7%9D+-+%D7%91%D7%A7%D7%A2%D7%94+%D7%9E%D7%95%D7%9C+%D7%94%D7%A8%D7%99%D7%9D/%D7%91%D7%91%D7%9C+%D7%95%D7%90%D7%A8%D7%A5+%D7%99%D7%A9%D7%A8%D7%90%D7%9C+-+%D7%94%D7%91%D7%A7%D7%A2%D7%94+%D7%9E%D7%95%D7%9C+%D7%94%D7%94%D7%A8%D7%99%D7%9D+-+%D7%A9%D7%99%D7%A2%D7%95%D7%A8+%D7%A9%D7%A0%D7%99.mp3',
       'audio', 'published', '{general}', 20
WHERE NOT EXISTS (SELECT 1 FROM lessons WHERE series_id='6be34cb5-732f-5d08-9c13-852928f121db' AND title='בבל מול ירושלים - בקעה מול הרים שיעור שני');

-- L3: תולדות קרבת ה' לאדם - ביציאת מצרים ובמתן תורה → series d7a37161 @15
-- (old promo: 'שיעור שני בסדרה'; existing siblings sit at 10/20/30 → 15 lands it 2nd)
INSERT INTO lessons (id, title, series_id, rabbi_id, audio_url, source_type, status, audience_tags, bible_book, sort_order)
SELECT 'e9ca1179-0d11-434e-86ea-37f72a514b16', 'תולדות קרבת ה'' לאדם - ביציאת מצרים ובמתן תורה', 'd7a37161-18f4-49a6-adcc-d88a2d1fbc56', 'acd34d0f-1288-47b8-9e8e-38e69599c294',
       'http://bneyzion.s3.amazonaws.com/%D7%94%D7%A8%D7%91%20%D7%99%D7%95%D7%90%D7%91%20%D7%90%D7%95%D7%A8%D7%99%D7%90%D7%9C/%D7%A1%D7%A4%D7%A8%20%D7%91%D7%A8%D7%90%D7%A9%D7%99%D7%AA/%D7%AA%D7%95%D7%9C%D7%93%D7%95%D7%AA%20%D7%A7%D7%A8%D7%91%D7%AA%20%D7%94%27%20-%20%D7%91%D7%99%D7%A6%D7%99%D7%90%D7%AA%20%D7%9E%D7%A6%D7%A8%D7%99%D7%9D%20%D7%95%D7%91%D7%9E%D7%A2%D7%9E%D7%93%20%D7%94%D7%A8%20%D7%A1%D7%99%D7%A0%D7%99.mp3',
       'audio', 'published', '{general}', 'בראשית', 15
WHERE NOT EXISTS (SELECT 1 FROM lessons WHERE series_id='d7a37161-18f4-49a6-adcc-d88a2d1fbc56' AND title='תולדות קרבת ה'' לאדם - ביציאת מצרים ובמתן תורה');

-- lesson_count sync (no trigger maintains it — checked pg_trigger)
UPDATE series s SET lesson_count = (SELECT count(*) FROM lessons l WHERE l.series_id = s.id AND l.status='published')
WHERE s.id IN ('6be34cb5-732f-5d08-9c13-852928f121db','d7a37161-18f4-49a6-adcc-d88a2d1fbc56')
  AND s.lesson_count IS DISTINCT FROM (SELECT count(*) FROM lessons l WHERE l.series_id = s.id AND l.status='published');

-- verification v4: expect 2 rows — בבל series lesson_count=2, תולדות=4; and the
-- תולדות order: 06241e7e(10) < L3(15) < 2eabd61b(20) < 868860e6(30)
SELECT id, title, lesson_count FROM series WHERE id IN ('6be34cb5-732f-5d08-9c13-852928f121db','d7a37161-18f4-49a6-adcc-d88a2d1fbc56');
SELECT title, sort_order FROM lessons WHERE series_id='d7a37161-18f4-49a6-adcc-d88a2d1fbc56' ORDER BY sort_order;
SELECT title, sort_order FROM lessons WHERE series_id='6be34cb5-732f-5d08-9c13-852928f121db' ORDER BY sort_order;

