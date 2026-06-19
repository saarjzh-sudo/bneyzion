#!/usr/bin/env python3
"""
rabbi_empty_rebuild.py — close the 21 "empty-old" rabbi pages.

Their old rav pages are JS-rendered, so the original curl scrape got n_items=0 (false empty);
RabbiPage then falls back to lessons-by-rabbi_id (e.g. יונדב זר=narrator → 1639 recorded chapters
instead of his 38 series). We headless-render each page, extract the real ordered items, resolve
to DB entities, and rebuild rabbi_page_items 1:1 — so the page matches the old rav page exactly.

Resolution: series items (lessonSeriesBlock) → title from the series-link slug → match DB series by
norm-title (prefer this-rabbi); plain lessons → media-basename golden key → norm-title.

Usage: python3 rabbi_empty_rebuild.py            # dry-run
       python3 rabbi_empty_rebuild.py --apply
"""
import sys, os, json, re, time, subprocess, urllib.parse, argparse, glob
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import sbq
from teachers_reconcile import norm, esc
from fix_lesson_rabbis import rb_norm
import rabbi_page_listing as rpl

q = rpl.q
basename = rpl.basename
SNAP = "rabbi_page_items_bak_l4_20260619"  # reuse L4 snapshot (already the pre-L4 truth)
CHROME = (glob.glob(os.path.expanduser("~/.cache/puppeteer/chrome-headless-shell/*/chrome-headless-shell-*/chrome-headless-shell")) or [""])[0]


def scrape(url):
    env = dict(os.environ)
    for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy"): env.pop(k, None)
    env["NO_PROXY"] = "*"; env["CHROME_BIN"] = CHROME
    p = subprocess.run(["node", "/tmp/scrape_rav2.cjs", url], capture_output=True, text=True, env=env, timeout=120)
    try:
        return json.loads(p.stdout.strip().splitlines()[-1])
    except Exception:
        return []


def slug_title(link):
    """series link → human title from the last path slug."""
    if not link:
        return None
    segs = [s for s in urllib.parse.unquote(link).split("/") if s.strip()]
    return segs[-1].replace("-", " ").strip() if segs else None


def resolve(items, rid, pools):
    media_idx, title_idx, series_idx = pools
    rows, used, unresolved = [], set(), []
    for it in items:
        title = (it.get("title") or "").strip()
        if it.get("isSeries"):
            key = norm(slug_title(it.get("link")) or title)
            cands = [s for s in series_idx.get(key, []) if s["id"] not in used]
            if not cands:
                unresolved.append({"t": slug_title(it.get("link")) or title, "k": "series"}); continue
            s = rpl.rank_series(cands, rid, None); used.add(s["id"])
            rows.append({"kind": "series", "series_id": s["id"], "lesson_id": None, "sort_order": len(rows)+1})
        else:
            cands = []
            b = basename(it.get("media"))
            if b and b in media_idx:
                cands = [l for l in media_idx[b] if l["id"] not in used]
            if not cands:
                cands = [l for l in title_idx.get(norm(title), []) if l["id"] not in used]
            if not cands:
                unresolved.append({"t": title, "k": "lesson"}); continue
            l = rpl.rank_lessons(cands, rid)
            if not l["has_content"] and not l["_has_media"]:
                unresolved.append({"t": title, "k": "empty"}); continue
            used.add(l["id"])
            rows.append({"kind": "lesson", "series_id": None, "lesson_id": l["id"], "sort_order": len(rows)+1})
    return rows, unresolved


def apply_rows(rid, rows):
    vals = ",".join(
        f"('{rid}','{r['kind']}',{('NULL' if r['series_id'] is None else chr(39)+r['series_id']+chr(39))},"
        f"{('NULL' if r['lesson_id'] is None else chr(39)+r['lesson_id']+chr(39))},{r['sort_order']})" for r in rows)
    q("BEGIN;"
      f"DELETE FROM rabbi_page_items WHERE rabbi_id='{rid}' AND sort_order<9000;"
      "INSERT INTO rabbi_page_items (rabbi_id,kind,series_id,lesson_id,sort_order) VALUES " + vals + ";COMMIT;")


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--apply", action="store_true"); args = ap.parse_args()
    old = json.load(open(os.path.join(HERE, "oneone/old_rabbi_pages.json"), encoding="utf-8"))
    plan = json.load(open(os.path.join(HERE, "rabbi-page-listing-plan.json"), encoding="utf-8"))["plans"]
    empty = [p for p in plan if p["old_n"] == 0]
    print(f"loading pools… ({len(empty)} empty-old rabbis)")
    rmap = rpl.load_rabbi_map(); series_idx = rpl.load_series_pool()
    media_idx, title_idx, _b, ntot = rpl.load_lesson_pools()
    pools = (media_idx, title_idx, series_idx)
    if args.apply:
        r = q(f"SELECT to_regclass('public.{SNAP}') AS t")
        if not (r and r[0].get("t")):
            q(f"CREATE TABLE {SNAP} AS SELECT * FROM rabbi_page_items;")
    # authoritative full rabbi name (table) → correct ?rav= param. The stored old urls dropped the
    # "הרב" prefix for some rabbis → original scrape hit a 0-item page (false empty). Rebuild URL.
    names = {r["id"]: r["name"] for r in (q("SELECT id, name FROM rabbis") or [])}
    BASE = "https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/רבנים?rav="
    out = []
    for p in empty:
        e = old.get(p["name"], {}); exp = e.get("expected_count") or 0
        full = names.get(p["rabbi_id"], p["name"])
        url = BASE + urllib.parse.quote(full)
        items = scrape(url); time.sleep(0.4)
        if not items:  # retry without הרב prefix (some pages keyed bare)
            bare = re.sub(r'^(הרב|הרבנית|הג"ר|מורנו)\s+', '', full)
            if bare != full:
                items = scrape(BASE + urllib.parse.quote(bare)); time.sleep(0.4)
        rows, unres = resolve(items, p["rabbi_id"], pools)
        status = "dry"
        if args.apply and rows:
            apply_rows(p["rabbi_id"], rows); status = "APL"; time.sleep(0.3)
        ns = sum(1 for r in rows if r["kind"] == "series")
        print(f"  {status:3s} {p['name'][:30]:30s} scraped={len(items):>3} → rpi={len(rows):>3} (S{ns}) unres={len(unres)}")
        out.append({"name": p["name"], "rabbi_id": p["rabbi_id"], "scraped": len(items),
                    "emitted": len(rows), "series": ns, "unresolved": unres, "rows": rows})
    json.dump(out, open(os.path.join(HERE, "rabbi-empty-rebuild.json"), "w"), ensure_ascii=False, indent=1)
    print(f"\napplied={'yes' if args.apply else 'DRY'} | total rabbis={len(out)} | "
          f"total rpi rows={sum(o['emitted'] for o in out)}")


if __name__ == "__main__":
    main()
