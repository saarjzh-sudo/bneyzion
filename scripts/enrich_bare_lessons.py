#!/usr/bin/env python3
"""
enrich_bare_lessons.py — העשרת-הדגשות ל-858 השיעורים החלקים (הוראת סער 10.7.2026).

הרקע: אודיט 7.7 (bare-content-audit-20260707.json) הוכיח שהמאמרים ה"חלקים"
(פורסם, >400 תווים, אפס h1-6/strong/b) היו שטוחים גם באתר הישן — לא אובדן
מיגרציה. ההעשרה = עיצוב מבני בלבד: כותרות-משנה <h3>, הדגשות <strong>, <em>.

חוזה fail-closed — אף מילה לא משתנה:
  המודל רשאי אך ורק לעטוף טקסט קיים בתגיות. האימות משווה את הטקסט-ללא-תגיות
  (מנורמל-רווחים) בין קלט לפלט; כל סטייה ⇒ השיעור מדולג ונשאר כמו שהיה.

אידמפוטנטי: הקריטריון עצמו (אין h/strong בתוכן) בורר מועמדים — שיעור שהועשר
לא נבחר שוב. checkpoint-JSONL נכתב לריפו אחרי כל שיעור (חוצה-סשן).

snapshot: lessons_content_bak_enrich_20260710 (858 שורות) נוצר לפני הריצה.
שחזור: update lessons l set content=b.content from lessons_content_bak_enrich_20260710 b where b.id=l.id;

env: BZ_SUPABASE_URL, BZ_SERVICE_ROLE_KEY (מ-~/.config/bneyzion/sync.env), GEMINI_API_KEY.
שימוש: python3 scripts/enrich_bare_lessons.py [--limit N] [--workers 4]
"""
import argparse
import html
import json
import os
import re
import sys
import threading
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

SB_URL = os.environ.get("BZ_SUPABASE_URL", "").rstrip("/")
SB_KEY = os.environ.get("BZ_SERVICE_ROLE_KEY", "")
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
if not SB_URL or not SB_KEY or not GEMINI_KEY:
    sys.exit("חסרים env vars: BZ_SUPABASE_URL / BZ_SERVICE_ROLE_KEY / GEMINI_API_KEY")

REPORT = Path(__file__).parent / "parity" / "reports" / "enrich-run-20260710.jsonl"
_OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}))
_LOCK = threading.Lock()

BARE_RE = re.compile(r"<(h[1-6]|strong|b)[ >]", re.I)
# בלי h3! בפיילוט המודל המציא כותרת שלא קיימת במקור ("המרבה והממעיט – סתירה או
# נס?") — הפרה של חוק אי-ההמצאה. העשרת-הדגשות = strong/em על טקסט קיים בלבד.
ALLOWED_TAGS_RE = re.compile(r"^(strong|/strong|em|/em|p|/p|br\s*/?)$", re.I)


def log(msg):
    print(f"[{datetime.now():%H:%M:%S}] {msg}", flush=True)


def http(url, method="GET", body=None, headers=None, timeout=120):
    req = urllib.request.Request(url, method=method)
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    data = body if isinstance(body, (bytes, type(None))) else json.dumps(body).encode()
    if data is not None and "Content-Type" not in (headers or {}):
        req.add_header("Content-Type", "application/json")
    with _OPENER.open(req, data, timeout=timeout) as r:
        out = r.read()
    return json.loads(out) if out else None


def sb(path, method="GET", body=None, prefer=None):
    h = {"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}", "Content-Type": "application/json"}
    if prefer:
        h["Prefer"] = prefer
    return http(f"{SB_URL}/rest/v1/{path}", method, body, h)


# ─── האימות: טקסט-ללא-תגיות חייב להיות זהה ─────────────────────────────────────

def strip_to_text(html_src: str) -> str:
    t = re.sub(r"<[^>]+>", " ", html_src)
    t = html.unescape(t)
    t = t.replace(" ", " ").replace("‏", "").replace("‎", "")
    return re.sub(r"\s+", "", t)  # השוואה בלי רווחים בכלל — פיצול פסקאות מותר


def only_allowed_tags(html_src: str) -> bool:
    for m in re.finditer(r"<\s*([^ >]+)[^>]*>", html_src):
        if not ALLOWED_TAGS_RE.match(m.group(1).strip()):
            return False
    return True


# ─── Gemini ──────────────────────────────────────────────────────────────────

SYSTEM = """אתה עורך-עיצוב של מאמרי תורה באתר "בני ציון". תקבל גוף-מאמר בעברית, שטוח (בלי הדגשות).
תפקידך: העשרת-הדגשות בלבד — עיטוף קטעי טקסט קיימים בתגיות.

חוקים מוחלטים:
1. אסור לשנות, להוסיף, למחוק או לנסח מחדש אף מילה. כל תו בטקסט נשאר בדיוק כפי שהוא — אתה רק עוטף.
2. מותר אך ורק: לעטוף פסוקים וציטוטים ב-<em>, ולעטוף ביטויי-מפתח ורעיונות מרכזיים ב-<strong>.
3. אין להשתמש בשום תגית אחרת ואין להוסיף שום טקסט חדש — בלי כותרות, בלי class, בלי style.
4. במידה: 3-10 הדגשות <strong> למאמר, קצרות (עד ~8 מילים כל אחת). פסוקים מודגשים ב-<em> לפי הצורך.
5. החזר את ה-HTML בלבד — בלי הסברים, בלי גדרות-קוד."""


def enrich_one(content: str) -> str | None:
    body = {
        "systemInstruction": {"parts": [{"text": SYSTEM}]},
        "contents": [{"role": "user", "parts": [{"text": content}]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 16384},
    }
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "X-goog-api-key": GEMINI_KEY},
        method="POST",
    )
    with _OPENER.open(req, timeout=180) as r:
        resp = json.load(r)
    out = resp["candidates"][0]["content"]["parts"][0]["text"].strip()
    out = re.sub(r"^```(?:html)?\s*|\s*```$", "", out).strip()
    return out or None


def report(rec):
    with _LOCK:
        REPORT.parent.mkdir(parents=True, exist_ok=True)
        with open(REPORT, "a") as f:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")


def process(lesson, stats):
    lid, title, content = lesson["id"], lesson["title"], lesson["content"]
    try:
        enriched = enrich_one(content)
        if not enriched:
            raise ValueError("empty model output")
        # שער 1: רק תגיות מותרות
        if not only_allowed_tags(enriched):
            raise ValueError("disallowed tags")
        # שער 2: הטקסט זהה אות-באות (בלי רווחים)
        if strip_to_text(enriched) != strip_to_text(content):
            raise ValueError("text changed")
        # שער 3: יש העשרה בפועל ובמידה
        n_strong = len(re.findall(r"<strong[ >]", enriched, re.I))
        n_em = len(re.findall(r"<em[ >]", enriched, re.I))
        if n_strong + n_em == 0:
            raise ValueError("no enrichment produced")
        if n_strong > 25:
            raise ValueError(f"too many highlights ({n_strong})")
        sb(f"lessons?id=eq.{lid}&select=id", "PATCH", {"content": enriched},
           prefer="return=minimal")
        with _LOCK:
            stats["ok"] += 1
        report({"id": lid, "title": title[:60], "status": "ok", "strong": n_strong, "em": n_em})
        return True
    except Exception as e:
        with _LOCK:
            stats["fail"] += 1
        report({"id": lid, "title": title[:60], "status": "skip", "reason": str(e)[:150]})
        return False


def fetch_candidates(limit=None):
    out, page = [], 0
    while True:
        rows = sb(
            "lessons?select=id,title,content&status=eq.published"
            "&content=not.is.null"
            f"&order=id.asc&offset={page * 500}&limit=500"
        )
        if not rows:
            break
        for r in rows:
            c = r.get("content") or ""
            if len(c) > 400 and not BARE_RE.search(c):
                out.append(r)
                if limit and len(out) >= limit:
                    return out
        if len(rows) < 500:
            break
        page += 1
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--workers", type=int, default=4)
    args = ap.parse_args()

    # דלג על מה שכבר עובד/נכשל בריצות קודמות (checkpoint)
    done = set()
    if REPORT.exists():
        for line in open(REPORT):
            try:
                done.add(json.loads(line)["id"])
            except Exception:
                pass

    candidates = [c for c in fetch_candidates(args.limit) if c["id"] not in done]
    if args.limit:
        candidates = candidates[: args.limit]
    log(f"מועמדים לריצה זו: {len(candidates)} (checkpoint קיים: {len(done)})")

    stats = {"ok": 0, "fail": 0}
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        list(ex.map(lambda l: process(l, stats), candidates))

    log(f"סיכום: הועשרו {stats['ok']} · דולגו {stats['fail']} · דוח: {REPORT}")


if __name__ == "__main__":
    main()
