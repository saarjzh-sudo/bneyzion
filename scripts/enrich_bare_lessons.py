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
תפקידך: לבחור אילו קטעים ראויים להדגשה. אתה לא כותב ולא משנה טקסט — רק בוחר.

החזר JSON בלבד במבנה:
{"strong": ["ביטוי מדויק מהמאמר", ...], "em": ["פסוק או ציטוט מדויק מהמאמר", ...]}

חוקים:
1. כל ביטוי חייב להיות העתק מדויק, אות-באות כולל ניקוד וסימני פיסוק, של קטע רציף מהמאמר.
2. strong = 3-10 ביטויי-מפתח ורעיונות מרכזיים, קצרים (2-10 מילים).
3. em = פסוקים וציטוטים (אם יש), כפי שהם מופיעים במאמר, בלי המירכאות העוטפות.
4. אל תבחר קטע שכבר נמצא בתוך תגית HTML.
5. JSON בלבד — בלי הסברים."""

# עיטוף דטרמיניסטי: המודל רק בוחר ביטויים; פייתון עוטף אותם במקור —
# הטקסט פיזית לא יכול להשתנות. (הגרסה הקודמת ביקשה מהמודל HTML מלא —
# 48% נפסלו על שכתוב/תגיות-מקור; ראה checkpoint מהפיילוט.)

def pick_highlights(content: str) -> dict:
    body = {
        "systemInstruction": {"parts": [{"text": SYSTEM}]},
        "contents": [{"role": "user", "parts": [{"text": content}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 2048,
            "responseMimeType": "application/json",
            "thinkingConfig": {"thinkingBudget": 0},
        },
    }
    req = urllib.request.Request(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "X-goog-api-key": GEMINI_KEY},
        method="POST",
    )
    with _OPENER.open(req, timeout=120) as r:
        resp = json.load(r)
    out = resp["candidates"][0]["content"]["parts"][0]["text"].strip()
    return json.loads(out)


def apply_highlights(content: str, picks: dict) -> tuple[str, int, int]:
    """עוטף ביטויים נבחרים בתוך מקטעי-הטקסט בלבד (לא בתוך תגיות קיימות)."""
    # פיצול לתגיות/טקסט — עוטפים רק בתוך טקסט
    parts = re.split(r"(<[^>]+>)", content)
    n_strong = n_em = 0

    def wrap_in_text(span: str, tag: str) -> bool:
        nonlocal parts
        for i, seg in enumerate(parts):
            if seg.startswith("<"):
                continue
            idx = seg.find(span)
            if idx >= 0:
                parts[i] = seg[:idx] + f"<{tag}>" + span + f"</{tag}>" + seg[idx + len(span):]
                return True
        return False

    # הארוכים קודם — מונע עיטוף-חלקי של ביטוי שמוכל באחר
    for span in sorted(set(picks.get("em") or []), key=len, reverse=True):
        if isinstance(span, str) and 3 <= len(span) <= 400 and wrap_in_text(span, "em"):
            n_em += 1
    for span in sorted(set(picks.get("strong") or []), key=len, reverse=True):
        if isinstance(span, str) and 3 <= len(span) <= 120 and wrap_in_text(span, "strong"):
            n_strong += 1
    return "".join(parts), n_strong, n_em


def report(rec):
    with _LOCK:
        REPORT.parent.mkdir(parents=True, exist_ok=True)
        with open(REPORT, "a") as f:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")


def process(lesson, stats):
    lid, title, content = lesson["id"], lesson["title"], lesson["content"]
    try:
        picks = pick_highlights(content)
        enriched, n_strong, n_em = apply_highlights(content, picks)
        # שער 1: יש העשרה בפועל
        if n_strong + n_em == 0:
            raise ValueError("no spans matched verbatim")
        # שער 2 (רשת-ביטחון): הטקסט-ללא-תגיות זהה — חייב להתקיים בבנייה
        if strip_to_text(enriched) != strip_to_text(content):
            raise ValueError("text changed (bug!)")
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
