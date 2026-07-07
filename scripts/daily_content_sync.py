#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
daily_content_sync.py — סנכרון התוכן היומי של בני ציון מוואטסאפ לאתר (7.7.2026).

הרקע (סער + הרב יואב): שלוש פינות יומיות נשלחות לקבוצות "בכוח התנ״ך ננצח" —
הפסוק היומי, חדשות תנ"כיות, ופודקאסט "ילדי התנ״ך" (שלישי). הארכיון באתר פוגר
(daily_verses נעצר ב-31.5). הסקריפט קורא את הקבוצה ומשלים את האתר, אידמפוטנטי:

  1. פסוק יומי   → upsert ל-daily_verses לפי תאריך (verse_text/מקור/פירוש/תמונה).
  2. חדשות תנ"כיות → שיעור published בסדרה 5d111b52 (dedup לפי כותרת-פנימית).
  3. פודקאסט mp3 → העלאה ל-Storage + שיעור **draft** בסדרה bc1d97b9 —
     בכוונה טיוטה: כותרת-פרק אמיתית דורשת עריכה אנושית (אין ניחוש תוכן-לקוח).

מפתחות מ-env בלבד (אין סודות בקוד): GREEN_API_ID_INSTANCE, GREEN_API_TOKEN,
BZ_SUPABASE_URL, BZ_SERVICE_ROLE_KEY. עטיפה: ~/.config/bneyzion/sync.env.
הרצה: python3 daily_content_sync.py [--dry-run] [--count N]
שלב ב' מתוכנן: קריאת מסמך-הדרייב של הפסוק היומי (יואב+דניאל) כמקור משלים.
"""
import json
import os
import re
import sys
import time
import datetime
import urllib.request
import urllib.error
import urllib.parse

DRY = "--dry-run" in sys.argv
COUNT = 100
for i, a in enumerate(sys.argv):
    if a == "--count" and i + 1 < len(sys.argv):
        COUNT = int(sys.argv[i + 1])

GROUP = "120363149928936992@g.us"  # בכוח התנ״ך ננצח #3 (הקבוצה הראשית — התוכן זהה בכולן)
NEWS_SERIES = "5d111b52-b421-4150-adfd-df256950117c"
POD_SERIES = "bc1d97b9-e0a5-4b88-8169-5705120bc20c"
YOAV = "acd34d0f-1288-47b8-9e8e-38e69599c294"

GA_ID = os.environ.get("GREEN_API_ID_INSTANCE", "")
GA_TOKEN = os.environ.get("GREEN_API_TOKEN", "")
SB_URL = os.environ.get("BZ_SUPABASE_URL", "").rstrip("/")
SB_KEY = os.environ.get("BZ_SERVICE_ROLE_KEY", "")
if not all([GA_ID, GA_TOKEN, SB_URL, SB_KEY]):
    sys.exit("חסרים env vars: GREEN_API_ID_INSTANCE / GREEN_API_TOKEN / BZ_SUPABASE_URL / BZ_SERVICE_ROLE_KEY")

PUB = f"{SB_URL}/storage/v1/object/public/lesson-attachments"


# NetSpark: חובה לעקוף את ה-proxy המקומי (מקביל ל-curl --noproxy '*') —
# אחרת קריאות Supabase/מדיה מקבלות 403 מהמסנן.
_OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def http(url, method="GET", body=None, headers=None, raw=False):
    req = urllib.request.Request(url, method=method)
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    data = body if isinstance(body, (bytes, type(None))) else json.dumps(body).encode()
    if data is not None and "Content-Type" not in (headers or {}):
        req.add_header("Content-Type", "application/json")
    try:
        with _OPENER.open(req, data, timeout=120) as r:
            out = r.read()
    except urllib.error.HTTPError as e:
        detail = ""
        try:
            detail = e.read().decode()[:200]
        except Exception:
            pass
        raise RuntimeError(f"HTTP {e.code} on {method} {url[:120]} :: {detail}") from None
    return out if raw else (json.loads(out) if out else None)


def sb(path, method="GET", body=None, prefer=None):
    h = {"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}", "Content-Type": "application/json"}
    if prefer:
        h["Prefer"] = prefer
    return http(f"{SB_URL}/rest/v1/{path}", method, body, h)


def storage_upload(dst, blob, ctype):
    h = {"Authorization": f"Bearer {SB_KEY}", "Content-Type": ctype, "x-upsert": "true"}
    http(f"{SB_URL}/storage/v1/object/lesson-attachments/{dst}", "POST", blob, h)
    # אימות 200 לפני שימוש (כלל-ברזל: נכס לפני רשומה)
    code = urllib.request.urlopen(f"{PUB}/{dst}").status
    if code != 200:
        raise RuntimeError(f"storage verify failed {dst}: {code}")
    return f"{PUB}/{dst}"


def esc_bold(text):
    import html as h
    t = h.escape(text, quote=False)
    return re.sub(r"\*([^*\n]+)\*", r"<strong>\1</strong>", t)


def to_html(text):
    paras = [p.strip().replace("\n", "<br/>") for p in re.split(r"\n\s*\n", esc_bold(text)) if p.strip()]
    return "".join(f"<p>{p}</p>" for p in paras)


def log(msg):
    print(f"[{datetime.datetime.now():%d.%m %H:%M}] {msg}", flush=True)


# ── 1. משיכת הקבוצה ─────────────────────────────────────────────────────────
msgs = http(
    f"https://api.greenapi.com/waInstance{GA_ID}/getChatHistory/{GA_TOKEN}",
    "POST",
    {"chatId": GROUP, "count": COUNT},
)
log(f"נמשכו {len(msgs)} הודעות מהקבוצה")

added = {"verse": 0, "news": 0, "podcast": 0}

for m in sorted(msgs, key=lambda x: x.get("timestamp", 0)):
    cap = m.get("caption") or ""
    ts = datetime.datetime.fromtimestamp(m.get("timestamp", 0))
    date = ts.strftime("%Y-%m-%d")

    # ── פסוק יומי ──
    if "הפסוק היומי" in cap.split("\n", 1)[0]:
        exists = sb(f"daily_verses?date=eq.{date}&select=id")
        if exists:
            continue
        quote = re.search(r"\*\s*[\"”]?([^*]+?)[\"”]?\s*\*\s*[\(（]([^)）]+)[\)）]", cap)
        if not quote:
            log(f"⚠️ פסוק {date}: לא זוהה מבנה פסוק+מקור — דילוג (לא מנחשים)")
            continue
        verse_text, verse_source = quote.group(1).strip(), quote.group(2).strip()
        after = cap[quote.end():].strip()
        commentary = re.split(r"להצטרפות לקבוצ", after)[0].strip()
        image_url = None
        if m.get("downloadUrl") and not DRY:
            # מדיה של הודעות ישנות פגת-תוקף ב-Green API (AccessDenied) —
            # הפסוק עצמו חשוב מהתמונה, ממשיכים בלעדיה.
            try:
                blob = http(m["downloadUrl"], raw=True)
                image_url = storage_upload(f"daily-verses/{date}.jpg", blob, "image/jpeg")
            except Exception as e:
                log(f"⚠️ פסוק {date}: תמונה לא זמינה ({str(e)[:60]}) — נשמר בלי תמונה")
        if DRY:
            log(f"[dry] פסוק {date}: {verse_source}")
        else:
            sb("daily_verses", "POST", {
                "date": date, "verse_text": verse_text, "verse_source": verse_source,
                "commentary": commentary, "image_url": image_url, "raw_caption": cap,
                "group_id": GROUP,
            }, prefer="return=minimal")
            log(f"✅ פסוק יומי {date}: {verse_source}")
        added["verse"] += 1
        continue

    # ── חדשות תנ"כיות ──
    if "חדשות תנ" in cap and "מאורעות השעה" in cap:
        titles = [t.strip() for t in re.findall(r"\*([^*]+)\*", cap)
                  if "חדשות תנ" not in t and "מאת" not in t]
        if not titles:
            continue
        title = titles[0]
        t_esc = title.replace("'", "''")
        exists = sb(f"lessons?series_id=eq.{NEWS_SERIES}&title=eq.{urllib.parse.quote(title)}&select=id")
        if exists:
            continue
        body = re.split(r"להצטרפות לקבוצ", cap)[0]
        lines = [ln for ln in body.split("\n")]
        cleaned, skipped_title = [], False
        for ln in lines:
            l = ln.strip()
            if not cleaned and (("חדשות תנ" in l) or l.startswith("מאת ") or l == ""):
                continue
            if not skipped_title and l.replace("*", "").strip() == title:
                skipped_title = True
                continue
            cleaned.append(ln)
        content = to_html("\n".join(cleaned).strip())
        desc = re.sub(r"<[^>]+>", "", content.split("</p>")[0])[:300]
        if DRY:
            log(f"[dry] חדשות: {title}")
        else:
            sb("lessons", "POST", {
                "title": title, "description": desc, "content": content,
                "rabbi_id": YOAV, "series_id": NEWS_SERIES, "status": "published",
                "source_type": "article", "audience_tags": ["general"],
                "created_at": ts.isoformat(), "published_at": ts.isoformat(),
            }, prefer="return=minimal")
            log(f"✅ חדשות תנ\"כיות: {title}")
        added["news"] += 1
        continue

    # ── פודקאסט (mp3) ──
    if m.get("typeMessage") == "audioMessage" and (m.get("downloadUrl") or "").endswith(".mp3"):
        fname = m["downloadUrl"].rsplit("/", 1)[-1]
        dst = f"yaldei-hatanach/wa-{fname}"
        exists = sb(f"lessons?series_id=eq.{POD_SERIES}&audio_url=like.*{fname}&select=id")
        # פרק 1 הועלה ידנית בשם אחר — dedup גם לפי תאריך
        same_day = sb(f"lessons?series_id=eq.{POD_SERIES}&published_at=gte.{date}T00:00:00&published_at=lte.{date}T23:59:59&select=id")
        if exists or same_day:
            continue
        if DRY:
            log(f"[dry] פודקאסט: פרק חדש {date} ({fname})")
        else:
            blob = http(m["downloadUrl"], raw=True)
            audio_url = storage_upload(dst, blob, "audio/mpeg")
            sb("lessons", "POST", {
                "title": f"פרק חדש (טרם נערך) — {ts:%d.%m.%Y}",
                "description": "פרק שנקלט אוטומטית מקבוצת הוואטסאפ — ממתין לכותרת ותיאור לפני פרסום.",
                "rabbi_id": YOAV, "series_id": POD_SERIES, "status": "draft",
                "source_type": "audio", "audience_tags": ["general"],
                "audio_url": audio_url, "thumbnail_url": f"{PUB}/yaldei-hatanach/cover.jpg",
                "created_at": ts.isoformat(),
            }, prefer="return=minimal")
            log(f"📻 פודקאסט: פרק חדש נקלט כטיוטה ({date}) — לערוך כותרת ולפרסם")
        added["podcast"] += 1

# ── עדכון lesson_count על הסדרות ─────────────────────────────────────────────
if not DRY and (added["news"] or added["podcast"]):
    for sid in (NEWS_SERIES, POD_SERIES):
        n = sb(f"lessons?series_id=eq.{sid}&status=eq.published&select=id")
        sb(f"series?id=eq.{sid}", "PATCH", {"lesson_count": len(n)}, prefer="return=minimal")

log(f"סיכום: פסוקים +{added['verse']} · חדשות +{added['news']} · פודקאסט +{added['podcast']}")
