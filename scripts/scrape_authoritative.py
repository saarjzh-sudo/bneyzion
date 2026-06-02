#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Scrape the OLD bneyzion site → authoritative per-book teacher dataset.
Captures every series: title, author, lesson count, and its series-page URL
(so lessons can be fetched for import). Output: /tmp/authoritative.json"""
import subprocess, json, re, html as _html, urllib.parse

UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36"
OLD="https://www.bneyzion.co.il"
def curl(path):
    url=OLD+urllib.parse.quote(path) if path.startswith('/') else path
    return subprocess.run(["curl","-sL","--noproxy","*","-A",UA,url],capture_output=True,text=True).stdout

def norm(t):
    t=_html.unescape(t); t=re.sub(r'[״"\'‘’“”`]','',t); return re.sub(r'\s+',' ',t).strip()
def strip(x): return norm(re.sub(r'<[^>]+>','',x))

FOOTER={"הרשמה למייל השבועי","שאל שאלה בתנך","הזמינו שיעור תנך בקהילה או באירוע","חומרי עזר נוספים למורים"}

books=json.load(open("/tmp/book-urls.json"))

def parse_book(html):
    """Segment by <h3>; for each series capture title, author, count, and nearest href."""
    out={}
    h3s=list(re.finditer(r'<h3[^>]*>(.*?)</h3>', html, re.S))
    for i,m in enumerate(h3s):
        title=strip(m.group(1))
        if not title or title in FOOTER or len(title)>70 or title.startswith('מעבר ל'): continue
        seg=html[m.end(): h3s[i+1].start() if i+1<len(h3s) else m.end()+1500]
        pre=html[max(0,m.start()-800):m.start()]
        am=re.search(r'class="author"[^>]*>(.*?)</', seg, re.S)
        author=strip(am.group(1)) if am else ""
        cm=re.search(r'(\d+)\s*שיעורים', seg)
        count=int(cm.group(1)) if cm else None
        # nearest href before the h3 (the wrapping <a>)
        hrefs=re.findall(r'href="([^"]+)"', pre)
        url=hrefs[-1] if hrefs else None
        if title not in out:
            out[title]={"title":title,"author":author,"count":count,"url":url}
    return list(out.values())

data={}
for book,kolurl in books.items():
    bookpath=re.sub(r'[^/]+/?$','',kolurl.rstrip('/')+'/')
    data[book]=parse_book(curl(bookpath))
    print(f"{book}: {len(data[book])} series scraped")

json.dump(data, open("/tmp/authoritative.json","w"), ensure_ascii=False, indent=1)
print("\nSaved /tmp/authoritative.json")
# sample one series with url
ex=[s for s in data['שופטים'] if s['url']][:3]
for s in ex: print(" sample:", s['title'][:30], "→", s['url'])
