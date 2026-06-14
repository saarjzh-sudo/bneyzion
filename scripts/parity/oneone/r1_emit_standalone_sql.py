#!/usr/bin/env python3
"""Emit plan_standalone_FINAL.sql — idempotent, NOT-EXISTS-guarded INSERTs for every
GT standalone+שו"ת row across the 5 Torah books. Because the re-scrape proved 100% of
these rows already exist in the DB, every guard evaluates FALSE and the script inserts
0 rows on apply (and on re-run). The guards use a normalize() expression that mirrors
the python norm() used for matching (strip niqqud, lower, collapse punctuation+space).
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
R1 = os.path.join(HERE, "r1")
BOOKS = ["בראשית","שמות","ויקרא","במדבר","דברים"]
YOAV_ID = "acd34d0f-1288-47b8-9e8e-38e69599c294"

def sql_str(s):
    if s is None:
        return "NULL"
    return "'" + s.replace("'", "''") + "'"

# Postgres normalize expression matching python norm(): strip niqqud U+0591..U+05C7,
# unescape already done, lower, replace listed punctuation with space, collapse spaces.
def norm_expr(col):
    # strip niqqud, replace the same punctuation set used in r1_parse.norm with spaces, lower, collapse
    inner = f"regexp_replace({col}, '[֑-ׇ]', '', 'g')"
    # punctuation chars: " " " ' ׳ ` | ( ) - – — : , . ! ?
    punct = "[\"“”„''׳`|()\\-–—:,.!?]"
    inner = f"regexp_replace({inner}, '{punct}', ' ', 'g')"
    inner = f"lower({inner})"
    inner = f"regexp_replace({inner}, '\\s+', ' ', 'g')"
    inner = f"btrim({inner})"
    return inner

HEADER = """-- ============================================================================
-- plan_standalone_FINAL.sql  ·  Bnei-Zion 1:1 migration · Saar Review Round 1
-- STANDALONE + שו"ת track, all 5 Torah books (בראשית/שמות/ויקרא/במדבר/דברים)
--
-- FINDING (this re-scrape, corrected selector): the old category-page standalone
-- (kind='שיעור') and שו"ת (kind='שו"ת') rows — 117 standalone + 53 שו"ת = 170 total —
-- are ALL already present in the DB (status='published', matching bible_book), with
-- ZERO truly-missing rows. They currently live nested under parsha-event series
-- (e.g. "פרשת בראשית | א-ו") and/or the "ושננתם" anthology series, NOT as series_id NULL.
-- Most appear 2-4× (duplicated across those parents). The visible gap on the new
-- category page (16 standalone vs old 39, etc.) is therefore a CODE SURFACING gap
-- (ROUND1-MASTER change C4 — render a standalone band by union+dedup of book-scoped
-- direct lessons), NOT a data gap. Inserting standalone clones would only DEEPEN the
-- existing duplication (the במדבר "insert 35 clones" path from RD-1 is NOT taken here).
--
-- This file is therefore a GUARDED, IDEMPOTENT no-op INSERT set: each of the 170 GT
-- rows is emitted as an INSERT ... SELECT guarded by NOT EXISTS on normalize(title)+
-- bible_book. Because every row already exists, all guards evaluate FALSE → 0 rows on
-- APPLY and 0 on RE-RUN. The inserts are kept (not deleted) so that if Saar later
-- decides standalone clones SHOULD be created, the exact payloads (title, rabbi_id,
-- source_type, media classification, sort_order) are ready and self-protecting.
--
-- Media policy per row (Rule 13): href on s3/vp4/external → attachment/audio/video_url
-- direct; href on bneyzion.co.il/media → legacy_attachment_url ONLY (rehost flag), never
-- attachment_url=bneyzion.co.il; no href → text-only. Author→rabbi_id resolved by exact
-- name; unresolved → הרב יואב אוריאל (acd34d0f-...) fallback (6 rows, flagged review_note).
--
-- READ-ONLY agent produced this; orchestrator runs it. Each book wrapped BEGIN…COMMIT.
-- Run pattern: BEGIN; <inserts>; <verify SELECT>; -- expect inserted=0 → COMMIT (or ROLLBACK).
-- ============================================================================
"""

def emit():
    lines = [HEADER]
    grand_emitted = 0
    for book in BOOKS:
        recon = json.load(open(os.path.join(R1, f"standalone_recon_{book}.json"), encoding="utf-8"))
        lines.append(f"\n-- ===================== {book} =====================")
        lines.append(f"-- GT standalone={sum(1 for r in recon if r['kind']=='lesson')} "
                     f"שו\"ת={sum(1 for r in recon if r['kind']=='shut')} "
                     f"| already-in-DB={sum(1 for r in recon if r['in_any'])} "
                     f"| truly-missing={sum(1 for r in recon if not r['in_any'])}")
        lines.append("BEGIN;")
        nidx = 0
        for r in recon:
            grand_emitted += 1
            ct = "'שו\"ת'" if r["kind"] == "shut" else "NULL"
            src = r["source_type"]
            audio = video = attach = legacy = "NULL"
            if r["media_class"] == "direct":
                u = r["media_url"]
                if src == "audio": audio = sql_str(u)
                elif src == "video": video = sql_str(u)
                else: attach = sql_str(u)
            elif r["media_class"] == "rehost":
                legacy = sql_str(r["legacy_url"])  # Rule-13: legacy only, queue rehost
            note = None
            if not r["rabbi_matched"]:
                note = f"R1 standalone: author '{r['author']}' had no rabbi match → yoav fallback; existing DB copy may differ"
            sort_order = nidx * 10
            nidx += 1
            t = sql_str(r["title"])
            ne_title = norm_expr("title")
            ne_val = norm_expr(t)
            lines.append(
                f"INSERT INTO lessons (title, rabbi_id, series_id, source_type, content_type, "
                f"bible_book, audience_tags, status, sort_order, audio_url, video_url, "
                f"attachment_url, legacy_attachment_url, review_note)\n"
                f"SELECT {t}, '{r['rabbi_id']}'::uuid, NULL, '{src}', {ct}, {sql_str(book)}, "
                f"ARRAY['general']::text[], 'published', {sort_order}, {audio}, {video}, {attach}, {legacy}, {sql_str(note)}\n"
                f"WHERE NOT EXISTS (SELECT 1 FROM lessons WHERE bible_book={sql_str(book)} AND {ne_title} = {ne_val});"
            )
        # per-book verification
        lines.append(f"-- VERIFY {book}: expect 0 NEW series_id-NULL rows created by this block")
        lines.append(
            f"SELECT '{book}' AS book, count(*) AS standalone_null_now "
            f"FROM lessons WHERE bible_book={sql_str(book)} AND series_id IS NULL AND status='published';"
        )
        lines.append("COMMIT;  -- (all guards FALSE → 0 inserted; ROLLBACK if any verify surprises)")
    lines.append(f"\n-- GRAND: {grand_emitted} guarded INSERT statements emitted; expected inserted rows = 0.")
    out = os.path.join(R1, "plan_standalone_FINAL.sql")
    open(out, "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print("wrote", out, "statements:", grand_emitted)

if __name__ == "__main__":
    emit()
