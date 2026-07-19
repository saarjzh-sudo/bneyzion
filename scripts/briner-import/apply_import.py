import os
#!/usr/bin/env python3
"""
Apply the Briner/otzar import plan to the bnei-zion Supabase DB.

Modes:
  --pilot         import 2 lessons only (one general, one teachers) + their series chain
  --apply         full import (skips whatever already exists — ON CONFLICT DO NOTHING)
  --retag         apply the add-'general' retag to existing ושננתם-named content

Safety:
  * Requires snapshot tables lessons_bak_briner_20260719 / series_bak_briner_20260719 /
    rabbis_bak_briner_20260719 to exist (aborts otherwise).
  * All new rows: status='draft' (NOT published).
  * Inserts only — ON CONFLICT (id) DO NOTHING; retag only APPENDS 'general' to audience_tags.
  * checkpoint: progress.jsonl appended after every batch of 20.
"""
import json, os, sys, time, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
TOKEN = os.environ["SUPABASE_ACCESS_TOKEN"]  # נקרא מ-env — סוד לעולם לא בקוד
API = "https://api.supabase.com/v1/projects/pzvmwfexeiruelwiujxn/database/query"
MAIN_BRINER = "6f4b2572-b019-4832-9547-de7e8bc6d909"
QT = "$briner_import$"


def sql(query):
    body = json.dumps({"query": query})
    r = subprocess.run(["curl", "-s", "-X", "POST", API,
                        "-H", f"Authorization: Bearer {TOKEN}",
                        "-H", "User-Agent: Mozilla/5.0",
                        "-H", "Content-Type: application/json",
                        "-d", body], capture_output=True, text=True)
    try:
        out = json.loads(r.stdout)
    except Exception:
        raise RuntimeError("bad response: " + r.stdout[:500])
    if isinstance(out, dict) and out.get("message"):
        raise RuntimeError("SQL error: " + str(out)[:800])
    return out


def lit(s):
    """Dollar-quoted literal; strips our tag if it ever appears in content."""
    if s is None:
        return "NULL"
    s = s.replace(QT, "")
    return QT + s + QT


def arr(tags):
    return "ARRAY[" + ",".join("'" + t + "'" for t in tags) + "]::text[]"


def checkpoint(obj):
    obj["ts"] = time.strftime("%Y-%m-%dT%H:%M:%S")
    with open(os.path.join(HERE, "progress.jsonl"), "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")
    print(json.dumps(obj, ensure_ascii=False), flush=True)


def guard():
    n = sql("SELECT count(*) AS n FROM information_schema.tables WHERE table_name IN "
            "('lessons_bak_briner_20260719','series_bak_briner_20260719','rabbis_bak_briner_20260719')")[0]["n"]
    if int(n) != 3:
        sys.exit("ABORT: snapshot tables missing — create backups first.")


def load():
    plan = json.load(open(os.path.join(HERE, "import_plan.json"), encoding="utf-8"))
    content = {}
    with open(os.path.join(HERE, "articles.jsonl"), encoding="utf-8") as f:
        for line in f:
            a = json.loads(line)
            content[a["url"]] = a
    return plan, content


def insert_series(series_rows):
    done = 0
    for s in series_rows:
        parent = "'" + s["parent_id"] + "'" if s["parent_id"] else "NULL"
        q = (f"INSERT INTO series (id, title, rabbi_id, parent_id, status, audience_tags, sort_order) "
             f"VALUES ('{s['id']}', {lit(s['title'])}, '{MAIN_BRINER}', {parent}, 'draft', "
             f"{arr(s['audience_tags'])}, {s.get('sort_order', 0)}) ON CONFLICT (id) DO NOTHING")
        sql(q)
        done += 1
    return done


def insert_lessons(lesson_rows, content):
    inserted = skipped = 0
    for i, l in enumerate(lesson_rows, 1):
        if l.get("duplicate_title_hypothesis"):
            skipped += 1
            continue
        art = content.get(l["url"], {})
        body = art.get("content_html") or ""
        meta = json.dumps({"source": {"site": "otzar.org.il", "url": l["url"],
                                      "otzar_id": l.get("otzar_id")}}, ensure_ascii=False)
        q = (f"INSERT INTO lessons (id, title, description, content, rabbi_id, series_id, "
             f"source_type, status, audience_tags, sort_order, additional_attachments) VALUES ("
             f"'{l['id']}', {lit(l['title'])}, {lit(l.get('teaser') or None)}, {lit(body)}, "
             f"'{MAIN_BRINER}', '{l['series_id']}', 'article', 'draft', {arr(l['audience_tags'])}, "
             f"{i}, {lit(meta)}::jsonb) ON CONFLICT (id) DO NOTHING")
        sql(q)
        inserted += 1
        if i % 20 == 0:
            checkpoint({"phase": "lessons", "done": i, "of": len(lesson_rows)})
        time.sleep(0.1)
    return inserted, skipped


def retag(plan):
    changed = {"series": [], "lessons": []}
    for kind, table in (("retag_series_add_general", "series"), ("retag_lessons_add_general", "lessons")):
        for r in plan[kind]:
            q = (f"UPDATE {table} SET audience_tags = audience_tags || ARRAY['general']::text[] "
                 f"WHERE id='{r['id']}' AND NOT ('general' = ANY(audience_tags)) RETURNING id")
            res = sql(q)
            if res:
                changed[table].append(r["id"])
        checkpoint({"phase": "retag", "table": table, "changed": len(changed[table])})
    return changed


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    if mode not in ("--pilot", "--apply", "--retag"):
        sys.exit("usage: apply_import.py --pilot | --apply | --retag")
    guard()
    plan, content = load()

    if mode == "--retag":
        changed = retag(plan)
        checkpoint({"phase": "retag_done",
                    "series_changed": changed["series"], "lessons_changed": changed["lessons"]})
        return

    lessons = plan["lessons"]
    if mode == "--pilot":
        gen = next(l for l in lessons if l["audience_tags"] == ["general"] and l["content_len"] > 1000
                   and not l["duplicate_title_hypothesis"])
        tea = next(l for l in lessons if l["audience_tags"] == ["teachers"] and l["content_len"] > 1000
                   and not l["duplicate_title_hypothesis"])
        lessons = [gen, tea]
        needed_paths = set()
        for l in lessons:
            for d in range(1, len(l["series_path"]) + 1):
                needed_paths.add(tuple(l["series_path"][:d]))
        series_rows = [s for s in plan["series"] if tuple(s["path"]) in needed_paths]
    else:
        series_rows = plan["series"]

    ns = insert_series(series_rows)
    checkpoint({"phase": "series_done", "count": ns, "mode": mode})
    ins, skip = insert_lessons(lessons, content)
    checkpoint({"phase": "import_done", "mode": mode, "lessons_inserted_attempted": ins,
                "skipped_dup_hypothesis": skip})


if __name__ == "__main__":
    main()
