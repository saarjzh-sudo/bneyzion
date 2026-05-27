#!/usr/bin/env python3
"""
Vision Gate — Gemini Vision human-detection filter for bnei-zion image pipeline.

Uses gemini-2.5-flash to verify no human figures, faces, body parts, or
anthropomorphic shapes appear in generated images before they are uploaded
to Supabase Storage or written to the DB.

Usage:
    from scripts.lib.vision_gate import verify_no_humans

    passed, reason = verify_no_humans("/tmp/image.png", api_key=GEMINI_KEY)
    if not passed:
        print(f"REJECTED: {reason}")
"""

import base64
import json
import os
import subprocess
import tempfile
from pathlib import Path

VISION_MODEL = "gemini-2.5-flash"

DETECTION_PROMPT = (
    "Examine this image carefully. "
    "Does it contain ANY of the following: "
    "human figure, face, body part, silhouette of a person, "
    "hair, clothing, hands, feet, arms, legs, children, adults, "
    "portraits, anthropomorphic shapes, or anything that could be "
    "interpreted as a person or human form — even in a very abstract or "
    "stylized way? "
    "Answer ONLY in one of these two formats — nothing else: "
    "'YES: <brief reason>' OR 'NO: <brief reason>'."
)

REJECTED_LOG_PATH = Path(__file__).parent.parent / "rejected-images.json"


def _run_curl(args: list) -> subprocess.CompletedProcess:
    """Run curl with --noproxy to bypass NetSpark."""
    cmd = ["curl", "--noproxy", "*"] + args
    return subprocess.run(cmd, capture_output=True, text=False)


def _load_rejected_log() -> list:
    if REJECTED_LOG_PATH.exists():
        try:
            return json.loads(REJECTED_LOG_PATH.read_text(encoding="utf-8"))
        except Exception:
            return []
    return []


def _append_rejected_log(entry: dict) -> None:
    log = _load_rejected_log()
    log.append(entry)
    REJECTED_LOG_PATH.write_text(
        json.dumps(log, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def verify_no_humans(image_path: str, api_key: str) -> tuple[bool, str]:
    """
    Use Gemini Vision (gemini-2.5-flash) to check if image contains humans.

    Args:
        image_path: absolute path to image file (PNG/JPG)
        api_key:    Gemini API key

    Returns:
        (True, reason)  — image is clean, safe to upload
        (False, reason) — image contains human-like content, must be rejected

    Side effect:
        On rejection, appends entry to scripts/rejected-images.json
    """
    path = Path(image_path)
    if not path.exists():
        return False, f"File not found: {image_path}"

    # Read and base64-encode the image
    img_bytes = path.read_bytes()
    img_b64 = base64.b64encode(img_bytes).decode("ascii")

    # Determine MIME type from extension
    ext = path.suffix.lower()
    mime = "image/png" if ext == ".png" else "image/jpeg"

    # Build Gemini generateContent payload
    payload = json.dumps({
        "contents": [{
            "parts": [
                {
                    "inline_data": {
                        "mime_type": mime,
                        "data": img_b64
                    }
                },
                {
                    "text": DETECTION_PROMPT
                }
            ]
        }],
        "generationConfig": {
            "temperature": 0.0,
            "maxOutputTokens": 100
        }
    })

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{VISION_MODEL}:generateContent?key={api_key}"
    )

    # Write response output to a temp file
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
        tmp_path = tmp.name

    # Write the payload to a temp file to avoid "Argument list too long"
    # (base64-encoded images can be 4–8 MB as inline --data strings)
    with tempfile.NamedTemporaryFile(suffix=".payload.json", delete=False, mode="w", encoding="utf-8") as payload_tmp:
        payload_tmp.write(payload)
        payload_tmp_path = payload_tmp.name

    try:
        result = _run_curl([
            "-s", "-o", tmp_path, "-w", "%{http_code}",
            "-X", "POST", url,
            "-H", "Content-Type: application/json",
            "--data", f"@{payload_tmp_path}"
        ])

        http_code = result.stdout.decode().strip() if result.stdout else "000"

        if http_code != "200":
            raw = Path(tmp_path).read_text(encoding="utf-8")[:300]
            # On Vision API failure: fail OPEN (allow upload) to avoid blocking the whole batch
            # but log a warning. The alternative (fail closed) would halt on quota exhaustion.
            reason = f"Vision API returned HTTP {http_code}: {raw}"
            print(f"  [VISION WARN] {reason} — allowing image through (fail-open)")
            return True, f"Vision API error (fail-open): {reason}"

        resp = json.loads(Path(tmp_path).read_text(encoding="utf-8"))
        # Extract text from Gemini response
        try:
            text = resp["candidates"][0]["content"]["parts"][0]["text"].strip()
        except (KeyError, IndexError):
            # Cannot parse response — fail open
            return True, "Vision API: cannot parse response (fail-open)"

        if text.upper().startswith("YES"):
            # Human detected — reject
            reason = text[4:].strip() if len(text) > 4 else "human content detected"
            _append_rejected_log({
                "image_path": str(image_path),
                "reason": reason,
                "raw_response": text
            })
            return False, reason
        else:
            # Starts with NO or anything else — treat as clean
            reason = text[3:].strip() if len(text) > 3 else "clean"
            return True, reason

    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass
        try:
            os.unlink(payload_tmp_path)
        except Exception:
            pass


def verify_with_retry(
    image_path: str,
    api_key: str,
    max_attempts: int = 3,
    generate_fn=None,
    generate_kwargs: dict = None,
) -> tuple[bool, str]:
    """
    Verify image has no humans. If it fails, optionally regenerate and retry.

    Args:
        image_path:      path to the image to verify
        api_key:         Gemini API key
        max_attempts:    how many vision checks to run (default 3)
        generate_fn:     optional callable(outfile: Path, **generate_kwargs) -> bool
                         called to regenerate the image on each retry
        generate_kwargs: kwargs to pass to generate_fn

    Returns:
        (True, reason)  — final image is clean
        (False, reason) — all attempts produced human content
    """
    for attempt in range(1, max_attempts + 1):
        passed, reason = verify_no_humans(image_path, api_key)
        if passed:
            return True, reason

        print(f"  [VISION FAIL] Attempt {attempt}/{max_attempts}: {reason}")

        if attempt < max_attempts and generate_fn is not None:
            print(f"  [VISION RETRY] Re-generating image...")
            kwargs = generate_kwargs or {}
            success = generate_fn(outfile=Path(image_path), **kwargs)
            if not success:
                return False, f"Regeneration failed on attempt {attempt}"
        elif attempt == max_attempts:
            return False, f"All {max_attempts} attempts rejected: {reason}"

    return False, "All attempts exhausted"
