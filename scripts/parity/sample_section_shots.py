import os, sys, json, subprocess, glob
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = "/tmp/sverify"; os.makedirs(OUT, exist_ok=True)
cands = glob.glob(os.path.expanduser("~/.cache/puppeteer/chrome-headless-shell/*/chrome-headless-shell-*/chrome-headless-shell"))
CHROME = cands[0] if cands else "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
def noenv():
    e = dict(os.environ)
    for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy"): e.pop(k, None)
    e["NO_PROXY"]="*"; e["CHROME_BIN"]=CHROME; return e
man = json.load(open(os.path.join(HERE, "section-manifest.json"), encoding="utf-8"))
SAMPLE = ["חנוכה","פסח","פורים","דוד המלך","גלות וגאולה","הפטרת בראשית","הפטרת נח",
          "הגישה הראויה ללימוד תנ\"ך","ארבע המלכויות","בית המקדש והכהנים",
          "הפטרת בא","הפטרת יתרו","נבואה ונביאים","ירושלים","מלחמה"]
picked = [m for m in man if m["title"] in SAMPLE and m["new_node_id"]]
def shot(url, path):
    try:
        subprocess.run(["node", os.path.join(HERE,"fullshot.cjs"), url, path, "1366"],
                       capture_output=True, text=True, env=noenv(), timeout=150)
        return os.path.exists(path) and os.path.getsize(path) > 5000
    except Exception: return False
for i, m in enumerate(picked, 1):
    t = m["title"].replace("/", "_").replace('"','')
    n = shot(m["new_url"], f"{OUT}/{t}-new.png"); o = shot(m["old_url"], f"{OUT}/{t}-old.png")
    print(f"[{i}/{len(picked)}] {m['title'][:30]:30} new={'OK' if n else 'X'} old={'OK' if o else 'X'} pub={m['pub_lessons']} kids={m['child_series']}", flush=True)
print("DONE", flush=True)
