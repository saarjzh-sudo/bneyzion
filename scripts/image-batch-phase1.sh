#!/bin/bash
# ============================================================
# Phase 1 — Book images (39 unique bible_book values)
# Target: UPDATE lessons SET thumbnail_url WHERE bible_chapter IS NULL
# Cost: ~39 × $0.06 = $2.34
# Resume: reads/writes scripts/image-batch-state.json
# ============================================================
set -euo pipefail

GEMINI_KEY="AIzaSyDSFo7xhRUELzqw8ra8z1fIWvS-FqqbLV8"
SUPABASE_URL="https://pzvmwfexeiruelwiujxn.supabase.co"
SERVICE_KEY="SUPABASE_SERVICE_ROLE_REDACTED"
MGMT_PAT="SUPABASE_MGMT_PAT_REDACTED"
PROJECT_REF="pzvmwfexeiruelwiujxn"
BUCKET="bnei-zion-thumbnails"
STATE_FILE="$(dirname "$0")/image-batch-state.json"
DRY_RUN="${DRY_RUN:-0}"

# ── Style (locked — do not modify) ──────────────────────────
STYLE="Minimalist watercolor painting on white textured paper. Ultra-clean, gentle, soft, ethereal, atmospheric, meditative, spiritually evocative. Loose watercolor washes, muted pastel tones — sage green, dusty teal, soft blue-gray, warm sand, wheat, pale gold, quiet lavender, blush rose. Visible paper grain, gentle gradients, completely soft edges. No harsh lines. No dark outlines. No explicit human figures. ABSOLUTELY NO TEXT, NO LETTERS, NO HEBREW CHARACTERS, NO ENGLISH CHARACTERS, NO TYPOGRAPHY, NO CALLIGRAPHY anywhere in the image. Generous white space — leave the center open and luminous. Abstract representation, impressionistic style, spiritual ambiance."

# ── Book → English description map ──────────────────────────
declare -A BOOK_DESC
BOOK_DESC["בראשית"]="Genesis — the book of creation, the founding narratives of humanity and the patriarchs. Swirling cosmic light separating from darkness, the first dawn, gentle forms of earth and water taking shape."
BOOK_DESC["שמות"]="Exodus — liberation from Egypt, the journey through the desert, and the revelation at Sinai. Parting waters, desert sands, luminous cloud and fire pillars, the awe of divine encounter."
BOOK_DESC["ויקרא"]="Leviticus — the sacred order of priestly service, holiness, and moral law. Soft altar flames, incense wisps rising, the radiance of sanctity and purity."
BOOK_DESC["במדבר"]="Numbers — forty years of wandering in the wilderness, tribal community, and faith tested. Vast desert landscapes, the wandering cloud, encampments of tents under an infinite sky."
BOOK_DESC["דברים"]="Deuteronomy — Moses' final teachings and the covenant renewed before entering the land. A solitary figure on a mountain peak, the promised land shimmering in the distance."
BOOK_DESC["יהושע"]="Joshua — the crossing of the Jordan and the conquest of the land of Israel. Flowing river waters, the walls of a city dissolving into light, dawn breaking over a promised land."
BOOK_DESC["שופטים"]="Judges — the cycles of faith, failure, and redemption in the early settlement period. Alternating light and shadow, turbulent yet ultimately hopeful atmosphere."
BOOK_DESC["שמואל"]="Samuel — the rise of prophecy, the first kings, and the establishment of the monarchy in Israel. Royal purple and gold, a young prophet listening in the night, an anointing with oil."
BOOK_DESC["שמואל א"]="First Samuel — Eli and Samuel, the ark of the covenant, and the transition to kingship. Lamp light in the Tabernacle, the ark carried in reverence, the anointing of a shepherd king."
BOOK_DESC["שמואל ב"]="Second Samuel — King David's reign, his psalms, triumphs, and failures. A harp silhouetted against a golden sky, the City of David on a hill, complex human emotion in warm tones."
BOOK_DESC["מלכים"]="Kings — the divided monarchy, prophets like Elijah, the Temple and its destruction. The Temple's golden glory fading into twilight, a prophet's cloak blowing in the wind."
BOOK_DESC["מלכים א"]="First Kings — Solomon's wisdom and the Temple's construction, then the kingdom's division. The Temple's radiant glory at its peak, architectural grandeur in warm gold and cedar."
BOOK_DESC["מלכים ב"]="Second Kings — the fall of the northern and southern kingdoms, exile to Babylon. A city dissolving into mist, exiles journeying under a weeping sky, hope still glowing on the horizon."
BOOK_DESC["ישעיהו"]="Isaiah — majestic prophetic visions of justice, redemption, and the messianic era. Soaring heavenly light breaking through storm clouds, a luminous vision of peace and universal hope."
BOOK_DESC["ירמיהו"]="Jeremiah — the prophet of anguish witnessing Jerusalem's destruction and calling for return. Tears and grief dissolving into hope, dark storm lifting, green shoots emerging from ruins."
BOOK_DESC["יחזקאל"]="Ezekiel — visionary prophecy, the divine chariot, the valley of dry bones restored. Radiant cosmic wheels, a valley of bones rising with new life, ethereal divine presence."
BOOK_DESC["הושע"]="Hosea — the metaphor of faithful love, Israel's straying and the call to return. A tender reunion suggested in soft light, longing and forgiveness woven in warm rose and gold."
BOOK_DESC["יואל"]="Joel — the locust plague, repentance, and the outpouring of divine spirit. Agricultural abundance followed by desolation then restoration, the spirit poured like rain."
BOOK_DESC["עמוס"]="Amos — the prophet of justice, speaking for the poor against social injustice. Bold scales of justice, market scenes in muted tones, a prophetic voice cutting through complacency."
BOOK_DESC["עובדיה"]="Obadiah — the shortest prophetic book, addressing Edom's fall and Zion's future. A mountain landscape, an eagle descending, ultimately the victory of justice."
BOOK_DESC["יונה"]="Jonah — the reluctant prophet, the great fish, and divine compassion for all peoples. Deep ocean blues and greens, a small figure inside a luminous belly, dawn breaking after darkness."
BOOK_DESC["מיכה"]="Micah — justice, mercy, and walking humbly — the essence of moral living. Humble village life, scales of justice, the promise of an era of peace."
BOOK_DESC["נחום"]="Nahum — the downfall of Nineveh and divine justice against cruelty. A great city dissolving in turbulent water and wind, justice arriving like a storm."
BOOK_DESC["חבקוק"]="Habakkuk — the prophet who dares to question God and receives a vision of patient faith. A lone watcher on a tower, cosmic tension resolving into luminous trust."
BOOK_DESC["צפניה"]="Zephaniah — the day of judgment and the promise of joyful restoration. Dark clouds giving way to golden light, a remnant of quiet faithful souls."
BOOK_DESC["חגי"]="Haggai — the call to rebuild the Temple after the return from exile. Foundations being laid, hands working together, the renewed Temple rising in soft light."
BOOK_DESC["זכריה"]="Zechariah — visions of restoration, the messianic era, and Jerusalem's renewal. Luminous apocalyptic imagery softened into watercolor dreamscapes, candelabras and olive trees."
BOOK_DESC["מלאכי"]="Malachi — the last prophet, calling for covenant renewal before the great day. A closing chapter, the setting sun of prophecy, a small flame kept burning."
BOOK_DESC["תהילים"]="Psalms — the universal language of the human heart in prayer, praise, and lament. Musical waves of light, hands raised in prayer, the full emotional spectrum of human-divine relationship."
BOOK_DESC["תהלים"]="Psalms (alternate spelling) — songs of praise, lament, and trust across all human experiences. Lyrical waves of soft color, an open heart reaching upward in quiet devotion."
BOOK_DESC["משלי"]="Proverbs — wisdom personified, practical moral teaching for everyday life. A wise elder and youth in conversation, the Tree of Life suggested in branching golden forms."
BOOK_DESC["איוב"]="Job — the great trial of faith, suffering, and divine encounter beyond human comprehension. Storm clouds and whirlwind giving way to awe, a figure small before cosmic vastness."
BOOK_DESC["שיר השירים"]="Song of Songs — the poetry of love, longing, and the sacred relationship between Israel and the divine. Blooming flowers, soft rose and gold light, the beauty of spring in the beloved's garden."
BOOK_DESC["רות"]="Ruth — loyalty, kindness, and the beauty of choosing belonging. Golden fields of grain at harvest time, two women walking together, warmth of Bethlehem at dusk."
BOOK_DESC["קהלת"]="Ecclesiastes — the search for meaning, the cycles of time, and wisdom beyond vanity. Sun rising and setting, rivers flowing to the sea, the quiet wisdom of accepting life's rhythms."
BOOK_DESC["איכה"]="Lamentations — mourning Jerusalem's destruction, tears, and the beginning of hope. Tears falling on ancient stones, a city in ruins softened into watercolor, a single candle still burning."
BOOK_DESC["אסתר"]="Esther — the hidden miracle, courage, and the reversal of decree. Royal court in soft purple and gold, a young woman standing with quiet courage, the hidden hand of providence."
BOOK_DESC["דניאל"]="Daniel — faith in exile, prophetic visions, and divine protection. Lions' den lit by divine light, cosmic visions of beasts and angels, gold and blue celestial imagery."
BOOK_DESC["עזרא"]="Ezra — the return from exile and the restoration of Torah study. Scrolls unrolling, returnees streaming toward a rebuilt Jerusalem, the joy of homecoming."
BOOK_DESC["נחמיה"]="Nehemiah — rebuilding Jerusalem's walls, communal renewal, and dedicated leadership. Walls rising stone by stone, a community working together, ancient gates renewed."
BOOK_DESC["דברי הימים"]="Chronicles — the grand sweep of history retold with a focus on Temple worship and the covenant. An overview of many generations, the Temple as the golden center of history."
BOOK_DESC["דברי הימים א"]="First Chronicles — genealogies to David, the preparation for the Temple. Ancient family trees becoming living light, the arc of history bending toward the sacred."
BOOK_DESC["דברי הימים ב"]="Second Chronicles — Solomon's Temple and the kings of Judah through the exile. The Temple in its full glory, the long history of faithfulness and failure, ending with hope of return."

# ── State management ─────────────────────────────────────────
init_state() {
  if [ ! -f "$STATE_FILE" ]; then
    echo '{"phase1":{"completed":[],"failed":[]},"phase2":{"completed":[],"failed":[]},"phase3":{"completed":[],"failed":[]},"total_cost":0}' > "$STATE_FILE"
    echo "State file initialized: $STATE_FILE"
  fi
}

is_completed() {
  local key="$1"
  local phase="$2"
  jq -e --arg k "$key" ".${phase}.completed | index(\$k) != null" "$STATE_FILE" >/dev/null 2>&1
}

mark_completed() {
  local key="$1"
  local phase="$2"
  local tmp=$(mktemp)
  jq --arg k "$key" --arg p "$phase" '.[$p].completed += [$k]' "$STATE_FILE" > "$tmp" && mv "$tmp" "$STATE_FILE"
}

mark_failed() {
  local key="$1"
  local phase="$2"
  local tmp=$(mktemp)
  jq --arg k "$key" --arg p "$phase" '.[$p].failed += [$k]' "$STATE_FILE" > "$tmp" && mv "$tmp" "$STATE_FILE"
}

add_cost() {
  local amt="$1"
  local tmp=$(mktemp)
  jq --argjson a "$amt" '.total_cost += $a' "$STATE_FILE" > "$tmp" && mv "$tmp" "$STATE_FILE"
}

# ── Imagen generation ─────────────────────────────────────────
generate_image() {
  local content="$1"
  local outfile="$2"
  local prompt="${STYLE}

Content to visualize: ${content}"

  local payload
  payload=$(jq -n --arg p "$prompt" '{
    instances: [{prompt: $p}],
    parameters: {
      sampleCount: 1,
      aspectRatio: "16:9",
      personGeneration: "dont_allow",
      safetySetting: "block_low_and_above"
    }
  }')

  local tmp_resp="/tmp/imagen-resp-$$.json"
  local http
  http=$(curl --noproxy '*' -s -o "$tmp_resp" -w "%{http_code}" \
    -X POST "https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-ultra-generate-001:predict?key=${GEMINI_KEY}" \
    -H "Content-Type: application/json" \
    --data "$payload")

  if [ "$http" = "429" ]; then
    echo "  [RATE LIMIT] HTTP 429 — waiting 60s..."
    rm -f "$tmp_resp"
    sleep 60
    # Retry once
    http=$(curl --noproxy '*' -s -o "$tmp_resp" -w "%{http_code}" \
      -X POST "https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-ultra-generate-001:predict?key=${GEMINI_KEY}" \
      -H "Content-Type: application/json" \
      --data "$payload")
  fi

  if [ "$http" != "200" ]; then
    echo "  [FAIL] HTTP $http"
    head -3 "$tmp_resp"
    rm -f "$tmp_resp"
    return 1
  fi

  jq -r '.predictions[0].bytesBase64Encoded' "$tmp_resp" | base64 -d > "$outfile"
  rm -f "$tmp_resp"
  local size
  size=$(ls -lh "$outfile" | awk '{print $5}')
  echo "  [OK] $outfile ($size)"
  return 0
}

# ── Upload to Supabase Storage ────────────────────────────────
upload_to_storage() {
  local filepath="$1"
  local storage_path="$2"

  local http
  http=$(curl --noproxy '*' -s -o /tmp/upload-resp-$$.json -w "%{http_code}" \
    -X POST "${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storage_path}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Content-Type: image/png" \
    -H "x-upsert: true" \
    --data-binary "@${filepath}")

  if [ "$http" != "200" ]; then
    echo "  [UPLOAD FAIL] HTTP $http"
    cat /tmp/upload-resp-$$.json
    rm -f /tmp/upload-resp-$$.json
    return 1
  fi
  rm -f /tmp/upload-resp-$$.json
  echo "  [UPLOAD OK] ${BUCKET}/${storage_path}"
  return 0
}

# ── Supabase SQL update ───────────────────────────────────────
update_lessons_thumbnail() {
  local bible_book="$1"
  local public_url="$2"

  local resp
  resp=$(curl --noproxy '*' -s \
    -H "Authorization: Bearer ${MGMT_PAT}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"UPDATE lessons SET thumbnail_url = '${public_url}', updated_at = NOW() WHERE bible_book = '${bible_book}' AND (bible_chapter IS NULL OR bible_chapter = 0) AND (thumbnail_url IS NULL OR thumbnail_url = '' OR thumbnail_url LIKE '%placeholder%' OR thumbnail_url LIKE '%default%')\"}" \
    "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query")

  echo "  [DB UPDATE] $resp"
}

# ── Phase 1: Book images ──────────────────────────────────────
run_phase1() {
  echo ""
  echo "===== Phase 1 — Book images ====="
  echo "Total: ${#BOOK_DESC[@]} books"

  local count=0
  local skipped=0
  local failed=0

  for book in "${!BOOK_DESC[@]}"; do
    if is_completed "$book" "phase1"; then
      echo "  [SKIP] $book (already done)"
      ((skipped++)) || true
      continue
    fi

    local safe_name
    safe_name=$(echo "$book" | tr ' ' '-' | sed 's/[^א-תa-zA-Z0-9-]//g')
    local storage_path="books/${safe_name}.png"
    local public_url="${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storage_path}"
    local tmpfile="/tmp/bnei-zion-book-$$.png"

    echo ""
    echo "→ [$((count+1))/${#BOOK_DESC[@]}] $book"

    if [ "$DRY_RUN" = "1" ]; then
      echo "  [DRY RUN] Would generate: ${BOOK_DESC[$book]:0:80}..."
      echo "  [DRY RUN] Would upload to: $storage_path"
      echo "  [DRY RUN] Would UPDATE lessons WHERE bible_book = '$book'"
      ((count++)) || true
      continue
    fi

    if generate_image "${BOOK_DESC[$book]}" "$tmpfile"; then
      if upload_to_storage "$tmpfile" "$storage_path"; then
        update_lessons_thumbnail "$book" "$public_url"
        mark_completed "$book" "phase1"
        add_cost "0.06"
        ((count++)) || true
      else
        mark_failed "$book" "phase1"
        ((failed++)) || true
      fi
    else
      mark_failed "$book" "phase1"
      ((failed++)) || true
    fi

    rm -f "$tmpfile"

    # Rate limit: wait 7s between requests (~8-9 req/min, under 10 limit)
    if [ "$DRY_RUN" != "1" ]; then
      sleep 7
    fi
  done

  echo ""
  echo "===== Phase 1 Summary ====="
  echo "Done: $count | Skipped: $skipped | Failed: $failed"
  local total_cost
  total_cost=$(jq '.total_cost' "$STATE_FILE")
  echo "Total cost so far: \$$total_cost"

  if [ "$failed" -gt 0 ]; then
    echo "Failed items:"
    jq -r '.phase1.failed[]' "$STATE_FILE"
  fi
}

# ── Main ──────────────────────────────────────────────────────
init_state

echo "bnei-zion image batch — Phase 1 (Books)"
echo "DRY_RUN=${DRY_RUN}"
echo "State file: $STATE_FILE"
echo ""

run_phase1

echo ""
echo "Phase 1 complete. Review samples above, then run phase 2 script."
