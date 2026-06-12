# DRYRUN-REPORT — oneone_apply.py

*2026-06-12 08:13 · plans loaded: lessons_plan_ketuvim, lessons_plan_moadim_misc, lessons_plan_neviim_aharonim, lessons_plan_neviim_rishonim, lessons_plan_torah, rabbis_plan, teachers_plan, topics_plan, tree_plan · resolved ops: 27039 · runtime 3s · flags: only_high=True with_extra_schema=False*

## Resolution summary (merge rules applied)

- A.move->copy: **24**
- C.drop-series-sort: **5**
- D.draft-cancelled: **10**
- J.rpi-dup-dropped: **69**
- K.insert-dup-dropped: **178**
- L.retag-union: **3**
- M.dropped: **6**
- N.dropped: **2**
- O.field-dropped: **62**
- P.create-dup-dropped: **8**
- copy-identity-dropped: **20**
- create-resolved-to-existing: **1**
- empty-update-dropped: **136**
- nav_visible-normalized: **74**
- tmp aliases (K/P remaps): **186**
- creates resolved to existing series: **1** (tmp_series_007→e93c7a85)
- NOTE: nav_visible normalization: 74 update_series ops folded into sort-band convention (74 sort values parked/synthesized)

## Preconditions (stages 0-2, verify-only)

- backups-ok: 1
- null-parent-roots: 18
- schema-copied_from(GATED): 1
- schema-lesson_topics.sort_order: 1
- schema-lessons.sort_order: 1
- schema-rabbi_page_items: 1
- schema-series_topics(GATED): 1
- schema-teacher_listing_items(GATED): 1

## Per-stage dry-run totals

| stage | total | would-change | would-create | already-satisfied | invalid-ref | anomaly | blocked-by-deferred | queued | gated | deferred (med/low/sanity) |
|---|---|---|---|---|---|---|---|---|---|---|
| 3 | 31 | 0 | 0 | 28 | 0 | 0 | 0 | 0 | 0 | 3/0/0 |
| 4 | 345 | 245 | 45 | 23 | 0 | 0 | 0 | 0 | 0 | 32/0/0 |
| 5 | 5598 | 920 | 4441 | 2 | 0 | 0 | 0 | 0 | 0 | 225/10/0 |
| 6 | 338 | 0 | 102 | 31 | 0 | 0 | 12 | 0 | 0 | 185/8/0 |
| 7 | 16702 | 15642 | 0 | 33 | 0 | 114 | 131 | 0 | 0 | 776/6/0 |
| 8 | 1696 | 1211 | 177 | 122 | 0 | 0 | 6 | 0 | 178 | 2/0/0 |
| 9 | 2329 | 0 | 1095 | 0 | 0 | 0 | 4 | 0 | 895 | 335/0/0 |
| 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0/0/0 |

### Stage 7 repack projection
- scopes (physical series) receiving lesson sort ladders: **996**
- rows to renumber (10,20,30…): **14525**
- same-slot ties absorbed by repack: **1**

### Stage 10
- series.lesson_count stale vs published-count today: **282**

## Queues (Rule 13 + content scrape)

- rehost queue (bneyzion.co.il media → Storage): **25** (runnable ops only)
- content-scrape queue: **51** (cache hits: 0; misses fetched live at execute)
- media-discovery (fetch_media_from_old_page): **0**
- additional queue load inside DEFERRED med/low inserts (activates with --include-med): scrape **152**, rehost **1**, media-discovery **6**

## Gated on pending schema (--with-extra-schema)

- link_series_topic: **178** ops
- teacher_listing_item: **895** ops
- copied_from stamping on copy_lesson: column present

## Blocking issues (must fix before --execute)

- none

## Blocked by deferred dependencies (high ops needing a med/low prerequisite)

*These runnable (high-confidence) ops reference a row that only a deferred med/low op creates. They will error harmlessly at --execute under --only-high; they succeed with --include-med.*

- 🔗 lessons_plan_ketuvim[2666] copy_lesson (conf high) depends on deferred tmp 'tmp:ins_ketuvim_002'
- 🔗 lessons_plan_ketuvim[2668] copy_lesson (conf high) depends on deferred tmp 'tmp:ins_ketuvim_003'
- 🔗 lessons_plan_ketuvim[2671] copy_lesson (conf high) depends on deferred tmp 'tmp:ins_ketuvim_005'
- 🔗 lessons_plan_ketuvim[2673] copy_lesson (conf high) depends on deferred tmp 'tmp:ins_ketuvim_006'
- 🔗 lessons_plan_ketuvim[2680] copy_lesson (conf high) depends on deferred tmp 'tmp:ins_ketuvim_010'
- 🔗 lessons_plan_ketuvim[2682] copy_lesson (conf high) depends on deferred tmp 'tmp:ins_ketuvim_011'
- 🔗 lessons_plan_ketuvim[2684] copy_lesson (conf high) depends on deferred tmp 'tmp:ins_ketuvim_012'
- 🔗 lessons_plan_ketuvim[2689] copy_lesson (conf high) depends on deferred tmp 'tmp:ins_ketuvim_015'
- 🔗 lessons_plan_ketuvim[2691] copy_lesson (conf high) depends on deferred tmp 'tmp:ins_ketuvim_016'
- 🔗 lessons_plan_ketuvim[2693] copy_lesson (conf high) depends on deferred tmp 'tmp:ins_ketuvim_017'
- 🔗 lessons_plan_neviim_aharonim[156] copy_lesson (conf high) depends on deferred tmp 'tmp_lesson_008'
- 🔗 lessons_plan_neviim_aharonim[158] copy_lesson (conf high) depends on deferred tmp 'tmp_lesson_007'
- 🔗 lessons_plan_neviim_rishonim[29] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_001'
- 🔗 lessons_plan_neviim_rishonim[32] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_002'
- 🔗 lessons_plan_neviim_rishonim[35] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_003'
- 🔗 lessons_plan_neviim_rishonim[38] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_004'
- 🔗 lessons_plan_neviim_rishonim[41] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_005'
- 🔗 lessons_plan_neviim_rishonim[44] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_006'
- 🔗 lessons_plan_neviim_rishonim[47] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_007'
- 🔗 lessons_plan_neviim_rishonim[50] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_008'
- 🔗 lessons_plan_neviim_rishonim[53] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_009'
- 🔗 lessons_plan_neviim_rishonim[56] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_010'
- 🔗 lessons_plan_neviim_rishonim[59] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_011'
- 🔗 lessons_plan_neviim_rishonim[62] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_012'
- 🔗 lessons_plan_neviim_rishonim[65] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_013'
- 🔗 lessons_plan_neviim_rishonim[1077] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_014'
- 🔗 lessons_plan_neviim_rishonim[1080] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_015'
- 🔗 lessons_plan_neviim_rishonim[1083] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_016'
- 🔗 lessons_plan_neviim_rishonim[1086] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_017'
- 🔗 lessons_plan_neviim_rishonim[1089] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_018'
- 🔗 lessons_plan_neviim_rishonim[1092] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_019'
- 🔗 lessons_plan_neviim_rishonim[1095] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_020'
- 🔗 lessons_plan_neviim_rishonim[1098] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_021'
- 🔗 lessons_plan_neviim_rishonim[1101] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_022'
- 🔗 lessons_plan_neviim_rishonim[1104] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_023'
- 🔗 lessons_plan_neviim_rishonim[1107] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_024'
- 🔗 lessons_plan_neviim_rishonim[1110] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_025'
- 🔗 lessons_plan_neviim_rishonim[1113] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_026'
- 🔗 lessons_plan_neviim_rishonim[1116] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_027'
- 🔗 lessons_plan_neviim_rishonim[1119] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_028'
- 🔗 lessons_plan_neviim_rishonim[1122] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_029'
- 🔗 lessons_plan_neviim_rishonim[1607] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_030'
- 🔗 lessons_plan_neviim_rishonim[1610] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_031'
- 🔗 lessons_plan_neviim_rishonim[1613] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_032'
- 🔗 lessons_plan_neviim_rishonim[1616] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_033'
- 🔗 lessons_plan_neviim_rishonim[1619] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_034'
- 🔗 lessons_plan_neviim_rishonim[1622] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_035'
- 🔗 lessons_plan_neviim_rishonim[1625] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_036'
- 🔗 lessons_plan_neviim_rishonim[1628] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_037'
- 🔗 lessons_plan_neviim_rishonim[1631] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_038'
- 🔗 lessons_plan_neviim_rishonim[1634] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_039'
- 🔗 lessons_plan_neviim_rishonim[2118] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_040'
- 🔗 lessons_plan_neviim_rishonim[2121] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_041'
- 🔗 lessons_plan_neviim_rishonim[2124] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_042'
- 🔗 lessons_plan_neviim_rishonim[2127] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_043'
- 🔗 lessons_plan_neviim_rishonim[2130] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_044'
- 🔗 lessons_plan_neviim_rishonim[2133] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_045'
- 🔗 lessons_plan_neviim_rishonim[2136] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_046'
- 🔗 lessons_plan_neviim_rishonim[2139] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_047'
- 🔗 lessons_plan_neviim_rishonim[2142] set_lesson_sort (conf high) depends on deferred tmp 'tmp_qa_rish_048'
- … +93 more

## Anomalies (non-blocking, review)


### Unresolved set_lesson_sort targets (114)

- lessons_plan_torah[5]: lesson 41ae4ec4-567 has no home/copy/insert row in scope 096fc3cd-999
- lessons_plan_torah[9]: lesson 5844c2d8-03a has no home/copy/insert row in scope 096fc3cd-999
- lessons_plan_torah[47]: lesson 34e21190-21b has no home/copy/insert row in scope 2015e21e-be0
- lessons_plan_torah[49]: lesson 20d32ea5-01f has no home/copy/insert row in scope 2015e21e-be0
- lessons_plan_torah[51]: lesson 8991fe2e-d97 has no home/copy/insert row in scope 2015e21e-be0
- lessons_plan_torah[53]: lesson 4d706655-5c8 has no home/copy/insert row in scope 2015e21e-be0
- lessons_plan_torah[74]: lesson 23dd7c4d-ba0 has no home/copy/insert row in scope 8f089f22-3cc
- lessons_plan_torah[82]: lesson c9ba9e05-312 has no home/copy/insert row in scope 8f089f22-3cc
- lessons_plan_torah[84]: lesson 14dc3622-352 has no home/copy/insert row in scope 8f089f22-3cc
- lessons_plan_torah[86]: lesson 9c327787-b40 has no home/copy/insert row in scope 8f089f22-3cc
- lessons_plan_torah[88]: lesson 5da10c0c-f37 has no home/copy/insert row in scope 8f089f22-3cc
- lessons_plan_torah[128]: lesson 09d62212-4a8 has no home/copy/insert row in scope 224f701b-a54
- lessons_plan_torah[133]: lesson d72e0625-a27 has no home/copy/insert row in scope 7f5a8fc9-741
- lessons_plan_torah[418]: lesson 502aa196-20a has no home/copy/insert row in scope dfb8c480-35c
- lessons_plan_torah[420]: lesson 20e777b0-6c0 has no home/copy/insert row in scope dfb8c480-35c
- lessons_plan_torah[465]: lesson 0504fa4b-1c7 has no home/copy/insert row in scope 158b38e7-9bc
- lessons_plan_torah[591]: lesson bc833c16-6db has no home/copy/insert row in scope db78e0a3-3bc
- lessons_plan_torah[595]: lesson 903ce234-fb3 has no home/copy/insert row in scope db78e0a3-3bc
- lessons_plan_torah[597]: lesson d88a8f2e-c62 has no home/copy/insert row in scope db78e0a3-3bc
- lessons_plan_torah[834]: lesson 22579f5d-a28 has no home/copy/insert row in scope a4a97704-0ee
- lessons_plan_torah[849]: lesson 7b28d888-0ef has no home/copy/insert row in scope a4a97704-0ee
- lessons_plan_torah[855]: lesson d4811f7c-fe1 has no home/copy/insert row in scope a4a97704-0ee
- lessons_plan_torah[859]: lesson c6aea004-a58 has no home/copy/insert row in scope a4a97704-0ee
- lessons_plan_torah[865]: lesson ef1ff823-645 has no home/copy/insert row in scope a4a97704-0ee
- lessons_plan_torah[1094]: lesson 7cdd0bae-a8b has no home/copy/insert row in scope b8bfb329-6b3
- lessons_plan_torah[1115]: lesson de4d7bc2-fcc has no home/copy/insert row in scope 88710799-12d
- lessons_plan_torah[1117]: lesson 43282a9d-334 has no home/copy/insert row in scope 88710799-12d
- lessons_plan_torah[1119]: lesson e0276a13-423 has no home/copy/insert row in scope 88710799-12d
- lessons_plan_torah[1123]: lesson 2d95d562-1f5 has no home/copy/insert row in scope 88710799-12d
- lessons_plan_torah[1125]: lesson 389b07f7-eef has no home/copy/insert row in scope 88710799-12d
- lessons_plan_torah[1139]: lesson 19833331-493 has no home/copy/insert row in scope 089dd80d-dab
- lessons_plan_torah[1148]: lesson 0a8d964e-f0d has no home/copy/insert row in scope 7e8d543c-cd9
- lessons_plan_torah[1150]: lesson ce093698-142 has no home/copy/insert row in scope 7e8d543c-cd9
- lessons_plan_torah[1152]: lesson 375c4596-608 has no home/copy/insert row in scope 7e8d543c-cd9
- lessons_plan_torah[1203]: lesson 60c0f83b-43e has no home/copy/insert row in scope 2b7c2d84-17e
- lessons_plan_torah[1205]: lesson 5a8fe77e-7e0 has no home/copy/insert row in scope 2b7c2d84-17e
- lessons_plan_torah[1602]: lesson bc3ea7ea-d41 has no home/copy/insert row in scope 51508e0a-8fd
- lessons_plan_torah[1723]: lesson d91da7aa-7c3 has no home/copy/insert row in scope 6267feb7-de6
- lessons_plan_torah[1943]: lesson 2ec69771-8fe has no home/copy/insert row in scope 23ba1703-650
- lessons_plan_torah[1945]: lesson a93dc0e8-1c5 has no home/copy/insert row in scope 23ba1703-650
- lessons_plan_torah[1947]: lesson c9889718-e6d has no home/copy/insert row in scope 23ba1703-650
- lessons_plan_torah[2083]: lesson 46f2c3c4-5ba has no home/copy/insert row in scope 5149a23b-818
- lessons_plan_torah[2087]: lesson 9b4b69ba-f77 has no home/copy/insert row in scope 5149a23b-818
- lessons_plan_torah[2089]: lesson 94d326b3-5b4 has no home/copy/insert row in scope 5149a23b-818
- lessons_plan_torah[2539]: lesson bf532edd-840 has no home/copy/insert row in scope aab1289b-808
- lessons_plan_torah[2541]: lesson c30ea8b2-b49 has no home/copy/insert row in scope aab1289b-808
- lessons_plan_torah[2552]: lesson bb1e7df3-e0f has no home/copy/insert row in scope e0c50172-363
- lessons_plan_torah[2554]: lesson 0304dfce-a83 has no home/copy/insert row in scope e0c50172-363
- lessons_plan_torah[2556]: lesson 3ff0c52e-ca9 has no home/copy/insert row in scope e0c50172-363
- lessons_plan_torah[2601]: lesson db5569a0-059 has no home/copy/insert row in scope b77de52d-5c0
- lessons_plan_torah[2654]: lesson 5edeefc8-4bd has no home/copy/insert row in scope 1bac2cf0-7fc
- lessons_plan_neviim_rishonim[17]: lesson e293739d-244 has no home/copy/insert row in scope 831d1ccb-a1a
- lessons_plan_neviim_rishonim[430]: lesson f3ed353c-727 has no home/copy/insert row in scope e9100001-000
- lessons_plan_neviim_rishonim[502]: lesson 3d23e918-a5e has no home/copy/insert row in scope c3d40001-000
- lessons_plan_neviim_rishonim[1067]: lesson 0795b438-b9d has no home/copy/insert row in scope ff96641e-68f
- lessons_plan_neviim_rishonim[1069]: lesson 4c0494e3-d6e has no home/copy/insert row in scope ff96641e-68f
- lessons_plan_neviim_rishonim[1298]: lesson 95ca2980-be1 has no home/copy/insert row in scope c1010001-000
- lessons_plan_neviim_rishonim[1350]: lesson 95ca2980-be1 has no home/copy/insert row in scope d7d34c29-675
- lessons_plan_neviim_rishonim[1918]: lesson 4f658e2e-7b4 has no home/copy/insert row in scope d2020001-000
- lessons_plan_neviim_rishonim[2080]: lesson 00ef9dea-747 has no home/copy/insert row in scope 2917a33f-482
- … +54 more

## Examples per bucket


**stage 7 / anomaly:**
- `lessons_plan_torah[5] set_lesson_sort no row in scope (home=None)`
- `lessons_plan_torah[9] set_lesson_sort no row in scope (home=None)`
- `lessons_plan_torah[47] set_lesson_sort no row in scope (home=None)`
- `lessons_plan_torah[49] set_lesson_sort no row in scope (home=None)`
- `lessons_plan_torah[51] set_lesson_sort no row in scope (home=None)`
- `lessons_plan_torah[53] set_lesson_sort no row in scope (home=None)`
- `lessons_plan_torah[74] set_lesson_sort no row in scope (home=None)`
- `lessons_plan_torah[82] set_lesson_sort no row in scope (home=None)`
