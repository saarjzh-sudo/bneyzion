-- ============================================================================
-- plan_dedup_torah.sql  ·  Bnei-Zion 1:1 migration · Round-1 Fix-Round 1
-- TARGETED DEDUP of COPY-clones introduced by the 10.6 consolidation.
-- DB: Supabase pzvmwfexeiruelwiujxn (bnei-zion) · prod branch feat/navigator-bot
-- Author (SQL): orchestrator runs it. READ-ONLY analysis done via sbq.py.
-- ----------------------------------------------------------------------------
-- SCOPE: rabbi-series (children of the 5 Torah book *category* nodes) where the
--        published lesson count > GT old_count, AND the surplus rows are proven
--        in-series duplicates (same normalize(title): NFC + strip niqqud +
--        collapse-punct + lowercase) of a canonical kept row.
-- NOT TOUCHED: parsha event-series (title ~ '^\s*פרשת\s.*\|'), teacher nodes
--        (דפי עבודה / חוברת עבודה), Neviim, Ketuvim, any series already at parity,
--        and cross-book display-inflation series (לשון הקודש / מידות / עולמות /
--        פשט / אונקלוס in שמות) — those are a CODE count-scoping bug (C3), NOT data.
-- SAFETY: every DELETE is guarded NOT EXISTS on all blocking FKs + asserts a
--        canonical sibling survives in the same series. Idempotent (re-run = 0).
-- FK MAP to lessons.id (verified):
--   NO ACTION (blocks delete): lesson_comments, lesson_dedications, lesson_topics,
--        user_enrollments.last_lesson_id, user_favorites, user_history,
--        lessons.copied_from (self, incoming).
--   CASCADE (auto-removes child): lesson_rabbis, rabbi_page_items, teacher_listing_items.
--   -> All 21 "clean" delete-targets have ZERO rows in every child table (audited),
--      so no cascade loss and no block. The 3 "blocked" targets are handled below.
-- ============================================================================

BEGIN;  -- inspect verification SELECTs at the end, then COMMIT or ROLLBACK.

-- ----------------------------------------------------------------------------
-- SECTION A — 21 CLEAN deletions (0 FK on the deleted row; canonical kept)
-- Each statement: delete the clone IFF (a) it has no blocking child rows and
-- (b) the named canonical still exists in the same series.
-- Grouped by series. del = clone removed, keep = canonical retained.
-- ----------------------------------------------------------------------------

-- ===== בראשית · מאמרים על פרשיות בראשית (שפירא) a5505b1a · 58 -> 53 (del 5) =====
-- keep 7c0ae70c "אחד היה אברהם" (audio + lesson_topics + 3 incoming copies);
--   del 1cd5f66d (06-01 text-only copy)
DELETE FROM lessons l WHERE l.id='1cd5f66d-d958-4993-bc04-e6cd6a010da3'
  AND l.series_id='a5505b1a-0b55-4558-8b98-88e13e88793b'
  AND NOT EXISTS (SELECT 1 FROM lesson_comments   c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_dedications c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_topics      c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_favorites     c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_history       c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_enrollments   c WHERE c.last_lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lessons            c WHERE c.copied_from=l.id)
  AND EXISTS (SELECT 1 FROM lessons k WHERE k.id='7c0ae70c-e31c-415a-be4f-2b9aa1211a14' AND k.series_id=l.series_id);

-- keep bc989f9f "הולך ואור" (06-01 real שפירא article); del c9c967d1 (06-12 copy of חנוכה lesson)
DELETE FROM lessons l WHERE l.id='c9c967d1-9853-52c2-bade-b6b633052b80'
  AND l.series_id='a5505b1a-0b55-4558-8b98-88e13e88793b'
  AND NOT EXISTS (SELECT 1 FROM lesson_comments   c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_dedications c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_topics      c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_favorites     c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_history       c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_enrollments   c WHERE c.last_lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lessons            c WHERE c.copied_from=l.id)
  AND EXISTS (SELECT 1 FROM lessons k WHERE k.id='bc989f9f-07be-4d8e-b84b-e52e1da7bc0f' AND k.series_id=l.series_id);

-- keep ecd0c490 "על נסיך ועל נפלאותיך ועל ישועתך"; del c9c39e3e (06-12 copy of חנוכה lesson)
DELETE FROM lessons l WHERE l.id='c9c39e3e-53ab-5718-a028-5d9a5b59201a'
  AND l.series_id='a5505b1a-0b55-4558-8b98-88e13e88793b'
  AND NOT EXISTS (SELECT 1 FROM lesson_comments   c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_dedications c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_topics      c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_favorites     c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_history       c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_enrollments   c WHERE c.last_lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lessons            c WHERE c.copied_from=l.id)
  AND EXISTS (SELECT 1 FROM lessons k WHERE k.id='ecd0c490-04da-4976-b6eb-a02a3250de6b' AND k.series_id=l.series_id);

-- keep fc11b3d7 "קומי אורי כי בא אורך"; del a3d58619 (06-12 copy of חנוכה lesson)
DELETE FROM lessons l WHERE l.id='a3d58619-3b4b-5689-bb25-11019aadcfbc'
  AND l.series_id='a5505b1a-0b55-4558-8b98-88e13e88793b'
  AND NOT EXISTS (SELECT 1 FROM lesson_comments   c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_dedications c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_topics      c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_favorites     c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_history       c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_enrollments   c WHERE c.last_lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lessons            c WHERE c.copied_from=l.id)
  AND EXISTS (SELECT 1 FROM lessons k WHERE k.id='fc11b3d7-1706-417e-8b5e-dcd9748bc8b1' AND k.series_id=l.series_id);

-- keep 42d9baf7 "קבעו שיר ורננים"; del 1c865371 (06-12 copy of חנוכה lesson)
DELETE FROM lessons l WHERE l.id='1c865371-e476-5c0b-a789-bc3c051052e5'
  AND l.series_id='a5505b1a-0b55-4558-8b98-88e13e88793b'
  AND NOT EXISTS (SELECT 1 FROM lesson_comments   c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_dedications c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_topics      c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_favorites     c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_history       c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_enrollments   c WHERE c.last_lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lessons            c WHERE c.copied_from=l.id)
  AND EXISTS (SELECT 1 FROM lessons k WHERE k.id='42d9baf7-cfb3-4f1f-91a6-58a0ef538006' AND k.series_id=l.series_id);

-- ===== בראשית · קדושת פשוטו של מקרא בראשית (קופרמן) 46bbc3f2 · 28 -> 24 (del 4) =====
-- keep the 02-23/03-13 originals (have attachment+legacy media + lesson_topics);
--   del the 06-01 empty content-less copies.
-- keep 97ef427d "גלגולו של שמע ישראל"; del 8d1a6d21 (06-01 empty)
DELETE FROM lessons l WHERE l.id='8d1a6d21-b4f1-46d8-bfab-d0e85b0f8018'
  AND l.series_id='46bbc3f2-722a-4c00-8996-9db9a0fb441e'
  AND NOT EXISTS (SELECT 1 FROM lesson_comments   c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_dedications c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_topics      c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_favorites     c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_history       c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_enrollments   c WHERE c.last_lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lessons            c WHERE c.copied_from=l.id)
  AND EXISTS (SELECT 1 FROM lessons k WHERE k.id='97ef427d-c71c-4c27-ac47-33e764b2c5e8' AND k.series_id=l.series_id);

-- keep c66e280f "עבירה לשמה"; del 66699e1e (06-01 empty)
DELETE FROM lessons l WHERE l.id='66699e1e-a1f4-4076-b98b-453cc6a03aaa'
  AND l.series_id='46bbc3f2-722a-4c00-8996-9db9a0fb441e'
  AND NOT EXISTS (SELECT 1 FROM lesson_comments   c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_dedications c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_topics      c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_favorites     c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_history       c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_enrollments   c WHERE c.last_lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lessons            c WHERE c.copied_from=l.id)
  AND EXISTS (SELECT 1 FROM lessons k WHERE k.id='c66e280f-8354-4010-8f84-1370540304d9' AND k.series_id=l.series_id);

-- keep 05c82342 "עבר פשוט כעבר מוקדם בפירוש רש\"י"; del a539cdfc (06-01 empty)
DELETE FROM lessons l WHERE l.id='a539cdfc-47c5-4390-a85e-852e2de7b591'
  AND l.series_id='46bbc3f2-722a-4c00-8996-9db9a0fb441e'
  AND NOT EXISTS (SELECT 1 FROM lesson_comments   c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_dedications c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_topics      c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_favorites     c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_history       c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_enrollments   c WHERE c.last_lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lessons            c WHERE c.copied_from=l.id)
  AND EXISTS (SELECT 1 FROM lessons k WHERE k.id='05c82342-a713-4017-bbd0-bc552efef917' AND k.series_id=l.series_id);

-- keep 10b383d1 "עיון ברש\"י הראשון בתורה"; del b1ee81f8 (06-01 empty)
DELETE FROM lessons l WHERE l.id='b1ee81f8-996a-4f2e-a4df-bf6ba00702b6'
  AND l.series_id='46bbc3f2-722a-4c00-8996-9db9a0fb441e'
  AND NOT EXISTS (SELECT 1 FROM lesson_comments   c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_dedications c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_topics      c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_favorites     c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_history       c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_enrollments   c WHERE c.last_lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lessons            c WHERE c.copied_from=l.id)
  AND EXISTS (SELECT 1 FROM lessons k WHERE k.id='10b383d1-ba18-4245-b139-f5a5264f3288' AND k.series_id=l.series_id);

-- ===== בראשית · מאמרים קצרים - חומש בראשית (אדלר) ab762d8c · 15 -> 14 (del 1) =====
-- keep 5ed9066d (03-13, has video + lesson_topics); del a23469d3 (06-01 punct-variant copy, same content)
DELETE FROM lessons l WHERE l.id='a23469d3-4e54-4670-a2c4-ae7cbdc027c7'
  AND l.series_id='ab762d8c-d18b-452a-9263-201ccd019625'
  AND NOT EXISTS (SELECT 1 FROM lesson_comments   c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_dedications c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_topics      c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_favorites     c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_history       c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_enrollments   c WHERE c.last_lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lessons            c WHERE c.copied_from=l.id)
  AND EXISTS (SELECT 1 FROM lessons k WHERE k.id='5ed9066d-ec77-48bd-9f6f-4cde9c01013c' AND k.series_id=l.series_id);

-- ===== דברים · מאמרים - חומש דברים (שנדורפי) b831dccd · 47 -> 45 (del 2) =====
-- keep 61f9dc8e "כיצד יתכן..."; del d76bd2e9 (06-12 copy of פורים lesson)
DELETE FROM lessons l WHERE l.id='d76bd2e9-f3a0-583a-a10b-7bfe97cacc86'
  AND l.series_id='b831dccd-9716-47aa-94be-49f27655ef65'
  AND NOT EXISTS (SELECT 1 FROM lesson_comments   c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_dedications c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_topics      c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_favorites     c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_history       c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_enrollments   c WHERE c.last_lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lessons            c WHERE c.copied_from=l.id)
  AND EXISTS (SELECT 1 FROM lessons k WHERE k.id='61f9dc8e-0945-4f3e-ab36-b0bca8d89a77' AND k.series_id=l.series_id);

-- keep 97bf711f "שמחה של מצוה"; del abb26f30 (06-12 copy of סוכות lesson)
DELETE FROM lessons l WHERE l.id='abb26f30-9986-5676-9bf0-1cfe882bdfc5'
  AND l.series_id='b831dccd-9716-47aa-94be-49f27655ef65'
  AND NOT EXISTS (SELECT 1 FROM lesson_comments   c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_dedications c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_topics      c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_favorites     c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_history       c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_enrollments   c WHERE c.last_lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lessons            c WHERE c.copied_from=l.id)
  AND EXISTS (SELECT 1 FROM lessons k WHERE k.id='97bf711f-a8b6-409b-9424-6d66036bdcb5' AND k.series_id=l.series_id);

-- ===== דברים · פרשת שבוע- דברים (ג'יאמי) 4d90e367 · 25 -> 23 (del 2) =====
-- both rows in each pair are audio (no cf). keep the 03-15 row that carries
-- lesson_topics / incoming-copy; del the 03-08 copy.
-- keep c87eaa76 "פרשת התשובה" (has incoming copy); del 9f2cb59a (03-08, no FK)
DELETE FROM lessons l WHERE l.id='9f2cb59a-2c24-4536-8f02-6461f2737247'
  AND l.series_id='4d90e367-7613-49e0-9069-89ab12093cc2'
  AND NOT EXISTS (SELECT 1 FROM lesson_comments   c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_dedications c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_topics      c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_favorites     c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_history       c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_enrollments   c WHERE c.last_lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lessons            c WHERE c.copied_from=l.id)
  AND EXISTS (SELECT 1 FROM lessons k WHERE k.id='c87eaa76-1dea-48cd-a2b1-d43690818c4c' AND k.series_id=l.series_id);

-- keep 01cc2acc "הברית" (03-15, has lesson_topics); del 6eed1e0c (03-08, no FK)
DELETE FROM lessons l WHERE l.id='6eed1e0c-f99a-4f33-bf4f-ebf1de1ed6cc'
  AND l.series_id='4d90e367-7613-49e0-9069-89ab12093cc2'
  AND NOT EXISTS (SELECT 1 FROM lesson_comments   c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_dedications c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_topics      c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_favorites     c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_history       c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_enrollments   c WHERE c.last_lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lessons            c WHERE c.copied_from=l.id)
  AND EXISTS (SELECT 1 FROM lessons k WHERE k.id='01cc2acc-3781-4dfa-b12c-ae180a727fb5' AND k.series_id=l.series_id);

-- ===== דברים · מאמרים על פרשיות דברים (שפירא) 8c74988d · 19 -> 18 (del 1) =====
-- keep bcc802bf "מורשה" (06-01 real שפירא row); del 01f7dbbf (06-12 copy of שמיני עצרת lesson)
DELETE FROM lessons l WHERE l.id='01f7dbbf-4ecc-5477-a594-b996c309fdc8'
  AND l.series_id='8c74988d-490b-423b-8c2a-9730c715e20b'
  AND NOT EXISTS (SELECT 1 FROM lesson_comments   c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_dedications c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_topics      c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_favorites     c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_history       c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_enrollments   c WHERE c.last_lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lessons            c WHERE c.copied_from=l.id)
  AND EXISTS (SELECT 1 FROM lessons k WHERE k.id='bcc802bf-1190-4381-84ef-82684eac61ce' AND k.series_id=l.series_id);

-- ===== שמות · מאמרים על פרשיות שמות (שפירא) e33c840d · 40 -> 35 (del 5) =====
-- NOTE: surplus vs GT is 6, but only 5 are proven clones. The 6th surplus row is
--   NOT a title-duplicate and NOT a copied_from clone -> left in place, flagged to
--   Yoav (see plan_dedup_torah.md §Yoav). This series lands at 35, not 34.
-- keep ed2973ea "וטהרתם"; del 4ce73fb6 (06-12 copy of פרשת כי תשא lesson)
DELETE FROM lessons l WHERE l.id='4ce73fb6-e1e3-5976-a9b9-6c92f4f3a632'
  AND l.series_id='e33c840d-a898-4776-9bfe-8be50419b4ad'
  AND NOT EXISTS (SELECT 1 FROM lesson_comments   c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_dedications c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_topics      c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_favorites     c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_history       c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_enrollments   c WHERE c.last_lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lessons            c WHERE c.copied_from=l.id)
  AND EXISTS (SELECT 1 FROM lessons k WHERE k.id='ed2973ea-3f40-4ab6-ae86-c7fb1454a767' AND k.series_id=l.series_id);

-- keep 0006614f "ילכו מחיל אל חיל"; del 767fcfdf (06-12 copy of פרשת כי תשא lesson)
DELETE FROM lessons l WHERE l.id='767fcfdf-d5ac-5793-8576-a232c8610a4b'
  AND l.series_id='e33c840d-a898-4776-9bfe-8be50419b4ad'
  AND NOT EXISTS (SELECT 1 FROM lesson_comments   c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_dedications c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_topics      c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_favorites     c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_history       c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_enrollments   c WHERE c.last_lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lessons            c WHERE c.copied_from=l.id)
  AND EXISTS (SELECT 1 FROM lessons k WHERE k.id='0006614f-bc7a-440a-9655-1d13e2deea3d' AND k.series_id=l.series_id);

-- keep 03177fc1 "שחורה אני ונאוה"; del 548c2444 (06-12 copy of פרשת כי תשא lesson)
DELETE FROM lessons l WHERE l.id='548c2444-aec1-5bc2-a229-af2059977289'
  AND l.series_id='e33c840d-a898-4776-9bfe-8be50419b4ad'
  AND NOT EXISTS (SELECT 1 FROM lesson_comments   c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_dedications c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_topics      c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_favorites     c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_history       c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_enrollments   c WHERE c.last_lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lessons            c WHERE c.copied_from=l.id)
  AND EXISTS (SELECT 1 FROM lessons k WHERE k.id='03177fc1-ed38-44f0-ba12-90a4f38f9151' AND k.series_id=l.series_id);

-- keep 01fff1b9 "שני לחת אבנים כראשנים"; del 2a027817 (06-12 copy of פרשת כי תשא lesson)
DELETE FROM lessons l WHERE l.id='2a027817-55d4-56e3-b900-67d0662a2664'
  AND l.series_id='e33c840d-a898-4776-9bfe-8be50419b4ad'
  AND NOT EXISTS (SELECT 1 FROM lesson_comments   c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_dedications c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_topics      c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_favorites     c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_history       c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_enrollments   c WHERE c.last_lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lessons            c WHERE c.copied_from=l.id)
  AND EXISTS (SELECT 1 FROM lessons k WHERE k.id='01fff1b9-b0a0-4190-aa1f-7043946dff7d' AND k.series_id=l.series_id);

-- keep 17d1478e "תורה מאתי תצא"; del 9a05cae3 (06-12 copy of פרשת כי תשא lesson)
DELETE FROM lessons l WHERE l.id='9a05cae3-9799-5b84-aa54-b7d8a86dd5cc'
  AND l.series_id='e33c840d-a898-4776-9bfe-8be50419b4ad'
  AND NOT EXISTS (SELECT 1 FROM lesson_comments   c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_dedications c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_topics      c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_favorites     c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_history       c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_enrollments   c WHERE c.last_lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lessons            c WHERE c.copied_from=l.id)
  AND EXISTS (SELECT 1 FROM lessons k WHERE k.id='17d1478e-f128-4ba6-8c07-80e463533ada' AND k.series_id=l.series_id);

-- ===== שמות · שיעורים על התנ\"ך - שמות (בן שחר) 6b22958d · 10 -> 9 (del 1) =====
-- keep 2cb0f3af "בגדי הכהונה" (02-23, content+audio, lesson_topics + incoming copy);
--   del b63c302c (03-08 copy, content+audio, no FK)
DELETE FROM lessons l WHERE l.id='b63c302c-b231-47a9-8842-8442c378e313'
  AND l.series_id='6b22958d-e3f0-4914-a3d2-c3356e826f3f'
  AND NOT EXISTS (SELECT 1 FROM lesson_comments   c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_dedications c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_topics      c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_favorites     c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_history       c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_enrollments   c WHERE c.last_lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lessons            c WHERE c.copied_from=l.id)
  AND EXISTS (SELECT 1 FROM lessons k WHERE k.id='2cb0f3af-4463-4974-bca9-805d94bc2789' AND k.series_id=l.series_id);

-- ----------------------------------------------------------------------------
-- SECTION B — 3 FK-BLOCKED targets (delete-target carries blocking child rows).
-- Resolution = REPOINT the safe child rows (lesson_topics / user_history) to the
-- canonical, THEN delete. lesson_topics & user_history are de-dup-safe to repoint
-- (a topic tag / a watch record simply attaches to the surviving identical lesson).
-- ON CONFLICT guards avoid duplicate (lesson_id,*) rows on the canonical.
-- ----------------------------------------------------------------------------

-- B1) שמות · מאמרים על הפרשה - חומש שמות (ונגרובר) 5b2527d0 · "הדרך אל הגאולה" · 5 -> 4
--     identical content (clen 18010 both). keep e1ed7e1f (03-13, has incoming copy);
--     del 3cdc934f (02-23) which has lesson_topics:1. Repoint that topic, then delete.
UPDATE lesson_topics t
   SET lesson_id='e1ed7e1f-4166-4cdb-aa93-e836dadca8cb'
 WHERE t.lesson_id='3cdc934f-0db0-4348-903b-111383ab99eb'
   AND NOT EXISTS (SELECT 1 FROM lesson_topics t2
                   WHERE t2.lesson_id='e1ed7e1f-4166-4cdb-aa93-e836dadca8cb'
                     AND t2.topic_id=t.topic_id);
-- if a duplicate (lesson_id,topic_id) already exists on the canonical, drop the loser's row
DELETE FROM lesson_topics t
 WHERE t.lesson_id='3cdc934f-0db0-4348-903b-111383ab99eb'
   AND EXISTS (SELECT 1 FROM lesson_topics t2
               WHERE t2.lesson_id='e1ed7e1f-4166-4cdb-aa93-e836dadca8cb'
                 AND t2.topic_id=t.topic_id);
DELETE FROM lessons l WHERE l.id='3cdc934f-0db0-4348-903b-111383ab99eb'
  AND l.series_id='5b2527d0-751b-45d3-a691-90b2ce521cdc'
  AND NOT EXISTS (SELECT 1 FROM lesson_comments   c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_dedications c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_topics      c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_favorites     c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_history       c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_enrollments   c WHERE c.last_lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lessons            c WHERE c.copied_from=l.id)
  AND EXISTS (SELECT 1 FROM lessons k WHERE k.id='e1ed7e1f-4166-4cdb-aa93-e836dadca8cb' AND k.series_id=l.series_id);

-- B2) במדבר · מתקרבים לפרשה - סרטונים קצרים (אוריאל) 77adb8ce · "איך העיז קורח..." · 6 -> 5
--     punctuation-variant dup (master-plan flagged). keep ef803466 (02-23, lesson_topics
--     + incoming copy); del f9653c4c (06-01) which has user_history:1. Repoint watch
--     history to canonical, then delete.
UPDATE user_history h
   SET lesson_id='ef803466-c078-48b7-a02d-479db28f545a'
 WHERE h.lesson_id='f9653c4c-391e-436e-84a1-3ff15b5ac1ce'
   AND NOT EXISTS (SELECT 1 FROM user_history h2
                   WHERE h2.lesson_id='ef803466-c078-48b7-a02d-479db28f545a'
                     AND h2.user_id=h.user_id);
DELETE FROM user_history h
 WHERE h.lesson_id='f9653c4c-391e-436e-84a1-3ff15b5ac1ce'
   AND EXISTS (SELECT 1 FROM user_history h2
               WHERE h2.lesson_id='ef803466-c078-48b7-a02d-479db28f545a'
                 AND h2.user_id=h.user_id);
DELETE FROM lessons l WHERE l.id='f9653c4c-391e-436e-84a1-3ff15b5ac1ce'
  AND l.series_id='77adb8ce-3fb1-453d-8f51-5c9987e788f6'
  AND NOT EXISTS (SELECT 1 FROM lesson_comments   c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_dedications c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lesson_topics      c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_favorites     c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_history       c WHERE c.lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM user_enrollments   c WHERE c.last_lesson_id=l.id)
  AND NOT EXISTS (SELECT 1 FROM lessons            c WHERE c.copied_from=l.id)
  AND EXISTS (SELECT 1 FROM lessons k WHERE k.id='ef803466-c078-48b7-a02d-479db28f545a' AND k.series_id=l.series_id);

-- B3) ויקרא · שיעורים- חומש ויקרא (תירוש) d73c8425 · "עבד עברי" · 26 -> 25
--     ⚠️ YOAV DOUBT (master plan): BOTH "עבד עברי" copies point to a *משפטים* (שמות)
--     MP3 attributed to ג'יאמי -> possible MIS-IMPORT, not a plain clone. BOTH rows
--     also carry lesson_topics. NOT auto-deleted. Resolution deferred to Yoav.
--     Below is the repoint+delete kept COMMENTED until Yoav confirms which row (if
--     any) is the real ויקרא lesson and whether the משפטים MP3 should be re-sourced.
-- UPDATE lesson_topics t SET lesson_id='9de08b75-7a9e-466c-ba52-7b6ebc5ebbaa'
--  WHERE t.lesson_id='74c38a37-6c6e-4dc6-afb6-4c01bd87486e'
--    AND NOT EXISTS (SELECT 1 FROM lesson_topics t2 WHERE t2.lesson_id='9de08b75-7a9e-466c-ba52-7b6ebc5ebbaa' AND t2.topic_id=t.topic_id);
-- DELETE FROM lesson_topics t WHERE t.lesson_id='74c38a37-6c6e-4dc6-afb6-4c01bd87486e'
--    AND EXISTS (SELECT 1 FROM lesson_topics t2 WHERE t2.lesson_id='9de08b75-7a9e-466c-ba52-7b6ebc5ebbaa' AND t2.topic_id=t.topic_id);
-- DELETE FROM lessons l WHERE l.id='74c38a37-6c6e-4dc6-afb6-4c01bd87486e'
--   AND l.series_id='d73c8425-d2ec-4cb7-9857-0f02e03a12f6'
--   AND NOT EXISTS (SELECT 1 FROM lesson_comments c WHERE c.lesson_id=l.id)
--   AND NOT EXISTS (SELECT 1 FROM lesson_dedications c WHERE c.lesson_id=l.id)
--   AND NOT EXISTS (SELECT 1 FROM lesson_topics c WHERE c.lesson_id=l.id)
--   AND NOT EXISTS (SELECT 1 FROM user_favorites c WHERE c.lesson_id=l.id)
--   AND NOT EXISTS (SELECT 1 FROM user_history c WHERE c.lesson_id=l.id)
--   AND NOT EXISTS (SELECT 1 FROM user_enrollments c WHERE c.last_lesson_id=l.id)
--   AND NOT EXISTS (SELECT 1 FROM lessons c WHERE c.copied_from=l.id)
--   AND EXISTS (SELECT 1 FROM lessons k WHERE k.id='9de08b75-7a9e-466c-ba52-7b6ebc5ebbaa' AND k.series_id=l.series_id);

-- ----------------------------------------------------------------------------
-- SECTION C — refresh series.lesson_count to the live published count for every
-- touched series (idempotent; recomputes from lessons).
-- ----------------------------------------------------------------------------
UPDATE series s
   SET lesson_count = sub.cnt
  FROM (
    SELECT series_id, COUNT(*) FILTER (WHERE status='published') AS cnt
    FROM lessons
    WHERE series_id IN (
      'a5505b1a-0b55-4558-8b98-88e13e88793b', -- מאמרים על פרשיות בראשית
      '46bbc3f2-722a-4c00-8996-9db9a0fb441e', -- קדושת פשוטו של מקרא בראשית
      'ab762d8c-d18b-452a-9263-201ccd019625', -- מאמרים קצרים - חומש בראשית
      'b831dccd-9716-47aa-94be-49f27655ef65', -- מאמרים - חומש דברים
      '4d90e367-7613-49e0-9069-89ab12093cc2', -- פרשת שבוע- דברים
      '8c74988d-490b-423b-8c2a-9730c715e20b', -- מאמרים על פרשיות דברים
      'e33c840d-a898-4776-9bfe-8be50419b4ad', -- מאמרים על פרשיות שמות
      '5b2527d0-751b-45d3-a691-90b2ce521cdc', -- מאמרים על הפרשה - חומש שמות
      '6b22958d-e3f0-4914-a3d2-c3356e826f3f', -- שיעורים על התנ"ך - שמות
      '77adb8ce-3fb1-453d-8f51-5c9987e788f6'  -- מתקרבים לפרשה - סרטונים קצרים
      -- d73c8425 (ויקרא עבד עברי) intentionally omitted — deferred to Yoav, no delete
    )
    GROUP BY series_id
  ) sub
 WHERE s.id = sub.series_id;

-- ----------------------------------------------------------------------------
-- SECTION D — VERIFICATION (inspect before COMMIT). Each touched rabbi-series
-- real_count must equal its GT old_count (except e33c840d == 35, see §B note;
-- d73c8425 unchanged at 26 pending Yoav).
-- ----------------------------------------------------------------------------
SELECT s.id,
       s.title,
       s.lesson_count                                         AS stored_count,
       COUNT(l.*) FILTER (WHERE l.status='published')         AS real_count,
       v.gt_old                                               AS gt_old,
       (COUNT(l.*) FILTER (WHERE l.status='published') = v.gt_old) AS at_parity
FROM (VALUES
  ('a5505b1a-0b55-4558-8b98-88e13e88793b'::uuid, 53),
  ('46bbc3f2-722a-4c00-8996-9db9a0fb441e'::uuid, 24),
  ('ab762d8c-d18b-452a-9263-201ccd019625'::uuid, 14),
  ('b831dccd-9716-47aa-94be-49f27655ef65'::uuid, 45),
  ('4d90e367-7613-49e0-9069-89ab12093cc2'::uuid, 23),
  ('8c74988d-490b-423b-8c2a-9730c715e20b'::uuid, 18),
  ('e33c840d-a898-4776-9bfe-8be50419b4ad'::uuid, 35), -- 34 GT + 1 non-clone surplus (Yoav)
  ('5b2527d0-751b-45d3-a691-90b2ce521cdc'::uuid,  4),
  ('6b22958d-e3f0-4914-a3d2-c3356e826f3f'::uuid,  9),
  ('77adb8ce-3fb1-453d-8f51-5c9987e788f6'::uuid,  5),
  ('d73c8425-d2ec-4cb7-9857-0f02e03a12f6'::uuid, 26)  -- unchanged (Yoav defer); GT old=25
) AS v(sid, gt_old)
JOIN series  s ON s.id = v.sid
LEFT JOIN lessons l ON l.series_id = s.id
GROUP BY s.id, s.title, s.lesson_count, v.gt_old
ORDER BY s.title;

-- Guard: assert NO touched series became empty (min published >= 4).
SELECT 'EMPTY-SERIES-GUARD' AS chk,
       MIN(c) AS min_published_in_touched
FROM (
  SELECT COUNT(*) FILTER (WHERE status='published') AS c
  FROM lessons
  WHERE series_id IN (
    'a5505b1a-0b55-4558-8b98-88e13e88793b','46bbc3f2-722a-4c00-8996-9db9a0fb441e',
    'ab762d8c-d18b-452a-9263-201ccd019625','b831dccd-9716-47aa-94be-49f27655ef65',
    '4d90e367-7613-49e0-9069-89ab12093cc2','8c74988d-490b-423b-8c2a-9730c715e20b',
    'e33c840d-a898-4776-9bfe-8be50419b4ad','5b2527d0-751b-45d3-a691-90b2ce521cdc',
    '6b22958d-e3f0-4914-a3d2-c3356e826f3f','77adb8ce-3fb1-453d-8f51-5c9987e788f6')
  GROUP BY series_id
) z;

-- COMMIT;   -- uncomment after verifying at_parity = true for all rows above
-- ROLLBACK; -- otherwise
COMMIT;
