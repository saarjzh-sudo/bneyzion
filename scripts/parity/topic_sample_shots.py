import os, sys, json, subprocess, glob, urllib.parse
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = "/tmp/tverify"; os.makedirs(OUT, exist_ok=True)
cands = glob.glob(os.path.expanduser("~/.cache/puppeteer/chrome-headless-shell/*/chrome-headless-shell-*/chrome-headless-shell"))
CHROME = cands[0] if cands else "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
def noenv():
    e = dict(os.environ)
    for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy"): e.pop(k, None)
    e["NO_PROXY"]="*"; e["CHROME_BIN"]=CHROME; return e
man = {m["title"]: m for m in json.load(open(os.path.join(HERE, "topic-manifest.json"), encoding="utf-8"))}
SAMPLE = ["דוד המלך","גאולה","ראש השנה","האזנה לפסוקים עם ביאור פשוט","ירושלים",
          "תשובה","ארץ ישראל","משיח","אמונה","חינוך"]
NEW = "https://bneyzion.vercel.app"
OLDBASE = "https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/נושאים/"
def shot(url, path):
    try:
        subprocess.run(["node", os.path.join(HERE,"fullshot.cjs"), url, path, "1366"],
                       capture_output=True, text=True, env=noenv(), timeout=160)
        return os.path.exists(path) and os.path.getsize(path) > 5000
    except Exception: return False
for i, t in enumerate(SAMPLE, 1):
    m = man.get(t)
    if not m or not m.get("slug"): print(f"[{i}] {t}: no slug"); continue
    safe = t.replace("/", "_").replace('"','')
    nu = f"{NEW}/topic/{m['slug']}"
    ou = OLDBASE + "?subject=" + urllib.parse.quote(t)
    n = shot(nu, f"{OUT}/{safe}-new.png"); o = shot(ou, f"{OUT}/{safe}-old.png")
    print(f"[{i}/{len(SAMPLE)}] {t[:26]:26} new={'OK' if n else 'X'} old={'OK' if o else 'X'} | old_items={m['old_items']} cur={m['cur_total']} slug={m['slug']}", flush=True)
print("DONE", flush=True)
