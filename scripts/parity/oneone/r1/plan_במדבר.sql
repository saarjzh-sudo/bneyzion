-- =====================================================================
-- plan_במדבר.sql  ·  Bnei-Zion 1:1 migration · REVIEW ROUND 1 · book=במדבר
-- READ-ONLY VERIFICATION PROVIDED — DO NOT EXECUTE BLINDLY. Idempotent + guarded.
-- Author: parity agent. Ground truth = old www.bneyzion.co.il category page.
-- Scope: category 'במדבר' under 'תורה'. Parsha event-series (title LIKE 'פרשת% | %')
--        are sidebar nodes ONLY and are EXCLUDED from the category page BY CODE,
--        not by this SQL. This SQL only fixes lesson misassignment so per-series
--        counts match the old site.
-- =====================================================================
BEGIN;

-- Guard: confirm the category exists and ids are the expected ones.
DO $$
DECLARE cat uuid;
BEGIN
  SELECT id INTO cat FROM series WHERE title='במדבר' AND status='category'
    AND parent_id=(SELECT id FROM series WHERE title='תורה' AND parent_id IS NULL);
  IF cat IS NULL THEN RAISE EXCEPTION 'במדבר category not found — abort'; END IF;
END $$;

-- ---------------------------------------------------------------------
-- STEP 1 · אבינר split-fix  (under-filled d860d934 / over-filled 6ba0b449)
-- The migration MERGED both old אבינר series into 6ba0b449 (36 rows = old#1 16
-- + old#15 19 + 1 dup). Restore old layout: 6ba0b449 = old#1 (16), d860d934 =
-- old#15 (19). MOVE the 19 old#15 rows from 6ba0b449 -> d860d934.
-- d860d934 currently holds 6 COPY clones of 6 of these lessons -> they become
-- duplicates AFTER the move; flagged for display-dedup (NOT deleted, per rules).
-- 19 rows to move:
UPDATE lessons SET series_id='d860d934-c76d-47d7-a988-5fe21358b3bd', updated_at=now()
 WHERE series_id='6ba0b449-f49a-4414-9b74-dc6e3f97a149' AND id IN (
   'fe67d6e1-57c3-4867-8733-a793b4d29c01',
   '1eeb81bd-92f3-4e1e-9091-a2c8d290f6a9',
   'be453678-9ca5-40aa-9c0c-ce6e3f4a9592',
   'd5b8d055-c1f5-4de1-8113-6ac808539076',
   'cdd23dbe-21a7-4610-9478-63341b50873f',
   '6ab3ca6b-d597-4667-8165-3adf919add93',
   'cd5835da-38f7-468e-8ce1-6032415a4684',
   '5338c9d3-0221-5a00-8169-75100e9c0017',
   '20dbef92-4e48-4bb8-a78d-575ded008499',
   '16fe73b0-e3cb-4b8d-bc6d-2a57662c109b',
   'da3cb060-85c7-5bd8-9c72-49be1fc79149',
   'c53ef868-c183-4e28-8edd-efb785b897b2',
   '37188fd8-ef5d-4172-9d69-d40922b60f2a',
   'c2e4430f-8749-5cc2-b3e3-59bcb4c05242',
   'a7d6c69e-3f63-5ccd-a1ed-5c2fbb523995',
   '57f7b34f-c930-443f-8fe0-0507616ecb50',
   'ae951fdd-a5bf-4c18-9a88-9c912566036d',
   '9b5ed4dd-50a8-549c-9498-acbf8210718e',
   '52041675-c8c8-4ddb-99fc-c371a8c73e27'
 );
-- (Guard: re-run is a no-op — rows already moved won't match series_id='6ba0b449...'.)

-- ---------------------------------------------------------------------
-- STEP 2 · קדושת פשוטו של מקרא - במדבר  (48adc2eb)  EMPTY: 0 vs old 19
-- All 19 lessons EXIST in DB (scattered across parsha-event series + 'שיעורים
-- כלליים'). The canonical book-series got none. INSERT 19 standalone CLONES into
-- 48adc2eb (clone real media from the in-book source row; set bible_book='במדבר').
-- Guarded by copied_from so re-run is a no-op.
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,sort_order,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, '48adc2eb-8857-5cc6-b80f-1a88a4a40000', src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, 10, src.audience_tags, src.id
  FROM lessons src WHERE src.id='55f0be6b-60c3-41be-9cba-aa8c60f15eb6'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id='48adc2eb-8857-5cc6-b80f-1a88a4a40000' AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,sort_order,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, '48adc2eb-8857-5cc6-b80f-1a88a4a40000', src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, 20, src.audience_tags, src.id
  FROM lessons src WHERE src.id='89175568-87c3-4449-b459-e66147b656e1'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id='48adc2eb-8857-5cc6-b80f-1a88a4a40000' AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,sort_order,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, '48adc2eb-8857-5cc6-b80f-1a88a4a40000', src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, 30, src.audience_tags, src.id
  FROM lessons src WHERE src.id='e574329d-bfbe-4cc5-b9a2-a3f5eec4631a'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id='48adc2eb-8857-5cc6-b80f-1a88a4a40000' AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,sort_order,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, '48adc2eb-8857-5cc6-b80f-1a88a4a40000', src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, 40, src.audience_tags, src.id
  FROM lessons src WHERE src.id='4124b3c7-876d-4391-9703-f5320e24bbbd'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id='48adc2eb-8857-5cc6-b80f-1a88a4a40000' AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,sort_order,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, '48adc2eb-8857-5cc6-b80f-1a88a4a40000', src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, 50, src.audience_tags, src.id
  FROM lessons src WHERE src.id='91971796-a1ba-4242-a257-913aaa125320'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id='48adc2eb-8857-5cc6-b80f-1a88a4a40000' AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,sort_order,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, '48adc2eb-8857-5cc6-b80f-1a88a4a40000', src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, 60, src.audience_tags, src.id
  FROM lessons src WHERE src.id='01f98894-fe95-4ff4-b6a4-87878eef76ea'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id='48adc2eb-8857-5cc6-b80f-1a88a4a40000' AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,sort_order,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, '48adc2eb-8857-5cc6-b80f-1a88a4a40000', src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, 70, src.audience_tags, src.id
  FROM lessons src WHERE src.id='132c1de6-2075-43f3-a72e-2a53753828d4'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id='48adc2eb-8857-5cc6-b80f-1a88a4a40000' AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,sort_order,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, '48adc2eb-8857-5cc6-b80f-1a88a4a40000', src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, 80, src.audience_tags, src.id
  FROM lessons src WHERE src.id='df93826a-c756-49f9-a355-dabe4d0d24c5'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id='48adc2eb-8857-5cc6-b80f-1a88a4a40000' AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,sort_order,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, '48adc2eb-8857-5cc6-b80f-1a88a4a40000', src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, 90, src.audience_tags, src.id
  FROM lessons src WHERE src.id='42d9eeb8-bd95-4503-b9c3-de5ee198c927'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id='48adc2eb-8857-5cc6-b80f-1a88a4a40000' AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,sort_order,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, '48adc2eb-8857-5cc6-b80f-1a88a4a40000', src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, 100, src.audience_tags, src.id
  FROM lessons src WHERE src.id='2cdb0b27-1f75-4621-9e96-a7b3cf3cff39'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id='48adc2eb-8857-5cc6-b80f-1a88a4a40000' AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,sort_order,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, '48adc2eb-8857-5cc6-b80f-1a88a4a40000', src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, 110, src.audience_tags, src.id
  FROM lessons src WHERE src.id='f2dfcb2a-4936-4854-89ba-561ecaf31c88'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id='48adc2eb-8857-5cc6-b80f-1a88a4a40000' AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,sort_order,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, '48adc2eb-8857-5cc6-b80f-1a88a4a40000', src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, 120, src.audience_tags, src.id
  FROM lessons src WHERE src.id='97c2e8bd-4ff4-4b0e-a517-e03a0eeba28f'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id='48adc2eb-8857-5cc6-b80f-1a88a4a40000' AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,sort_order,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, '48adc2eb-8857-5cc6-b80f-1a88a4a40000', src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, 130, src.audience_tags, src.id
  FROM lessons src WHERE src.id='ea6154d5-a47d-4d74-b7de-9229518cbd1d'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id='48adc2eb-8857-5cc6-b80f-1a88a4a40000' AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,sort_order,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, '48adc2eb-8857-5cc6-b80f-1a88a4a40000', src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, 140, src.audience_tags, src.id
  FROM lessons src WHERE src.id='22b13c95-fcb5-448e-bd46-16d0ec619f5e'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id='48adc2eb-8857-5cc6-b80f-1a88a4a40000' AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,sort_order,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, '48adc2eb-8857-5cc6-b80f-1a88a4a40000', src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, 150, src.audience_tags, src.id
  FROM lessons src WHERE src.id='f25a4dd6-03c9-48d9-ab25-e8747d44cf37'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id='48adc2eb-8857-5cc6-b80f-1a88a4a40000' AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,sort_order,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, '48adc2eb-8857-5cc6-b80f-1a88a4a40000', src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, 160, src.audience_tags, src.id
  FROM lessons src WHERE src.id='b6e0b6ea-e355-5dd4-a429-0b34e73f0654'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id='48adc2eb-8857-5cc6-b80f-1a88a4a40000' AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,sort_order,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, '48adc2eb-8857-5cc6-b80f-1a88a4a40000', src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, 170, src.audience_tags, src.id
  FROM lessons src WHERE src.id='a3aee10e-91a7-4b0e-911c-c5e072bfb3ff'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id='48adc2eb-8857-5cc6-b80f-1a88a4a40000' AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,sort_order,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, '48adc2eb-8857-5cc6-b80f-1a88a4a40000', src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, 180, src.audience_tags, src.id
  FROM lessons src WHERE src.id='4178e67a-fac7-49c6-b9a3-920a752f9891'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id='48adc2eb-8857-5cc6-b80f-1a88a4a40000' AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,sort_order,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, '48adc2eb-8857-5cc6-b80f-1a88a4a40000', src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, 190, src.audience_tags, src.id
  FROM lessons src WHERE src.id='226b6c21-0860-48d9-8c61-3cbc9fd2bcd5'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id='48adc2eb-8857-5cc6-b80f-1a88a4a40000' AND d.copied_from=src.id);

-- ---------------------------------------------------------------------
-- STEP 3 · מידות בפרשה  (dfb8c480)  27 vs old 28 — 1 missing lesson
-- 'טלית שכולה אמת' is NOT in the DB at all. INSERT a placeholder row (NULL media).
-- ⚠ YOAV DOUBT: media href unknown (manifest carried title+author only). Needs
--   the old series-page media URL before this lesson is playable.
INSERT INTO lessons (id,title,rabbi_id,series_id,bible_book,source_type,status,sort_order,audience_tags)
  SELECT gen_random_uuid(),'טלית שכולה אמת','b28770d5-1504-46ad-8613-3c3ca37a641c','dfb8c480-35cd-4e8c-9f1d-a3a4c2666213','במדבר','text','published',999,ARRAY['general']
  WHERE NOT EXISTS (
    SELECT 1 FROM lessons d WHERE d.series_id='dfb8c480-35cd-4e8c-9f1d-a3a4c2666213'
      AND regexp_replace(d.title,'[\u0591-\u05C7]','','g')='טלית שכולה אמת');

-- ---------------------------------------------------------------------
-- STEP 4 · STANDALONE lessons (25) — old category page flat rows, series_id NULL
-- All 25 EXIST in DB but only nested inside parsha-event series. INSERT standalone
-- CLONES (series_id NULL, bible_book='במדבר') so they render as flat category rows
-- like the old site. Existing nested copies stay (sidebar). Guarded by copied_from.
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='330f15ea-f90b-4e95-a396-8a9f0f283bdf'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='f74be635-4b41-476b-8558-ca605c4a11dc'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='7b8d0f11-de82-5b44-bb69-3cb726ad3775'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='5cfb6765-fa31-4e9c-81de-9de10c66bd22'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='ede82f3c-27d8-49ef-9e46-8c5341f364b4'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='570b6218-a231-4e2c-8e19-76dfa346d96d'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='23be588d-3de5-4d74-8359-0cf6b7bc5f8d'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='58dfbea4-3575-4d4d-a440-fb69133adc83'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='9fb8d2e6-f93a-4f80-b752-4f1d42b18e8b'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='94ceeefc-c407-5945-9ed2-f6f29cd79e3f'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='d7a2c2f3-6fd6-4fe9-a0aa-63d793b4eee7'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='34f227b6-6975-44c2-9f27-caa1cac6722c'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='fdd5fdfc-0916-495b-ba02-d764f5edef5d'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='ebf2668b-5b7d-4f52-bba7-605854eaab55'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='565dbfef-10f4-4083-a4a3-274b65a30fd2'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='f805cb1d-a05a-4981-bc4d-8b632c9665d8'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='a882a8a5-e2d2-4633-8314-c633966138bf'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='9d27836c-01d0-442c-a49b-8eaa60d90a35'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='95a8ca4b-f3f3-52e7-ab0d-6cef47cfbded'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='14ecc050-e8a3-4f70-8d96-916c30324eba'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='cde8bdf7-38da-4cc1-9970-c40718363c1b'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='8369acd7-f36f-4656-be26-629be20554ee'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='cee1fb2f-3925-4a38-9ec6-53b4e7245790'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='27139211-d915-432d-87d1-3cbf7170d04f'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', src.content_type, src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='64389c1d-2af3-4510-8bfa-30a86e83ef9d'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);

-- ---------------------------------------------------------------------
-- STEP 5 · שו"ת rows (10) — old category page flat שו"ת rows, series_id NULL
-- Same treatment as standalone. content_type tagged 'shut' for code to render the
-- שו"ת column. Guarded by copied_from.
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', COALESCE(src.content_type,'shut'), src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='56c7c947-44cc-4630-98a5-ef6fa4e21c01'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', COALESCE(src.content_type,'shut'), src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='322ed7ae-36df-4085-8d94-203ed9ed7c9a'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', COALESCE(src.content_type,'shut'), src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='7a0a0ffb-ea93-45f3-bbdf-7eb71d05769b'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', COALESCE(src.content_type,'shut'), src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='13097422-2230-42f1-8766-c33585a0287d'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', COALESCE(src.content_type,'shut'), src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='5664d72d-43af-4d96-a2c7-b6eaa5288606'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', COALESCE(src.content_type,'shut'), src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='d1f02d96-f9bd-4df3-842a-16b4291b96ea'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', COALESCE(src.content_type,'shut'), src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='3e5c98f9-4ef4-43aa-8e27-f4217470cfd7'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', COALESCE(src.content_type,'shut'), src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='d5434dda-be6b-44f7-8e12-8cc0e41efd4c'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', COALESCE(src.content_type,'shut'), src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='8fecd472-2483-46de-8887-05c7412ca8ef'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);
INSERT INTO lessons (id,title,description,content,rabbi_id,series_id,video_url,audio_url,attachment_url,thumbnail_url,duration,bible_book,bible_chapter,bible_verse,source_type,status,content_type,legacy_attachment_url,audience_tags,copied_from)
  SELECT gen_random_uuid(), src.title, src.description, src.content, src.rabbi_id, NULL, src.video_url, src.audio_url, src.attachment_url, src.thumbnail_url, src.duration, 'במדבר', src.bible_chapter, src.bible_verse, src.source_type, 'published', COALESCE(src.content_type,'shut'), src.legacy_attachment_url, src.audience_tags, src.id
  FROM lessons src WHERE src.id='4ebd2f8d-b36a-4957-939a-55a4d99ebd67'
    AND NOT EXISTS (SELECT 1 FROM lessons d WHERE d.series_id IS NULL AND d.copied_from=src.id);

-- ---------------------------------------------------------------------
-- VERIFICATION (run AFTER apply; expected values in comments)
-- abiner split: 6ba0b449 -> 17 (16 + 1 dup row), d860d934 -> 25 (19 + 6 dup copies)
SELECT s.id, s.title, count(l.*) FILTER (WHERE l.status='published') AS published
  FROM series s LEFT JOIN lessons l ON l.series_id=s.id
  WHERE s.id IN ('6ba0b449-f49a-4414-9b74-dc6e3f97a149','d860d934-c76d-47d7-a988-5fe21358b3bd','48adc2eb-8857-5cc6-b80f-1a88a4a40000','dfb8c480-35cd-4e8c-9f1d-a3a4c2666213')
  GROUP BY s.id,s.title ORDER BY s.title;
-- expected: 6ba0b449=17 · d860d934=25 · 48adc2eb=19 · dfb8c480=28
-- standalone+shut: 35 new series_id NULL rows for book=במדבר
SELECT count(*) AS standalone_shut_null FROM lessons
  WHERE series_id IS NULL AND bible_book='במדבר' AND copied_from IS NOT NULL;
-- expected: 35

-- ROLLBACK;  -- <-- default safe. Change to COMMIT; only after review.
ROLLBACK;
