#!/usr/bin/env python3
"""
Scan the Bnei Zion Google Drive folder and report the structure.
Folder: https://drive.google.com/drive/folders/0AFz55knVlI2BUk9PVA

This script requires a valid Google OAuth token with Drive scope.
If no Drive token exists yet, it will attempt to run the OAuth flow.

Usage:
    python3 scripts/drive-scan.py
    python3 scripts/drive-scan.py --output json   # machine-readable
    python3 scripts/drive-scan.py --folder <id>   # override folder ID
"""
from __future__ import annotations
import argparse
import json
import os
import pathlib
import sys
from collections import defaultdict

# ── Config ────────────────────────────────────────────────────────────────────
CREDENTIALS_FILE = pathlib.Path(
    "/Users/saarj/Downloads/saar-workspace/the-system-v8/T-tools/04-mcp-servers/youtube/credentials.json"
)
DRIVE_TOKEN_FILE = pathlib.Path(
    "/Users/saarj/Downloads/saar-workspace/the-system-v8/T-tools/04-mcp-servers/youtube/drive_token.json"
)
ROOT_FOLDER_ID = "0AFz55knVlI2BUk9PVA"

DRIVE_SCOPES = [
    "https://www.googleapis.com/auth/drive.readonly",
]

# ── Auth ───────────────────────────────────────────────────────────────────────
def get_drive_credentials():
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from google_auth_oauthlib.flow import InstalledAppFlow

    creds = None
    if DRIVE_TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(DRIVE_TOKEN_FILE), DRIVE_SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("Refreshing Drive token...", flush=True)
            creds.refresh(Request())
            DRIVE_TOKEN_FILE.write_text(creds.to_json())
            os.chmod(DRIVE_TOKEN_FILE, 0o600)
            print("Token refreshed.", flush=True)
        else:
            print("No valid Drive token found. Starting OAuth flow...", flush=True)
            print(f"Credentials: {CREDENTIALS_FILE}", flush=True)
            if not CREDENTIALS_FILE.exists():
                print(f"ERROR: credentials.json not found at {CREDENTIALS_FILE}", file=sys.stderr)
                sys.exit(2)
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_FILE), DRIVE_SCOPES)
            creds = flow.run_local_server(port=0, open_browser=True, prompt="consent")
            DRIVE_TOKEN_FILE.write_text(creds.to_json())
            os.chmod(DRIVE_TOKEN_FILE, 0o600)
            print(f"Drive token saved to {DRIVE_TOKEN_FILE}", flush=True)

    return creds


# ── Drive helpers ─────────────────────────────────────────────────────────────
def build_drive(creds):
    from googleapiclient.discovery import build
    return build("drive", "v3", credentials=creds, cache_discovery=False)


def list_folder_contents(drive, folder_id: str, depth: int = 0, max_depth: int = 4):
    """
    Recursively list a Drive folder up to max_depth levels.
    Returns a dict with folder metadata + children.
    """
    results = []
    page_token = None

    while True:
        query = f"'{folder_id}' in parents and trashed = false"
        resp = drive.files().list(
            q=query,
            pageSize=1000,
            fields="nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink)",
            orderBy="name",
            pageToken=page_token,
        ).execute()

        items = resp.get("files", [])
        for item in items:
            is_folder = item["mimeType"] == "application/vnd.google-apps.folder"
            node = {
                "id": item["id"],
                "name": item["name"],
                "type": "folder" if is_folder else "file",
                "mimeType": item["mimeType"],
                "size": item.get("size"),
                "modifiedTime": item.get("modifiedTime"),
                "webViewLink": item.get("webViewLink"),
                "depth": depth,
                "children": [],
            }
            if is_folder and depth < max_depth:
                node["children"] = list_folder_contents(drive, item["id"], depth + 1, max_depth)
            results.append(node)

        page_token = resp.get("nextPageToken")
        if not page_token:
            break

    return results


def get_folder_info(drive, folder_id: str):
    """Get metadata for a single folder."""
    try:
        return drive.files().get(
            fileId=folder_id,
            fields="id, name, mimeType, webViewLink"
        ).execute()
    except Exception as e:
        return {"id": folder_id, "name": "(root)", "error": str(e)}


# ── Report helpers ─────────────────────────────────────────────────────────────
EXTENSION_LABELS = {
    "application/vnd.google-apps.document": "Google Doc",
    "application/vnd.google-apps.spreadsheet": "Google Sheet",
    "application/vnd.google-apps.presentation": "Google Slides",
    "application/vnd.google-apps.folder": "Folder",
    "application/pdf": "PDF",
    "audio/mpeg": "MP3",
    "audio/mp4": "M4A",
    "video/mp4": "MP4",
    "image/jpeg": "JPG",
    "image/png": "PNG",
    "application/msword": "DOC",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
}


def mime_label(mime: str) -> str:
    return EXTENSION_LABELS.get(mime, mime.split("/")[-1].upper())


def count_types(nodes: list) -> dict:
    counts: dict[str, int] = defaultdict(int)
    for node in nodes:
        if node["type"] == "file":
            counts[mime_label(node["mimeType"])] += 1
        if node["children"]:
            sub = count_types(node["children"])
            for k, v in sub.items():
                counts[k] += v
    return dict(counts)


def print_tree(nodes: list, indent: str = "", output_lines: list | None = None):
    if output_lines is None:
        output_lines = []
    for node in nodes:
        icon = "📁" if node["type"] == "folder" else "📄"
        type_label = mime_label(node["mimeType"])
        size_label = ""
        if node.get("size"):
            size_kb = int(node["size"]) / 1024
            if size_kb > 1024:
                size_label = f" ({size_kb/1024:.1f} MB)"
            else:
                size_label = f" ({size_kb:.0f} KB)"
        child_count = ""
        if node["type"] == "folder" and node["children"]:
            child_count = f" [{len(node['children'])} items]"
        line = f"{indent}{icon} {node['name']} ({type_label}){size_label}{child_count}"
        output_lines.append(line)
        if node["children"]:
            print_tree(node["children"], indent + "  ", output_lines)
    return output_lines


def summarize(tree: list) -> dict:
    """Build a summary: total files, folder names at level 1+2, type counts."""
    top_folders = [n for n in tree if n["type"] == "folder"]
    all_files = []
    def collect_files(nodes):
        for n in nodes:
            if n["type"] == "file":
                all_files.append(n)
            collect_files(n["children"])
    collect_files(tree)

    type_counts = count_types(tree)

    return {
        "root_items": len(tree),
        "top_level_folders": [n["name"] for n in top_folders],
        "total_files": len(all_files),
        "file_types": type_counts,
    }


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Scan Bnei Zion Google Drive folder")
    parser.add_argument("--output", choices=["text", "json"], default="text")
    parser.add_argument("--folder", default=ROOT_FOLDER_ID)
    parser.add_argument("--max-depth", type=int, default=4)
    args = parser.parse_args()

    print("Authenticating with Google Drive...", flush=True)
    creds = get_drive_credentials()
    drive = build_drive(creds)

    print(f"Getting folder info for: {args.folder}", flush=True)
    folder_info = get_folder_info(drive, args.folder)
    print(f"Scanning: {folder_info.get('name', args.folder)}", flush=True)
    print("(This may take a minute for large folders...)", flush=True)

    tree = list_folder_contents(drive, args.folder, depth=0, max_depth=args.max_depth)

    if args.output == "json":
        print(json.dumps({"folder": folder_info, "tree": tree}, ensure_ascii=False, indent=2))
        return

    # Text report
    summary = summarize(tree)
    print("\n" + "=" * 60)
    print(f"DRIVE SCAN REPORT — {folder_info.get('name', args.folder)}")
    print("=" * 60)
    print(f"Root items: {summary['root_items']}")
    print(f"Total files: {summary['total_files']}")
    print(f"\nTop-level folders ({len(summary['top_level_folders'])}):")
    for f in summary["top_level_folders"]:
        print(f"  - {f}")
    print(f"\nFile types:")
    for t, c in sorted(summary["file_types"].items(), key=lambda x: -x[1]):
        print(f"  {t}: {c}")

    print(f"\nFull tree (depth 0-{args.max_depth}):")
    lines = print_tree(tree)
    for line in lines:
        print(line)

    print("\n" + "=" * 60)
    print("Scan complete.")


if __name__ == "__main__":
    main()
