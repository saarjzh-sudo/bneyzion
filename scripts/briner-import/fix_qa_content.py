import os
#!/usr/bin/env python3
"""
Fill content for imported Briner lessons that came from otzar.org.il Q&A pages
(questionBlock/answerBlock layout, which scrape_otzar.py's lessonContent parser missed).

Idempotent: only touches rows WHERE content empty AND source site = otzar.org.il.
Checkpoint: qa_fixes.jsonl.
"""
import json, os, re, subprocess, time, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
TOKEN = os.environ["SUPABASE_ACCESS_TOKEN"]  # נקרא מ-env — סוד לעולם לא בקוד
API = "https://api.supabase.com/v1/projects/pzvmwfexeiruelwiujxn/database/query"
BASE = "https://www.otzar.org.il"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
QT = "$briner_qa$"


def sql(query):
    body = json.dumps({"query": query})
    r = subprocess.run(["curl", "-s", "-X", "POST", API,
                        "-H", f"Authorization: Bearer {TOKEN}",
                        "-H", "User-Agent: Mozilla/5.0",
                        "-H", "Content-Type: application/json",
                        "-d", body], capture_output=True, text=True)
    out = json.loads(r.stdout)
    if isinstance(out, dict) and out.get("message"):
        raise RuntimeError(str(out)[:500])
    return out


def fetch(path):
    url = BASE + urllib.parse.quote(path, safe="/?=&%")
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read().decode("utf-8", errors="replace")


def extract_qa(t):
    def block(cls):
        m = re.search(r'<div class="' + cls + r'[^"]*">(.*?)</div>\s*(?:<div class="(?:answerBlock|relatedK)|</div>\s*</div>)', t, re.S)
        return m.group(1).strip() if m else None
    q = block("questionBlock pt-4") or block("questionBlock")
    a = block("answerBlock")
    if not (q or a):
        return None
    parts = []
    if q:
        parts.append(q if "<h3>" in q else "<h3>שאלה</h3>\n" + q)
    if a:
        parts.append(a if "<h3>" in a else "<h3>תשובה</h3>\n" + a)
    return "\n".join(parts)


def main():
    rows = sql("SELECT id, title, additional_attachments->'source'->>'url' AS url FROM lessons "
               "WHERE additional_attachments->'source'->>'site'='otzar.org.il' "
               "AND (content IS NULL OR length(content)<50)")
    print(f"{len(rows)} lessons to fix")
    fixed = failed = 0
    for r in rows:
        try:
            t = fetch(r["url"])
            body = extract_qa(t)
            if not body or len(body) < 50:
                # fallback: grab everything inside printArea after players div
                m = re.search(r'<div class="players">.*?</div>\s*(.*?)<div class="relatedK', t, re.S)
                body = m.group(1).strip() if m else None
            status = "no_content"
            if body and len(body) >= 50:
                body = body.replace(QT, "")
                sql(f"UPDATE lessons SET content={QT}{body}{QT} WHERE id='{r['id']}' "
                    f"AND (content IS NULL OR length(content)<50)")
                fixed += 1
                status = "fixed"
            else:
                failed += 1
            with open(os.path.join(HERE, "qa_fixes.jsonl"), "a", encoding="utf-8") as f:
                f.write(json.dumps({"id": r["id"], "title": r["title"], "status": status,
                                    "len": len(body or "")}, ensure_ascii=False) + "\n")
        except Exception as e:
            failed += 1
            print("ERR", r["url"], e)
        time.sleep(0.7)
    print(f"fixed={fixed} failed={failed}")


if __name__ == "__main__":
    main()
