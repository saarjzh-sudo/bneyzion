# ROUND2 — teachers-wing data-gaps, evidence report

*Round-2 data-gaps author · 2026-06-12 · DB access: SELECT-only via `sbq.py` (pzvmwfexeiruelwiujxn). Deliverables: `fixes/ROUND2.sql` (executed by the orchestrator), `fixes/gen_round2_sql.py` (reproducible generator). Band convention: 1..999 = sidebar member at position, 0 = page-only, ≥1000 = parked.*

**Pre-apply live numbers (every scoping/verification SELECT in ROUND2.sql was run read-only before delivery):**

| § | What | Rows to change (live) | Post-apply expectation |
|---|------|----------------------:|------------------------|
| 1 | Teachers by-book band hygiene | **2 demotes** (0 slot sets, 0 renames) | v1 = 0 banded non-members; v1b = 50 members in band |
| 2 | teacher_listing_items completion | **13 INSERTs + 2 ref UPDATEs + 2 series renames + 1 audience union** | v2: ביאור 119, ביאורי-מילים 39, דגשים 84, דפי-עבודה 70, חידות-חזרה 118, סיכום 159, חוברת-עבודה 1, ספר-יהושע 1 |
| 3 | Creators RPI completeness | **14 INSERTs + 4 position UPDATEs + 1 block shift (39 rows) + 2 lesson-title restores** | v3: בניה 4, מארגל 5, מורשה 6, ושננתם 50, בן-ארצי 53 |
| 4 | 3 missing copy-source lessons | **3 lesson INSERTs + 2 lesson_count syncs** | v4: בבל-series lc=2, תולדות lc=4, order 10/15/20/30 |

All statements idempotent (guarded); re-running ROUND2.sql is a no-op.

---

## §1 Teachers by-book band hygiene — 8/35 → 35/35

**Key discovery: the teachers wing has its OWN physical subtree** under root `6bfb7aaa` (מאגר עזרי הלמידה) — it does NOT share the public book nodes. Tops: פרשת-השבוע (code slot, no series) → איך-מלמדים `26a5e728`@2 → תורה `2e248097`@3 → נביאים `42ac131e`@4 → כתובים `cb088913`@5.

**The data is already almost entirely in place.** tree_plan's 50 teachers `set_series_sort` ops were applied: all **50 old-tree members** (4 tops + 35 books + 11 `דפי עבודה - X` collections) sit in band at their exact old positions, with **0 title mismatches** (normalize_he). The old tree's other depth-4 children are code-rendered: 11 `כל התכנים ב-X` aliases (alias_of_parent in tree_map) + 47 parsha slots + פרשת-השבוע top (`tree_plan.code_asks_data.teachers_parsha_slots`, 48 slots).

**Residual gaps — 2 banded non-members → sort_order=0:**

| id | title | where | live band |
|---|---|---|---|
| `e93c7a85` | לב הפרק - ישעיהו | child of the teachers ROOT — would render as a 6th top, colliding with code-slot position 1 (פרשת השבוע) | 1 |
| `08a87de3` | מפות על ספר יהושע (lc 15) | child of teachers יהושע book `c0c7fc56`; old tree has only alias+דפי-עבודה there | 12 |

**Why the verify said 8/35:** the harness replicates the *current* code (flattening every teacher-lesson-bearing series into public-book buckets). Its "extras" are not children of the teachers books at all, and its "missing" rows (e.g. `דפי עבודה - בראשית`, lesson_count=0) are excluded only by the current lesson_count>0 heuristic. Under band-driven §11 code (CODE-SPEC), the post-§1 data renders the old tree 1:1 → 35/35 + root + 3 tops.

Verification: `v1_banded_nonmembers` (banded children of the 40 policed parents not in the 50-member whitelist) — pre-apply **2**, post-apply **0**. `v1b_members_in_band` = **50** (already 50 pre-apply; asserts the slots survive).

## §2 teacher_listing_items — 13 missing rows (8 keys), 0 extras

Multiset diff (normalize_he, occurrence-counted — set-diff hides the old pages' duplicate titles) of `old_teachers_listings.content_types` (22 keys, 907 rows) vs live TLI (894 rows). **All 13 target (key, sort) positions verified vacant live.** Resolution per row:

| key @ old pos | old row | resolved ref | how |
|---|---|---|---|
| ביאור הפסוקים @4 | פשט הפסוקים (series, שמות, lc 9) | series `7e80baeb` | parent=teachers שמות book + lc match (the בראשית twin `4151139e` already at @2) |
| ביאור הפסוקים @79 | הודעה והבהרה (שמות copy) | lesson `638283fc` | only copy inside 'ביאור הפסוקים חומש שמות' (`dd81feee`); the בראשית copy `5087415c` already at @55 |
| ביאור הפסוקים @116 | מגילת רות עם ביאור ושננתם - פרק א | lesson `cab5bf1d` | same physical series `c57e8a68` the live rows @117-119 use for פרקים ב-ד; + audience union `{general}`→`{general,teachers}` (old shows it on the public רות page AND this teachers page — ROUND1 §6 semantics) |
| חידות חזרה @33/34/35 | חידות על פי א"ב וישב/מקץ/ויגש (רש"י series) | lessons `56f8e65e`/`70baf51b`/`29538a7b` | legacy media exact: `144142/וישב-רשי.doc`, `144156/מקץ-רשי.doc`, `144132/ויגש-רשי.doc` |
| דגשים @4/@8 | חוברות ת"ת מורשה - חומש שמות/במדבר (series) | `ab14792d` (lc 9) / `5d2ac1b3` (lc 10) | parent+lc match; **renamed** (below) |
| סיכום @14 | סיכום פרטי המשכן… (2nd occurrence — teachers-wing URL) | lesson `c445b645` | the copy sitting in teachers שמות book `96ba287a` (old @13 = public-URL copy `0450dc36`, already in TLI) |
| דפי עבודה @31, ביאורי מילים @39, חוברת עבודה @1, ספר יהושע @1 | חוברת עבודה והכוונה ללימוד עצמי על ספר יהושע (one physical pdf, 4 pages) | lesson `9e696ff0` ×4 | its `legacy_attachment_url` IS the old page URL; pdf already rehosted (`he-f1fb12bd0e.pdf`); also carries content_type='חוברת עבודה' |

**2 ref corrections:** live חידות-חזרה rows @22 (`54fbd3f0`) and @23 (`113e8074`) point at the **רש"י** copies (`70baf51b`/`29538a7b`, legacy `מקץ-רשי`/`ויגש-רשי`) while the old rows 22/23 are the **plain** א"ב-series copies → re-point to `75d419b1` (legacy `144157/מקץ.doc`) and `fba93d33` (`144133/ויגש.doc`), both in series `697e6741`. Row @21 already correct (`1157a3cc`, plain). The רש"י copies move to their true slots 34/35 via the inserts.

**2 series renames** (old listing label = truth, shown identically on the content-type page AND the old שמות/במדבר book pages; live sibling collision pre-checked — none): `ab14792d` → 'חוברות ת"ת מורשה - חומש שמות', `5d2ac1b3` → 'חוברות ת"ת מורשה - חומש במדבר'. Note the old site itself uses the short 'חוברות - חומש X' for בראשית/ויקרא — those live titles already match and stay.

**Yoav items for §2: none** — every old row resolved to an existing physical copy.

After apply, the two fallback-mode keys (חוברת עבודה, ספר יהושע) gain TLI rows → the page switches to TLI mode (old=1, new=1) and the 12/3 fallback "extras" disappear from those pages.

## §3 Creators rabbi_page_items — 282 old rows, 26/31 creators already complete

Multiset diff per creator (old `creators[name].items` vs ALL live RPI of the mapped rabbi_id): **18 unrepresented old rows across 5 creators**; the verify's "1/31 PASS" is the *fallback* comparison (all teacher-tagged lessons per rabbi) — it will only flip when code renders RPI (CODE-SPEC §11); the data side after this round is complete except 2 yoav rows.

- **בניה כהן** (`…121`, 3/4): INSERT @4 → series `7e80baeb` (פשט הפסוקים שמות; the old page shows the same title twice — one series per chumash).
- **נתן מארגל** (`…103`, 1/5): old lists 'חידות לילדים - פרשת השבוע, לפי סדר העולים לתורה' **5×, one series per chumash** (lc 11/10/12/11/11). The plan collapsed all 5 onto the ויקרא series `dd663cb8` and apply-dedup kept one row. Fix: move the live row (`20dd3db5`) 1→3 (ויקרא's true slot) + INSERT בראשית `faaf06ea`@1, שמות `26a2076b`@2, במדבר `b654c91c`@4, דברים `00b7226a`@5 (each matched by teachers-book parent + lc).
- **תלמוד תורה מורשה** (`b5555555`, 4/6): live rows were renumbered dense 1-4. Restore old slots (3 UPDATEs by row id) + INSERT @2 `ab14792d`, @5 `5d2ac1b3` (the renamed ת"ת-מורשה series — same refs as §2).
- **ושננתם** (`6f4b2572`, 49/50): missing = old @11, the **second** occurrence of 'סיכום פרטי המשכן…' (teachers-wing URL; @1 = public copy `0450dc36`, present). Live 11..49 are old 12..50 shifted −1 → guarded block shift `sort_order ≥ 11 → +1` (39 rows) + INSERT @11 → `c445b645` (same teachers copy as TLI @14).
- **עמנואל בן ארצי** (`744da303`, dual-page rabbi — see schema note): 10 unrepresented occurrences →
  - 4 INSERTs פשט בפרשה: old shows it 5×, one per chumash; live RPI holds only the שמות copy (`3610bdba`, merged/active, lc-drift 21→76 noted). INSERT בראשית `ff799d93`@7 (lc 23 ✓), ויקרא `ef23357b`@9 (16 ✓), במדבר `fe1147aa`@10 (11 ✓), דברים `73a01cf4`@11 (11 ✓).
  - INSERT לב הפרק (the דניאל copy) `a69ddf30`@22 (lc 11 ✓, old url …/כתובים/דניאל/לב-הפרק/).
  - INSERT לב הפרק - ישעיהו 2nd copy `c8b151d0`@26 — **flagged**: old row lc=0 (an empty alias-path row); the live twin is a `draft`, lc 0 series. Faithful to the old emptiness, but it will render only if the creator page doesn't filter draft series — orchestrator/code may prefer dropping it.
  - 2 lesson-title restores instead of inserts (the physical docs are already on his RPI page; migration collapsed two old title variants into one):
    - `5dae4141` → **'הסבר פשוט על מבנה ארץ ישראל'** (short; old public rav-page row #34 + creator row #35; the והנחלות variant stays on `7f8497ba` — both share the same S3 mp4, distinct old rows).
    - `2752644d` → **'שרטוט בית המקדש ביחזקאל על פי שיטות המלבי"ם רש"י ומצודות'** ('על פי'; old rav-page row #40 + creator row #41 + old teachers יחזקאל book page; the 'לפי' variant stays on `2fdb8df6`, creator row #46).

**Yoav items (2):**
1. creator row #40 — שיעור 'ציר זמן תקופת המלכים' (old url `/מאגר-עזרי-הלמידה/נביאים/מלכים-ב/ציר-זמן-תקופת-המלכים/`, old author **בן ארצי** on both the creator page and the מלכים-ב/יחזקאל book pages). No live lesson with this title is attributed to him — the 6 copies created from that very page carry rabbi **ושננתם**, the others belong to עמראני/לוי/שוהם. Author conflict → not invented.
2. creator row #42 — שיעור 'ציר זמן גלות בבל ותחילת בית שני' (old url `…/כתובים/עזרא/…`, old author בן ארצי). Same situation: live copies `b12ca2df`/`a39f902d` = ושננתם, `b9592152` = שמעון שוהם (that one also carries a wrong legacy media `באורי-מילים-זכריה.doc`). → yoav to rule on attribution; then a 1-line RPI INSERT closes each.

**Schema note (code lane, NOT fixable in SQL):** `rabbi_page_items` has no `scope` column, and 4 creators are dual-page rabbis (הילביץ' `71aa933c`, מנחם אליהו `21815917`, בן ארצי `744da303`, עמירם אלבה `3da1df9d`). Their public rav-page rows and creator rows share one ladder — the apply already merged+renumbered בן ארצי's page (his live sorts ≠ either old page; qa dups @41-43/@51, יהודה-וישראל dup @1/@44). My inserts use the **old creator positions**, which collide with existing merged sorts (ties render nondeterministically within equal sort). Exact dual-page order needs `scope`(`'public'|'creator'`) on rabbi_page_items + per-scope queries — recommend for round 3 / CODE-SPEC §11 amendment. Non-dual creators are positionally exact after this round.

## §4 Three missing copy-source lessons — all 3 recovered, 0 yoav

Old public listing scrape carries full rows (title+rabbi+S3 audio+series+slot) for all three; both parent series exist live; **media is on `bneyzion.s3…amazonaws.com` (AWS), not bneyzion.co.il → no Rule-13 rehost needed.** Rabbi = הרב יואב אוריאל `acd34d0f` (live, active).

| new id | title | series | slot | audio |
|---|---|---|---|---|
| `57bbbd2e…` | בבל מול ירושלים - בקעה מול הרים שיעור ראשון | `6be34cb5` (live published, was EMPTY — the verify's "missing 2" on its public page) | 10 | s3 `…הבקעה+מול+ההרים.mp3` |
| `151a5d32…` | בבל מול ירושלים - בקעה מול הרים שיעור שני | `6be34cb5` | 20 | s3 `…הבקעה+מול+ההרים+-+שיעור+שני.mp3` |
| `e9ca1179…` | תולדות קרבת ה' לאדם - ביציאת מצרים ובמתן תורה | `d7a37161` (live, 3/4 lessons at 10/20/30) | **15** (old promo: 'שיעור שני בסדרה') | s3 `…ביציאת מצרים ובמעמד הר סיני.mp3` |

Conventions copied from live siblings (`06241e7e` etc.): `source_type='audio'`, `audience_tags={general}`, `status='published'`, `bible_book='בראשית'` for the תולדות lesson, description NULL (old promo text is truncated in the scrape — not inserted). `series.lesson_count` re-synced for both series (no trigger maintains it — checked `pg_trigger`).

Side note: `plans/STAGE9-dropped-refs.jsonl` row 1 is a dropped RPI ref for rabbi `acd34d0f` (יואב אוריאל) — if it pointed at one of these lessons, the rabbis lane can now restore it; his old rav page lists the two SERIES (rows #0/#2), which already exist.

---

## Numbers recap

- **§1**: 2 demotes · 0 slot sets · 0 renames (50/50 members already in band at old positions)
- **§2**: 13 TLI INSERTs (8 keys) · 2 ref UPDATEs · 2 series renames · 1 audience union · 0 yoav
- **§3**: 14 RPI INSERTs · 4 position UPDATEs · 1 guarded block shift (39 rows) · 2 lesson-title restores · **2 yoav** (בן ארצי ציר-זמן ×2, author conflict) · 1 flagged insert (draft לב-הפרק-ישעיהו @26)
- **§4**: 3 lesson INSERTs · 2 lesson_count syncs · 0 yoav

## Exact verification expectations (embedded in ROUND2.sql)

| check | pre-apply (measured) | post-apply expected |
|---|---|---|
| `s1_to_demote` / `v1_banded_nonmembers` | 2 / 2 | 0 / **0** |
| `v1b_members_in_band` | 50 | **50** |
| `s2_to_insert` | 13 | 0 |
| v2 per-key counts | 116 / 38 / 82 / 69 / 115 / 158 / – / – | **119 / 39 / 84 / 70 / 118 / 159 / 1 / 1** |
| v2b riddles 21-23 → plain, 33-35 → רש"י | 3 rows (22/23 wrong refs) | **6 rows**: `1157a3cc, 75d419b1, fba93d33, 56f8e65e, 70baf51b, 29538a7b` |
| `s3_already_present` | 0 | 14 (insert-target tuples present) |
| v3 per-creator RPI counts | 3 / 1 / 4 / 49 / 47 | **4 / 5 / 6 / 50 / 53** (בניה / מארגל / מורשה / ושננתם / בן-ארצי) |
| v3b ושננתם ladder | 49 rows, 1..49, 49 distinct | **50 rows, 1..50, 50 distinct** |
| v3c restored titles (published) | 0 rows | **1 + 1** (the draft `0eccb955` short-title twin is excluded by status filter) |
| `s4_to_insert` | 3 | 0 |
| v4 series counts / order | בבל lc 0 (empty), תולדות lc 3 @10/20/30 | **בבל lc 2 @10,20 · תולדות lc 4 @10,15,20,30** |
