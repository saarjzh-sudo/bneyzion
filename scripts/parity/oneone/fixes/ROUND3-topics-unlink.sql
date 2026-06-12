-- ============================================================================
-- ROUND3-topics-unlink.sql — bnei-zion 1:1 parity · topic-page EXTRAS unlink
-- Author: TOPICS-EXTRAS-UNLINK author (read-only scoping via sbq.py; this file
--         is EXECUTED BY THE ORCHESTRATOR, not by the author). 2026-06-12.
-- ----------------------------------------------------------------------------
-- GOAL: strict 1:1 between every themes-root topic page and its OLD-site topic
--   page. Removes 152 surplus lesson_topics links across 56 topics — lessons
--   that are LINKED to a topic but DO NOT appear on that topic's old page.
--   Lessons STAY ALIVE in their series; lesson_topics is a pure link table.
--   FULL BACKUP: lesson_topics_bak_oneone_20260612 (12,369 rows, taken 2026-06-12).
-- ----------------------------------------------------------------------------
-- METHOD (mirrors scripts/oneone_verify.py run_topics EXACTLY):
--   live set = lesson_topics JOIN lessons WHERE status='published'
--              AND ('general'=ANY(audience_tags) OR NOT 'teachers'=ANY(audience_tags))
--   old set  = old_topic_pages.json items[] WHERE type='lesson' (title_norm)
--   normalize_he = NFC -> strip niqqud[\u0591-\u05c7] -> strip quotes[׳״\"'`]
--                  -> [|–—-_,:;!?()\[\]{}<>./\\] -> space -> collapse ws -> lower
--   EXTRA    = a live lesson at an index BEYOND the old-title multiset multiplicity
--              (difflib.SequenceMatcher + Counter, order-preserving — same as verifier).
--              140 are duplicate-title surplus (title on old page but over-represented);
--               12 are genuine-new (title absent from the old page entirely).
-- ----------------------------------------------------------------------------
-- SAFETY — EXCLUDED from this delete (verified against live + ROUND1.sql):
--   * 9 ROUND1 §5 PINNED (lesson,topic) pairs for התשובה/נסים/חנ — 0 of them appear
--     in this delete set (pair-level check = 0 violations). The pinned topics are
--     already 1:1 (0 extras). NB the SEPARATE topics תשובה/ניסים are NOT pinned and
--     DO get their gap4-merge leftovers (sort_order >=1000) unlinked here.
--   * 9 live lessons whose title matches an old SERIES-card item (type='series') —
--     KEPT and flagged to yoav (series_topics lane, not a lesson-level extra).
--   * any extra within token-set overlap >=0.8 of a still-MISSING old lesson title
--     (ktiv variant) — KEPT; 0 such found in this set.
-- IDEMPOTENT: tuple-IN DELETE is a no-op on re-run once the rows are gone.
-- Predicted topic-page pass-rate (verifier mapping): 58/128 -> 103/128 (+45).
-- ============================================================================

-- ── PRE-SCOPE: how many of the 152 target (lesson_id,topic_id) pairs exist now
--    (expect 152 pre-apply, 0 after) ──
SELECT count(*) AS r3_pairs_to_delete FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('03011661-25dc-4f79-a7ac-6992c737dce8','8118697c-ccdf-4607-b48e-8afe6097f15e'), ('960b01dc-ddcc-49e8-a24d-545388f66d28','8118697c-ccdf-4607-b48e-8afe6097f15e'), ('7be2fd6f-fc9c-4738-96c6-72e96f2a35a9','8118697c-ccdf-4607-b48e-8afe6097f15e'), ('9f1a997c-fdab-4ca6-91f7-31815527f51b','8118697c-ccdf-4607-b48e-8afe6097f15e'), ('5f5a3389-b38f-4328-bc3e-84b96fd5f44a','8118697c-ccdf-4607-b48e-8afe6097f15e'), ('b73bee3e-73e1-444c-9ab8-b696337bd713','8118697c-ccdf-4607-b48e-8afe6097f15e'), 
  ('bea1d9f8-06fa-41c6-be65-df8e8ac08817','8118697c-ccdf-4607-b48e-8afe6097f15e'), ('508826f1-2582-44df-af9a-0bf7f8c15b27','8118697c-ccdf-4607-b48e-8afe6097f15e'), ('c1010001-0001-4000-8000-000000000160','8118697c-ccdf-4607-b48e-8afe6097f15e'), ('452de127-d7d2-47bb-983d-98c14eb1931d','8118697c-ccdf-4607-b48e-8afe6097f15e'), ('422e624a-5f76-4829-b37a-8a367cbd4bf4','8118697c-ccdf-4607-b48e-8afe6097f15e'), ('2e9355c2-c5f7-4766-a0e2-3c2b707c767c','8118697c-ccdf-4607-b48e-8afe6097f15e'), 
  ('6b53c9fe-3b1c-4c06-b4c6-103a7a023941','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'), ('50534f4c-99b5-4a84-b617-19389821fcf2','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'), ('5f5a3389-b38f-4328-bc3e-84b96fd5f44a','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'), ('5ad1feab-c4ec-474e-b8e7-3bd1948aa5f1','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'), ('54f8ddd4-ae21-4dc1-b044-6eee2be004bc','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'), ('4ac3a914-4113-47b2-9c11-3ed3ac85de65','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'), 
  ('03088e3f-8b94-4836-ae6b-9cf67b4b8dc7','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'), ('8cdfaba0-1610-42ed-80f0-5a3f06f31890','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'), ('b89764ff-9ca1-47f0-aa29-45416c4ac656','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'), ('8abc3b55-237b-46ae-9980-11fa6732376f','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'), ('2ad7e386-a7c4-4997-8464-c80e7d2fe8ce','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'), ('c00c2b73-0215-4013-9514-ca33f1ff04c8','bcfa9e3f-63a8-41ea-8199-065b88b5f24f'), 
  ('c6da80d4-6c96-4f45-ae0e-128006f220a9','bcfa9e3f-63a8-41ea-8199-065b88b5f24f'), ('d1a40f85-24c8-4bcc-987a-c9c171191727','bcfa9e3f-63a8-41ea-8199-065b88b5f24f'), ('fe78b8ff-5a93-48ac-83fb-ab7b8ca68fdc','bcfa9e3f-63a8-41ea-8199-065b88b5f24f'), ('f947ccc1-9c40-4025-b8e1-2cfb493d94e5','bcfa9e3f-63a8-41ea-8199-065b88b5f24f'), ('5f5a3389-b38f-4328-bc3e-84b96fd5f44a','bcfa9e3f-63a8-41ea-8199-065b88b5f24f'), ('871be7f4-4ea6-4b4f-ac21-47ceac968908','bcfa9e3f-63a8-41ea-8199-065b88b5f24f'), 
  ('2cb0f3af-4463-4974-bca9-805d94bc2789','a42f9db6-6e3b-4df6-9f22-609df0bfb943'), ('62b1eaa7-5a65-47ea-becb-8659f85faa55','a42f9db6-6e3b-4df6-9f22-609df0bfb943'), ('4508b0c4-efe2-47ca-9cce-08405e5aa9e4','a42f9db6-6e3b-4df6-9f22-609df0bfb943'), ('906a425d-49cc-4b0e-acc3-6fe9f7dc6711','a42f9db6-6e3b-4df6-9f22-609df0bfb943'), ('d0d126ec-8bed-4491-8c2e-1f2a76f65421','a42f9db6-6e3b-4df6-9f22-609df0bfb943'), ('f2010000-0001-4000-8000-000000000251','a42f9db6-6e3b-4df6-9f22-609df0bfb943'), 
  ('c0ce3b3e-b66a-48cf-89cf-336e85567c79','a42f9db6-6e3b-4df6-9f22-609df0bfb943'), ('d002dfd9-1e63-49ee-a940-9b74bf9c72c8','af0762d4-3f18-4391-81b0-bf97dee16931'), ('bce61d03-536b-41e8-8c06-bc24d5330598','af0762d4-3f18-4391-81b0-bf97dee16931'), ('d8ba20a8-fa1f-41ff-8067-595f44e38d61','af0762d4-3f18-4391-81b0-bf97dee16931'), ('c0a70171-ff04-4e22-b708-bd6082068b81','af0762d4-3f18-4391-81b0-bf97dee16931'), ('9afe735f-dfa8-4b2f-a329-22ef9e285c64','af0762d4-3f18-4391-81b0-bf97dee16931'), 
  ('b9971823-6a1d-415a-b633-0ff44e5900ca','af0762d4-3f18-4391-81b0-bf97dee16931'), ('ec9a7af1-7333-4386-b113-f0ff721378a0','64362bbf-afdf-4b78-a3c0-551de9671480'), ('a9c41f80-4e95-433c-a1fd-68ae7fb9dbb3','64362bbf-afdf-4b78-a3c0-551de9671480'), ('a4ae27b8-f56e-4bfe-8c7e-995eb17b4659','64362bbf-afdf-4b78-a3c0-551de9671480'), ('e9848b1c-1c72-4fb1-80f6-e3d020e11993','64362bbf-afdf-4b78-a3c0-551de9671480'), ('34a4fd49-dd3b-4510-97e7-4947bbe4ec4f','64362bbf-afdf-4b78-a3c0-551de9671480'), 
  ('bb5417a1-7597-4c3d-86ce-e3a6572b0673','64362bbf-afdf-4b78-a3c0-551de9671480'), ('504e17e7-d17a-4d3f-b674-e7640b4b0d41','3c03af46-8e01-400b-a46a-24d2b812893c'), ('5111a8c2-67d2-43a3-81d4-0b8025449fc9','3c03af46-8e01-400b-a46a-24d2b812893c'), ('f49c6d76-3cd0-434c-a915-87ab0358c232','3c03af46-8e01-400b-a46a-24d2b812893c'), ('a2f1f31c-6c7c-4416-b1bc-5a183db457b2','3c03af46-8e01-400b-a46a-24d2b812893c'), ('f4d8e70e-6401-45c0-8805-40693c9e8c13','3c03af46-8e01-400b-a46a-24d2b812893c'), 
  ('68ff72ba-0183-4265-b327-81af7d08c2c2','ad056506-c07d-48ee-beb9-0b8f3bbcf34a'), ('c0bc6bd5-905d-4ec1-9e0e-3808be448284','ad056506-c07d-48ee-beb9-0b8f3bbcf34a'), ('50924211-5d36-4976-aeac-5309fc636c5c','ad056506-c07d-48ee-beb9-0b8f3bbcf34a'), ('5b4f2ceb-609c-494a-aa5c-4979c04f307d','ad056506-c07d-48ee-beb9-0b8f3bbcf34a'), ('ceb6953a-dd8e-4da4-b27f-96531c1c2573','ad056506-c07d-48ee-beb9-0b8f3bbcf34a'), ('422e624a-5f76-4829-b37a-8a367cbd4bf4','dee7dca0-baeb-44f5-b7eb-dd16f9c883c4'), 
  ('9fc72626-7a39-4fda-bfe6-4c5762c707a3','dee7dca0-baeb-44f5-b7eb-dd16f9c883c4'), ('077dfcad-2aed-407d-9e63-3981315551d7','dee7dca0-baeb-44f5-b7eb-dd16f9c883c4'), ('cd7ee3b5-e44a-4910-aff4-8d15a8ac95fd','dee7dca0-baeb-44f5-b7eb-dd16f9c883c4'), ('fb84d932-e15f-4693-8c41-b6c35b9bfbd9','dee7dca0-baeb-44f5-b7eb-dd16f9c883c4'), ('504e17e7-d17a-4d3f-b674-e7640b4b0d41','f2404dfa-29b5-46b9-a5e0-6775f34073ee'), ('fc2d0014-0bf9-4019-bed8-fac6877561a6','f2404dfa-29b5-46b9-a5e0-6775f34073ee'), 
  ('5e2d6d29-951c-4afc-87fe-869ea3353b91','f2404dfa-29b5-46b9-a5e0-6775f34073ee'), ('71fd2feb-2f6a-4b9c-9749-c314d4632257','f2404dfa-29b5-46b9-a5e0-6775f34073ee'), ('c3d40001-0003-4000-8000-000000000004','f2404dfa-29b5-46b9-a5e0-6775f34073ee'), ('7b23c20f-cfd1-4660-815e-9be73b20f212','81822c01-2b56-4d02-af28-203d6e18ada1'), ('8a254b5c-358f-4886-99c4-a12f62443cab','81822c01-2b56-4d02-af28-203d6e18ada1'), ('81956003-e838-4e56-b44f-2383086e0c72','81822c01-2b56-4d02-af28-203d6e18ada1'), 
  ('104104d5-d8d6-4eca-89cb-66727f6e1f4b','81822c01-2b56-4d02-af28-203d6e18ada1'), ('7ed7d21b-cfbf-4cba-85c3-edc828a858eb','f0e1801e-e9c3-41b3-8d94-0786733643c2'), ('d1d7fcad-6839-40b4-85b5-7e2385c161c1','f0e1801e-e9c3-41b3-8d94-0786733643c2'), ('bed3ed84-71f6-4626-8408-0de17df1f3a6','f0e1801e-e9c3-41b3-8d94-0786733643c2'), ('09f906d6-52e3-4375-90c9-e583e6357b4c','f0e1801e-e9c3-41b3-8d94-0786733643c2'), ('018328d6-5b79-45bc-8744-2c79b3efad45','b5ddc44d-b351-4ddb-b445-e235ba5c097c'), 
  ('19e255dc-fe6f-48bf-bcd9-e5d6546ac1e3','b5ddc44d-b351-4ddb-b445-e235ba5c097c'), ('95456cbb-2fcc-44ec-b20c-a8c84bb05198','b5ddc44d-b351-4ddb-b445-e235ba5c097c'), ('a7c5301d-7ef1-4bed-838f-8a678312cdef','b5ddc44d-b351-4ddb-b445-e235ba5c097c'), ('bd669cc9-bd0e-4533-9ed1-0d41ca547834','d0f08877-0c59-414f-b5c3-29510499f6c4'), ('03088e3f-8b94-4836-ae6b-9cf67b4b8dc7','d0f08877-0c59-414f-b5c3-29510499f6c4'), ('cbdc70e8-488b-41bc-a046-16266a5da250','d0f08877-0c59-414f-b5c3-29510499f6c4'), 
  ('ec0de7f6-7607-4a18-80f9-b4db1b077eb2','d0f08877-0c59-414f-b5c3-29510499f6c4'), ('c3d40001-0003-4000-8000-000000000004','5362493f-f3c8-492d-883e-826c9a9ac1a1'), ('fc2d0014-0bf9-4019-bed8-fac6877561a6','5362493f-f3c8-492d-883e-826c9a9ac1a1'), ('79edb73a-8f26-409b-bd6e-95c493a8a989','5362493f-f3c8-492d-883e-826c9a9ac1a1'), ('4f3de659-6372-4647-a225-781dfe61630e','69c74afa-cdc4-4c55-b964-aaeab59918bf'), ('5c35d141-7850-4224-89ca-e30269a7bd25','69c74afa-cdc4-4c55-b964-aaeab59918bf'), 
  ('fea70588-aee3-414c-bf99-9d0f21be89ac','69c74afa-cdc4-4c55-b964-aaeab59918bf'), ('90ef06bf-c26b-40cc-b277-0bc68aa7cbd8','e06e2901-c18e-4476-a448-faaedb92bc30'), ('c00c2b73-0215-4013-9514-ca33f1ff04c8','e06e2901-c18e-4476-a448-faaedb92bc30'), ('f947ccc1-9c40-4025-b8e1-2cfb493d94e5','e06e2901-c18e-4476-a448-faaedb92bc30'), ('adf38220-b718-4347-88e4-2defcb071a6b','a56d182a-e73d-4f01-b75f-64653f4862be'), ('c0a70171-ff04-4e22-b708-bd6082068b81','a56d182a-e73d-4f01-b75f-64653f4862be'), 
  ('e41828fd-1c33-4d0a-b610-3f9212740210','a56d182a-e73d-4f01-b75f-64653f4862be'), ('c0932d6c-b0b8-461e-84bb-c809cfe5b025','09545fd1-7bfd-4aed-b8ae-11e666dc86e1'), ('cb2556b0-c2c2-48aa-b16b-3af2e8b59499','09545fd1-7bfd-4aed-b8ae-11e666dc86e1'), ('85bfa753-f919-4f86-bbe5-dfb7ffbc894d','09545fd1-7bfd-4aed-b8ae-11e666dc86e1'), ('c1010001-0001-4000-8000-000000000081','22938735-84bc-411d-9be2-2b399450fa73'), ('dd26c59f-950f-4242-a8fb-5baf86c55232','22938735-84bc-411d-9be2-2b399450fa73'), 
  ('6e5605ac-02de-4279-9efe-681de6bcf6ed','22938735-84bc-411d-9be2-2b399450fa73'), ('e0106cf5-be98-4c4b-a4c8-5c6031c61498','f4690adf-a787-42e6-8f55-7b7017d9ffc8'), ('4eb1fb99-65b3-4210-a436-cc54d0c65467','f4690adf-a787-42e6-8f55-7b7017d9ffc8'), ('d4040401-2001-4000-a000-000000000001','4b3a7f6d-e404-4577-8874-bd3d2ba895fc'), ('8c7c1725-82f4-4559-803c-ac15f220e62e','4b3a7f6d-e404-4577-8874-bd3d2ba895fc'), ('e5270b54-55df-4619-b5be-ef99a554c90b','ce599885-4cdf-4e8a-9bb6-180262c04d6e'), 
  ('81f92da4-e830-4e37-853c-15f5f9ccbe4c','ce599885-4cdf-4e8a-9bb6-180262c04d6e'), ('af7ae9f5-1be1-4ff9-a55e-2d67ae3e5344','7f689042-6d4b-42e8-abfc-46f92c319508'), ('850fa7ba-ef34-4f13-aba8-157de26fad7a','7f689042-6d4b-42e8-abfc-46f92c319508'), ('508826f1-2582-44df-af9a-0bf7f8c15b27','b1221c0b-bafa-41c9-b32b-fa167d3ad48c'), ('d90849c2-bd70-48dd-8472-74e0127c5b8e','b1221c0b-bafa-41c9-b32b-fa167d3ad48c'), ('921c610a-0b52-41b8-9003-617017e417b7','04894baf-a54c-4d25-b1ad-558967a5abac'), 
  ('dcc17620-b04e-4671-add3-e3b6de0d7e65','04894baf-a54c-4d25-b1ad-558967a5abac'), ('fc4c7591-86cb-4c6c-9f89-2730f4cddb75','ba5f05b6-c4f8-4234-97bd-f7bac2146354'), ('fb1c42b4-8219-4dde-990c-51a85b0087e1','ba5f05b6-c4f8-4234-97bd-f7bac2146354'), ('504e17e7-d17a-4d3f-b674-e7640b4b0d41','3ab4ead6-8d55-4958-901b-f7c08231aa28'), ('71fd2feb-2f6a-4b9c-9749-c314d4632257','3ab4ead6-8d55-4958-901b-f7c08231aa28'), ('c4ad8094-5450-47d7-b490-b0f80dafc05b','6d364030-5bf1-42db-b387-3749d9c4feda'), 
  ('60257e97-db1f-41b3-b585-f03e998e7855','6d364030-5bf1-42db-b387-3749d9c4feda'), ('3b4f6494-7c77-4cf4-95e8-efe0b092895b','1b015f32-2581-412f-a955-eb71bb4bbffd'), ('647e9801-0b90-472e-a358-72e9ace66ab2','1b015f32-2581-412f-a955-eb71bb4bbffd'), ('e8c037ab-72ea-441e-ab04-918d266c69c4','63387da1-d867-4ea4-a8e9-4ad74efb5597'), ('71fd2feb-2f6a-4b9c-9749-c314d4632257','63387da1-d867-4ea4-a8e9-4ad74efb5597'), ('6b53c9fe-3b1c-4c06-b4c6-103a7a023941','e708018f-22a8-4b84-9302-87df5dac5656'), 
  ('03088e3f-8b94-4836-ae6b-9cf67b4b8dc7','e708018f-22a8-4b84-9302-87df5dac5656'), ('207ec927-a443-4c6a-9240-f18052c004a4','1c4b4a22-adff-437e-84e0-472e76bbf0b8'), ('274b374f-60b3-4013-8db0-c1e884d77dd2','1c4b4a22-adff-437e-84e0-472e76bbf0b8'), ('f926559c-f2e0-467f-987d-dbf0d6e34585','4975bd6b-6ed5-4b77-a2d0-ebcd464432fa'), ('a7c5301d-7ef1-4bed-838f-8a678312cdef','726d9512-5baf-4e8c-90b2-ec45d1d2a3eb'), ('69a1eddc-1218-453a-ac2f-839fe9591f63','655ed7dd-dd71-415d-af5b-d7a5139f4024'), 
  ('e0106cf5-be98-4c4b-a4c8-5c6031c61498','1a134c5f-d007-4005-a2f9-62e030bec12b'), ('1cd5f66d-d958-4993-bc04-e6cd6a010da3','08514444-a7e9-441e-8126-f6926c3dd356'), ('d90849c2-bd70-48dd-8472-74e0127c5b8e','5040f749-cd5e-4dbd-9736-b60775586f22'), ('2ad7e386-a7c4-4997-8464-c80e7d2fe8ce','66085fa8-4355-4bd2-94b4-db1899d365a0'), ('62e22887-ff5c-43e8-8bf6-90bd85d559fa','17e5f023-d5aa-4b14-864a-02ed2974073e'), ('2cb0f3af-4463-4974-bca9-805d94bc2789','66776121-fea5-47a5-a884-ed8b92d415df'), 
  ('f04831a8-2d09-4546-a339-5c9ce881a022','f94c8d45-62c1-4728-8bd4-66d074ee026c'), ('60257e97-db1f-41b3-b585-f03e998e7855','353e8877-e1bd-4b56-9c46-86019fc78cda'), ('957576a6-d471-47bf-85af-ca8ccc3f3c9c','061a4c9f-e7d0-4f21-8218-b1b44fdf05d5'), ('6da9713f-5e3f-4c2b-8416-f2591b094bcc','671eb0e7-9a94-4be7-ac61-cfcb0018b3ba'), ('a05bbf3f-a457-4c98-acfd-34078baf643b','9f52fca3-a7c2-40b1-b576-47328cec54cc'), ('815ca4c5-8c61-4424-b6ef-868b1c89898d','db17c8bc-3801-4223-843c-fec88e26ca74'), 
  ('f5146e40-f75d-42c9-ae4b-097fc281fc41','01fa31aa-de58-44e0-b248-2866aea02157'), ('b30a8808-898e-4a39-a5da-22ba173e175c','79cf7ecb-f935-421c-8594-b5c00a9f9cde'), ('f4d8e70e-6401-45c0-8805-40693c9e8c13','d1d08e3d-657a-4492-85e7-2f5b96b5a858'), ('bb5417a1-7597-4c3d-86ce-e3a6572b0673','35c4b4ea-66a2-4d1b-aabb-70566f80c269'), ('54f8ddd4-ae21-4dc1-b044-6eee2be004bc','8c836bf6-29fd-4e3c-995c-5cd5549dbc9c'), ('75161c2c-95b9-4844-81e1-d2cb07efe937','29a532e0-b5b2-4c7e-9d42-79127a322380'), 
  ('5f5a3389-b38f-4328-bc3e-84b96fd5f44a','e85dd1a5-f899-4be5-bdfd-b1c4d65d1c33'), ('a48528cf-94c3-424e-a3dc-cca957e368cc','d139dbe5-edd7-4139-9960-064360da7b9d')
);

-- ── PRE-SCOPE: 9 ROUND1 §5 pins MUST be present (expect 9 pre AND post — untouched) ──
SELECT count(*) AS r3_pins_present FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('468f9d91-1316-5dca-b851-28c703342bb8','b65c04fe-8b7d-4701-9e1f-f0b8d04ab64b'), ('b2020201-0001-4000-8000-000000000007','b65c04fe-8b7d-4701-9e1f-f0b8d04ab64b'), ('b2020201-0001-4000-8000-000000000008','b65c04fe-8b7d-4701-9e1f-f0b8d04ab64b'), ('b2020201-0001-4000-8000-000000000017','b65c04fe-8b7d-4701-9e1f-f0b8d04ab64b'), ('b2020201-0001-4000-8000-000000000002','b65c04fe-8b7d-4701-9e1f-f0b8d04ab64b'), ('16086d17-dba6-5710-a477-058643bb5a78','a9bde238-d93d-4119-957b-36164eeeacb2'), 
  ('f480d8a7-0c26-5750-b1a6-1ea24e80d97c','a9bde238-d93d-4119-957b-36164eeeacb2'), ('95456cbb-2fcc-44ec-b20c-a8c84bb05198','a9bde238-d93d-4119-957b-36164eeeacb2'), ('63c4b4af-62bf-5f3d-88ba-86a719168294','592a69e0-bda4-44d2-a59e-c3632b6f3e0f')
);

-- ============================================================================
-- DELETE CHUNKS — one per topic, ordered by surplus size (worst first)
-- ============================================================================

-- ── גאולה · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=גאולה
--    old_lessons=53 · live_visible=65 · unlink=12 · keep=53 (still fails: order)
--    samples: "עיין חדש בחזון העצמות היבשות"; "ימות המשיח"; "התחיה והזיכרון שמעורבבים יחדיו"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('03011661-25dc-4f79-a7ac-6992c737dce8','8118697c-ccdf-4607-b48e-8afe6097f15e'),  -- עיין חדש בחזון העצמות היבשות [genuine-new]
  ('960b01dc-ddcc-49e8-a24d-545388f66d28','8118697c-ccdf-4607-b48e-8afe6097f15e'),  -- ימות המשיח [dup-title]
  ('7be2fd6f-fc9c-4738-96c6-72e96f2a35a9','8118697c-ccdf-4607-b48e-8afe6097f15e'),  -- התחיה והזיכרון שמעורבבים יחדיו [dup-title]
  ('9f1a997c-fdab-4ca6-91f7-31815527f51b','8118697c-ccdf-4607-b48e-8afe6097f15e'),  -- ישראל יודעי ד' נגאלים, גויים שכחי אלו-ה כלים [dup-title]
  ('5f5a3389-b38f-4328-bc3e-84b96fd5f44a','8118697c-ccdf-4607-b48e-8afe6097f15e'),  -- הפיכת הצומות לחגים - מדוע? [dup-title]
  ('b73bee3e-73e1-444c-9ab8-b696337bd713','8118697c-ccdf-4607-b48e-8afe6097f15e'),  -- גאולת ישראל ותקומתם [dup-title]
  ('bea1d9f8-06fa-41c6-be65-df8e8ac08817','8118697c-ccdf-4607-b48e-8afe6097f15e'),  -- ייחודו של עם ישראל [dup-title]
  ('508826f1-2582-44df-af9a-0bf7f8c15b27','8118697c-ccdf-4607-b48e-8afe6097f15e'),  -- מכות מצרים עוד לא תמו [dup-title]
  ('c1010001-0001-4000-8000-000000000160','8118697c-ccdf-4607-b48e-8afe6097f15e'),  -- הגאולה כבריאה חדשה [dup-title]
  ('452de127-d7d2-47bb-983d-98c14eb1931d','8118697c-ccdf-4607-b48e-8afe6097f15e'),  -- גאולת ישראל שלב אחר שלב [dup-title]
  ('422e624a-5f76-4829-b37a-8a367cbd4bf4','8118697c-ccdf-4607-b48e-8afe6097f15e'),  -- קידוש ד' שיהיה בקיבוץ הגלויות [dup-title]
  ('2e9355c2-c5f7-4766-a0e2-3c2b707c767c','8118697c-ccdf-4607-b48e-8afe6097f15e')   -- גאולת ישראל ממצרים [dup-title]
);

-- ── ימי העיון בתנ"ך · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=ימי העיון בתנ"ך
--    old_lessons=246 · live_visible=257 · unlink=11 · keep=246 (1:1 PASS)
--    samples: "משל הכרם בישעיהו ובתנ"ך"; "הנבואה בישראל"; "הפיכת הצומות לחגים - מדוע?"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('6b53c9fe-3b1c-4c06-b4c6-103a7a023941','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'),  -- משל הכרם בישעיהו ובתנ"ך [dup-title]
  ('50534f4c-99b5-4a84-b617-19389821fcf2','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'),  -- הנבואה בישראל [dup-title]
  ('5f5a3389-b38f-4328-bc3e-84b96fd5f44a','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'),  -- הפיכת הצומות לחגים - מדוע? [dup-title]
  ('5ad1feab-c4ec-474e-b8e7-3bd1948aa5f1','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'),  -- בתוך הגולה נפתחו השמים - הכיצד? [dup-title]
  ('54f8ddd4-ae21-4dc1-b044-6eee2be004bc','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'),  -- פלך של שתיקה - עוצמת השתיקה של רחל [dup-title]
  ('4ac3a914-4113-47b2-9c11-3ed3ac85de65','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'),  -- ארבעה הנביאים שהתנבאו באותו הפרק [dup-title]
  ('03088e3f-8b94-4836-ae6b-9cf67b4b8dc7','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'),  -- יוסף ואחיו [dup-title]
  ('8cdfaba0-1610-42ed-80f0-5a3f06f31890','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'),  -- האמת והשלום אהבו [dup-title]
  ('b89764ff-9ca1-47f0-aa29-45416c4ac656','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'),  -- מעמד הר הכרמל [dup-title]
  ('8abc3b55-237b-46ae-9980-11fa6732376f','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'),  -- אליהו בהר הכרמל [dup-title]
  ('2ad7e386-a7c4-4997-8464-c80e7d2fe8ce','f2e01ca3-5f8b-4b05-b857-cd39142da1b9')   -- הגניבה על ידי אבותינו הקדושים [dup-title]
);

-- ── חורבן בית המקדש · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=חורבן בית המקדש
--    old_lessons=19 · live_visible=26 · unlink=7 · keep=19 (1:1 PASS)
--    samples: "במה זכה ישעיהו שרוב נבואותיו הן נבואות נחמה?"; "פטירת אשת יחזקאל כמשל לחורבן בית המקדש"; "סיבות חורבן ירושלים"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('c00c2b73-0215-4013-9514-ca33f1ff04c8','bcfa9e3f-63a8-41ea-8199-065b88b5f24f'),  -- במה זכה ישעיהו שרוב נבואותיו הן נבואות נחמה? [dup-title]
  ('c6da80d4-6c96-4f45-ae0e-128006f220a9','bcfa9e3f-63a8-41ea-8199-065b88b5f24f'),  -- פטירת אשת יחזקאל כמשל לחורבן בית המקדש [dup-title]
  ('d1a40f85-24c8-4bcc-987a-c9c171191727','bcfa9e3f-63a8-41ea-8199-065b88b5f24f'),  -- סיבות חורבן ירושלים [dup-title]
  ('fe78b8ff-5a93-48ac-83fb-ab7b8ca68fdc','bcfa9e3f-63a8-41ea-8199-065b88b5f24f'),  -- נבוכדנצר מהסס לעלות על ירושלים [dup-title]
  ('f947ccc1-9c40-4025-b8e1-2cfb493d94e5','bcfa9e3f-63a8-41ea-8199-065b88b5f24f'),  -- שבע שאלות כלליות על "שבע דנחמתא" [dup-title]
  ('5f5a3389-b38f-4328-bc3e-84b96fd5f44a','bcfa9e3f-63a8-41ea-8199-065b88b5f24f'),  -- הפיכת הצומות לחגים - מדוע? [dup-title]
  ('871be7f4-4ea6-4b4f-ac21-47ceac968908','bcfa9e3f-63a8-41ea-8199-065b88b5f24f')   -- החורבן הגיע! [dup-title]
);

-- ── כהונה · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=כהונה
--    old_lessons=32 · live_visible=39 · unlink=7 · keep=32 (1:1 PASS)
--    samples: "בגדי הכהונה"; "תורתו ושיטתו של בית עלי"; "הריגת נוב עיר הכהנים"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('2cb0f3af-4463-4974-bca9-805d94bc2789','a42f9db6-6e3b-4df6-9f22-609df0bfb943'),  -- בגדי הכהונה [dup-title]
  ('62b1eaa7-5a65-47ea-becb-8659f85faa55','a42f9db6-6e3b-4df6-9f22-609df0bfb943'),  -- תורתו ושיטתו של בית עלי [dup-title]
  ('4508b0c4-efe2-47ca-9cce-08405e5aa9e4','a42f9db6-6e3b-4df6-9f22-609df0bfb943'),  -- הריגת נוב עיר הכהנים [dup-title]
  ('906a425d-49cc-4b0e-acc3-6fe9f7dc6711','a42f9db6-6e3b-4df6-9f22-609df0bfb943'),  -- התעלות כהני בית המקדש העתידי [dup-title]
  ('d0d126ec-8bed-4491-8c2e-1f2a76f65421','a42f9db6-6e3b-4df6-9f22-609df0bfb943'),  -- קידוש ה' בגלות הארון בפלשתים [dup-title]
  ('f2010000-0001-4000-8000-000000000251','a42f9db6-6e3b-4df6-9f22-609df0bfb943'),  -- שלוש דרכי הכהונה של בני אהרון [dup-title]
  ('c0ce3b3e-b66a-48cf-89cf-336e85567c79','a42f9db6-6e3b-4df6-9f22-609df0bfb943')   -- מבט רחב על חורבן שילה [dup-title]
);

-- ── מלכות · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=מלכות
--    old_lessons=38 · live_visible=46 · unlink=6 · keep=40 (still fails: series-card extras)
--    samples: "משיחת דוד והדרדרות ממלכת שאול"; "יסודות מלכות אבימלך"; "כיצד יתכן להרוג את מי שאינו מבצע את פקודת המלך?"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('d002dfd9-1e63-49ee-a940-9b74bf9c72c8','af0762d4-3f18-4391-81b0-bf97dee16931'),  -- משיחת דוד והדרדרות ממלכת שאול [dup-title]
  ('bce61d03-536b-41e8-8c06-bc24d5330598','af0762d4-3f18-4391-81b0-bf97dee16931'),  -- יסודות מלכות אבימלך [dup-title]
  ('d8ba20a8-fa1f-41ff-8067-595f44e38d61','af0762d4-3f18-4391-81b0-bf97dee16931'),  -- כיצד יתכן להרוג את מי שאינו מבצע את פקודת המלך? [dup-title]
  ('c0a70171-ff04-4e22-b708-bd6082068b81','af0762d4-3f18-4391-81b0-bf97dee16931'),  -- מלחמה עם עמלק והדחת שאול מהמלוכה [dup-title]
  ('9afe735f-dfa8-4b2f-a329-22ef9e285c64','af0762d4-3f18-4391-81b0-bf97dee16931'),  -- דוד וגולית קריאת גולית תיגר על ישראל היא קריאת תיגר על  [dup-title]
  ('b9971823-6a1d-415a-b633-0ff44e5900ca','af0762d4-3f18-4391-81b0-bf97dee16931')   -- מה קורה כשאין מלכות בישראל? [dup-title]
);

-- ── נבואה · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=נבואה
--    old_lessons=36 · live_visible=42 · unlink=6 · keep=36 (1:1 PASS)
--    samples: "נבואת אמת מול התחזות נבואה, ותגובה על הניסיון לטשטש ביניהם"; ""אין שני נביאים מתנבאין בסיגנון אחד""; "פתיחה לנבואת יחזקאל"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('ec9a7af1-7333-4386-b113-f0ff721378a0','64362bbf-afdf-4b78-a3c0-551de9671480'),  -- נבואת אמת מול התחזות נבואה, ותגובה על הניסיון לטשטש בינ [dup-title]
  ('a9c41f80-4e95-433c-a1fd-68ae7fb9dbb3','64362bbf-afdf-4b78-a3c0-551de9671480'),  -- "אין שני נביאים מתנבאין בסיגנון אחד" [dup-title]
  ('a4ae27b8-f56e-4bfe-8c7e-995eb17b4659','64362bbf-afdf-4b78-a3c0-551de9671480'),  -- פתיחה לנבואת יחזקאל [dup-title]
  ('e9848b1c-1c72-4fb1-80f6-e3d020e11993','64362bbf-afdf-4b78-a3c0-551de9671480'),  -- ההתנגדויות לירמיהו [dup-title]
  ('34a4fd49-dd3b-4510-97e7-4947bbe4ec4f','64362bbf-afdf-4b78-a3c0-551de9671480'),  -- שמואל מקבל נבואה [dup-title]
  ('bb5417a1-7597-4c3d-86ce-e3a6572b0673','64362bbf-afdf-4b78-a3c0-551de9671480')   -- ירמיהו מול חנניה בן עזור נביא השקר [dup-title]
);

-- ── ארץ ישראל · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=ארץ ישראל
--    old_lessons=34 · live_visible=37 · unlink=5 · keep=32 (still fails: missing lessons)
--    samples: "מהי בעצם ברית בין הבתרים?"; "גבולות הארץ 2 שלבים"; "משמעות הכניסה לארץ ישראל"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('504e17e7-d17a-4d3f-b674-e7640b4b0d41','3c03af46-8e01-400b-a46a-24d2b812893c'),  -- מהי בעצם ברית בין הבתרים? [genuine-new]
  ('5111a8c2-67d2-43a3-81d4-0b8025449fc9','3c03af46-8e01-400b-a46a-24d2b812893c'),  -- גבולות הארץ 2 שלבים [genuine-new]
  ('f49c6d76-3cd0-434c-a915-87ab0358c232','3c03af46-8e01-400b-a46a-24d2b812893c'),  -- משמעות הכניסה לארץ ישראל [dup-title]
  ('a2f1f31c-6c7c-4416-b1bc-5a183db457b2','3c03af46-8e01-400b-a46a-24d2b812893c'),  -- גבולות הארץ הקצר [dup-title]
  ('f4d8e70e-6401-45c0-8805-40693c9e8c13','3c03af46-8e01-400b-a46a-24d2b812893c')   -- השוואות בין ההכנות לכניסה לארץ לבין ההכנות למתן תורה [dup-title]
);

-- ── בית המקדש השלישי · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=בית המקדש השלישי
--    old_lessons=7 · live_visible=12 · unlink=5 · keep=7 (1:1 PASS)
--    samples: "היחיד שיכנס בשער המזרחי"; "עבודת הכוהנים בבית המקדש השלישי"; "תיאור בית המקדש השלישי"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('68ff72ba-0183-4265-b327-81af7d08c2c2','ad056506-c07d-48ee-beb9-0b8f3bbcf34a'),  -- היחיד שיכנס בשער המזרחי [dup-title]
  ('c0bc6bd5-905d-4ec1-9e0e-3808be448284','ad056506-c07d-48ee-beb9-0b8f3bbcf34a'),  -- עבודת הכוהנים בבית המקדש השלישי [dup-title]
  ('50924211-5d36-4976-aeac-5309fc636c5c','ad056506-c07d-48ee-beb9-0b8f3bbcf34a'),  -- תיאור בית המקדש השלישי [dup-title]
  ('5b4f2ceb-609c-494a-aa5c-4979c04f307d','ad056506-c07d-48ee-beb9-0b8f3bbcf34a'),  -- תאור בית המקדש השלישי [dup-title]
  ('ceb6953a-dd8e-4da4-b27f-96531c1c2573','ad056506-c07d-48ee-beb9-0b8f3bbcf34a')   -- מידות בית המקדש והעיר [dup-title]
);

-- ── גלות · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=גלות
--    old_lessons=19 · live_visible=24 · unlink=5 · keep=19 (1:1 PASS)
--    samples: "קידוש ד' שיהיה בקיבוץ הגלויות"; "הביטחון בה' גם בגלות"; "גלות השכינה"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('422e624a-5f76-4829-b37a-8a367cbd4bf4','dee7dca0-baeb-44f5-b7eb-dd16f9c883c4'),  -- קידוש ד' שיהיה בקיבוץ הגלויות [dup-title]
  ('9fc72626-7a39-4fda-bfe6-4c5762c707a3','dee7dca0-baeb-44f5-b7eb-dd16f9c883c4'),  -- הביטחון בה' גם בגלות [dup-title]
  ('077dfcad-2aed-407d-9e63-3981315551d7','dee7dca0-baeb-44f5-b7eb-dd16f9c883c4'),  -- גלות השכינה [dup-title]
  ('cd7ee3b5-e44a-4910-aff4-8d15a8ac95fd','dee7dca0-baeb-44f5-b7eb-dd16f9c883c4'),  -- הכוונה האלוקית לשים את ירושלים לחרפה בגויים [dup-title]
  ('fb84d932-e15f-4693-8c41-b6c35b9bfbd9','dee7dca0-baeb-44f5-b7eb-dd16f9c883c4')   -- מראה דודאי התאנים [dup-title]
);

-- ── כריתת ברית · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=כריתת ברית
--    old_lessons=11 · live_visible=15 · unlink=5 · keep=10 (still fails: missing lessons)
--    samples: "מהי בעצם ברית בין הבתרים?"; "כריתת הברית להבדלות מהגויים והתעצלות בהספדו של יהושע"; "הברית בין הקב"ה ישראל"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('504e17e7-d17a-4d3f-b674-e7640b4b0d41','f2404dfa-29b5-46b9-a5e0-6775f34073ee'),  -- מהי בעצם ברית בין הבתרים? [genuine-new]
  ('fc2d0014-0bf9-4019-bed8-fac6877561a6','f2404dfa-29b5-46b9-a5e0-6775f34073ee'),  -- כריתת הברית להבדלות מהגויים והתעצלות בהספדו של יהושע [dup-title]
  ('5e2d6d29-951c-4afc-87fe-869ea3353b91','f2404dfa-29b5-46b9-a5e0-6775f34073ee'),  -- הברית בין הקב"ה ישראל [dup-title]
  ('71fd2feb-2f6a-4b9c-9749-c314d4632257','f2404dfa-29b5-46b9-a5e0-6775f34073ee'),  -- הברית על השבת [dup-title]
  ('c3d40001-0003-4000-8000-000000000004','f2404dfa-29b5-46b9-a5e0-6775f34073ee')   -- מעבר הירדן [dup-title]
);

-- ── משכן שילה · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=משכן שילה
--    old_lessons=7 · live_visible=11 · unlink=4 · keep=7 (1:1 PASS)
--    samples: "מדוע נבחרה דווקא שילה?"; "שבט יוסף, הרחבת החיים החומריים בארץ ישראל, ומשכן שילה כמרכז "; "מהותו של משכן שילה"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('7b23c20f-cfd1-4660-815e-9be73b20f212','81822c01-2b56-4d02-af28-203d6e18ada1'),  -- מדוע נבחרה דווקא שילה? [dup-title]
  ('8a254b5c-358f-4886-99c4-a12f62443cab','81822c01-2b56-4d02-af28-203d6e18ada1'),  -- שבט יוסף, הרחבת החיים החומריים בארץ ישראל, ומשכן שילה כ [dup-title]
  ('81956003-e838-4e56-b44f-2383086e0c72','81822c01-2b56-4d02-af28-203d6e18ada1'),  -- מהותו של משכן שילה [dup-title]
  ('104104d5-d8d6-4eca-89cb-66727f6e1f4b','81822c01-2b56-4d02-af28-203d6e18ada1')   -- משכן שילה, נחלות רוב השבטים, שילוח בני גד וראובן [dup-title]
);

-- ── נזיר · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=נזיר
--    old_lessons=10 · live_visible=14 · unlink=4 · keep=10 (1:1 PASS)
--    samples: "מדוע ציוה ד' ששמשון יהיה נזיר?"; "נזירות שמשון ולחי החמור"; "המשך הביאור על נזיר ועל תפילה"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('7ed7d21b-cfbf-4cba-85c3-edc828a858eb','f0e1801e-e9c3-41b3-8d94-0786733643c2'),  -- מדוע ציוה ד' ששמשון יהיה נזיר? [dup-title]
  ('d1d7fcad-6839-40b4-85b5-7e2385c161c1','f0e1801e-e9c3-41b3-8d94-0786733643c2'),  -- נזירות שמשון ולחי החמור [dup-title]
  ('bed3ed84-71f6-4626-8408-0de17df1f3a6','f0e1801e-e9c3-41b3-8d94-0786733643c2'),  -- המשך הביאור על נזיר ועל תפילה [dup-title]
  ('09f906d6-52e3-4375-90c9-e583e6357b4c','f0e1801e-e9c3-41b3-8d94-0786733643c2')   -- נזיר מבטן [dup-title]
);

-- ── ניסים · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=ניסים
--    old_lessons=2 · live_visible=6 · unlink=4 · keep=2 (1:1 PASS)
--    samples: ""למען הרבות מופתי""; "נס וטבע בקריעת ים סוף"; "נסיעת הארון ומעבר הירדן"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('018328d6-5b79-45bc-8744-2c79b3efad45','b5ddc44d-b351-4ddb-b445-e235ba5c097c'),  -- "למען הרבות מופתי" [genuine-new]
  ('19e255dc-fe6f-48bf-bcd9-e5d6546ac1e3','b5ddc44d-b351-4ddb-b445-e235ba5c097c'),  -- נס וטבע בקריעת ים סוף [genuine-new]
  ('95456cbb-2fcc-44ec-b20c-a8c84bb05198','b5ddc44d-b351-4ddb-b445-e235ba5c097c'),  -- נסיעת הארון ומעבר הירדן [genuine-new]
  ('a7c5301d-7ef1-4bed-838f-8a678312cdef','b5ddc44d-b351-4ddb-b445-e235ba5c097c')   -- נסיעת הארון ומעבר הירדן [genuine-new]
);

-- ── שבטים · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=שבטים
--    old_lessons=17 · live_visible=21 · unlink=4 · keep=17 (1:1 PASS)
--    samples: "נחלת בנימין המאחדת"; "יוסף ואחיו"; "חלוקת הארץ לשבטים - תכונת הנחישות והחלוציות של ראובן גד וחצי"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('bd669cc9-bd0e-4533-9ed1-0d41ca547834','d0f08877-0c59-414f-b5c3-29510499f6c4'),  -- נחלת בנימין המאחדת [dup-title]
  ('03088e3f-8b94-4836-ae6b-9cf67b4b8dc7','d0f08877-0c59-414f-b5c3-29510499f6c4'),  -- יוסף ואחיו [dup-title]
  ('cbdc70e8-488b-41bc-a046-16266a5da250','d0f08877-0c59-414f-b5c3-29510499f6c4'),  -- חלוקת הארץ לשבטים - תכונת הנחישות והחלוציות של ראובן גד [dup-title]
  ('ec0de7f6-7607-4a18-80f9-b4db1b077eb2','d0f08877-0c59-414f-b5c3-29510499f6c4')   -- נחלות שבטי שמעון, זבולון וישכר ותכונותיהם [dup-title]
);

-- ── יהושע בן נון · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=יהושע בן נון
--    old_lessons=6 · live_visible=9 · unlink=3 · keep=6 (1:1 PASS)
--    samples: "מעבר הירדן"; "כריתת הברית להבדלות מהגויים והתעצלות בהספדו של יהושע"; "האם הספידו את יהושע?"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('c3d40001-0003-4000-8000-000000000004','5362493f-f3c8-492d-883e-826c9a9ac1a1'),  -- מעבר הירדן [dup-title]
  ('fc2d0014-0bf9-4019-bed8-fac6877561a6','5362493f-f3c8-492d-883e-826c9a9ac1a1'),  -- כריתת הברית להבדלות מהגויים והתעצלות בהספדו של יהושע [dup-title]
  ('79edb73a-8f26-409b-bd6e-95c493a8a989','5362493f-f3c8-492d-883e-826c9a9ac1a1')   -- האם הספידו את יהושע? [dup-title]
);

-- ── ירושלים · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=ירושלים
--    old_lessons=28 · live_visible=30 · unlink=3 · keep=27 (still fails: missing lessons)
--    samples: ""המקום אשר יבחר ד'""; ""וְדִרְשוּ את שלום העיר אשר הגליתי אתכם שָמָּה,  והתפללו בעד"; "שם העיר ירושלים"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('4f3de659-6372-4647-a225-781dfe61630e','69c74afa-cdc4-4c55-b964-aaeab59918bf'),  -- "המקום אשר יבחר ד'" [dup-title]
  ('5c35d141-7850-4224-89ca-e30269a7bd25','69c74afa-cdc4-4c55-b964-aaeab59918bf'),  -- "וְדִרְשוּ את שלום העיר אשר הגליתי אתכם שָמָּה,  והתפלל [dup-title]
  ('fea70588-aee3-414c-bf99-9d0f21be89ac','69c74afa-cdc4-4c55-b964-aaeab59918bf')   -- שם העיר ירושלים [dup-title]
);

-- ── ישעיהו · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=ישעיהו
--    old_lessons=4 · live_visible=7 · unlink=3 · keep=4 (1:1 PASS)
--    samples: "נבואות המינוי של ישעיהו, ירמיהו ויחזקאל"; "במה זכה ישעיהו שרוב נבואותיו הן נבואות נחמה?"; "שבע שאלות כלליות על "שבע דנחמתא""
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('90ef06bf-c26b-40cc-b277-0bc68aa7cbd8','e06e2901-c18e-4476-a448-faaedb92bc30'),  -- נבואות המינוי של ישעיהו, ירמיהו ויחזקאל [dup-title]
  ('c00c2b73-0215-4013-9514-ca33f1ff04c8','e06e2901-c18e-4476-a448-faaedb92bc30'),  -- במה זכה ישעיהו שרוב נבואותיו הן נבואות נחמה? [dup-title]
  ('f947ccc1-9c40-4025-b8e1-2cfb493d94e5','e06e2901-c18e-4476-a448-faaedb92bc30')   -- שבע שאלות כלליות על "שבע דנחמתא" [dup-title]
);

-- ── מלחמה · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=מלחמה
--    old_lessons=10 · live_visible=13 · unlink=3 · keep=10 (1:1 PASS)
--    samples: "המלכת שאול מול כל העם והמלחמה עם עמון"; "מלחמה עם עמלק והדחת שאול מהמלוכה"; "אישיותו הנעלה של שאול"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('adf38220-b718-4347-88e4-2defcb071a6b','a56d182a-e73d-4f01-b75f-64653f4862be'),  -- המלכת שאול מול כל העם והמלחמה עם עמון [dup-title]
  ('c0a70171-ff04-4e22-b708-bd6082068b81','a56d182a-e73d-4f01-b75f-64653f4862be'),  -- מלחמה עם עמלק והדחת שאול מהמלוכה [dup-title]
  ('e41828fd-1c33-4d0a-b610-3f9212740210','a56d182a-e73d-4f01-b75f-64653f4862be')   -- אישיותו הנעלה של שאול [dup-title]
);

-- ── עבדות · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=עבדות
--    old_lessons=9 · live_visible=12 · unlink=3 · keep=9 (1:1 PASS)
--    samples: "העבדות לצורך החירות"; "תהליך שלם של חורבן"; ""עבדי הם""
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('c0932d6c-b0b8-461e-84bb-c809cfe5b025','09545fd1-7bfd-4aed-b8ae-11e666dc86e1'),  -- העבדות לצורך החירות [dup-title]
  ('cb2556b0-c2c2-48aa-b16b-3af2e8b59499','09545fd1-7bfd-4aed-b8ae-11e666dc86e1'),  -- תהליך שלם של חורבן [dup-title]
  ('85bfa753-f919-4f86-bbe5-dfb7ffbc894d','09545fd1-7bfd-4aed-b8ae-11e666dc86e1')   -- "עבדי הם" [dup-title]
);

-- ── קרבנות · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=קרבנות
--    old_lessons=26 · live_visible=29 · unlink=3 · keep=26 (1:1 PASS)
--    samples: "עבודת ה' על פי ציווי ה'"; "היחס בין הקרבנות לשקיעה בחטא"; "הקרבה רק מתוך הליכה בדרך ה'"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('c1010001-0001-4000-8000-000000000081','22938735-84bc-411d-9be2-2b399450fa73'),  -- עבודת ה' על פי ציווי ה' [dup-title]
  ('dd26c59f-950f-4242-a8fb-5baf86c55232','22938735-84bc-411d-9be2-2b399450fa73'),  -- היחס בין הקרבנות לשקיעה בחטא [dup-title]
  ('6e5605ac-02de-4279-9efe-681de6bcf6ed','22938735-84bc-411d-9be2-2b399450fa73')   -- הקרבה רק מתוך הליכה בדרך ה' [dup-title]
);

-- ── בית שני · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=בית שני
--    old_lessons=34 · live_visible=36 · unlink=2 · keep=34 (1:1 PASS)
--    samples: "איחוד שלושת המקדשים"; "עבודת הכוהנים בבית המקדש"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('e0106cf5-be98-4c4b-a4c8-5c6031c61498','f4690adf-a787-42e6-8f55-7b7017d9ffc8'),  -- איחוד שלושת המקדשים [dup-title]
  ('4eb1fb99-65b3-4210-a436-cc54d0c65467','f4690adf-a787-42e6-8f55-7b7017d9ffc8')   -- עבודת הכוהנים בבית המקדש [dup-title]
);

-- ── גוג ומגוג · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=גוג ומגוג
--    old_lessons=10 · live_visible=12 · unlink=2 · keep=10 (still fails: order)
--    samples: "עשרת העיקריים של מלחמת גוג ומגוג"; "מניעים למלחמת גוג ומגוג"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('d4040401-2001-4000-a000-000000000001','4b3a7f6d-e404-4577-8874-bd3d2ba895fc'),  -- עשרת העיקריים של מלחמת גוג ומגוג [genuine-new]
  ('8c7c1725-82f4-4559-803c-ac15f220e62e','4b3a7f6d-e404-4577-8874-bd3d2ba895fc')   -- מניעים למלחמת גוג ומגוג [dup-title]
);

-- ── דוד המלך · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=דוד המלך
--    old_lessons=54 · live_visible=57 · unlink=2 · keep=55 (still fails: series-card extras)
--    samples: "דוד ונבל"; "נדודי דוד"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('e5270b54-55df-4619-b5be-ef99a554c90b','ce599885-4cdf-4e8a-9bb6-180262c04d6e'),  -- דוד ונבל [dup-title]
  ('81f92da4-e830-4e37-853c-15f5f9ccbe4c','ce599885-4cdf-4e8a-9bb6-180262c04d6e')   -- נדודי דוד [dup-title]
);

-- ── חטא העגל · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=חטא העגל
--    old_lessons=6 · live_visible=8 · unlink=2 · keep=6 (1:1 PASS)
--    samples: "הקדמה לפסל מיכה - פסל לשם שמים"; "הסוד של פסל מיכה, חטא העגל ועגלי ירבעם"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('af7ae9f5-1be1-4ff9-a55e-2d67ae3e5344','7f689042-6d4b-42e8-abfc-46f92c319508'),  -- הקדמה לפסל מיכה - פסל לשם שמים [dup-title]
  ('850fa7ba-ef34-4f13-aba8-157de26fad7a','7f689042-6d4b-42e8-abfc-46f92c319508')   -- הסוד של פסל מיכה, חטא העגל ועגלי ירבעם [dup-title]
);

-- ── יציאת מצרים · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=יציאת מצרים
--    old_lessons=9 · live_visible=11 · unlink=2 · keep=9 (1:1 PASS)
--    samples: "מכות מצרים עוד לא תמו"; "יציאת מצרים בהקשר של היציאה מגן עדן"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('508826f1-2582-44df-af9a-0bf7f8c15b27','b1221c0b-bafa-41c9-b32b-fa167d3ad48c'),  -- מכות מצרים עוד לא תמו [dup-title]
  ('d90849c2-bd70-48dd-8472-74e0127c5b8e','b1221c0b-bafa-41c9-b32b-fa167d3ad48c')   -- יציאת מצרים בהקשר של היציאה מגן עדן [dup-title]
);

-- ── מצרים · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=מצרים
--    old_lessons=7 · live_visible=9 · unlink=2 · keep=7 (1:1 PASS)
--    samples: "מצרים = סכנה רוחנית"; "חורבן מצרים והעמים בנבואות ירמיהו"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('921c610a-0b52-41b8-9003-617017e417b7','04894baf-a54c-4d25-b1ad-558967a5abac'),  -- מצרים = סכנה רוחנית [dup-title]
  ('dcc17620-b04e-4671-add3-e3b6de0d7e65','04894baf-a54c-4d25-b1ad-558967a5abac')   -- חורבן מצרים והעמים בנבואות ירמיהו [dup-title]
);

-- ── פלשתים · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=פלשתים
--    old_lessons=7 · live_visible=9 · unlink=2 · keep=7 (1:1 PASS)
--    samples: "נזירותו וקדושתו של שמשון"; "תפקידו של שמשון משבט דן"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('fc4c7591-86cb-4c6c-9f89-2730f4cddb75','ba5f05b6-c4f8-4234-97bd-f7bac2146354'),  -- נזירותו וקדושתו של שמשון [dup-title]
  ('fb1c42b4-8219-4dde-990c-51a85b0087e1','ba5f05b6-c4f8-4234-97bd-f7bac2146354')   -- תפקידו של שמשון משבט דן [dup-title]
);

-- ── קיום ברית · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=קיום ברית
--    old_lessons=11 · live_visible=12 · unlink=2 · keep=10 (still fails: missing lessons)
--    samples: "מהי בעצם ברית בין הבתרים?"; "הברית על השבת"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('504e17e7-d17a-4d3f-b674-e7640b4b0d41','3ab4ead6-8d55-4958-901b-f7c08231aa28'),  -- מהי בעצם ברית בין הבתרים? [genuine-new]
  ('71fd2feb-2f6a-4b9c-9749-c314d4632257','3ab4ead6-8d55-4958-901b-f7c08231aa28')   -- הברית על השבת [dup-title]
);

-- ── קרבן פסח · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=קרבן פסח
--    old_lessons=12 · live_visible=14 · unlink=2 · keep=12 (1:1 PASS)
--    samples: "מהי "חרפת מצרים"?"; "פסח יאשיהו"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('c4ad8094-5450-47d7-b490-b0f80dafc05b','6d364030-5bf1-42db-b387-3749d9c4feda'),  -- מהי "חרפת מצרים"? [dup-title]
  ('60257e97-db1f-41b3-b585-f03e998e7855','6d364030-5bf1-42db-b387-3749d9c4feda')   -- פסח יאשיהו [dup-title]
);

-- ── שאול המלך · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=שאול המלך
--    old_lessons=15 · live_visible=18 · unlink=2 · keep=16 (still fails: series-card extras)
--    samples: "כמה שנים מלך שאול?"; "חסד עם בית יהונתן"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('3b4f6494-7c77-4cf4-95e8-efe0b092895b','1b015f32-2581-412f-a955-eb71bb4bbffd'),  -- כמה שנים מלך שאול? [dup-title]
  ('647e9801-0b90-472e-a358-72e9ace66ab2','1b015f32-2581-412f-a955-eb71bb4bbffd')   -- חסד עם בית יהונתן [dup-title]
);

-- ── שבת · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=שבת
--    old_lessons=8 · live_visible=10 · unlink=2 · keep=8 (1:1 PASS)
--    samples: "שמירת השבת"; "הברית על השבת"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('e8c037ab-72ea-441e-ab04-918d266c69c4','63387da1-d867-4ea4-a8e9-4ad74efb5597'),  -- שמירת השבת [dup-title]
  ('71fd2feb-2f6a-4b9c-9749-c314d4632257','63387da1-d867-4ea4-a8e9-4ad74efb5597')   -- הברית על השבת [dup-title]
);

-- ── שיעורים לנשים · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=שיעורים לנשים
--    old_lessons=25 · live_visible=27 · unlink=2 · keep=25 (1:1 PASS)
--    samples: "משל הכרם בישעיהו ובתנ"ך"; "יוסף ואחיו"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('6b53c9fe-3b1c-4c06-b4c6-103a7a023941','e708018f-22a8-4b84-9302-87df5dac5656'),  -- משל הכרם בישעיהו ובתנ"ך [dup-title]
  ('03088e3f-8b94-4836-ae6b-9cf67b4b8dc7','e708018f-22a8-4b84-9302-87df5dac5656')   -- יוסף ואחיו [dup-title]
);

-- ── תשובה · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=תשובה
--    old_lessons=8 · live_visible=10 · unlink=2 · keep=8 (1:1 PASS)
--    samples: "תשובה אמתית של האדם ותשובה לאומית"; "התשובה בספר יונה"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('207ec927-a443-4c6a-9240-f18052c004a4','1c4b4a22-adff-437e-84e0-472e76bbf0b8'),  -- תשובה אמתית של האדם ותשובה לאומית [genuine-new]
  ('274b374f-60b3-4013-8db0-c1e884d77dd2','1c4b4a22-adff-437e-84e0-472e76bbf0b8')   -- התשובה בספר יונה [genuine-new]
);

-- ── אליהו הנביא · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=אליהו הנביא
--    old_lessons=8 · live_visible=9 · unlink=1 · keep=8 (1:1 PASS)
--    samples: "מדוע היה אליה הנביא: "איש בעל שֵׂעָר, ואזור עור אזור במתניו""
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('f926559c-f2e0-467f-987d-dbf0d6e34585','4975bd6b-6ed5-4b77-a2d0-ebcd464432fa')   -- מדוע היה אליה הנביא: "איש בעל שֵׂעָר, ואזור עור אזור במ [dup-title]
);

-- ── ארון הברית · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=ארון הברית
--    old_lessons=16 · live_visible=16 · unlink=1 · keep=15 (still fails: missing lessons)
--    samples: "נסיעת הארון ומעבר הירדן"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('a7c5301d-7ef1-4bed-838f-8a678312cdef','726d9512-5baf-4e8c-90b2-ec45d1d2a3eb')   -- נסיעת הארון ומעבר הירדן [dup-title]
);

-- ── ביטחון ב-ד' · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=ביטחון ב-ד'
--    old_lessons=2 · live_visible=3 · unlink=1 · keep=2 (1:1 PASS)
--    samples: "הביטחון ב-ד' במובן האישי ובמובן הלאומי"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('69a1eddc-1218-453a-ac2f-839fe9591f63','655ed7dd-dd71-415d-af5b-d7a5139f4024')   -- הביטחון ב-ד' במובן האישי ובמובן הלאומי [dup-title]
);

-- ── בית המקדש · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=בית המקדש
--    old_lessons=37 · live_visible=38 · unlink=1 · keep=37 (1:1 PASS)
--    samples: "איחוד שלושת המקדשים"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('e0106cf5-be98-4c4b-a4c8-5c6031c61498','1a134c5f-d007-4005-a2f9-62e030bec12b')   -- איחוד שלושת המקדשים [dup-title]
);

-- ── ברית מילה · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=ברית מילה
--    old_lessons=7 · live_visible=8 · unlink=1 · keep=7 (1:1 PASS)
--    samples: "אחד היה אברהם"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('1cd5f66d-d958-4993-bc04-e6cd6a010da3','08514444-a7e9-441e-8126-f6926c3dd356')   -- אחד היה אברהם [dup-title]
);

-- ── גן עדן · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=גן עדן
--    old_lessons=1 · live_visible=2 · unlink=1 · keep=1 (1:1 PASS)
--    samples: "יציאת מצרים בהקשר של היציאה מגן עדן"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('d90849c2-bd70-48dd-8472-74e0127c5b8e','5040f749-cd5e-4dbd-9736-b60775586f22')   -- יציאת מצרים בהקשר של היציאה מגן עדן [dup-title]
);

-- ── האבות · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=האבות
--    old_lessons=4 · live_visible=5 · unlink=1 · keep=4 (1:1 PASS)
--    samples: "הגניבה על ידי אבותינו הקדושים"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('2ad7e386-a7c4-4997-8464-c80e7d2fe8ce','66085fa8-4355-4bd2-94b4-db1899d365a0')   -- הגניבה על ידי אבותינו הקדושים [dup-title]
);

-- ── הכניסה לארץ · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=הכניסה לארץ
--    old_lessons=5 · live_visible=6 · unlink=1 · keep=5 (1:1 PASS)
--    samples: "ברית מילה - זכותינו על ארץ ישראל"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('62e22887-ff5c-43e8-8bf6-90bd85d559fa','17e5f023-d5aa-4b14-864a-02ed2974073e')   -- ברית מילה - זכותינו על ארץ ישראל [dup-title]
);

-- ── המשכן וכליו · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=המשכן וכליו
--    old_lessons=25 · live_visible=26 · unlink=1 · keep=25 (1:1 PASS)
--    samples: "בגדי הכהונה"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('2cb0f3af-4463-4974-bca9-805d94bc2789','66776121-fea5-47a5-a884-ed8b92d415df')   -- בגדי הכהונה [dup-title]
);

-- ── הנביא והמלך · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=הנביא והמלך
--    old_lessons=4 · live_visible=5 · unlink=1 · keep=4 (1:1 PASS)
--    samples: "נבואה אישית לצדקיהו"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('f04831a8-2d09-4546-a339-5c9ce881a022','f94c8d45-62c1-4728-8bd4-66d074ee026c')   -- נבואה אישית לצדקיהו [dup-title]
);

-- ── יאשיהו · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=יאשיהו
--    old_lessons=3 · live_visible=4 · unlink=1 · keep=3 (1:1 PASS)
--    samples: "פסח יאשיהו"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('60257e97-db1f-41b3-b585-f03e998e7855','353e8877-e1bd-4b56-9c46-86019fc78cda')   -- פסח יאשיהו [dup-title]
);

-- ── יהושפט · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=יהושפט
--    old_lessons=7 · live_visible=8 · unlink=1 · keep=7 (1:1 PASS)
--    samples: "כיצד יתכן שיהושפט, המלך הצדיק, התחבר עם מלכי ישראל הרשעים?"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('957576a6-d471-47bf-85af-ca8ccc3f3c9c','061a4c9f-e7d0-4f21-8218-b1b44fdf05d5')   -- כיצד יתכן שיהושפט, המלך הצדיק, התחבר עם מלכי ישראל הרשע [dup-title]
);

-- ── יום העצמאות · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=יום העצמאות
--    old_lessons=2 · live_visible=3 · unlink=1 · keep=2 (1:1 PASS)
--    samples: "ספירת העומר ומזמור קז ליום העצמאות"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('6da9713f-5e3f-4c2b-8416-f2591b094bcc','671eb0e7-9a94-4be7-ac61-cfcb0018b3ba')   -- ספירת העומר ומזמור קז ליום העצמאות [dup-title]
);

-- ── ירמיהו · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=ירמיהו
--    old_lessons=3 · live_visible=4 · unlink=1 · keep=3 (1:1 PASS)
--    samples: "תפקידו של ירמיהו הנביא"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('a05bbf3f-a457-4c98-acfd-34078baf643b','9f52fca3-a7c2-40b1-b576-47328cec54cc')   -- תפקידו של ירמיהו הנביא [dup-title]
);

-- ── יתרו והקיני · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=יתרו והקיני
--    old_lessons=3 · live_visible=4 · unlink=1 · keep=3 (1:1 PASS)
--    samples: ""ובני קיני חֹתן משה עלו מעיר התמרים" - מה בא הפסוק ללמדנו?"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('815ca4c5-8c61-4424-b6ef-868b1c89898d','db17c8bc-3801-4223-843c-fec88e26ca74')   -- "ובני קיני חֹתן משה עלו מעיר התמרים" - מה בא הפסוק ללמד [dup-title]
);

-- ── כיבוש הארץ · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=כיבוש הארץ
--    old_lessons=9 · live_visible=10 · unlink=1 · keep=9 (1:1 PASS)
--    samples: ""מי יעלה לנו אל הכנעני בתחלה להלחם בו?""
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('f5146e40-f75d-42c9-ae4b-097fc281fc41','01fa31aa-de58-44e0-b248-2866aea02157')   -- "מי יעלה לנו אל הכנעני בתחלה להלחם בו?" [dup-title]
);

-- ── מעמד הר סיני · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=מעמד הר סיני
--    old_lessons=1 · live_visible=2 · unlink=1 · keep=1 (1:1 PASS)
--    samples: "נס מעבר הירדן ולקיחת האבנים"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('b30a8808-898e-4a39-a5da-22ba173e175c','79cf7ecb-f935-421c-8594-b5c00a9f9cde')   -- נס מעבר הירדן ולקיחת האבנים [dup-title]
);

-- ── מתן תורה · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=מתן תורה
--    old_lessons=21 · live_visible=22 · unlink=1 · keep=21 (1:1 PASS)
--    samples: "השוואות בין ההכנות לכניסה לארץ לבין ההכנות למתן תורה"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('f4d8e70e-6401-45c0-8805-40693c9e8c13','d1d08e3d-657a-4492-85e7-2f5b96b5a858')   -- השוואות בין ההכנות לכניסה לארץ לבין ההכנות למתן תורה [dup-title]
);

-- ── נביאי השקר · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=נביאי השקר
--    old_lessons=6 · live_visible=7 · unlink=1 · keep=6 (1:1 PASS)
--    samples: "ירמיהו מול חנניה בן עזור נביא השקר"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('bb5417a1-7597-4c3d-86ce-e3a6572b0673','35c4b4ea-66a2-4d1b-aabb-70566f80c269')   -- ירמיהו מול חנניה בן עזור נביא השקר [dup-title]
);

-- ── נשים בתנ"ך · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=נשים בתנ"ך
--    old_lessons=6 · live_visible=7 · unlink=1 · keep=6 (1:1 PASS)
--    samples: "פלך של שתיקה - עוצמת השתיקה של רחל"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('54f8ddd4-ae21-4dc1-b044-6eee2be004bc','8c836bf6-29fd-4e3c-995c-5cd5549dbc9c')   -- פלך של שתיקה - עוצמת השתיקה של רחל [dup-title]
);

-- ── עמי כנען · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=עמי כנען
--    old_lessons=7 · live_visible=8 · unlink=1 · keep=7 (1:1 PASS)
--    samples: "במה מתעסקת המלכות? ההבדל בין מלכות כנען לישראל"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('75161c2c-95b9-4844-81e1-d2cb07efe937','29a532e0-b5b2-4c7e-9d42-79127a322380')   -- במה מתעסקת המלכות? ההבדל בין מלכות כנען לישראל [dup-title]
);

-- ── צומות · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=צומות
--    old_lessons=3 · live_visible=4 · unlink=1 · keep=3 (1:1 PASS)
--    samples: "הפיכת הצומות לחגים - מדוע?"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('5f5a3389-b38f-4328-bc3e-84b96fd5f44a','e85dd1a5-f899-4be5-bdfd-b1c4d65d1c33')   -- הפיכת הצומות לחגים - מדוע? [dup-title]
);

-- ── שכר ועונש · old page: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/?subject=שכר ועונש
--    old_lessons=2 · live_visible=3 · unlink=1 · keep=2 (1:1 PASS)
--    samples: "קריאה לתשובה לעם ישראל"
DELETE FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('a48528cf-94c3-424e-a3dc-cca957e368cc','d139dbe5-edd7-4139-9960-064360da7b9d')   -- קריאה לתשובה לעם ישראל [dup-title]
);

-- ============================================================================
-- VERIFICATION (read-only proofs; run after apply)
-- ============================================================================
-- V1: all target pairs gone → expect 0
SELECT count(*) AS v1_pairs_remaining FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('03011661-25dc-4f79-a7ac-6992c737dce8','8118697c-ccdf-4607-b48e-8afe6097f15e'), ('960b01dc-ddcc-49e8-a24d-545388f66d28','8118697c-ccdf-4607-b48e-8afe6097f15e'), ('7be2fd6f-fc9c-4738-96c6-72e96f2a35a9','8118697c-ccdf-4607-b48e-8afe6097f15e'), ('9f1a997c-fdab-4ca6-91f7-31815527f51b','8118697c-ccdf-4607-b48e-8afe6097f15e'), ('5f5a3389-b38f-4328-bc3e-84b96fd5f44a','8118697c-ccdf-4607-b48e-8afe6097f15e'), ('b73bee3e-73e1-444c-9ab8-b696337bd713','8118697c-ccdf-4607-b48e-8afe6097f15e'), 
  ('bea1d9f8-06fa-41c6-be65-df8e8ac08817','8118697c-ccdf-4607-b48e-8afe6097f15e'), ('508826f1-2582-44df-af9a-0bf7f8c15b27','8118697c-ccdf-4607-b48e-8afe6097f15e'), ('c1010001-0001-4000-8000-000000000160','8118697c-ccdf-4607-b48e-8afe6097f15e'), ('452de127-d7d2-47bb-983d-98c14eb1931d','8118697c-ccdf-4607-b48e-8afe6097f15e'), ('422e624a-5f76-4829-b37a-8a367cbd4bf4','8118697c-ccdf-4607-b48e-8afe6097f15e'), ('2e9355c2-c5f7-4766-a0e2-3c2b707c767c','8118697c-ccdf-4607-b48e-8afe6097f15e'), 
  ('6b53c9fe-3b1c-4c06-b4c6-103a7a023941','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'), ('50534f4c-99b5-4a84-b617-19389821fcf2','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'), ('5f5a3389-b38f-4328-bc3e-84b96fd5f44a','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'), ('5ad1feab-c4ec-474e-b8e7-3bd1948aa5f1','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'), ('54f8ddd4-ae21-4dc1-b044-6eee2be004bc','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'), ('4ac3a914-4113-47b2-9c11-3ed3ac85de65','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'), 
  ('03088e3f-8b94-4836-ae6b-9cf67b4b8dc7','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'), ('8cdfaba0-1610-42ed-80f0-5a3f06f31890','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'), ('b89764ff-9ca1-47f0-aa29-45416c4ac656','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'), ('8abc3b55-237b-46ae-9980-11fa6732376f','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'), ('2ad7e386-a7c4-4997-8464-c80e7d2fe8ce','f2e01ca3-5f8b-4b05-b857-cd39142da1b9'), ('c00c2b73-0215-4013-9514-ca33f1ff04c8','bcfa9e3f-63a8-41ea-8199-065b88b5f24f'), 
  ('c6da80d4-6c96-4f45-ae0e-128006f220a9','bcfa9e3f-63a8-41ea-8199-065b88b5f24f'), ('d1a40f85-24c8-4bcc-987a-c9c171191727','bcfa9e3f-63a8-41ea-8199-065b88b5f24f'), ('fe78b8ff-5a93-48ac-83fb-ab7b8ca68fdc','bcfa9e3f-63a8-41ea-8199-065b88b5f24f'), ('f947ccc1-9c40-4025-b8e1-2cfb493d94e5','bcfa9e3f-63a8-41ea-8199-065b88b5f24f'), ('5f5a3389-b38f-4328-bc3e-84b96fd5f44a','bcfa9e3f-63a8-41ea-8199-065b88b5f24f'), ('871be7f4-4ea6-4b4f-ac21-47ceac968908','bcfa9e3f-63a8-41ea-8199-065b88b5f24f'), 
  ('2cb0f3af-4463-4974-bca9-805d94bc2789','a42f9db6-6e3b-4df6-9f22-609df0bfb943'), ('62b1eaa7-5a65-47ea-becb-8659f85faa55','a42f9db6-6e3b-4df6-9f22-609df0bfb943'), ('4508b0c4-efe2-47ca-9cce-08405e5aa9e4','a42f9db6-6e3b-4df6-9f22-609df0bfb943'), ('906a425d-49cc-4b0e-acc3-6fe9f7dc6711','a42f9db6-6e3b-4df6-9f22-609df0bfb943'), ('d0d126ec-8bed-4491-8c2e-1f2a76f65421','a42f9db6-6e3b-4df6-9f22-609df0bfb943'), ('f2010000-0001-4000-8000-000000000251','a42f9db6-6e3b-4df6-9f22-609df0bfb943'), 
  ('c0ce3b3e-b66a-48cf-89cf-336e85567c79','a42f9db6-6e3b-4df6-9f22-609df0bfb943'), ('d002dfd9-1e63-49ee-a940-9b74bf9c72c8','af0762d4-3f18-4391-81b0-bf97dee16931'), ('bce61d03-536b-41e8-8c06-bc24d5330598','af0762d4-3f18-4391-81b0-bf97dee16931'), ('d8ba20a8-fa1f-41ff-8067-595f44e38d61','af0762d4-3f18-4391-81b0-bf97dee16931'), ('c0a70171-ff04-4e22-b708-bd6082068b81','af0762d4-3f18-4391-81b0-bf97dee16931'), ('9afe735f-dfa8-4b2f-a329-22ef9e285c64','af0762d4-3f18-4391-81b0-bf97dee16931'), 
  ('b9971823-6a1d-415a-b633-0ff44e5900ca','af0762d4-3f18-4391-81b0-bf97dee16931'), ('ec9a7af1-7333-4386-b113-f0ff721378a0','64362bbf-afdf-4b78-a3c0-551de9671480'), ('a9c41f80-4e95-433c-a1fd-68ae7fb9dbb3','64362bbf-afdf-4b78-a3c0-551de9671480'), ('a4ae27b8-f56e-4bfe-8c7e-995eb17b4659','64362bbf-afdf-4b78-a3c0-551de9671480'), ('e9848b1c-1c72-4fb1-80f6-e3d020e11993','64362bbf-afdf-4b78-a3c0-551de9671480'), ('34a4fd49-dd3b-4510-97e7-4947bbe4ec4f','64362bbf-afdf-4b78-a3c0-551de9671480'), 
  ('bb5417a1-7597-4c3d-86ce-e3a6572b0673','64362bbf-afdf-4b78-a3c0-551de9671480'), ('504e17e7-d17a-4d3f-b674-e7640b4b0d41','3c03af46-8e01-400b-a46a-24d2b812893c'), ('5111a8c2-67d2-43a3-81d4-0b8025449fc9','3c03af46-8e01-400b-a46a-24d2b812893c'), ('f49c6d76-3cd0-434c-a915-87ab0358c232','3c03af46-8e01-400b-a46a-24d2b812893c'), ('a2f1f31c-6c7c-4416-b1bc-5a183db457b2','3c03af46-8e01-400b-a46a-24d2b812893c'), ('f4d8e70e-6401-45c0-8805-40693c9e8c13','3c03af46-8e01-400b-a46a-24d2b812893c'), 
  ('68ff72ba-0183-4265-b327-81af7d08c2c2','ad056506-c07d-48ee-beb9-0b8f3bbcf34a'), ('c0bc6bd5-905d-4ec1-9e0e-3808be448284','ad056506-c07d-48ee-beb9-0b8f3bbcf34a'), ('50924211-5d36-4976-aeac-5309fc636c5c','ad056506-c07d-48ee-beb9-0b8f3bbcf34a'), ('5b4f2ceb-609c-494a-aa5c-4979c04f307d','ad056506-c07d-48ee-beb9-0b8f3bbcf34a'), ('ceb6953a-dd8e-4da4-b27f-96531c1c2573','ad056506-c07d-48ee-beb9-0b8f3bbcf34a'), ('422e624a-5f76-4829-b37a-8a367cbd4bf4','dee7dca0-baeb-44f5-b7eb-dd16f9c883c4'), 
  ('9fc72626-7a39-4fda-bfe6-4c5762c707a3','dee7dca0-baeb-44f5-b7eb-dd16f9c883c4'), ('077dfcad-2aed-407d-9e63-3981315551d7','dee7dca0-baeb-44f5-b7eb-dd16f9c883c4'), ('cd7ee3b5-e44a-4910-aff4-8d15a8ac95fd','dee7dca0-baeb-44f5-b7eb-dd16f9c883c4'), ('fb84d932-e15f-4693-8c41-b6c35b9bfbd9','dee7dca0-baeb-44f5-b7eb-dd16f9c883c4'), ('504e17e7-d17a-4d3f-b674-e7640b4b0d41','f2404dfa-29b5-46b9-a5e0-6775f34073ee'), ('fc2d0014-0bf9-4019-bed8-fac6877561a6','f2404dfa-29b5-46b9-a5e0-6775f34073ee'), 
  ('5e2d6d29-951c-4afc-87fe-869ea3353b91','f2404dfa-29b5-46b9-a5e0-6775f34073ee'), ('71fd2feb-2f6a-4b9c-9749-c314d4632257','f2404dfa-29b5-46b9-a5e0-6775f34073ee'), ('c3d40001-0003-4000-8000-000000000004','f2404dfa-29b5-46b9-a5e0-6775f34073ee'), ('7b23c20f-cfd1-4660-815e-9be73b20f212','81822c01-2b56-4d02-af28-203d6e18ada1'), ('8a254b5c-358f-4886-99c4-a12f62443cab','81822c01-2b56-4d02-af28-203d6e18ada1'), ('81956003-e838-4e56-b44f-2383086e0c72','81822c01-2b56-4d02-af28-203d6e18ada1'), 
  ('104104d5-d8d6-4eca-89cb-66727f6e1f4b','81822c01-2b56-4d02-af28-203d6e18ada1'), ('7ed7d21b-cfbf-4cba-85c3-edc828a858eb','f0e1801e-e9c3-41b3-8d94-0786733643c2'), ('d1d7fcad-6839-40b4-85b5-7e2385c161c1','f0e1801e-e9c3-41b3-8d94-0786733643c2'), ('bed3ed84-71f6-4626-8408-0de17df1f3a6','f0e1801e-e9c3-41b3-8d94-0786733643c2'), ('09f906d6-52e3-4375-90c9-e583e6357b4c','f0e1801e-e9c3-41b3-8d94-0786733643c2'), ('018328d6-5b79-45bc-8744-2c79b3efad45','b5ddc44d-b351-4ddb-b445-e235ba5c097c'), 
  ('19e255dc-fe6f-48bf-bcd9-e5d6546ac1e3','b5ddc44d-b351-4ddb-b445-e235ba5c097c'), ('95456cbb-2fcc-44ec-b20c-a8c84bb05198','b5ddc44d-b351-4ddb-b445-e235ba5c097c'), ('a7c5301d-7ef1-4bed-838f-8a678312cdef','b5ddc44d-b351-4ddb-b445-e235ba5c097c'), ('bd669cc9-bd0e-4533-9ed1-0d41ca547834','d0f08877-0c59-414f-b5c3-29510499f6c4'), ('03088e3f-8b94-4836-ae6b-9cf67b4b8dc7','d0f08877-0c59-414f-b5c3-29510499f6c4'), ('cbdc70e8-488b-41bc-a046-16266a5da250','d0f08877-0c59-414f-b5c3-29510499f6c4'), 
  ('ec0de7f6-7607-4a18-80f9-b4db1b077eb2','d0f08877-0c59-414f-b5c3-29510499f6c4'), ('c3d40001-0003-4000-8000-000000000004','5362493f-f3c8-492d-883e-826c9a9ac1a1'), ('fc2d0014-0bf9-4019-bed8-fac6877561a6','5362493f-f3c8-492d-883e-826c9a9ac1a1'), ('79edb73a-8f26-409b-bd6e-95c493a8a989','5362493f-f3c8-492d-883e-826c9a9ac1a1'), ('4f3de659-6372-4647-a225-781dfe61630e','69c74afa-cdc4-4c55-b964-aaeab59918bf'), ('5c35d141-7850-4224-89ca-e30269a7bd25','69c74afa-cdc4-4c55-b964-aaeab59918bf'), 
  ('fea70588-aee3-414c-bf99-9d0f21be89ac','69c74afa-cdc4-4c55-b964-aaeab59918bf'), ('90ef06bf-c26b-40cc-b277-0bc68aa7cbd8','e06e2901-c18e-4476-a448-faaedb92bc30'), ('c00c2b73-0215-4013-9514-ca33f1ff04c8','e06e2901-c18e-4476-a448-faaedb92bc30'), ('f947ccc1-9c40-4025-b8e1-2cfb493d94e5','e06e2901-c18e-4476-a448-faaedb92bc30'), ('adf38220-b718-4347-88e4-2defcb071a6b','a56d182a-e73d-4f01-b75f-64653f4862be'), ('c0a70171-ff04-4e22-b708-bd6082068b81','a56d182a-e73d-4f01-b75f-64653f4862be'), 
  ('e41828fd-1c33-4d0a-b610-3f9212740210','a56d182a-e73d-4f01-b75f-64653f4862be'), ('c0932d6c-b0b8-461e-84bb-c809cfe5b025','09545fd1-7bfd-4aed-b8ae-11e666dc86e1'), ('cb2556b0-c2c2-48aa-b16b-3af2e8b59499','09545fd1-7bfd-4aed-b8ae-11e666dc86e1'), ('85bfa753-f919-4f86-bbe5-dfb7ffbc894d','09545fd1-7bfd-4aed-b8ae-11e666dc86e1'), ('c1010001-0001-4000-8000-000000000081','22938735-84bc-411d-9be2-2b399450fa73'), ('dd26c59f-950f-4242-a8fb-5baf86c55232','22938735-84bc-411d-9be2-2b399450fa73'), 
  ('6e5605ac-02de-4279-9efe-681de6bcf6ed','22938735-84bc-411d-9be2-2b399450fa73'), ('e0106cf5-be98-4c4b-a4c8-5c6031c61498','f4690adf-a787-42e6-8f55-7b7017d9ffc8'), ('4eb1fb99-65b3-4210-a436-cc54d0c65467','f4690adf-a787-42e6-8f55-7b7017d9ffc8'), ('d4040401-2001-4000-a000-000000000001','4b3a7f6d-e404-4577-8874-bd3d2ba895fc'), ('8c7c1725-82f4-4559-803c-ac15f220e62e','4b3a7f6d-e404-4577-8874-bd3d2ba895fc'), ('e5270b54-55df-4619-b5be-ef99a554c90b','ce599885-4cdf-4e8a-9bb6-180262c04d6e'), 
  ('81f92da4-e830-4e37-853c-15f5f9ccbe4c','ce599885-4cdf-4e8a-9bb6-180262c04d6e'), ('af7ae9f5-1be1-4ff9-a55e-2d67ae3e5344','7f689042-6d4b-42e8-abfc-46f92c319508'), ('850fa7ba-ef34-4f13-aba8-157de26fad7a','7f689042-6d4b-42e8-abfc-46f92c319508'), ('508826f1-2582-44df-af9a-0bf7f8c15b27','b1221c0b-bafa-41c9-b32b-fa167d3ad48c'), ('d90849c2-bd70-48dd-8472-74e0127c5b8e','b1221c0b-bafa-41c9-b32b-fa167d3ad48c'), ('921c610a-0b52-41b8-9003-617017e417b7','04894baf-a54c-4d25-b1ad-558967a5abac'), 
  ('dcc17620-b04e-4671-add3-e3b6de0d7e65','04894baf-a54c-4d25-b1ad-558967a5abac'), ('fc4c7591-86cb-4c6c-9f89-2730f4cddb75','ba5f05b6-c4f8-4234-97bd-f7bac2146354'), ('fb1c42b4-8219-4dde-990c-51a85b0087e1','ba5f05b6-c4f8-4234-97bd-f7bac2146354'), ('504e17e7-d17a-4d3f-b674-e7640b4b0d41','3ab4ead6-8d55-4958-901b-f7c08231aa28'), ('71fd2feb-2f6a-4b9c-9749-c314d4632257','3ab4ead6-8d55-4958-901b-f7c08231aa28'), ('c4ad8094-5450-47d7-b490-b0f80dafc05b','6d364030-5bf1-42db-b387-3749d9c4feda'), 
  ('60257e97-db1f-41b3-b585-f03e998e7855','6d364030-5bf1-42db-b387-3749d9c4feda'), ('3b4f6494-7c77-4cf4-95e8-efe0b092895b','1b015f32-2581-412f-a955-eb71bb4bbffd'), ('647e9801-0b90-472e-a358-72e9ace66ab2','1b015f32-2581-412f-a955-eb71bb4bbffd'), ('e8c037ab-72ea-441e-ab04-918d266c69c4','63387da1-d867-4ea4-a8e9-4ad74efb5597'), ('71fd2feb-2f6a-4b9c-9749-c314d4632257','63387da1-d867-4ea4-a8e9-4ad74efb5597'), ('6b53c9fe-3b1c-4c06-b4c6-103a7a023941','e708018f-22a8-4b84-9302-87df5dac5656'), 
  ('03088e3f-8b94-4836-ae6b-9cf67b4b8dc7','e708018f-22a8-4b84-9302-87df5dac5656'), ('207ec927-a443-4c6a-9240-f18052c004a4','1c4b4a22-adff-437e-84e0-472e76bbf0b8'), ('274b374f-60b3-4013-8db0-c1e884d77dd2','1c4b4a22-adff-437e-84e0-472e76bbf0b8'), ('f926559c-f2e0-467f-987d-dbf0d6e34585','4975bd6b-6ed5-4b77-a2d0-ebcd464432fa'), ('a7c5301d-7ef1-4bed-838f-8a678312cdef','726d9512-5baf-4e8c-90b2-ec45d1d2a3eb'), ('69a1eddc-1218-453a-ac2f-839fe9591f63','655ed7dd-dd71-415d-af5b-d7a5139f4024'), 
  ('e0106cf5-be98-4c4b-a4c8-5c6031c61498','1a134c5f-d007-4005-a2f9-62e030bec12b'), ('1cd5f66d-d958-4993-bc04-e6cd6a010da3','08514444-a7e9-441e-8126-f6926c3dd356'), ('d90849c2-bd70-48dd-8472-74e0127c5b8e','5040f749-cd5e-4dbd-9736-b60775586f22'), ('2ad7e386-a7c4-4997-8464-c80e7d2fe8ce','66085fa8-4355-4bd2-94b4-db1899d365a0'), ('62e22887-ff5c-43e8-8bf6-90bd85d559fa','17e5f023-d5aa-4b14-864a-02ed2974073e'), ('2cb0f3af-4463-4974-bca9-805d94bc2789','66776121-fea5-47a5-a884-ed8b92d415df'), 
  ('f04831a8-2d09-4546-a339-5c9ce881a022','f94c8d45-62c1-4728-8bd4-66d074ee026c'), ('60257e97-db1f-41b3-b585-f03e998e7855','353e8877-e1bd-4b56-9c46-86019fc78cda'), ('957576a6-d471-47bf-85af-ca8ccc3f3c9c','061a4c9f-e7d0-4f21-8218-b1b44fdf05d5'), ('6da9713f-5e3f-4c2b-8416-f2591b094bcc','671eb0e7-9a94-4be7-ac61-cfcb0018b3ba'), ('a05bbf3f-a457-4c98-acfd-34078baf643b','9f52fca3-a7c2-40b1-b576-47328cec54cc'), ('815ca4c5-8c61-4424-b6ef-868b1c89898d','db17c8bc-3801-4223-843c-fec88e26ca74'), 
  ('f5146e40-f75d-42c9-ae4b-097fc281fc41','01fa31aa-de58-44e0-b248-2866aea02157'), ('b30a8808-898e-4a39-a5da-22ba173e175c','79cf7ecb-f935-421c-8594-b5c00a9f9cde'), ('f4d8e70e-6401-45c0-8805-40693c9e8c13','d1d08e3d-657a-4492-85e7-2f5b96b5a858'), ('bb5417a1-7597-4c3d-86ce-e3a6572b0673','35c4b4ea-66a2-4d1b-aabb-70566f80c269'), ('54f8ddd4-ae21-4dc1-b044-6eee2be004bc','8c836bf6-29fd-4e3c-995c-5cd5549dbc9c'), ('75161c2c-95b9-4844-81e1-d2cb07efe937','29a532e0-b5b2-4c7e-9d42-79127a322380'), 
  ('5f5a3389-b38f-4328-bc3e-84b96fd5f44a','e85dd1a5-f899-4be5-bdfd-b1c4d65d1c33'), ('a48528cf-94c3-424e-a3dc-cca957e368cc','d139dbe5-edd7-4139-9960-064360da7b9d')
);

-- V2: 9 ROUND1 §5 pins untouched → expect 9
SELECT count(*) AS v2_pins_present FROM lesson_topics WHERE (lesson_id, topic_id) IN (
  ('468f9d91-1316-5dca-b851-28c703342bb8','b65c04fe-8b7d-4701-9e1f-f0b8d04ab64b'), ('b2020201-0001-4000-8000-000000000007','b65c04fe-8b7d-4701-9e1f-f0b8d04ab64b'), ('b2020201-0001-4000-8000-000000000008','b65c04fe-8b7d-4701-9e1f-f0b8d04ab64b'), ('b2020201-0001-4000-8000-000000000017','b65c04fe-8b7d-4701-9e1f-f0b8d04ab64b'), ('b2020201-0001-4000-8000-000000000002','b65c04fe-8b7d-4701-9e1f-f0b8d04ab64b'), ('16086d17-dba6-5710-a477-058643bb5a78','a9bde238-d93d-4119-957b-36164eeeacb2'), 
  ('f480d8a7-0c26-5750-b1a6-1ea24e80d97c','a9bde238-d93d-4119-957b-36164eeeacb2'), ('95456cbb-2fcc-44ec-b20c-a8c84bb05198','a9bde238-d93d-4119-957b-36164eeeacb2'), ('63c4b4af-62bf-5f3d-88ba-86a719168294','592a69e0-bda4-44d2-a59e-c3632b6f3e0f')
);

-- V3: post visible-published lesson count for the 15 worst topics
--     (replicates verifier audience filter) → expect each = keep value below:
--       גאולה = 53  (still fails: see report)
--       ימי העיון בתנ"ך = 246
--       חורבן בית המקדש = 19
--       כהונה = 32
--       מלכות = 40  (still fails: see report)
--       נבואה = 36
--       ארץ ישראל = 32  (still fails: see report)
--       בית המקדש השלישי = 7
--       גלות = 19
--       כריתת ברית = 10  (still fails: see report)
--       משכן שילה = 7
--       נזיר = 10
--       ניסים = 2
--       שבטים = 17
--       יהושע בן נון = 6
SELECT t.name, count(DISTINCT l.id) AS visible_published
FROM topics t
LEFT JOIN lesson_topics lt ON lt.topic_id = t.id
LEFT JOIN lessons l ON l.id = lt.lesson_id AND l.status='published'
  AND ('general' = ANY(l.audience_tags) OR NOT ('teachers' = ANY(l.audience_tags)))
WHERE t.id IN ('8118697c-ccdf-4607-b48e-8afe6097f15e','f2e01ca3-5f8b-4b05-b857-cd39142da1b9','bcfa9e3f-63a8-41ea-8199-065b88b5f24f','a42f9db6-6e3b-4df6-9f22-609df0bfb943','af0762d4-3f18-4391-81b0-bf97dee16931','64362bbf-afdf-4b78-a3c0-551de9671480','3c03af46-8e01-400b-a46a-24d2b812893c','ad056506-c07d-48ee-beb9-0b8f3bbcf34a','dee7dca0-baeb-44f5-b7eb-dd16f9c883c4','f2404dfa-29b5-46b9-a5e0-6775f34073ee','81822c01-2b56-4d02-af28-203d6e18ada1','f0e1801e-e9c3-41b3-8d94-0786733643c2','b5ddc44d-b351-4ddb-b445-e235ba5c097c','d0f08877-0c59-414f-b5c3-29510499f6c4','5362493f-f3c8-492d-883e-826c9a9ac1a1')
GROUP BY t.name ORDER BY count(DISTINCT l.id) DESC;

-- V4: grand total of links removed across all 56 topics → expect 152 fewer rows
--     (informational; compare lesson_topics rowcount to pre-apply 12,465)
SELECT count(*) AS lesson_topics_rows FROM lesson_topics;
