#!/usr/bin/env python3
"""
Batch image generator for Shir HaShirim (Song of Songs) series.
Generates 42 watercolor images:
  - 4 sub-series cover images
  - 18 lesson images for שיעורים על שיר השירים
  - 8 lesson images for קריאה וביאור בקצרה
  - 8 lesson images for מוקלט ללא טעמים
  - 4 lesson images for שיר השירים בבקיאות

Uploads to Supabase Storage bucket `lesson-images` and patches
image_url on series + thumbnail_url on lessons via REST API.

Run:
  cd /Users/saarj/Downloads/saar-workspace/bneyzion
  env -u HTTPS_PROXY -u HTTP_PROXY python3 scripts/generate_shir_hashirim_images.py
"""

import os
import sys
import json
import base64
import urllib.request
import urllib.error
import concurrent.futures
import threading
from datetime import datetime
from pathlib import Path

# ─── CONFIG ─────────────────────────────────────────────────────────────────

GEMINI_API_KEY = "AIzaSyCLw5Au1kuQB1_xTW-GpLi-cYTdSyaxJMo"
SUPABASE_URL   = "https://pzvmwfexeiruelwiujxn.supabase.co"
SERVICE_KEY    = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6dm13"
    "ZmV4ZWlydWVsd2l1anhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU1MzU3NSwiZXhwI"
    "joyMDkxMTI5NTc1fQ.1jjIdrmm-iuycr8z4hH3QfbqQsi7TYXwUW6CRjWZ6Lk"
)
BUCKET         = "lesson-images"
MODEL          = "imagen-4.0-fast-generate-001"   # fast = $0.02/image
MAX_WORKERS    = 4   # 4 parallel generation threads

STYLE = """Minimalist watercolor painting on white textured paper.
Ultra-clean, gentle, soft, ethereal, atmospheric, meditative, spiritually evocative.
Loose watercolor washes, muted pastel tones (rose pink, soft gold, pale blue-green,
warm sand, blush, dusty lavender, sage green).
Visible paper grain, gentle gradients, completely soft edges.
No harsh lines. No dark outlines. No text or letters. No human figures.
Generous white space — leave areas open and luminous.
Abstract representation, impressionistic style, spiritual ambiance of Song of Songs."""

print_lock = threading.Lock()

def log(msg):
    with print_lock:
        print(msg, flush=True)

# ─── IMAGE MANIFEST ─────────────────────────────────────────────────────────
#
# Format: { "filename": str, "prompt": str, "target": "series"|"lesson",
#           "id": uuid, "field": "image_url"|"thumbnail_url" }

MANIFEST = [
    # ── 4 Sub-series covers ─────────────────────────────────────────────────
    {
        "filename": "shir_sub_shiurim.png",
        "prompt": "A single red rose with delicate petals opening toward golden light, surrounded by soft green vineyard leaves. Symbolizes divine love and longing in Song of Songs.",
        "target": "series",
        "id": "41b62e31-0643-4368-b8ff-04dc25dc2603",
        "field": "image_url",
        "label": "שיעורים על שיר השירים (cover)",
    },
    {
        "filename": "shir_sub_kria_biur.png",
        "prompt": "An open ancient scroll with soft golden text emanating warm light, surrounded by tender vine blossoms. Symbolizes careful study and interpretation of sacred text.",
        "target": "series",
        "id": "c866f217-16fe-4dc1-8a98-583faad5c4d5",
        "field": "image_url",
        "label": "קריאה וביאור בקצרה (cover)",
    },
    {
        "filename": "shir_sub_muklat.png",
        "prompt": "Soft sound waves radiating outward in pastel rose and gold, like a voice singing into the morning sky. A dove in watercolor blur ascending upward. Symbolizes oral recitation and memorization.",
        "target": "series",
        "id": "d963ee27-7551-48dd-9204-4de495922e98",
        "field": "image_url",
        "label": "מוקלט ללא טעמים (cover)",
    },
    {
        "filename": "shir_sub_bekiut.png",
        "prompt": "A golden apple tree heavy with fruit, soft leaves rustling in a gentle breeze, warm afternoon light filtering through. Symbolizes thorough familiarity and mastery through repetition.",
        "target": "series",
        "id": "a6874e51-86f0-4e11-9739-902233b06eb4",
        "field": "image_url",
        "label": "שיר השירים בבקיאות (cover)",
    },

    # ── 18 Lessons: שיעורים על שיר השירים ───────────────────────────────────
    # Theme palette: rose, gold, vineyard — each lesson gets a unique element
    {
        "filename": "shir_l01_deveikut.png",
        "prompt": "Soft golden beam of light descending through morning mist onto a single lotus flower. Symbolizes cleaving to the divine through learning, beyond routine study.",
        "target": "lesson",
        "id": "c45c6f23-8aa1-4180-aabb-d966d4be0492",
        "field": "thumbnail_url",
        "label": "L1 הדרך לדבקות",
    },
    {
        "filename": "shir_l02_achrayut.png",
        "prompt": "A shepherd's crook leaning against ancient stone wall at dusk, one fading star on the horizon. Symbolizes the responsibility of leaders when a nation falters.",
        "target": "lesson",
        "id": "44b17a66-b2ec-4523-8d44-98223e393bd7",
        "field": "thumbnail_url",
        "label": "L2 אחריות מנהיגים",
    },
    {
        "filename": "shir_l03_pshutei_am.png",
        "prompt": "Wildflowers growing between ancient cobblestones — unpretentious, joyful, resilient. Soft morning light, simple dignity. Symbolizes honoring the ordinary people of the nation.",
        "target": "lesson",
        "id": "9da8f5b8-d312-485f-b661-600f5a994c0e",
        "field": "thumbnail_url",
        "label": "L3 יחס לפשוטי העם",
    },
    {
        "filename": "shir_l04_ahava_tora.png",
        "prompt": "An open book glowing with soft golden light, from which tender vines and blossoms grow outward. Symbolizes love of God through oral Torah and divine compassion.",
        "target": "lesson",
        "id": "83d8ae40-8421-4a0f-9df4-0f406f355925",
        "field": "thumbnail_url",
        "label": "L4 אהבת ה׳ דרך תורה",
    },
    {
        "filename": "shir_l05_milchama_geula.png",
        "prompt": "A rainbow arching over rain-washed hills just after a storm, misty and luminous. Symbolizes God's relationship with Israel through trials and redemption.",
        "target": "lesson",
        "id": "03313d01-09d7-4c98-9157-83b15f340483",
        "field": "thumbnail_url",
        "label": "L5 יחס ה׳ למלחמה ולגאולה",
    },
    {
        "filename": "shir_l06_chalomot_ahava.png",
        "prompt": "A moth drawn to a warm candle flame at night, soft wings glowing in amber light. Dreamy watercolor atmosphere. Symbolizes aspirations born from the peak of love.",
        "target": "lesson",
        "id": "036ee436-0a90-487a-ab9e-24b46b18e02a",
        "field": "thumbnail_url",
        "label": "L6 חלומות מאהבה",
    },
    {
        "filename": "shir_l07_umot_yitron.png",
        "prompt": "A mountain peak emerging above the clouds in early morning light, majestic and serene. Symbolizes the nations of the world recognizing Israel's unique spiritual gifts.",
        "target": "lesson",
        "id": "16d0b8db-4f97-4150-b29c-dd64b5654448",
        "field": "thumbnail_url",
        "label": "L7 הכרת האומות",
    },
    {
        "filename": "shir_l08_dod_raia.png",
        "prompt": "Two intertwined vines growing upward together on a garden trellis, leaves touching. Soft warm afternoon light. Symbolizes the beloved and her partner, closeness and partnership.",
        "target": "lesson",
        "id": "e9880672-c50a-4676-b8d0-f63d7e19b814",
        "field": "thumbnail_url",
        "label": "L8 הדוד והרעיה",
    },
    {
        "filename": "shir_l09_hodaa_shvach.png",
        "prompt": "A single bird singing on a flowering branch at dawn, soft pink sky behind it. Symbolizes Israel's acknowledgment of divine praise and God's watchful care.",
        "target": "lesson",
        "id": "09ae61cc-7dd4-4d5a-bf02-3edc0fe1ff1d",
        "field": "thumbnail_url",
        "label": "L9 הודאה על שבח",
    },
    {
        "filename": "shir_l10_emuna_milchama.png",
        "prompt": "A warrior's shield resting against an ancient olive tree, dappled light filtering through silver leaves. Symbolizes Israel going to war in faith, and the deep connection to God.",
        "target": "lesson",
        "id": "0950239c-c9ac-4954-94ca-69717f7832ea",
        "field": "thumbnail_url",
        "label": "L10 שבח יוצא למלחמה באמונה",
    },
    {
        "filename": "shir_l11_bakasha_yetziat.png",
        "prompt": "A key hanging from a delicate chain catching the light, surrounded by soft blossoms. Symbolizes the plea to merit divine love, understanding redemption from Egypt.",
        "target": "lesson",
        "id": "46a444b4-8bb7-47b9-a365-efcabcd12908",
        "field": "thumbnail_url",
        "label": "L11 בקשה לאהבת ה׳",
    },
    {
        "filename": "shir_l12_drakhim_ahava.png",
        "prompt": "A winding path through a garden of wildflowers leading toward warm golden light in the distance. Minimalist watercolor. Symbolizes different paths to reaching love of God.",
        "target": "lesson",
        "id": "c50f9b8f-3d49-4210-823a-6b4f29707b77",
        "field": "thumbnail_url",
        "label": "L12 דרכים לאהבת ה׳",
    },
    {
        "filename": "shir_l13_galut_shvach.png",
        "prompt": "A lantern burning steadily through dense fog, its warm light unwavering. Symbolizes God's praise of Israel and His guiding presence through exile.",
        "target": "lesson",
        "id": "154412e7-fcee-4820-a19e-5aa732e543c8",
        "field": "thumbnail_url",
        "label": "L13 שבח ה׳ וגלות",
    },
    {
        "filename": "shir_l14_maalat_israel.png",
        "prompt": "A rare gemstone catching multiple colors of light, facets glowing. Elegant, precious. Symbolizes what creates the unique spiritual excellence of the people of Israel.",
        "target": "lesson",
        "id": "380dc1d6-950a-4ccb-b05d-f08825538b68",
        "field": "thumbnail_url",
        "label": "L14 מעלת ישראל",
    },
    {
        "filename": "shir_l15_siba_ahava.png",
        "prompt": "A gravitational pull — soft golden stars gently drawing together in the night sky. Poetic watercolor cosmic imagery. Symbolizes the source of Israel's love and cleaving to God.",
        "target": "lesson",
        "id": "e88aa742-a52b-4b10-8755-8b74529d42c6",
        "field": "thumbnail_url",
        "label": "L15 סיבת אהבת ישראל",
    },
    {
        "filename": "shir_l16_teshuva_umot.png",
        "prompt": "A confident river flowing forward through ancient stones, clear and steady. Symbolizes Israel's answer to the nations: 'My beloved has gone to his garden.'",
        "target": "lesson",
        "id": "d913fcaa-4d37-4fb0-adf6-1cf5374fb2ce",
        "field": "thumbnail_url",
        "label": "L16 תשובת ישראל לאומות",
    },
    {
        "filename": "shir_l17_tzarot_koach.png",
        "prompt": "A seed cracking open underground, roots pushing through dark soil toward light above. Watercolor drama of hidden strength revealed. Symbolizes how suffering births hidden inner powers.",
        "target": "lesson",
        "id": "e71489da-7337-4818-aee3-a0666070b357",
        "field": "thumbnail_url",
        "label": "L17 הצרות מולידות כוחות",
    },
    {
        "filename": "shir_l18_otzmat_ahava.png",
        "prompt": "A sun rising over a vineyard, every grape glistening with dew, warm amber sky. Symbolizes the immense love of God for Israel and His gathering of their merits.",
        "target": "lesson",
        "id": "172e6870-cbf5-4a4a-9146-65ddc31c69df",
        "field": "thumbnail_url",
        "label": "L18 עוצמת אהבת ה׳",
    },

    # ── 8 Lessons: קריאה וביאור בקצרה ─────────────────────────────────────
    # Theme: chapter-per-chapter, each chapter gets its dominant image from text
    {
        "filename": "shir_kria_perek4.png",
        "prompt": "A garden of spices — cinnamon, henna flowers, nard — in soft gold and rose tones. Watercolor garden. Chapter 4 of Song of Songs: 'a garden locked, a spring sealed.'",
        "target": "lesson",
        "id": "a8f1c784-e07e-4246-a9dc-09ef084da477",
        "field": "thumbnail_url",
        "label": "קריאה פרק ד",
    },
    {
        "filename": "shir_kria_perek8.png",
        "prompt": "A seal impression on soft wax — circular, ancient, bearing a rose motif. Golden and rose watercolor. Chapter 8: 'Set me as a seal upon your heart.'",
        "target": "lesson",
        "id": "c27b3379-854d-4875-b3a0-63bb745b6ef4",
        "field": "thumbnail_url",
        "label": "קריאה פרק ח",
    },
    {
        "filename": "shir_kria_perek6.png",
        "prompt": "Rows of pomegranate trees in a garden, their fruit split open revealing ruby seeds, soft afternoon light. Chapter 6: 'I went down to the nut grove.'",
        "target": "lesson",
        "id": "dedd5045-45e1-4bd6-a8cf-9b577c87577d",
        "field": "thumbnail_url",
        "label": "קריאה פרק ו",
    },
    {
        "filename": "shir_kria_perek1.png",
        "prompt": "A young woman standing in a vineyard at dawn, dark hair flowing, tending the vines. Chapter 1: 'dark am I, yet lovely.' Silhouette only, no face, watercolor abstract.",
        "target": "lesson",
        "id": "4e8c7e3d-5a0b-47b5-8b26-0f1b51becba0",
        "field": "thumbnail_url",
        "label": "קריאה פרק א",
    },
    {
        "filename": "shir_kria_perek5.png",
        "prompt": "A door left ajar at night, soft lamp light spilling onto a moonlit courtyard. Chapter 5: 'I opened to my beloved, but my beloved had turned and gone.'",
        "target": "lesson",
        "id": "a4e83276-1f0d-410b-9681-47fa26d1fbc8",
        "field": "thumbnail_url",
        "label": "קריאה פרק ה",
    },
    {
        "filename": "shir_kria_perek3.png",
        "prompt": "A cedar tree standing tall in a forest at dusk, soft blue-purple sky. Chapter 3: 'Solomon's litter — sixty warriors surrounding it.' Cedar, strength, protection.",
        "target": "lesson",
        "id": "3b9d89cc-34c0-49be-ac59-4a5abde7aca5",
        "field": "thumbnail_url",
        "label": "קריאה פרק ג",
    },
    {
        "filename": "shir_kria_perek7.png",
        "prompt": "A palm tree bending gracefully over a pool of still water, its reflection perfect below. Chapter 7: 'Your stature is like a palm tree.' Serene, majestic.",
        "target": "lesson",
        "id": "6a085071-c0a5-4b53-af4e-000d928616e5",
        "field": "thumbnail_url",
        "label": "קריאה פרק ז",
    },
    {
        "filename": "shir_kria_perek2.png",
        "prompt": "Apple blossoms falling in the breeze over a meadow, soft pink and white petals mid-flight. Chapter 2: 'Like an apple tree among the trees of the forest.'",
        "target": "lesson",
        "id": "baa2e807-ef72-45c1-9d29-c5867a901b9e",
        "field": "thumbnail_url",
        "label": "קריאה פרק ב",
    },

    # ── 8 Lessons: מוקלט ללא טעמים ───────────────────────────────────────
    # Theme: dove variations — different moments of a dove in flight/rest
    {
        "filename": "shir_muklat_p7.png",
        "prompt": "A white dove banking in flight over a vineyard at sunset, wings spread wide, amber light on feathers. Recorded reading without cantillation marks, chapter 7.",
        "target": "lesson",
        "id": "c9eb4884-5a01-47a8-b3ea-510c589bbd0e",
        "field": "thumbnail_url",
        "label": "מוקלט פרק ז",
    },
    {
        "filename": "shir_muklat_p6.png",
        "prompt": "A dove perched on a pomegranate branch, head tilted, one wing slightly raised. Soft watercolor, warm peach tones. Chapter 6.",
        "target": "lesson",
        "id": "017887f1-5420-45e4-8bbe-468f44c77a65",
        "field": "thumbnail_url",
        "label": "מוקלט פרק ו",
    },
    {
        "filename": "shir_muklat_p1.png",
        "prompt": "A dove landing on a windowsill at dawn, wings still open, morning mist beyond. Delicate watercolor. Chapter 1.",
        "target": "lesson",
        "id": "6678a812-08cb-4548-a3db-307f4e1312b2",
        "field": "thumbnail_url",
        "label": "מוקלט פרק א",
    },
    {
        "filename": "shir_muklat_p5.png",
        "prompt": "Two doves touching beaks gently on a rooftop, silhouettes against a dusky lavender sky. Chapter 5 — the searching and the longing.",
        "target": "lesson",
        "id": "de2de796-ad8a-4106-a759-ee48ade31198",
        "field": "thumbnail_url",
        "label": "מוקלט פרק ה",
    },
    {
        "filename": "shir_muklat_p2.png",
        "prompt": "A dove nestled in the cleft of a rock, sheltered, at peace. Golden afternoon light on ancient stone. 'My dove, in the clefts of the rock.' Chapter 2.",
        "target": "lesson",
        "id": "b925420f-93ef-4238-88c4-f610b739cf39",
        "field": "thumbnail_url",
        "label": "מוקלט פרק ב",
    },
    {
        "filename": "shir_muklat_p8.png",
        "prompt": "A dove ascending toward the sun, a tiny silhouette against vast golden sky. Wings fully spread. Chapter 8 — culmination, love as strong as death.",
        "target": "lesson",
        "id": "6b6f977d-80fd-4ecb-bc21-ad6c132112f5",
        "field": "thumbnail_url",
        "label": "מוקלט פרק ח",
    },
    {
        "filename": "shir_muklat_p3.png",
        "prompt": "A dove watching over a vineyard from a branch above, guardian pose, early spring blossoms around it. Chapter 3 — the night search.",
        "target": "lesson",
        "id": "deed366d-4839-4703-a57b-b110f0066405",
        "field": "thumbnail_url",
        "label": "מוקלט פרק ג",
    },
    {
        "filename": "shir_muklat_p4.png",
        "prompt": "A dove feeding in a garden of myrrh and spices, small and precise. Soft watercolor, garden of scents. Chapter 4 — the locked garden.",
        "target": "lesson",
        "id": "3427bb4e-aa1c-4401-bd26-b28cc0ec8315",
        "field": "thumbnail_url",
        "label": "מוקלט פרק ד",
    },

    # ── 4 Lessons: שיר השירים בבקיאות ────────────────────────────────────
    # Theme: golden apple — 4 stages of ripening / seasons
    {
        "filename": "shir_bekiut_12.png",
        "prompt": "A young green apple still on the tree in spring — tight, fresh, with small white blossoms nearby. Symbolizes beginning mastery, chapters 1-2.",
        "target": "lesson",
        "id": "64e69378-5498-4fc5-ab4f-dcd99f0e4ab6",
        "field": "thumbnail_url",
        "label": "בקיאות פרקים א-ב",
    },
    {
        "filename": "shir_bekiut_34.png",
        "prompt": "A half-ripe golden apple glowing in summer light on a branch, promise of sweetness. Chapters 3-4.",
        "target": "lesson",
        "id": "fc0f2617-dfd0-47af-9a6e-9e55b9dd4dad",
        "field": "thumbnail_url",
        "label": "בקיאות פרקים ג-ד",
    },
    {
        "filename": "shir_bekiut_56.png",
        "prompt": "A fully golden ripe apple catching autumn sunlight, perfect round form, a few leaves still attached. Deep saturation but soft watercolor edges. Chapters 5-6.",
        "target": "lesson",
        "id": "a99b6c1a-04a4-4a81-92f1-cfcf2993e03f",
        "field": "thumbnail_url",
        "label": "בקיאות פרקים ה-ו",
    },
    {
        "filename": "shir_bekiut_78.png",
        "prompt": "A harvest of golden apples overflowing from a woven basket, abundance and completion. Warm amber tones, autumn light. Chapters 7-8 — completion and mastery.",
        "target": "lesson",
        "id": "d7db2990-3444-481b-9fbc-98c2f8a73863",
        "field": "thumbnail_url",
        "label": "בקיאות פרקים ז-ח",
    },
]

# ─── OUTPUT DIR ─────────────────────────────────────────────────────────────

OUTPUT_DIR = Path(__file__).parent.parent / "public" / "images" / "shir-hashirim"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ─── IMAGEN GENERATION ──────────────────────────────────────────────────────

def generate_image(item: dict) -> tuple[dict, bytes | None]:
    """Generate one image. Returns (item, image_bytes_or_None)."""
    full_prompt = f"{STYLE}\n\nContent: {item['prompt']}"
    body = json.dumps({
        "instances":  [{"prompt": full_prompt}],
        "parameters": {
            "sampleCount": 1,
            "aspectRatio": "16:9",
            "personGeneration": "dont_allow",
            "safetySetting": "block_low_and_above",
        },
    }).encode("utf-8")

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{MODEL}:predict?key={GEMINI_API_KEY}"
    )
    req = urllib.request.Request(
        url, data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read().decode())
        predictions = result.get("predictions", [])
        if not predictions or "bytesBase64Encoded" not in predictions[0]:
            log(f"  SKIP {item['label']} — filtered by safety")
            return item, None
        return item, base64.b64decode(predictions[0]["bytesBase64Encoded"])
    except Exception as e:
        log(f"  ERROR {item['label']}: {e}")
        return item, None


# ─── SUPABASE UPLOAD ────────────────────────────────────────────────────────

def upload_to_supabase(filename: str, image_bytes: bytes) -> str | None:
    """Upload PNG to Supabase Storage. Returns public URL or None."""
    object_path = f"shir-hashirim/{filename}"
    upload_url  = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{object_path}"

    req = urllib.request.Request(
        upload_url,
        data=image_bytes,
        headers={
            "apikey":          SERVICE_KEY,
            "Authorization":   f"Bearer {SERVICE_KEY}",
            "Content-Type":    "image/png",
            "x-upsert":        "true",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            resp.read()
        # Build public URL
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{object_path}"
        return public_url
    except Exception as e:
        log(f"  UPLOAD ERROR {filename}: {e}")
        return None


# ─── SUPABASE DB PATCH ──────────────────────────────────────────────────────

def patch_db(item: dict, public_url: str) -> bool:
    """PATCH image_url or thumbnail_url on series or lessons table."""
    table = "series" if item["target"] == "series" else "lessons"
    field = item["field"]
    row_id = item["id"]

    patch_url = f"{SUPABASE_URL}/rest/v1/{table}?id=eq.{row_id}"
    body = json.dumps({field: public_url}).encode("utf-8")

    req = urllib.request.Request(
        patch_url,
        data=body,
        headers={
            "apikey":          SERVICE_KEY,
            "Authorization":   f"Bearer {SERVICE_KEY}",
            "Content-Type":    "application/json",
            "Prefer":          "return=minimal",
        },
        method="PATCH",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            resp.read()
        return True
    except Exception as e:
        log(f"  DB PATCH ERROR {item['label']}: {e}")
        return False


# ─── WORKER ─────────────────────────────────────────────────────────────────

def process_item(item: dict) -> tuple[str, bool]:
    """Full pipeline for one item: generate → save → upload → patch."""
    label = item["label"]
    filename = item["filename"]
    output_path = OUTPUT_DIR / filename

    # Skip if already generated locally (resume support)
    if output_path.exists():
        log(f"  RESUME  {label} — local file exists, re-uploading")
        image_bytes = output_path.read_bytes()
    else:
        log(f"  GEN     {label}")
        item_result, image_bytes = generate_image(item)
        if image_bytes is None:
            return label, False
        output_path.write_bytes(image_bytes)
        log(f"  SAVED   {label} → {filename} ({len(image_bytes)//1024}KB)")

    # Upload
    public_url = upload_to_supabase(filename, image_bytes)
    if not public_url:
        return label, False
    log(f"  UPLOAD  {label} → Supabase ✓")

    # Patch DB
    ok = patch_db(item, public_url)
    if ok:
        log(f"  DB      {label} → {item['field']} set ✓")
    return label, ok


# ─── MAIN ────────────────────────────────────────────────────────────────────

def main():
    start = datetime.now()
    total = len(MANIFEST)
    log(f"\n{'='*60}")
    log(f"Shir HaShirim image batch — {total} images, {MAX_WORKERS} workers")
    log(f"Model: {MODEL}  Est. cost: ${total * 0.02:.2f}")
    log(f"{'='*60}\n")

    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {pool.submit(process_item, item): item for item in MANIFEST}
        for future in concurrent.futures.as_completed(futures):
            label, ok = future.result()
            results.append((label, ok))

    elapsed = (datetime.now() - start).total_seconds()
    success = sum(1 for _, ok in results if ok)
    failed  = [label for label, ok in results if not ok]

    log(f"\n{'='*60}")
    log(f"DONE  {success}/{total} in {elapsed:.0f}s")
    if failed:
        log(f"FAILED: {', '.join(failed)}")
    log(f"{'='*60}\n")
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
