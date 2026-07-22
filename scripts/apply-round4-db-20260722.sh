#!/bin/bash
# סבב 22.7 (קורסים דיגיטליים) — כל פעולות ה-DB של הסבב בפקודה אחת, לפי הסדר.
# ההרצה נחסמה לקלוד ע"י מסווג-ההרשאות — סער מריץ / מאשר לקלוד להריץ.
#
# מה זה עושה:
#   1. שתי מיגרציות SQL (Management API): short_links + orders_admin_policy
#   2. תיקון גישת "איך לומדים תנ"ך" (open → requires_tag, price 165)
#   3. בניית קורסי-ספר בודדים: עזרא, נחמיה, דניאל (weekly בלבד)
#   4. ייבוא קורס "למה ללמוד תנ"ך" (21 שיעורים)
set -euo pipefail
cd "$(dirname "$0")/.."

KEYS_FILE="/Users/srhlq/Downloads/saar-workspace/וואן-מן-שואו/סקילים/04-mcp-servers/api-keys.md"
export SUPABASE_SERVICE_ROLE_BNEYZION=$(grep -o 'SUPABASE_SERVICE_ROLE_BNEYZION=\S*' "$KEYS_FILE" | cut -d= -f2)
SBP=$(grep -o 'sbp_bddd[A-Za-z0-9]*' "$KEYS_FILE" | head -1)

run_sql () {
  python3 - "$1" << 'EOF'
import json, sys, urllib.request, os
sql = open(sys.argv[1]).read()
body = json.dumps({"query": sql}).encode()
req = urllib.request.Request(
    "https://api.supabase.com/v1/projects/pzvmwfexeiruelwiujxn/database/query",
    data=body, method="POST",
    headers={"Authorization": "Bearer " + os.environ["SBP"], "Content-Type": "application/json",
             "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"})
print(sys.argv[1], "→", urllib.request.urlopen(req).status)
EOF
}
export SBP

echo "── 1. מיגרציות SQL ──"
run_sql supabase/migrations/20260722_short_links.sql
run_sql supabase/migrations/20260722_orders_admin_policy.sql

echo "── 2. גישת איך-לומדים-תנ\"ך ──"
python3 scripts/fix-how-to-learn-access-20260722.py --apply

echo "── 3. קורסי-ספר בודדים ──"
python3 scripts/build-standalone-book-courses.py --apply

echo "── 4. ייבוא למה-ללמוד-תנ\"ך ──"
python3 scripts/why-learn-import/import.py --apply

echo "✓ הכול הוחל. עכשיו אפשר לפרוס את הקוד (vercel deploy --prod) ולאמת."
