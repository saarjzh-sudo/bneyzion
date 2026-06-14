#!/usr/bin/env python3
"""Build gt_במדבר.json + gt_במדבר_manifest.json from old-site ground truth."""
import json, os, re, time
from r1_fetch import fetch
from r1_parse import parse_category, parse_series_lessons, norm

HERE = os.path.dirname(os.path.abspath(__file__))
R1 = os.path.join(HERE, "r1")
os.makedirs(R1, exist_ok=True)
CAT_URL = "https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/במדבר"

def main():
    html, path, cached = fetch(CAT_URL)
    rows = parse_category(html)
    print(f"category page: {len(rows)} rows (cached={cached})")

    series_rows = [r for r in rows if r["kind"] == "series"]
    lesson_rows = [r for r in rows if r["kind"] == "lesson"]
    shut_rows = [r for r in rows if r["kind"] == "shut"]
    print(f"series={len(series_rows)} standalone_lessons={len(lesson_rows)} shut={len(shut_rows)}")

    # flag parsha event-series rows (should be NONE)
    parsha_rows = []
    for r in rows:
        t = r["title"]
        if re.search(r"פרשת.+\|", t) or (("|" in t) and t.strip().startswith("פרשת")):
            parsha_rows.append({"idx": r["idx"], "title": t})
    print("parsha 'פרשת X | range' rows on category page:", parsha_rows)

    out = {"url": CAT_URL, "rows": [], "series": [], "parsha_event_rows_on_category": parsha_rows}

    for r in rows:
        out["rows"].append({
            "idx": r["idx"], "kind": r["kind"], "title": r["title"],
            "title_norm": r["title_norm"], "author": r["author"],
            "href": r["href"], "lesson_count": r["lesson_count"], "media": r["media"],
        })

    # fetch each series page
    mismatches = []
    for si, r in enumerate(series_rows):
        href = r["href"]
        shtml, spath, scached = fetch(href)
        lessons = parse_series_lessons(shtml)
        got = len(lessons)
        cat_count = r["lesson_count"]
        flag = (cat_count is not None and got != cat_count)
        if flag:
            mismatches.append({"title": r["title"], "cat_count": cat_count, "page_count": got})
        out["series"].append({
            "idx": r["idx"], "title": r["title"], "title_norm": r["title_norm"],
            "author": r["author"], "href": href,
            "category_lesson_count": cat_count, "page_lesson_count": got,
            "count_mismatch": flag, "lessons": lessons,
        })
        time.sleep(0.15)
        print(f"  [{si+1}/{len(series_rows)}] {r['title'][:40]:40s} cat={cat_count} page={got} {'MISMATCH' if flag else ''}")

    out["count_mismatches"] = mismatches

    with open(os.path.join(R1, "gt_במדבר.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    # manifest
    manifest = {
        "book": "במדבר", "url": CAT_URL,
        "series": [{
            "title": s["title"], "author": s["author"],
            "old_count": s["category_lesson_count"],
            "page_count": s["page_lesson_count"],
            "lessons": [{"title": l["title"], "author": l["author"]} for l in s["lessons"]],
        } for s in out["series"]],
        "standalone": [{"title": r["title"], "author": r["author"]} for r in lesson_rows],
        "shut": [{"title": r["title"], "author": r["author"]} for r in shut_rows],
    }
    with open(os.path.join(R1, "gt_במדבר_manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print("\n=== SUMMARY ===")
    print(f"series rows: {len(series_rows)}")
    print(f"standalone lessons: {len(lesson_rows)}")
    print(f"shut rows: {len(shut_rows)}")
    print(f"count mismatches: {len(mismatches)}")
    for m in mismatches:
        print("  MISMATCH:", m)
    print("parsha event-series on category page:", len(parsha_rows))

if __name__ == "__main__":
    main()
