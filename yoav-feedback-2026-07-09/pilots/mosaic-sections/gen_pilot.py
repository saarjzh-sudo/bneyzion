#!/usr/bin/env python3
"""פיילוטי-פסיפס רמה 13 — סגנון הכרטיס הזוהר (דור-הפלאות) כרפרנס, בלי אותיות."""
import base64, json, sys, urllib.request

import os
KEY = os.environ["GEMINI_API_KEY"]  # מ-api-keys.md
REF = "/Users/srhlq/Downloads/saar-workspace/bz-finish/integration/public/family-bible/card-dor-haplaot.jpg"

STYLE = (
    "Match EXACTLY the painting style of the reference image: luminous golden watercolor, "
    "radiant light rays breaking through, warm gold and soft teal palette, glowing ethereal "
    "atmosphere, visible watercolor texture. "
    "ABSOLUTELY NO text, NO letters, NO words, NO numbers, NO human faces. "
    "Vertical composition 3:4, center open and luminous."
)

PROMPTS = {
    "pilot_series_cover": "A glowing ancient scroll partially unrolled, bathed in golden light rays descending from above, abstract luminous watercolor",
    "pilot_section_torah": "Golden light rays over rolling Judean hills with olive trees, luminous morning mist, abstract watercolor landscape",
    "pilot_rabbis_wing": "An ancient stone arch gateway with warm golden light streaming through, luminous watercolor, inviting depth",
}

ref_b64 = base64.b64encode(open(REF, "rb").read()).decode()

for name, prompt in PROMPTS.items():
    body = {
        "contents": [{
            "parts": [
                {"inline_data": {"mime_type": "image/jpeg", "data": ref_b64}},
                {"text": f"{prompt}. {STYLE}"},
            ]
        }],
        "generationConfig": {"responseModalities": ["IMAGE"]},
    }
    req = urllib.request.Request(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "X-goog-api-key": KEY},
        method="POST",
    )
    try:
        resp = json.load(urllib.request.urlopen(req, timeout=180))
        parts = resp["candidates"][0]["content"]["parts"]
        img = next(p for p in parts if "inlineData" in p)
        out = f"{name}.jpg"
        open(out, "wb").write(base64.b64decode(img["inlineData"]["data"]))
        print(f"OK {out}")
    except Exception as e:
        print(f"ERR {name}: {e}")
