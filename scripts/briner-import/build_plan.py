import os
#!/usr/bin/env python3
"""
Build the import + retag plan for Briner/otzar.org.il content.

Inputs:  articles.jsonl (from scrape_otzar.py), live DB (read-only queries).
Outputs: import_plan.json  — new series tree + new lessons (draft), audience per
         Rav Yoav's word rules; retag list for existing 'veshinantam' content.

Rules (Rav Yoav, 19.7.2026 — binding):
  - title contains any of: שאלות / ביאורי מילים / מספרים / מקומות / דפי עבודה /
    מי אמר למי  -> teachers wing only  (audience ["teachers"])
  - title contains ושננתם -> general wing (audience includes "general")
  - otherwise (new imported items) -> general
Deterministic ids: uuid5(NS, "briner-import:"+key) so re-runs are idempotent.
"""
import json, os, re, sys, uuid, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
NS = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")  # uuid5 DNS ns (stable)
MAIN_BRINER = "6f4b2572-b019-4832-9547-de7e8bc6d909"  # ושננתם - אוצר התורה (content_creator)
BRINER_IDS = (MAIN_BRINER,
              "d68b38ad-fd70-47d3-b667-20f68af6d8c4",
              "e6c81665-5737-4c82-b96e-7527cc0e6ee6")

TEACHER_WORDS = ["שאלות", "ביאורי מילים", "מספרים", "מקומות", "דפי עבודה", "מי אמר למי"]
TOKEN = os.environ["SUPABASE_ACCESS_TOKEN"]  # נקרא מ-env — סוד לעולם לא בקוד
API = "https://api.supabase.com/v1/projects/pzvmwfexeiruelwiujxn/database/query"


def sql(query):
    body = json.dumps({"query": query})
    r = subprocess.run(["curl", "-s", "-X", "POST", API,
                        "-H", f"Authorization: Bearer {TOKEN}",
                        "-H", "User-Agent: Mozilla/5.0",
                        "-H", "Content-Type: application/json",
                        "-d", body], capture_output=True, text=True)
    return json.loads(r.stdout)


def sid(key):
    return str(uuid.uuid5(NS, "briner-import:" + key))


def classify(title):
    t = title or ""
    if any(w in t for w in TEACHER_WORDS):
        return ["teachers"]
    return ["general"]


def main():
    arts = [json.loads(l) for l in open(os.path.join(HERE, "articles.jsonl"), encoding="utf-8")]
    # unique by url
    seen, items = set(), []
    for a in arts:
        if a["url"] in seen:
            continue
        seen.add(a["url"])
        items.append(a)

    # existing Briner lesson titles (dup detection = hypothesis, skip exact matches)
    existing = sql("SELECT lower(trim(title)) AS t FROM lessons WHERE rabbi_id IN {}".format(
        str(BRINER_IDS)))
    existing_titles = {r["t"] for r in existing}

    series_map = {}   # path tuple -> series dict
    lessons, dup_flags = [], []
    for a in items:
        bc = a.get("breadcrumb") or []
        cat_path = tuple(bc[:-1]) if len(bc) > 1 else (a["category_key"],)
        # build series chain
        for depth in range(1, len(cat_path) + 1):
            p = cat_path[:depth]
            if p not in series_map:
                series_map[p] = {
                    "id": sid("series:" + "/".join(p)),
                    "title": p[-1],
                    "path": list(p),
                    "parent_id": series_map[cat_path[:depth - 1]]["id"] if depth > 1 else None,
                    "audience_tags": classify(p[-1]),
                    "status": "draft",
                }
        audience = classify(a["title"])
        dup = (a["title"] or "").strip().lower() in existing_titles
        lesson = {
            "id": sid("lesson:" + a["url"]),
            "title": a["title"],
            "series_id": series_map[cat_path]["id"],
            "series_path": list(cat_path),
            "audience_tags": audience,
            "otzar_id": a.get("otzar_id"),
            "url": a["url"],
            "content_len": len(a.get("content_html") or ""),
            "teaser": (a.get("teaser") or a.get("spoiler") or "")[:300],
            "category_key": a["category_key"],
            "duplicate_title_hypothesis": dup,
        }
        if dup:
            dup_flags.append({"title": a["title"], "url": a["url"]})
        lessons.append(lesson)

    # ---- retag plan: existing content whose NAME contains ושננתם -> add 'general'
    retag_series = sql(
        "SELECT id, title, audience_tags FROM series WHERE rabbi_id IN {} "
        "AND title LIKE '%ושננתם%' AND NOT ('general' = ANY(audience_tags))".format(str(BRINER_IDS)))
    retag_lessons = sql(
        "SELECT id, title, audience_tags FROM lessons WHERE rabbi_id IN {} "
        "AND title LIKE '%ושננתם%' AND NOT ('general' = ANY(coalesce(audience_tags, ARRAY['general']))) ".format(str(BRINER_IDS)))
    # word-rule exception: teacher-word titles stay teachers-only
    def teacherish(t):
        return any(w in (t or "") for w in TEACHER_WORDS)
    retag_series_f = [r for r in retag_series if not teacherish(r["title"])]
    retag_lessons_f = [r for r in retag_lessons if not teacherish(r["title"])]

    plan = {
        "rabbi_id": MAIN_BRINER,
        "series": sorted(series_map.values(), key=lambda s: (len(s["path"]), s["path"])),
        "lessons": lessons,
        "retag_series_add_general": retag_series_f,
        "retag_lessons_add_general": retag_lessons_f,
        "retag_excluded_teacher_word": (
            [r for r in retag_series if teacherish(r["title"])] +
            [r for r in retag_lessons if teacherish(r["title"])]),
        "duplicate_title_hypotheses": dup_flags,
        "counts": {
            "articles": len(items),
            "new_series": len(series_map),
            "new_lessons": len(lessons),
            "lessons_teachers": sum(1 for l in lessons if l["audience_tags"] == ["teachers"]),
            "lessons_general": sum(1 for l in lessons if l["audience_tags"] == ["general"]),
            "retag_series": len(retag_series_f),
            "retag_lessons": len(retag_lessons_f),
            "dup_hypotheses": len(dup_flags),
        },
    }
    out = os.path.join(HERE, "import_plan.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(plan, f, ensure_ascii=False, indent=1)
    print(json.dumps(plan["counts"], ensure_ascii=False, indent=1))
    print("wrote", out)


if __name__ == "__main__":
    main()
