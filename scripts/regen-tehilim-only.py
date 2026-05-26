#!/usr/bin/env python3
"""
Regenerate ONLY תהילים with v3.1 prompt (single golden string, no full harp).
Saves to Desktop for Saar review before full Phase 1 batch.
Also uploads to Storage and updates DB.

Run: python3 scripts/regen-tehilim-only.py
"""

import json
import os
import subprocess
import base64
import tempfile
import time
from pathlib import Path

GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyDSFo7xhRUELzqw8ra8z1fIWvS-FqqbLV8")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://pzvmwfexeiruelwiujxn.supabase.co")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
BUCKET = "bnei-zion-thumbnails"
STORAGE_PATH = "books/tehilim.png"
DESKTOP_OUT = Path.home() / "Desktop" / "bnei-zion-test-3-books" / "tehilim-v3.1.png"
SCRIPT_DIR = Path(__file__).parent
STATE_FILE = SCRIPT_DIR / "image-batch-state.json"
COST_PER_IMAGE = 0.06

STYLE = (
    "Minimalist watercolor painting on white textured paper. "
    "Ultra-clean, gentle, soft, ethereal, atmospheric, meditative, spiritually evocative. "
    "Loose watercolor washes, muted pastel tones — sage green, dusty teal, soft blue-gray, "
    "warm sand, wheat, pale gold, quiet lavender, blush rose. "
    "Visible paper grain, gentle gradients, completely soft edges. "
    "No harsh lines. No dark outlines. No explicit human figures. "
    "ABSOLUTELY NO TEXT, NO LETTERS, NO HEBREW CHARACTERS, NO ENGLISH CHARACTERS, "
    "NO TYPOGRAPHY, NO CALLIGRAPHY anywhere in the image. "
    "Generous white space — leave the center open and luminous. "
    "Abstract representation, impressionistic style, spiritual ambiance."
)

TEHILIM_PROMPT = (
    "Abstract spiritual representation of prayer, praise, and the full emotional range "
    "of the human heart reaching toward the divine. "
    "A single golden string of light vibrating gently in the center, "
    "surrounded by soft watercolor washes of warm gold, quiet lavender, and pale rose. "
    "Tender, intimate atmosphere, generous white space. "
    "No human figures, no faces, no letters, no text."
)

def run_curl(args):
    cmd = ["curl", "--noproxy", "*"] + args
    result = subprocess.run(cmd, capture_output=True, text=False)
    return result

def main():
    if not SERVICE_KEY:
        print("[ERROR] SUPABASE_SERVICE_ROLE_KEY not set. Source .env first.")
        exit(1)

    print("=" * 60)
    print("Regenerate תהילים — v3.1 (single golden string)")
    print("=" * 60)

    DESKTOP_OUT.parent.mkdir(parents=True, exist_ok=True)

    full_prompt = f"{STYLE}\n\nContent to visualize: {TEHILIM_PROMPT}"
    payload = json.dumps({
        "instances": [{"prompt": full_prompt}],
        "parameters": {
            "sampleCount": 1,
            "aspectRatio": "16:9",
            "personGeneration": "dont_allow",
            "safetySetting": "block_low_and_above"
        }
    })

    url = f"https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-ultra-generate-001:predict?key={GEMINI_KEY}"

    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
        tmp_path = tmp.name

    print("Generating image via Imagen 4 Ultra...")
    for attempt in range(3):
        result = run_curl([
            "-s", "-o", tmp_path, "-w", "%{http_code}",
            "-X", "POST", url,
            "-H", "Content-Type: application/json",
            "--data", payload
        ])
        http_code = result.stdout.decode().strip() if result.stdout else "000"

        if http_code == "200":
            resp = json.loads(Path(tmp_path).read_text())
            os.unlink(tmp_path)
            b64 = resp["predictions"][0]["bytesBase64Encoded"]
            img_bytes = base64.b64decode(b64)

            # Save to Desktop for review
            DESKTOP_OUT.write_bytes(img_bytes)
            size_kb = DESKTOP_OUT.stat().st_size // 1024
            print(f"[OK] Saved to Desktop: {DESKTOP_OUT} ({size_kb}KB)")

            # Upload to Storage (overwrite old tehilim.png)
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as stmp:
                stmp_path = stmp.name
            Path(stmp_path).write_bytes(img_bytes)

            upload_url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{STORAGE_PATH}"
            with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as rtmp:
                rtmp_path = rtmp.name

            ures = run_curl([
                "-s", "-o", rtmp_path, "-w", "%{http_code}",
                "-X", "POST", upload_url,
                "-H", f"Authorization: Bearer {SERVICE_KEY}",
                "-H", "Content-Type: image/png",
                "-H", "x-upsert: true",
                "--data-binary", f"@{stmp_path}"
            ])
            ucode = ures.stdout.decode().strip() if ures.stdout else "000"
            Path(stmp_path).unlink(missing_ok=True)

            if ucode == "200":
                public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{STORAGE_PATH}"
                print(f"[UPLOAD OK] {public_url}")

                # Update DB
                import urllib.parse
                encoded_book = urllib.parse.quote("תהילים")
                filter_params = (
                    f"bible_book=eq.{encoded_book}"
                    f"&bible_chapter=is.null"
                )
                db_url = f"{SUPABASE_URL}/rest/v1/lessons?{filter_params}"

                with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as dtmp:
                    dtmp_path = dtmp.name

                dres = run_curl([
                    "-s", "-o", dtmp_path, "-w", "%{http_code}",
                    "-X", "PATCH", db_url,
                    "-H", f"Authorization: Bearer {SERVICE_KEY}",
                    "-H", f"apikey: {SERVICE_KEY}",
                    "-H", "Content-Type: application/json",
                    "-H", "Prefer: return=minimal,count=exact",
                    "-d", json.dumps({"thumbnail_url": public_url})
                ])
                dcode = dres.stdout.decode().strip() if dres.stdout else "000"
                os.unlink(dtmp_path)

                if dcode in ("200", "204"):
                    print("[DB OK] תהילים lessons updated")
                else:
                    print(f"[DB WARN] HTTP {dcode}")

                # Mark as completed in state
                state = json.loads(STATE_FILE.read_text()) if STATE_FILE.exists() else {
                    "phase1": {"completed": [], "failed": []},
                    "phase2": {"completed": [], "failed": []},
                    "phase3": {"completed": [], "failed": []},
                    "total_cost": 0.0
                }
                if "תהילים" not in state["phase1"]["completed"]:
                    state["phase1"]["completed"].append("תהילים")
                state["total_cost"] = round(state.get("total_cost", 0) + COST_PER_IMAGE, 4)
                STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2))
                print(f"[STATE] תהילים marked complete. Total cost: ${state['total_cost']:.2f}")

            else:
                err = Path(rtmp_path).read_text()[:200]
                os.unlink(rtmp_path)
                print(f"[UPLOAD FAIL] HTTP {ucode}: {err}")

            print()
            print("=" * 60)
            print("STOP — send Desktop image to Saar for final v3.1 approval.")
            print(f"File: {DESKTOP_OUT}")
            print("After approval, run: python3 scripts/image-batch-phase1.py")
            print("=" * 60)
            return

        elif http_code == "429":
            wait = 60 * (attempt + 1)
            os.unlink(tmp_path)
            print(f"[RATE LIMIT] 429 — waiting {wait}s")
            time.sleep(wait)
        else:
            err = Path(tmp_path).read_text()[:300]
            os.unlink(tmp_path)
            print(f"[FAIL] HTTP {http_code}: {err}")
            return

    print("[FAIL] Max retries exceeded")


if __name__ == "__main__":
    main()
