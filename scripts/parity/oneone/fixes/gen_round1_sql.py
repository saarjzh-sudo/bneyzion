#!/usr/bin/env python3
"""Generates fixes/ROUND1.sql from fixes/round1_scope.json. Deterministic, no DB access."""
import json, os

BASE = os.path.dirname(os.path.abspath(__file__))
d = json.load(open(os.path.join(BASE, "round1_scope.json"), encoding="utf-8"))

def esc(s):
    return s.replace("'", "''")

def idlist(ids, per=6):
    lines = []
    for i in range(0, len(ids), per):
        lines.append("  " + ", ".join(f"'{x}'" for x in ids[i:i+per]))
    return ",\n".join(lines)

out = []
W = out.append

W("""-- ============================================================================
-- ROUND1.sql — bnei-zion 1:1 parity, round-1 data fixes
-- Author: round-1 data-fix author (read-only scoping via sbq.py; this file is
--         EXECUTED BY THE ORCHESTRATOR, not by the author).
-- Generated from fixes/round1_scope.json (scope_round1.py, 2026-06-12) built on:
--   reports/verify_results.json + VERIFY-REPORT.md (post-apply verification)
--   old_sidebar_tree.json, match/tree_map.json, plans/tree_plan.json (+tmp_map),
--   old_topics_sidebar.json, old_topic_pages.json, old_listings_*.json,
--   old_teachers_listings.json, old_rabbi_pages.json
-- Convention: series.sort_order 1..99 = sidebar band position; 0 = page-only;
--             >=100 = parked. Every statement here is IDEMPOTENT (guarded).
-- Each section starts with a scoping SELECT that reports how many rows the
-- section is about to change (0 on re-run).
-- ============================================================================
""")

# ── Section 1: band hygiene ──
bd = d["band_demote"]
ids = [r["id"] for r in bd]
W(f"""-- ============================================================================
-- §1 BAND HYGIENE — {len(bd)} children of tree-mapped sidebar parents that are NOT
--    old-sidebar nodes but currently sit inside the sidebar band (1..99).
--    These produce the 'extra' sidebar children under ישעיהו (10), ירמיהו (12),
--    יחזקאל (10), עובדיה (4), הפטרות books (16), יונה, דניאל (יאשיהו),
--    כלי-עזר (מפות עזר לתנ"ך), נושאים-כלליים depth-2 containers, ליווי-ת"תים/שופטים,
--    + 3 draft strays (אוסף-מקורות dup, פרקי-הסיום, לב-הפרק-מועדים).
--    Old-sidebar membership computed per parent from tree_map + tree_plan ops
--    (plan series_id overrides matcher) + tmp_map-resolved creates; aliases
--    ('כל השיעורים ב-X', code §2.4 alias_slots) excluded from membership.
--    tree_plan intended members keep their 1..99 — none of them is in this list.
-- ----------------------------------------------------------------------------
-- scope: rows this section will demote (expect {len(bd)} pre-apply, 0 after)
SELECT count(*) AS s1_to_demote FROM series
WHERE sort_order BETWEEN 1 AND 99 AND id IN (
{idlist(ids)}
);

UPDATE series SET sort_order = 0
WHERE sort_order BETWEEN 1 AND 99 AND id IN (
{idlist(ids)}
);
""")

# ── Section 1b: order fixes ──
W(f"""-- ----------------------------------------------------------------------------
-- §1b BAND ORDER — 2 old-sidebar members of 'נושאים כלליים בתנ"ך' carrying legacy
--     sorts (30/60) instead of their old sibling positions (2/4). All other
--     policed members already match the old order (checked live: 0 mismatches).
-- scope:
SELECT count(*) AS s1b_to_fix FROM series
WHERE (id='c76ac534-76b4-4f2c-ba9a-05ed95e7145c' AND sort_order IS DISTINCT FROM 2)
   OR (id='bafc63d2-e62f-497a-9b4c-c58377b831a1' AND sort_order IS DISTINCT FROM 4);

UPDATE series SET sort_order = 2  -- מלחמת גוג ומגוג — old sibling position 2
WHERE id='c76ac534-76b4-4f2c-ba9a-05ed95e7145c' AND sort_order IS DISTINCT FROM 2;
UPDATE series SET sort_order = 4  -- יג מידות הרחמים — old sibling position 4
WHERE id='bafc63d2-e62f-497a-9b4c-c58377b831a1' AND sort_order IS DISTINCT FROM 4;
""")

# ── Section 2: renames ──
rens = d["renames"]
W(f"""-- ============================================================================
-- §2 SIDEBAR-LABEL ALIGNMENT — {len(rens)} old-sidebar members whose series.title
--    differs from the old sidebar label (normalize_he-compared). The old label is
--    the user-facing nav truth → series.title := old label. All token-overlap
--    >= 0.6 (ktiv/scope variants), 0 nodes flagged as different-node (<0.6).
--    Sibling title-collision pre-checked live: none.
-- scope: rows still carrying the wrong title (expect {len(rens)} pre-apply, 0 after)""")
conds = "\n   OR ".join(
    f"(id='{r['id']}' AND title <> '{esc(r['old_label'])}')" for r in rens)
W(f"SELECT count(*) AS s2_to_rename FROM series\nWHERE {conds};\n")
for r in rens:
    W(f"-- {esc(r['current'])}  →  {esc(r['old_label'])} (overlap {r['overlap']})")
    W(f"UPDATE series SET title = '{esc(r['old_label'])}' WHERE id = '{r['id']}' AND title <> '{esc(r['old_label'])}';")
W("")

# ── Section 3: Ezra/Nehemiah split books ──
W("""-- ============================================================================
-- §3 עזרא/נחמיה SPLIT-BOOK NODES — the two split nodes show as extra כתובים books.
--    Live check: עזרא (aa111111…) holds 2 page-only lessons (דפי עבודה, שאלות
--    ותשובות), נחמיה (bb222222…) holds 1 (דפי עבודה) → NOT empty → park at
--    sort_order=0 (page-only), keep status='published' (content stays reachable;
--    the combined book 'עזרא ונחמיה' 5896c267 owns the sidebar slot 10).
--    NOTE: under the band-driven sidebar (CODE-SPEC §2.1) sort=0 removes them from
--    the books level; the CURRENT books query is status-driven → needs code §2.1.
-- scope (expect 0 — both already at 0; guard kept for idempotent re-assert):
SELECT count(*) AS s3_to_park FROM series
WHERE id IN ('aa111111-aaaa-4444-aaaa-aaaaaaaaaaaa','bb222222-bbbb-4444-bbbb-bbbbbbbbbbbb')
  AND COALESCE(sort_order, -1) <> 0;

UPDATE series SET sort_order = 0
WHERE id IN ('aa111111-aaaa-4444-aaaa-aaaaaaaaaaaa','bb222222-bbbb-4444-bbbb-bbbbbbbbbbbb')
  AND COALESCE(sort_order, -1) <> 0;
""")

# ── Section 4: riddles ──
W("""-- ============================================================================
-- §4 חידות לילדים פ"ש — old tree: 6th child of תורה (after דברים).
--    Live check: c852edd8 already has parent_id=תורה root, sort_order=6,
--    status='active' → assert idempotently. Title aligned to the old label
--    'חידות לילדים פ"ש' in §2. (Current code hard-codes it under בראשית —
--    DesignSidebar.tsx:905-936 — removal is CODE-SPEC §2.5, not SQL.)
-- scope (expect 0):
SELECT count(*) AS s4_to_fix FROM series
WHERE id='c852edd8-d959-4c8d-bf7e-17b5881275fa'
  AND (parent_id IS DISTINCT FROM 'bb14b5a5-9f8f-4b54-ae10-bea3e2ff610b'
       OR sort_order IS DISTINCT FROM 6 OR status <> 'active');

UPDATE series
SET parent_id='bb14b5a5-9f8f-4b54-ae10-bea3e2ff610b', sort_order=6, status='active'
WHERE id='c852edd8-d959-4c8d-bf7e-17b5881275fa'
  AND (parent_id IS DISTINCT FROM 'bb14b5a5-9f8f-4b54-ae10-bea3e2ff610b'
       OR sort_order IS DISTINCT FROM 6 OR status <> 'active');
""")

# ── Section 5: topics ──
t = d["topics"]
root = t["root"]
# inserted topics: (name, slug, sort=old order_index+1)
ins = [("התשובה", "theme-התשובה", 69), ("נסים", "theme-נסים", 81), ("חנ", "theme-חנ", 115)]
links = {
    "התשובה": [
        ("468f9d91-1316-5dca-b851-28c703342bb8", "מצות הוידוי או מצות התשובה?", 1),
        ("b2020201-0001-4000-8000-000000000007", '"כי המצוה הזאת... לא נפלאת היא ממך"', 2),
        ("b2020201-0001-4000-8000-000000000008", "התורה והתשובה", 3),
        ("b2020201-0001-4000-8000-000000000017", "תשובה אמתית של האדם ותשובה לאומית", 4),
        ("b2020201-0001-4000-8000-000000000002", "התשובה בספר יונה", 5),
    ],
    "נסים": [
        ("16086d17-dba6-5710-a477-058643bb5a78", '"למען הרבות מופתי"', 1),
        ("f480d8a7-0c26-5750-b1a6-1ea24e80d97c", "נס וטבע בקריעת ים סוף", 2),
        ("95456cbb-2fcc-44ec-b20c-a8c84bb05198", "נסיעת הארון ומעבר הירדן", 3),
    ],
    "חנ": [
        ("63c4b4af-62bf-5f3d-88ba-86a719168294", "קרבנות בני הגולה, חנוכת המשכן, ולעתיד לבוא", 1),
    ],
}
W(f"""-- ============================================================================
-- §5 TOPICS SIDEBAR — themes-root ({root}) children must equal the
--    old 127-topic list (names + order). Live: 125 children; 124 of them match
--    the old list AND already carry the exact old position in topics.sort_order
--    (0 order mismatches live — the verify-report 'order FAIL' is the app
--    ordering by computed-count DESC, CODE-SPEC §7, not data).
--    Diff: missing = התשובה (old pos 69), נסים (81), חנ (115) — none exists
--    anywhere in topics (gap4 session merged/deleted them; old sidebar truth
--    restores them). extra = שלושת השבועות (sort 9999, not in the old 127) →
--    detach from themes-root (topic + its 26 lesson_topics links survive).
--    Old positions 69/81/115 are vacant gaps in the live 1..127 ladder.
--    Old topic pages carried 5/3/1 lessons — linked below to one published
--    physical copy per title (copies verified live; choice noted in report).
--    Badge-count mismatches (85) = app-side 1000-row cap → code lane, ignored.
-- ----------------------------------------------------------------------------
-- scope: how many of the 3 topics are still missing (expect 3 pre, 0 post)
SELECT 3 - count(*) AS s5_topics_to_insert FROM topics
WHERE parent_id='{root}' AND name IN ('התשובה','נסים','חנ');
""")
for name, slug, so in ins:
    W(f"""INSERT INTO topics (name, slug, parent_id, sort_order)
SELECT '{esc(name)}', '{slug}', '{root}', {so}
WHERE NOT EXISTS (SELECT 1 FROM topics WHERE parent_id='{root}' AND name='{esc(name)}');""")
W("""
-- extra: שלושת השבועות out of the sidebar membership (old 127 has no such topic)
SELECT count(*) AS s5_extra_to_detach FROM topics
WHERE id='e6060601-0006-4000-8000-000000000001' AND parent_id='""" + root + """';
UPDATE topics SET parent_id = NULL
WHERE id='e6060601-0006-4000-8000-000000000001' AND parent_id='""" + root + """';
""")
W("-- lesson links for the restored topics (old topic-page rows, old order):")
for name, _, _ in ins:
    for lid, title, pos in links[name]:
        W(f"""-- {esc(name)} ← {esc(title)}
INSERT INTO lesson_topics (lesson_id, topic_id, sort_order)
SELECT '{lid}', tp.id, {pos} FROM topics tp
WHERE tp.parent_id='{root}' AND tp.name='{esc(name)}'
  AND NOT EXISTS (SELECT 1 FROM lesson_topics lt WHERE lt.lesson_id='{lid}' AND lt.topic_id=tp.id);""")
W("")

# ── Section 6: leaks ──
leaks = d["leaks"]
pub = [l for l in leaks if l["on_old_public_page"]]
junk = [l for l in leaks if not l["on_old_public_page"]]
W(f"""-- ============================================================================
-- §6 TEACHER-ONLY LEAKS IN PUBLIC LISTINGS — verify guard found 71 page-occurrences
--    = {len(leaks)} distinct published lessons (some series render on 2 public URLs)
--    tagged teachers-only inside public listing series.
--    Cross-checked each title against the OLD public listing scrape of its page:
--    • {len(pub)} rows DO appear on the old public page → dual-audience content →
--      audience_tags := audience_tags ∪ {{general}} (keeps 'teachers'; §0.3 semantics).
--    • {len(junk)} rows do NOT appear on the old public page → teachers-only strays →
--      keep tags, sort_order := NULL (listed one-by-one in the report).
-- ----------------------------------------------------------------------------
-- scope: rows still lacking 'general' (expect {len(pub)} pre, 0 post)""")
pub_ids = [l["id"] for l in pub]
W(f"""SELECT count(*) AS s6_to_union_general FROM lessons
WHERE NOT (audience_tags @> ARRAY['general']::text[]) AND id IN (
{idlist(pub_ids)}
);

UPDATE lessons
SET audience_tags = (SELECT array_agg(DISTINCT x) FROM unnest(audience_tags || ARRAY['general']::text[]) AS u(x))
WHERE NOT (audience_tags @> ARRAY['general']::text[]) AND id IN (
{idlist(pub_ids)}
);
""")
W("""-- teachers-only strays the OLD public page does not list → sort_order=NULL.
-- LIVE pre-check: all 6 already have sort_order IS NULL (no-op assert; they stay
-- teachers-only and disappear from public pages once code §0.3 audience filter
-- lands — current useLessonsBySeries has NO audience filter, code lane).""")
for l in junk:
    W(f"-- {esc(l['series_title'])} :: {esc(l['title'])}")
junk_ids = [l["id"] for l in junk]
W(f"""-- scope (expect 0 — already NULL):
SELECT count(*) AS s6_strays_to_null FROM lessons
WHERE sort_order IS NOT NULL AND id IN (
{idlist(junk_ids)}
);
UPDATE lessons SET sort_order = NULL
WHERE sort_order IS NOT NULL AND id IN (
{idlist(junk_ids)}
);
""")

# ── Section 7: empty audience_tags ──
es = d["empties"]
groups = {"dual": [], "general": [], "teachers": [], "general_flag": []}
for e in es:
    groups[e["verdict"]].append(e)
W(f"""-- ============================================================================
-- §7 EMPTY audience_tags — {len(es)} live lessons with audience_tags = {{}} (invisible
--    to both the public filter and the teachers filter once §0.3 lands).
--    Rule applied per row, evidence = old-site scrapes:
--    • on old PUBLIC listing/topic/rabbi page AND on old TEACHERS listing → ['general','teachers']  ({len(groups['dual'])} rows)
--    • on old PUBLIC page only                                            → ['general']            ({len(groups['general'])} rows)
--    • on old TEACHERS listing only (worksheets/חוברות/riddle copies)     → ['teachers']           ({len(groups['teachers'])} rows)
--    • no old-site signal (orphans)                                       → ['general'] + flagged  ({len(groups['general_flag'])} rows, list in report)
--    All guards require audience_tags = '{{}}' → idempotent and cannot clobber §6.
-- ----------------------------------------------------------------------------
-- scope: rows still empty (expect {len(es)} pre, 0 post)
SELECT count(*) AS s7_still_empty FROM lessons WHERE audience_tags = '{{}}'::text[];
""")
for verdict, tags in (("dual", "ARRAY['general','teachers']"), ("general", "ARRAY['general']"),
                      ("teachers", "ARRAY['teachers']"), ("general_flag", "ARRAY['general']")):
    rows = groups[verdict]
    if not rows: continue
    gids = [r["id"] for r in rows]
    W(f"-- §7.{verdict} — {len(rows)} rows → {tags}")
    W(f"""UPDATE lessons SET audience_tags = {tags}::text[]
WHERE audience_tags = '{{}}'::text[] AND id IN (
{idlist(gids)}
);
""")

# ── Section 8: verification ──
W(f"""-- ============================================================================
-- §8 VERIFICATION — read-only proofs (run after apply; expectations inline)
-- ----------------------------------------------------------------------------
-- V1 band hygiene: every §1 id is out of the band  → expect 0
SELECT count(*) AS v1_still_in_band FROM series
WHERE sort_order BETWEEN 1 AND 99 AND id IN (
{idlist(ids)}
);

-- V1b order: the 2 fixed members sit at their old positions → expect 2
SELECT count(*) AS v1b_in_place FROM series
WHERE (id='c76ac534-76b4-4f2c-ba9a-05ed95e7145c' AND sort_order=2)
   OR (id='bafc63d2-e62f-497a-9b4c-c58377b831a1' AND sort_order=4);

-- V2 renames: all {len(rens)} titles equal the old sidebar labels → expect {len(rens)}
SELECT count(*) AS v2_renamed FROM series
WHERE {" OR ".join(f"(id='{r['id']}' AND title='{esc(r['old_label'])}')" for r in rens)};

-- V3 split books parked → expect 2
SELECT count(*) AS v3_parked FROM series
WHERE id IN ('aa111111-aaaa-4444-aaaa-aaaaaaaaaaaa','bb222222-bbbb-4444-bbbb-bbbbbbbbbbbb')
  AND sort_order=0;

-- V4 riddles slot → expect 1
SELECT count(*) AS v4_riddles_ok FROM series
WHERE id='c852edd8-d959-4c8d-bf7e-17b5881275fa'
  AND parent_id='bb14b5a5-9f8f-4b54-ae10-bea3e2ff610b' AND sort_order=6
  AND status='active' AND title='חידות לילדים פ"ש';

-- V5a themes-root membership = old 127 names → expect 127, 0 missing, 0 extra
SELECT count(*) AS v5_children FROM topics WHERE parent_id='{root}';
-- expect 3:
SELECT count(*) AS v5_restored FROM topics
WHERE parent_id='{root}' AND name IN ('התשובה','נסים','חנ');
-- expect 0:
SELECT count(*) AS v5_extra_gone FROM topics
WHERE parent_id='{root}' AND id='e6060601-0006-4000-8000-000000000001';
-- V5b order ladder: each child carries a unique sort 1..127 → expect 127 / 127
SELECT count(DISTINCT sort_order) AS v5_distinct_sorts, count(*) AS v5_rows
FROM topics WHERE parent_id='{root}' AND sort_order BETWEEN 1 AND 127;
-- V5c restored topic pages are non-empty → expect התשובה=5, נסים=3, חנ=1
SELECT tp.name, count(lt.lesson_id) AS links
FROM topics tp LEFT JOIN lesson_topics lt ON lt.topic_id=tp.id
WHERE tp.parent_id='{root}' AND tp.name IN ('התשובה','נסים','חנ') GROUP BY tp.name;

-- V6 leaks: no teachers-only published lesson left in the leak series set,
--    except the {len(junk)} reported strays (now sort_order IS NULL) → expect {len(junk)}
SELECT count(*) AS v6_remaining_teacher_only FROM lessons
WHERE status='published' AND audience_tags @> ARRAY['teachers']::text[]
  AND NOT audience_tags @> ARRAY['general']::text[]
  AND series_id IN (
  '58e49444-38cf-455c-8d83-5af19d0e1cb0','08a87de3-2938-43aa-962f-8ea95096e564',
  '743cfeeb-c82d-458e-83f8-98d40629ea1b','a14dbc35-1caf-4675-9eba-75b5df118925',
  '381ebb6c-8c16-43d6-bd61-7e96445efa34','cc7825e1-67a3-49b8-b632-9543f3aa3787',
  'ea110001-0001-4000-8000-000000000001','ed200001-0002-4000-8000-000000000001',
  '75b7c62c-50e2-4874-bcf5-2d8ddf646771','a1010001-0001-4000-8000-000000000023',
  'a1010001-0001-4000-8000-000000000029','02539385-aaaa-4c7f-9d85-d1af6e1cdd96',
  'b2020001-0001-4000-8000-000000000007','b2020001-0001-4000-8000-000000000012',
  '2d6d28c1-3c5c-4d61-9283-410bc56cd351','5f298ac3-b98a-4822-9ed6-45b01b2905fe',
  'bf16434c-3391-4566-a854-9b055d8825e2','9cb69292-166f-4114-98d3-ca8812c81787',
  'b082cb95-cec2-4fb4-9d92-4dceb7ce2706','6267feb7-de69-4106-aa02-172411e070cd',
  '531a3635-53d0-4fac-b9c2-ee37086e499a');
-- expect {len(junk)}:
SELECT count(*) AS v6_strays_nulled FROM lessons
WHERE sort_order IS NULL AND id IN (
{idlist(junk_ids)}
);

-- V7 empty tags eliminated → expect 0
SELECT count(*) AS v7_empty_left FROM lessons WHERE audience_tags = '{{}}'::text[];
""")

with open(os.path.join(BASE, "ROUND1.sql"), "w", encoding="utf-8") as f:
    f.write("\n".join(out))
print(f"ROUND1.sql written: {len(out)} blocks; demotes={len(bd)} renames={len(rens)} "
      f"leak_union={len(pub)} leak_null={len(junk)} empties={len(es)} "
      f"(dual={len(groups['dual'])} gen={len(groups['general'])} teach={len(groups['teachers'])} flag={len(groups['general_flag'])})")
