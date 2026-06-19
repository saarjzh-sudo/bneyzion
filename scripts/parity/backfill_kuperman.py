#!/usr/bin/env python3
"""backfill_kuperman.py — migrate the 19 missing PDF lessons of the קופרמן series
'קדושת פשוטו של מקרא - במדבר' (series 48adc2eb, currently 0 lessons) 1:1 from the old site.

Per lesson: download PDF from bneyzion.co.il/media → upload to Supabase Storage (Rule 13,
bucket lesson-attachments) → INSERT lesson row (status=published, rabbi=הרב יהודה קופרמן זצ"ל).
Then the public_book engine emits the series (already published, bible_book=במדבר).

  python3 backfill_kuperman.py            # dry: download+upload+print plan (no DB insert)
  python3 backfill_kuperman.py --apply    # also INSERT the 19 rows
Rollback: DELETE FROM lessons WHERE series_id='48adc2eb-8857-5cc6-b80f-1a88a4a40000';
"""
import os, sys, re, json, time, uuid, base64, html as H, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
APPLY = "--apply" in sys.argv
SERIES_ID = "48adc2eb-8857-5cc6-b80f-1a88a4a40000"
RABBI_ID  = "9135d874-b42b-4952-b7c6-97f0fb7fbfe6"   # הרב יהודה קופרמן זצ"ל
BOOK = "במדבר"; REF = "pzvmwfexeiruelwiujxn"
SERIES_URL = "https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/תורה/במדבר/קדושת-פשוטו-של-מקרא-במדבר/"

# ── load SERVICE_ROLE (JWT with role=service_role, ref=bneyzion) from api-keys.md, set env BEFORE import ──
def _b64(s): return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))
def load_service_role():
    paths = [os.path.expanduser("~/Downloads/saar-workspace/וואן-מן-שואו/סקילים/04-mcp-servers/api-keys.md")]
    for p in paths:
        if not os.path.exists(p): continue
        txt = open(p, encoding="utf-8").read()
        for tok in re.findall(r"eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+", txt):
            try:
                payload = json.loads(_b64(tok.split(".")[1]))
                if payload.get("role") == "service_role" and payload.get("ref") == REF:
                    return tok
            except Exception:
                continue
    return ""
sr = load_service_role()
if not sr:
    print("ERROR: bneyzion service_role JWT not found in api-keys.md"); sys.exit(1)
os.environ["SUPABASE_SERVICE_ROLE"] = sr
import sbq
os.environ["SUPABASE_MANAGEMENT_TOKEN"] = sbq.TOKEN
sys.path.insert(0, os.path.join(HERE, ".."))   # scripts/
import importlib.util
spec = importlib.util.spec_from_file_location("rehost", os.path.join(HERE, "..", "rehost_bneyzion_attachments.py"))
rehost = importlib.util.module_from_spec(spec); spec.loader.exec_module(rehost)

def q(s, _t=8):
    for i in range(_t):
        out = sbq.run(s)
        try:
            d = json.loads(out)
            if isinstance(d, dict) and d.get("message"): time.sleep(1.3*(i+1)); continue
            return d
        except Exception: time.sleep(1.3*(i+1))
    return None
def esc(s): return (s or "").replace("'", "''")

def main():
    # guard: never double-insert
    cur = q(f"SELECT COUNT(*) n FROM lessons WHERE series_id='{SERIES_ID}'")
    n = cur[0]["n"] if cur else -1
    print(f"series current lesson count: {n}")
    if n != 0:
        print(f"ABORT: series already has {n} lessons (expected 0). Not inserting."); return

    html = rehost.download_file(SERIES_URL)
    html = html.decode("utf-8", "replace") if isinstance(html, bytes) else (html or "")
    pairs = re.findall(r'<a download[^>]*href="(/media/[^"]+\.pdf)"[^>]*title="להורדת קובץ מצורף - ([^"]+)"', html)
    # de-dup preserving order
    seen, ordered = set(), []
    for u, t in pairs:
        if u in seen: continue
        seen.add(u); ordered.append((u, H.unescape(t).strip()))
    print(f"PDF lessons found on old series page: {len(ordered)}")

    rows = []
    for i, (rel, title) in enumerate(ordered):
        url = "https://www.bneyzion.co.il" + rel
        content = rehost.download_file(url)
        mime = rehost.get_mime(url)
        ok_pdf = rehost.is_real_pdf(content, mime) if content else False
        if not content or not ok_pdf:
            print(f"  [{i+1}/{len(ordered)}] {title[:34]:34} DOWNLOAD/VALIDATE FAIL ({len(content or b'')}b)");
            return print("ABORT: a PDF failed to download/validate — fix before applying.")
        lid = str(uuid.uuid4())
        skey = rehost.safe_storage_key(url, lid)
        new_url = rehost.upload_to_storage(skey, content, mime)
        if not new_url:
            return print(f"ABORT: upload failed for {title}")
        rows.append({"id": lid, "title": title, "sort": i, "url": new_url})
        print(f"  [{i+1}/{len(ordered)}] {title[:34]:34} → {new_url.split('/')[-1][:40]}")

    print(f"\nprepared {len(rows)} lessons.")
    if not APPLY:
        print("DRY (no DB insert). Re-run with --apply to insert."); return

    vals = ",".join(
        f"('{r['id']}'::uuid,'{esc(r['title'])}','{RABBI_ID}'::uuid,'{SERIES_ID}'::uuid,"
        f"'{esc(r['url'])}','text','published',{r['sort']},'{BOOK}',ARRAY['general']::text[],0)"
        for r in rows)
    sql = ("INSERT INTO lessons (id,title,rabbi_id,series_id,attachment_url,source_type,status,"
           "sort_order,bible_book,audience_tags,views_count) VALUES " + vals + ";")
    q(sql)
    chk = q(f"SELECT COUNT(*) n FROM lessons WHERE series_id='{SERIES_ID}' AND status='published'")
    print(f"INSERTED. series published lesson count now: {chk[0]['n'] if chk else '?'}")

if __name__ == "__main__":
    main()
