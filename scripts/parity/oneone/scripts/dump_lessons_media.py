#!/usr/bin/env python3
"""READ-ONLY supplementary dump for global_match.py: lessons media columns
(legacy_attachment_url, audio_url, video_url, additional_attachments) — the gold
match keys that newdb_lessons.json does not carry.
Writes oneone/newdb_lessons_media.json. Uses sbq.py (keyset pagination, SELECT only)."""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.dirname(HERE)                      # oneone/
PARITY = os.path.dirname(BASE)                    # scripts/parity/
sys.path.insert(0, PARITY)
from sbq import run  # noqa: E402

rows_all = []
last_id = "00000000-0000-0000-0000-000000000000"
while True:
    sql = f"""SELECT id, legacy_attachment_url, audio_url, video_url, additional_attachments
FROM lessons
WHERE (legacy_attachment_url IS NOT NULL OR audio_url IS NOT NULL OR video_url IS NOT NULL
       OR (additional_attachments IS NOT NULL AND additional_attachments::text NOT IN ('[]','{{}}','null')))
  AND id > '{last_id}'
ORDER BY id LIMIT 2000"""
    rows = json.loads(run(sql))
    if isinstance(rows, dict):
        print("ERROR:", rows)
        sys.exit(1)
    rows_all.extend(rows)
    print("chunk", len(rows), "total", len(rows_all), flush=True)
    if len(rows) < 2000:
        break
    last_id = rows[-1]["id"]

out = os.path.join(BASE, "newdb_lessons_media.json")
with open(out, "w", encoding="utf-8") as f:
    json.dump(rows_all, f, ensure_ascii=False)
print("saved", len(rows_all), "->", out)
