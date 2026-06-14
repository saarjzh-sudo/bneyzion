-- =====================================================================
-- plan_בראשית.sql  ·  Bnei-Zion 1:1 migration · REVIEW ROUND 1
-- Book: בראשית  ·  Author: parity-agent  ·  Generated against live DB
-- GROUND TRUTH: https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/בראשית/
-- =====================================================================
-- !!! DO NOT EXECUTE AS-IS. This is a REVIEW plan. !!!
-- Every statement is idempotent + guarded so a re-run is a no-op.
-- Wrap the whole thing in BEGIN; ... COMMIT; only after Saar approves.
-- READ-ONLY verification SELECTs are interleaved; run them first.
--
-- Scoping anchors (resolved & verified at plan time):
--   category 'בראשית'  parent_id = (תורה root)
--   audio  series 9de1aa21-ee7a-4f53-a07f-b718688c2ba3  "הרב אבינר על פרשיות בראשית"        (old=10 audio mp3)
--   docx   series b2e079cd-15cf-4172-ab57-60b362f8e74c  "הרב שלמה אבינר על פרשיות בראשית"   (old=15 docx/pdf, new=1)
--   rabbi  הרב שלמה אבינר = 277e3084-aaff-44e6-a83a-5facf893607e
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. SCOPING SELECTS (run first, must return the expected anchors)
-- ---------------------------------------------------------------------
-- 0a. category id
SELECT id AS breishit_category_id
FROM series
WHERE title='בראשית' AND status='category'
  AND parent_id=(SELECT id FROM series WHERE title='תורה' AND parent_id IS NULL);
-- expect exactly 1 row.

-- 0b. the two אבינר series under that category
SELECT id,title,status,
       (SELECT count(*) FROM lessons l WHERE l.series_id=s.id AND l.status='published') AS real
FROM series s
WHERE s.parent_id=(SELECT id FROM series WHERE title='בראשית' AND status='category'
                   AND parent_id=(SELECT id FROM series WHERE title='תורה' AND parent_id IS NULL))
  AND s.title IN ('הרב אבינר על פרשיות בראשית','הרב שלמה אבינר על פרשיות בראשית');
-- expect: audio=25, docx=1  (BEFORE fix)


-- =====================================================================
-- FIX 1  ·  אבינר series split (Saar's primary complaint)
--          15 docx/pdf lessons were dumped into the AUDIO series 9de1
--          and must move to the DOCX series b2e0.
--          Match key = legacy_attachment_url media-id (the gold key).
-- =====================================================================
-- The 15 GT docx lessons by media-id (in GT order):
--   144394 144395 144408 144405 144396 144406 144407 144416
--   144397 144429 144431 144398 144428 144430 144440
-- Status in DB:
--   * 144440 already correctly in b2e0 (1 lesson) -> leave.
--   * 13 distinct media live (misplaced) in 9de1 sorts 110-220 -> MOVE.
--   * media 144408 appears 3x in 9de1 (sorts 130/230/240) — only the
--     GTidx3 copy (sort 130 "מחלוקת לשם שמים") is the real docx lesson;
--     sorts 230/240 are parsha-COPY clones (same href, diff display title)
--     -> they are display-dedup concerns, NOT moved here (see FIX 4).
--   * sort 250 (media 144440) in 9de1 is a COPY clone of b2e0's lesson
--     -> NOT moved (b2e0 already has 144440). Flag display-dedup.
--   * media 144428 & 144430 are MISSING from DB entirely -> INSERT (FIX 2).

-- 1a. MOVE the 13 genuinely-misplaced docx lessons from 9de1 -> b2e0.
--     Guard: only move rows currently parented to 9de1 (idempotent: after
--     the move they no longer match the WHERE, re-run = 0 rows).
--     We move by explicit lesson-id list (verified) to avoid touching the
--     144408 clones (sorts 230/240) and the 144440 clone (sort 250).
UPDATE lessons
SET series_id='b2e079cd-15cf-4172-ab57-60b362f8e74c'
WHERE series_id='9de1aa21-ee7a-4f53-a07f-b718688c2ba3'
  AND id IN (
    '13e836fd-d0a2-4e88-b33c-7f5f155f0f27', -- 144394 וישלח תשעט (sort110)
    '1ba39bbf-98f4-468b-b6e1-e827feedaa50', -- 144395 וישב  תשעט (sort120)
    '5697b566-f600-4545-905d-a1123d4911fa', -- 144408 וישב  תשף  (sort130) GTidx3
    '1319b6a6-d57a-4d25-b09d-0aa3153998f4', -- 144405 וישב  תשעה (sort140)
    '86553db8-81f0-4643-96fa-e4f10efbe4db', -- 144396 מקץ   תשעט (sort150)
    '41e2cf0a-ddd9-4a5a-adf2-861cd0f20507', -- 144406 מקץ   תשעה (sort160)
    'a3e5d327-d296-47f7-a1e8-dc0ad706e16b', -- 144407 מקץ   תשעז (sort170)
    '209e6d5d-9112-4321-8c73-9cb9f3e00ce2', -- 144416 מקץ   תשף  (sort180)
    '6030ef11-5ad0-49cc-ad11-16a974af96d3', -- 144397 ויגש  תשעט (sort190)
    'ab92c2be-aeb7-4884-a538-06e5a9f9c076', -- 144429 ויגש  תשעה (sort200)
    'd37fd8d6-a5e5-4b54-b3dc-6ae7d30e60ac', -- 144431 ויגש  התשף (sort210)
    'f97ea221-a35f-4321-b478-2c452c0a660a'  -- 144398 ויחי  תשעט (sort220)
  );
-- expected: 12 rows moved.  (13 distinct docx media minus 144408-which-
-- is-1-of-3-here = 12 ids; the 13th distinct, 144408, IS in the list once.)
-- NOTE: list contains exactly the 12 unique non-clone docx lessons.

-- 1b. Re-sort b2e0 into GT order (1..15) by media-id, so the docx series
--     reads in the old sequence. Guarded: only sets sort_order, no-op on re-run
--     because values are deterministic.
WITH ord(media,pos) AS (VALUES
  ('144394',1),('144395',2),('144408',3),('144405',4),('144396',5),
  ('144406',6),('144407',7),('144416',8),('144397',9),('144429',10),
  ('144431',11),('144398',12),('144428',13),('144430',14),('144440',15))
UPDATE lessons l
SET sort_order = o.pos*10
FROM ord o
WHERE l.series_id='b2e079cd-15cf-4172-ab57-60b362f8e74c'
  AND l.legacy_attachment_url LIKE '%/media/'||o.media||'/%';


-- =====================================================================
-- FIX 2  ·  Insert the 2 MISSING docx lessons (144428, 144430) into b2e0.
--           Source = old docx-series page rows (GTidx 13 & 14).
--           Rule 13 (rehost): there is NO needs_rehost column in `lessons`.
--           Rehost convention in THIS schema = attachment_url left NULL while
--           legacy_attachment_url holds the bneyzion.co.il source; a downstream
--           rehost pass mirrors legacy -> Supabase storage and fills attachment_url
--           (exactly how every other lesson's attachment_url got a supabase URL).
--           So: INSERT with attachment_url=NULL + legacy_attachment_url set.
--           Columns used: id,series_id,title,rabbi_id,bible_book,
--                         legacy_attachment_url,source_type,sort_order,status.
-- =====================================================================
-- 2a. 144428 — ויחי תשעז  (GTidx13)
INSERT INTO lessons (id, series_id, title, rabbi_id, bible_book,
                     attachment_url, legacy_attachment_url, source_type,
                     sort_order, status)
SELECT gen_random_uuid(),
       'b2e079cd-15cf-4172-ab57-60b362f8e74c',
       'הרב שלמה אבינר',
       '277e3084-aaff-44e6-a83a-5facf893607e',
       'בראשית',
       NULL,
       'https://www.bneyzion.co.il/media/144428/הרב-אבינר-ויחי-תשעז.docx',
       'text', 130, 'published'
WHERE NOT EXISTS (
  SELECT 1 FROM lessons WHERE legacy_attachment_url LIKE '%/media/144428/%');

-- 2b. 144430 — ויחי תשעה  (GTidx14)
INSERT INTO lessons (id, series_id, title, rabbi_id, bible_book,
                     attachment_url, legacy_attachment_url, source_type,
                     sort_order, status)
SELECT gen_random_uuid(),
       'b2e079cd-15cf-4172-ab57-60b362f8e74c',
       'הרב שלמה אבינר',
       '277e3084-aaff-44e6-a83a-5facf893607e',
       'בראשית',
       NULL,
       'https://www.bneyzion.co.il/media/144430/הרב-אבינר-ויחי-תשעה.docx',
       'text', 140, 'published'
WHERE NOT EXISTS (
  SELECT 1 FROM lessons WHERE legacy_attachment_url LIKE '%/media/144430/%');
-- After insert, queue these 2 legacy URLs for the standard Rule-13 rehost pass
-- (mirror to lesson-attachments bucket, then set attachment_url). attachment_url
-- NULL is the rehost-pending marker in this schema.


-- =====================================================================
-- FIX 3  ·  Two GT rabbi-series are MISPARENTED (live under wrong parent),
--           so they never render on the בראשית category page.
--           They EXIST with full lessons — only re-parent, do NOT recreate.
-- =====================================================================
-- 3a. "קדושת פשוטו של מקרא בראשית"  46bbc3f2-...  currently parent='תורה' root
--      -> move under the בראשית category. (old=24, new real=28 -> OVER by 4,
--      flag for display-dedup, not deleted.)
UPDATE series
SET parent_id=(SELECT id FROM series WHERE title='בראשית' AND status='category'
               AND parent_id=(SELECT id FROM series WHERE title='תורה' AND parent_id IS NULL))
WHERE id='46bbc3f2-722a-4c00-8996-9db9a0fb441e'
  AND parent_id <> (SELECT id FROM series WHERE title='בראשית' AND status='category'
               AND parent_id=(SELECT id FROM series WHERE title='תורה' AND parent_id IS NULL));

-- 3b. "תולדות קרבת ה לאדם מבראשית לאורך חומשי התורה"  d7a37161-...
--      currently parent='נושאים כלליים בתנ"ך'. old=4, new=4 (exact).
--      ⚠️ AMBIGUOUS: in the OLD site this title is listed on the בראשית
--      category page (a cross-chumash series anchored in בראשית). Re-parenting
--      it under בראשית is the literal parity fix, BUT it may be intentionally a
--      general-topics node. -> SAAR DECISION (doubt Y1). SQL provided, GUARDED,
--      left commented out pending approval:
-- UPDATE series
-- SET parent_id=(SELECT id FROM series WHERE title='בראשית' AND status='category'
--                AND parent_id=(SELECT id FROM series WHERE title='תורה' AND parent_id IS NULL))
-- WHERE id='d7a37161-18f4-49a6-adcc-d88a2d1fbc56'
--   AND parent_id <> (SELECT id FROM series WHERE title='בראשית' AND status='category'
--                AND parent_id=(SELECT id FROM series WHERE title='תורה' AND parent_id IS NULL));


-- =====================================================================
-- FIX 4  ·  UNDER-FILLED standalone series with media missing (NOT אבינר)
-- =====================================================================
-- "שיעורים על התנ"ך - בראשית"  75c09aee-...  old=4, new=0  status='published'
--   -> 4 audio lessons exist on the old series page but are ABSENT in DB.
--   ⚠️ The GT manifest captured these as placeholder rows WITHOUT title/href
--      (scraper limitation). Cannot author reliable guarded inserts without
--      media hrefs. -> RE-SCRAPE the old series page, then insert. (doubt Y2)
--   No SQL emitted here on purpose — inserting blind would create junk rows.


-- =====================================================================
-- STEP D  ·  12 parsha event-series (sidebar nodes) — KEEP, no SQL.
--   They are correct children; CODE excludes them from the category page.
--   (Verified present: בראשית|א-ו, נח|ו-יא, לך לך|יב-יז, וירא|יח-כב,
--    חיי שרה|כג-כה, תולדות|כה-כח, ויצא|כח-לב, וישלח|לב-לו, וישב|לז-מ,
--    מקץ|מא-מד, ויגש|מד-מז, ויחי|מז-נ).  No DB change.
-- =====================================================================


-- =====================================================================
-- VERIFICATION SELECTS  (run AFTER the fixes; expected values noted)
-- =====================================================================
-- V1. אבינר split fixed: audio=10, docx=15
SELECT title,
       (SELECT count(*) FROM lessons l WHERE l.series_id=s.id AND l.status='published') AS real
FROM series s
WHERE s.id IN ('9de1aa21-ee7a-4f53-a07f-b718688c2ba3',
               'b2e079cd-15cf-4172-ab57-60b362f8e74c');
-- expect: "הרב אבינר על פרשיות בראשית"   = 13   (25 - 12 moved)
--         "הרב שלמה אבינר על פרשיות בראשית" = 15  (1 + 12 moved + 2 inserted)
-- NOTE on the audio series landing at 13 (old=10, +3 over):
--   The 3 rows left over (sorts 230/240/250) are ORIGINALS (copied_from=NULL),
--   not parsha clones, but they share PDFs already counted:
--     sort230 "לראות את הפנימיות"      media144408 (dup of sort130 PDF)
--     sort240 "אפשר לאהוב גם את השונה"  media144408 (dup of sort130 PDF)
--     sort250 "ראובן בכורי אתה"        media144440 (dup of b2e0's real lesson)
--   In the OLD docx-series page 144408 appears ONCE and 144440 ONCE, so these 3
--   are surplus rows the migration over-generated. They are NOT in the old AUDIO
--   series (10 mp3) either. -> FLAG for Saar: either (a) display-dedup by media-id
--   so the audio card shows 10, or (b) physically delete sorts 230/240/250 (FK-safe:
--   each has a parsha clone pointing at it via copied_from — deleting the ORIGINAL
--   would orphan the clone, so DO NOT delete blindly). Left as a flagged doubt (Y4),
--   no destructive SQL emitted.

-- V2. docx series in GT order
SELECT sort_order, title, legacy_attachment_url
FROM lessons
WHERE series_id='b2e079cd-15cf-4172-ab57-60b362f8e74c' AND status='published'
ORDER BY sort_order;
-- expect 15 rows.

-- V3. misparent fixes landed under בראשית
SELECT id,title,(SELECT title FROM series p WHERE p.id=s.parent_id) AS parent
FROM series s WHERE s.id IN ('46bbc3f2-722a-4c00-8996-9db9a0fb441e',
                             'd7a37161-18f4-49a6-adcc-d88a2d1fbc56');
-- expect 46bbc3f2 parent='בראשית'  (d7a37161 only if FIX3b approved)

-- V4. rehost inserts present (attachment_url NULL = rehost-pending marker)
SELECT id,title,attachment_url,legacy_attachment_url,source_type
FROM lessons
WHERE legacy_attachment_url LIKE '%/media/144428/%'
   OR legacy_attachment_url LIKE '%/media/144430/%';
-- expect 2 rows, attachment_url IS NULL, both in series b2e0.
-- =====================================================================
-- END plan_בראשית.sql
-- =====================================================================
