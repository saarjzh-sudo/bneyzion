-- ============================================================================
-- ROUND1.sql — bnei-zion 1:1 parity, round-1 data fixes
-- Author: round-1 data-fix author (read-only scoping via sbq.py; this file is
--         EXECUTED BY THE ORCHESTRATOR, not by the author).
-- Generated from fixes/round1_scope.json (scope_round1.py, 2026-06-12) built on:
--   reports/verify_results.json + VERIFY-REPORT.md (post-apply verification)
--   old_sidebar_tree.json, match/tree_map.json, plans/tree_plan.json (+tmp_map),
--   old_topics_sidebar.json, old_topic_pages.json, old_listings_*.json,
--   old_teachers_listings.json, old_rabbi_pages.json
-- Convention: series.sort_order 1..99 = sidebar band position; 0 = page-only;
--             >=100 = parked. Every statement here is IDEMPOTENT (guarded).
-- Each section starts with a scoping SELECT that reports how many rows the
-- section is about to change (0 on re-run).
-- ============================================================================

-- ============================================================================
-- §1 BAND HYGIENE — 70 children of tree-mapped sidebar parents that are NOT
--    old-sidebar nodes but currently sit inside the sidebar band (1..99).
--    These produce the 'extra' sidebar children under ישעיהו (10), ירמיהו (12),
--    יחזקאל (10), עובדיה (4), הפטרות books (16), יונה, דניאל (יאשיהו),
--    כלי-עזר (מפות עזר לתנ"ך), נושאים-כלליים depth-2 containers, ליווי-ת"תים/שופטים,
--    + 3 draft strays (אוסף-מקורות dup, פרקי-הסיום, לב-הפרק-מועדים).
--    Old-sidebar membership computed per parent from tree_map + tree_plan ops
--    (plan series_id overrides matcher) + tmp_map-resolved creates; aliases
--    ('כל השיעורים ב-X', code §2.4 alias_slots) excluded from membership.
--    tree_plan intended members keep their 1..99 — none of them is in this list.
-- ----------------------------------------------------------------------------
-- scope: rows this section will demote (expect 70 pre-apply, 0 after)
SELECT count(*) AS s1_to_demote FROM series
WHERE sort_order BETWEEN 1 AND 99 AND id IN (
  'e577cd74-43ae-49a4-a3d6-9a11277cb2ca', 'b2020001-0001-4000-8000-000000000019', 'c5fc3469-b2a3-40a3-b6e1-ffc67ba4f033', '3aeb7c5c-4c3a-5bf0-ba6c-4dbea8d0af12', '341eaab8-89f5-4d31-8cb0-1a9f27979b96', '8152f12a-9735-4aea-9be4-6c6b8d52d6bf',
  'cf09a483-033b-489b-b5f8-e7d2614b055b', '8eb62118-1959-42a4-ba6c-5cd681cf73e5', '3e1a09a2-51c0-4f2a-923d-570c3d9e9163', '7613f0cc-0a89-4ee9-940f-3fa168834737', 'cfb7da1a-86a6-4efd-8171-80ec863e61a8', 'eaef9e1f-0ebf-4312-8d4c-f7d9e4588813',
  '6948ae1e-ad5a-4cbb-ae12-c08e7cd03eb5', '76c7c4b9-8cfb-4db1-9bb5-8bccdb038107', 'e1dae55d-b3d4-4de7-8845-7f60c68fd25b', '36306721-6e4b-4355-8f29-33830c58cf08', '0ab468e8-ce2a-47f7-81f4-dc14a2d951d4', '42c91cf7-bcb5-48e9-ac0c-868b8ed6cbc1',
  '7efc5863-476b-4719-a7b1-39ca33baa10b', '840fae06-6e0c-4077-a400-bfae40c9c40b', '23b45495-a3d0-4c95-b50f-9aaa6afd8e70', 'b80c3821-d8f9-4c57-8bc3-a064bd0298a5', 'd71719fc-9ea3-40f3-b006-5d38c4c6abad', 'a6735e4d-4f83-4204-9d45-e6756f1e7314',
  '63aac39b-db4c-449b-b979-31b48d9aa4aa', '84fb3fc1-3587-4a1c-a51e-60e3057f5a9f', 'b7b24b9b-133f-495c-b88c-690a60154cea', '1718a555-23cd-4ff7-a117-747bb6976425', '27a38352-e594-4e58-964b-5aa6a320b4dd', '721544df-114c-4f68-a180-81e0179647d3',
  'ce9ede7a-1ed4-4dfe-83e4-909b46600968', 'a7899ae4-b11b-4a1f-bae5-f5b90a70937b', 'e9a21cee-7c44-4972-a1cc-2fc28c38933d', 'c564e259-6009-4102-8ed7-5e1ab4e434e7', 'c2b7b9b2-2a53-41d7-a031-2703991c71fd', '5e047676-73af-4320-88fe-0eb1a0a22b75',
  'bcd78881-360f-4063-a976-39f95c60fd8f', '81509bbe-c035-45cf-aaf2-e23b635114cb', '90a4dfe8-b1db-4419-ba31-3519c8aae99e', 'c394bfe7-17b4-4175-ad94-1edd7e84582a', '4a5b3be9-0e78-4f0b-8327-c86a77e61719', '042ea3f7-846e-42a8-9d2d-91a05e7e3883',
  '269dc17c-0cc1-4484-82e5-b7538b28f948', 'c04fb3c8-641f-4c79-9363-603b04ff4fec', 'adf263fc-5c32-4929-958a-40825f182a14', 'a2f4b2e9-5c5c-4bde-8842-6d0a4a2ba16a', '9cc10f98-ad56-438d-955f-6bc9bcfa6339', '0bee42ac-a63d-4ea4-a03b-0677749f3179',
  'e54c3352-62ec-422d-b552-55cb584a827e', 'af2bbd63-c2a0-4538-a59e-73e5aac4b7f5', '6bffb80a-93d6-4001-bdbf-cc67a54d0dc4', '77f0fb27-97f1-41c0-9250-fb2f1fa4d7a1', '6eb03dcb-2bb6-47a8-bcc5-4c739a64dc05', '91aee664-1a7c-43ef-bde0-8bdcb4ec25c6',
  '58a30a8e-d5d8-43ad-9665-98d33d6009c2', 'c00e3463-8625-4eb1-93dd-1a7d0cc8b2a8', '10d1a9a5-d47b-4800-bcb4-12f4f13b7bab', '82c5f7cb-dbe6-4454-8fc9-9883af315299', '339e818b-7977-4a9f-85c1-fe2f14bead68', '91155ac8-3b82-464a-a051-15c55f9e837c',
  'b6eac28f-ee7f-4e3b-8b56-3946a00a979a', '8602cf4f-0afa-4726-a0f3-d5ac09f64d7d', '3958b461-17d0-4865-9df3-711ddadbcde1', '029d7341-3f5b-4624-83de-ee9435cdd9c9', '22f325a0-bbff-45b1-85ce-282966d05364', '34d499ae-39e7-49b3-a128-b25d7ad08e27',
  '8fab8f18-568c-4f41-9a5f-381486ecf169', 'd714fb34-6a0e-4efe-ae29-7d75ecfa559b', '4d78557b-da8b-4b1f-8d8e-09d74ff3070a', '54552a4a-2777-4c35-b40c-e0a125b43526'
);

UPDATE series SET sort_order = 0
WHERE sort_order BETWEEN 1 AND 99 AND id IN (
  'e577cd74-43ae-49a4-a3d6-9a11277cb2ca', 'b2020001-0001-4000-8000-000000000019', 'c5fc3469-b2a3-40a3-b6e1-ffc67ba4f033', '3aeb7c5c-4c3a-5bf0-ba6c-4dbea8d0af12', '341eaab8-89f5-4d31-8cb0-1a9f27979b96', '8152f12a-9735-4aea-9be4-6c6b8d52d6bf',
  'cf09a483-033b-489b-b5f8-e7d2614b055b', '8eb62118-1959-42a4-ba6c-5cd681cf73e5', '3e1a09a2-51c0-4f2a-923d-570c3d9e9163', '7613f0cc-0a89-4ee9-940f-3fa168834737', 'cfb7da1a-86a6-4efd-8171-80ec863e61a8', 'eaef9e1f-0ebf-4312-8d4c-f7d9e4588813',
  '6948ae1e-ad5a-4cbb-ae12-c08e7cd03eb5', '76c7c4b9-8cfb-4db1-9bb5-8bccdb038107', 'e1dae55d-b3d4-4de7-8845-7f60c68fd25b', '36306721-6e4b-4355-8f29-33830c58cf08', '0ab468e8-ce2a-47f7-81f4-dc14a2d951d4', '42c91cf7-bcb5-48e9-ac0c-868b8ed6cbc1',
  '7efc5863-476b-4719-a7b1-39ca33baa10b', '840fae06-6e0c-4077-a400-bfae40c9c40b', '23b45495-a3d0-4c95-b50f-9aaa6afd8e70', 'b80c3821-d8f9-4c57-8bc3-a064bd0298a5', 'd71719fc-9ea3-40f3-b006-5d38c4c6abad', 'a6735e4d-4f83-4204-9d45-e6756f1e7314',
  '63aac39b-db4c-449b-b979-31b48d9aa4aa', '84fb3fc1-3587-4a1c-a51e-60e3057f5a9f', 'b7b24b9b-133f-495c-b88c-690a60154cea', '1718a555-23cd-4ff7-a117-747bb6976425', '27a38352-e594-4e58-964b-5aa6a320b4dd', '721544df-114c-4f68-a180-81e0179647d3',
  'ce9ede7a-1ed4-4dfe-83e4-909b46600968', 'a7899ae4-b11b-4a1f-bae5-f5b90a70937b', 'e9a21cee-7c44-4972-a1cc-2fc28c38933d', 'c564e259-6009-4102-8ed7-5e1ab4e434e7', 'c2b7b9b2-2a53-41d7-a031-2703991c71fd', '5e047676-73af-4320-88fe-0eb1a0a22b75',
  'bcd78881-360f-4063-a976-39f95c60fd8f', '81509bbe-c035-45cf-aaf2-e23b635114cb', '90a4dfe8-b1db-4419-ba31-3519c8aae99e', 'c394bfe7-17b4-4175-ad94-1edd7e84582a', '4a5b3be9-0e78-4f0b-8327-c86a77e61719', '042ea3f7-846e-42a8-9d2d-91a05e7e3883',
  '269dc17c-0cc1-4484-82e5-b7538b28f948', 'c04fb3c8-641f-4c79-9363-603b04ff4fec', 'adf263fc-5c32-4929-958a-40825f182a14', 'a2f4b2e9-5c5c-4bde-8842-6d0a4a2ba16a', '9cc10f98-ad56-438d-955f-6bc9bcfa6339', '0bee42ac-a63d-4ea4-a03b-0677749f3179',
  'e54c3352-62ec-422d-b552-55cb584a827e', 'af2bbd63-c2a0-4538-a59e-73e5aac4b7f5', '6bffb80a-93d6-4001-bdbf-cc67a54d0dc4', '77f0fb27-97f1-41c0-9250-fb2f1fa4d7a1', '6eb03dcb-2bb6-47a8-bcc5-4c739a64dc05', '91aee664-1a7c-43ef-bde0-8bdcb4ec25c6',
  '58a30a8e-d5d8-43ad-9665-98d33d6009c2', 'c00e3463-8625-4eb1-93dd-1a7d0cc8b2a8', '10d1a9a5-d47b-4800-bcb4-12f4f13b7bab', '82c5f7cb-dbe6-4454-8fc9-9883af315299', '339e818b-7977-4a9f-85c1-fe2f14bead68', '91155ac8-3b82-464a-a051-15c55f9e837c',
  'b6eac28f-ee7f-4e3b-8b56-3946a00a979a', '8602cf4f-0afa-4726-a0f3-d5ac09f64d7d', '3958b461-17d0-4865-9df3-711ddadbcde1', '029d7341-3f5b-4624-83de-ee9435cdd9c9', '22f325a0-bbff-45b1-85ce-282966d05364', '34d499ae-39e7-49b3-a128-b25d7ad08e27',
  '8fab8f18-568c-4f41-9a5f-381486ecf169', 'd714fb34-6a0e-4efe-ae29-7d75ecfa559b', '4d78557b-da8b-4b1f-8d8e-09d74ff3070a', '54552a4a-2777-4c35-b40c-e0a125b43526'
);

-- ----------------------------------------------------------------------------
-- §1b BAND ORDER — 2 old-sidebar members of 'נושאים כלליים בתנ"ך' carrying legacy
--     sorts (30/60) instead of their old sibling positions (2/4). All other
--     policed members already match the old order (checked live: 0 mismatches).
-- scope:
SELECT count(*) AS s1b_to_fix FROM series
WHERE (id='c76ac534-76b4-4f2c-ba9a-05ed95e7145c' AND sort_order IS DISTINCT FROM 2)
   OR (id='bafc63d2-e62f-497a-9b4c-c58377b831a1' AND sort_order IS DISTINCT FROM 4);

UPDATE series SET sort_order = 2  -- מלחמת גוג ומגוג — old sibling position 2
WHERE id='c76ac534-76b4-4f2c-ba9a-05ed95e7145c' AND sort_order IS DISTINCT FROM 2;
UPDATE series SET sort_order = 4  -- יג מידות הרחמים — old sibling position 4
WHERE id='bafc63d2-e62f-497a-9b4c-c58377b831a1' AND sort_order IS DISTINCT FROM 4;

-- ============================================================================
-- §2 SIDEBAR-LABEL ALIGNMENT — 14 old-sidebar members whose series.title
--    differs from the old sidebar label (normalize_he-compared). The old label is
--    the user-facing nav truth → series.title := old label. All token-overlap
--    >= 0.6 (ktiv/scope variants), 0 nodes flagged as different-node (<0.6).
--    Sibling title-collision pre-checked live: none.
-- scope: rows still carrying the wrong title (expect 14 pre-apply, 0 after)
SELECT count(*) AS s2_to_rename FROM series
WHERE (id='c852edd8-d959-4c8d-bf7e-17b5881275fa' AND title <> 'חידות לילדים פ"ש')
   OR (id='a1010001-0001-4000-8000-000000000023' AND title <> 'דוד בקעילה ובזיף | פרק כג')
   OR (id='a1010001-0001-4000-8000-000000000029' AND title <> 'מלחמת דוד בעמלק | פרקים כט-ל')
   OR (id='b2020001-0001-4000-8000-000000000007' AND title <> 'בקשת בנין המקדש | פרק ז')
   OR (id='b2020001-0001-4000-8000-000000000013' AND title <> 'אמנון, תמר ואבשלום | פרק יג')
   OR (id='95db7b7c-4680-487f-a5ae-04297e042f66' AND title <> 'אבים, אסא, נדב ובעשא | פרק טו')
   OR (id='8ff48316-10c7-4ea7-a05f-f6f9b3f96e99' AND title <> 'עלית אליהו לשמים | פרק ב')
   OR (id='d4040401-0002-4000-a000-000000000002' AND title <> 'מעבר לשיעורים על גוג ומגוג')
   OR (id='a7070704-0001-4000-8000-000000000001' AND title <> 'הפטרת פרשת במדבר')
   OR (id='a7070704-0002-4000-8000-000000000001' AND title <> 'הפטרת פרשת נשא')
   OR (id='a7070704-0003-4000-8000-000000000001' AND title <> 'הפטרת פרשת בהעלותך')
   OR (id='a7070704-0004-4000-8000-000000000001' AND title <> 'הפטרת פרשת שלח')
   OR (id='a7070704-0007-4000-8000-000000000001' AND title <> 'הפטרת פרשת בלק')
   OR (id='a7070704-0009-4000-8000-000000000001' AND title <> 'הפטרת פרשת מסעי');

-- חידות לילדים - פרשת השבוע  →  חידות לילדים פ"ש (overlap 0.67)
UPDATE series SET title = 'חידות לילדים פ"ש' WHERE id = 'c852edd8-d959-4c8d-bf7e-17b5881275fa' AND title <> 'חידות לילדים פ"ש';
-- דוד בקעילה ובזיף / במערה | פרקים כ"ג-כ"ד  →  דוד בקעילה ובזיף | פרק כג (overlap 0.8)
UPDATE series SET title = 'דוד בקעילה ובזיף | פרק כג' WHERE id = 'a1010001-0001-4000-8000-000000000023' AND title <> 'דוד בקעילה ובזיף | פרק כג';
-- מלחמת דוד בעמלק / מות שאול | פרקים כ"ט-ל"א  →  מלחמת דוד בעמלק | פרקים כט-ל (overlap 0.83)
UPDATE series SET title = 'מלחמת דוד בעמלק | פרקים כט-ל' WHERE id = 'a1010001-0001-4000-8000-000000000029' AND title <> 'מלחמת דוד בעמלק | פרקים כט-ל';
-- בקשת בניין המקדש | פרק ז''  →  בקשת בנין המקדש | פרק ז (overlap 0.8)
UPDATE series SET title = 'בקשת בנין המקדש | פרק ז' WHERE id = 'b2020001-0001-4000-8000-000000000007' AND title <> 'בקשת בנין המקדש | פרק ז';
-- אמנון, תמר ואבשלום | פרקים י"ג-י"ד  →  אמנון, תמר ואבשלום | פרק יג (overlap 0.8)
UPDATE series SET title = 'אמנון, תמר ואבשלום | פרק יג' WHERE id = 'b2020001-0001-4000-8000-000000000013' AND title <> 'אמנון, תמר ואבשלום | פרק יג';
-- אביהם, אסא, נדב ובעשא | פרק ט"ו  →  אבים, אסא, נדב ובעשא | פרק טו (overlap 0.83)
UPDATE series SET title = 'אבים, אסא, נדב ובעשא | פרק טו' WHERE id = '95db7b7c-4680-487f-a5ae-04297e042f66' AND title <> 'אבים, אסא, נדב ובעשא | פרק טו';
-- עליית אליהו לשמים | פרק ב''  →  עלית אליהו לשמים | פרק ב (overlap 0.8)
UPDATE series SET title = 'עלית אליהו לשמים | פרק ב' WHERE id = '8ff48316-10c7-4ea7-a05f-f6f9b3f96e99' AND title <> 'עלית אליהו לשמים | פרק ב';
-- שיעורים על גוג ומגוג  →  מעבר לשיעורים על גוג ומגוג (overlap 0.75)
UPDATE series SET title = 'מעבר לשיעורים על גוג ומגוג' WHERE id = 'd4040401-0002-4000-a000-000000000002' AND title <> 'מעבר לשיעורים על גוג ומגוג';
-- הפטרת במדבר  →  הפטרת פרשת במדבר (overlap 1.0)
UPDATE series SET title = 'הפטרת פרשת במדבר' WHERE id = 'a7070704-0001-4000-8000-000000000001' AND title <> 'הפטרת פרשת במדבר';
-- הפטרת נשא  →  הפטרת פרשת נשא (overlap 1.0)
UPDATE series SET title = 'הפטרת פרשת נשא' WHERE id = 'a7070704-0002-4000-8000-000000000001' AND title <> 'הפטרת פרשת נשא';
-- הפטרת בהעלותך  →  הפטרת פרשת בהעלותך (overlap 1.0)
UPDATE series SET title = 'הפטרת פרשת בהעלותך' WHERE id = 'a7070704-0003-4000-8000-000000000001' AND title <> 'הפטרת פרשת בהעלותך';
-- הפטרת שלח  →  הפטרת פרשת שלח (overlap 1.0)
UPDATE series SET title = 'הפטרת פרשת שלח' WHERE id = 'a7070704-0004-4000-8000-000000000001' AND title <> 'הפטרת פרשת שלח';
-- הפטרת בלק  →  הפטרת פרשת בלק (overlap 1.0)
UPDATE series SET title = 'הפטרת פרשת בלק' WHERE id = 'a7070704-0007-4000-8000-000000000001' AND title <> 'הפטרת פרשת בלק';
-- הפטרת מסעי  →  הפטרת פרשת מסעי (overlap 1.0)
UPDATE series SET title = 'הפטרת פרשת מסעי' WHERE id = 'a7070704-0009-4000-8000-000000000001' AND title <> 'הפטרת פרשת מסעי';

-- ============================================================================
-- §3 עזרא/נחמיה SPLIT-BOOK NODES — the two split nodes show as extra כתובים books.
--    Live check: עזרא (aa111111…) holds 2 page-only lessons (דפי עבודה, שאלות
--    ותשובות), נחמיה (bb222222…) holds 1 (דפי עבודה) → NOT empty → park at
--    sort_order=0 (page-only), keep status='published' (content stays reachable;
--    the combined book 'עזרא ונחמיה' 5896c267 owns the sidebar slot 10).
--    NOTE: under the band-driven sidebar (CODE-SPEC §2.1) sort=0 removes them from
--    the books level; the CURRENT books query is status-driven → needs code §2.1.
-- scope (expect 0 — both already at 0; guard kept for idempotent re-assert):
SELECT count(*) AS s3_to_park FROM series
WHERE id IN ('aa111111-aaaa-4444-aaaa-aaaaaaaaaaaa','bb222222-bbbb-4444-bbbb-bbbbbbbbbbbb')
  AND COALESCE(sort_order, -1) <> 0;

UPDATE series SET sort_order = 0
WHERE id IN ('aa111111-aaaa-4444-aaaa-aaaaaaaaaaaa','bb222222-bbbb-4444-bbbb-bbbbbbbbbbbb')
  AND COALESCE(sort_order, -1) <> 0;

-- ============================================================================
-- §4 חידות לילדים פ"ש — old tree: 6th child of תורה (after דברים).
--    Live check: c852edd8 already has parent_id=תורה root, sort_order=6,
--    status='active' → assert idempotently. Title aligned to the old label
--    'חידות לילדים פ"ש' in §2. (Current code hard-codes it under בראשית —
--    DesignSidebar.tsx:905-936 — removal is CODE-SPEC §2.5, not SQL.)
-- scope (expect 0):
SELECT count(*) AS s4_to_fix FROM series
WHERE id='c852edd8-d959-4c8d-bf7e-17b5881275fa'
  AND (parent_id IS DISTINCT FROM 'bb14b5a5-9f8f-4b54-ae10-bea3e2ff610b'
       OR sort_order IS DISTINCT FROM 6 OR status <> 'active');

UPDATE series
SET parent_id='bb14b5a5-9f8f-4b54-ae10-bea3e2ff610b', sort_order=6, status='active'
WHERE id='c852edd8-d959-4c8d-bf7e-17b5881275fa'
  AND (parent_id IS DISTINCT FROM 'bb14b5a5-9f8f-4b54-ae10-bea3e2ff610b'
       OR sort_order IS DISTINCT FROM 6 OR status <> 'active');

-- ============================================================================
-- §5 TOPICS SIDEBAR — themes-root (13ca4b52-c317-4bbc-8847-84ecc9e3691b) children must equal the
--    old 127-topic list (names + order). Live: 125 children; 124 of them match
--    the old list AND already carry the exact old position in topics.sort_order
--    (0 order mismatches live — the verify-report 'order FAIL' is the app
--    ordering by computed-count DESC, CODE-SPEC §7, not data).
--    Diff: missing = התשובה (old pos 69), נסים (81), חנ (115) — none exists
--    anywhere in topics (gap4 session merged/deleted them; old sidebar truth
--    restores them). extra = שלושת השבועות (sort 9999, not in the old 127) →
--    detach from themes-root (topic + its 26 lesson_topics links survive).
--    Old positions 69/81/115 are vacant gaps in the live 1..127 ladder.
--    Old topic pages carried 5/3/1 lessons — linked below to one published
--    physical copy per title (copies verified live; choice noted in report).
--    Badge-count mismatches (85) = app-side 1000-row cap → code lane, ignored.
-- ----------------------------------------------------------------------------
-- scope: how many of the 3 topics are still missing (expect 3 pre, 0 post)
SELECT 3 - count(*) AS s5_topics_to_insert FROM topics
WHERE parent_id='13ca4b52-c317-4bbc-8847-84ecc9e3691b' AND name IN ('התשובה','נסים','חנ');

INSERT INTO topics (name, slug, parent_id, sort_order)
SELECT 'התשובה', 'theme-התשובה', '13ca4b52-c317-4bbc-8847-84ecc9e3691b', 69
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE parent_id='13ca4b52-c317-4bbc-8847-84ecc9e3691b' AND name='התשובה');
INSERT INTO topics (name, slug, parent_id, sort_order)
SELECT 'נסים', 'theme-נסים', '13ca4b52-c317-4bbc-8847-84ecc9e3691b', 81
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE parent_id='13ca4b52-c317-4bbc-8847-84ecc9e3691b' AND name='נסים');
INSERT INTO topics (name, slug, parent_id, sort_order)
SELECT 'חנ', 'theme-חנ', '13ca4b52-c317-4bbc-8847-84ecc9e3691b', 115
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE parent_id='13ca4b52-c317-4bbc-8847-84ecc9e3691b' AND name='חנ');

-- extra: שלושת השבועות out of the sidebar membership (old 127 has no such topic)
SELECT count(*) AS s5_extra_to_detach FROM topics
WHERE id='e6060601-0006-4000-8000-000000000001' AND parent_id='13ca4b52-c317-4bbc-8847-84ecc9e3691b';
UPDATE topics SET parent_id = NULL
WHERE id='e6060601-0006-4000-8000-000000000001' AND parent_id='13ca4b52-c317-4bbc-8847-84ecc9e3691b';

-- lesson links for the restored topics (old topic-page rows, old order):
-- התשובה ← מצות הוידוי או מצות התשובה?
INSERT INTO lesson_topics (lesson_id, topic_id, sort_order)
SELECT '468f9d91-1316-5dca-b851-28c703342bb8', tp.id, 1 FROM topics tp
WHERE tp.parent_id='13ca4b52-c317-4bbc-8847-84ecc9e3691b' AND tp.name='התשובה'
  AND NOT EXISTS (SELECT 1 FROM lesson_topics lt WHERE lt.lesson_id='468f9d91-1316-5dca-b851-28c703342bb8' AND lt.topic_id=tp.id);
-- התשובה ← "כי המצוה הזאת... לא נפלאת היא ממך"
INSERT INTO lesson_topics (lesson_id, topic_id, sort_order)
SELECT 'b2020201-0001-4000-8000-000000000007', tp.id, 2 FROM topics tp
WHERE tp.parent_id='13ca4b52-c317-4bbc-8847-84ecc9e3691b' AND tp.name='התשובה'
  AND NOT EXISTS (SELECT 1 FROM lesson_topics lt WHERE lt.lesson_id='b2020201-0001-4000-8000-000000000007' AND lt.topic_id=tp.id);
-- התשובה ← התורה והתשובה
INSERT INTO lesson_topics (lesson_id, topic_id, sort_order)
SELECT 'b2020201-0001-4000-8000-000000000008', tp.id, 3 FROM topics tp
WHERE tp.parent_id='13ca4b52-c317-4bbc-8847-84ecc9e3691b' AND tp.name='התשובה'
  AND NOT EXISTS (SELECT 1 FROM lesson_topics lt WHERE lt.lesson_id='b2020201-0001-4000-8000-000000000008' AND lt.topic_id=tp.id);
-- התשובה ← תשובה אמתית של האדם ותשובה לאומית
INSERT INTO lesson_topics (lesson_id, topic_id, sort_order)
SELECT 'b2020201-0001-4000-8000-000000000017', tp.id, 4 FROM topics tp
WHERE tp.parent_id='13ca4b52-c317-4bbc-8847-84ecc9e3691b' AND tp.name='התשובה'
  AND NOT EXISTS (SELECT 1 FROM lesson_topics lt WHERE lt.lesson_id='b2020201-0001-4000-8000-000000000017' AND lt.topic_id=tp.id);
-- התשובה ← התשובה בספר יונה
INSERT INTO lesson_topics (lesson_id, topic_id, sort_order)
SELECT 'b2020201-0001-4000-8000-000000000002', tp.id, 5 FROM topics tp
WHERE tp.parent_id='13ca4b52-c317-4bbc-8847-84ecc9e3691b' AND tp.name='התשובה'
  AND NOT EXISTS (SELECT 1 FROM lesson_topics lt WHERE lt.lesson_id='b2020201-0001-4000-8000-000000000002' AND lt.topic_id=tp.id);
-- נסים ← "למען הרבות מופתי"
INSERT INTO lesson_topics (lesson_id, topic_id, sort_order)
SELECT '16086d17-dba6-5710-a477-058643bb5a78', tp.id, 1 FROM topics tp
WHERE tp.parent_id='13ca4b52-c317-4bbc-8847-84ecc9e3691b' AND tp.name='נסים'
  AND NOT EXISTS (SELECT 1 FROM lesson_topics lt WHERE lt.lesson_id='16086d17-dba6-5710-a477-058643bb5a78' AND lt.topic_id=tp.id);
-- נסים ← נס וטבע בקריעת ים סוף
INSERT INTO lesson_topics (lesson_id, topic_id, sort_order)
SELECT 'f480d8a7-0c26-5750-b1a6-1ea24e80d97c', tp.id, 2 FROM topics tp
WHERE tp.parent_id='13ca4b52-c317-4bbc-8847-84ecc9e3691b' AND tp.name='נסים'
  AND NOT EXISTS (SELECT 1 FROM lesson_topics lt WHERE lt.lesson_id='f480d8a7-0c26-5750-b1a6-1ea24e80d97c' AND lt.topic_id=tp.id);
-- נסים ← נסיעת הארון ומעבר הירדן
INSERT INTO lesson_topics (lesson_id, topic_id, sort_order)
SELECT '95456cbb-2fcc-44ec-b20c-a8c84bb05198', tp.id, 3 FROM topics tp
WHERE tp.parent_id='13ca4b52-c317-4bbc-8847-84ecc9e3691b' AND tp.name='נסים'
  AND NOT EXISTS (SELECT 1 FROM lesson_topics lt WHERE lt.lesson_id='95456cbb-2fcc-44ec-b20c-a8c84bb05198' AND lt.topic_id=tp.id);
-- חנ ← קרבנות בני הגולה, חנוכת המשכן, ולעתיד לבוא
INSERT INTO lesson_topics (lesson_id, topic_id, sort_order)
SELECT '63c4b4af-62bf-5f3d-88ba-86a719168294', tp.id, 1 FROM topics tp
WHERE tp.parent_id='13ca4b52-c317-4bbc-8847-84ecc9e3691b' AND tp.name='חנ'
  AND NOT EXISTS (SELECT 1 FROM lesson_topics lt WHERE lt.lesson_id='63c4b4af-62bf-5f3d-88ba-86a719168294' AND lt.topic_id=tp.id);

-- ============================================================================
-- §6 TEACHER-ONLY LEAKS IN PUBLIC LISTINGS — verify guard found 71 page-occurrences
--    = 50 distinct published lessons (some series render on 2 public URLs)
--    tagged teachers-only inside public listing series.
--    Cross-checked each title against the OLD public listing scrape of its page:
--    • 44 rows DO appear on the old public page → dual-audience content →
--      audience_tags := audience_tags ∪ {general} (keeps 'teachers'; §0.3 semantics).
--    • 6 rows do NOT appear on the old public page → teachers-only strays →
--      keep tags, sort_order := NULL (listed one-by-one in the report).
-- ----------------------------------------------------------------------------
-- scope: rows still lacking 'general' (expect 44 pre, 0 post)
SELECT count(*) AS s6_to_union_general FROM lessons
WHERE NOT (audience_tags @> ARRAY['general']::text[]) AND id IN (
  'be5754c7-2816-52c4-af90-9a66178de078', 'e35b6e89-1307-5df8-b9e9-e7b8ea20f5da', 'c1cd9121-fac6-40dd-82ca-21d0b4ff97ae', 'e9124305-286b-5674-ad71-a80497fdd58e', 'b6405271-54ad-5c0a-a38b-2f19990f79de', 'bf29764c-7b0c-51ff-959a-b7daa653a392',
  'ef806ab9-2e57-4847-915c-3a83e22c2b3a', '82eea810-5ea2-4c05-89c2-fb3778a77fcb', 'fe60feb7-74b1-4b08-a1cd-1229bbd8d0e2', '71458979-430d-4a58-a2e7-af03b3633f3f', '6715af8d-a70d-43d6-a27e-844e9281b688', 'bc873a62-cd6f-480b-b9d5-74c665d625a8',
  '81dcd441-3f18-4ce9-9620-da11fcdec8bd', 'ea249860-8c49-447b-92b9-853e0b72e388', '14ba8464-1ab5-484a-8d4c-0cad94a12932', '654fbeed-03b6-438e-9aa5-10e5c1be5ef2', '44908052-48f3-43d4-804e-8d9331d496dc', '3482c280-d20c-4e4b-ba36-a28bb4cbb5b1',
  'a676dbc4-e39d-4a20-a5f4-eb34b05ee24e', 'f6fcbf0a-fdd7-4f6e-8057-77c20a9fb4b8', '7787824c-ea91-46ac-9d33-141bf1993541', '9b483c2a-18f9-4f70-ab98-ad2d4e0eb849', '314b7a6e-40a9-45a2-8a12-54b3ccbc971d', '478236f0-aeee-43d7-ba48-f2b53ac299ac',
  'bbbbd8ef-9f41-413d-8dec-aff461b11aeb', '5976ad96-9d59-417f-894e-17084c4e9650', '121bbd7f-27bf-4abc-9b4c-67a73547c1f6', 'db3fd73c-288f-44b5-918d-258d3380cc4e', '7f675b34-bfc1-457f-a437-820e0b66331a', 'f4de4cab-36c0-48a4-9e69-9f69a9777beb',
  '60a6d9f1-c5f2-420c-bd32-475b792f5601', '6b7c29ba-96aa-59cf-a264-79f0b8fb6b79', '7b8d0f11-de82-5b44-bb69-3cb726ad3775', 'eb49daa7-c78a-578b-9769-9729a5a7ae36', 'b2b7335f-4c04-542d-8808-c69b8e782b41', 'dd1d3dcc-16b9-5515-ba82-126e66401020',
  'a2b08e72-ca87-517c-a20a-4d1f51e195a8', '88322b6b-9038-59e4-8f4a-3dd4ee5e4cdb', '68ddb117-51ea-52c1-96ed-91ba28b42e6c', '245cf4d1-152a-527c-9a7b-f7fb2dcd03b2', '71d5170c-d3f8-5639-80e8-005a99f59e21', '53beb033-c21a-54ee-a5f9-ce4ef7a21489',
  'e1e8b701-98b8-559f-93f3-1edf96a60732', '5c775889-1924-4774-970e-ac250d33ac17'
);

UPDATE lessons
SET audience_tags = (SELECT array_agg(DISTINCT x) FROM unnest(audience_tags || ARRAY['general']::text[]) AS u(x))
WHERE NOT (audience_tags @> ARRAY['general']::text[]) AND id IN (
  'be5754c7-2816-52c4-af90-9a66178de078', 'e35b6e89-1307-5df8-b9e9-e7b8ea20f5da', 'c1cd9121-fac6-40dd-82ca-21d0b4ff97ae', 'e9124305-286b-5674-ad71-a80497fdd58e', 'b6405271-54ad-5c0a-a38b-2f19990f79de', 'bf29764c-7b0c-51ff-959a-b7daa653a392',
  'ef806ab9-2e57-4847-915c-3a83e22c2b3a', '82eea810-5ea2-4c05-89c2-fb3778a77fcb', 'fe60feb7-74b1-4b08-a1cd-1229bbd8d0e2', '71458979-430d-4a58-a2e7-af03b3633f3f', '6715af8d-a70d-43d6-a27e-844e9281b688', 'bc873a62-cd6f-480b-b9d5-74c665d625a8',
  '81dcd441-3f18-4ce9-9620-da11fcdec8bd', 'ea249860-8c49-447b-92b9-853e0b72e388', '14ba8464-1ab5-484a-8d4c-0cad94a12932', '654fbeed-03b6-438e-9aa5-10e5c1be5ef2', '44908052-48f3-43d4-804e-8d9331d496dc', '3482c280-d20c-4e4b-ba36-a28bb4cbb5b1',
  'a676dbc4-e39d-4a20-a5f4-eb34b05ee24e', 'f6fcbf0a-fdd7-4f6e-8057-77c20a9fb4b8', '7787824c-ea91-46ac-9d33-141bf1993541', '9b483c2a-18f9-4f70-ab98-ad2d4e0eb849', '314b7a6e-40a9-45a2-8a12-54b3ccbc971d', '478236f0-aeee-43d7-ba48-f2b53ac299ac',
  'bbbbd8ef-9f41-413d-8dec-aff461b11aeb', '5976ad96-9d59-417f-894e-17084c4e9650', '121bbd7f-27bf-4abc-9b4c-67a73547c1f6', 'db3fd73c-288f-44b5-918d-258d3380cc4e', '7f675b34-bfc1-457f-a437-820e0b66331a', 'f4de4cab-36c0-48a4-9e69-9f69a9777beb',
  '60a6d9f1-c5f2-420c-bd32-475b792f5601', '6b7c29ba-96aa-59cf-a264-79f0b8fb6b79', '7b8d0f11-de82-5b44-bb69-3cb726ad3775', 'eb49daa7-c78a-578b-9769-9729a5a7ae36', 'b2b7335f-4c04-542d-8808-c69b8e782b41', 'dd1d3dcc-16b9-5515-ba82-126e66401020',
  'a2b08e72-ca87-517c-a20a-4d1f51e195a8', '88322b6b-9038-59e4-8f4a-3dd4ee5e4cdb', '68ddb117-51ea-52c1-96ed-91ba28b42e6c', '245cf4d1-152a-527c-9a7b-f7fb2dcd03b2', '71d5170c-d3f8-5639-80e8-005a99f59e21', '53beb033-c21a-54ee-a5f9-ce4ef7a21489',
  'e1e8b701-98b8-559f-93f3-1edf96a60732', '5c775889-1924-4774-970e-ac250d33ac17'
);

-- teachers-only strays the OLD public page does not list → sort_order=NULL.
-- LIVE pre-check: all 6 already have sort_order IS NULL (no-op assert; they stay
-- teachers-only and disappear from public pages once code §0.3 audience filter
-- lands — current useLessonsBySeries has NO audience filter, code lane).
-- דברים :: שאלות חזרה - דברים
-- ויקרא :: שאלות חזרה - ויקרא
-- מפות על ספר יהושע :: מפות על ספר יהושע
-- מפות על ספר שופטים :: מפות על ספר שופטים
-- פרשת נשא | ד-ז :: חידות לילדים - פרשת נשא
-- רות :: מגילת רות עם ביאור ושננתם
-- scope (expect 0 — already NULL):
SELECT count(*) AS s6_strays_to_null FROM lessons
WHERE sort_order IS NOT NULL AND id IN (
  '8017dcf7-ca72-445e-a8ce-9f2129ced7f6', '4184c571-9968-40c9-b493-f829559795e7', 'd19d3ee8-610e-4cbb-8134-4a60a8197e50', 'c9ce4337-f6cd-4170-aa1d-cfa83d010d51', '38481fe8-0cdb-444a-8315-5054d5fe4093', 'ce9398ac-6c0e-45bc-abd6-eb6e61e973db'
);
UPDATE lessons SET sort_order = NULL
WHERE sort_order IS NOT NULL AND id IN (
  '8017dcf7-ca72-445e-a8ce-9f2129ced7f6', '4184c571-9968-40c9-b493-f829559795e7', 'd19d3ee8-610e-4cbb-8134-4a60a8197e50', 'c9ce4337-f6cd-4170-aa1d-cfa83d010d51', '38481fe8-0cdb-444a-8315-5054d5fe4093', 'ce9398ac-6c0e-45bc-abd6-eb6e61e973db'
);

-- ============================================================================
-- §7 EMPTY audience_tags — 131 live lessons with audience_tags = {} (invisible
--    to both the public filter and the teachers filter once §0.3 lands).
--    Rule applied per row, evidence = old-site scrapes:
--    • on old PUBLIC listing/topic/rabbi page AND on old TEACHERS listing → ['general','teachers']  (39 rows)
--    • on old PUBLIC page only                                            → ['general']            (8 rows)
--    • on old TEACHERS listing only (worksheets/חוברות/riddle copies)     → ['teachers']           (74 rows)
--    • no old-site signal (orphans)                                       → ['general'] + flagged  (10 rows, list in report)
--    All guards require audience_tags = '{}' → idempotent and cannot clobber §6.
-- ----------------------------------------------------------------------------
-- scope: rows still empty (expect 131 pre, 0 post)
SELECT count(*) AS s7_still_empty FROM lessons WHERE audience_tags = '{}'::text[];

-- §7.dual — 39 rows → ARRAY['general','teachers']
UPDATE lessons SET audience_tags = ARRAY['general','teachers']::text[]
WHERE audience_tags = '{}'::text[] AND id IN (
  '694763f2-77a3-4f37-ba06-19b3bc4e0865', '3bfe8dad-ec4e-490c-9fb6-c5a65d5f9b21', '261bb493-76ad-499a-8c20-e331d53270f7', '563152ae-5ff6-4e36-a526-85fee5b43fdc', 'bb4dbd5c-d66a-4943-9bb5-803db18a4b8d', '0e0fab92-68c5-47bd-925c-fd6bd2bf0ffc',
  'b1530a31-458b-452b-9775-fb48f1b7e6ed', 'e68e8229-ac18-4988-a0e0-09c10082b982', '998bb1b3-93fe-4050-9e6c-708a8d8d6d3b', 'fe907feb-b1c9-4133-86ba-074016d9b59a', 'b27da985-20bc-4766-80a7-dda8d39f06e0', 'fd2f2db9-4cae-4ed2-854c-168304a2383a',
  '7a3912b1-acf4-401f-80e9-ca18be4fd0b1', '3ab4b4fd-97b5-4618-b19f-9a17a54af58b', '2c28dc2d-016c-4771-98c5-149f540e4b78', '76ae403a-c059-4a9d-a457-b1da97ab0f63', '8f7c5642-abc3-4b92-8be2-e41c05b5e042', '4e46b4e9-6cdf-4e5d-85c6-ce89cb603be0',
  '64798426-9770-46eb-998d-d4eb08918935', 'dfc99a57-44ea-42c2-8eb1-32045c969c25', '40cab62f-1a75-452a-877f-c6c0a2e7f762', '83268d91-1a21-4d0b-bfb6-5728293246c6', '5bc376e8-1d6f-4b01-a6d5-c90af5a8afd4', '8df3a093-e714-4c17-af46-8a69508541c2',
  '68f2380e-2960-4783-829c-408c04086ff4', 'b9b6d628-25ab-4796-8aaa-9bc434b38e55', '64b5537a-e29b-4eb8-afad-9e0fb12b56fb', '6c095d7c-1345-4722-8bef-ca81326a25f3', 'b0bf7e73-dc69-4805-9058-bf50111d7877', '6764f32e-cbec-4688-a77d-3f432b44acf0',
  '30c4bfad-8c20-40d7-94c7-8964703725ab', '81254b3e-1c7b-46de-aefb-5d2a9835b73d', 'd5711266-cfcf-47bf-b8aa-304cdb36a56c', 'b51c3517-f548-4eb6-921e-f6b3b8b9b220', 'bf4ba06c-2cf6-489b-ac2e-e989d2e6b4f4', '09ca94a4-ad5e-444f-874d-f4f8e5633cc9',
  'ef3669f0-506f-4b94-a5a1-51a737b2248c', 'cbec9cfa-442c-4bee-a1cc-51c49b9ccde2', 'f6f0dcef-37fc-5475-a9bc-b29b079e1017'
);

-- §7.general — 8 rows → ARRAY['general']
UPDATE lessons SET audience_tags = ARRAY['general']::text[]
WHERE audience_tags = '{}'::text[] AND id IN (
  '5c961fd8-77d4-4684-a7ff-12894d312843', 'a1010101-0001-4000-8000-000000000024', '15245c4a-db26-4c97-b279-50948455b6a9', '47e62174-d185-5c15-8422-2f8e5aacbac4', '72c55833-9d13-58ef-b004-044043b9a798', '220c656a-7326-557a-ab5b-41debc61ad34',
  '2db8f8d7-806d-5a74-b010-2981b8e1955e', '44ff8853-a03a-5296-bb7d-296b9478e7a6'
);

-- §7.teachers — 74 rows → ARRAY['teachers']
UPDATE lessons SET audience_tags = ARRAY['teachers']::text[]
WHERE audience_tags = '{}'::text[] AND id IN (
  '81e8f519-a9ac-4ae5-9b50-8bc5f3a03cfd', '98700ee7-33dc-4f09-9617-89d6ad164d1e', '8db23319-a872-413f-899e-979048ac6f4d', '9094b87b-d98b-44f2-9dc0-c3b56a85fb9f', '2d886d96-091b-40d1-8253-85d357438c6d', '64963e60-c467-4dc9-9a01-a4cc630252b4',
  'f378fc5f-cef3-49a8-9b64-e2dfc987b355', '7fc46ef8-e928-4ff6-885e-7bbfdb91b7f1', '4aea71df-4fa1-490e-bb50-66d9e5f3d453', '4286b301-b56c-4b25-99df-8cd296436158', '1a7c2364-a31d-4980-8da1-1e7f73681c1d', '5198bc36-8b37-4dfd-be21-4b47d93da682',
  '67d228f9-4996-4f48-90ab-27fc018567a9', 'dee8a1b6-06fa-49b2-a434-9f7c453d8fe4', 'b3f020a9-a6fd-48ac-a6aa-c43530525573', '06e15d82-1b61-4862-a6c9-e9e49cfba42a', 'a15d4c1c-f5b1-496f-8d84-7175dc76373f', 'c86303fe-d2b5-4870-a0d8-7cc5e18ef0d1',
  'b9cc0466-1b88-453f-9d3e-d5bcdf24686d', '130dff29-f639-4690-b08f-e964f2f00f01', '8589db96-e64a-4d35-8831-4d53966809a1', '1c8c1a9e-8cf8-48b1-9c69-a08cac55580a', '38d2abbd-71ef-49cf-90a5-178bcc3eccd5', '47fbaf78-71e5-41b9-9d05-4ceef8636e01',
  '4fcf6fbb-3bce-4372-a7d8-45b418469eab', 'aa7bfb53-ca06-4f8f-92ae-39117cbcf68e', '90e4fe50-607d-4b13-b974-1b8d0c8c5eb3', 'a373a3bf-cc73-4075-9ae0-5e8d9ee6c30c', '58c74e73-d316-486c-81f7-a89d18a41710', '92fc455b-d58e-43d4-9d48-adccc3671408',
  '65cb37b3-7293-4924-a38d-2de65e0f30f5', '0745dd78-15ee-4b94-9e47-ef58ff622d54', 'abd221ae-6461-469b-b0a2-a8b5a3c9b8af', '00f3564d-c55e-4b36-ac28-6835194887ef', '11f7069d-1871-4bb0-bc13-84a1102a9a85', 'c2fb8899-c3e3-4d13-beda-3154b4d586f4',
  'fd6d37b7-c895-47b1-9fd1-4078722ac3d4', '6d3796e9-b6cd-436f-8d3c-85426e4c499a', '2b3ca214-7d17-4d34-8c24-6bf60943717b', 'ee2bf129-2a08-469d-9de5-aa689e154eed', '19a12260-ff83-41fa-8e5a-7554855039dc', 'ac75ecd4-65a3-4746-9c2f-f1446f2af010',
  'a170b849-5202-460c-8d50-e6ffc5e6a288', 'bdef9e1d-d63f-47f7-b3eb-dd901ef8e4d3', '996a1ea0-2333-41df-8801-b5a7302bd7d1', '0b88099d-c600-46e1-9eae-e08f2884b221', '16b0a754-4431-4bf8-92e7-73232fe2dac4', '5278e2ef-c597-4bf6-b6ba-7ebd7f3f24ef',
  '807a3410-ce4a-4df8-8be1-9dd0ffb98001', 'ee7024b0-7e74-49ca-9b91-4564da68f99f', '274e41be-2976-4aad-910a-60f9b690bc7f', 'c60327a6-f2e7-442f-b951-5b3423dd1b82', '3362a65a-4b7d-4df0-a718-901bdbd7955a', 'b26579ce-da27-42b6-b506-07a8c0b107b8',
  'dd232358-dda3-4698-8a78-4342c71c8d18', '3865f5b4-4437-4ea0-a695-fd96836ecde8', '1c3d1304-75ac-4822-828a-89fdce3ca41a', '02e834bb-15da-4e37-8e19-b83dfb6278b8', 'a15025ac-a353-415b-a4f7-018f52475c56', '364606c7-9c8c-4eeb-b179-9c0bd2196aa9',
  'b5c2c33d-c636-4105-a5ba-4947062bef07', '7cb01ccf-f60a-4ed2-b91c-d34acd300fab', 'c85fc742-f428-4c23-a6cc-a66e1aa760c6', 'c5936445-aec4-4623-a9aa-9ea52a37f0f6', 'e52a0fce-2b76-4924-bd06-20c10a502f32', 'f4d049a7-d0c5-4fb0-9f55-f170447d34c7',
  'fb2d3ea9-d8f1-486a-a6a0-cd3333178487', '7b24c272-9d43-4ae5-bc45-1f3c10189888', 'fea5475e-4f5f-49b6-b21c-a599d2c43fb5', '767fefbb-bbef-4068-b712-6c231cb5f648', '28f11e3a-280a-4138-a1b2-9bfe3374ab6b', '41b5719a-5488-492f-9c41-80cfc0e382ca',
  '3b6591e7-8bf1-4fa7-98c4-4d7d4b69d8a9', '7ed1651c-411c-45a7-bd33-8a4a1b3a45ea'
);

-- §7.general_flag — 10 rows → ARRAY['general']
UPDATE lessons SET audience_tags = ARRAY['general']::text[]
WHERE audience_tags = '{}'::text[] AND id IN (
  '5ac2c796-d4e2-40e0-9acc-8708dfe4b470', '982859e0-3c44-4680-9dcf-5912187f69f2', '316af6d9-2da7-40b2-8fb4-b3388767f969', '578fa482-f006-4cd8-892f-604b98574fc9', '2b551c75-5d49-4a19-8c4d-3bda01e3ef87', '1a57f535-6b58-4c04-8c50-0080160ab3cd',
  'af007387-2467-40a8-931f-1698c5296eae', 'dfc4f31a-f00d-4e27-a192-03be117ba368', '961acc66-07db-4e70-bcb3-47a889e66387', '19f71f34-33c9-4a53-89e7-662cb6ed8639'
);

-- ============================================================================
-- §8 VERIFICATION — read-only proofs (run after apply; expectations inline)
-- ----------------------------------------------------------------------------
-- V1 band hygiene: every §1 id is out of the band  → expect 0
SELECT count(*) AS v1_still_in_band FROM series
WHERE sort_order BETWEEN 1 AND 99 AND id IN (
  'e577cd74-43ae-49a4-a3d6-9a11277cb2ca', 'b2020001-0001-4000-8000-000000000019', 'c5fc3469-b2a3-40a3-b6e1-ffc67ba4f033', '3aeb7c5c-4c3a-5bf0-ba6c-4dbea8d0af12', '341eaab8-89f5-4d31-8cb0-1a9f27979b96', '8152f12a-9735-4aea-9be4-6c6b8d52d6bf',
  'cf09a483-033b-489b-b5f8-e7d2614b055b', '8eb62118-1959-42a4-ba6c-5cd681cf73e5', '3e1a09a2-51c0-4f2a-923d-570c3d9e9163', '7613f0cc-0a89-4ee9-940f-3fa168834737', 'cfb7da1a-86a6-4efd-8171-80ec863e61a8', 'eaef9e1f-0ebf-4312-8d4c-f7d9e4588813',
  '6948ae1e-ad5a-4cbb-ae12-c08e7cd03eb5', '76c7c4b9-8cfb-4db1-9bb5-8bccdb038107', 'e1dae55d-b3d4-4de7-8845-7f60c68fd25b', '36306721-6e4b-4355-8f29-33830c58cf08', '0ab468e8-ce2a-47f7-81f4-dc14a2d951d4', '42c91cf7-bcb5-48e9-ac0c-868b8ed6cbc1',
  '7efc5863-476b-4719-a7b1-39ca33baa10b', '840fae06-6e0c-4077-a400-bfae40c9c40b', '23b45495-a3d0-4c95-b50f-9aaa6afd8e70', 'b80c3821-d8f9-4c57-8bc3-a064bd0298a5', 'd71719fc-9ea3-40f3-b006-5d38c4c6abad', 'a6735e4d-4f83-4204-9d45-e6756f1e7314',
  '63aac39b-db4c-449b-b979-31b48d9aa4aa', '84fb3fc1-3587-4a1c-a51e-60e3057f5a9f', 'b7b24b9b-133f-495c-b88c-690a60154cea', '1718a555-23cd-4ff7-a117-747bb6976425', '27a38352-e594-4e58-964b-5aa6a320b4dd', '721544df-114c-4f68-a180-81e0179647d3',
  'ce9ede7a-1ed4-4dfe-83e4-909b46600968', 'a7899ae4-b11b-4a1f-bae5-f5b90a70937b', 'e9a21cee-7c44-4972-a1cc-2fc28c38933d', 'c564e259-6009-4102-8ed7-5e1ab4e434e7', 'c2b7b9b2-2a53-41d7-a031-2703991c71fd', '5e047676-73af-4320-88fe-0eb1a0a22b75',
  'bcd78881-360f-4063-a976-39f95c60fd8f', '81509bbe-c035-45cf-aaf2-e23b635114cb', '90a4dfe8-b1db-4419-ba31-3519c8aae99e', 'c394bfe7-17b4-4175-ad94-1edd7e84582a', '4a5b3be9-0e78-4f0b-8327-c86a77e61719', '042ea3f7-846e-42a8-9d2d-91a05e7e3883',
  '269dc17c-0cc1-4484-82e5-b7538b28f948', 'c04fb3c8-641f-4c79-9363-603b04ff4fec', 'adf263fc-5c32-4929-958a-40825f182a14', 'a2f4b2e9-5c5c-4bde-8842-6d0a4a2ba16a', '9cc10f98-ad56-438d-955f-6bc9bcfa6339', '0bee42ac-a63d-4ea4-a03b-0677749f3179',
  'e54c3352-62ec-422d-b552-55cb584a827e', 'af2bbd63-c2a0-4538-a59e-73e5aac4b7f5', '6bffb80a-93d6-4001-bdbf-cc67a54d0dc4', '77f0fb27-97f1-41c0-9250-fb2f1fa4d7a1', '6eb03dcb-2bb6-47a8-bcc5-4c739a64dc05', '91aee664-1a7c-43ef-bde0-8bdcb4ec25c6',
  '58a30a8e-d5d8-43ad-9665-98d33d6009c2', 'c00e3463-8625-4eb1-93dd-1a7d0cc8b2a8', '10d1a9a5-d47b-4800-bcb4-12f4f13b7bab', '82c5f7cb-dbe6-4454-8fc9-9883af315299', '339e818b-7977-4a9f-85c1-fe2f14bead68', '91155ac8-3b82-464a-a051-15c55f9e837c',
  'b6eac28f-ee7f-4e3b-8b56-3946a00a979a', '8602cf4f-0afa-4726-a0f3-d5ac09f64d7d', '3958b461-17d0-4865-9df3-711ddadbcde1', '029d7341-3f5b-4624-83de-ee9435cdd9c9', '22f325a0-bbff-45b1-85ce-282966d05364', '34d499ae-39e7-49b3-a128-b25d7ad08e27',
  '8fab8f18-568c-4f41-9a5f-381486ecf169', 'd714fb34-6a0e-4efe-ae29-7d75ecfa559b', '4d78557b-da8b-4b1f-8d8e-09d74ff3070a', '54552a4a-2777-4c35-b40c-e0a125b43526'
);

-- V1b order: the 2 fixed members sit at their old positions → expect 2
SELECT count(*) AS v1b_in_place FROM series
WHERE (id='c76ac534-76b4-4f2c-ba9a-05ed95e7145c' AND sort_order=2)
   OR (id='bafc63d2-e62f-497a-9b4c-c58377b831a1' AND sort_order=4);

-- V2 renames: all 14 titles equal the old sidebar labels → expect 14
SELECT count(*) AS v2_renamed FROM series
WHERE (id='c852edd8-d959-4c8d-bf7e-17b5881275fa' AND title='חידות לילדים פ"ש') OR (id='a1010001-0001-4000-8000-000000000023' AND title='דוד בקעילה ובזיף | פרק כג') OR (id='a1010001-0001-4000-8000-000000000029' AND title='מלחמת דוד בעמלק | פרקים כט-ל') OR (id='b2020001-0001-4000-8000-000000000007' AND title='בקשת בנין המקדש | פרק ז') OR (id='b2020001-0001-4000-8000-000000000013' AND title='אמנון, תמר ואבשלום | פרק יג') OR (id='95db7b7c-4680-487f-a5ae-04297e042f66' AND title='אבים, אסא, נדב ובעשא | פרק טו') OR (id='8ff48316-10c7-4ea7-a05f-f6f9b3f96e99' AND title='עלית אליהו לשמים | פרק ב') OR (id='d4040401-0002-4000-a000-000000000002' AND title='מעבר לשיעורים על גוג ומגוג') OR (id='a7070704-0001-4000-8000-000000000001' AND title='הפטרת פרשת במדבר') OR (id='a7070704-0002-4000-8000-000000000001' AND title='הפטרת פרשת נשא') OR (id='a7070704-0003-4000-8000-000000000001' AND title='הפטרת פרשת בהעלותך') OR (id='a7070704-0004-4000-8000-000000000001' AND title='הפטרת פרשת שלח') OR (id='a7070704-0007-4000-8000-000000000001' AND title='הפטרת פרשת בלק') OR (id='a7070704-0009-4000-8000-000000000001' AND title='הפטרת פרשת מסעי');

-- V3 split books parked → expect 2
SELECT count(*) AS v3_parked FROM series
WHERE id IN ('aa111111-aaaa-4444-aaaa-aaaaaaaaaaaa','bb222222-bbbb-4444-bbbb-bbbbbbbbbbbb')
  AND sort_order=0;

-- V4 riddles slot → expect 1
SELECT count(*) AS v4_riddles_ok FROM series
WHERE id='c852edd8-d959-4c8d-bf7e-17b5881275fa'
  AND parent_id='bb14b5a5-9f8f-4b54-ae10-bea3e2ff610b' AND sort_order=6
  AND status='active' AND title='חידות לילדים פ"ש';

-- V5a themes-root membership = old 127 names → expect 127, 0 missing, 0 extra
SELECT count(*) AS v5_children FROM topics WHERE parent_id='13ca4b52-c317-4bbc-8847-84ecc9e3691b';
-- expect 3:
SELECT count(*) AS v5_restored FROM topics
WHERE parent_id='13ca4b52-c317-4bbc-8847-84ecc9e3691b' AND name IN ('התשובה','נסים','חנ');
-- expect 0:
SELECT count(*) AS v5_extra_gone FROM topics
WHERE parent_id='13ca4b52-c317-4bbc-8847-84ecc9e3691b' AND id='e6060601-0006-4000-8000-000000000001';
-- V5b order ladder: each child carries a unique sort 1..127 → expect 127 / 127
SELECT count(DISTINCT sort_order) AS v5_distinct_sorts, count(*) AS v5_rows
FROM topics WHERE parent_id='13ca4b52-c317-4bbc-8847-84ecc9e3691b' AND sort_order BETWEEN 1 AND 127;
-- V5c restored topic pages are non-empty → expect התשובה=5, נסים=3, חנ=1
SELECT tp.name, count(lt.lesson_id) AS links
FROM topics tp LEFT JOIN lesson_topics lt ON lt.topic_id=tp.id
WHERE tp.parent_id='13ca4b52-c317-4bbc-8847-84ecc9e3691b' AND tp.name IN ('התשובה','נסים','חנ') GROUP BY tp.name;

-- V6 leaks: no teachers-only published lesson left in the leak series set,
--    except the 6 reported strays (now sort_order IS NULL) → expect 6
SELECT count(*) AS v6_remaining_teacher_only FROM lessons
WHERE status='published' AND audience_tags @> ARRAY['teachers']::text[]
  AND NOT audience_tags @> ARRAY['general']::text[]
  AND series_id IN (
  '58e49444-38cf-455c-8d83-5af19d0e1cb0','08a87de3-2938-43aa-962f-8ea95096e564',
  '743cfeeb-c82d-458e-83f8-98d40629ea1b','a14dbc35-1caf-4675-9eba-75b5df118925',
  '381ebb6c-8c16-43d6-bd61-7e96445efa34','cc7825e1-67a3-49b8-b632-9543f3aa3787',
  'ea110001-0001-4000-8000-000000000001','ed200001-0002-4000-8000-000000000001',
  '75b7c62c-50e2-4874-bcf5-2d8ddf646771','a1010001-0001-4000-8000-000000000023',
  'a1010001-0001-4000-8000-000000000029','02539385-aaaa-4c7f-9d85-d1af6e1cdd96',
  'b2020001-0001-4000-8000-000000000007','b2020001-0001-4000-8000-000000000012',
  '2d6d28c1-3c5c-4d61-9283-410bc56cd351','5f298ac3-b98a-4822-9ed6-45b01b2905fe',
  'bf16434c-3391-4566-a854-9b055d8825e2','9cb69292-166f-4114-98d3-ca8812c81787',
  'b082cb95-cec2-4fb4-9d92-4dceb7ce2706','6267feb7-de69-4106-aa02-172411e070cd',
  '531a3635-53d0-4fac-b9c2-ee37086e499a');
-- expect 6:
SELECT count(*) AS v6_strays_nulled FROM lessons
WHERE sort_order IS NULL AND id IN (
  '8017dcf7-ca72-445e-a8ce-9f2129ced7f6', '4184c571-9968-40c9-b493-f829559795e7', 'd19d3ee8-610e-4cbb-8134-4a60a8197e50', 'c9ce4337-f6cd-4170-aa1d-cfa83d010d51', '38481fe8-0cdb-444a-8315-5054d5fe4093', 'ce9398ac-6c0e-45bc-abd6-eb6e61e973db'
);

-- V7 empty tags eliminated → expect 0
SELECT count(*) AS v7_empty_left FROM lessons WHERE audience_tags = '{}'::text[];
