#!/usr/bin/env python3
"""split_shmuel_a.py — split the MERGED DB series 'ספר שמואל א' (d05f0213, טוביה לפשיץ, 35) back
into the two old-site series: דני סטיסקין (8) + טוביה לפשיץ (27). Match each of the 35 DB lessons
to the old דני series by AUDIO BASENAME (golden key); those become the new דני series.

  python3 split_shmuel_a.py           # dry: scrape + match + print the split plan
  python3 split_shmuel_a.py --apply   # create דני series + move its 8 lessons + re-emit
"""
import sys, os, re, json, time, uuid, html as H, urllib.parse, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import sbq, old_listing
from teachers_reconcile import norm
APPLY = "--apply" in sys.argv
MERGED = "d05f0213-5ee5-4df4-a77f-1c168335bf85"      # ספר שמואל א (טוביה לפשיץ, 35)
BOOK = "שמואל א"
def q(s, _t=8):
    for i in range(_t):
        out = sbq.run(s)
        try:
            d = json.loads(out)
            if isinstance(d, dict) and d.get("message"): time.sleep(1.3*(i+1)); continue
            return d
        except Exception: time.sleep(1.3*(i+1))
    return []
def esc(x): return (x or "").replace("'", "''")
def noenv():
    e=dict(os.environ)
    for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy"): e.pop(k,None)
    e["NO_PROXY"]="*"; return e
def fetch(u): return subprocess.run(["curl","-sL","--noproxy","*","-A","Mozilla/5.0","--max-time","45",u],capture_output=True,text=True,env=noenv()).stdout or ""
def ab(u): return urllib.parse.unquote((u or "").split("/")[-1]).lower() if u else None
def parse_series_audio(html):
    out={}
    for b in re.split(r'(?=<div[^>]*lessonBlock)', html):
        if "lessonBlock" not in b: continue
        mt=re.search(r'<h3[^>]*>(.*?)</h3>', b, re.S); title=H.unescape(re.sub(r'<[^>]+>','',mt.group(1))).strip() if mt else None
        mm=re.search(r'https?://[^"\'\s]+\.mp3', b); audio=ab(mm.group(0)) if mm else None
        if title: out[title]=audio
    return out

# 1. find the two old 'ספר שמואל א' series + their urls/authors
_, rows = old_listing.load_book(BOOK)
cand = [r for r in rows if r["kind"]=="series" and r["title"].strip()=="ספר שמואל א"]
print("old 'ספר שמואל א' series rows:")
for r in cand: print(f"   author={r.get('author')!r} url={r.get('url')}")
dani = next((r for r in cand if "דני סטיסקין" in (r.get("author") or "")), None)
if not dani: print("ABORT: old דני סטיסקין series not found"); sys.exit(1)
dani_audio = parse_series_audio(fetch(dani["url"]))
dani_bases = {a for a in dani_audio.values() if a}
print(f"\nדני old series: {len(dani_audio)} lessons, {len(dani_bases)} with audio")

# 2. the 35 DB lessons in the merged series
db = q(f"SELECT id,title,audio_url,sort_order FROM lessons WHERE series_id='{MERGED}' AND status='published' ORDER BY sort_order")
print(f"merged DB series lessons: {len(db)}")
dani_titles = {norm(t) for t in dani_audio}
to_dani = [l for l in db if (ab(l["audio_url"]) in dani_bases) or (norm(l["title"]) in dani_titles)]
print(f"\nmatched to דני (audio OR title): {len(to_dani)} (target 8)")
for l in to_dani:
    how = "audio" if ab(l["audio_url"]) in dani_bases else "title"
    print(f"   [{how}] {l['title'][:44]:44} | {ab(l['audio_url'])}")
stay = [l for l in db if l not in to_dani]
print(f"stay with טוביה: {len(stay)} (target 27)")

# rabbi id דני סטיסקין
dani_rid = q("SELECT id FROM rabbis WHERE name LIKE '%דני סטיסקין%'")
print("\nדני סטיסקין rabbi id:", dani_rid)

if not APPLY:
    print("\nDRY — re-run with --apply to perform the split."); sys.exit(0)
if len(to_dani) < 4:
    print("ABORT: too few דני matches — unsafe to split."); sys.exit(1)

# 3. apply: backup, create דני series, move lessons
parent = q(f"SELECT parent_id FROM series WHERE id='{MERGED}'")
parent_id = parent[0]["parent_id"] if parent else None
rid = dani_rid[0]["id"]
new_sid = str(uuid.uuid4())
q("DROP TABLE IF EXISTS shmuel_split_bak_20260618")
q(f"CREATE TABLE shmuel_split_bak_20260618 AS SELECT id, series_id FROM lessons WHERE series_id='{MERGED}'")
pclause = f"'{parent_id}'::uuid" if parent_id else "NULL"
q(f"""INSERT INTO series (id,title,rabbi_id,parent_id,status,audience_tags,bible_book)
     VALUES ('{new_sid}'::uuid,'ספר שמואל א','{rid}'::uuid,{pclause},'published',ARRAY['general']::text[],'{BOOK}')""")
ids = ",".join(f"'{l['id']}'" for l in to_dani)
q(f"UPDATE lessons SET series_id='{new_sid}'::uuid WHERE id IN ({ids})")
print(f"created דני series {new_sid}; moved {len(to_dani)} lessons.")
print("counts now:", q(f"SELECT (SELECT COUNT(*) FROM lessons WHERE series_id='{MERGED}' AND status='published') tuvia, (SELECT COUNT(*) FROM lessons WHERE series_id='{new_sid}' AND status='published') dani"))
print("NEW דני series id:", new_sid)
