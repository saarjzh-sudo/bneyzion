#!/usr/bin/env python3
"""11.7.2026 (סער) — תמונות אקוורל צבעוניות לכרטיסיות "תנ״ך למשפחה".

"ותחליף אותם למשהו יותר דומה לשיעורים עצמם, לעיצוב של השיעורים —
שיהיה עם יותר צבע אבל עדיין אקוורל עדין."

סגנון = סדרה 3 (קורסים דיגיטליים) מ-DESIGN-IMAGE-STYLES.md:
אקוורל עדין וצבעוני, אלמנט מרכזי אחד לכל כרטיס, בלי טקסט/פרצופים/דמויות, 16:9.
תבנית הצינור = scripts/gen_course_images.py (נכס קודם, רשומה אחריו):
  1. ג'נרוט gemini-3-pro-image.
  2. המרה ל-JPEG איכות 82 (sips).
  3. העלאה ל-Supabase Storage (product-images/family-cards/) — חי מיד.
  4. אימות HTTP 200 על ה-URL הציבורי לפני כל כתיבה ל-DB.
  5. עדכון family_cards.image_url רק לנכסים שאומתו (--apply).

שינוי מהתבנית: כל הרשת דרך curl (urllib חסום בסביבה הזו), תמיד --noproxy '*'.

אידמפוטנטי: מדלג על ג'נרוט אם הקובץ המקומי כבר קיים.
הרצה: GEMINI_API_KEY=... SERVICE_KEY=... SUPABASE_ACCESS_TOKEN=... \
      python3 scripts/gen_family_card_images.py [--apply]
בלי --apply: ג'נרוט + העלאה + אימות בלבד (dry-run על ה-DB).
"""
import base64
import json
import os
import subprocess
import sys
import time

GEMINI_KEY = os.environ["GEMINI_API_KEY"]
SERVICE_KEY = os.environ["SERVICE_KEY"]
PROJECT = "pzvmwfexeiruelwiujxn"
STORAGE_BASE = f"https://{PROJECT}.supabase.co/storage/v1"
BUCKET = "product-images"
FOLDER = "family-cards"
APPLY = "--apply" in sys.argv
OUTDIR = os.path.join(os.path.dirname(__file__), "..", "yoav-feedback-2026-07-09", "pilots", "family-cards")
os.makedirs(OUTDIR, exist_ok=True)

# ה-STYLE הקנוני של סדרה 3 (DESIGN-IMAGE-STYLES.md) — לא לשנות בלי אישור.
STYLE = (
    "Delicate watercolor painting for a premium Bible-study website. "
    "ONE delicate central element only, soft translucent washes, visible paper texture, "
    "airy composition with generous breathing room. Colorful and beautiful palette as specified. "
    "ABSOLUTELY NO text, NO letters, NO words, NO numbers, NO human faces, no people, "
    "no human figures, no women, no children. "
    "Wide landscape composition 16:9, soft edges fading to warm cream paper."
)

# card_key → English prompt with its own palette (אלמנט מרכזי אחד לפי נושא הכרטיס)
CARDS = {
    "parasha": (
        "An open Torah scroll resting on a wooden table, soft golden light rising gently "
        "from its parchment, a sprig of olive leaves beside it. Palette: warm gold, sage "
        "green, soft sky blue"
    ),
    "chapter-weekly": (
        "An open ancient book with a winding ribbon of golden light flowing from its pages "
        "over gentle green hills toward the horizon. Palette: deep teal, luminous gold, "
        "fresh spring green"
    ),
    "daily-verse": (
        "A single drop of golden light falling into still water at sunrise, soft ripples "
        "spreading outward. Palette: soft coral sunrise, pale gold, gentle powder blue"
    ),
    "dor-haplaot": (
        "Arcs of protective golden light curving over the rooftops of Jerusalem under a "
        "deep starry night sky. Palette: rich indigo, luminous gold, touches of silver"
    ),
    "riddles": (
        "Two warm Shabbat candle flames glowing over a festively set wooden table with a "
        "covered braided bread. Palette: honey gold, deep wine red, warm cream"
    ),
    "tanach-news": (
        "An ancient stone watchtower on the walls of Jerusalem at dawn, a white dove "
        "taking flight into the morning sky. Palette: fresh cerulean blue, warm sandstone, "
        "soft gold"
    ),
    "newsletter": (
        "A folded parchment letter sealed with golden wax, an olive branch laid across it "
        "on a soft cloth. Palette: soft teal, warm cream, antique gold"
    ),
    "kids-podcast": (
        "A small wooden boat with a bright striped sail on gentle playful waves, a "
        "cheerful rainbow arcing in the sky behind. Palette: sunny yellow, sky blue, "
        "playful rainbow pastels"
    ),
}


def curl_json(args: list[str], timeout: int = 300):
    """מריץ curl ומחזיר JSON מפוענח. תמיד בלי פרוקסי (NetSpark)."""
    out = subprocess.run(
        ["curl", "-s", "--noproxy", "*", "--max-time", str(timeout), *args],
        capture_output=True, check=False,
    )
    return json.loads(out.stdout)


def generate(prompt: str, out_path: str) -> bool:
    body = {
        "contents": [{"parts": [{"text": f"{prompt}. {STYLE}"}]}],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": {"aspectRatio": "16:9"},
        },
    }
    req_file = os.path.join(OUTDIR, "_req.json")
    with open(req_file, "w") as f:
        json.dump(body, f)
    for attempt in range(3):
        try:
            resp = curl_json([
                "-X", "POST",
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent",
                "-H", "Content-Type: application/json",
                "-H", f"X-goog-api-key: {GEMINI_KEY}",
                "-d", f"@{req_file}",
            ])
            parts = resp["candidates"][0]["content"]["parts"]
            img = next(p for p in parts if "inlineData" in p)
            raw_path = out_path + ".raw"
            with open(raw_path, "wb") as f:
                f.write(base64.b64decode(img["inlineData"]["data"]))
            # המרה ל-JPEG איכות 82 (sips — מובנה ב-macOS; ממיר גם PNG וגם JPEG)
            conv = subprocess.run(
                ["sips", "-s", "format", "jpeg", "-s", "formatOptions", "82",
                 raw_path, "--out", out_path],
                capture_output=True, check=False,
            )
            os.remove(raw_path)
            if conv.returncode != 0 or not os.path.exists(out_path):
                print(f"  sips conversion failed: {conv.stderr.decode()[:200]}")
                return False
            return True
        except Exception as e:  # noqa: BLE001
            print(f"  gen attempt {attempt + 1} failed: {e}")
            time.sleep(8)
    return False


def upload(local_path: str, remote_name: str) -> str | None:
    url = f"{STORAGE_BASE}/object/{BUCKET}/{FOLDER}/{remote_name}"
    up = subprocess.run(
        ["curl", "-s", "--noproxy", "*", "-o", "/dev/null", "-w", "%{http_code}",
         "-X", "POST", url,
         "-H", f"Authorization: Bearer {SERVICE_KEY}",
         "-H", "Content-Type: image/jpeg",
         "-H", "x-upsert: true",
         "--data-binary", f"@{local_path}"],
        capture_output=True, check=False,
    )
    code = up.stdout.decode().strip()
    if code not in ("200", "201"):
        print(f"  upload failed: HTTP {code}")
        return None
    public_url = f"{STORAGE_BASE}/object/public/{BUCKET}/{FOLDER}/{remote_name}"
    # אימות 200 + גודל סביר לפני שמעדכנים רשומה (דאטה קודם, קוד אחריו)
    chk = subprocess.run(
        ["curl", "-s", "--noproxy", "*", "-o", "/dev/null",
         "-w", "%{http_code} %{size_download}", public_url],
        capture_output=True, check=False,
    )
    status, _, size = chk.stdout.decode().strip().partition(" ")
    if status == "200" and int(size or 0) > 10000:
        return public_url
    print(f"  public URL check failed: HTTP {status}, size {size}")
    return None


def db_query(sql: str):
    pat = os.environ["SUPABASE_ACCESS_TOKEN"]
    q_file = os.path.join(OUTDIR, "_query.json")
    with open(q_file, "w") as f:
        json.dump({"query": sql}, f)
    return curl_json([
        "-X", "POST",
        f"https://api.supabase.com/v1/projects/{PROJECT}/database/query",
        "-H", f"Authorization: Bearer {pat}",
        "-H", "Content-Type: application/json",
        "-d", f"@{q_file}",
    ], timeout=60)


def main():
    verified: dict[str, str] = {}
    for card_key, prompt in CARDS.items():
        local = os.path.join(OUTDIR, f"{card_key}.jpg")
        if os.path.exists(local) and os.path.getsize(local) > 10000:
            print(f"[skip-gen] {card_key} (כבר קיים מקומית)")
        else:
            print(f"[gen] {card_key} ...")
            if not generate(prompt, local):
                print(f"  FAILED generation — {card_key} מדולג")
                continue
        url = upload(local, f"{card_key}.jpg")
        if url:
            verified[card_key] = url
            print(f"  ✓ חי ואומת: {url}")
        else:
            print(f"  ✗ העלאה/אימות נכשלו — {card_key} לא יעודכן ב-DB")

    print(f"\n{len(verified)}/{len(CARDS)} נכסים חיים ומאומתים.")
    if not APPLY:
        print("dry-run — בלי עדכון DB. הרץ עם --apply להחלה.")
        return
    if not verified:
        print("אין מה להחיל.")
        return

    for card_key, url in verified.items():
        db_query(
            f"UPDATE family_cards SET image_url = '{url}', updated_at = NOW() "
            f"WHERE card_key = '{card_key}';"
        )
    rows = db_query(
        "SELECT card_key, image_url IS NOT NULL AS has_image FROM family_cards ORDER BY sort_order;"
    )
    print(json.dumps(rows, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
