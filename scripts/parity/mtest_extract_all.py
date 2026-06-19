#!/usr/bin/env python3
"""mtest_extract_all.py — pre-extract OLD + NEW item-lists for every node in the work-list.
Parallel headless (ThreadPool). Writes /tmp/mtest/<safe>.json = {node, old:{n,h1,items}, new:{...}}.
Run: python3 mtest_extract_all.py [workers]"""
import sys, os, json, subprocess, glob, time
from concurrent.futures import ThreadPoolExecutor, as_completed
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = "/tmp/mtest"; os.makedirs(OUT, exist_ok=True)
CHROME = (glob.glob(os.path.expanduser("~/.cache/puppeteer/chrome-headless-shell/*/chrome-headless-shell-*/chrome-headless-shell")) or [""])[0]
WORKERS = int(sys.argv[1]) if len(sys.argv) > 1 else 8

def env():
    e = dict(os.environ)
    for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy"): e.pop(k, None)
    e["NO_PROXY"] = "*"; e["CHROME_BIN"] = CHROME; return e

def extract(url):
    try:
        p = subprocess.run(["node", "/tmp/mtest_extract.cjs", url], capture_output=True, text=True, env=env(), timeout=100)
        return json.loads(p.stdout.strip().splitlines()[-1])
    except Exception as e:
        return {"error": str(e)[:80], "n": 0, "items": []}

def do(node):
    fp = os.path.join(OUT, node["safe"] + ".json")
    if os.path.exists(fp) and os.path.getsize(fp) > 40:
        return node["safe"], "cached"
    old = extract(node["old_url"]); new = extract(node["new_url"])
    json.dump({"node": node, "old": old, "new": new}, open(fp, "w"), ensure_ascii=False)
    return node["safe"], f"old={old.get('n')} new={new.get('n')}"

work = json.load(open(os.path.join(HERE, "mtest-worklist.json"), encoding="utf-8"))
print(f"extracting {len(work)} nodes × 2 (old+new), {WORKERS} workers…", flush=True)
done = 0
with ThreadPoolExecutor(max_workers=WORKERS) as ex:
    futs = {ex.submit(do, n): n for n in work}
    for f in as_completed(futs):
        done += 1
        safe, res = f.result()
        if done % 20 == 0 or "error" in str(res):
            print(f"  [{done}/{len(work)}] {safe[:30]:30s} {res}", flush=True)
print(f"DONE — {done} nodes extracted → {OUT}/", flush=True)
