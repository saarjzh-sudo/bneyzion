#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
בונה את טבלת `shut_archive` — ארכיון השו"ת של בני ציון לתצוגה בדף /ask-rabbi.

הבעיה שנפתרת: באתר הישן השאלה הופיעה בכותרת/תת-כותרת והתשובה בגוף. במיגרציה
רק התשובה (lessons.content) עברה — טקסט השאלה המלא לא. הסקריפט גורד את טקסט
השאלה המלא לכל 206 פריטי mediaType=שות מדף החיפוש של האתר הישן (בלוקי
`questionBlock` → `qaQuestion`), מצלב לפי כותרת מנורמלת עם התשובות ב-DB, ובונה
טבלה עצמאית לקריאה ציבורית — כך שהפופאפ בדף מציג שאלה+תשובה בלי לנווט למקור.

אידמפוטנטי: יוצר/מנקה את הטבלה ומאכלס מחדש בכל ריצה. הרצה חוזרת = אותה תוצאה.
מקור-אמת לשאלות = האתר הישן החי; מקור-אמת לתשובות = lessons.content ב-DB.
"""
import base64, html, json, re, subprocess, sys, urllib.parse, os

PROJECT = "pzvmwfexeiruelwiujxn"
# הטוקן לעולם לא בקוד — נקרא מ-env (api-keys.md → SUPABASE_ACCESS_TOKEN, sbp_...).
PAT = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
if not PAT:
    print("חסר SUPABASE_ACCESS_TOKEN ב-env (ראה api-keys.md)"); sys.exit(1)
OLD_SEARCH = ("https://www.bneyzion.co.il/מאגר-השיעורים-והמאמרים/חיפוש"
              "?search=&rav=&mediaType=שות&book=")

def curl(args):
    return subprocess.run(["curl", "-s", "--max-time", "60"] + args,
                          capture_output=True, text=True).stdout

def sql(query):
    body = json.dumps({"query": query})
    out = curl(["-X", "POST",
                f"https://api.supabase.com/v1/projects/{PROJECT}/database/query",
                "-H", f"Authorization: Bearer {PAT}",
                "-H", "Content-Type: application/json", "-d", body])
    try:
        res = json.loads(out)
    except Exception:
        print("SQL PARSE ERROR:", out[:400]); sys.exit(1)
    if isinstance(res, dict) and res.get("message"):
        print("SQL ERROR:", str(res)[:400]); sys.exit(1)
    return res

def q_lit(s):
    return "$$" + (s or "").replace("$$", "$ $") + "$$"

def norm(s):
    s = html.unescape(s or "")
    s = re.sub(r'["‘’“”׳״\',.\-–—]', "", s)
    s = re.sub(r"\s+", " ", s)
    return s.strip().lower()

# ── 1. גרידת השאלות מהאתר הישן ────────────────────────────────────────────────
print("→ גורד את דף החיפוש (mediaType=שות)...")
enc = urllib.parse.quote(OLD_SEARCH, safe=":/?=&")
page = curl([enc])
blocks = re.findall(r'<div class="questionBlock">(.*?)</div>\s*</div>', page, re.S)
print(f"  נמצאו {len(blocks)} בלוקי שאלה")
if len(blocks) < 150:
    print("  ⚠️ פחות מדי בלוקים — עצירה למניעת נזק."); sys.exit(1)

scraped = {}  # norm(title) -> {title, question, url}
for b in blocks:
    m_title = re.search(r'qaName".*?title="([^"]*)"', b, re.S)
    m_q = re.search(r'qaQuestion".*?>\s*<a[^>]*>(.*?)</a>', b, re.S)
    m_url = re.search(r'href="([^"]*)"', b)
    if not (m_title and m_q):
        continue
    title = html.unescape(m_title.group(1)).strip()
    question = html.unescape(re.sub(r"<[^>]+>", "", m_q.group(1))).strip()
    url = "https://www.bneyzion.co.il" + m_url.group(1) if m_url else None
    if title and question:
        scraped.setdefault(norm(title), {"title": title, "question": question, "url": url})
print(f"  {len(scraped)} שאלות ייחודיות עם טקסט מלא")

# ── 2. שליפת התשובות מ-DB (lessons) ──────────────────────────────────────────
print("→ שולף תשובות מ-DB...")
rows = sql("""
  select id, title, content,
         (select r.name from rabbis r where r.id = l.rabbi_id) as rabbi
  from lessons l
  where content_type in ('שו"ת','שאלות ותשובות')
    and status='published'
    and coalesce(content,'') <> ''
  order by title
""")
answers = {}  # norm(title) -> {id, content, rabbi}
for r in rows:
    k = norm(r["title"])
    answers.setdefault(k, r)  # first (with content) wins
print(f"  {len(answers)} תשובות עם content ב-DB")

# ── 3. צילוב ובניית הרשומות ───────────────────────────────────────────────────
records, matched, unmatched = [], 0, 0
for k, s in scraped.items():
    a = answers.get(k)
    if a:
        matched += 1
        # שם הרב: מה-content (span author) עדיף, אחרת מטבלת rabbis
        m_auth = re.search(r'author"[^>]*>(.*?)</span>', a["content"] or "")
        rabbi = (html.unescape(m_auth.group(1)).strip() if m_auth else None) or a["rabbi"]
        records.append({
            "lesson_id": a["id"], "title": s["title"], "question": s["question"],
            "answer_html": a["content"], "rabbi": rabbi, "source_url": s["url"],
        })
    else:
        unmatched += 1
print(f"  צולבו מול DB: {matched} · ללא התאמה: {unmatched}")

# ── 3ב. מעבר שחזור: גרידת התשובה ישירות מדף המקור לפריטים שלא צולבו ────────────
recovered = 0
for k, s in scraped.items():
    if norm(s["title"]) in answers or not s.get("url"):
        continue
    pg = curl(["-L", urllib.parse.quote(s["url"], safe=":/")])
    m = re.search(r'<div id="lessonText">(.*?)</div>\s*(?:<div|<hr|<footer|</article)', pg, re.S)
    if not m:
        m = re.search(r'<div id="lessonText">(.*?)</div>', pg, re.S)
    if not m:
        continue
    ans = m.group(1).strip()
    if "תשוב" not in ans and len(ans) < 40:
        continue
    m_auth = re.search(r'author"[^>]*>(.*?)</span>', ans)
    rabbi = html.unescape(m_auth.group(1)).strip() if m_auth else None
    records.append({
        "lesson_id": None, "title": s["title"], "question": s["question"],
        "answer_html": ans, "rabbi": rabbi, "source_url": s["url"],
    })
    recovered += 1
print(f"  שוחזרו מהאתר הישן: {recovered}")

total_ok = matched + recovered
print(f"  סה\"כ עם תשובה: {total_ok}/{len(scraped)}")
if total_ok < 150:
    print("  ⚠️ שיעור כיסוי נמוך מדי — עצירה."); sys.exit(1)

# ── 4. יצירת הטבלה + RLS (אידמפוטנטי) ─────────────────────────────────────────
print("→ בונה טבלה + RLS...")
sql("""
create table if not exists public.shut_archive (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid references public.lessons(id) on delete set null,
  title       text not null,
  question    text not null,
  answer_html text not null,
  rabbi       text,
  source_url  text,
  sort_order  int default 0,
  created_at  timestamptz default now()
);
alter table public.shut_archive enable row level security;
drop policy if exists shut_archive_public_read on public.shut_archive;
create policy shut_archive_public_read on public.shut_archive for select using (true);
truncate public.shut_archive;
""")

# ── 5. אכלוס (batch) ──────────────────────────────────────────────────────────
print("→ מאכלס...")
for i, rec in enumerate(records):
    rec["sort_order"] = i
vals = []
for r in records:
    lid = q_lit(r["lesson_id"]) if r["lesson_id"] else "null"
    rabbi = q_lit(r["rabbi"]) if r["rabbi"] else "null"
    url = q_lit(r["source_url"]) if r["source_url"] else "null"
    vals.append("(" + ",".join([
        lid, q_lit(r["title"]), q_lit(r["question"]),
        q_lit(r["answer_html"]), rabbi, url, str(r["sort_order"]),
    ]) + ")")
# הכנסה באצוות קטנות (תשובות שלמות = HTML כבד; אצווה גדולה חורגת מגודל השאילתה)
BATCH = 10
for j in range(0, len(vals), BATCH):
    chunk = vals[j:j+BATCH]
    sql("insert into public.shut_archive "
        "(lesson_id,title,question,answer_html,rabbi,source_url,sort_order) values "
        + ",".join(chunk))
    print(f"  {min(j+BATCH,len(vals))}/{len(vals)}")

# ── 6. אימות ──────────────────────────────────────────────────────────────────
cnt = sql("select count(*) as c from public.shut_archive")[0]["c"]
print(f"✅ shut_archive מכיל {cnt} רשומות (צפוי {len(records)})")
sample = sql("select title, left(question,60) q from public.shut_archive order by sort_order limit 3")
for s in sample:
    print("   ·", s["title"], "→", s["q"])
