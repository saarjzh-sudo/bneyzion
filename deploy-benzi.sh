#!/usr/bin/env bash
# deploy-benzi.sh — פורס רק את edge function של בנצי (navigation-bot)
# ============================================================
# זה לא נוגע ב-Vercel ולא דורש git push.
# הגרסה הפרוסה של האתר נשארת ללא שינוי.
#
# שימוש: ./deploy-benzi.sh
# ============================================================
set -euo pipefail

PROJECT_REF="pzvmwfexeiruelwiujxn"
FUNCTION="navigation-bot"

# הבינארי התקין (השים ב-~/.local/bin שבור — חסר supabase-go לידו)
SUPABASE_BIN="${SUPABASE_BIN:-$HOME/.local/share/supabase/supabase}"
[ -x "$SUPABASE_BIN" ] || SUPABASE_BIN="$(command -v supabase)"

echo "🤖 פורס $FUNCTION ל-Supabase ($PROJECT_REF)..."
echo "   האתר ב-Vercel לא מושפע."
echo ""

"$SUPABASE_BIN" functions deploy "$FUNCTION" \
  --project-ref "$PROJECT_REF" \
  --no-verify-jwt

echo ""
echo "✅ $FUNCTION פרוס. לבדיקה — תשאל את בנצי שאלה באתר."
