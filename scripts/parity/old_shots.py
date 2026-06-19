#!/usr/bin/env python3
"""old_shots.py — pre-capture full-page screenshots of every book's OLD page (static site,
zero Supabase) so the final visual 1:1 verify (#11) only needs fresh NEW shots after writes.
Output: /tmp/verify/{book}-old.png"""
import os, sys, json, subprocess, glob
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = "/tmp/verify"; os.makedirs(OUT, exist_ok=True)
cands = glob.glob(os.path.expanduser("~/.cache/puppeteer/chrome-headless-shell/*/chrome-headless-shell-*/chrome-headless-shell"))
CHROME = cands[0] if cands else "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
def noenv():
    e = dict(os.environ)
    for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy"): e.pop(k, None)
    e["NO_PROXY"] = "*"; e["CHROME_BIN"] = CHROME; return e
man = json.load(open(os.path.join(HERE, "verify-manifest.json"), encoding="utf-8"))
ok = 0
for i, m in enumerate(man, 1):
    b, url = m["book"], m.get("old_url")
    if not url:
        print(f"[{i}/{len(man)}] {b}: no old_url", flush=True); continue
    out = f"{OUT}/{b}-old.png"
    try:
        subprocess.run(["node", os.path.join(HERE, "fullshot.cjs"), url, out, "1366"],
                       capture_output=True, text=True, env=noenv(), timeout=150)
        good = os.path.exists(out) and os.path.getsize(out) > 5000
        ok += good
        print(f"[{i}/{len(man)}] {b}: {'OK' if good else 'FAIL'} ({os.path.getsize(out) if os.path.exists(out) else 0}b)", flush=True)
    except Exception as e:
        print(f"[{i}/{len(man)}] {b}: ERR {e}", flush=True)
print(f"\nDONE: {ok}/{len(man)} old shots captured", flush=True)
