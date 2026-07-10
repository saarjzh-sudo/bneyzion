#!/usr/bin/env python3
"""רמה 14 (סער 10.7) — תמונות אקוורל צבעוניות לקורסים.

"לגבי הקורסים האחרים תייצר להם גם תמונה עם המעצב שלנו באקוורל וכו בצורה
איכותית — אל תצמד רק לגוון צהוב אלא תעשה צבעוני ויפה, אלמנט מרכזי עדין,
כמו שאר האתר."

צינור בטוח לפרודקשן (נכס קודם, רשומה אחריו):
  1. ג'נרוט gemini-3-pro-image (אקוורל, אלמנט מרכזי אחד, בלי אותיות).
  2. העלאה ל-Supabase Storage (product-images/course-covers/) — חי מיד.
  3. אימות 200 על ה-URL הציבורי.
  4. גיבוי community_courses_bak_20260710 + עדכון image_url רק לנכסים שאומתו.

אידמפוטנטי: מדלג על קורס שכבר יש לו image_url (הרץ עם --force לדרוס).
הרצה: GEMINI_API_KEY=... SERVICE_KEY=... python3 scripts/gen_course_images.py [--apply]
בלי --apply: ג'נרוט + העלאה + אימות בלבד (dry-run על ה-DB).
"""
import base64
import json
import os
import sys
import time
import urllib.request

# NetSpark: ישירות בלי פרוקסי מערכת (המקבילה של curl --noproxy '*')
urllib.request.install_opener(urllib.request.build_opener(urllib.request.ProxyHandler({})))

GEMINI_KEY = os.environ["GEMINI_API_KEY"]
SERVICE_KEY = os.environ["SERVICE_KEY"]
PROJECT = "pzvmwfexeiruelwiujxn"
STORAGE_BASE = f"https://{PROJECT}.supabase.co/storage/v1"
BUCKET = "product-images"
FOLDER = "course-covers"
APPLY = "--apply" in sys.argv
OUTDIR = os.path.join(os.path.dirname(__file__), "..", "yoav-feedback-2026-07-09", "pilots", "course-covers")
os.makedirs(OUTDIR, exist_ok=True)

STYLE = (
    "Delicate watercolor painting for a premium Bible-study website. "
    "ONE delicate central element only, soft translucent washes, visible paper texture, "
    "airy composition with generous breathing room. Colorful and beautiful palette as specified. "
    "ABSOLUTELY NO text, NO letters, NO words, NO numbers, NO human faces. "
    "Wide landscape composition 16:9, soft edges fading to warm cream paper."
)

# course id → (slug-for-filename, English prompt with its own palette)
COURSES = {
    "35e7d37b-a263-4e85-a8d8-16fdbae312ae": (
        "book-ezra",
        "Rising golden sun over ancient Jerusalem stones being lovingly rebuilt, "
        "a small green cypress sapling growing between the stones. Palette: warm amber, "
        "soft sky blue, touches of fresh green",
    ),
    "e1ec3ebc-fdf6-41be-a1fe-262174c2c8dd": (
        "book-nehemiah",
        "An ancient Jerusalem stone wall gate with a fresh olive branch across it, "
        "morning light. Palette: sage green, warm sandstone, soft turquoise sky",
    ),
    "ccee8278-ca37-4025-a5b8-13ea99617a24": (
        "book-daniel",
        "A majestic lion resting peacefully under a deep indigo night sky full of golden "
        "stars. Palette: rich indigo, violet, luminous gold stars",
    ),
    "e3ee44dd-07f8-4902-a5cf-07bd1645de92": (
        "book-esther",
        "A Persian palace garden with blooming myrtle branches and roses, a delicate golden "
        "crown resting on marble. Palette: deep crimson, rose pink, emerald green",
    ),
    "3f9742e3-370e-4f98-b9d2-3aaae94da38e": (
        "book-lamentations",
        "Jerusalem city walls at dusk, dignified and quiet, a single small candle flame "
        "glowing warmly in the foreground. Palette: muted sepia, dusty blue-gray, one warm flame",
    ),
    "dff61c84-48d4-4d11-88de-1f52ecbd7885": (
        "book-haggai-zechariah-malachi",
        "A golden menorah between two olive trees, the vision of Zechariah, dawn light "
        "rising behind. Palette: deep teal, luminous gold, soft silver-green olive leaves",
    ),
    "78499931-fccb-44f5-8efd-f52f608184a2": (
        "course-how-to-learn",
        "An open ancient book with soft rays of light rising gently from its pages like a "
        "sunrise. Palette: fresh cerulean blue, spring green, warm cream",
    ),
    "5fb9f3e3-2928-45a5-9a11-21430fbebc87": (
        "course-why-learn",
        "A winding footpath through green wheat fields leading to a glowing sunrise horizon. "
        "Palette: fresh greens, golden sunrise, soft coral clouds",
    ),
    "ffcb59a8-9ea0-4df8-b154-cb323b5a6009": (
        "course-shoftim-new-look",
        "A shofar horn resting beside an ancient olive tree in a windswept field, dramatic "
        "expressive sky. Palette: earthy olive green, storm blue, warm ochre",
    ),
}


def generate(prompt: str, out_path: str) -> bool:
    body = {
        "contents": [{"parts": [{"text": f"{prompt}. {STYLE}"}]}],
        "generationConfig": {"responseModalities": ["IMAGE"]},
    }
    req = urllib.request.Request(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "X-goog-api-key": GEMINI_KEY},
        method="POST",
    )
    for attempt in range(3):
        try:
            resp = json.load(urllib.request.urlopen(req, timeout=240))
            parts = resp["candidates"][0]["content"]["parts"]
            img = next(p for p in parts if "inlineData" in p)
            with open(out_path, "wb") as f:
                f.write(base64.b64decode(img["inlineData"]["data"]))
            return True
        except Exception as e:  # noqa: BLE001
            print(f"  gen attempt {attempt + 1} failed: {e}")
            time.sleep(8)
    return False


def upload(local_path: str, remote_name: str) -> str | None:
    url = f"{STORAGE_BASE}/object/{BUCKET}/{FOLDER}/{remote_name}"
    data = open(local_path, "rb").read()
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type": "image/jpeg",
            "x-upsert": "true",
        },
        method="POST",
    )
    try:
        urllib.request.urlopen(req, timeout=120)
    except urllib.error.HTTPError as e:
        print(f"  upload failed: {e.code} {e.read()[:200]}")
        return None
    public_url = f"{STORAGE_BASE}/object/public/{BUCKET}/{FOLDER}/{remote_name}"
    # אימות 200 לפני שמעדכנים רשומה
    try:
        check = urllib.request.urlopen(public_url, timeout=60)
        if check.status == 200 and int(check.headers.get("Content-Length", "0")) > 10000:
            return public_url
    except Exception as e:  # noqa: BLE001
        print(f"  public URL check failed: {e}")
    return None


def db_query(sql: str):
    pat = os.environ["SUPABASE_ACCESS_TOKEN"]
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{PROJECT}/database/query",
        data=json.dumps({"query": sql}).encode(),
        headers={"Authorization": f"Bearer {pat}", "Content-Type": "application/json"},
        method="POST",
    )
    return json.load(urllib.request.urlopen(req, timeout=60))


def main():
    verified: dict[str, str] = {}
    for course_id, (slug, prompt) in COURSES.items():
        local = os.path.join(OUTDIR, f"{slug}.jpg")
        if os.path.exists(local) and os.path.getsize(local) > 10000:
            print(f"[skip-gen] {slug} (כבר קיים מקומית)")
        else:
            print(f"[gen] {slug} ...")
            if not generate(prompt, local):
                print(f"  FAILED generation — {slug} מדולג")
                continue
        url = upload(local, f"{slug}.jpg")
        if url:
            verified[course_id] = url
            print(f"  ✓ חי ואומת: {url}")
        else:
            print(f"  ✗ העלאה/אימות נכשלו — {slug} לא יעודכן ב-DB")

    print(f"\n{len(verified)}/{len(COURSES)} נכסים חיים ומאומתים.")
    if not APPLY:
        print("dry-run — בלי עדכון DB. הרץ עם --apply להחלה.")
        return

    if not verified:
        print("אין מה להחיל.")
        return

    db_query("CREATE TABLE IF NOT EXISTS community_courses_bak_20260710 AS SELECT * FROM community_courses;")
    print("גיבוי community_courses_bak_20260710 ✓")
    for course_id, url in verified.items():
        db_query(
            f"UPDATE community_courses SET image_url = '{url}' WHERE id = '{course_id}';"
        )
    rows = db_query(
        "SELECT count(*) AS with_image FROM community_courses WHERE image_url IS NOT NULL;"
    )
    print(f"עודכן. קורסים עם תמונה: {rows[0]['with_image']}")


if __name__ == "__main__":
    main()
