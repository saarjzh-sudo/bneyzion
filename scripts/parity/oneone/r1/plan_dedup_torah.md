# plan_dedup_torah — targeted COPY-clone dedup (Round-1 Fix-Round 1)

**Goal:** undo the over-fill that the 10.6 consolidation created by COPYing lessons
into Torah rabbi-series. Delete only the surplus in-series duplicate, keep the
canonical, and only where `real_count > GT old_count`. READ-ONLY analysis via
`sbq.py`; the orchestrator runs `plan_dedup_torah.sql` inside `BEGIN…COMMIT`.

DB: Supabase `pzvmwfexeiruelwiujxn` · prod branch `feat/navigator-bot`.

---

## How a clone was identified

A surplus row in a non-parsha, non-teacher rabbi-series (child of a Torah *category*
book node) qualifies as a deletable clone only if **both**:

1. its `normalize(title)` (NFC → strip niqqud `U+0591..U+05C7` → collapse punctuation
   → lowercase) matches another published row **in the same series** (an in-series
   title-duplicate group), **and**
2. it is the non-canonical member — i.e. it is the row that either carries
   `copied_from` (a literal COPY), or (when neither carries `copied_from`) is the
   one **without** child FK rows / media, i.e. the consolidation artifact.

Canonical preference (kept row), in order: row **without** `copied_from` →
row with FK children (`lesson_topics` / incoming `copied_from`) → richer media
→ older `created_at`.

**Key finding:** `copied_from` alone does **not** flag surplus. 0 clones point to a
row in their own series; every `copied_from` clone points to an original in a
*different* series (a חנוכה / פורים / פרשת-event series the consolidation copied in).
So the in-series title-duplicate test is what isolates the surplus. Many series
carry `copied_from` rows yet are already at parity (the consolidation moved an
original out and copied a replacement in) — those are **not** touched.

---

## What is explicitly NOT touched

- **Cross-book display-inflation series** in שמות — `לשון הקודש בפרשה` (149 vs 37),
  `מידות בפרשה` (117 vs 30), `עולמות חדשים בפרשה` (92 vs 21), `פשט בפרשה` (76 vs 21),
  `הארות באונקלוס` (24 vs 9). These hold the FULL multi-Torah lesson set under one
  book node; the surplus rows are **distinct lessons**, not title-dups (`dup_title=0`).
  This is the CODE count-scoping bug (C3 in ROUND1-MASTER), **not data.** No SQL.
- **Parsha event-series** (`title ~ '^\s*פרשת\s.*\|'`), **teacher nodes** (`דפי עבודה`,
  `חוברת עבודה`), **Neviim**, **Ketuvim** — out of scope, untouched.
- Series already at parity, and surplus rows whose titles are genuinely different
  (no in-series title-dup) — left in place, flagged to Yoav where relevant.

---

## Per-book results

| book | clones identified | safe-to-delete (0 FK) | FK-blocked (repoint) | deferred to Yoav | series reaching parity |
|---|---:|---:|---:|---:|---|
| **בראשית** | 10 | 10 | 0 | 0 | a5505b1a 58→53 ✓ · 46bbc3f2 28→24 ✓ · ab762d8c 15→14 ✓ |
| **שמות** | 7 | 6 | 1 (5b2527d0) | 1 (e33c840d, +1 non-clone surplus) | e33c840d 40→35* · 5b2527d0 5→4 ✓ · 6b22958d 10→9 ✓ |
| **ויקרא** | 1 | 0 | 0 | 1 (d73c8425, mis-import) | — (d73c8425 stays 26 pending Yoav) |
| **במדבר** | 1 | 0 | 1 (77adb8ce) | 0 | 77adb8ce 6→5 ✓ |
| **דברים** | 5 | 5 | 0 | 0 | b831dccd 47→45 ✓ · 4d90e367 25→23 ✓ · 8c74988d 19→18 ✓ |
| **TOTAL** | **24** | **21** | **3** | **2** (1 of which is also the e33c840d residual) | **10 series → GT parity** |

\* e33c840d (שמות שפירא) lands at **35**, not its GT old=34: it has 5 proven clones
(deleted) plus **1 extra non-clone surplus** (a genuinely distinct row, no title-dup,
no `copied_from`). Per "doubt → Yoav", that 6th row is left in place and flagged — the
master plan likewise did not delete it.

### Apply outcome (if all 21 clean + 2 repoint-and-delete run; Yoav block stays commented)
- **23 rows deleted** (21 clean + 2 after FK repoint).
- **10 series brought to GT parity** (e33c840d to 34+1 residual).
- `d73c8425` (ויקרא `עבד עברי`) unchanged — Yoav decision pending.

---

## SECTION-A clean deletions (21) — keep → delete

| book | series | group (norm title) | keep | delete (clone) |
|---|---|---|---|---|
| בראשית | מאמרים על פרשיות בראשית `a5505b1a` | אחד היה אברהם | `7c0ae70c` (audio+topics) | `1cd5f66d` (06-01) |
| בראשית | a5505b1a | הולך ואור | `bc989f9f` | `c9c967d1` cf→חנוכה |
| בראשית | a5505b1a | על נסיך ועל נפלאותיך | `ecd0c490` | `c9c39e3e` cf→חנוכה |
| בראשית | a5505b1a | קומי אורי כי בא אורך | `fc11b3d7` | `a3d58619` cf→חנוכה |
| בראשית | a5505b1a | קבעו שיר ורננים | `42d9baf7` | `1c865371` cf→חנוכה |
| בראשית | קדושת פשוטו של מקרא `46bbc3f2` | גלגולו של שמע ישראל | `97ef427d` (media) | `8d1a6d21` (06-01 empty) |
| בראשית | 46bbc3f2 | עבירה לשמה | `c66e280f` (media+topics) | `66699e1e` (06-01 empty) |
| בראשית | 46bbc3f2 | עבר פשוט כעבר מוקדם | `05c82342` (media+topics) | `a539cdfc` (06-01 empty) |
| בראשית | 46bbc3f2 | עיון ברש"י הראשון בתורה | `10b383d1` (media+topics) | `b1ee81f8` (06-01 empty) |
| בראשית | מאמרים קצרים `ab762d8c` | ויגש אליו יהודה | `5ed9066d` (video+topics) | `a23469d3` (06-01) |
| דברים | מאמרים - חומש דברים `b831dccd` | כיצד יתכן שתורתנו | `61f9dc8e` | `d76bd2e9` cf→פורים |
| דברים | b831dccd | שמחה של מצוה | `97bf711f` | `abb26f30` cf→סוכות |
| דברים | פרשת שבוע- דברים `4d90e367` | פרשת התשובה | `c87eaa76` (topics) | `9f2cb59a` (03-08) |
| דברים | 4d90e367 | הברית | `01cc2acc` (topics) | `6eed1e0c` (03-08) |
| דברים | מאמרים על פרשיות דברים `8c74988d` | מורשה | `bcc802bf` | `01f7dbbf` cf→שמיני עצרת |
| שמות | מאמרים על פרשיות שמות `e33c840d` | וטהרתם | `ed2973ea` | `4ce73fb6` cf→כי תשא |
| שמות | e33c840d | ילכו מחיל אל חיל | `0006614f` | `767fcfdf` cf→כי תשא |
| שמות | e33c840d | שחורה אני ונאוה | `03177fc1` | `548c2444` cf→כי תשא |
| שמות | e33c840d | שני לחת אבנים כראשנים | `01fff1b9` | `2a027817` cf→כי תשא |
| שמות | e33c840d | תורה מאתי תצא | `17d1478e` | `9a05cae3` cf→כי תשא |
| שמות | שיעורים על התנ"ך - שמות `6b22958d` | בגדי הכהונה | `2cb0f3af` (topics+copy) | `b63c302c` (03-08) |

## SECTION-B FK-blocked targets (3)

| # | book/series | group | keep | delete | blocking FK | resolution |
|---|---|---|---|---|---|---|
| B1 | שמות · ונגרובר `5b2527d0` | הדרך אל הגאולה | `e1ed7e1f` (incoming copy) | `3cdc934f` (02-23) | `lesson_topics:1` | repoint topic → canonical, then delete (identical content) |
| B2 | במדבר · מתקרבים `77adb8ce` | איך העיז קורח | `ef803466` (topics+copy) | `f9653c4c` (06-01) | `user_history:1` | repoint watch-record → canonical, then delete |
| B3 | ויקרא · תירוש `d73c8425` | עבד עברי | `9de08b75` | `74c38a37` | `lesson_topics:2` (both rows) | **COMMENTED — Yoav** |

---

## Yoav doubts (do NOT auto-apply)

1. **ויקרא `d73c8425` "עבד עברי"** — master plan already flagged: **both** copies point
   to a *משפטים* (שמות) MP3 attributed to ג'יאמי → likely a **mis-import**, not a plain
   clone. Both carry `lesson_topics`. The repoint+delete is written but **commented
   out** (§B3). Yoav to confirm which row (if any) is the genuine ויקרא lesson and
   whether the source MP3 must be re-sourced. Until then ויקרא stays at 26 (GT 25).
2. **שמות `e33c840d` residual +1** — after deleting the 5 clones the series is at 35 vs
   GT 34. The 6th surplus is a distinct row (no title-dup, no `copied_from`) → not a
   clone; left in place for Yoav to confirm it is/ isn't on the old page.

### Surplus rows that are NOT clones (left untouched, no SQL — over-fill flagged elsewhere)
These have `real > old` but **0 in-series title-dups** → handled by display-dedup / the
master-plan flags, never by this dedup pass: בראשית `a4a97704` (+8), `59f305fb` (+4),
`9de1aa21` (+3), `182cc679` (+1); במדבר `82460c3c` (+1), `6ba0b449` (split-fix, separate
plan); דברים `b3e5c089` (+1 genuine surplus "הכרת תודה לכל", Yoav).

---

## Safety properties of plan_dedup_torah.sql

- **Idempotent / guarded.** Every DELETE is `WHERE id=<clone> AND series_id=<series>
  AND NOT EXISTS(...)` on all 7 NO-ACTION FKs (`lesson_comments`, `lesson_dedications`,
  `lesson_topics`, `user_favorites`, `user_history`, `user_enrollments.last_lesson_id`,
  incoming `lessons.copied_from`) **AND** `EXISTS(canonical in same series)`. Re-run = 0
  rows. If any FK appears later, the row simply won't delete (no error, no orphan).
- **No cascade loss.** The 3 CASCADE FKs (`lesson_rabbis`, `rabbi_page_items`,
  `teacher_listing_items`) were audited to **0** on every delete-target — no attribution
  or listing is lost.
- **No empty series.** Min published count in any touched series after the pass = 4
  (asserted by the EMPTY-SERIES-GUARD select). Canonical sibling is required to exist.
- **lesson_count refreshed** for the 10 modified series (Section C).
- **Verification select** (Section D) asserts each series real_count == GT old_count
  (e33c840d==35, d73c8425==26 by design).
- Run as `BEGIN` → inspect Section-D output → `COMMIT` if `at_parity=true` for all rows
  else `ROLLBACK`. **Suggest a `*_bak_dedup_<date>` snapshot of the 23 deleted ids
  before COMMIT** (consistent with prior rounds' backup discipline).
