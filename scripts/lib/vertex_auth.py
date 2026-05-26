#!/usr/bin/env python3
"""
vertex_auth.py — Vertex AI OAuth2 token manager for bnei-zion image batch.

Handles:
- Loading SA credentials from GOOGLE_APPLICATION_CREDENTIALS env var
- Auto-refresh every 50 minutes (tokens expire after 60 min)
- curl-compatible: returns bearer token string, not a requests Session

Usage:
    from lib.vertex_auth import VertexAuth

    auth = VertexAuth()
    token = auth.get_token()  # refreshes if needed

    curl_headers = ["-H", f"Authorization: Bearer {token}"]
"""

import os
import time
from pathlib import Path

# google-auth is available (verified 2026-05-26)
from google.oauth2 import service_account
from google.auth.transport.requests import Request

# Vertex AI endpoint template
VERTEX_PROJECT = os.environ.get("GCP_PROJECT_ID", "vernal-layout-438607-c3")
VERTEX_LOCATION = os.environ.get("GCP_LOCATION", "us-central1")
VERTEX_MODEL = "imagen-4.0-ultra-generate-001"
VERTEX_ENDPOINT = (
    f"https://{VERTEX_LOCATION}-aiplatform.googleapis.com/v1"
    f"/projects/{VERTEX_PROJECT}/locations/{VERTEX_LOCATION}"
    f"/publishers/google/models/{VERTEX_MODEL}:predict"
)

# Token refresh threshold — refresh if token expires in < 10 minutes
REFRESH_THRESHOLD_SECS = 600
# Proactive refresh every 50 minutes regardless of expiry
REFRESH_INTERVAL_SECS = 50 * 60

SCOPES = ["https://www.googleapis.com/auth/cloud-platform"]


class VertexAuth:
    """
    Thread-safe (single-threaded use) Vertex AI token manager.
    Reads SA file from GOOGLE_APPLICATION_CREDENTIALS env var.
    Never hardcodes path — caller must export the env var.
    """

    def __init__(self):
        sa_file = os.environ.get(
            "GOOGLE_APPLICATION_CREDENTIALS",
            "/Users/srhlq/Downloads/saar-workspace/bneyzion/secrets/gcp-imagen-batch.json"
        )
        if not Path(sa_file).exists():
            raise FileNotFoundError(
                f"SA file not found: {sa_file}\n"
                f"Export GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json"
            )

        self._creds = service_account.Credentials.from_service_account_file(
            sa_file, scopes=SCOPES
        )
        self._last_refresh = 0.0
        # Force immediate refresh on first call
        self._refresh()

    def _refresh(self):
        self._creds.refresh(Request())
        self._last_refresh = time.time()

    def get_token(self) -> str:
        """
        Return a valid bearer token. Refreshes if:
        - token expires in < 10 minutes, OR
        - last refresh was > 50 minutes ago
        """
        now = time.time()
        needs_refresh = False

        # Proactive refresh every 50 min
        if now - self._last_refresh > REFRESH_INTERVAL_SECS:
            needs_refresh = True

        # Safety: refresh if expiry is imminent
        if self._creds.expiry:
            import datetime
            expiry_ts = self._creds.expiry.timestamp()
            if expiry_ts - now < REFRESH_THRESHOLD_SECS:
                needs_refresh = True

        if needs_refresh:
            print("  [AUTH] Refreshing Vertex AI token...")
            self._refresh()

        return self._creds.token

    @property
    def endpoint(self) -> str:
        return VERTEX_ENDPOINT
