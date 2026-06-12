-- ============================================================================
-- ORDER-FIX.sql — restore the sort_order values that move_lesson ops dropped
-- ============================================================================
-- Authored by the VERIFIER-ALIGNMENT agent, 2026-06-12 09:35. NOT EXECUTED — review first.
--
-- ROOT CAUSE (order_only listing failures, mostly איוב/תהלים/כתובים collections):
--   oneone_apply.py's move_lesson SQL builder emits only
--     UPDATE lessons SET series_id=... WHERE id=...
--   and silently DROPS the op's inline sort_order (copy_lesson DOES apply it).
--   Result, verified live 2026-06-12: all 228 move_lesson-with-sort ops left their
--   lesson in the correct target series but with sort_order = NULL, so the lesson
--   renders at the END of the page (sort_order NULLS LAST) instead of its old
--   position. 141 series affected. Example (/כתובים/איוב/דברי-איוב-האחרונים-פרקים-כו-לא/,
--   series 350a8d10): live order is כו(1),כז(2),לא(6),כח(NULL),כט(NULL),ל(NULL) —
--   plan had move_lesson sorts 3,4,5 for כח,כט,ל.
--
-- SAFETY / IDEMPOTENCY: every UPDATE is guarded by id + series_id (a lesson later
--   moved elsewhere will NOT be touched) + IS DISTINCT FROM (re-running is a no-op).
--   Source of truth: plans/RESOLVED-OPS.jsonl move_lesson ops with sort_order.
--
-- VERIFICATION (run after applying):
--   SELECT count(*) FROM lessons l JOIN (VALUES /* the 228 (id,series,sort) below */
--   ...) v(id,sid,so) ON l.id=v.id AND l.series_id=v.sid WHERE l.sort_order IS DISTINCT FROM v.so;
--   -- expected: 0   (pre-apply live count: 228)

BEGIN;

-- series 0002ce15-2a14-42bf-bc4a-92b6c992a9c9
UPDATE lessons SET sort_order = 1 WHERE id = '830380de-ca6c-4ff6-b27d-372df4bc58bb' AND series_id = '0002ce15-2a14-42bf-bc4a-92b6c992a9c9' AND sort_order IS DISTINCT FROM 1;
-- series 00335595-b01d-4850-9693-55b3f6c99522
UPDATE lessons SET sort_order = 1 WHERE id = 'a9ee1974-6e14-4baa-9940-ce8bded89b07' AND series_id = '00335595-b01d-4850-9693-55b3f6c99522' AND sort_order IS DISTINCT FROM 1;
-- series 024ef323-788c-4b61-8e70-81166c491d47
UPDATE lessons SET sort_order = 2 WHERE id = '29701b28-e30b-43d4-9d01-e6733b36ebf0' AND series_id = '024ef323-788c-4b61-8e70-81166c491d47' AND sort_order IS DISTINCT FROM 2;
UPDATE lessons SET sort_order = 3 WHERE id = '47a56f08-52e9-40ef-a8d3-d86e4b7bd96d' AND series_id = '024ef323-788c-4b61-8e70-81166c491d47' AND sort_order IS DISTINCT FROM 3;
-- series 052e35b4-e9cd-4de9-a089-eb8256f2665d
UPDATE lessons SET sort_order = 1 WHERE id = '701d3f06-06ab-4b94-8d33-bffa3cd15c75' AND series_id = '052e35b4-e9cd-4de9-a089-eb8256f2665d' AND sort_order IS DISTINCT FROM 1;
UPDATE lessons SET sort_order = 2 WHERE id = '6c6b6db2-ae9a-4b0d-9211-d4aeb0c0f52a' AND series_id = '052e35b4-e9cd-4de9-a089-eb8256f2665d' AND sort_order IS DISTINCT FROM 2;
UPDATE lessons SET sort_order = 4 WHERE id = '29a4216a-8bf5-44d7-b8c1-459962e51fb4' AND series_id = '052e35b4-e9cd-4de9-a089-eb8256f2665d' AND sort_order IS DISTINCT FROM 4;
-- series 074c6baa-601f-47b6-b1b5-ebc85a31d1de
UPDATE lessons SET sort_order = 1 WHERE id = '35f448c0-2f77-4f76-9e9d-7fbdb07df3c1' AND series_id = '074c6baa-601f-47b6-b1b5-ebc85a31d1de' AND sort_order IS DISTINCT FROM 1;
-- series 07a02829-b053-4559-91b2-496fb3347733
UPDATE lessons SET sort_order = 1 WHERE id = '426b68dc-6e06-4133-b144-e5a1b1b45069' AND series_id = '07a02829-b053-4559-91b2-496fb3347733' AND sort_order IS DISTINCT FROM 1;
-- series 07ed3d99-9703-4f3c-9d32-9905b6c5a305
UPDATE lessons SET sort_order = 1 WHERE id = '4363b974-f5cb-4243-9d25-c11d40cde4c4' AND series_id = '07ed3d99-9703-4f3c-9d32-9905b6c5a305' AND sort_order IS DISTINCT FROM 1;
-- series 0d2bfae5-9ecb-4b2b-8428-bf2227e53f57
UPDATE lessons SET sort_order = 5 WHERE id = '3992f09e-be5b-46fd-a08b-e6ac90bc46be' AND series_id = '0d2bfae5-9ecb-4b2b-8428-bf2227e53f57' AND sort_order IS DISTINCT FROM 5;
UPDATE lessons SET sort_order = 6 WHERE id = '308ef65b-a696-4027-bab1-89614dd6dc37' AND series_id = '0d2bfae5-9ecb-4b2b-8428-bf2227e53f57' AND sort_order IS DISTINCT FROM 6;
-- series 0f3f61b4-8389-46e7-939d-3981cc75824b
UPDATE lessons SET sort_order = 4 WHERE id = '575732c1-2a39-42d9-ade4-511675049c3f' AND series_id = '0f3f61b4-8389-46e7-939d-3981cc75824b' AND sort_order IS DISTINCT FROM 4;
-- series 10e48da9-6821-4e80-9232-426206402724
UPDATE lessons SET sort_order = 1 WHERE id = '7bedc564-5b1b-4649-a717-f13f9ca1b270' AND series_id = '10e48da9-6821-4e80-9232-426206402724' AND sort_order IS DISTINCT FROM 1;
-- series 119b1ac2-9995-4a57-8268-7eb24855c549
UPDATE lessons SET sort_order = 3 WHERE id = '1a7c5c5b-2038-4189-97a2-649e91360484' AND series_id = '119b1ac2-9995-4a57-8268-7eb24855c549' AND sort_order IS DISTINCT FROM 3;
UPDATE lessons SET sort_order = 4 WHERE id = 'bb2f86bf-4bef-42f0-8544-31bb07ce348b' AND series_id = '119b1ac2-9995-4a57-8268-7eb24855c549' AND sort_order IS DISTINCT FROM 4;
-- series 1624dc44-a09a-47f9-a62c-0c8bbe183f09
UPDATE lessons SET sort_order = 1 WHERE id = 'c73e6d2b-f544-410a-adc7-6e8d61e177a8' AND series_id = '1624dc44-a09a-47f9-a62c-0c8bbe183f09' AND sort_order IS DISTINCT FROM 1;
-- series 1a77c746-2dc8-4cf6-bad8-7c9039f1963d
UPDATE lessons SET sort_order = 2 WHERE id = '431f4cdc-9021-4e48-a534-44f609aeb21c' AND series_id = '1a77c746-2dc8-4cf6-bad8-7c9039f1963d' AND sort_order IS DISTINCT FROM 2;
UPDATE lessons SET sort_order = 4 WHERE id = '2750fa84-02e6-4e12-8fbd-0cbc63282a9f' AND series_id = '1a77c746-2dc8-4cf6-bad8-7c9039f1963d' AND sort_order IS DISTINCT FROM 4;
-- series 1b6093f2-0b3a-458e-aa9d-a8d66979eeb7
UPDATE lessons SET sort_order = 5 WHERE id = 'af1042eb-2687-440d-9184-0ec0e753fa4b' AND series_id = '1b6093f2-0b3a-458e-aa9d-a8d66979eeb7' AND sort_order IS DISTINCT FROM 5;
-- series 1da84659-872c-4be2-9349-db0433422cd4
UPDATE lessons SET sort_order = 2 WHERE id = '57762119-2cd8-4264-a7de-5a3c18056834' AND series_id = '1da84659-872c-4be2-9349-db0433422cd4' AND sort_order IS DISTINCT FROM 2;
UPDATE lessons SET sort_order = 3 WHERE id = '47dbfacb-a95a-48ee-b218-540b17e8b887' AND series_id = '1da84659-872c-4be2-9349-db0433422cd4' AND sort_order IS DISTINCT FROM 3;
-- series 1f4af4f4-ab59-4934-a8c1-3604e06f535a
UPDATE lessons SET sort_order = 1 WHERE id = 'ab0af3b2-2548-4cc1-928d-8980b739e395' AND series_id = '1f4af4f4-ab59-4934-a8c1-3604e06f535a' AND sort_order IS DISTINCT FROM 1;
-- series 2088c833-b737-426e-867a-76f5c54a706e
UPDATE lessons SET sort_order = 1 WHERE id = '9d1e9158-2b51-474a-95f1-a63a75e152a3' AND series_id = '2088c833-b737-426e-867a-76f5c54a706e' AND sort_order IS DISTINCT FROM 1;
-- series 21fd4a8e-9434-407b-98fb-94b01a771f0b
UPDATE lessons SET sort_order = 2 WHERE id = 'b1cdfbea-23df-4141-a15e-81b4c4d19018' AND series_id = '21fd4a8e-9434-407b-98fb-94b01a771f0b' AND sort_order IS DISTINCT FROM 2;
-- series 22bb911f-be91-4e6b-847a-a660f0bd2631
UPDATE lessons SET sort_order = 4 WHERE id = 'b7a6f458-4373-4971-9837-68080b9690cd' AND series_id = '22bb911f-be91-4e6b-847a-a660f0bd2631' AND sort_order IS DISTINCT FROM 4;
UPDATE lessons SET sort_order = 10 WHERE id = '2003e25e-9f4d-49b6-b0fc-e7cfc742b150' AND series_id = '22bb911f-be91-4e6b-847a-a660f0bd2631' AND sort_order IS DISTINCT FROM 10;
UPDATE lessons SET sort_order = 11 WHERE id = '7477c2d6-7fa7-42e8-81bd-8d4eb2dce4da' AND series_id = '22bb911f-be91-4e6b-847a-a660f0bd2631' AND sort_order IS DISTINCT FROM 11;
UPDATE lessons SET sort_order = 12 WHERE id = '094b0e9a-5807-41c3-8282-1cdb202d35a0' AND series_id = '22bb911f-be91-4e6b-847a-a660f0bd2631' AND sort_order IS DISTINCT FROM 12;
-- series 232f62c3-dd70-44bd-afe0-b5b03123757f
UPDATE lessons SET sort_order = 1 WHERE id = '22f76ebb-8fba-41b3-b87c-5040f562f5c0' AND series_id = '232f62c3-dd70-44bd-afe0-b5b03123757f' AND sort_order IS DISTINCT FROM 1;
UPDATE lessons SET sort_order = 2 WHERE id = '36509326-1c56-47c6-959f-717b09098091' AND series_id = '232f62c3-dd70-44bd-afe0-b5b03123757f' AND sort_order IS DISTINCT FROM 2;
UPDATE lessons SET sort_order = 4 WHERE id = '06ba6e04-a567-4443-afa5-3c9c58c972b5' AND series_id = '232f62c3-dd70-44bd-afe0-b5b03123757f' AND sort_order IS DISTINCT FROM 4;
-- series 2339e3d6-f55b-4c24-9482-26b912b8c459
UPDATE lessons SET sort_order = 3 WHERE id = '42bb5a0f-49b1-40df-b858-b7111b048707' AND series_id = '2339e3d6-f55b-4c24-9482-26b912b8c459' AND sort_order IS DISTINCT FROM 3;
-- series 281ae67c-a024-451a-85f7-b006b29afd08
UPDATE lessons SET sort_order = 5 WHERE id = '55f8ce08-38a7-49d8-a4b8-2a8c63d1edab' AND series_id = '281ae67c-a024-451a-85f7-b006b29afd08' AND sort_order IS DISTINCT FROM 5;
UPDATE lessons SET sort_order = 6 WHERE id = '4da501db-146f-4829-b8e1-1bf28dc583ba' AND series_id = '281ae67c-a024-451a-85f7-b006b29afd08' AND sort_order IS DISTINCT FROM 6;
UPDATE lessons SET sort_order = 7 WHERE id = '4651095f-cb36-46fe-a07a-c38654f574f6' AND series_id = '281ae67c-a024-451a-85f7-b006b29afd08' AND sort_order IS DISTINCT FROM 7;
-- series 2940e03c-0015-4c4f-8ae1-6b9fd7f16f6b
UPDATE lessons SET sort_order = 1 WHERE id = 'b2b87803-9bf8-4605-8895-5d82cc707a29' AND series_id = '2940e03c-0015-4c4f-8ae1-6b9fd7f16f6b' AND sort_order IS DISTINCT FROM 1;
-- series 29951b20-a78f-467a-b03b-804b25dc3c2e
UPDATE lessons SET sort_order = 1 WHERE id = '79678ef9-7a2f-4dd2-b812-c2cf48835cb6' AND series_id = '29951b20-a78f-467a-b03b-804b25dc3c2e' AND sort_order IS DISTINCT FROM 1;
-- series 2b9c3094-d8fd-4aeb-ae69-b541319e955f
UPDATE lessons SET sort_order = 2 WHERE id = '72552e90-470d-4538-915b-16f0c81e44d0' AND series_id = '2b9c3094-d8fd-4aeb-ae69-b541319e955f' AND sort_order IS DISTINCT FROM 2;
UPDATE lessons SET sort_order = 3 WHERE id = '0142e0bb-5021-4ba6-a403-940215657d81' AND series_id = '2b9c3094-d8fd-4aeb-ae69-b541319e955f' AND sort_order IS DISTINCT FROM 3;
UPDATE lessons SET sort_order = 5 WHERE id = '6149170b-d0aa-4f8a-b4b8-f3a29b052aa5' AND series_id = '2b9c3094-d8fd-4aeb-ae69-b541319e955f' AND sort_order IS DISTINCT FROM 5;
UPDATE lessons SET sort_order = 6 WHERE id = 'aa12f0cb-5f14-44b7-aa1d-2ae16a1626ac' AND series_id = '2b9c3094-d8fd-4aeb-ae69-b541319e955f' AND sort_order IS DISTINCT FROM 6;
UPDATE lessons SET sort_order = 7 WHERE id = '7b7f689c-4abb-4eb4-a5fd-2f47947dffa3' AND series_id = '2b9c3094-d8fd-4aeb-ae69-b541319e955f' AND sort_order IS DISTINCT FROM 7;
-- series 2c3ece8f-7a2e-445e-b9bb-b217bf62ee7f
UPDATE lessons SET sort_order = 1 WHERE id = 'a178c538-baf8-4ec8-9103-cf23c1ffb763' AND series_id = '2c3ece8f-7a2e-445e-b9bb-b217bf62ee7f' AND sort_order IS DISTINCT FROM 1;
-- series 2c68cc1a-7d0f-44df-bc9b-ceab3444539d
UPDATE lessons SET sort_order = 1 WHERE id = '4565ec10-6321-4fe2-aa4b-d2439937e0f0' AND series_id = '2c68cc1a-7d0f-44df-bc9b-ceab3444539d' AND sort_order IS DISTINCT FROM 1;
-- series 2dda0cd0-8cf0-45a4-b5c1-9b139e30f01d
UPDATE lessons SET sort_order = 2 WHERE id = 'a1eb8c64-91fe-4799-be8d-451188a100eb' AND series_id = '2dda0cd0-8cf0-45a4-b5c1-9b139e30f01d' AND sort_order IS DISTINCT FROM 2;
-- series 2f990d90-3eb9-40e8-85b4-2587d94c1c15
UPDATE lessons SET sort_order = 2 WHERE id = '086ae9de-6965-4d3f-a2ce-d7129c2ce211' AND series_id = '2f990d90-3eb9-40e8-85b4-2587d94c1c15' AND sort_order IS DISTINCT FROM 2;
UPDATE lessons SET sort_order = 3 WHERE id = '7cbcd574-9424-4607-845e-7756cac7d60c' AND series_id = '2f990d90-3eb9-40e8-85b4-2587d94c1c15' AND sort_order IS DISTINCT FROM 3;
UPDATE lessons SET sort_order = 8 WHERE id = '82d1a1ca-355b-4212-b032-33a498227eee' AND series_id = '2f990d90-3eb9-40e8-85b4-2587d94c1c15' AND sort_order IS DISTINCT FROM 8;
UPDATE lessons SET sort_order = 9 WHERE id = '0cf55adc-57d8-41fc-98e8-8da45eb8314d' AND series_id = '2f990d90-3eb9-40e8-85b4-2587d94c1c15' AND sort_order IS DISTINCT FROM 9;
UPDATE lessons SET sort_order = 10 WHERE id = '1a0a4e30-cd5a-43e3-b0bb-1084624a6383' AND series_id = '2f990d90-3eb9-40e8-85b4-2587d94c1c15' AND sort_order IS DISTINCT FROM 10;
-- series 2fddca0d-8859-4fe3-a8de-5a5eb9878d81
UPDATE lessons SET sort_order = 3 WHERE id = '135050de-b512-4f95-a92c-c48057fe8763' AND series_id = '2fddca0d-8859-4fe3-a8de-5a5eb9878d81' AND sort_order IS DISTINCT FROM 3;
UPDATE lessons SET sort_order = 4 WHERE id = 'ca56f0fb-063c-4d71-82dc-f9557c9e74eb' AND series_id = '2fddca0d-8859-4fe3-a8de-5a5eb9878d81' AND sort_order IS DISTINCT FROM 4;
-- series 350a8d10-ea36-4971-bbf2-e4f22a9ea411
UPDATE lessons SET sort_order = 3 WHERE id = '367266c3-605c-437b-9eed-0106dfc2f815' AND series_id = '350a8d10-ea36-4971-bbf2-e4f22a9ea411' AND sort_order IS DISTINCT FROM 3;
UPDATE lessons SET sort_order = 4 WHERE id = '173815f1-3b88-400f-86d3-3fa9078fdf4d' AND series_id = '350a8d10-ea36-4971-bbf2-e4f22a9ea411' AND sort_order IS DISTINCT FROM 4;
UPDATE lessons SET sort_order = 5 WHERE id = 'b7825c5e-a55b-4f26-b7e8-dd4cef34bb60' AND series_id = '350a8d10-ea36-4971-bbf2-e4f22a9ea411' AND sort_order IS DISTINCT FROM 5;
-- series 3695dc6e-b729-4f5b-b1db-a84a7fea6425
UPDATE lessons SET sort_order = 3 WHERE id = '07eb8f1c-fda8-4fb5-8b5e-97b92a6cc33d' AND series_id = '3695dc6e-b729-4f5b-b1db-a84a7fea6425' AND sort_order IS DISTINCT FROM 3;
-- series 3720b14a-a8b4-478e-98c3-ed84d5164f73
UPDATE lessons SET sort_order = 3 WHERE id = '133c987e-3b34-4b57-94b1-5ddbcaeba9ce' AND series_id = '3720b14a-a8b4-478e-98c3-ed84d5164f73' AND sort_order IS DISTINCT FROM 3;
-- series 390068f0-b407-41b7-907c-d471088981ca
UPDATE lessons SET sort_order = 3 WHERE id = '6a9abe51-5b3b-4919-b037-2c06857af187' AND series_id = '390068f0-b407-41b7-907c-d471088981ca' AND sort_order IS DISTINCT FROM 3;
-- series 3a56c3c9-945c-4484-80cb-f9991b73fe58
UPDATE lessons SET sort_order = 4 WHERE id = '9ad409c1-896a-4f33-b282-6505b226746f' AND series_id = '3a56c3c9-945c-4484-80cb-f9991b73fe58' AND sort_order IS DISTINCT FROM 4;
-- series 3b24fab5-09ad-4081-a20c-5a0563e55a12
UPDATE lessons SET sort_order = 2 WHERE id = 'b845fffd-5033-4fff-940e-77f992f981fa' AND series_id = '3b24fab5-09ad-4081-a20c-5a0563e55a12' AND sort_order IS DISTINCT FROM 2;
-- series 3dc0c345-f6b3-4e92-904a-4aff9f5f223e
UPDATE lessons SET sort_order = 4 WHERE id = 'c9703b0c-e2e5-46cc-925f-a3947b84c213' AND series_id = '3dc0c345-f6b3-4e92-904a-4aff9f5f223e' AND sort_order IS DISTINCT FROM 4;
UPDATE lessons SET sort_order = 5 WHERE id = '11d43394-6e48-4033-8504-7029c6e06b87' AND series_id = '3dc0c345-f6b3-4e92-904a-4aff9f5f223e' AND sort_order IS DISTINCT FROM 5;
-- series 3e920bc3-ac79-4896-820b-cc490555200e
UPDATE lessons SET sort_order = 2 WHERE id = '23926999-b8e1-44ab-86d5-8b2ee600c063' AND series_id = '3e920bc3-ac79-4896-820b-cc490555200e' AND sort_order IS DISTINCT FROM 2;
UPDATE lessons SET sort_order = 3 WHERE id = '40a4cfd8-4b7a-4191-8fde-6d41ee69b132' AND series_id = '3e920bc3-ac79-4896-820b-cc490555200e' AND sort_order IS DISTINCT FROM 3;
-- series 3fb29efa-2400-4d54-bc8d-28f4b9a5861c
UPDATE lessons SET sort_order = 4 WHERE id = '74dd79b6-6034-4278-ad7f-8bb5a87a1520' AND series_id = '3fb29efa-2400-4d54-bc8d-28f4b9a5861c' AND sort_order IS DISTINCT FROM 4;
-- series 42b5f86b-56e9-411f-aa4e-6c3c590b0278
UPDATE lessons SET sort_order = 123 WHERE id = 'ef4acf39-ef5a-4fa0-a53e-8e050155003d' AND series_id = '42b5f86b-56e9-411f-aa4e-6c3c590b0278' AND sort_order IS DISTINCT FROM 123;
UPDATE lessons SET sort_order = 124 WHERE id = '39c52234-efc4-4f0b-85bb-72d671901acd' AND series_id = '42b5f86b-56e9-411f-aa4e-6c3c590b0278' AND sort_order IS DISTINCT FROM 124;
UPDATE lessons SET sort_order = 125 WHERE id = '4022e0ef-ba6f-479d-a1c8-0a25ae2931bc' AND series_id = '42b5f86b-56e9-411f-aa4e-6c3c590b0278' AND sort_order IS DISTINCT FROM 125;
-- series 432bb493-2916-4726-9c1f-316ddf76aaa2
UPDATE lessons SET sort_order = 1 WHERE id = '362bb02c-f1a3-408b-8598-02a53e50d60f' AND series_id = '432bb493-2916-4726-9c1f-316ddf76aaa2' AND sort_order IS DISTINCT FROM 1;
-- series 4414cf06-75b5-49ef-87e0-0f47b91f7568
UPDATE lessons SET sort_order = 1 WHERE id = '99f0ff41-ee6f-4ca9-991b-f73a069f64bc' AND series_id = '4414cf06-75b5-49ef-87e0-0f47b91f7568' AND sort_order IS DISTINCT FROM 1;
-- series 448a7c18-9eaf-472d-a130-5233e507c314
UPDATE lessons SET sort_order = 2 WHERE id = 'e64b3191-e225-468f-9c66-50bda6bae109' AND series_id = '448a7c18-9eaf-472d-a130-5233e507c314' AND sort_order IS DISTINCT FROM 2;
-- series 48b79792-bcae-4733-a07a-2c0256d62290
UPDATE lessons SET sort_order = 4 WHERE id = '454e0bbf-6107-4eec-92c7-05822e0ede29' AND series_id = '48b79792-bcae-4733-a07a-2c0256d62290' AND sort_order IS DISTINCT FROM 4;
UPDATE lessons SET sort_order = 5 WHERE id = '8d306b8f-a8db-4ece-b88d-e3e8331b53d8' AND series_id = '48b79792-bcae-4733-a07a-2c0256d62290' AND sort_order IS DISTINCT FROM 5;
-- series 4a7743fa-611e-4b0a-8049-f7c4e91c92c1
UPDATE lessons SET sort_order = 4 WHERE id = '25c30b62-482c-4ce5-a047-167691c81ebd' AND series_id = '4a7743fa-611e-4b0a-8049-f7c4e91c92c1' AND sort_order IS DISTINCT FROM 4;
-- series 4c09a300-845c-4b7a-a70f-a2744baecc14
UPDATE lessons SET sort_order = 2 WHERE id = '74330f22-ce33-40b7-b762-3e4824913bfb' AND series_id = '4c09a300-845c-4b7a-a70f-a2744baecc14' AND sort_order IS DISTINCT FROM 2;
-- series 51f3b19c-7d90-4c59-9b1b-26532b8efad2
UPDATE lessons SET sort_order = 2 WHERE id = '4e6d4bee-6fb6-4875-a0e7-026969d72027' AND series_id = '51f3b19c-7d90-4c59-9b1b-26532b8efad2' AND sort_order IS DISTINCT FROM 2;
-- series 5552ba51-030f-4fc6-a183-9d0eaa89cf3d
UPDATE lessons SET sort_order = 2 WHERE id = '051c245e-a22e-471e-bbd4-1b031a551864' AND series_id = '5552ba51-030f-4fc6-a183-9d0eaa89cf3d' AND sort_order IS DISTINCT FROM 2;
-- series 573582ea-2236-4b3c-8be6-b0b79d507d14
UPDATE lessons SET sort_order = 1 WHERE id = '2e0e4483-6ea0-4c46-bb0b-3389ed7e7f57' AND series_id = '573582ea-2236-4b3c-8be6-b0b79d507d14' AND sort_order IS DISTINCT FROM 1;
-- series 5bc111dc-c70a-434d-8620-fa0d23244bc2
UPDATE lessons SET sort_order = 1 WHERE id = '8f0237f2-f758-4343-97b5-7b3365a4fdc2' AND series_id = '5bc111dc-c70a-434d-8620-fa0d23244bc2' AND sort_order IS DISTINCT FROM 1;
UPDATE lessons SET sort_order = 2 WHERE id = 'ada0c124-1980-40f5-bb3c-4e7825568acc' AND series_id = '5bc111dc-c70a-434d-8620-fa0d23244bc2' AND sort_order IS DISTINCT FROM 2;
UPDATE lessons SET sort_order = 3 WHERE id = '46c183ae-a1dd-4434-ab87-7ffe3334bcd9' AND series_id = '5bc111dc-c70a-434d-8620-fa0d23244bc2' AND sort_order IS DISTINCT FROM 3;
-- series 5cc90796-4ea7-412d-b7bd-d77e921fb04a
UPDATE lessons SET sort_order = 4 WHERE id = '06c90fb1-2992-4e15-9a9d-a395cf38b5db' AND series_id = '5cc90796-4ea7-412d-b7bd-d77e921fb04a' AND sort_order IS DISTINCT FROM 4;
-- series 5f1c1e50-1892-4184-ad55-d477d5b0e9ec
UPDATE lessons SET sort_order = 1 WHERE id = '06ab70c5-af5a-421c-882a-8cbf3dadcb89' AND series_id = '5f1c1e50-1892-4184-ad55-d477d5b0e9ec' AND sort_order IS DISTINCT FROM 1;
-- series 60373351-fd53-45b5-ae35-660db02413ff
UPDATE lessons SET sort_order = 3 WHERE id = '96b5de34-341d-4ed7-8144-c04e9029732e' AND series_id = '60373351-fd53-45b5-ae35-660db02413ff' AND sort_order IS DISTINCT FROM 3;
UPDATE lessons SET sort_order = 4 WHERE id = '7fd15e7d-6d44-4153-88fc-befff5325821' AND series_id = '60373351-fd53-45b5-ae35-660db02413ff' AND sort_order IS DISTINCT FROM 4;
-- series 641d9555-663e-4e63-bb1a-b08a239e1976
UPDATE lessons SET sort_order = 1 WHERE id = 'a5d4d0c3-7921-4d92-bae8-ecfeae54570f' AND series_id = '641d9555-663e-4e63-bb1a-b08a239e1976' AND sort_order IS DISTINCT FROM 1;
-- series 6420e9ff-ece2-40b5-8bcd-131e54996b10
UPDATE lessons SET sort_order = 1 WHERE id = 'aed75242-7282-4e7c-8d48-e0f481bfb66d' AND series_id = '6420e9ff-ece2-40b5-8bcd-131e54996b10' AND sort_order IS DISTINCT FROM 1;
-- series 6e803951-1d3a-4e15-baa3-7aecd9be0ba3
UPDATE lessons SET sort_order = 1 WHERE id = 'b15236f4-3369-4581-a4c6-ef0d18652c78' AND series_id = '6e803951-1d3a-4e15-baa3-7aecd9be0ba3' AND sort_order IS DISTINCT FROM 1;
-- series 71550913-d921-4c35-b12a-16c79d42d50b
UPDATE lessons SET sort_order = 1 WHERE id = '74edb971-49ce-4dfb-be10-c669cea2c223' AND series_id = '71550913-d921-4c35-b12a-16c79d42d50b' AND sort_order IS DISTINCT FROM 1;
-- series 716c9759-2e25-42b1-8870-61fdbf0131c7
UPDATE lessons SET sort_order = 1 WHERE id = '5d2f6e9d-6b5c-4c18-966e-fb7e2e202093' AND series_id = '716c9759-2e25-42b1-8870-61fdbf0131c7' AND sort_order IS DISTINCT FROM 1;
-- series 71a5bfef-cba4-4566-8942-efe6699c3588
UPDATE lessons SET sort_order = 1 WHERE id = '898f687b-79a0-422d-b4ce-f033786b8dc0' AND series_id = '71a5bfef-cba4-4566-8942-efe6699c3588' AND sort_order IS DISTINCT FROM 1;
UPDATE lessons SET sort_order = 2 WHERE id = '39c80d5c-0c26-4f05-afa8-54e968b7f711' AND series_id = '71a5bfef-cba4-4566-8942-efe6699c3588' AND sort_order IS DISTINCT FROM 2;
-- series 741511de-ae3c-4498-a40c-6ceaaa8da6c4
UPDATE lessons SET sort_order = 2 WHERE id = '109bbeeb-4c8c-4c22-a670-bc9c169174aa' AND series_id = '741511de-ae3c-4498-a40c-6ceaaa8da6c4' AND sort_order IS DISTINCT FROM 2;
UPDATE lessons SET sort_order = 4 WHERE id = 'bf3a3ab2-cc91-47fc-ae52-ac30e3d90930' AND series_id = '741511de-ae3c-4498-a40c-6ceaaa8da6c4' AND sort_order IS DISTINCT FROM 4;
UPDATE lessons SET sort_order = 6 WHERE id = 'cb87eda3-01dc-4766-a1a1-e4b51e67f036' AND series_id = '741511de-ae3c-4498-a40c-6ceaaa8da6c4' AND sort_order IS DISTINCT FROM 6;
UPDATE lessons SET sort_order = 8 WHERE id = '162acacf-4fb0-4182-b3f0-0cccdd85d784' AND series_id = '741511de-ae3c-4498-a40c-6ceaaa8da6c4' AND sort_order IS DISTINCT FROM 8;
-- series 75563bea-2471-46ba-add7-ad02773aef8c
UPDATE lessons SET sort_order = 3 WHERE id = '1efa7264-bdbb-4382-b549-2fd25a00fce9' AND series_id = '75563bea-2471-46ba-add7-ad02773aef8c' AND sort_order IS DISTINCT FROM 3;
UPDATE lessons SET sort_order = 10 WHERE id = '684a0c57-9c96-49bc-818e-7f23738db5bd' AND series_id = '75563bea-2471-46ba-add7-ad02773aef8c' AND sort_order IS DISTINCT FROM 10;
-- series 755b913d-dcd6-48af-87f3-d1e4fe49c3a5
UPDATE lessons SET sort_order = 2 WHERE id = '0781612b-e6fd-4a19-8c51-4fef44d79325' AND series_id = '755b913d-dcd6-48af-87f3-d1e4fe49c3a5' AND sort_order IS DISTINCT FROM 2;
-- series 7beb433e-d011-4287-9a0b-ff85662c55da
UPDATE lessons SET sort_order = 3 WHERE id = '621870cf-5a54-45ac-a1f9-69e16d73c943' AND series_id = '7beb433e-d011-4287-9a0b-ff85662c55da' AND sort_order IS DISTINCT FROM 3;
-- series 7c8597d5-12e5-47ba-82cc-3be82dd677a2
UPDATE lessons SET sort_order = 1 WHERE id = '913ebbf2-1f00-41b4-8960-90ea92481a36' AND series_id = '7c8597d5-12e5-47ba-82cc-3be82dd677a2' AND sort_order IS DISTINCT FROM 1;
-- series 7cdcb16f-6ff7-4da5-96cd-2096eda0342f
UPDATE lessons SET sort_order = 3 WHERE id = '7bc15b75-3fe0-44bc-900c-bfc980664aa9' AND series_id = '7cdcb16f-6ff7-4da5-96cd-2096eda0342f' AND sort_order IS DISTINCT FROM 3;
UPDATE lessons SET sort_order = 5 WHERE id = '0480bc41-0d35-4c2b-92b1-2a07f1c7cd46' AND series_id = '7cdcb16f-6ff7-4da5-96cd-2096eda0342f' AND sort_order IS DISTINCT FROM 5;
UPDATE lessons SET sort_order = 6 WHERE id = '00c82ec2-c4b1-4f00-b2a8-67c242272b41' AND series_id = '7cdcb16f-6ff7-4da5-96cd-2096eda0342f' AND sort_order IS DISTINCT FROM 6;
UPDATE lessons SET sort_order = 7 WHERE id = '10221ea1-e792-429b-90e4-fb0d322cd94a' AND series_id = '7cdcb16f-6ff7-4da5-96cd-2096eda0342f' AND sort_order IS DISTINCT FROM 7;
-- series 7dc34ac8-e332-47e5-87d5-9400a85fa85d
UPDATE lessons SET sort_order = 6 WHERE id = 'a2c7bb73-5db7-484b-adda-b6504fbb036a' AND series_id = '7dc34ac8-e332-47e5-87d5-9400a85fa85d' AND sort_order IS DISTINCT FROM 6;
-- series 8083d857-178a-48e9-833e-038836226d83
UPDATE lessons SET sort_order = 4 WHERE id = 'c191420d-08f3-48a2-a39a-9ba3b3f94216' AND series_id = '8083d857-178a-48e9-833e-038836226d83' AND sort_order IS DISTINCT FROM 4;
UPDATE lessons SET sort_order = 5 WHERE id = '205ca44a-d675-480e-ba21-b3b9254362fc' AND series_id = '8083d857-178a-48e9-833e-038836226d83' AND sort_order IS DISTINCT FROM 5;
-- series 823af64d-3c49-4e59-900c-bc70d3c0aab0
UPDATE lessons SET sort_order = 7 WHERE id = '24cc7a50-6d63-4d14-a404-2036268bfb0c' AND series_id = '823af64d-3c49-4e59-900c-bc70d3c0aab0' AND sort_order IS DISTINCT FROM 7;
-- series 854076a4-fde9-47e8-94b2-445a8cc94ace
UPDATE lessons SET sort_order = 1 WHERE id = 'd09db4ba-2920-4066-8281-67768d7cd506' AND series_id = '854076a4-fde9-47e8-94b2-445a8cc94ace' AND sort_order IS DISTINCT FROM 1;
UPDATE lessons SET sort_order = 2 WHERE id = 'b42caea6-1623-4f61-9958-3581e7f7ef7c' AND series_id = '854076a4-fde9-47e8-94b2-445a8cc94ace' AND sort_order IS DISTINCT FROM 2;
UPDATE lessons SET sort_order = 3 WHERE id = 'bf27fd75-3670-496f-bc92-1e69582edaa6' AND series_id = '854076a4-fde9-47e8-94b2-445a8cc94ace' AND sort_order IS DISTINCT FROM 3;
UPDATE lessons SET sort_order = 7 WHERE id = '14693ee9-0edd-4871-9cd1-8ac29474d00a' AND series_id = '854076a4-fde9-47e8-94b2-445a8cc94ace' AND sort_order IS DISTINCT FROM 7;
UPDATE lessons SET sort_order = 9 WHERE id = '553973f7-66d8-4497-a29f-97044c3dfc1c' AND series_id = '854076a4-fde9-47e8-94b2-445a8cc94ace' AND sort_order IS DISTINCT FROM 9;
UPDATE lessons SET sort_order = 10 WHERE id = '27ddd4be-713c-47f8-987a-73616f2effeb' AND series_id = '854076a4-fde9-47e8-94b2-445a8cc94ace' AND sort_order IS DISTINCT FROM 10;
-- series 8600dfad-9e4d-41af-8b85-ccc325ee1298
UPDATE lessons SET sort_order = 7 WHERE id = '06adb28d-7d9a-4cf1-a43b-533f94fbacab' AND series_id = '8600dfad-9e4d-41af-8b85-ccc325ee1298' AND sort_order IS DISTINCT FROM 7;
UPDATE lessons SET sort_order = 15 WHERE id = 'f0e948b3-981b-44b7-9c29-70f4ea40f861' AND series_id = '8600dfad-9e4d-41af-8b85-ccc325ee1298' AND sort_order IS DISTINCT FROM 15;
-- series 8badbf4e-6af4-4578-9a19-487b4be2d397
UPDATE lessons SET sort_order = 1 WHERE id = 'e03719e6-0c19-4c96-a5e4-71eb9ae2698e' AND series_id = '8badbf4e-6af4-4578-9a19-487b4be2d397' AND sort_order IS DISTINCT FROM 1;
-- series 8d0c453a-bae1-47f1-a0be-f4b310870549
UPDATE lessons SET sort_order = 1 WHERE id = 'd05b5828-78ee-4968-a10c-c9a789c5d082' AND series_id = '8d0c453a-bae1-47f1-a0be-f4b310870549' AND sort_order IS DISTINCT FROM 1;
-- series 8feaf5d4-64e8-4950-8b57-abef4a8c323a
UPDATE lessons SET sort_order = 1 WHERE id = '1a1d9100-e7cc-4075-a932-eb55672921fa' AND series_id = '8feaf5d4-64e8-4950-8b57-abef4a8c323a' AND sort_order IS DISTINCT FROM 1;
-- series 9272798e-cc86-4503-b06d-e04ae5fa1e7d
UPDATE lessons SET sort_order = 1 WHERE id = '434bc846-631a-4eb4-b251-ae96bc1e1e0e' AND series_id = '9272798e-cc86-4503-b06d-e04ae5fa1e7d' AND sort_order IS DISTINCT FROM 1;
-- series 92c65ae5-4a48-4e58-bfcd-052b9ea51ce4
UPDATE lessons SET sort_order = 1 WHERE id = '2e108747-560b-422d-ba6a-676bf35ab542' AND series_id = '92c65ae5-4a48-4e58-bfcd-052b9ea51ce4' AND sort_order IS DISTINCT FROM 1;
-- series 96d3c9e7-4172-45fe-b085-cd5afe1cbc7c
UPDATE lessons SET sort_order = 4 WHERE id = '2f51d9c8-7f76-445c-8bbe-971e1f4351d1' AND series_id = '96d3c9e7-4172-45fe-b085-cd5afe1cbc7c' AND sort_order IS DISTINCT FROM 4;
-- series 989a92bf-7678-46f7-b0a2-836e464c60de
UPDATE lessons SET sort_order = 1 WHERE id = '8188444f-0e7a-413d-9c94-bc6682b43455' AND series_id = '989a92bf-7678-46f7-b0a2-836e464c60de' AND sort_order IS DISTINCT FROM 1;
-- series 9a1d1e98-2b11-4d80-8436-bc1568f48a33
UPDATE lessons SET sort_order = 2 WHERE id = '02808458-1697-4fc0-be3e-76ffd1649807' AND series_id = '9a1d1e98-2b11-4d80-8436-bc1568f48a33' AND sort_order IS DISTINCT FROM 2;
-- series 9dac72c3-d76b-40fd-aa10-57339c08ae8a
UPDATE lessons SET sort_order = 3 WHERE id = '00c8ff54-3bf5-4d54-aabb-9f60bc57c97c' AND series_id = '9dac72c3-d76b-40fd-aa10-57339c08ae8a' AND sort_order IS DISTINCT FROM 3;
UPDATE lessons SET sort_order = 5 WHERE id = '079d3ded-52f8-4116-a097-d7ee3aa852e8' AND series_id = '9dac72c3-d76b-40fd-aa10-57339c08ae8a' AND sort_order IS DISTINCT FROM 5;
UPDATE lessons SET sort_order = 6 WHERE id = '9fe59e87-547a-4545-9669-552b851f8309' AND series_id = '9dac72c3-d76b-40fd-aa10-57339c08ae8a' AND sort_order IS DISTINCT FROM 6;
-- series 9dfb8c3d-e76d-4be0-849b-31553b15a16c
UPDATE lessons SET sort_order = 2 WHERE id = '78e3abc4-7acc-46ba-9a32-6a371e5b39ae' AND series_id = '9dfb8c3d-e76d-4be0-849b-31553b15a16c' AND sort_order IS DISTINCT FROM 2;
-- series 9fd0da03-31d6-4ea5-94c6-a9f2f502ef3f
UPDATE lessons SET sort_order = 1 WHERE id = '66983c73-4913-41b5-ac76-4e13ebb53b93' AND series_id = '9fd0da03-31d6-4ea5-94c6-a9f2f502ef3f' AND sort_order IS DISTINCT FROM 1;
-- series 9fd6815f-630a-455f-b356-3a45dbd9b88a
UPDATE lessons SET sort_order = 5 WHERE id = '1a78a0b1-51a5-4fbc-991f-fc3df3b58cf4' AND series_id = '9fd6815f-630a-455f-b356-3a45dbd9b88a' AND sort_order IS DISTINCT FROM 5;
UPDATE lessons SET sort_order = 6 WHERE id = 'cbabf07f-1635-4388-8dd0-689b6d884900' AND series_id = '9fd6815f-630a-455f-b356-3a45dbd9b88a' AND sort_order IS DISTINCT FROM 6;
UPDATE lessons SET sort_order = 13 WHERE id = 'a93fe0ea-f56d-462c-bd81-9e2b22a6bd03' AND series_id = '9fd6815f-630a-455f-b356-3a45dbd9b88a' AND sort_order IS DISTINCT FROM 13;
UPDATE lessons SET sort_order = 15 WHERE id = '166fa046-448c-4c2d-972f-2201b8fc649f' AND series_id = '9fd6815f-630a-455f-b356-3a45dbd9b88a' AND sort_order IS DISTINCT FROM 15;
-- series 9fed9c47-85f2-4830-9a81-0c718b5727c4
UPDATE lessons SET sort_order = 1 WHERE id = '1175bf86-08e8-4fd7-a802-4eefb0ad27f7' AND series_id = '9fed9c47-85f2-4830-9a81-0c718b5727c4' AND sort_order IS DISTINCT FROM 1;
-- series a01900d5-e15d-4f7e-9b6d-b614b0485aff
UPDATE lessons SET sort_order = 1 WHERE id = '0b5685d9-ef58-49eb-b28b-ededd5b247a9' AND series_id = 'a01900d5-e15d-4f7e-9b6d-b614b0485aff' AND sort_order IS DISTINCT FROM 1;
-- series a0f4dabc-1886-4352-b7a0-9c4b13b204f0
UPDATE lessons SET sort_order = 7 WHERE id = '18159a81-183e-4b58-9aa5-893bf52d550f' AND series_id = 'a0f4dabc-1886-4352-b7a0-9c4b13b204f0' AND sort_order IS DISTINCT FROM 7;
-- series a2b45bbf-e169-4854-9951-efb46265a60f
UPDATE lessons SET sort_order = 1 WHERE id = '5a585ab1-0640-4e4a-a813-89c664adec54' AND series_id = 'a2b45bbf-e169-4854-9951-efb46265a60f' AND sort_order IS DISTINCT FROM 1;
-- series a3db427a-da89-450c-8c81-668a5449091f
UPDATE lessons SET sort_order = 3 WHERE id = '12863e25-f99f-4810-ba9c-414bcb7da520' AND series_id = 'a3db427a-da89-450c-8c81-668a5449091f' AND sort_order IS DISTINCT FROM 3;
-- series a43371f2-d7d5-44bb-8b08-16d788f4703e
UPDATE lessons SET sort_order = 1 WHERE id = '1cdb96f2-66af-4b55-9439-14726edcd3a8' AND series_id = 'a43371f2-d7d5-44bb-8b08-16d788f4703e' AND sort_order IS DISTINCT FROM 1;
UPDATE lessons SET sort_order = 2 WHERE id = '6dd289f2-8adf-450d-b620-4206353eeb89' AND series_id = 'a43371f2-d7d5-44bb-8b08-16d788f4703e' AND sort_order IS DISTINCT FROM 2;
-- series ac73d81e-cc2c-4b54-8b46-edfdceba252e
UPDATE lessons SET sort_order = 1 WHERE id = '67857ab1-3b5a-4b38-bbeb-0e04cc3db35b' AND series_id = 'ac73d81e-cc2c-4b54-8b46-edfdceba252e' AND sort_order IS DISTINCT FROM 1;
-- series ac9ef44a-0c6a-57de-8b21-9d8e089c747a
UPDATE lessons SET sort_order = 1 WHERE id = '9410fea0-6f4d-44cd-8959-0aea2ea3b5eb' AND series_id = 'ac9ef44a-0c6a-57de-8b21-9d8e089c747a' AND sort_order IS DISTINCT FROM 1;
UPDATE lessons SET sort_order = 2 WHERE id = 'e58da01e-f218-4e72-8551-e3aeda5a4618' AND series_id = 'ac9ef44a-0c6a-57de-8b21-9d8e089c747a' AND sort_order IS DISTINCT FROM 2;
UPDATE lessons SET sort_order = 3 WHERE id = '2d310b7b-6a41-44f3-a644-7c81afbf972f' AND series_id = 'ac9ef44a-0c6a-57de-8b21-9d8e089c747a' AND sort_order IS DISTINCT FROM 3;
UPDATE lessons SET sort_order = 4 WHERE id = 'cb0bbbe5-dda3-4ca9-8cfe-898a2f571027' AND series_id = 'ac9ef44a-0c6a-57de-8b21-9d8e089c747a' AND sort_order IS DISTINCT FROM 4;
-- series ad4333ad-e223-4494-a747-747c047d6309
UPDATE lessons SET sort_order = 4 WHERE id = 'cd6dad01-2218-4c9b-b672-1af7e94354d9' AND series_id = 'ad4333ad-e223-4494-a747-747c047d6309' AND sort_order IS DISTINCT FROM 4;
-- series ae3d8eaf-b854-478c-9573-28ba1990115d
UPDATE lessons SET sort_order = 1 WHERE id = '55d84882-6e07-4c85-a347-dbf4ca394b1f' AND series_id = 'ae3d8eaf-b854-478c-9573-28ba1990115d' AND sort_order IS DISTINCT FROM 1;
-- series ae6670d6-9656-4628-9f4a-04d5da5a5c52
UPDATE lessons SET sort_order = 1 WHERE id = 'c208ee9d-018a-4142-8721-59c97ef0417c' AND series_id = 'ae6670d6-9656-4628-9f4a-04d5da5a5c52' AND sort_order IS DISTINCT FROM 1;
-- series af9e62bb-070e-4bb6-bef6-47661626f21a
UPDATE lessons SET sort_order = 1 WHERE id = '440aa10b-419a-4240-9778-a72e688ab48f' AND series_id = 'af9e62bb-070e-4bb6-bef6-47661626f21a' AND sort_order IS DISTINCT FROM 1;
-- series b07d65c1-9123-48eb-a55c-356514b3d274
UPDATE lessons SET sort_order = 1 WHERE id = '58e1aa73-051e-43e3-a19f-e840a6d3c775' AND series_id = 'b07d65c1-9123-48eb-a55c-356514b3d274' AND sort_order IS DISTINCT FROM 1;
-- series b12f24a5-ecad-411f-95d5-e11a2381af6b
UPDATE lessons SET sort_order = 2 WHERE id = 'be00a43d-7c1a-4584-8089-191b82871d8c' AND series_id = 'b12f24a5-ecad-411f-95d5-e11a2381af6b' AND sort_order IS DISTINCT FROM 2;
-- series b12f94a2-5158-4100-ab9b-2ef0130a09a3
UPDATE lessons SET sort_order = 2 WHERE id = '1754f117-e918-4f72-a0d6-1998dabf3105' AND series_id = 'b12f94a2-5158-4100-ab9b-2ef0130a09a3' AND sort_order IS DISTINCT FROM 2;
UPDATE lessons SET sort_order = 3 WHERE id = '7bc9f715-3efb-4066-9131-0d22cd0df23a' AND series_id = 'b12f94a2-5158-4100-ab9b-2ef0130a09a3' AND sort_order IS DISTINCT FROM 3;
-- series b179d675-876d-4c8e-889b-5c0f25d68f6e
UPDATE lessons SET sort_order = 2 WHERE id = '30ae410a-0204-4556-90d8-b14947b3120b' AND series_id = 'b179d675-876d-4c8e-889b-5c0f25d68f6e' AND sort_order IS DISTINCT FROM 2;
-- series b2f468b6-9d52-40cf-9476-c382d8fe573e
UPDATE lessons SET sort_order = 2 WHERE id = 'e41a3f81-ffda-43c7-b929-6ea8544ef31a' AND series_id = 'b2f468b6-9d52-40cf-9476-c382d8fe573e' AND sort_order IS DISTINCT FROM 2;
UPDATE lessons SET sort_order = 3 WHERE id = '05b57ea1-375b-4b31-8684-833114cd65b8' AND series_id = 'b2f468b6-9d52-40cf-9476-c382d8fe573e' AND sort_order IS DISTINCT FROM 3;
UPDATE lessons SET sort_order = 9 WHERE id = 'e682c81c-5159-4da9-824f-1b70c81d1927' AND series_id = 'b2f468b6-9d52-40cf-9476-c382d8fe573e' AND sort_order IS DISTINCT FROM 9;
-- series b36967b3-2351-4119-a1bc-e8f85799b8f8
UPDATE lessons SET sort_order = 1 WHERE id = '46707dee-fffb-4cb8-8b1c-924b1bbf43e5' AND series_id = 'b36967b3-2351-4119-a1bc-e8f85799b8f8' AND sort_order IS DISTINCT FROM 1;
UPDATE lessons SET sort_order = 3 WHERE id = '180c16e2-9639-4fbd-b023-ff4693e8b6d8' AND series_id = 'b36967b3-2351-4119-a1bc-e8f85799b8f8' AND sort_order IS DISTINCT FROM 3;
UPDATE lessons SET sort_order = 6 WHERE id = '63f3fdc4-ba6f-4b72-a72c-1a9edeeb656c' AND series_id = 'b36967b3-2351-4119-a1bc-e8f85799b8f8' AND sort_order IS DISTINCT FROM 6;
UPDATE lessons SET sort_order = 7 WHERE id = 'a680b5d1-8685-4222-817c-05939ca793fa' AND series_id = 'b36967b3-2351-4119-a1bc-e8f85799b8f8' AND sort_order IS DISTINCT FROM 7;
UPDATE lessons SET sort_order = 8 WHERE id = '93ccdab5-c05a-45ee-8629-5474ba15b734' AND series_id = 'b36967b3-2351-4119-a1bc-e8f85799b8f8' AND sort_order IS DISTINCT FROM 8;
-- series b808d539-5963-4fba-9a7c-5854a53ffbb1
UPDATE lessons SET sort_order = 1 WHERE id = '01677f73-005c-4466-ae88-1ac5e29a2286' AND series_id = 'b808d539-5963-4fba-9a7c-5854a53ffbb1' AND sort_order IS DISTINCT FROM 1;
UPDATE lessons SET sort_order = 4 WHERE id = '9da66a1a-0680-431c-9d28-54d9fa261a29' AND series_id = 'b808d539-5963-4fba-9a7c-5854a53ffbb1' AND sort_order IS DISTINCT FROM 4;
UPDATE lessons SET sort_order = 5 WHERE id = '99e8955f-aa35-4745-b12b-81542340aee4' AND series_id = 'b808d539-5963-4fba-9a7c-5854a53ffbb1' AND sort_order IS DISTINCT FROM 5;
UPDATE lessons SET sort_order = 7 WHERE id = 'da393938-8f03-412c-852d-7d6057a9088f' AND series_id = 'b808d539-5963-4fba-9a7c-5854a53ffbb1' AND sort_order IS DISTINCT FROM 7;
UPDATE lessons SET sort_order = 8 WHERE id = '07eab35a-7e9d-4855-8ba3-b5451ec1543a' AND series_id = 'b808d539-5963-4fba-9a7c-5854a53ffbb1' AND sort_order IS DISTINCT FROM 8;
UPDATE lessons SET sort_order = 10 WHERE id = '5482c22d-5eca-4dea-a7b4-ec69d2bb3553' AND series_id = 'b808d539-5963-4fba-9a7c-5854a53ffbb1' AND sort_order IS DISTINCT FROM 10;
-- series bc63eb4d-342c-42ca-8ba3-55972ed2eaed
UPDATE lessons SET sort_order = 16 WHERE id = '3e826413-e6d3-4756-ae31-9d47df311982' AND series_id = 'bc63eb4d-342c-42ca-8ba3-55972ed2eaed' AND sort_order IS DISTINCT FROM 16;
UPDATE lessons SET sort_order = 17 WHERE id = '9795013d-cd2e-4af5-8df7-23ee3a888d57' AND series_id = 'bc63eb4d-342c-42ca-8ba3-55972ed2eaed' AND sort_order IS DISTINCT FROM 17;
-- series bcb5a7b9-e8ba-4803-95c4-054527508023
UPDATE lessons SET sort_order = 1 WHERE id = '116e3b72-8ecd-45f0-9bc4-a04c7967db4b' AND series_id = 'bcb5a7b9-e8ba-4803-95c4-054527508023' AND sort_order IS DISTINCT FROM 1;
-- series bf59bf24-c38f-437c-999d-e8db3e7ca89f
UPDATE lessons SET sort_order = 3 WHERE id = '6ce67158-5e10-4f28-974b-5daf99166afb' AND series_id = 'bf59bf24-c38f-437c-999d-e8db3e7ca89f' AND sort_order IS DISTINCT FROM 3;
UPDATE lessons SET sort_order = 7 WHERE id = '2bec3e68-240c-4d23-aec3-8f868001169d' AND series_id = 'bf59bf24-c38f-437c-999d-e8db3e7ca89f' AND sort_order IS DISTINCT FROM 7;
UPDATE lessons SET sort_order = 8 WHERE id = '303dea84-7ef9-421a-ae31-c8e9985d87e7' AND series_id = 'bf59bf24-c38f-437c-999d-e8db3e7ca89f' AND sort_order IS DISTINCT FROM 8;
UPDATE lessons SET sort_order = 10 WHERE id = '43291ed8-0799-471d-a540-a2df37999cbe' AND series_id = 'bf59bf24-c38f-437c-999d-e8db3e7ca89f' AND sort_order IS DISTINCT FROM 10;
UPDATE lessons SET sort_order = 11 WHERE id = 'f4846610-3c0f-469b-bc60-42e2a5ce3437' AND series_id = 'bf59bf24-c38f-437c-999d-e8db3e7ca89f' AND sort_order IS DISTINCT FROM 11;
UPDATE lessons SET sort_order = 12 WHERE id = '376ffc74-1cb2-4868-9c11-9cafc66fa392' AND series_id = 'bf59bf24-c38f-437c-999d-e8db3e7ca89f' AND sort_order IS DISTINCT FROM 12;
-- series c1bd26f1-2502-4f47-a55f-47bb28ddef6b
UPDATE lessons SET sort_order = 4 WHERE id = '3459862b-1c96-4c60-9091-90c3df2aa3dc' AND series_id = 'c1bd26f1-2502-4f47-a55f-47bb28ddef6b' AND sort_order IS DISTINCT FROM 4;
-- series c2fbd9c2-ac65-4dd8-a5ba-53fe739b1fdb
UPDATE lessons SET sort_order = 2 WHERE id = '05478f5a-166f-4126-bc83-7899a5266c0d' AND series_id = 'c2fbd9c2-ac65-4dd8-a5ba-53fe739b1fdb' AND sort_order IS DISTINCT FROM 2;
UPDATE lessons SET sort_order = 3 WHERE id = '0bf56bf3-daec-4d27-afbe-e5fb88aad784' AND series_id = 'c2fbd9c2-ac65-4dd8-a5ba-53fe739b1fdb' AND sort_order IS DISTINCT FROM 3;
-- series c64e3c29-ced4-4791-9c9b-f6174e80a895
UPDATE lessons SET sort_order = 3 WHERE id = '9dfbcb33-f8a3-484f-9989-0d313e6a23c0' AND series_id = 'c64e3c29-ced4-4791-9c9b-f6174e80a895' AND sort_order IS DISTINCT FROM 3;
UPDATE lessons SET sort_order = 6 WHERE id = '868f879f-8ec4-4c63-bd22-e9b465909b87' AND series_id = 'c64e3c29-ced4-4791-9c9b-f6174e80a895' AND sort_order IS DISTINCT FROM 6;
-- series c66bd909-eb0c-4619-903d-fd8b2f018b57
UPDATE lessons SET sort_order = 2 WHERE id = '23465290-f432-480c-869c-4c64977a5f31' AND series_id = 'c66bd909-eb0c-4619-903d-fd8b2f018b57' AND sort_order IS DISTINCT FROM 2;
-- series c750b743-8bcb-4539-a44c-02b583c3551d
UPDATE lessons SET sort_order = 3 WHERE id = '17e6d7c9-95b1-4cac-9525-98bc1a55f3a3' AND series_id = 'c750b743-8bcb-4539-a44c-02b583c3551d' AND sort_order IS DISTINCT FROM 3;
-- series cc15d2c2-6b0e-4056-a851-795976b78224
UPDATE lessons SET sort_order = 5 WHERE id = '28ad08fc-0080-4591-9ce9-6cf318c5aecc' AND series_id = 'cc15d2c2-6b0e-4056-a851-795976b78224' AND sort_order IS DISTINCT FROM 5;
-- series d25800e7-de85-47e1-a9d0-68c9c030de2e
UPDATE lessons SET sort_order = 1 WHERE id = '2716d603-3a8a-459a-92a9-275793f65b41' AND series_id = 'd25800e7-de85-47e1-a9d0-68c9c030de2e' AND sort_order IS DISTINCT FROM 1;
-- series d2bbcaa1-b64c-4592-9931-bb201bdef1f6
UPDATE lessons SET sort_order = 1 WHERE id = '09f9498b-d0a6-43fa-b7b5-9c61d47b2dc2' AND series_id = 'd2bbcaa1-b64c-4592-9931-bb201bdef1f6' AND sort_order IS DISTINCT FROM 1;
-- series d3593809-1865-4390-bb07-3a90546968b1
UPDATE lessons SET sort_order = 2 WHERE id = 'bdd58d8c-f1cb-47aa-ac8c-22e5ebf19c2d' AND series_id = 'd3593809-1865-4390-bb07-3a90546968b1' AND sort_order IS DISTINCT FROM 2;
-- series d535adf6-a61e-4ddf-86dd-e8f1d0c4969b
UPDATE lessons SET sort_order = 1 WHERE id = '7ba5ca17-a7f4-4402-92ee-1b30118e8b75' AND series_id = 'd535adf6-a61e-4ddf-86dd-e8f1d0c4969b' AND sort_order IS DISTINCT FROM 1;
-- series d5721231-a7a7-4803-a69f-860cbfd8ec4c
UPDATE lessons SET sort_order = 1 WHERE id = '4bedb661-bbe6-4196-abbc-8f40771a8eb5' AND series_id = 'd5721231-a7a7-4803-a69f-860cbfd8ec4c' AND sort_order IS DISTINCT FROM 1;
-- series d6384ec6-e5d9-4f53-88b9-47aab92b1544
UPDATE lessons SET sort_order = 1 WHERE id = '823931cf-72ec-4777-b694-e69a98c0c70a' AND series_id = 'd6384ec6-e5d9-4f53-88b9-47aab92b1544' AND sort_order IS DISTINCT FROM 1;
UPDATE lessons SET sort_order = 2 WHERE id = '2ae53bda-d210-476c-b373-a3cf8aaa3201' AND series_id = 'd6384ec6-e5d9-4f53-88b9-47aab92b1544' AND sort_order IS DISTINCT FROM 2;
-- series d6cd0ad4-7695-4029-b570-e5530d671d3f
UPDATE lessons SET sort_order = 4 WHERE id = 'b387933c-83c8-4a08-9c9e-1e2d23af1a44' AND series_id = 'd6cd0ad4-7695-4029-b570-e5530d671d3f' AND sort_order IS DISTINCT FROM 4;
-- series d8997ad7-e462-4021-af43-4200fa5fd3ce
UPDATE lessons SET sort_order = 2 WHERE id = '8c91478d-7e64-4d74-adb8-603bf53c9c21' AND series_id = 'd8997ad7-e462-4021-af43-4200fa5fd3ce' AND sort_order IS DISTINCT FROM 2;
-- series d97b379b-778b-4251-8f0a-5c280b3e7495
UPDATE lessons SET sort_order = 4 WHERE id = '13be894c-f007-4a69-a479-9a5960bb5fab' AND series_id = 'd97b379b-778b-4251-8f0a-5c280b3e7495' AND sort_order IS DISTINCT FROM 4;
-- series dac87ce1-c5b3-45af-8ef3-ad34195a74f9
UPDATE lessons SET sort_order = 1 WHERE id = '2084cc80-5370-4fa6-ba93-f8ac665e228f' AND series_id = 'dac87ce1-c5b3-45af-8ef3-ad34195a74f9' AND sort_order IS DISTINCT FROM 1;
-- series db2ada39-a77b-4255-887a-cfe494ddd366
UPDATE lessons SET sort_order = 6 WHERE id = '10ccf972-0a30-47fa-8acb-5de1bf1da921' AND series_id = 'db2ada39-a77b-4255-887a-cfe494ddd366' AND sort_order IS DISTINCT FROM 6;
UPDATE lessons SET sort_order = 7 WHERE id = 'cc5f821e-916b-4e34-ae06-17d678d54ac0' AND series_id = 'db2ada39-a77b-4255-887a-cfe494ddd366' AND sort_order IS DISTINCT FROM 7;
-- series db9b9bf9-9a3f-466c-ad7a-03e266f537ad
UPDATE lessons SET sort_order = 1 WHERE id = 'a1f29b90-5d09-4c63-9793-353bb0f29427' AND series_id = 'db9b9bf9-9a3f-466c-ad7a-03e266f537ad' AND sort_order IS DISTINCT FROM 1;
-- series dcddd639-2207-47b6-8b9d-9fa3ecf12f50
UPDATE lessons SET sort_order = 1 WHERE id = '7617f77e-009d-4382-8424-a6f8df55adb0' AND series_id = 'dcddd639-2207-47b6-8b9d-9fa3ecf12f50' AND sort_order IS DISTINCT FROM 1;
-- series dd39ccf6-ab39-4fed-9cc5-d645a3590bba
UPDATE lessons SET sort_order = 1 WHERE id = '3b2806a8-5676-4be6-820e-1a02af968a6a' AND series_id = 'dd39ccf6-ab39-4fed-9cc5-d645a3590bba' AND sort_order IS DISTINCT FROM 1;
-- series dd52e39d-e6c3-497a-b776-09a6b74d2c0c
UPDATE lessons SET sort_order = 1 WHERE id = '5c7d9762-e295-48ea-b18b-fe1d2dbf656e' AND series_id = 'dd52e39d-e6c3-497a-b776-09a6b74d2c0c' AND sort_order IS DISTINCT FROM 1;
-- series df994af4-0123-4bfc-80d4-704f37def2f8
UPDATE lessons SET sort_order = 1 WHERE id = '752257b8-9df2-4dc3-bc34-482e63279b3d' AND series_id = 'df994af4-0123-4bfc-80d4-704f37def2f8' AND sort_order IS DISTINCT FROM 1;
-- series df9f6bc3-7122-4eaf-8630-4c3bb5531e90
UPDATE lessons SET sort_order = 4 WHERE id = '7c09139b-c103-4456-b0d4-31ae73ae38d3' AND series_id = 'df9f6bc3-7122-4eaf-8630-4c3bb5531e90' AND sort_order IS DISTINCT FROM 4;
UPDATE lessons SET sort_order = 5 WHERE id = 'e58ea7ba-c79d-464d-8266-cfc2ad5c5126' AND series_id = 'df9f6bc3-7122-4eaf-8630-4c3bb5531e90' AND sort_order IS DISTINCT FROM 5;
-- series dfef5d3f-ce54-4fc3-a9be-e73848177e68
UPDATE lessons SET sort_order = 2 WHERE id = '563be610-3e64-4eb8-b897-3e83424054ea' AND series_id = 'dfef5d3f-ce54-4fc3-a9be-e73848177e68' AND sort_order IS DISTINCT FROM 2;
UPDATE lessons SET sort_order = 3 WHERE id = '569ee107-e162-4909-be0f-058b77fbd004' AND series_id = 'dfef5d3f-ce54-4fc3-a9be-e73848177e68' AND sort_order IS DISTINCT FROM 3;
UPDATE lessons SET sort_order = 4 WHERE id = '6439b6b8-bd04-4ad3-a9ee-08866c389363' AND series_id = 'dfef5d3f-ce54-4fc3-a9be-e73848177e68' AND sort_order IS DISTINCT FROM 4;
-- series e06e88f7-1763-44b4-a55e-0969c395daf7
UPDATE lessons SET sort_order = 1 WHERE id = '31ca3313-94c1-4226-b186-dfcdc29b1f67' AND series_id = 'e06e88f7-1763-44b4-a55e-0969c395daf7' AND sort_order IS DISTINCT FROM 1;
UPDATE lessons SET sort_order = 3 WHERE id = '407bd0fe-f8ef-4366-8cf2-010b8ed19beb' AND series_id = 'e06e88f7-1763-44b4-a55e-0969c395daf7' AND sort_order IS DISTINCT FROM 3;
UPDATE lessons SET sort_order = 6 WHERE id = '1c978594-dee1-4e01-b6d8-9c87e4a6c625' AND series_id = 'e06e88f7-1763-44b4-a55e-0969c395daf7' AND sort_order IS DISTINCT FROM 6;
-- series e1408d01-cbdc-4288-85ec-92403fa9fb7d
UPDATE lessons SET sort_order = 1 WHERE id = '2aefec01-d746-4c0c-884a-f7abbc96fdb0' AND series_id = 'e1408d01-cbdc-4288-85ec-92403fa9fb7d' AND sort_order IS DISTINCT FROM 1;
-- series e1d4f5c5-81cd-43e5-871d-a100e41540c9
UPDATE lessons SET sort_order = 5 WHERE id = 'c5ceeefa-7c63-4f8c-9311-3c10348e5341' AND series_id = 'e1d4f5c5-81cd-43e5-871d-a100e41540c9' AND sort_order IS DISTINCT FROM 5;
-- series e4a3fdb6-fd3c-4dea-9c35-edc9680b7683
UPDATE lessons SET sort_order = 1 WHERE id = '1e93752b-0d11-48f6-94f0-3c8d9e79cae9' AND series_id = 'e4a3fdb6-fd3c-4dea-9c35-edc9680b7683' AND sort_order IS DISTINCT FROM 1;
UPDATE lessons SET sort_order = 3 WHERE id = '1ed9531f-61ed-46cc-9534-d6a08001dffd' AND series_id = 'e4a3fdb6-fd3c-4dea-9c35-edc9680b7683' AND sort_order IS DISTINCT FROM 3;
-- series e59eb2dc-257c-40ce-90b6-b5f7f3d74dbe
UPDATE lessons SET sort_order = 1 WHERE id = 'bc9257c4-cd92-4869-86d4-3e433c48731c' AND series_id = 'e59eb2dc-257c-40ce-90b6-b5f7f3d74dbe' AND sort_order IS DISTINCT FROM 1;
-- series ea575b99-e32e-491a-b8a8-ac5b5adefa30
UPDATE lessons SET sort_order = 1 WHERE id = '6167c121-2465-4260-a288-3b5ac7e5c505' AND series_id = 'ea575b99-e32e-491a-b8a8-ac5b5adefa30' AND sort_order IS DISTINCT FROM 1;
-- series ec9ae746-373b-4a2d-b478-d0dcb67c0b3c
UPDATE lessons SET sort_order = 2 WHERE id = 'a7101792-db92-4ce0-a7fb-b2aef711f5ac' AND series_id = 'ec9ae746-373b-4a2d-b478-d0dcb67c0b3c' AND sort_order IS DISTINCT FROM 2;
UPDATE lessons SET sort_order = 3 WHERE id = '728a33b0-6523-49c3-86ad-55554e0222b2' AND series_id = 'ec9ae746-373b-4a2d-b478-d0dcb67c0b3c' AND sort_order IS DISTINCT FROM 3;
UPDATE lessons SET sort_order = 4 WHERE id = 'b0ebfe44-14cc-44b4-a411-f6815ef3b12e' AND series_id = 'ec9ae746-373b-4a2d-b478-d0dcb67c0b3c' AND sort_order IS DISTINCT FROM 4;
-- series ed31588e-629d-48d6-8825-c821334d6631
UPDATE lessons SET sort_order = 1 WHERE id = 'd8353f26-6208-4a3c-a256-9873d47521d4' AND series_id = 'ed31588e-629d-48d6-8825-c821334d6631' AND sort_order IS DISTINCT FROM 1;
-- series ef6893eb-0ddc-4b67-b366-dbaa8384cbf2
UPDATE lessons SET sort_order = 1 WHERE id = '2ccfaaa1-8b6d-4b28-8eac-e65d76eddebf' AND series_id = 'ef6893eb-0ddc-4b67-b366-dbaa8384cbf2' AND sort_order IS DISTINCT FROM 1;
-- series efa6b6bc-a8ae-4107-a851-9d5b133a807b
UPDATE lessons SET sort_order = 1 WHERE id = '4b2711e6-3f58-44f8-b804-d9e42efe762d' AND series_id = 'efa6b6bc-a8ae-4107-a851-9d5b133a807b' AND sort_order IS DISTINCT FROM 1;
-- series efcffcd5-7776-4a7d-8a81-617d01069dd8
UPDATE lessons SET sort_order = 1 WHERE id = '0af087b7-abbb-487a-9527-8736530a4d54' AND series_id = 'efcffcd5-7776-4a7d-8a81-617d01069dd8' AND sort_order IS DISTINCT FROM 1;
-- series f351f752-dd2f-4cdc-ba2a-282a41b22aa4
UPDATE lessons SET sort_order = 3 WHERE id = '6b7208d9-7766-4b73-8330-80e635948fb2' AND series_id = 'f351f752-dd2f-4cdc-ba2a-282a41b22aa4' AND sort_order IS DISTINCT FROM 3;
-- series fd2c4fae-a99f-420e-b054-5203e09c7c50
UPDATE lessons SET sort_order = 3 WHERE id = 'd5c60d68-6f59-488a-9fe3-55197fadd2b7' AND series_id = 'fd2c4fae-a99f-420e-b054-5203e09c7c50' AND sort_order IS DISTINCT FROM 3;


-- ============================================================================
-- SECTION 2 — mixed-scale repack (6 series, the order_only pages NOT explained by
-- dropped move-sorts). ROOT CAUSE: in these series some lessons got UNIT-scale
-- sorts (1..6, inline from copy_lesson) while others got DECADE-scale sorts
-- (10,20,30… from the stage-7 set_lesson_sort repack). Unit 5 sorts before decade
-- 10 → wrong order vs the old page. FIX: repack the whole series onto the decade
-- scale in the OLD page order. Resolution: old item → live row by matched_lesson_id
-- when it lives in this series, else by unique normalized-title within the series.

-- /מאגר-השיעורים-והמאמרים/כתובים/אסתר/אסתר-בבית-הנשים-פרק-ב/  (series ba9b9a7d-5658-4d19-8c32-9bb1c1704f4e)
UPDATE lessons SET sort_order = 10 WHERE id = 'f1e1208c-86ac-5a1e-a6d2-8a06929777b0' AND series_id = 'ba9b9a7d-5658-4d19-8c32-9bb1c1704f4e' AND sort_order IS DISTINCT FROM 10;
UPDATE lessons SET sort_order = 20 WHERE id = '9a9a0788-a425-4e18-8c6f-3ee25390e81e' AND series_id = 'ba9b9a7d-5658-4d19-8c32-9bb1c1704f4e' AND sort_order IS DISTINCT FROM 20;
UPDATE lessons SET sort_order = 30 WHERE id = 'da0ab228-2245-493c-8924-ad646ca62653' AND series_id = 'ba9b9a7d-5658-4d19-8c32-9bb1c1704f4e' AND sort_order IS DISTINCT FROM 30;
UPDATE lessons SET sort_order = 40 WHERE id = '05539df0-14e6-4134-a23f-557501e7960c' AND series_id = 'ba9b9a7d-5658-4d19-8c32-9bb1c1704f4e' AND sort_order IS DISTINCT FROM 40;
UPDATE lessons SET sort_order = 50 WHERE id = '16310be4-25e1-5c73-97c5-2f15d8c560f8' AND series_id = 'ba9b9a7d-5658-4d19-8c32-9bb1c1704f4e' AND sort_order IS DISTINCT FROM 50;
UPDATE lessons SET sort_order = 60 WHERE id = 'fdb1e67d-baad-40cd-b43e-1b1f6e9c2dd5' AND series_id = 'ba9b9a7d-5658-4d19-8c32-9bb1c1704f4e' AND sort_order IS DISTINCT FROM 60;
UPDATE lessons SET sort_order = 70 WHERE id = 'e38685ec-7c71-4ff1-b0d7-ac8e199eae8e' AND series_id = 'ba9b9a7d-5658-4d19-8c32-9bb1c1704f4e' AND sort_order IS DISTINCT FROM 70;

-- /מאגר-השיעורים-והמאמרים/כתובים/אסתר/מאמרים-מגילת-אסתר/  (series 4fa37eb1-064a-4924-9c9a-10ef7e515e52)
UPDATE lessons SET sort_order = 10 WHERE id = '8e621a43-9a3c-4ec9-8f81-48fb97a88210' AND series_id = '4fa37eb1-064a-4924-9c9a-10ef7e515e52' AND sort_order IS DISTINCT FROM 10;
UPDATE lessons SET sort_order = 20 WHERE id = '4c53173d-0414-505c-8cd9-54243a37b27f' AND series_id = '4fa37eb1-064a-4924-9c9a-10ef7e515e52' AND sort_order IS DISTINCT FROM 20;
UPDATE lessons SET sort_order = 30 WHERE id = '5599b9dd-e66d-5cb9-8b9d-c0ea9d14731d' AND series_id = '4fa37eb1-064a-4924-9c9a-10ef7e515e52' AND sort_order IS DISTINCT FROM 30;
UPDATE lessons SET sort_order = 40 WHERE id = '6f7e323a-3d2c-4bb7-a646-71f9b27664ed' AND series_id = '4fa37eb1-064a-4924-9c9a-10ef7e515e52' AND sort_order IS DISTINCT FROM 40;
UPDATE lessons SET sort_order = 50 WHERE id = '02ddcd9a-ff00-4891-9307-7368a26148d7' AND series_id = '4fa37eb1-064a-4924-9c9a-10ef7e515e52' AND sort_order IS DISTINCT FROM 50;
UPDATE lessons SET sort_order = 60 WHERE id = '32a80113-4923-46e8-b52e-d2218059f024' AND series_id = '4fa37eb1-064a-4924-9c9a-10ef7e515e52' AND sort_order IS DISTINCT FROM 60;
UPDATE lessons SET sort_order = 70 WHERE id = '7f1567af-70c9-4cf3-beb0-8fc90eb12b11' AND series_id = '4fa37eb1-064a-4924-9c9a-10ef7e515e52' AND sort_order IS DISTINCT FROM 70;
UPDATE lessons SET sort_order = 80 WHERE id = '8115c0f0-5c0a-4af2-a72d-9a8e5b2f5ac5' AND series_id = '4fa37eb1-064a-4924-9c9a-10ef7e515e52' AND sort_order IS DISTINCT FROM 80;
UPDATE lessons SET sort_order = 90 WHERE id = '37437e3e-6d66-5668-986f-bb9a372ec335' AND series_id = '4fa37eb1-064a-4924-9c9a-10ef7e515e52' AND sort_order IS DISTINCT FROM 90;

-- /מאגר-השיעורים-והמאמרים/כתובים/אסתר/נתינת-בית-המן-לאסתר-פרק-ח/  (series a0d1ec14-400e-4094-8952-c28874c514f8)
UPDATE lessons SET sort_order = 10 WHERE id = '3c460218-b2ba-401a-bb07-5ab8de1ae170' AND series_id = 'a0d1ec14-400e-4094-8952-c28874c514f8' AND sort_order IS DISTINCT FROM 10;
UPDATE lessons SET sort_order = 20 WHERE id = '5a36f3c1-29dd-5919-a525-3e949279c9d9' AND series_id = 'a0d1ec14-400e-4094-8952-c28874c514f8' AND sort_order IS DISTINCT FROM 20;
UPDATE lessons SET sort_order = 30 WHERE id = 'f265e7e9-0d71-5edb-ae42-8471d292b356' AND series_id = 'a0d1ec14-400e-4094-8952-c28874c514f8' AND sort_order IS DISTINCT FROM 30;
UPDATE lessons SET sort_order = 40 WHERE id = '53263135-a91f-44d9-88ac-bbf1bf3a8d42' AND series_id = 'a0d1ec14-400e-4094-8952-c28874c514f8' AND sort_order IS DISTINCT FROM 40;
UPDATE lessons SET sort_order = 50 WHERE id = '903b44a7-1668-4431-943d-6fd5f4c2b3a6' AND series_id = 'a0d1ec14-400e-4094-8952-c28874c514f8' AND sort_order IS DISTINCT FROM 50;

-- /מאגר-השיעורים-והמאמרים/כתובים/משלי/כל-השיעורים-בספר-משלי/  (series f71c762a-4d9d-4cc3-af23-adfdd629885c)
UPDATE lessons SET sort_order = 10 WHERE id = '4892b4d9-0e42-598d-808a-028d48e08aa0' AND series_id = 'f71c762a-4d9d-4cc3-af23-adfdd629885c' AND sort_order IS DISTINCT FROM 10;
UPDATE lessons SET sort_order = 20 WHERE id = 'ac81359b-2682-45bd-9acc-08e4173d28f4' AND series_id = 'f71c762a-4d9d-4cc3-af23-adfdd629885c' AND sort_order IS DISTINCT FROM 20;
UPDATE lessons SET sort_order = 30 WHERE id = '7223668f-ba3d-5b8b-bd0f-897bbd926323' AND series_id = 'f71c762a-4d9d-4cc3-af23-adfdd629885c' AND sort_order IS DISTINCT FROM 30;
UPDATE lessons SET sort_order = 40 WHERE id = '927ef9b7-21a0-566a-b2eb-a280d2a38b82' AND series_id = 'f71c762a-4d9d-4cc3-af23-adfdd629885c' AND sort_order IS DISTINCT FROM 40;
UPDATE lessons SET sort_order = 50 WHERE id = 'b34ed9ac-3555-5935-84cd-0986bda2935d' AND series_id = 'f71c762a-4d9d-4cc3-af23-adfdd629885c' AND sort_order IS DISTINCT FROM 50;

-- /מאגר-השיעורים-והמאמרים/נביאים/שופטים/ספר-שופטים/  (series 2525e746-8f22-4cab-9666-64e7718f805a)
UPDATE lessons SET sort_order = 10 WHERE id = '5c8062c0-74b7-4f5c-89f4-1d436bd93bd9' AND series_id = '2525e746-8f22-4cab-9666-64e7718f805a' AND sort_order IS DISTINCT FROM 10;
UPDATE lessons SET sort_order = 20 WHERE id = 'cd2aff3e-304c-4fa0-9111-f33d4b33d656' AND series_id = '2525e746-8f22-4cab-9666-64e7718f805a' AND sort_order IS DISTINCT FROM 20;
UPDATE lessons SET sort_order = 30 WHERE id = '4530fbd5-aa15-494d-9173-7b4662a92a22' AND series_id = '2525e746-8f22-4cab-9666-64e7718f805a' AND sort_order IS DISTINCT FROM 30;
UPDATE lessons SET sort_order = 40 WHERE id = '2bb2aa77-d339-492a-bf1f-7b9d3820ad9f' AND series_id = '2525e746-8f22-4cab-9666-64e7718f805a' AND sort_order IS DISTINCT FROM 40;
-- UNRESOLVED old position 5: 'שירת דבורה' — manual review
UPDATE lessons SET sort_order = 60 WHERE id = 'a826e543-8345-4208-a941-665003bdd4b3' AND series_id = '2525e746-8f22-4cab-9666-64e7718f805a' AND sort_order IS DISTINCT FROM 60;
UPDATE lessons SET sort_order = 70 WHERE id = '16cf5006-e051-401d-a20c-00d14d9ae36d' AND series_id = '2525e746-8f22-4cab-9666-64e7718f805a' AND sort_order IS DISTINCT FROM 70;
UPDATE lessons SET sort_order = 80 WHERE id = 'beca76cb-024e-4e78-94af-84d83a08ace7' AND series_id = '2525e746-8f22-4cab-9666-64e7718f805a' AND sort_order IS DISTINCT FROM 80;
UPDATE lessons SET sort_order = 90 WHERE id = 'e6eaab79-0d1c-469b-a7b4-2015e78be742' AND series_id = '2525e746-8f22-4cab-9666-64e7718f805a' AND sort_order IS DISTINCT FROM 90;
UPDATE lessons SET sort_order = 100 WHERE id = '7463112c-0c25-456c-b263-a87d65925886' AND series_id = '2525e746-8f22-4cab-9666-64e7718f805a' AND sort_order IS DISTINCT FROM 100;
UPDATE lessons SET sort_order = 110 WHERE id = 'd2b9dc6c-ca48-474c-9853-45f3f1722f69' AND series_id = '2525e746-8f22-4cab-9666-64e7718f805a' AND sort_order IS DISTINCT FROM 110;

-- /מאגר-השיעורים-והמאמרים/תורה/בראשית/מאמרים-על-פרשיות-בראשית/  (series a5505b1a-0b55-4558-8b98-88e13e88793b)
UPDATE lessons SET sort_order = 10 WHERE id = 'bad1bd59-b696-4e98-8e28-f194cc1565e5' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 10;
UPDATE lessons SET sort_order = 20 WHERE id = '5a2a7171-0b03-44bd-8363-0a364ef0b4ed' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 20;
UPDATE lessons SET sort_order = 30 WHERE id = '8053be1d-9874-4cde-8e68-121bec9bd1d6' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 30;
UPDATE lessons SET sort_order = 40 WHERE id = 'c3d70dcb-25f2-4eb1-8ca8-ccdaf150b1e5' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 40;
UPDATE lessons SET sort_order = 50 WHERE id = 'eddcc4e1-afbe-4605-9004-eed90da97071' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 50;
UPDATE lessons SET sort_order = 60 WHERE id = '5f9a8099-229d-4548-9115-a721e44a65bd' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 60;
UPDATE lessons SET sort_order = 70 WHERE id = 'c6044c54-04e2-442a-b7c4-a61a2ff8249c' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 70;
UPDATE lessons SET sort_order = 80 WHERE id = '7c0ae70c-e31c-415a-be4f-2b9aa1211a14' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 80;
UPDATE lessons SET sort_order = 90 WHERE id = '68ee2c42-81b5-48c1-8bc5-8c93f45c0c84' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 90;
UPDATE lessons SET sort_order = 100 WHERE id = 'cbf16201-a2f7-5110-9e43-c1fb1af38dcf' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 100;
UPDATE lessons SET sort_order = 110 WHERE id = '35082c4a-0255-5af9-9232-9bb63c3b8634' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 110;
UPDATE lessons SET sort_order = 120 WHERE id = '06562389-26fa-54c3-b472-a13ccd163f6f' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 120;
UPDATE lessons SET sort_order = 130 WHERE id = '1875aa46-8863-53cf-b795-26fc205d7e61' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 130;
UPDATE lessons SET sort_order = 140 WHERE id = 'a4540567-fffd-4899-ab63-73b5172d76b0' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 140;
UPDATE lessons SET sort_order = 150 WHERE id = '5f145241-8053-489f-980f-76db7625f97b' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 150;
UPDATE lessons SET sort_order = 160 WHERE id = '8eef07f9-ca9b-448f-93cc-7e3abbed1ef3' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 160;
UPDATE lessons SET sort_order = 170 WHERE id = 'bd0071e4-dd10-4ece-9a71-4680a4f7bca8' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 170;
UPDATE lessons SET sort_order = 180 WHERE id = '7c0ae70c-e31c-415a-be4f-2b9aa1211a14' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 180;
UPDATE lessons SET sort_order = 190 WHERE id = 'a10dd0b2-d546-4b74-a2f6-50388ca95062' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 190;
UPDATE lessons SET sort_order = 200 WHERE id = 'dd89e674-b357-4bda-bc63-a35ff95c978e' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 200;
UPDATE lessons SET sort_order = 210 WHERE id = '2931f253-def1-46b8-914f-5c01d290110e' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 210;
UPDATE lessons SET sort_order = 220 WHERE id = '9c374758-72fb-4856-8244-5443b1e39216' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 220;
UPDATE lessons SET sort_order = 230 WHERE id = 'cc574ecb-20ed-41a9-80e9-534593a617df' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 230;
UPDATE lessons SET sort_order = 240 WHERE id = 'a91865bf-a393-47aa-99d0-89e49ad81652' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 240;
UPDATE lessons SET sort_order = 250 WHERE id = '6a6adbfb-265b-4b42-acbb-242fff2b9790' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 250;
UPDATE lessons SET sort_order = 260 WHERE id = 'ff9e5422-8df9-4469-b904-ca2da4f0120d' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 260;
UPDATE lessons SET sort_order = 270 WHERE id = '64247ab6-30c5-41b3-95f9-863618d59049' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 270;
UPDATE lessons SET sort_order = 280 WHERE id = '7e08b373-7b2b-45f6-b6fb-d471d4cac586' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 280;
UPDATE lessons SET sort_order = 290 WHERE id = 'f31b7138-35f7-4aeb-b9be-42d12797a644' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 290;
UPDATE lessons SET sort_order = 300 WHERE id = 'fdae16c4-5773-4f43-9529-10d242c39ff2' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 300;
UPDATE lessons SET sort_order = 310 WHERE id = '9650c122-3944-4959-acda-6873afb0574e' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 310;
UPDATE lessons SET sort_order = 320 WHERE id = 'ab2a854d-6d3d-41fd-a3ac-f0a81fa90fd4' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 320;
UPDATE lessons SET sort_order = 330 WHERE id = 'f6cd2dbb-4338-44c2-9a1c-c58d6928431e' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 330;
UPDATE lessons SET sort_order = 340 WHERE id = '0b2eec9e-4aef-40bd-a6ea-750518631611' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 340;
UPDATE lessons SET sort_order = 350 WHERE id = '4fe57dd3-9051-470e-b125-b622e181f139' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 350;
UPDATE lessons SET sort_order = 360 WHERE id = '0864f76f-f171-4f33-a0f7-00de337b69e9' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 360;
UPDATE lessons SET sort_order = 370 WHERE id = '4e8be14b-1669-4e89-b744-83669fbde89a' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 370;
UPDATE lessons SET sort_order = 380 WHERE id = '3f55e7d7-dbd5-4d52-8f16-9d8420bfd095' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 380;
UPDATE lessons SET sort_order = 390 WHERE id = 'eb7ee187-81d8-4923-80a5-1c504827238c' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 390;
-- UNRESOLVED old position 40: 'הולך ואור' — manual review
UPDATE lessons SET sort_order = 410 WHERE id = 'af164b05-48ce-4c30-aa63-0d2c0d2052fc' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 410;
-- UNRESOLVED old position 42: 'על נסיך ועל נפלאותיך ועל ישועתך' — manual review
-- UNRESOLVED old position 43: 'קומי אורי כי בא אורך' — manual review
-- UNRESOLVED old position 44: 'קבעו שיר ורננים' — manual review
UPDATE lessons SET sort_order = 450 WHERE id = '7e060baa-d198-4b27-a54b-f762cd602592' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 450;
UPDATE lessons SET sort_order = 460 WHERE id = '337a026d-2a60-4d08-b5de-cb8b50ab8aaf' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 460;
UPDATE lessons SET sort_order = 470 WHERE id = 'fbc81582-0acc-4e8d-a37e-0544ff8baf66' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 470;
UPDATE lessons SET sort_order = 480 WHERE id = 'f9518905-e5cf-40a6-9410-4105fd7e7789' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 480;
UPDATE lessons SET sort_order = 490 WHERE id = '12d425ec-781b-4706-9fc9-248aa09df3d0' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 490;
UPDATE lessons SET sort_order = 500 WHERE id = 'cb8fbcf7-f047-4b93-838a-fc8b7a5b69a5' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 500;
UPDATE lessons SET sort_order = 510 WHERE id = 'f2cb7a87-23c0-4179-85ee-86a480452e11' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 510;
UPDATE lessons SET sort_order = 520 WHERE id = 'c04635cc-2dee-4a05-b985-890d7110ae5c' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 520;
UPDATE lessons SET sort_order = 530 WHERE id = '6d68dc20-1f88-4f38-a41e-104f606bbac2' AND series_id = 'a5505b1a-0b55-4558-8b98-88e13e88793b' AND sort_order IS DISTINCT FROM 530;

COMMIT;
