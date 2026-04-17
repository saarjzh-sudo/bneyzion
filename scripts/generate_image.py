#!/usr/bin/env python3
"""
Image Generator - Spiritual Watercolor Style
Uses Google Imagen 4 via Gemini API (REST)

Usage:
  python generate_image.py "content prompt" [filename.png] [aspect_ratio] [quality]

Aspect ratios: 16:9 (default), 1:1, 9:16, 4:3, 3:4
Quality:       standard (default, $0.04), fast ($0.02 - drafts), ultra ($0.06 - best quality + 2K)

Examples:
  python generate_image.py "A single seed sprouting upward into golden light"
  python generate_image.py "Mist clearing over a calm river" "parasha.png" "16:9"
  python generate_image.py "Abstract forms gathering toward light" "community.png" "1:1" "ultra"
  python generate_image.py "Quick draft" "draft.png" "16:9" "fast"
"""

import os
import sys
import json
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path


# ─────────────────────────────────────────────
# MODEL VARIANTS — Imagen 4 (Imagen 3 is shut down)
# ─────────────────────────────────────────────
MODELS = {
    "standard": "imagen-4.0-generate-001",        # $0.04/image — daily use
    "fast":     "imagen-4.0-fast-generate-001",   # $0.02/image — drafts & iteration
    "ultra":    "imagen-4.0-ultra-generate-001",  # $0.06/image — max quality, supports 2K
}

# ─────────────────────────────────────────────
# FIXED STYLE — never changes between images
# ─────────────────────────────────────────────
STYLE_CONSTANTS = """Minimalist watercolor painting on white textured paper.
Ultra-clean, gentle, soft, ethereal, atmospheric, meditative, spiritually evocative.
Loose watercolor washes, muted pastel tones (sage green, dusty teal, soft blue-gray,
warm sand, wheat, pale gold, quiet lavender, blush rose).
Visible paper grain, gentle gradients, completely soft edges.
No harsh lines. No dark outlines. No explicit human figures. No text or letters.
Generous white space — leave the center open and luminous.
Abstract representation, impressionistic style, spiritual ambiance."""


def get_api_key():
    """Get the Gemini API key from environment."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("\n❌ GEMINI_API_KEY not found in environment variables.")
        print("   Fix:")
        print('   1. Open terminal and run: setx GEMINI_API_KEY "your-key-here"')
        print("   2. Close and reopen Claude Code")
        print("   3. Run this script again.\n")
        sys.exit(1)
    return api_key


def build_full_prompt(content_prompt: str) -> str:
    """Combine the fixed style with the dynamic content."""
    return f"{STYLE_CONSTANTS}\n\nContent to visualize: {content_prompt}"


def generate_image(
    content_prompt: str,
    filename: str = None,
    aspect_ratio: str = "16:9",
    quality: str = "standard",
    image_size: str = None,
) -> str:
    """
    Generate a watercolor image using Google Imagen 4 (REST API).

    Args:
        content_prompt: Description of what to visualize (spiritual/abstract)
        filename:       Output filename (optional, auto-generated if not provided)
        aspect_ratio:   "16:9", "1:1", "9:16", "4:3", "3:4"
        quality:        "standard" ($0.04), "fast" ($0.02), "ultra" ($0.06)
        image_size:     "1K" (default) or "2K" (ultra only) — None = use default

    Returns:
        Path to the saved image
    """
    api_key   = get_api_key()
    model_id  = MODELS.get(quality, MODELS["standard"])
    full_prompt = build_full_prompt(content_prompt)

    # 2K only available on standard and ultra
    if image_size == "2K" and quality == "fast":
        print("⚠️  2K not available with 'fast' quality — switching to 'standard'.")
        quality  = "standard"
        model_id = MODELS["standard"]

    print(f"\n🎨 Generating image...")
    print(f"   Model:   {model_id}")
    print(f"   Format:  {aspect_ratio}")
    if image_size:
        print(f"   Size:    {image_size}")
    print(f"   Content: {content_prompt[:80]}{'...' if len(content_prompt) > 80 else ''}\n")

    # Build request body
    parameters = {
        "sampleCount": 1,
        "aspectRatio": aspect_ratio,
        "personGeneration": "dont_allow",
        "safetySetting": "block_low_and_above",
    }
    if image_size:
        parameters["imageSize"] = image_size

    body = json.dumps({
        "instances":  [{"prompt": full_prompt}],
        "parameters": parameters,
    }).encode("utf-8")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:predict?key={api_key}"

    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        print(f"❌ API Error {e.code}: {error_body}")
        sys.exit(1)

    predictions = result.get("predictions", [])
    if not predictions or "bytesBase64Encoded" not in predictions[0]:
        print("❌ No image was generated. The prompt may have been filtered.")
        print("   Try rephrasing to be more abstract or atmospheric.")
        sys.exit(1)

    import base64
    image_bytes = base64.b64decode(predictions[0]["bytesBase64Encoded"])

    # ── Save the image ──────────────────────────────────────────────
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_filename = filename or f"verse_{timestamp}.png"

    script_dir   = Path(__file__).resolve().parent
    project_root = script_dir.parent.parent.parent  # up 3 levels

    output_dir = project_root / "O-output" / "images"
    output_dir.mkdir(parents=True, exist_ok=True)

    output_path = output_dir / output_filename
    with open(str(output_path), "wb") as f:
        f.write(image_bytes)

    size_kb = len(image_bytes) / 1024
    print(f"✅ Image saved to: {output_path}")
    print(f"   Size: {size_kb:.1f} KB\n")

    return str(output_path)


# ─────────────────────────────────────────────
# CLI entry point
# ─────────────────────────────────────────────
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)

    content  = sys.argv[1]
    fname    = sys.argv[2] if len(sys.argv) > 2 else None
    ratio    = sys.argv[3] if len(sys.argv) > 3 else "16:9"
    quality  = sys.argv[4] if len(sys.argv) > 4 else "standard"

    generate_image(content, fname, ratio, quality)
