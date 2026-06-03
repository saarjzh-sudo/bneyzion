#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
backfill_bible_book.py — surface EXISTING teacher content that has bible_book=NULL.

Many teacher series (created in the 2026-05-27 migration) hold full lesson content
(PDFs etc.) but their bible_book is NULL, so the per-book teacher page (which queries
by bible_book) never shows them. This infers the book from the series TITLE and sets
bible_book on the series + its NULL lessons — no new rows, no duplicates.

DRY-RUN by default. Writes only with --execute. Keys read from secrets/credentials.env.

  python3 scripts/backfill_bible_book.py            # dry-run
  python3 scripts/backfill_bible_book.py --execute  # apply
"""
import subprocess, json, re, os, sys, urllib.parse, time

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SECRETS=os.path.join(ROOT,"secrets","credentials.env")
SB="https://pzvmwfexeiruelwiujxn.supabase.co/rest/v1"
BACKUP_DIR=os.path.join(ROOT,"scripts","backups")

def kv(path,name):
    if not os.path.exists(path): return None
    for ln in open(path,encoding="utf-8"):
        ln=ln.strip()
        if ln.startswith(name+"="): return ln.split("=",1)[1].strip()
    return None
SECRET=kv(SECRETS,"SUPABASE_SECRET_KEY")
ANON=kv(os.path.join(ROOT,".env"),"VITE_SUPABASE_PUBLISHABLE_KEY") or SECRET

def get(path):
    h=["-H",f"apikey: {ANON}","-H",f"Authorization: Bearer {ANON}"]
    out=subprocess.run(["curl","-s","--noproxy","*",*h,f"{SB}/{path}"],capture_output=True).stdout.decode("utf-8","ignore")
    try:
        v=json.loads(out or "[]")
        return v if isinstance(v,list) else sys.exit(f"read err {path}: {str(v)[:160]}")
    except Exception as e: sys.exit(f"read err {path}: {e}")

def get_paged(path):
    h=["-H",f"apikey: {ANON}","-H",f"Authorization: Bearer {ANON}"]
    out=[];start=0
    while True:
        r=subprocess.run(["curl","-s","--noproxy","*",*h,"-H",f"Range: {start}-{start+999}",f"{SB}/{path}"],capture_output=True).stdout.decode("utf-8","ignore")
        try: rows=json.loads(r or "[]")
        except: rows=[]
        if not isinstance(rows,list): sys.exit(f"read err {path}: {str(rows)[:160]}")
        out+=rows
        if len(rows)<1000: break
        start+=1000
    return out

def patch(path,payload):
    h=["-H",f"apikey: {SECRET}","-H",f"Authorization: Bearer {SECRET}","-H","Content-Type: application/json","-H","Prefer: return=minimal"]
    r=subprocess.run(["curl","-s","--noproxy","*","-X","PATCH",*h,"-w","\n%{http_code}",f"{SB}/{path}","--data-binary","@-"],
                     input=json.dumps(payload).encode(),capture_output=True)
    out=r.stdout.decode("utf-8","ignore"); return out.rsplit("\n",1)[-1]

# Canonical book names. Two-word forms (שמואל/מלכים/דברי הימים) listed so substring match is exact.
BOOKS=["בראשית","שמות","ויקרא","במדבר","דברים",
       "יהושע","שופטים","שמואל א","שמואל ב","מלכים א","מלכים ב",
       "ישעיהו","ירמיהו","יחזקאל","תרי עשר",
       "תהלים","משלי","איוב","שיר השירים","רות","איכה","קהלת","אסתר",
       "דניאל","עזרא","נחמיה","דברי הימים"]

def infer_book(title):
    for b in BOOKS:
        if b in title: return b
    return None

def main():
    execute="--execute" in sys.argv
    print(f"MODE: {'EXECUTE' if execute else 'DRY-RUN'} | secret: {'ok' if SECRET and SECRET.startswith('sb_secret') else 'MISSING'}")
    series=get_paged("series?select=id,title,bible_book,lesson_count,audience_tags&bible_book=is.null")
    plan=[]
    for s in series:
        if (s.get('lesson_count') or 0)<=0: continue
        b=infer_book(s['title'])
        if b: plan.append((s,b))
    print(f"series with bible_book=NULL + content + inferable book: {len(plan)}")
    by_book={}
    for s,b in plan: by_book.setdefault(b,[0,0]); by_book[b][0]+=1; by_book[b][1]+=s.get('lesson_count') or 0
    for b,(n,l) in sorted(by_book.items(),key=lambda x:-x[1][1]):
        print(f"   {b}: {n} series → set bible_book on series + ~{l} lessons")
    if not execute:
        print("\n(DRY-RUN. Re-run with --execute to backfill.)")
        return
    os.makedirs(BACKUP_DIR,exist_ok=True)
    # local backup of the series we will touch
    json.dump([s for s,_ in plan],open(os.path.join(BACKUP_DIR,"backfill-series-before.json"),"w"),ensure_ascii=False)
    print("\n== WRITING bible_book ==")
    ok=0
    for s,b in plan:
        be=urllib.parse.quote(b)
        c1=patch(f"series?id=eq.{s['id']}", {"bible_book":b})
        # set bible_book on this series' lessons that are still null
        c2=patch(f"lessons?series_id=eq.{s['id']}&bible_book=is.null", {"bible_book":b})
        mark="✓" if c1 in ("200","204") and c2 in ("200","204") else "⚠"
        print(f"   {mark} {b:9} | {s['title'][:42]:42} (series {c1}, lessons {c2})")
        ok+= 1 if mark=="✓" else 0
        time.sleep(0.1)
    print(f"\nDONE: {ok}/{len(plan)} series backfilled.")
    print("Verify: python3 scripts/audit_teachers.py")

if __name__=="__main__": main()
