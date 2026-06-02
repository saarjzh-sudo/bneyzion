#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Audit teacher-wing books: OLD site (bneyzion.co.il) vs OUR Supabase DB.
Compares per book: series list, author, lesson count."""
import subprocess, json, re, urllib.parse, os
from bs4 import BeautifulSoup

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
OLD = "https://www.bneyzion.co.il"
SB = "https://pzvmwfexeiruelwiujxn.supabase.co/rest/v1"
ENV = open("/Users/srhlq/Downloads/saar-workspace/bneyzion-data/.env").read()
ANON = re.search(r"VITE_SUPABASE_PUBLISHABLE_KEY=(\S+)", ENV).group(1)

def curl(url, headers=None):
    cmd = ["curl","-sL","--noproxy","*","-A",UA]
    for k,v in (headers or {}).items(): cmd += ["-H", f"{k}: {v}"]
    cmd.append(url)
    return subprocess.run(cmd, capture_output=True, text=True).stdout

def sb(path):
    h={"apikey":ANON,"Authorization":f"Bearer {ANON}"}
    return json.loads(curl(f"{SB}/{path}", h) or "[]")

def sb_paged(path):
    h={"apikey":ANON,"Authorization":f"Bearer {ANON}"}
    out=[]; start=0
    while True:
        hh=dict(h); hh["Range"]=f"{start}-{start+999}"
        cmd=["curl","-s","--noproxy","*"]
        for k,v in hh.items(): cmd+=["-H",f"{k}: {v}"]
        cmd.append(f"{SB}/{path}")
        rows=json.loads(subprocess.run(cmd,capture_output=True,text=True).stdout or "[]")
        out+=rows
        if len(rows)<1000: break
        start+=1000
    return out

def norm(t):
    t=re.sub(r'[״"\'‘’“”`]','',t)
    t=re.sub(r'\s+',' ',t).strip()
    return t

books=json.load(open("/tmp/book-urls.json"))

FOOTER={"הרשמה למייל השבועי","שאל שאלה בתנך","הזמינו שיעור תנך בקהילה או באירוע",
        "חומרי עזר נוספים למורים","שאל שאלה בתנ”ך"}
import html as _html
def striptags(x): return norm(_html.unescape(re.sub(r'<[^>]+>','',x)))
def parse_old(html):
    # DOM tree is malformed (lessonSeriesBlock collapses); segment raw HTML by <h3> instead.
    seen={}
    h3s=list(re.finditer(r'<h3[^>]*>(.*?)</h3>', html, re.S))
    for i,m in enumerate(h3s):
        title=striptags(m.group(1))
        if not title or title in FOOTER or len(title)>70: continue
        seg=html[m.end(): h3s[i+1].start() if i+1<len(h3s) else m.end()+1200]
        am=re.search(r'class="author"[^>]*>(.*?)</', seg, re.S)
        author=striptags(am.group(1)) if am else ""
        cm=re.search(r'(\d+)\s*שיעורים', seg)
        count=int(cm.group(1)) if cm else None
        if title not in seen:
            seen[title]={"title":title,"author":author,"count":count}
    return list(seen.values())

report=[]
for book,url in books.items():
    # book page = parent of the "כל התכנים" link (strip last path segment)
    bookpath=re.sub(r'[^/]+/?$','',url.rstrip('/')+'/')
    full=OLD+urllib.parse.quote(bookpath)
    old=parse_old(curl(full))
    # OUR DB: teacher series for this book via lessons.bible_book
    lessR=sb_paged(f"lessons?select=series_id&bible_book=eq.{urllib.parse.quote(book)}&audience_tags=cs.%7Bteachers%7D&series_id=not.is.null")
    sids=list({r["series_id"] for r in lessR if r.get("series_id")})
    ours=[]
    for i in range(0,len(sids),50):
        chunk=sids[i:i+50]
        inlist="("+",".join(chunk)+")"
        rows=sb(f"series?select=title,lesson_count,rabbis(name)&id=in.{urllib.parse.quote(inlist)}")
        for r in rows:
            ours.append({"title":norm(r["title"]),"author":norm((r.get("rabbis") or {}).get("name") or ""),"count":r.get("lesson_count")})
    oursByTitle={x["title"]:x for x in ours}
    oldByTitle={x["title"]:x for x in old}
    missing=[t for t in oldByTitle if t not in oursByTitle]
    extra=[t for t in oursByTitle if t not in oldByTitle]
    authmismatch=[]; cntmismatch=[]
    for t in oldByTitle:
        if t in oursByTitle:
            o,n=oldByTitle[t],oursByTitle[t]
            if o["author"] and n["author"] and o["author"]!=n["author"]:
                authmismatch.append((t,o["author"],n["author"]))
            if o["count"] is not None and n["count"] is not None and o["count"]!=n["count"]:
                cntmismatch.append((t,o["count"],n["count"]))
    report.append({"book":book,"old_n":len(old),"our_n":len(ours),
                   "missing":missing,"extra":extra,"auth":authmismatch,"cnt":cntmismatch})

json.dump(report, open("/tmp/audit_report.json","w"), ensure_ascii=False, indent=1)
print("="*70)
for r in report:
    print(f"\n### {r['book']}  — OLD={r['old_n']} series | OURS={r['our_n']} series")
    if r["missing"]: print(f"  ❌ חסר אצלנו ({len(r['missing'])}): "+" | ".join(r["missing"][:12]))
    if r["extra"]:   print(f"  ➕ עודף אצלנו ({len(r['extra'])}): "+" | ".join(r["extra"][:12]))
    if r["auth"]:
        print(f"  👤 מחבר שגוי ({len(r['auth'])}):")
        for t,o,n in r["auth"][:12]: print(f"       '{t[:40]}' ישן={o} ↔ שלנו={n}")
    if r["cnt"]:
        print(f"  🔢 מספר שיעורים שונה ({len(r['cnt'])}):")
        for t,o,n in r["cnt"][:12]: print(f"       '{t[:40]}' ישן={o} ↔ שלנו={n}")
    if not (r["missing"] or r["extra"] or r["auth"] or r["cnt"]):
        print("  ✅ תואם")
print("\n"+"="*70)
