#!/usr/bin/env python3
"""
newsletters_sync.py — סנכרון המייל השבועי (Smoove→Gmail) אל טבלת newsletters (רמה 13, 10.7.2026).

המייל השבועי של בני ציון נשלח מ-Smoove (send.vpcontact.com) ומגיע לתיבה של סער.
Smoove לא חושף API לקריאת קמפיינים (405 על GET /Campaigns), לכן המקור = Gmail.

לכל מייל חדש: subject/date/טקסט-נקי/קישורים + תמונת-הירו (התמונה הראשונה בגוף
המייל, מאוחסנת-מחדש ב-storage — לא סומכים על CDN חיצוני). אידמפוטנטי: id שכבר
ב-DB מדולג. עמוד /newsletter קורא מהטבלה (fallback ל-newsletters.json הסטטי).

env (מ-~/.config/bneyzion/sync.env): BZ_SUPABASE_URL, BZ_SERVICE_ROLE_KEY.
Gmail creds: GMAIL_CREDS_DIR (ברירת-מחדל ~/.config/bneyzion/gmail — עותק מחוץ
ל-Downloads בגלל TCC של launchd) עם credentials.json + token.json (refresh_token).

launchd: com.bneyzion.newsletter-sync (יומי 09:20; רץ מעותק ב-~/.config/bneyzion —
אחרי עריכה כאן להריץ: cp scripts/newsletters_sync.py ~/.config/bneyzion/).
"""
import base64
import html
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from email.utils import parsedate_to_datetime
from pathlib import Path

SB_URL = os.environ.get("BZ_SUPABASE_URL", "").rstrip("/")
SB_KEY = os.environ.get("BZ_SERVICE_ROLE_KEY", "")
GMAIL_DIR = Path(os.environ.get("GMAIL_CREDS_DIR", str(Path.home() / ".config/bneyzion/gmail")))
if not SB_URL or not SB_KEY:
    sys.exit("חסרים env vars: BZ_SUPABASE_URL / BZ_SERVICE_ROLE_KEY")

PUB = f"{SB_URL}/storage/v1/object/public/lesson-attachments"
# ⚠️ חייב את הכתובת המלאה של בני-ציון — from:send.vpcontact.com לבד תופס את מיילי
# ה-Smoove של *כל* הלקוחות בתיבה של סער (אבולעפיה/חוסן/מלמדים) — קרה ב-10.7.
SENDER_QUERY = "from:office.bneyzion.co.il@send.vpcontact.com"
LOOKBACK = "400d"  # מכסה גם את 9 הגיליונות הראשונים (מאי-יוני 2026)

_OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def log(msg):
    print(f"[{datetime.now():%d.%m %H:%M}] {msg}", flush=True)


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
    code = _OPENER.open(f"{PUB}/{urllib.parse.quote(dst)}").status
    if code != 200:
        raise RuntimeError(f"storage verify failed {dst}: {code}")
    return f"{PUB}/{dst}"


# ─── Gmail ────────────────────────────────────────────────────────────────────

def gmail_token():
    tok = json.load(open(GMAIL_DIR / "token.json"))
    creds = json.load(open(GMAIL_DIR / "credentials.json"))
    ci = creds.get("installed") or creds.get("web")
    data = urllib.parse.urlencode({
        "client_id": ci["client_id"],
        "client_secret": ci["client_secret"],
        "refresh_token": tok["refresh_token"],
        "grant_type": "refresh_token",
    }).encode()
    r = http("https://oauth2.googleapis.com/token", "POST", data,
             {"Content-Type": "application/x-www-form-urlencoded"})
    return r["access_token"]


def gmail(path, at):
    return http(f"https://gmail.googleapis.com/gmail/v1/users/me/{path}",
                headers={"Authorization": f"Bearer {at}"})


def walk_parts(payload):
    if "parts" in payload:
        for p in payload["parts"]:
            yield from walk_parts(p)
    else:
        yield payload


def part_body(part):
    data = part.get("body", {}).get("data")
    if not data:
        return ""
    return base64.urlsafe_b64decode(data + "===").decode("utf-8", "replace")


# ─── HTML → תוכן נקי ─────────────────────────────────────────────────────────

FOOTER_MARKERS = [
    "להסרה מרשימת התפוצה", "לחץ כאן להסרה", "unsubscribe", "נשלח באמצעות",
    "אם אינך רואה מייל זה", "להסרה לחץ",
    # 18.7 (תרצה מקבוצת המבקרים): הפוטר של Smoove דלף לארכיון עם קישור
    # "עדכון פרטים" אישי — חותכים גם את הווריאציות האלה.
    "אם אינכם רואים מייל זה", "עדכון פרטים", "דיווח כספאם",
]
# פיקסלים/לוגו-ספק — לא תמונת-הירו
IMG_SKIP = re.compile(r"(pixel|track|open\.aspx|spacer|logo_smoove|vpcontact\.com/l/)", re.I)

# 18.7 (יואב 16:51 + תרצה): "באגף הניוזלטרים מופיעים כל המיילים שנשלחים מסמוב".
# מיילים תפעוליים (תזכורות-שיעור, מיילי-הצטרפות, מסירה דיגיטלית, כנסים, בדיקות)
# נקלטים אבל מסומנים hidden=true — הארכיון הציבורי מציג רק גיליונות-תוכן.
OPERATIONAL_SUBJECT = re.compile(
    r"(הערב: השיעור השבועי|סיכום והקלטת השיעור|ברוכים הבאים לתכנית|שרכשת"
    r"|\[בדיקה\]|בדיקת ערוץ|^test$|עוד \d+ דקות|כעת — עלינו לאוויר"
    r"|הערב ב-?\d|הערב \d|^מחר: |מחר: מעצמה|תזכורת|הקישור לזום|לינק לזום"
    r"|עכשיו בכנס|בעוד רבע שעה|מתחיל בעוד|עדיין לא מאוחר|הערב בזום|התחלנו!|פותח את כנס)",
    re.I,
)


def extract_hero_image(html_src):
    for m in re.finditer(r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>', html_src, re.I):
        tag, src = m.group(0), m.group(1)
        if IMG_SKIP.search(src):
            continue
        wm = re.search(r'width=["\']?(\d+)', tag)
        if wm and int(wm.group(1)) < 100:  # פיקסל-מעקב / אייקון
            continue
        # src ב-HTML מגיע עם ישויות (&amp;) — בלי unescape קישורי drive נשברים ל-400
        return html.unescape(src)
    return None


def extract_links(html_src):
    links, seen = [], set()
    for m in re.finditer(r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', html_src, re.I | re.S):
        url = m.group(1).strip()
        label = re.sub(r"<[^>]+>", "", m.group(2))
        label = html.unescape(re.sub(r"\s+", " ", label)).strip()
        if not label or len(label) < 3 or url in seen:
            continue
        # 18.7: קישורי Smoove אישיים (portal.smoove.io — עדכון-פרטים/הסרה של הנמען
        # שהמייל נקלט מתיבתו) = דליפת פרטים. נחסמים כולם, לפי דומיין וגם לפי תווית.
        if re.search(r"(unsubscribe|הסרה|vpcontact\.com/l/|smoove\.io|עדכון פרטים|דיווח כספאם)", url + label, re.I):
            continue
        if not url.startswith("http"):
            continue
        seen.add(url)
        links.append({"label": label[:80], "url": url})
    return links[:6]


def html_to_text(html_src):
    t = re.sub(r"<(style|script)[^>]*>.*?</\1>", " ", html_src, flags=re.I | re.S)
    t = re.sub(r"<br[^>]*>|</p>|</div>|</td>|</h\d>", "\n", t, flags=re.I)
    t = re.sub(r"<[^>]+>", " ", t)
    t = html.unescape(t)
    t = re.sub(r"[ \t‏‎]+", " ", t)
    t = re.sub(r"\n\s*\n+", "\n", t)
    text = t.strip()
    for marker in FOOTER_MARKERS:
        idx = text.find(marker)
        if idx > 100:
            text = text[:idx].strip()
    return text[:2500]


# ─── main ────────────────────────────────────────────────────────────────────

def main():
    at = gmail_token()
    rows = sb("newsletters?select=id,subject,date&limit=1000")
    existing = {r["id"] for r in rows}
    # דדופ קמפיין: אותו גיליון מגיע לפעמים לכמה כתובות של סער = כמה message-ids
    seen_campaigns = {(r["subject"], r["date"]) for r in rows}
    q = urllib.parse.quote(f"{SENDER_QUERY} newer_than:{LOOKBACK}")
    res = gmail(f"messages?q={q}&maxResults=100", at)
    ids = [m["id"] for m in res.get("messages", [])]
    log(f"נמצאו {len(ids)} מיילים מהשולח, {len(existing)} כבר ב-DB")

    added = 0
    for mid in ids:
        if mid in existing:
            continue
        msg = gmail(f"messages/{mid}?format=full", at)
        headers = {h["name"].lower(): h["value"] for h in msg["payload"].get("headers", [])}
        subject = headers.get("subject", "(ללא נושא)")
        try:
            date = parsedate_to_datetime(headers.get("date")).date().isoformat()
        except Exception:
            date = datetime.now().date().isoformat()
        if (subject, date) in seen_campaigns:
            continue
        seen_campaigns.add((subject, date))

        html_src = ""
        for part in walk_parts(msg["payload"]):
            if part.get("mimeType") == "text/html":
                html_src = part_body(part)
                break
        if not html_src:
            log(f"⚠️ {subject[:40]} — בלי חלק HTML, מדולג")
            continue

        image_url = None
        hero = extract_hero_image(html_src)
        if hero:
            try:
                # UA דפדפני — content.viplus.com (CDN של Smoove) חוסם UA של python
                # ב-Cloudflare 1010; imgur מגביל-קצב בלי UA.
                blob = http(hero, raw=True, headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
                    "Accept": "image/*,*/*",
                })
                ext = ".png" if ".png" in hero.lower() else ".jpg"
                ctype = "image/png" if ext == ".png" else "image/jpeg"
                image_url = storage_upload(f"newsletters/{mid}{ext}", blob, ctype)
            except Exception as e:
                log(f"⚠️ תמונה נכשלה ({subject[:30]}): {e}")

        hidden = bool(OPERATIONAL_SUBJECT.search(subject))
        sb("newsletters", "POST", {
            "id": mid,
            "subject": subject,
            "date": date,
            "body_text": html_to_text(html_src),
            "links": extract_links(html_src),
            "image_url": image_url,
            "hidden": hidden,
        }, prefer="resolution=merge-duplicates")
        log(f"✅ {date} · {subject[:50]}" + (" (+תמונה)" if image_url else " (בלי תמונה)"))
        added += 1

    log(f"סיכום: גיליונות +{added}")


if __name__ == "__main__":
    main()
