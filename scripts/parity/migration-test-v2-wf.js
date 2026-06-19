export const meta = {
  name: 'migration-test-v2',
  description: 'BIG migration test v2 — BATCHED judges (no rate-limit) + refined rules, full 443-node coverage',
  phases: [
    { title: 'Bootstrap', detail: 'list per-node diff files' },
    { title: 'Judge', detail: 'batched agents judge ~15 nodes each' },
  ],
}

const DIR = '/tmp/mtest_diff'
const BATCH = 15

const VERDICT = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    node_type: { type: 'string' },
    old_n: { type: 'integer' },
    new_n: { type: 'integer' },
    status: { type: 'string', enum: ['clean', 'minor_gap', 'defect'] },
    severity: { type: 'string', enum: ['none', 'low', 'medium', 'high'] },
    real_pollution: { type: 'array', items: { type: 'string' } },
    real_missing: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['name', 'node_type', 'old_n', 'new_n', 'status', 'severity', 'real_pollution', 'real_missing', 'notes'],
}
const BATCH_SCHEMA = { type: 'object', properties: { verdicts: { type: 'array', items: VERDICT } }, required: ['verdicts'] }

const RULES = `MIGRATION JUDGING RULES — apply strictly, be skeptical, report ONLY real defects.

STRUCTURAL CONTEXT (critical — avoid false positives):
- BOOK pages (type=book) and SECTION pages (type=section) on the NEW site are SERIES-GROUPED: they list series/collection CARDS (e.g. "מאמרים קצרים - חומש X", "פרשת שבוע-X", "הרב אבינר על פרשיות X"), and individual lessons are NESTED inside those cards. So new_n MUCH LOWER than old_n (e.g. 67→27) is EXPECTED, NOT a defect — the old flat lessons live inside the new series cards. For book/section: a "missing" individual lesson title is NOT a real gap (it's nested). Only flag a book/section as defect if: (a) the page is NEAR-EMPTY (new_n ≤ 2 while old_n ≥ 8) — real breakage; or (b) clear POLLUTION: an extra card with a "(N)" suffix or a duplicate title.
- TOPIC pages (type=topic) and RABBI pages (type=rabbi) list lessons/series FLAT on BOTH sites → apples-to-apples. Here missing/extra ARE meaningful.

RULES:
1. old_n ≤ 2 (or old_err set) while new_n is clearly larger → the OLD scrape was empty/incomplete; the NEW page is CORRECT → status=clean, note "old scrape miss". NEVER a defect.
2. extra_in_new (NEW has items OLD lacks) = POLLUTION (serious) for topic/rabbi. EXCEPT genuinely-public dual-audience study content: titles containing 'ושננתם', 'ציר זמן', 'סיכומים', 'מפות עזר', 'קריאה וביאור', 'מוקלט' → NOT pollution. Any '(N)' suffix or duplicate title = REAL pollution defect.
3. missing_in_new for topic/rabbi: LEGIT (not defect) = teacher worksheets ('דפי עבודה','שאלות חזרה','שאלות בעיון','חידות','ביאורי מילים'), nav links ('כל השיעורים','מעבר ל','סדרת שיעורים'), empty items. REAL gap = real lessons/series with content missing on an apples-to-apples page.
4. Tiny diff (±1-2) with no pinned title = acceptable.

status: clean (no real issue) / minor_gap (small real gap on topic/rabbi, no pollution) / defect (pollution with (N)/dup, OR near-empty book/section, OR real content gap on topic/rabbi). Keep real_pollution/real_missing to the GENUINE items only (drop the legit-exception ones).`

// ---- Bootstrap node list ----
phase('Bootstrap')
let SAFES = (typeof args === 'string' ? (args ? JSON.parse(args) : null) : args)
if (Array.isArray(SAFES) && SAFES.length && typeof SAFES[0] === 'object') SAFES = SAFES.map((x) => x.safe)
if (!Array.isArray(SAFES) || !SAFES.length) {
  const boot = await agent(
    `Run exactly: \`ls ${DIR}/ | sed 's/\\.json$//'\` and return {safes:[...]} with every line (node id, ~443). No truncation.`,
    { label: 'bootstrap', phase: 'Bootstrap', schema: { type: 'object', properties: { safes: { type: 'array', items: { type: 'string' } } }, required: ['safes'] } }
  )
  SAFES = (boot && boot.safes) || []
}
const groups = []
for (let i = 0; i < SAFES.length; i += BATCH) groups.push(SAFES.slice(i, i + BATCH))
log(`judging ${SAFES.length} nodes in ${groups.length} batches of ${BATCH}`)

// ---- Batched judge ----
phase('Judge')
const batched = await parallel(groups.map((g, gi) => () =>
  agent(
    `You are judging Bnei Zion migration parity for ${g.length} nodes. For EACH node id below, read the file ${DIR}/<id>.json (fields: node{name,type,old_url,new_url}, old_n, new_n, old_err, new_err, missing_in_new[], extra_in_new[], count_mismatch[]) and produce one verdict.\n\nNode ids:\n${g.map((s) => '- ' + s).join('\n')}\n\n${RULES}\n\nReturn {verdicts:[...]} — exactly one verdict per node id (use name + node_type from each file). Read ALL ${g.length} files.`,
    { label: `batch-${gi}`, phase: 'Judge', schema: BATCH_SCHEMA }
  ).then((r) => (r && r.verdicts) || [])
))
const verdicts = batched.flat()

const defects = verdicts.filter((v) => v && v.status === 'defect')
const minor = verdicts.filter((v) => v && v.status === 'minor_gap')
const clean = verdicts.filter((v) => v && v.status === 'clean')
log(`RESULT: clean=${clean.length} minor=${minor.length} DEFECT=${defects.length} of ${verdicts.length} judged`)

return {
  summary: { judged: verdicts.length, clean: clean.length, minor_gap: minor.length, defect: defects.length },
  defects: defects.map((v) => ({ name: v.name, type: v.node_type, old_n: v.old_n, new_n: v.new_n, severity: v.severity, pollution: v.real_pollution, missing: v.real_missing, notes: v.notes })),
  minor: minor.map((v) => ({ name: v.name, type: v.node_type, missing: v.real_missing, notes: v.notes })),
}
