#!/usr/bin/env python3
"""
ייבוא הטקסטים הנלווים לקורס "איך לומדים תנ"ך" מהמסמך של הרב יואב (20.7.2026)

מקור: Google Doc 1_rSVbuHYVWBTYSqA-S1QAuOvhCNNYccHOuqSk3gmWoM (ייצוא text/plain)
לכל שיעור: 'כותרת פרומו' + 'משפט מוביל' → description (מוצג מתחת לכותרת בדף הקורס),
'סיכום — מה למדנו' → content_html (מרונדר ליד הסרטון, עריך באדמין).
המילים "כותרת פרומו"/"משפט מוביל" לא נכנסות; הכותרת "סיכום — מה למדנו" כן (הוראת יואב).

בנוסף — תיקון נזק מעריכה שנכשלה (20.7): שורת שיעור 1 ("הקדמה לקורס") נדרסה
והפכה לעותק של שיעור 3. משוחזרת מנתוני scripts/import-how-to-learn-course.py.

שימוש: python3 scripts/import-how-to-learn-texts.py <path-to-doc.txt> [--apply]
אידמפוטנטי: snapshot נוצר פעם אחת; עדכונים לפי lesson_number.
"""
import json, re, sys, html, pathlib, urllib.request

REF = "pzvmwfexeiruelwiujxn"
COURSE_ID = "78499931-fccb-44f5-8efd-f52f608184a2"
SNAPSHOT = "community_course_lessons_bak_20260720"

# שחזור שיעור 1 (נדרס 20.7): הערכים מסקריפט-הייבוא המקורי
LESSON1_ROW_ID = "7b330c2a-8bab-4f00-97dd-e3dc5760031f"  # השורה שהפכה לעותק של #3
LESSON1 = {
    "lesson_number": 1,
    "title": "הקדמה לקורס",
    "section_title": "פרק 1 — איך לפגוש את הפסוקים",
    "video_url": "https://drive.google.com/file/d/1ePyCJNtB4u6nB89P4d9eMDo8UPUE1vln/preview",
}


def load_key():
    import os
    if os.environ.get("SUPABASE_SERVICE_ROLE_BNEYZION"):
        return os.environ["SUPABASE_SERVICE_ROLE_BNEYZION"]
    txt = (pathlib.Path.home() / "Downloads/saar-workspace/וואן-מן-שואו/סקילים/04-mcp-servers/api-keys.md").read_text()
    return re.search(r"SUPABASE_SERVICE_ROLE_BNEYZION=(\S+)", txt).group(1)


def rest(key, method, path, body=None, prefer="return=representation"):
    req = urllib.request.Request(
        f"https://{REF}.supabase.co/rest/v1/{path}",
        data=json.dumps(body).encode() if body is not None else None, method=method,
        headers={"apikey": key, "Authorization": f"Bearer {key}",
                 "Content-Type": "application/json", "Prefer": prefer})
    with urllib.request.urlopen(req, timeout=90) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def parse_doc(text: str):
    """מפרק את ייצוא-הטקסט של המסמך ל-24 רשומות: num → {promo, lead, summary_lines}."""
    lines = [l.rstrip() for l in text.replace("﻿", "").replace("‏", "").split("\n")]
    lessons = {}
    cur, mode = None, None
    for line in lines:
        s = line.strip()
        m = re.match(r"^(\d+)\.\s+(.+)$", s)
        if m and 1 <= int(m.group(1)) <= 24:
            cur = int(m.group(1))
            lessons[cur] = {"doc_title": m.group(2).strip(), "promo": "", "lead": "", "summary": []}
            mode = None
            continue
        if cur is None:
            continue
        if s.startswith("כותרת פרומו:"):
            lessons[cur]["promo"] = s.split(":", 1)[1].strip()
            mode = "promo"
            continue
        if s.startswith("משפט מוביל:"):
            lessons[cur]["lead"] = s.split(":", 1)[1].strip()
            mode = "lead"
            continue
        if re.match(r"^סיכום\s*[—-]\s*מה למדנו", s):
            mode = "summary"
            continue
        # כותרות-מקטע (מבוא / פרק N / סיכום) בין שיעורים — לא חלק מהתוכן
        if re.match(r"^(מבוא|סיכום|פרק \d+[:.].*)$", s) and mode != "summary":
            continue
        if mode == "lead" and s:
            lessons[cur]["lead"] = (lessons[cur]["lead"] + " " + s).strip()
        elif mode == "promo" and s:
            lessons[cur]["promo"] = (lessons[cur]["promo"] + " " + s).strip()
        elif mode == "summary":
            lessons[cur]["summary"].append(s)
    # שיעור 9 במסמך: "כותרת פרומו: החתירה לשאלת המצפן..." — הכותרת ממשיכה אחרי נקודתיים
    return lessons


def summary_to_html(summary_lines):
    """פסקאות + בולטים → HTML נקי. כולל הכותרת 'סיכום — מה למדנו' (הוראת יואב)."""
    out = ['<h3>סיכום — מה למדנו</h3>']
    para, bullets = [], []

    def flush_para():
        nonlocal para
        if para:
            out.append("<p>" + html.escape(" ".join(para)) + "</p>")
            para = []

    def flush_bullets():
        nonlocal bullets
        if bullets:
            out.append("<ul>" + "".join("<li>" + html.escape(b) + "</li>" for b in bullets) + "</ul>")
            bullets = []

    for raw in summary_lines:
        s = raw.strip()
        if not s:
            flush_para(); flush_bullets()
            continue
        m = re.match(r"^[•·\-–]\s+(.+)$", s)
        if m:
            flush_para()
            bullets.append(m.group(1).strip())
        else:
            flush_bullets()
            para.append(s)
    flush_para(); flush_bullets()
    return "".join(out)


def mgmt_sql(sql: str):
    """SQL דרך Management API (ל-snapshot בלבד). הטוקן מ-api-keys.md."""
    txt = (pathlib.Path.home() / "Downloads/saar-workspace/וואן-מן-שואו/סקילים/04-mcp-servers/api-keys.md").read_text()
    tok = re.search(r"SUPABASE_ACCESS_TOKEN=(\S+)", txt).group(1)
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{REF}/database/query",
        data=json.dumps({"query": sql}).encode(), method="POST",
        headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json",
                 # Cloudflare חוסם UA של python-urllib מול api.supabase.com
                 "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read() or b"null")


def main():
    if len(sys.argv) < 2:
        sys.exit("usage: import-how-to-learn-texts.py <doc.txt> [--apply]")
    apply = "--apply" in sys.argv
    doc = pathlib.Path(sys.argv[1]).read_text()
    lessons = parse_doc(doc)
    missing = [n for n in range(1, 25) if n not in lessons or not lessons[n]["promo"] or not lessons[n]["summary"]]
    if missing:
        sys.exit(f"parse incomplete — missing/empty lessons: {missing}")
    print(f"parsed 24 lessons OK (promo+lead+summary)")

    key = load_key()
    rows = rest(key, "GET",
                f"community_course_lessons?course_id=eq.{COURSE_ID}&select=id,lesson_number,title")
    by_num = {}
    for r in rows:
        by_num.setdefault(r["lesson_number"], []).append(r)

    if not apply:
        for n in sorted(lessons):
            l = lessons[n]
            print(f"[{n:2}] {l['doc_title'][:30]:32} promo={len(l['promo'])}ch lead={len(l['lead'])}ch summary={len(l['summary'])} lines")
        print("\n(dry-run — הרץ עם --apply לביצוע)")
        return

    # 1. snapshot (idempotent)
    res = mgmt_sql(f"CREATE TABLE IF NOT EXISTS {SNAPSHOT} AS TABLE community_course_lessons;")
    print("snapshot:", res if res else "ok")

    # 2. restore lesson 1 row (the duplicated-#3 row becomes #1 again)
    dup3 = [r for r in by_num.get(3, []) if r["id"] == LESSON1_ROW_ID]
    if dup3:
        rest(key, "PATCH", f"community_course_lessons?id=eq.{LESSON1_ROW_ID}", LESSON1)
        print("restored lesson 1 (הקדמה לקורס) from duplicated row")
    elif 1 in by_num:
        print("lesson 1 already present — restore skipped")
    else:
        sys.exit("cannot restore lesson 1: expected row not found")

    # 3. texts for all 24 (by lesson_number, unique after restore)
    for n in sorted(lessons):
        l = lessons[n]
        desc = f"{l['promo']}\n{l['lead']}".strip()
        body = summary_to_html(l["summary"])
        rest(key, "PATCH",
             f"community_course_lessons?course_id=eq.{COURSE_ID}&lesson_number=eq.{n}",
             {"description": desc, "content_html": body})
    print("texts written for 24 lessons")

    # 4. verify
    check = rest(key, "GET",
                 f"community_course_lessons?course_id=eq.{COURSE_ID}&select=lesson_number,title,description,content_html&order=lesson_number")
    nums = [r["lesson_number"] for r in check]
    bad = [r["lesson_number"] for r in check
           if not r["description"] or "סיכום — מה למדנו" not in (r["content_html"] or "")
           or "ZZZ_TEST" in (r["description"] or "") or "DESCMARKER" in (r["description"] or "")]
    assert nums == list(range(1, 25)), f"lesson numbers wrong: {nums}"
    assert not bad, f"rows failed verification: {bad}"
    print(f"VERIFIED: 24 rows, numbers 1-24, all with promo+summary, no test junk")


if __name__ == "__main__":
    main()
