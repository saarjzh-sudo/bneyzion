#!/usr/bin/env python3
"""
fix_recorded_series.py — fix the recorded-Tanach series that show EXTRA lessons.

Defect (Saar 19.6): each affected recorded series (e.g. 'קריאה וביאור בקצרה של ספר יהושע')
shows N+1 lessons vs the old site — migration COPY-duplicates: a chapter copied many times
with a '(N)' suffix, or a malformed 'פרק (10)' carrying the wrong chapter's audio.

Fix = the established series_lessons ALLOW-LIST (reversible, drives useLessonsBySeries):
  1. scrape the OLD series page (rabbi pages give the series URLs) → ordered lesson titles+audio.
  2. match each OLD lesson → its DB lesson, AUDIO basename golden key first, then norm-title,
     scoped to this series. COPY-dups / malformed copies aren't on the old page → excluded.
  3. write teacher_listing_items scope='series_lessons' key=<series_id> in old order.
The display then shows exactly the old set (1:1). No lesson is deleted (fully reversible).

Usage: python3 fix_recorded_series.py [--apply] [--only "<series title substr>"]
"""
import sys, os, json, re, time, subprocess, urllib.parse, argparse, glob, html as _html
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import sbq
from teachers_reconcile import norm, esc
CHROME = (glob.glob(os.path.expanduser("~/.cache/puppeteer/chrome-headless-shell/*/chrome-headless-shell-*/chrome-headless-shell")) or [""])[0]
RABBIS = ["הרב יונדב זר", "הרב דן בארי", "הרב חנניה מלכה", "מערכת בני ציון", "הרב לוי סודרי"]
PAT = ("(s.title ILIKE '%מוקלט%' OR s.title ILIKE '%קריאה וביאור%' OR "
       "s.title ILIKE '%קריאה בטעמים%' OR s.title ILIKE '%קריאה עם ביאור פשוט%')")
SNAP = "tli_series_lessons_bak_recorded_20260619"


def q(sql, _t=8):
    last = ""
    for i in range(_t):
        out = sbq.run(sql)
        try:
            d = json.loads(out)
        except Exception:
            last = (out or "")[:160]; time.sleep(1.5 * (i + 1)); continue
        if isinstance(d, dict) and d.get("message"):
            last = json.dumps(d, ensure_ascii=False)[:160]; time.sleep(1.5 * (i + 1)); continue
        return d
    print("  [q] gave up:", last); return None


def base(u):
    return urllib.parse.unquote((u or "").split("?")[0].split("/")[-1]).strip().lower() if u else None


def scrape(url):
    env = dict(os.environ)
    for k in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy"): env.pop(k, None)
    env["NO_PROXY"] = "*"; env["CHROME_BIN"] = CHROME
    try:
        p = subprocess.run(["node", "/tmp/scrape_series.cjs", url], capture_output=True, text=True, env=env, timeout=120)
        return json.loads(p.stdout.strip().splitlines()[-1])
    except Exception as e:
        print("  scrape err", str(e)[:80]); return []


def rabbi_series_urls():
    """{series_title_norm: old_series_url} from the recorded-series rabbis' pages."""
    out = {}
    for name in RABBIS:
        url = "https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/רבנים?rav=" + urllib.parse.quote(name)
        for it in scrape(url):
            if it.get("isSeries") and it.get("link"):
                slug = [s for s in urllib.parse.unquote(it["link"]).split("/") if s.strip()][-1]
                out[norm(slug.replace("-", " "))] = it["link"]
        time.sleep(0.3)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--only", default=None)
    ap.add_argument("--all", action="store_true", help="scan ALL recorded series, not just chapter-dup ones")
    args = ap.parse_args()

    if args.all:
        series = q(f"SELECT DISTINCT s.id, s.title FROM series s WHERE {PAT} AND s.status IN ('active','published')") or []
    else:
        # affected recorded series = those with audio-duplicate or chapter-duplicate lessons
        series = q(f"""SELECT DISTINCT s.id, s.title FROM series s
            WHERE {PAT} AND s.status IN ('active','published') AND s.id IN (
              SELECT series_id FROM (
                SELECT l.series_id, l.bible_chapter, COUNT(*) c FROM lessons l
                WHERE l.status='published' AND l.bible_chapter IS NOT NULL
                GROUP BY l.series_id, l.bible_chapter HAVING COUNT(*)>1) d)""") or []
    if args.only:
        series = [s for s in series if args.only in s["title"]]
    print(f"{len(series)} affected recorded series")

    print("scraping rabbi pages for old series URLs…")
    urlmap = rabbi_series_urls()
    print(f"  {len(urlmap)} series URLs collected")

    if args.apply:
        r = q(f"SELECT to_regclass('public.{SNAP}') t")
        if not (r and r[0].get("t")):
            q(f"CREATE TABLE {SNAP} AS SELECT * FROM teacher_listing_items WHERE scope='series_lessons';")

    BASE = "https://www.bneyzion.co.il"
    report = []
    for s in series:
        sid, title = s["id"], s["title"]
        old_url = urlmap.get(norm(title))
        if not old_url:
            # construct from title is unreliable; report unmatched
            report.append({"title": title, "status": "NO_OLD_URL"}); print(f"  ✗ {title[:40]:40s} NO old url"); continue
        old = scrape(BASE + old_url if old_url.startswith("/") else old_url); time.sleep(0.3)
        old_items = [o for o in old if o.get("title")]
        # DB lessons in this series
        db = q(f"""SELECT id, title, bible_chapter,
            lower(split_part(COALESCE(audio_url,legacy_attachment_url,''),'/',-1)) ab
            FROM lessons WHERE series_id='{esc(sid)}' AND status='published'""") or []
        by_audio, by_title = {}, {}
        for l in db:
            if l["ab"]: by_audio.setdefault(l["ab"], []).append(l)
            by_title.setdefault(norm(l["title"]), []).append(l)
        rows, used, unres = [], set(), []
        for it in old_items:
            ot = norm(it.get("title", "")); oa = base(it.get("media"))
            cand = None
            if oa and oa in by_audio:
                cand = next((l for l in by_audio[oa] if l["id"] not in used), None)
            if not cand and ot in by_title:
                cand = next((l for l in by_title[ot] if l["id"] not in used), None)
            if cand:
                used.add(cand["id"]); rows.append({"lesson_id": cand["id"], "sort_order": len(rows)})
            else:
                unres.append(it.get("title", "")[:30])
        old_n, emit = len(old_items), len(rows)
        db_n = len(db)
        healthy = emit >= old_n - 2 and emit > 0
        status = "OK" if healthy else "LOW"
        # only apply when there are extras to remove (db has more than the old 1:1 set);
        # clean series (db==emit) already render correctly via the fallback — leave them.
        if args.apply and healthy and rows and db_n > emit:
            vals = ",".join(f"('series_lessons','{esc(sid)}','lesson',NULL,'{r['lesson_id']}',{r['sort_order']})" for r in rows)
            q("BEGIN;"
              f"DELETE FROM teacher_listing_items WHERE scope='series_lessons' AND key='{esc(sid)}';"
              "INSERT INTO teacher_listing_items (scope,key,kind,series_id,lesson_id,sort_order) VALUES " + vals + ";COMMIT;")
            status = "APL"; time.sleep(0.3)
        print(f"  {status:3s} {title[:42]:42s} old={old_n:>3} emit={emit:>3} db={db_n:>3} (removes {db_n-emit} dups) unres={len(unres)}")
        report.append({"title": title, "old": old_n, "emit": emit, "db": db_n, "dups_removed": db_n - emit, "unres": unres})

    json.dump(report, open(os.path.join(HERE, "recorded-series-fix.json"), "w"), ensure_ascii=False, indent=1)
    print(f"\napplied={'yes' if args.apply else 'DRY'} | report → recorded-series-fix.json")


if __name__ == "__main__":
    main()
