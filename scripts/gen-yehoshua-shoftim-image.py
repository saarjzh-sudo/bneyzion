#!/usr/bin/env python3
"""Generate an elegant 2-book mockup (Yehoshua + Shoftim) for the new campaign tier.
Uses gpt-image-2 /images/edits with the existing campaign mockups as style references,
so the new image matches the cinematic golden-hour / rocky-ground look of the page."""
import os, re, base64, sys, requests

# Read the OpenAI "קלוד עיצוב" key from the central api-keys file — never hardcode it here.
KEYFILE = "/Users/srhlq/Downloads/saar-workspace/וואן-מן-שואו/סקילים/04-mcp-servers/api-keys.md"
KEY = os.environ.get("OPENAI_API_KEY_DESIGN")
if not KEY:
    with open(KEYFILE, encoding="utf-8") as f:
        m = re.search(r"sk-proj-[A-Za-z0-9_\-]+", f.read())
    KEY = m.group(0) if m else None
if not KEY:
    print("ERROR: OpenAI design key not found"); sys.exit(1)

BASE = "/Users/srhlq/Downloads/saar-workspace/bneyzion/public/images/yoav-campaign"
OUT  = os.path.join(BASE, "books-yehoshua-shoftim.jpg")

prompt = (
    "A premium editorial product photograph of TWO different hardcover books standing "
    "upright side by side on rocky desert ground at golden-hour sunset. They are a "
    "matching SERIES: same elegant cream-white cover and the same turquoise Bnei Zion "
    "emblem centered on each, but with DIFFERENT Hebrew titles below the emblem. "
    "CRITICAL — the LEFT book cover title reads exactly 'ספר יהושע', and the RIGHT book "
    "cover title reads exactly 'ספר שופטים'. Same turquoise Hebrew typography on both. "
    "Cinematic warm sunset light, soft long shadows, a blurred Israeli flag waving and "
    "an out-of-focus tank in the far background, shallow depth of field, photorealistic, "
    "high-end book-campaign aesthetic. Balanced, elegant composition. No watermarks."
)

# Order references so the model sees the Shoftim cover (right book) AND the Yehoshua mockup style.
files = [
    ("image[]", ("yoav-with-shoftim-book.jpg", open(os.path.join(BASE, "yoav-with-shoftim-book.jpg"), "rb"), "image/jpeg")),
    ("image[]", ("book-mockup-tank.jpg", open(os.path.join(BASE, "book-mockup-tank.jpg"), "rb"), "image/jpeg")),
]
data = {"model": "gpt-image-2", "prompt": prompt, "size": "1536x1024", "quality": "high"}

print("→ calling gpt-image-2 /images/edits ...", flush=True)
r = requests.post("https://api.openai.com/v1/images/edits",
                  headers={"Authorization": f"Bearer {KEY}"},
                  data=data, files=files, timeout=300)
if r.status_code != 200:
    print("ERROR", r.status_code, r.text[:800]); sys.exit(1)
b64 = r.json()["data"][0]["b64_json"]
with open(OUT, "wb") as f:
    f.write(base64.b64decode(b64))
print("✓ saved", OUT, os.path.getsize(OUT), "bytes")
