# ROUND1 — data-fix SQL, evidence report

*Round-1 data-fix author · 2026-06-12 · DB access: SELECT-only via `sbq.py` (pzvmwfexeiruelwiujxn). Deliverables: `fixes/ROUND1.sql` (executed by the orchestrator), `fixes/round1_scope.json` (full id-level evidence), `fixes/scope_round1.py` + `fixes/gen_round1_sql.py` (reproducible scoping → SQL).*

**Pre-apply live numbers (every scoping SELECT in ROUND1.sql was run read-only before delivery):**

| § | What | Rows to change (live) | Post-apply expectation |
|---|------|----------------------:|------------------------|
| 1 | Band hygiene — non-old-sidebar children out of band 1..99 → 0 | **70** | v1 = 0 in band |
| 1b | Band order — members at wrong old position | **2** | v1b = 2 in place |
| 2 | Renames to old sidebar labels | **14** | v2 = 14 |
| 3 | עזרא/נחמיה split books parked | **0** (already 0 — assert) | v3 = 2 |
| 4 | חידות לילדים פ"ש slot | **0** (already parent=תורה, sort=6 — assert; title via §2) | v4 = 1 |
| 5 | Topics: insert 3 + detach 1 extra + 9 lesson links | **3 + 1 + 9** | v5: 127 children, ladder 127/127, pages 5/3/1 |
| 6 | Teacher-only leaks: union `general` / strays | **44** union; **0** strays (all 6 already `sort_order IS NULL`) | v6 = 6 remaining (the reported strays) |
| 7 | Empty `audience_tags` `{}` retag | **131** | v7 = 0 |

All statements are idempotent (guarded); re-running ROUND1.sql is a no-op.

---

## §1 Band hygiene — 70 demotes (`sort_order := 0`)

**Method.** Per-parent old-sidebar membership was computed from `match/tree_map.json` (sidebar source nodes, order_index per parent), with `plans/tree_plan.json` ops as the authoritative override for the physical series id (`set_series_sort` ops whose evidence says "old sibling position", `reparent_series`, and `create_series` resolved through `state/tmp_map.json`). Alias rows (`כל השיעורים ב-X` — the 47 `code_asks_data.alias_slots`, rendered by code §2.4) are excluded from membership and from position numbering — this matches tree_plan's "1-based among real series siblings" convention exactly (cross-checked: **0 order mismatches** between live sorts and old positions across all policed parents except the 2 in §1b, and **0 missing members**).

**Policed parents: 95** = every old sidebar node with non-alias children (any depth) **+** sidebar containers with *zero* old children (depth 1–2: עובדיה, כלי-עזר root, ליווי-ת"תים/שופטים, the depth-2 נושאים-כלליים containers, etc.). Leaf collections (depth ≥ 3 with no old children) were deliberately **not** policed — their banded children are page-order domain.

**Result: 70 live children inside band 1..99 that are NOT old-sidebar nodes**, by parent:

| Parent | Demotes | Notable rows |
|---|---:|---|
| ישעיהו | 10 | ספר ישעיהו, ישעיהו בבקיאות, קריאה-וביאור…, ישעיהו-מוקלט… (the chapter-fallback/migration containers) |
| ירמיהו | 12 | same class |
| יחזקאל | 10 | same class |
| הפטרות בראשית/שמות/ויקרא/במדבר/דברים/המועדים | 16 | מאמרים-על-הפטרות…, דרכי-הפרשה…, …הרב-מנחם-שחור (legacy 10/20/30/40 sorts) |
| עובדיה (old: 0 children) | 4 | עובדיה בבקיאות, שיעורים על ספר עובדיה, קריאה-וביאור…, עובדיה-מוקלט |
| נושאים-כלליים depth-2 containers | 10 | בכח התנ"ך ננצח (lc 154, under מלחמה), המסע אל ירושלים ×2, מידות על פי התנ"ך… |
| כלי עזר root (old: 0 children) | 1 | מפות עזר לתנ"ך (4d78557b, the `maps` root — id-referenced by code, sort change safe) |
| יונה | 1 | ספר יונה הרב מאיר הילביץ' |
| דניאל | 1 | יאשיהו המלך הצדיק ומותו (misfiled; demote only — reparenting out of scope) |
| ליווי-ת"תים/שופטים | 1 | לב הפרק - שופטים |
| draft strays | 3 | אוסף-מקורות dup `e577cd74` (band 5 — the REAL member is `68582fdf` at 4 per tree_plan), פרקי הסיום (שמואל ב, band 15), לב הפרק - מועדים (band 30) |

**The 4 draft children in the sidebar** (verify guard): all live in the איך-לומדים subtree, rendered only because the *current* howToLearn query includes `status='draft'` + lesson_count-desc flattening. Data side: the two banded drafts (`e577cd74`, `bcd78881`) are demoted here; the rest already sit at sort 0 and disappear under the band-driven sidebar (code §2.1/§2.3). No status changes — none of them is an old sidebar member.

## §1b Band order — 2 fixes

Under נושאים-כלליים root, מלחמת גוג ומגוג (live 30 → old position **2**) and יג מידות הרחמים (live 60 → old position **4**). Verified live: slots 2 and 4 are vacant; all other 12 members already sit at 1,3,5..14.

## §2 Renames — 14 (old sidebar label = nav truth)

All ≥ 0.6 token overlap; sibling title-collisions pre-checked live — none. **0 rename-flags** (no matched series with overlap < 0.6).

| id | current → old label |
|---|---|
| c852edd8 | חידות לילדים - פרשת השבוע → **חידות לילדים פ"ש** |
| a1010001-…023 | דוד בקעילה ובזיף / במערה \| פרקים כ"ג-כ"ד → **דוד בקעילה ובזיף \| פרק כג** (plan split: פרק כד created as 'דוד ושאול במערה') |
| a1010001-…029 | מלחמת דוד בעמלק / מות שאול \| פרקים כ"ט-ל"א → **מלחמת דוד בעמלק \| פרקים כט-ל** (plan split: 'מות שאול ובניו \| פרק לא' created) |
| b2020001-…007 | בקשת בניין המקדש \| פרק ז' → **בקשת בנין המקדש \| פרק ז** |
| b2020001-…013 | אמנון, תמר ואבשלום \| פרקים י"ג-י"ד → **אמנון, תמר ואבשלום \| פרק יג** (plan split: 'אבשלום שב לירושלים \| פרק יד' created) |
| 95db7b7c | אביהם, אסא, נדב ובעשא \| פרק ט"ו → **אבים, אסא, נדב ובעשא \| פרק טו** |
| 8ff48316 | עליית אליהו לשמים \| פרק ב' → **עלית אליהו לשמים \| פרק ב** |
| d4040401-0002 | שיעורים על גוג ומגוג → **מעבר לשיעורים על גוג ומגוג** ⚠️ note: old row is a cross-link-styled label under מועדים→סוכות; realized live as a 4-lesson series; renamed for 1:1 label parity |
| a7070704-0001/2/3/4/7/9 | הפטרת במדבר/נשא/בהעלותך/שלח/בלק/מסעי → **הפטרת פרשת X** (6 rows) |

## §3 עזרא/נחמיה split books

Live check: עזרא `aa111111…` holds 2 page-only lessons (דפי עבודה על ספר עזרא [teachers], שאלות ותשובות ספר עזרא [general]), נחמיה `bb222222…` holds 1 (דפי עבודה על ספר נחמיה — retagged teachers in §7). **Not empty → parked at sort 0 (already 0), status stays `published`.** They still show as extra כתובים books in the verify because the *current* books-level query is status-driven — vanishes with band-driven children (code §2.1). The combined book עזרא ונחמיה (5896c267) owns sidebar slot 10 with its 23 chapter children at 1..23 (verified live, correct alias-excluded positions).

## §4 חידות לילדים פ"ש

Live: already `parent_id` = תורה root, `sort_order=6` (6th child after דברים, per old tree), `status='active'`, 50 lessons. SQL asserts idempotently; title fixed in §2. Rendering it at books level (and removing the hard-coded בראשית row, DesignSidebar.tsx:905-936) is **code §2.5** — the data is ready.

## §5 Topics sidebar (themes-root `13ca4b52…`)

- Live 125 children; **124 match the old 127 list and already carry the exact old position in `topics.sort_order`** (0 mismatches live — the verify "order FAIL" is the app ordering by computed-count desc with a 1000-row capped count query → code §7 / R10, NOT data).
- **Missing 3** (gap4 session merged/deleted them; old sidebar restores): התשובה (pos 69), נסים (81), חנ (115). None exists anywhere in `topics` → INSERT with slug `theme-X` (collision-checked), sort = old position; positions 69/81/115 verified vacant in the live ladder.
- **Extra 1**: שלושת השבועות (`e6060601…`, sort 9999) → `parent_id := NULL` (topic + its 26 lesson links survive; it just leaves sidebar membership). Note: a *series* שלושת השבועות legitimately stays at מועדים slot 14 — unrelated row.
- **Lesson links**: old topic pages held 5/3/1 rows; each title matched live to published copies; linked **one physical copy per title** (contextually chosen — התשובה rows from the 'חודש אלול וימי התשובה' series + 'מצות הוידוי' from there too; נסים from the parsha event-series copies; חנ from 'עזרא פרק ח'). Copy ids pinned in the SQL. Badge-count parity for all 127 (85 mismatches) is the app-side 1000-cap → ignored per instructions.
- חנ (1 lesson, 'קרבנות בני הגולה, חנוכת המשכן…') looks like a truncated old-site tag; restored as-is for 1:1 — flag for yoav if he wants it renamed/dropped *on both sites*.

## §6 71 teacher-only leaks → 50 distinct lessons

verify_results counts 71 *page occurrences*; the leak series set resolves to **50 distinct published teachers-only lessons** (several series render on two public URLs — e.g. book page + 'כל השיעורים…' alias page; one count drifted since the verify snapshot). Each title cross-checked against the OLD public listing scrape of its mapped page(s):

- **44 rows appear on old public pages** → genuinely dual-audience (ביאור ושננתם chapter docs on the public chapter pages, the 26 מפות-עזר rows for יהושע/שופטים, מגילת רות עם ביאור per-chapter on שבועות, עבודת הבכורות, דוד ובת שבע, האם דניאל היה נביא, etc.) → `audience_tags ∪ {general}` (keeps `teachers` — §0.3 dual-audience semantics).
- **6 rows NOT on the old public page** → stay teachers-only, `sort_order=NULL` (**all 6 already NULL live** — assert only): שאלות חזרה - דברים (8017dcf7), שאלות חזרה - ויקרא (4184c571), self-titled container rows 'מפות על ספר יהושע' (d19d3ee8) and 'מפות על ספר שופטים' (c9ce4337), חידות לילדים - פרשת נשא copy (38481fe8), מגילת רות עם ביאור ושננתם combined doc (ce9398ac). They disappear from public pages only when code §0.3 (publicAudienceFilter on lesson queries) lands — the current `useLessonsBySeries` has **no audience filter at all** (that is the actual leak mechanism; code lane).

## §7 Empty `audience_tags = {}` — 131 lessons (report said 139; live drifted to 131)

Evidence-based retag, guards on `audience_tags='{}'` so §6/§7 can't clobber each other:

- **dual `['general','teachers']` — 39**: title found on old PUBLIC pages (listings/topics/rabbi scrapes, global pool) AND on old teachers listings (e.g. מגילת איכה עם ביאור ושננתם, מפת שלושים ואחד המלכים, the חידות-לילדים copies whose titles the old public riddles page lists).
- **general `['general']` — 8**: public-only evidence (אסתר קרקע עולם, מי תקן את משמרות הכהונה?, בהר ה' יראה ×2, …).
- **teachers `['teachers']` — 74**: teachers-only evidence — חוברת עבודה לתלמיד-X, דפי עבודה…, the דגשים parsha overview docs ('פרשת אחרי מות' etc.), and the riddle copies whose exact titles the old public pages do NOT carry (e.g. 'חידות לילדים - פרשות אחרי מות קדושים'). Their public twin lives in the riddles series c852edd8, so public UX is unchanged.
- **no-signal orphans → `['general']` + flagged — 10** (per instruction): שיעור פרשת בא / בשלח / יתרו / כי תשא / משפטים / ויקהל-פקודי ×2 / תרומה-תצוה ×2, פרשת פינחס — all recorded-shiur rows inside parsha event-series; look public-shaped but no old-page hit (likely title drift in old scrape). Listed here for yoav's eyeball.

Full row-level evidence (`on_old_public_anywhere` / `on_old_teachers_listing` / verdict per id): `fixes/round1_scope.json → empties`.

---

## NOT solvable in SQL — code / yoav lanes

1. **Auto-alias wording** — the app fabricates `כל השיעורים ב{title}` rows; old custom labels differ: כל השיעורים במגילת איכה/קהלת, כל התכנים בספר דניאל, כל עזרא ונחמיה, כל השיעורים על המועדים, כל השיעורים מימי עיון בתנ"ך, כל השיעורים בנושאים הכלליים; and old sections WITHOUT an alias child (הפטרות, כלי-עזר, ליווי-ת"תים) currently get a fabricated one → CODE-SPEC §2.4 alias_slots (47 recorded slots).
2. **Band-driven sidebar not yet in code** — the demotes/asserts above only take visual effect with §2.1/§2.3/§2.5 (current code is status-driven at books level, lesson_count-desc + draft-inclusive in איך-לומדים, hard-codes חידות לילדים under בראשית, hides riddles at books level, doesn't render הפטרות depth-3).
3. **תהלים breaks the 1..99 band** — old sidebar has 150 real children; live data mirrors old positions 1..150, so 51 mizmorim (ק' onward) sit ≥100 = "parked" by convention and can never render in a 1..99 band. Needs a code decision (widen band / per-book exception). Data is already correct.
4. **Topics order + badge counts** — `topics.sort_order` is a perfect 1..127 ladder post-§5; the app must order by it (§7) and compute counts without the 1000-row cap; TopicPage's top-level `or=(lessons.audience_tags…)` is a P0 PGRST100 bug (verify header).
5. **Quick links** — 'ניווט באתר לפי ספר ופרק' (needs `/bible` index, §12) and 'פרוייקט התנ"ך המוקלט' (new root + curated page, §2.2) — unrenderable by data.
6. **Listing-page lesson diffs** (§2 of VERIFY-REPORT: missing/extra lessons, rabbi mismatches, order fails) — lessons lane (RESOLVED-OPS rounds), out of round-1 sidebar scope.
7. **Teachers wing creators/by-book failures** — `rabbi_page_items`/`teacher_listing_items` lanes; not touched here.
8. **'מעבר לשיעורים על ספר יונה'** — old grandchild under מועדים→יום הכיפורים, unmatched to any series (cross-link row) → alias/code or yoav.
9. **The 6 §6 strays + draft page-content rows** become invisible publicly only via §0.3 audience filter on lesson queries.

## Numbers recap

- Band demotes: **70** · order fixes: **2** · renames: **14** (0 flagged <0.6) · split-books: **2 asserts** · riddles: **1 assert**
- Topics: **+3 topics, +9 links, −1 extra**; order: data already 1:1
- Leak retags: **44 → dual**, **6 strays** (already hidden-by-NULL, reported)
- Empty-tags retags: **131** (39 dual / 8 general / 74 teachers / 10 flagged-general)
- Total UPDATE/INSERT statements: **38**, all guarded/idempotent; 23 embedded SELECTs (10 scoping + 13 verification) — pre-apply values captured in the table above.
