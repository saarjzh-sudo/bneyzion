-- Rollback SQL for fixes applied 2026-05-27
-- Updated 2026-05-27 Part 2: added FIX 4 rollback
-- Run these in order to UNDO each fix

-- ============================================================
-- FIX 1 ROLLBACK: Revert audio_url https → http
-- (Only S3 URLs that were originally http://)
-- ============================================================
UPDATE lessons
SET audio_url = REPLACE(audio_url, 'https://bneyzion.s3.', 'http://bneyzion.s3.')
WHERE audio_url LIKE 'https://bneyzion.s3.%';

UPDATE lessons
SET audio_url = REPLACE(audio_url, 'https://s3.us-east-2.amazonaws.com/bneyzion/', 'http://s3.us-east-2.amazonaws.com/bneyzion/')
WHERE audio_url LIKE 'https://s3.us-east-2.amazonaws.com/bneyzion/%';

-- Verification after rollback:
-- SELECT COUNT(*) FROM lessons WHERE audio_url LIKE 'http://%';
-- Expected: 335

-- ============================================================
-- FIX 2 ROLLBACK: Remove https://www.bneyzion.co.il prefix from attachment_url
-- ============================================================
UPDATE lessons
SET attachment_url = REPLACE(attachment_url, 'https://www.bneyzion.co.il/media/', '/media/')
WHERE attachment_url LIKE 'https://www.bneyzion.co.il/media/%';

-- Verification after rollback:
-- SELECT COUNT(*) FROM lessons WHERE attachment_url LIKE '/media/%';
-- Expected: 783

-- ============================================================
-- FIX 3 ROLLBACK: Restore 137 empty lessons from draft → published
-- ============================================================
UPDATE lessons
SET status = 'published'
WHERE id IN (
  '0007670e-cbaa-4b8d-92dc-0a27b9bd9ca0',
  '00ebcbbc-ab37-4ec3-a831-5a0bdcbc05fc',
  '02369aa3-e5b8-416c-a716-17d028a340aa',
  '03259d4c-2cc7-41f4-a13b-06eb893c7e56',
  '033e072e-c5c5-4e15-87b0-73232068dc46',
  '0521aa9a-6d92-405a-a3ad-584002f89534',
  '05f86402-5563-4d64-b619-601438270ba7',
  '074483a2-ed33-4c7c-aad8-0324ac3ab2b4',
  '19afc8c3-6c00-4ac5-b77f-246c529b16e8',
  '1abe712b-857e-4817-8dad-c67ccb057e3c',
  '1c45894c-1225-4196-8020-4fe5ac6c0299',
  '1f31797c-fe5d-4c72-8e5e-1e57a20cfd97',
  '20a37a95-e69e-4e04-918a-b28f663a70ca',
  '2119ed2b-4907-4288-a0f0-f1b5b2466304',
  '2247815a-c433-46dd-a43c-b599f6b10362',
  '23125b63-e18c-43cb-b9fd-6c965360b158',
  '26644314-a2de-4839-95fb-0bebbae4276b',
  '2a5435d7-ca34-4de8-986f-b30a0a7346c0',
  '30eb64d8-f99b-462b-a115-c4c1f095dc07',
  '32e2f118-121d-4672-8384-f5488d7a78f1',
  '37017b9d-7e84-429f-bbf6-7e16eb6d4f25',
  '37b403ee-0349-442b-88ac-65ad08182903',
  '3838841f-b915-4add-98b3-068a060b31b7',
  '3853f60c-1fde-41b7-8ab4-7ba792860d78',
  '3c0aea4e-9951-4ef6-934d-3228232cac44',
  '3c2bcbdf-61a7-4d5f-90ce-e2a8ce2113c9',
  '3cc30b10-deed-4259-9592-e407fd3e597e',
  '3d05093b-bf8b-4262-a4fe-21e8834a6a2b',
  '3e7bdc83-d798-4404-bb66-4a0d0ea9db7d',
  '41351814-1f8d-48ce-b00b-8b47d0fc0215',
  '4308df4f-1cb5-46c4-bad3-e08c6b02fce3',
  '437df343-6d73-4a4d-8460-ca71a3096c9f',
  '46218866-4514-44e3-b371-0dc2430b192f',
  '4902ed7d-98ed-48ad-b452-6b646de557df',
  '49e45926-1c8b-4ad9-8316-b63123670967',
  '4a895ac9-0ec2-4d88-9903-c8bd256745ab',
  '4e972c11-0a8f-4a4b-8ab8-c338c991fb4e',
  '4fd15e57-dbda-4e8e-8e19-a477e98a5dc3',
  '50b2f87b-72e2-49ec-b882-74c1dd9eaf6d',
  '514efd7b-fdfe-4283-a338-7b95075ca12e',
  '52d45497-ce42-47d9-877d-80151b946dec',
  '55e9c887-1f62-4a54-828d-2cb99f698143',
  '58b9853f-9026-4bc6-a936-1e6d1eda3e9a',
  '5998a3b9-feaf-4091-8a27-ea38063da4a6',
  '5dc88d7e-8e86-482d-826e-5df665a6cfba',
  '60527786-efdc-432e-8d02-90415327c4f9',
  '619fb197-5ef3-4e06-8821-f1fb06d96379',
  '64e3e4fc-8285-4fda-a7a3-5acebc1c9401',
  '67f3f79d-4ef9-4119-93e4-030e4717d6b5',
  '685580cb-f21b-486b-9bee-9b74026bb123',
  '6945ecc5-02b8-414f-a2ba-474c0f498b4f',
  '6951d363-a732-46a1-aabc-69e7a701a9db',
  '6a5b42ea-43a3-48d5-9a8d-881926618448',
  '6ba7c5c6-8e2a-41dc-9a65-0f44d72ecfc6',
  '6ce15b9e-74b0-4c26-9a5f-fb7d0cdca088',
  '6f796e6e-0ec0-4462-a703-4bc69ed42e61',
  '71682f55-e0aa-48f2-bcf9-1d0866ecd260',
  '726ac668-b550-4948-bc51-e1bb6dd420ba',
  '72728b81-1bee-403e-b14e-babe4753b2f2',
  '7428f7b9-81fc-41f6-afd9-193a1d1976a8',
  '748a7acd-f566-4512-8c20-7144dba0b064',
  '74f9e24a-9763-41e6-97ad-ee0d4d0b40e9',
  '75d35078-345f-4b9c-b056-e8e9413aaae0',
  '773517e5-d48b-4e81-9e88-8d8d666838a8',
  '778958b9-1892-49da-83d5-14ab8f1ac75d',
  '78d7087b-8e31-4902-92e6-16dfa0c8413a',
  '7b350eaf-46e5-465f-8bad-061e4c13764d',
  '7bb9fd1a-9757-4eb6-9d45-8deb189088fe',
  '7cb6973a-42b5-4475-9457-f5f3545e68df',
  '7de1674d-00e7-4d40-ab95-a49a3963febe',
  '81293a71-8936-4c45-9075-c1bed9116635',
  '82917024-82e3-47ad-97ba-0eaa93135344',
  '83580ea7-679e-4e55-9693-28faa9954b92',
  '87c77469-e4f6-4926-aaa3-d14870a9512b',
  '88aa7fc2-1336-4d6b-b19d-11ca8f43c7b3',
  '8cd1689a-1585-4fe5-981d-9c16afad9dbe',
  '8e227b47-d87f-4789-ac27-469504d88ee1',
  '90dd1e09-25ea-4ab1-8496-fcf9a580982a',
  '92a4afa1-a2d8-4e43-a71e-a582243b6bf8',
  '974e4366-9999-44b4-8b1b-746c1edc6991',
  '97c4d12c-7b54-4153-88f7-3d72286b932c',
  '99735bd3-c232-42aa-8ec6-66725cbc7f7e',
  '9b9c9f37-e512-45ff-a801-8eab8d6ab833',
  'a17805cc-155f-47ea-9ece-8f5301272f8b',
  'a35a7367-8f7c-430d-a236-28a813fd8b06',
  'a363ee5e-e95c-4134-849a-bbc5d0caf119',
  'a5611279-ad68-46bd-8714-dd58957bbd51',
  'a6b767bc-2a48-4337-8ec3-331c8b580756',
  'a6e37f7f-6f64-4c3e-aa08-63eb5fc6fc32',
  'a848ff60-7558-4f79-b897-fd612f789e19',
  'aabd4515-d135-4cf7-a382-f5aa1e837575',
  'ad2f89de-3138-47d1-b369-6a4375f81b4f',
  'b043fb58-613e-4c92-b27c-8b33a8db3cf9',
  'b3477843-ce5b-455b-af2a-0b93657f0d9d',
  'b4de2839-4ff9-4459-affd-950e1d5a377a',
  'b60f7b3c-075b-4567-b8b3-82807e652772',
  'b9c0bff3-9d4f-46c3-807f-7a7526d8128e',
  'b9ef7d01-922b-42b6-a497-3c16df142758',
  'baa25fcd-5c18-400e-ad99-452d6b897a06',
  'bdd92b54-27cb-4d42-9b47-ff23d8328405',
  'bf0e794a-d4e6-4c34-944d-0b3243e65114',
  'bfb2ea3b-b829-412a-b580-476a411aa39c',
  'c5fab142-20ae-48a9-8096-ed609816e778',
  'c66d791e-806c-4658-a60c-4f4345e51073',
  'c6f0ac8d-2e58-4528-a4fa-8b34cc8545bd',
  'c772f43d-3bd6-4a7f-bbb6-6618fd6f231a',
  'c953bf5d-e5fa-4cb8-8c0d-72f95875578c',
  'c9b00265-a20b-4aec-8f1e-ddc50db009c4',
  'c9dc7d1c-9177-47b0-b528-bb763709bfca',
  'cafc7213-69cb-45ac-a06e-28455121dc6a',
  'cbe075f3-287c-4bf9-aba8-b22fbea0ea72',
  'd0c7f359-0f6e-4a6f-836d-b31ed957c6df',
  'd1d1836c-91a2-4762-851a-87fbb418092d',
  'd2d38d30-9fea-4b68-9c28-e330d6376d05',
  'd41a5b67-ba46-49f4-99bb-3311db8f5a3c',
  'd432e0c2-f361-4297-ac3b-7bcf39915219',
  'd75c4cde-ad9d-459e-beb0-bbec648bbddc',
  'd9226847-7de1-4e08-8842-6d01de34af36',
  'dd0df592-bc70-4bf0-bbfe-184b58eec782',
  'ddbbbbe1-b72a-4799-b45a-cea15f85863f',
  'df0f7909-7208-435d-b3db-0170088fd547',
  'dfad9a7c-ddc4-45cd-98ee-13f6dd71b1f9',
  'e254aa59-00e4-4707-8047-cd4050523875',
  'e452a97f-0051-4772-ab37-e31be6f37285',
  'e78c2668-fd0d-4a4a-bdaa-aea198f5f86c',
  'e8e8efe0-c6a2-4a98-b1f4-d902f218d8d3',
  'e92c7cb3-e6b2-4a78-b138-564b335ae6ec',
  'eb8a9bfd-94be-41c7-b2ed-5b401ec85073',
  'ed549789-e09d-4c2b-99d2-f06e22a80a06',
  'ed87b6b2-9b85-436f-800e-0d11b84adc2b',
  'ee2aba4c-b499-43a4-9c7e-53f67992b201',
  'f0a2bfd8-b437-4bc9-ac28-df2f94b01e2b',
  'f5f26c85-5ca8-4824-b930-a7d40738a362',
  'f721d6f9-b328-42f5-9b02-d5753170cf9b',
  'fd656d0a-8fec-4741-8555-ef3d43afae7d',
  'fe42372e-2d03-411f-acd7-2f9746c43339',
  'ff71e2e9-ed32-46fb-8540-c809c0a41ae9'
);

-- Verification after rollback:
-- SELECT COUNT(*) FROM lessons WHERE status = 'published' AND (content IS NULL OR LENGTH(TRIM(content)) < 20) AND audio_url IS NULL AND video_url IS NULL AND attachment_url IS NULL;
-- Expected: 137

-- ============================================================
-- FIX 4 ROLLBACK: Revert embedded media URLs in lesson content
-- (Supabase Storage → original Umbraco relative paths)
-- Applied 2026-05-27 Part 2: 11 lessons, 4 unique files
-- ============================================================

-- 144899: ציר-זמן-שנה-וחצי-ראשונות-במדבר.png (4 lessons)
UPDATE lessons
SET content = REPLACE(content,
  'https://pzvmwfexeiruelwiujxn.supabase.co/storage/v1/object/public/lesson-images/legacy-recovery/tzir-zman-shana-vachazi-rishanot-bamidbar.png',
  '/media/144899/ציר-זמן-שנה-וחצי-ראשונות-במדבר.png'
)
WHERE content LIKE '%legacy-recovery/tzir-zman-shana%';

-- 144875: מסעות-השנה-הארבעים-פרשת-חוקת.jpg (4 lessons)
UPDATE lessons
SET content = REPLACE(content,
  'https://pzvmwfexeiruelwiujxn.supabase.co/storage/v1/object/public/lesson-images/legacy-recovery/masaot-hashana-hearbaim-parshat-chukat.jpg',
  '/media/144875/מסעות-השנה-הארבעים-פרשת-חוקת.jpg'
)
WHERE content LIKE '%legacy-recovery/masaot-hashana%';

-- 144879: נדודי-דוד.jpg (2 lessons)
UPDATE lessons
SET content = REPLACE(content,
  'https://pzvmwfexeiruelwiujxn.supabase.co/storage/v1/object/public/lesson-images/legacy-recovery/neduday-david.jpg',
  '/media/144879/נדודי-דוד.jpg'
)
WHERE content LIKE '%legacy-recovery/neduday-david%';

-- 144885: משפחת-ירמיה.jpg (1 lesson)
UPDATE lessons
SET content = REPLACE(content,
  'https://pzvmwfexeiruelwiujxn.supabase.co/storage/v1/object/public/lesson-images/legacy-recovery/mishpachat-yirmiya.jpg',
  '/media/144885/משפחת-ירמיה.jpg'
)
WHERE content LIKE '%legacy-recovery/mishpachat-yirmiya%';

-- Verification after rollback:
-- SELECT COUNT(*) FROM lessons WHERE content LIKE '%/media/144%';
-- Expected: 11
