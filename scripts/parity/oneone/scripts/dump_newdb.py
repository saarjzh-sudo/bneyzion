#!/usr/bin/env python3
"""Dump NEW site DB state (Supabase pzvmwfexeiruelwiujxn) — READ-ONLY (SELECT only).

Produces under scripts/parity/oneone/:
  newdb_tables.json, newdb_series.json, newdb_lessons.json, newdb_rabbis.json,
  newdb_topics.json, newdb_lesson_rabbis.json, newdb_series_rabbis.json,
  newdb_tree.json, newdb_verify.json

Re-runnable / idempotent: every run re-fetches everything and overwrites outputs.
Pagination: keyset on id (ORDER BY id) for large tables, page size 1000.
"""
import json, sys, time, os

sys.path.insert(0, "/Users/srhlq/Downloads/saar-workspace/bneyzion/scripts/parity")
import sbq  # curl-backed, NetSpark-safe (uses --noproxy '*')

OUT = "/Users/srhlq/Downloads/saar-workspace/bneyzion/scripts/parity/oneone"
PAGE = 1000


def q(sql, retries=3):
    """Run SQL (SELECT only), return parsed rows; raise on API error."""
    assert sql.lstrip().lower().startswith(("select", "with")), "READ-ONLY: SELECT only"
    last = None
    for i in range(retries):
        raw = sbq.run(sql)
        try:
            parsed = json.loads(raw)
        except Exception:
            last = f"unparseable: {raw[:300]}"
            time.sleep(2 * (i + 1))
            continue
        if isinstance(parsed, dict) and parsed.get("message"):
            last = parsed
            time.sleep(2 * (i + 1))
            continue
        return parsed
    raise RuntimeError(f"query failed after {retries} tries: {last}\nSQL: {sql[:200]}")


def q_scalar(sql):
    rows = q(sql)
    return list(rows[0].values())[0]


def keyset_dump(select_sql_tmpl, id_expr="id"):
    """select_sql_tmpl has {where} placeholder for keyset condition; must ORDER BY id."""
    rows, last_id = [], None
    while True:
        where = f"WHERE {id_expr} > '{last_id}'" if last_id else ""
        batch = q(select_sql_tmpl.format(where=where) + f" ORDER BY {id_expr} LIMIT {PAGE}")
        rows.extend(batch)
        if len(batch) < PAGE:
            break
        last_id = batch[-1]["id"]
    return rows


def save(name, obj):
    path = os.path.join(OUT, name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
    n = len(obj) if isinstance(obj, list) else "obj"
    print(f"wrote {name}: {n}")
    return path


def main():
    os.makedirs(OUT, exist_ok=True)
    verify = {}

    # ---- 0. all public tables -------------------------------------------
    tables = q("SELECT table_name, table_type FROM information_schema.tables "
               "WHERE table_schema='public' ORDER BY table_name")
    save("newdb_tables.json", tables)
    verify["public_tables"] = len(tables)

    # ---- 1. series -------------------------------------------------------
    n_series = q_scalar("SELECT COUNT(*) FROM series")
    series = keyset_dump(
        "SELECT id, title, parent_id, status, audience_tags, sort_order, "
        "lesson_count, rabbi_id, bible_book, "
        "(description IS NOT NULL) AS has_desc, (image_url IS NOT NULL) AS has_image "
        "FROM series {where}")
    assert len(series) == n_series, f"series dump {len(series)} != COUNT {n_series}"
    save("newdb_series.json", series)
    verify["series_count"] = {"db": n_series, "dumped": len(series)}

    # ---- 2. lessons ------------------------------------------------------
    n_lessons = q_scalar("SELECT COUNT(*) FROM lessons")
    lessons = keyset_dump(
        "SELECT l.id, l.title, l.series_id, l.rabbi_id, r.name AS rabbi_name, "
        "l.audience_tags, l.status, l.source_type, l.content_type, "
        "l.bible_book, l.bible_chapter, (l.content IS NULL) AS content_null, "
        "l.attachment_url, (l.audio_url IS NOT NULL) AS has_audio, "
        "(l.video_url IS NOT NULL) AS has_video, l.published_at "
        "FROM lessons l LEFT JOIN rabbis r ON r.id = l.rabbi_id {where}",
        id_expr="l.id")
    assert len(lessons) == n_lessons, f"lessons dump {len(lessons)} != COUNT {n_lessons}"
    save("newdb_lessons.json", lessons)
    verify["lessons_count"] = {"db": n_lessons, "dumped": len(lessons)}

    # ---- 3. rabbis -------------------------------------------------------
    n_rabbis = q_scalar("SELECT COUNT(*) FROM rabbis")
    rabbis = keyset_dump(
        "SELECT id, name, entity_type, status, lesson_count, slug, "
        "(image_url IS NOT NULL) AS has_image, title "
        "FROM rabbis {where}")
    assert len(rabbis) == n_rabbis
    save("newdb_rabbis.json", rabbis)
    verify["rabbis_count"] = {"db": n_rabbis, "dumped": len(rabbis)}

    # ---- 4. topics + lesson_topics ---------------------------------------
    n_topics = q_scalar("SELECT COUNT(*) FROM topics")
    topics = keyset_dump(
        "SELECT id, name AS title, slug, parent_id, sort_order FROM topics {where}")
    assert len(topics) == n_topics
    n_lt = q_scalar("SELECT COUNT(*) FROM lesson_topics")
    # lesson_topics has no single id col → keyset on (lesson_id, topic_id)
    lt, last = [], None
    while True:
        where = (f"WHERE (lesson_id, topic_id) > ('{last[0]}','{last[1]}')" if last else "")
        batch = q("SELECT lesson_id, topic_id FROM lesson_topics " + where +
                  f" ORDER BY lesson_id, topic_id LIMIT {PAGE}")
        lt.extend(batch)
        if len(batch) < PAGE:
            break
        last = (batch[-1]["lesson_id"], batch[-1]["topic_id"])
    assert len(lt) == n_lt, f"lesson_topics dump {len(lt)} != COUNT {n_lt}"
    save("newdb_topics.json", {"topics": topics, "lesson_topics": lt})
    verify["topics_count"] = {"db": n_topics, "dumped": len(topics)}
    verify["lesson_topics_count"] = {"db": n_lt, "dumped": len(lt)}

    # ---- 5. join tables (exist but may be empty) --------------------------
    for tbl, fname in (("lesson_rabbis", "newdb_lesson_rabbis.json"),
                       ("series_rabbis", "newdb_series_rabbis.json")):
        n = q_scalar(f"SELECT COUNT(*) FROM {tbl}")
        rows = q(f"SELECT * FROM {tbl} ORDER BY 1 LIMIT 50000") if n else []
        assert len(rows) == n
        save(fname, rows)
        verify[f"{tbl}_count"] = {"db": n, "dumped": len(rows)}

    # ---- 6. computed series tree ------------------------------------------
    by_parent = {}
    smap = {s["id"]: s for s in series}
    for s in series:
        by_parent.setdefault(s["parent_id"], []).append(s)

    def sort_key(s):
        so = s["sort_order"] if s["sort_order"] is not None else 10**9
        return (so, s["title"] or "")

    def node(s):
        kids = sorted(by_parent.get(s["id"], []), key=sort_key)
        return {"id": s["id"], "title": s["title"], "status": s["status"],
                "audience_tags": s["audience_tags"], "lesson_count": s["lesson_count"],
                "n_children": len(kids), "children": [node(k) for k in kids]}

    # roots = parent_id NULL, plus orphans whose parent_id points to a missing series
    roots = sorted(by_parent.get(None, []), key=sort_key)
    orphans = sorted((s for s in series if s["parent_id"] and s["parent_id"] not in smap),
                     key=sort_key)
    tree = {"roots": [node(s) for s in roots],
            "orphan_parent_missing": [node(s) for s in orphans]}
    n_in_tree = 0
    def count(nd):
        nonlocal n_in_tree
        n_in_tree += 1
        for c in nd["children"]:
            count(c)
    for r in tree["roots"]:
        count(r)
    for r in tree["orphan_parent_missing"]:
        count(r)
    assert n_in_tree == len(series), f"tree nodes {n_in_tree} != series {len(series)}"
    save("newdb_tree.json", tree)
    verify["tree"] = {"roots": len(tree["roots"]),
                      "orphan_parent_missing": len(tree["orphan_parent_missing"]),
                      "total_nodes": n_in_tree}

    # ---- 7. verification stats ---------------------------------------------
    verify["series_by_status"] = q(
        "SELECT status, COUNT(*) n FROM series GROUP BY status ORDER BY n DESC")
    verify["lessons_by_status"] = q(
        "SELECT status, COUNT(*) n FROM lessons GROUP BY status ORDER BY n DESC")
    verify["lessons_by_audience"] = q(
        "SELECT CASE WHEN 'teachers' = ANY(audience_tags) THEN 'teachers' "
        "WHEN 'general' = ANY(audience_tags) THEN 'general' "
        "WHEN audience_tags IS NULL OR cardinality(audience_tags)=0 THEN 'empty/null' "
        "ELSE array_to_string(audience_tags, ',') END aud, COUNT(*) n "
        "FROM lessons GROUP BY 1 ORDER BY n DESC")
    verify["lessons_audience_raw"] = q(
        "SELECT audience_tags, COUNT(*) n FROM lessons GROUP BY 1 ORDER BY n DESC LIMIT 20")
    verify["lessons_series_id_null"] = q_scalar(
        "SELECT COUNT(*) FROM lessons WHERE series_id IS NULL")
    dup = q("SELECT COUNT(*) AS dup_groups, COALESCE(SUM(c-1),0) AS extra_rows FROM "
            "(SELECT series_id, title, COUNT(*) c FROM lessons "
            " WHERE series_id IS NOT NULL GROUP BY series_id, title HAVING COUNT(*)>1) d")
    verify["dup_titles_same_series"] = dup[0]
    verify["lessons_content_null"] = q_scalar(
        "SELECT COUNT(*) FROM lessons WHERE content IS NULL")

    save("newdb_verify.json", verify)
    print(json.dumps(verify, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
