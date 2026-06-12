# ROUND3 — rabbi pages (rabbi_page_items), evidence report

*RABBI-RPI completion author · 2026-06-12 · DB access: SELECT-only via `sbq.py` (pzvmwfexeiruelwiujxn). Deliverables: `fixes/ROUND3-rabbis.sql` (executed by the orchestrator), `fixes/round3_scope.json` (id-level scope), `fixes/gen_round3_rabbis.py` (reproducible resolution → SQL). No git/vercel/src changes.*

**Baseline:** rabbis verify 113/154 PASS, 41 fails (`reports/verify_results.json`).

## Headline

| Metric | Count |
|---|---:|
| Failing pages analyzed | **41** |
| Sanctioned-deviation pages (NO SQL, documented below) | **21** |
| Pages fixed by SQL | **20** |
| — of which in-band ladder becomes **exactly** the old page | **15** |
| — with documented residual gaps (yoav / sanctioned-missing) | **5** |
| rpi INSERTs (missing old rows resolved to physical ids) | **30** |
| rpi position fixes (`sort_order` → old-idx+1) | **113** |
| rpi retargets (wrong physical lesson behind an old row) | **1** |
| Parked extras (`sort_order` → 9000+, **zero deletes**) | **129** |
| Lesson title restores to the old display title | **3** |
| Series title restores (אבינר) | **4** |
| Lesson publishes (old-public rows stuck `draft`) | **2** |
| Audience unions (teachers-only row shown on old public page) | **1** |
| Yoav rows (content truly absent) | **5** |

**Post-apply simulation** (offline replication of `oneone_verify.run_rabbis` semantics against the patched ladders): all 20 fixed rabbis show **0 extras, 0 order breaks, 0 slot collisions in-band**; the only in-band misses are the 5 yoav rows + 7 sanctioned-missing rows (cross-attributed שו"ת living on the true author's page).

## Per-rabbi scope

| Rabbi | old rows | live rpi | moves | inserts | parks | yoav | sanct-miss | in-band after |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| הרב איתן שנדורפי | 103 | 124 | 0 | 0 | 22 | 1 | 0 | 102 |
| הרב אס"ף בנדל | 15 | 20 | 0 | 1 | 6 | 0 | 0 | 15 |
| הרב אריה אברמסון | 5 | 5 | 0 | 0 | 0 | 0 | 0 | 5 |
| הרב אריק אוריאל | 3 | 5 | 0 | 0 | 2 | 0 | 0 | 3 |
| הרב חגי ולוסקי | 10 | 4 | 4 | 6 | 0 | 0 | 0 | 10 |
| הרב יהונתן מיכאלי | 5 | 1 | 1 | 4 | 0 | 0 | 0 | 5 |
| הרב יהונתן עידן | 3 | 1 | 1 | 2 | 0 | 0 | 0 | 3 |
| הרב יואב אוריאל | 144 | 164 | 29 | 1 | 26 | 0 | 5 | 139 |
| הרב יוסי ברינר | 31 | 46 | 0 | 1 | 16 | 0 | 0 | 31 |
| הרב יוסף שילר | 16 | 26 | 12 | 4 | 14 | 0 | 0 | 16 |
| הרב מאיר הילביץ' | 5 | 6 | 0 | 0 | 1 | 0 | 0 | 5 |
| הרב מנחם שחור | 71 | 88 | 27 | 0 | 19 | 0 | 2 | 69 |
| הרב נועם וידר | 1 | 15 | 0 | 0 | 14 | 0 | 0 | 1 |
| הרב נחום נריה | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 1 |
| הרב עמירם אלבה | 19 | 20 | 0 | 0 | 1 | 0 | 0 | 19 |
| הרב עמנואל בן ארצי | 48 | 53 | 33 | 1 | 8 | 2 | 0 | 46 |
| הרב שלמה אבינר | 11 | 8 | 6 | 3 | 0 | 0 | 0 | 11 |
| הרבנית בת שבע יוסיפון (לנשים) | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 1 |
| ושננתם | 40 | 35 | 0 | 5 | 0 | 0 | 0 | 40 |
| מערכת בני ציון | 8 | 6 | 0 | 0 | 0 | 2 | 0 | 6 |

(`moves` excludes parks; `in-band after` = rows with `sort_order < 9000` post-apply.)

## Root causes found (mechanics, not just data)

1. **Double-apply duplicate blocks (~115 of the 129 parked rows).** The merged plan (`RESOLVED-OPS.jsonl`) carries rpi ops from TWO sources: `rabbis_plan` (curated, old-page positions) **and** `lessons_plan_neviim_rishonim/aharonim` (blanket rule: *"inserted public שו"ת should appear on its rabbi page"*, `sort_order: null`). The apply batch (05:30, 1,419 rows) inserted both → exact same `lesson_id` appended twice on שנדורפי (22), יואב (26), שחור (19), ברינר (16), שילר (8), בנדל (6), עמנואל (2). On נועם וידר the lessons-plan rows are not duplicates but additions — his old page lists only his series, so all 14 שו"ת are parked as deliberate-additions.
2. **Cross-attributed שו"ת lost their 9000+ band.** rabbis_plan placed 9 rows at 9000+old-idx (rows shown on the wrong rabbi's old page, moved to the true author); the apply renumbered them into the working band (e.g., אריק אוריאל 9000/9001 → 4/5; שילר 9046/9110/9137/9139/9140 → 13–17). ROUND3 restores the exact plan slots.
3. **Same-title multi-book series collapsed to one row.** The matcher (`exact_global_picked`) picked the same physical series for all 5 old rows of מידות בפרשה (חגי), לשון הקודש בפרשה (מיכאלי), הארות באונקלוס (עידן), עולמות חדשים בפרשה (שילר) and rpi-dedup dropped the rest. All chumash copies exist physically (one per book parent) — resolved by `lesson_count` + parent book and inserted at old positions. (Same fix class as ROUND2 §3a for נתן מארגל.)
4. **Title drift** (ktiv-male/typos introduced by migration): שנדורפי #102 `הייתה→היתה`, אברמסון #1 `מגלת→מגלות`, ושננתם #27 `ושננתם, קיום…→קיום…`. In all three the live title appears on **no** old surface while the restored title appears on 2–3 old surfaces (rav page, listings, topics) — safe, verified by grep over all `old_*.json`.
5. **Basename-collision mismatch (1 retarget).** ושננתם row #14 ("ספר מלכים א עם ביאור 'ושננתם'", old file `/media/142898/מלכים.pdf`) was matched by `media_basename` to `3bfe8dad` ("מפת שלושים ואחד המלכים", legacy `/media/143583/מלכים.pdf` — same basename, different media id). The true lesson exists: `e001f03e-8539-5533-8035-f8cf2035518b` with the exact legacy URL (was `draft` → published). The rpi row is retargeted, the מפה lesson stays untouched (its title is used by 6 other old rows on teachers/neviim pages).
6. **אבינר series labels:** old site itself is inconsistent (rav page + public listings say "הרב שלמה אבינר…", topic-page *series pills* say "הרב אבינר - שיחות…"). The pills are scrape metadata (`parent_series`), not compared verify rows — renamed to the rav-page/listings labels (2 surfaces over cosmetic pill).

## Cross-author resolutions (yoav FYI, med-high confidence)

Old rows whose physical lesson lives under a different rabbi — the rpi row puts them back on the page where the old site showed them (exact title + old href path match):

- בנדל #12 `תלונות על הקב"ה בתנ"ך` → lesson of הרב יואב אוריאל (`9f29a034`, series תהלים = old href path).
- ברינר #26 `פתיחת למנצח במזמורי תהילים` → lesson of יואב (`24e8524c`, תהלים).
- יואב #80 `שלוש החנוכות של חודש כסליו` → lesson of שנדורפי (`ba84d404`, series חנוכה = old href; the plan's own יואב copy was dropped at apply, STAGE9 ref `a7f6ba29`).
- ושננתם #6/#7 → lessons of יואב (`f8166389`, `526ade3e`); #29 → ושננתם-אוצר-התורה (`6b7c29ba`); #33 → ושננתם-אוצר (`7dae3eca`, +`general` audience union); #39 → הרבנית דינה ראפ (`92094505`).
- בת שבע יוסיפון #0 `רוצה להיות מלכה` → the **audio** copy `496a7521` (old row media icon = audio; the אסתר-category umbraco copy `f0e948b3` is the path-faithful alternative if Yoav prefers).

## Yoav list — content truly absent (5 rows)

| Rabbi | old # | Title | Evidence |
|---|--:|---|---|
| הרב איתן שנדורפי | 96 | שו"ת ארבע מלכויות | No שנדורפי lesson live (only הרב יעקב ידיד / ושננתם-teachers copies); plan's insert dropped (STAGE9 ref `37440dbb`). Slot 97 left vacant. |
| הרב עמנואל בן ארצי | 39 | ציר זמן תקופת המלכים | No עמנואל copy live with this exact title (only teachers copies by שוהם/עמראני/ושננתם/לוי + the draft "…כמות מידע מינימלית"); dropped refs `ad86657a`×2. |
| הרב עמנואל בן ארצי | 41 | ציר זמן גלות בבל ותחילת בית שני | Full-title copies are teachers-owned (ושננתם/שוהם); עמנואל's `ציר זמן גלות בבל` already serves old row #28; dropped refs `bc039f6a`×2. |
| מערכת בני ציון | 6 | חידון תנ"ך דיגיטלי - על ספר בראשית | Kids-section interactive quiz; no live lesson; dropped ref `2e136c2e`. |
| מערכת בני ציון | 7 | (same quiz, duplicate old row, identical href) | Old-site duplicate of #6. |

## Sanctioned-deviation pages (21 — NO SQL)

- **16 empty-old-page rabbis** (old page rendered 0 rows; new page intentionally shows real content via fallback — `rabbis_plan.stats.empty_old_pages`): אביעד תפוחי, אוהד קרקובר, אורן טרבלסי, אסף שטראוס, אריאל בראלי, אריאל כהן, אריה מרזר, ברק עוקבי, גדי שלוין, דוב ביגון, יהודה סדן, יואב אוריאל והרב עמנואל בן ארצי, משה הגר, משה שטרנברג, עקיבא קשתיאל, רפאל למפרט, שלמה יוסף ויצן.
- **הרב שמעון לוי** — old page empty by old-site server bug (nav says 408); fallback shows his real content per plan. (Open yoav item: the hidden combined row `0ae09e02`.)
- **ולו** — junk creator, old page empty, row stays hidden.
- **יונדב זר** (dup sidebar entry) — collapsed into הרב יונדב זר's single page per plan.
- **הרב אריה אוריאל** — both his old rows are attributed "הרב אריק אוריאל"; per the plan's cross-attribution policy they live on אריק's page at 9000/9001 (restored here). His page intentionally falls back. Open yoav decision: merge the two spellings (`c0da1cd2` ↔ `34ef8dae`).
- Sanctioned-missing rows on fixed pages: שחור #42→עמנואל@9042, #46→שילר@9046; יואב #110/#137/#139/#140→שילר@9110/9137/9139/9140, #131→עמנואל@9131.

## Parked rows: what the verifier and the page will show

`RabbiPage.tsx` (`useRabbiPageItems`, `src/hooks/useRabbi.ts:86-105`) renders **all** rpi rows ordered by `sort_order` — no 9000-band filter and no lesson_id dedup (code_asks #2 of rabbis_plan is NOT implemented). So after ROUND3:

- the in-band ladder is exactly the old page, and the 129 parked rows trail at the bottom (cross-attributed שו"ת there **by design**; double-apply dups there because deletes are out of scope);
- `oneone_verify.run_rabbis` (which also reads all rows) still counts parked rows as extras.

**Predicted verify after apply, unchanged verifier: 121/154** (113 + אברמסון, חגי, מיכאלי, עידן, נחום נריה, אבינר, בת שבע, ושננתם).
**One-line code/verify ask** (already sanctioned in rabbis_plan code_asks): filter `sort_order < 9000` (or dedup by `lesson_id`) in `useRabbiPageItems` + `run_rabbis` → flips בנדל, אריק, ברינר, שילר, הילביץ', וידר, עמירם too → **128/154**. Remaining 26 = 21 sanctioned pages + 5 gap pages (שנדורפי, יואב, שחור, עמנואל, מערכת בני ציון — fail only on the yoav/sanctioned-missing rows above). A duplicate-row cleanup (DELETE of the ~115 double-apply dups) needs Yoav's sign-off — ids are all in `round3_scope.json`/the SQL comments.

## Verification SELECT expectations — worst 5 ladders

All these SELECTs are embedded per-rabbi in `ROUND3-rabbis.sql`; expected values post-apply:

**1. הרב יואב אוריאל** (`acd34d0f-1288-47b8-9e8e-38e69599c294`, was 144 old vs 164 live, 6 miss / 26 extra)
- `v_acd34d0f_inband` = **139** · `v_acd34d0f_parked` = **26** · `v_acd34d0f_collisions` = **0**
- spot: `sort_order=81` → lesson `ba84d404` (שלוש החנוכות); slots **111, 132, 138, 140, 141 vacant** (sanctioned cross-attribution).

**2. הרב איתן שנדורפי** (`be153d0e-b68e-4704-a108-56f5af7d0ca9`, was 103 vs 124)
- `v_be153d0e_inband` = **102** · parked = **22** · collisions = **0**
- spot: slot **97 vacant** (yoav ארבע מלכויות); `sort_order=103` joins lesson `91bd2ced` whose title now ends `…היתה ממשיכה להיכתב גם בארץ ישראל?` (old spelling).

**3. הרב מנחם שחור** (`4822f2bb-9d1c-4adc-9554-d2a2db7bdbc8`, was 71 vs 88)
- `v_4822f2bb_inband` = **69** · parked = **19** · collisions = **0**
- spot: slots **43, 47 vacant**; their rows live at עמנואל`@9042` and שילר`@9046`.

**4. הרב עמנואל בן ארצי** (`744da303-22be-4062-a822-4ba8e8f1b02d`, was 48 vs 53, order FAIL)
- `v_744da303_inband` = **46** · parked = **8** (incl. `389b07f7@9042`, `fa0f3672@9131`) · collisions = **0** (was 5 doubled slots: 7, 9, 10, 11, 26)
- spot: slots 7–11 = פשט בפרשה בראשית→דברים (`ff799d93, 3610bdba, ef23357b, fe1147aa, 73a01cf4`); `28=d031ec89`, `30=6877c103`, `38=4586cc0a` (insert), `48=f995dea4` (single qa copy); slots **40, 42 vacant** (yoav).

**5. הרב יוסף שילר** (`2754844c-8149-4c50-922a-331664b4124e`, was 16 vs 26)
- `v_2754844c_inband` = **16** · parked = **14** (5 at plan slots 9046/9110/9137/9139/9140) · collisions = **0**
- spot: slots 1–5 = עולמות חדשים בפרשה בראשית→דברים (`b66e0cdb, e21c697e, 13854323, 0b185ef9, 5267cccb`).

Global: `SELECT count(*) FROM rabbi_page_items WHERE sort_order >= 9000` → **129** (no rows were above 9000 pre-apply; the 9 restored plan-slot rows are included in the 129).
