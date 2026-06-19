export const meta = {
  name: 'migration-big-test',
  description: 'BIG migration test — one agent per node judges old-vs-new parity, surfaces real defects',
  phases: [
    { title: 'Bootstrap', detail: 'list the per-node diff files' },
    { title: 'Judge', detail: 'one agent per node judges its old/new diff' },
  ],
}

const DIR = '/tmp/mtest_diff'

const SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    node_type: { type: 'string' },
    old_n: { type: 'integer' },
    new_n: { type: 'integer' },
    status: { type: 'string', enum: ['clean', 'minor_gap', 'defect'] },
    severity: { type: 'string', enum: ['none', 'low', 'medium', 'high'] },
    real_pollution: { type: 'array', items: { type: 'string' }, description: 'extra-in-new that are REAL defects (NOT dual-audience study content)' },
    real_missing: { type: 'array', items: { type: 'string' }, description: 'missing items that are REAL gaps (NOT teacher worksheets / nav-links / scrape-miss)' },
    count_problems: { type: 'array', items: { type: 'string' }, description: 'series with a wrong displayed count (gap >1)' },
    notes: { type: 'string' },
  },
  required: ['name', 'node_type', 'old_n', 'new_n', 'status', 'severity', 'real_pollution', 'real_missing', 'count_problems', 'notes'],
}

const RULES = `Migration judging rules (apply strictly):
1. old_n=0 or old_err set but new_n>0 → the OLD scrape failed/empty; the NEW page having content is CORRECT → status clean, note "old scrape empty". NOT a defect.
2. extra_in_new (NEW shows items OLD lacks) = POLLUTION (most serious). EXCEPT dual-audience study content that is genuinely public: 'ושננתם'/ביאור, 'ציר זמן', 'סיכומים', 'מפות עזר', 'קריאה וביאור' → NOT pollution. Any '(N)' suffix or duplicate title = REAL defect.
3. missing_in_new (OLD has, NEW lacks). LEGIT (not a defect): teacher-only worksheets — 'דפי עבודה','שאלות חזרה','שאלות בעיון','חידות','ביאורי מילים'; navigation links — 'כל השיעורים','מעבר ל…'; empty/no-media items. REAL gap: real lessons/series with content.
4. count_mismatch (a series shows a different lesson count old vs new): flag as a real problem only if the gap is > 1.
5. Tiny total-count diff (±1-2) you cannot pin to a specific title = acceptable (header/spacing).
Be precise and skeptical; report only REAL issues. status: clean (no real issues) / minor_gap (small real gaps, no pollution) / defect (pollution OR wrong content OR count gap>1).`

// ---- Bootstrap: node list (from args override, else list the diff dir) ----
phase('Bootstrap')
let SAFES = (typeof args === 'string' ? (args ? JSON.parse(args) : null) : args)
if (Array.isArray(SAFES) && SAFES.length && typeof SAFES[0] === 'object') SAFES = SAFES.map((x) => x.safe)
if (!Array.isArray(SAFES) || !SAFES.length) {
  const boot = await agent(
    `Run exactly this shell command and return its output as a JSON array of strings: \`ls ${DIR}/ | sed 's/\\.json$//'\`. Each line is one node id ("safe"). There should be ~443. Return {safes:[...]} with every id, no truncation.`,
    { label: 'bootstrap', phase: 'Bootstrap', schema: { type: 'object', properties: { safes: { type: 'array', items: { type: 'string' } } }, required: ['safes'] } }
  )
  SAFES = (boot && boot.safes) || []
}
log(`judging ${SAFES.length} nodes`)

// ---- Judge: one agent per node ----
phase('Judge')
const verdicts = await parallel(SAFES.map((safe) => () =>
  agent(
    `Migration QA for one Bnei Zion node. Read the file ${DIR}/${safe}.json — it holds the diff between the OLD bneyzion.co.il page and the NEW bneyzion.vercel.app page. Fields: node{name,type,old_url,new_url}, old_n, new_n, old_h1, new_h1, old_err, new_err, missing_in_new[], extra_in_new[], count_mismatch[].\n\n` +
    `Judge whether NEW faithfully reproduces OLD. ${RULES}\n\nReturn the structured verdict (name + node_type FROM THE FILE) with ONLY the real issues.`,
    { label: safe, phase: 'Judge', schema: SCHEMA }
  ).then((v) => v || { name: safe, node_type: '?', old_n: 0, new_n: 0, status: 'defect', severity: 'high', real_pollution: [], real_missing: [], count_problems: [], notes: 'agent returned null' })
))

const defects = verdicts.filter((v) => v && v.status === 'defect')
const minor = verdicts.filter((v) => v && v.status === 'minor_gap')
const clean = verdicts.filter((v) => v && v.status === 'clean')
log(`RESULT: clean=${clean.length} minor_gap=${minor.length} DEFECT=${defects.length} of ${verdicts.length}`)

return {
  summary: { total: verdicts.length, clean: clean.length, minor_gap: minor.length, defect: defects.length },
  defects: defects.map((v) => ({ name: v.name, type: v.node_type, old_n: v.old_n, new_n: v.new_n, severity: v.severity, pollution: v.real_pollution, missing: v.real_missing, count_problems: v.count_problems, notes: v.notes })),
  minor: minor.map((v) => ({ name: v.name, type: v.node_type, missing: v.real_missing, notes: v.notes })),
}
