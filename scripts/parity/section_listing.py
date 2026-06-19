#!/usr/bin/env python3
"""section_listing.py — 1:1 PUBLIC listing for SECTION leaves (מועדים/נושאים/הפטרות/...).

Sections render through the SAME CategoryPage path as books: teacher_listing_items
scope='public_book', key=<node title>. Their old ground truth isn't in the book-listing JSON,
so we SCRAPE each old leaf page live, parse its ordered series+lesson blocks, and feed them to
public_book_listing.build_book(node_pool=True, old_override=...). Same guards as books
(no empty cards, no teacher-EXCLUSIVE leak), verify-before-apply.

  python3 section_listing.py [--section "מועדים"] [--title "חנוכה"] [--apply] [--limit N]
"""
import sys, os, re, json, time, argparse, subprocess, html as _html
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import sbq, public_book_listing as P
from teachers_reconcile import norm

def q(s, _t=8):
    for i in range(_t):
        out = sbq.run(s)
        try:
            d = json.loads(out)
            if isinstance(d, dict) and d.get("message"): time.sleep(1.3*(i+1)); continue
            return d
        except Exception: time.sleep(1.3*(i+1))
    return []
def noenv():
    e = dict(os.environ)
    for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy"): e.pop(k, None)
    e["NO_PROXY"]="*"; return e
def fetch(u):
    for i in range(3):
        p = subprocess.run(["curl","-sL","--noproxy","*","-A","Mozilla/5.0","--max-time","45",u],
                           capture_output=True, text=True, env=noenv())
        if p.returncode == 0 and len(p.stdout) > 500: return p.stdout
        time.sleep(2*(i+1))
    return ""

def parse_section_page(html):
    """Ordered rows [{order_index,kind,title,title_norm,author,length,lesson_count,url,media}]
       from an old section leaf page (lessonSeriesBlock = series, lessonBlock = standalone)."""
    rows = []
    for part in re.split(r'(?=<div[^>]*?lesson(?:Series)?Block)', html):
        m = re.search(r'<div[^>]*?(lessonSeriesBlock|lessonBlock)', part)
        if not m: continue
        kind = "series" if m.group(1) == "lessonSeriesBlock" else "lesson"
        mt = re.search(r'<h3[^>]*>(.*?)</h3>', part, re.S)
        title = _html.unescape(re.sub(r'<[^>]+>', '', mt.group(1))).strip() if mt else None
        if not title: continue
        ma = re.search(r'<div class="author"[^>]*>(.*?)</div>', part, re.S)
        author = _html.unescape(re.sub(r'<[^>]+>', '', ma.group(1))).strip() if ma else None
        mc = re.search(r'(\d+)\s*שיעור', part); lc = int(mc.group(1)) if mc else None
        mm = re.search(r'''https?://[^"'\s]+\.(?:mp3|pdf|mp4)''', part); media = [mm.group(0)] if mm else []
        rows.append({"order_index": len(rows), "kind": kind, "title": title, "title_norm": norm(title),
                     "author": author, "length": None, "lesson_count": lc, "url": None, "media": media})
    return rows

EMPTY = ("(content IS NULL OR content='') AND audio_url IS NULL AND video_url IS NULL "
         "AND attachment_url IS NULL AND legacy_attachment_url IS NULL")
def empty_ids(ids):
    bad = []; ids = [i for i in ids if i]
    for k in range(0, len(ids), 200):
        ch = "','".join(ids[k:k+200])
        bad += [x["id"] for x in (q(f"SELECT id FROM lessons WHERE id IN ('{ch}') AND ({EMPTY})") or [])]
    return bad
def leak_count(sids, lids):
    n = 0
    if sids: n += (q("SELECT COUNT(*) n FROM series WHERE id IN ('"+"','".join(sids)+"') AND audience_tags @> ARRAY['teachers'] AND NOT audience_tags @> ARRAY['general']") or [{"n":0}])[0]["n"]
    if lids: n += (q("SELECT COUNT(*) n FROM lessons WHERE id IN ('"+"','".join(lids)+"') AND audience_tags @> ARRAY['teachers'] AND NOT audience_tags @> ARRAY['general']") or [{"n":0}])[0]["n"]
    return n

def run_leaf(m, apply):
    title, node_id, old_url = m["title"], m["new_node_id"], m["old_url"]
    v = {"title": title, "node_id": node_id, "status": "PENDING", "blockers": [], "gaps": []}
    rows = parse_section_page(fetch(old_url))
    if not rows:
        v["status"] = "SKIP_EMPTY_OLD"; return v   # old leaf has no listing blocks (e.g. nav-only)
    plan = P.build_book(title, node_id=node_id, node_pool=True, old_override=(old_url, rows))
    if plan.get("error"):
        v["status"] = "ERROR"; v["blockers"].append(plan["error"]); return v
    pr = plan.get("rows", [])
    v["metrics"] = {"old_items": plan.get("old_items"), "emitted": plan.get("emitted")}
    sids = [r["series_id"] for r in pr if r.get("series_id")]
    lids = [r["lesson_id"] for r in pr if r.get("lesson_id")]
    e = empty_ids(lids)
    if e: v["blockers"].append(f"{len(e)} empty lessons emitted")
    lk = leak_count(sids, lids)
    if lk: v["blockers"].append(f"{lk} teacher-EXCLUSIVE leak")
    v["gaps"] = [g.get("title") for g in plan.get("gaps_unresolved", [])]
    if v["blockers"]:
        v["status"] = "FLAGGED"; return v
    if apply:
        P.apply_book({"book": title, "rows": pr}); v["status"] = "APPLIED"
    else:
        v["status"] = "PASS_DRY"
    return v

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--section"); ap.add_argument("--title"); ap.add_argument("--apply", action="store_true")
    ap.add_argument("--limit", type=int, default=0)
    a = ap.parse_args()
    man = [m for m in json.load(open(os.path.join(HERE, "section-manifest.json"), encoding="utf-8")) if m.get("new_node_id")]
    if a.section: man = [m for m in man if m["section"] == a.section]
    if a.title:   man = [m for m in man if m["title"] == a.title]
    if a.limit:   man = man[:a.limit]
    out = []
    for i, m in enumerate(man, 1):
        v = run_leaf(m, a.apply)
        out.append(v)
        print(f"[{i}/{len(man)}] {m['title'][:32]:32} {v['status']:14} emit={v.get('metrics',{}).get('emitted')}/{v.get('metrics',{}).get('old_items')} gaps={len(v.get('gaps',[]))} {('BLOCK:'+';'.join(v['blockers'])) if v['blockers'] else ''}", flush=True)
        time.sleep(0.3)
    json.dump(out, open(os.path.join(HERE, "reports", "section-listing-verdicts.json"), "w"), ensure_ascii=False, indent=1)
    from collections import Counter
    print("\nstatus:", dict(Counter(v["status"] for v in out)))

if __name__ == "__main__":
    main()
