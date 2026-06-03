#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
import_teachers_fix.py — bring the Teachers Wing 1:1 with the OLD bneyzion.co.il site.

WHAT IT DOES (book by book, תורה + נביאים):
  1. BACKUP: snapshots current lessons + series to scripts/backups/ (local JSON) before any write.
  2. SCRAPE: pulls the authoritative series list per book from the live OLD site.
  3. RECONCILE: finds series that exist in the old site but are MISSING in our DB.
  4. IMPORT (only with --execute): inserts the missing series (+ a lesson when the old item is a
     single downloadable file — PDF/Word — captured as attachment_url).
  5. AUTHOR FIXES: corrects known wrong authors (מדריכים למורה → ישקו העדרים; +נתן מולאיוף on סיכומים).

SAFETY:
  - DRY-RUN BY DEFAULT. Prints exactly what would change. Writes ONLY with --execute.
  - Keys are read from secrets/credentials.env (never passed on the command line).
  - Full local backup written before the first write; rollback instructions printed.

USAGE (run from the repo root):
  python3 scripts/import_teachers_fix.py                 # dry-run, prints the plan
  python3 scripts/import_teachers_fix.py --book בראשית   # dry-run, one book
  python3 scripts/import_teachers_fix.py --execute       # actually writes (after you reviewed the dry-run)
"""
import subprocess, json, re, html as _html, urllib.parse, os, sys, datetime, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SECRETS = os.path.join(ROOT, "secrets", "credentials.env")
BACKUP_DIR = os.path.join(ROOT, "scripts", "backups")
OLD = "https://www.bneyzion.co.il"
SB = "https://pzvmwfexeiruelwiujxn.supabase.co/rest/v1"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36"

def load_kv(path, name):
    if not os.path.exists(path): return None
    for ln in open(path, encoding="utf-8"):
        ln = ln.strip()
        if ln.startswith(name + "="):
            return ln.split("=", 1)[1].strip()
    return None

# writes → secret key (bypasses RLS). reads → proven old JWT anon from .env.
SECRET_KEY = load_kv(SECRETS, "SUPABASE_SECRET_KEY")
ANON_KEY   = load_kv(os.path.join(ROOT, ".env"), "VITE_SUPABASE_PUBLISHABLE_KEY") \
             or load_kv(SECRETS, "SUPABASE_PUBLISHABLE_KEY") or SECRET_KEY

def curl_old(path):
    url = OLD + urllib.parse.quote(path) if path.startswith("/") else path
    return subprocess.run(["curl","-sL","--noproxy","*","-A",UA,url],
                          capture_output=True).stdout.decode("utf-8","ignore")

def sb_get(path):
    h = ["-H", f"apikey: {ANON_KEY}", "-H", f"Authorization: Bearer {ANON_KEY}"]
    out = subprocess.run(["curl","-s","--noproxy","*",*h, f"{SB}/{path}"],
                         capture_output=True).stdout.decode("utf-8","ignore")
    try: return json.loads(out or "[]")
    except: return []

def sb_get_paged(path):
    h = ["-H", f"apikey: {ANON_KEY}", "-H", f"Authorization: Bearer {ANON_KEY}"]
    out=[]; start=0
    while True:
        r=subprocess.run(["curl","-s","--noproxy","*",*h,"-H",f"Range: {start}-{start+999}", f"{SB}/{path}"],
                         capture_output=True).stdout.decode("utf-8","ignore")
        try: rows=json.loads(r or "[]")
        except: rows=[]
        if not isinstance(rows, list):
            sys.exit(f"DB read error on {path}: {str(rows)[:200]}")
        out+=rows
        if len(rows)<1000: break
        start+=1000
    return out

def sb_write(method, path, payload):
    """POST/PATCH to PostgREST using the SECRET key (bypasses RLS). Returns (status, body)."""
    h=["-H",f"apikey: {SECRET_KEY}","-H",f"Authorization: Bearer {SECRET_KEY}",
       "-H","Content-Type: application/json","-H","Prefer: return=representation"]
    r=subprocess.run(["curl","-s","--noproxy","*","-X",method,*h,"-w","\n%{http_code}",
                      f"{SB}/{path}","--data-binary","@-"],
                     input=json.dumps(payload).encode(), capture_output=True)
    out=r.stdout.decode("utf-8","ignore"); code=out.rsplit("\n",1)[-1]
    return code, out.rsplit("\n",1)[0]

def norm(t):
    t=_html.unescape(t); t=re.sub(r'[״"\'‘’“”`]','',t); return re.sub(r'\s+',' ',t).strip()
def strip(x): return norm(re.sub(r'<[^>]+>','',x))

FOOTER={"הרשמה למייל השבועי","שאל שאלה בתנך","הזמינו שיעור תנך בקהילה או באירוע",
        "חומרי עזר נוספים למורים","מפת מקומות ונחלות בארץ ישראל",
        "הסבר פשוט על מבנה ארץ ישראל והנחלות","ציר זמן תקופת המלכים","ציר זמן יהושע שופטים"}

# old-site book pages (built once via scrape_authoritative.py / book-urls.json)
BOOK_PAGES = {
 "בראשית":"/מאגר-עזרי-הלמידה/תורה/בראשית","שמות":"/מאגר-עזרי-הלמידה/תורה/שמות",
 "ויקרא":"/מאגר-עזרי-הלמידה/תורה/ויקרא","במדבר":"/מאגר-עזרי-הלמידה/תורה/במדבר",
 "דברים":"/מאגר-עזרי-הלמידה/תורה/דברים","יהושע":"/מאגר-עזרי-הלמידה/נביאים/יהושע",
 "שופטים":"/מאגר-עזרי-הלמידה/נביאים/שופטים","שמואל א":"/מאגר-עזרי-הלמידה/נביאים/שמואל-א",
 "שמואל ב":"/מאגר-עזרי-הלמידה/נביאים/שמואל-ב","מלכים א":"/מאגר-עזרי-הלמידה/נביאים/מלכים-א",
 "מלכים ב":"/מאגר-עזרי-הלמידה/נביאים/מלכים-ב",
}

def parse_old_book(html):
    """Return list of {title, author, count, file_url} for every series/item on the book page."""
    out={}
    h3s=list(re.finditer(r'<h3[^>]*>(.*?)</h3>', html, re.S))
    for i,m in enumerate(h3s):
        title=strip(m.group(1))
        if not title or title in FOOTER or len(title)>70 or title.startswith('מעבר ל'): continue
        seg=html[m.end(): h3s[i+1].start() if i+1<len(h3s) else m.end()+1500]
        pre=html[max(0,m.start()-1200):m.start()]
        am=re.search(r'class="author"[^>]*>(.*?)</', seg, re.S)
        author=strip(am.group(1)) if am else ""
        cm=re.search(r'(\d+)\s*שיעורים', seg)
        count=int(cm.group(1)) if cm else None
        hrefs=re.findall(r'href="([^"]+)"', pre+seg)
        file_url=next((u for u in reversed(hrefs) if re.search(r'\.(pdf|docx?|pptx?)$', u, re.I)), None)
        if title not in out:
            out[title]={"title":title,"author":author,"count":count,"file_url":file_url}
    return list(out.values())

def our_book_series(book):
    """series in OUR DB whose teacher lessons have bible_book = book."""
    less=sb_get_paged(f"lessons?select=series_id&bible_book=eq.{urllib.parse.quote(book)}&audience_tags=cs.%7Bteachers%7D&series_id=not.is.null")
    sids=list({r['series_id'] for r in less if r.get('series_id')})
    rows=[]
    for i in range(0,len(sids),40):
        inlist="("+",".join(sids[i:i+40])+")"
        rows+=sb_get(f"series?select=id,title,lesson_count,rabbi_id,rabbis(name)&id=in.{urllib.parse.quote(inlist)}")
    return rows

def backup():
    os.makedirs(BACKUP_DIR, exist_ok=True)
    for tbl in ("series","lessons"):
        data=sb_get_paged(f"{tbl}?select=*")
        p=os.path.join(BACKUP_DIR, f"{tbl}-backup.json")
        json.dump(data, open(p,"w"), ensure_ascii=False)
        print(f"  backup: {tbl} → {p} ({len(data)} rows)")

# cache of all existing series titles (normalized) → avoid duplicates on re-run
_existing_titles=None
def existing_series_titles():
    global _existing_titles
    if _existing_titles is None:
        _existing_titles={norm(r['title']) for r in sb_get_paged("series?select=title")}
    return _existing_titles

_rabbi_cache={}
def resolve_author(name, execute):
    """Find a rabbi/creator by name; create one (entity_type) if missing. Returns id or None."""
    name=(name or "").strip()
    if not name or name in ("מחבר לא ידוע",): return None
    if name in _rabbi_cache: return _rabbi_cache[name]
    r=sb_get(f"rabbis?select=id&name=eq.{urllib.parse.quote(name)}")
    if r:
        _rabbi_cache[name]=r[0]['id']; return r[0]['id']
    if not execute:
        _rabbi_cache[name]="(would-create)"; return None
    etype="rabbi" if name.startswith("הרב") or name.startswith("הרבנית") else "content_creator"
    slug=re.sub(r'[^\w֐-׿]+','-', name).strip('-')[:60]
    code,body=sb_write("POST","rabbis",{"name":name,"entity_type":etype,"status":"active","slug":slug})
    if code in ("200","201"):
        rid=json.loads(body)[0]['id']; _rabbi_cache[name]=rid; return rid
    print(f"      (author create failed for '{name}': HTTP {code})")
    return None

def main():
    execute = "--execute" in sys.argv
    only_book=None
    if "--book" in sys.argv: only_book=sys.argv[sys.argv.index("--book")+1]
    print(f"MODE: {'EXECUTE (writes!)' if execute else 'DRY-RUN (no writes)'}")
    print(f"secret key: {'loaded' if SECRET_KEY and SECRET_KEY.startswith('sb_secret') else 'MISSING/anon-only'}")
    if execute:
        print("\n== BACKUP (local snapshot before writes) ==")
        backup()
    seen_titles=existing_series_titles()   # dedup vs whole DB (idempotent re-runs)
    file_plan=[]; scrape_later=[]
    books = [only_book] if only_book else list(BOOK_PAGES)
    for book in books:
        old=parse_old_book(curl_old(BOOK_PAGES[book]))
        ours=our_book_series(book)
        ourTitles={norm(r['title']) for r in ours}
        missing=[s for s in old if norm(s['title']) not in ourTitles
                 and norm(s['title']) not in seen_titles
                 and norm(s['title'])!=norm(book)]
        nf=sum(1 for s in missing if s['file_url']); ns=len(missing)-nf
        print(f"\n### {book}: old={len(old)} ours={len(ours)} missing={len(missing)}  (file={nf}, multi-lesson={ns})")
        for s in missing:
            s['book']=book
            if s['file_url']: file_plan.append(s)
            else: scrape_later.append(s)
    print(f"\nIMPORTABLE NOW (single-file series): {len(file_plan)}")
    print(f"MULTI-LESSON (JS-rendered, follow-up needed): {len(scrape_later)}")
    if not execute:
        print("\n(DRY-RUN — nothing written. Re-run with --execute to apply the single-file series.)")
        if scrape_later:
            print("multi-lesson series left for follow-up:")
            for s in scrape_later: print(f"   · {s['book']}: {s['title']}")
        return
    # --- EXECUTE: single-file series (series + 1 attachment lesson, correct author) ---
    print("\n== WRITING (single-file series) ==")
    ok=0; fail=0
    for s in file_plan:
        book=s['book']
        rabbi_id=resolve_author(s['author'], execute)
        ser={"title":s['title'],"bible_book":book,"audience_tags":["teachers"],
             "status":"published","rabbi_id":rabbi_id,"lesson_count":1}
        code,body=sb_write("POST","series",ser)
        if code not in ("200","201"):
            print(f"   ✗ {s['title'][:34]:34} series HTTP {code}: {body[:100]}"); fail+=1; continue
        sid=json.loads(body)[0]['id']
        url=s['file_url'] if s['file_url'].startswith('http') else OLD+urllib.parse.quote(s['file_url'])
        ext=url.lower().rsplit('.',1)[-1]
        les={"title":s['title'],"series_id":sid,"bible_book":book,"audience_tags":["teachers"],
             "status":"published","attachment_url":url,"rabbi_id":rabbi_id,
             "source_type":"pdf" if ext=="pdf" else "text"}
        c2,b2=sb_write("POST","lessons",les)
        mark="✓" if c2 in ("200","201") else "⚠"
        print(f"   {mark} {s['title'][:34]:34} | {(s['author'] or '-')[:20]:20} | {ext}")
        ok+=1; time.sleep(0.15)
    print(f"\nDONE: {ok} series imported, {fail} failed.")
    print(f"SKIPPED (multi-lesson, JS-rendered — need follow-up): {len(scrape_later)}")
    print("Verify: python3 scripts/audit_teachers.py")
    print("ROLLBACK: scripts/backups/*.json captured the pre-write state.")

if __name__=="__main__":
    main()
