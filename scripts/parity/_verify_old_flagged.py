import subprocess, re, html as H, os, urllib.parse
def noenv():
    e=dict(os.environ)
    for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy"): e.pop(k,None)
    e["NO_PROXY"]="*"; return e
def fetch(u): return subprocess.run(["curl","-sL","--noproxy","*","-A","Mozilla/5.0","--max-time","45",u],capture_output=True,text=True,env=noenv()).stdout or ""
def author_of(html, needle):
    """find lessonBlock/seriesBlock whose title contains needle → its div.author"""
    out=[]
    for b in re.split(r'(?=<div[^>]*lesson(?:Series)?Block)', html):
        if needle not in b: continue
        mt=re.search(r'<h3[^>]*>(.*?)</h3>', b, re.S)
        title=H.unescape(re.sub(r'<[^>]+>','',mt.group(1))).strip() if mt else '?'
        ma=re.search(r'<div class="author"[^>]*>(.*?)</div>', b, re.S)
        author=H.unescape(re.sub(r'<[^>]+>','',ma.group(1))).strip() if ma else None
        ml=re.search(r'(\d+)\s*שיעור', b); cnt=ml.group(1) if ml else None
        out.append((title[:46], author, cnt))
    return out

BASE="https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים"
print("=== שמואל-א: author of 'ספר שמואל א' series cards ===")
for t,a,c in author_of(fetch(f"{BASE}/נביאים/שמואל-א/"), "ספר שמואל א"): print(f"   {t!r:50} author={a!r} count={c}")
print("\n=== מלכים-א: author of 'מרד אדוניהו' ===")
for t,a,c in author_of(fetch(f"{BASE}/נביאים/מלכים-א/"), "מרד אדוניהו"): print(f"   {t!r:50} author={a!r}")
print("\n=== מלכים-א: author of 'בין משכן למקדש' ===")
for t,a,c in author_of(fetch(f"{BASE}/נביאים/מלכים-א/"), "בין משכן למקדש"): print(f"   {t!r:50} author={a!r}")
print("\n=== ויקרא: author of 'מאוהל מועד' ===")
for t,a,c in author_of(fetch(f"{BASE}/תורה/ויקרא/"), "מאוהל מועד"): print(f"   {t!r:50} author={a!r}")
print("\n=== ישעיהו: author of 'ארבעה נביאים' ===")
for t,a,c in author_of(fetch(f"{BASE}/נביאים/ישעיהו/"), "ארבעה נביאים"): print(f"   {t!r:50} author={a!r}")
print("\n=== בראשית 'שיעורים על התנך - בראשית' series page → lessons ===")
sp=fetch(f"{BASE}/תורה/בראשית/שיעורים-על-התנך-בראשית/")
blocks=[b for b in re.split(r'(?=<div[^>]*lessonBlock)', sp) if 'lessonBlock' in b]
print(f"   series page lessonBlocks: {len(blocks)} (page {len(sp)}b)")
for b in blocks[:8]:
    mt=re.search(r'<h3[^>]*>(.*?)</h3>', b, re.S); title=H.unescape(re.sub(r'<[^>]+>','',mt.group(1))).strip() if mt else '?'
    ma=re.search(r'<div class="author"[^>]*>(.*?)</div>', b, re.S); a=H.unescape(re.sub(r'<[^>]+>','',ma.group(1))).strip() if ma else None
    mp3=re.search(r'https?://[^"\'\s]+\.mp3', b); pdf=re.search(r'https?://[^"\'\s]+\.pdf', b)
    print(f"     {title[:40]:40} | {a} | {'mp3' if mp3 else ('pdf' if pdf else 'none')}")
