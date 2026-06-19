export const meta = {
  name: 'migration-parity-validate',
  description: 'Validate section/book parity: new allow-list ORDER + items vs old site (post-fix)',
  phases: [{ title: 'Validate', detail: 'batched agents judge order + missing + pollution per node' }],
}

const DIR = '/tmp/mparity'
const BATCH = 12

const VERDICT = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    status: { type: 'string', enum: ['clean', 'order_issue', 'gap', 'pollution'] },
    severity: { type: 'string', enum: ['none', 'low', 'medium', 'high'] },
    order_ok: { type: 'boolean' },
    real_missing: { type: 'array', items: { type: 'string' } },
    real_pollution: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['name', 'status', 'severity', 'order_ok', 'real_missing', 'real_pollution', 'notes'],
}
const BATCH_SCHEMA = { type: 'object', properties: { verdicts: { type: 'array', items: VERDICT } }, required: ['verdicts'] }

const RULES = `Each file has {name, type, old:[titles in OLD-site order], new:[titles in NEW allow-list order]}.
Judge parity of the NEW listing vs the OLD site:
- ORDER: the new items should follow the old order. order_ok=false only if the SEQUENCE clearly diverges (not just 1-2 swaps).
- real_missing: OLD titles absent from NEW that are REAL content (NOT nav 'סדרת שיעורים'/'כל השיעורים', NOT teacher worksheets 'דפי עבודה'/'שאלות חזרה'/'חידות').
- real_pollution: NEW titles absent from OLD = pollution. EXCEPT dual-audience study content ('ושננתם','ציר זמן','סיכומים','מפות עזר','קריאה וביאור','מוקלט') → NOT pollution.
- Hebrew titles vary slightly (niqqud/quotes/spelling); treat near-matches as the same item.
status: clean (parity ok) / order_issue (sequence diverges) / gap (real_missing non-empty) / pollution (real_pollution non-empty). severity by how much real content is affected.`

phase('Validate')
const boot = await agent(
  `Run exactly: \`ls ${DIR}/ | sed 's/\\.json$//'\` and return {safes:[...]} (every node id, no truncation).`,
  { label: 'bootstrap', phase: 'Validate', schema: { type: 'object', properties: { safes: { type: 'array', items: { type: 'string' } } }, required: ['safes'] } }
)
const SAFES = (boot && boot.safes) || []
const groups = []
for (let i = 0; i < SAFES.length; i += BATCH) groups.push(SAFES.slice(i, i + BATCH))
log(`validating ${SAFES.length} nodes in ${groups.length} batches`)

const batched = await parallel(groups.map((g, gi) => () =>
  agent(
    `Validate section/book parity for ${g.length} nodes. For EACH id below, read ${DIR}/<id>.json and judge.\n\nNode ids:\n${g.map((s) => '- ' + s).join('\n')}\n\n${RULES}\n\nReturn {verdicts:[...]} — one per node (name from the file).`,
    { label: `batch-${gi}`, phase: 'Validate', schema: BATCH_SCHEMA }
  ).then((r) => (r && r.verdicts) || [])
))
const v = batched.flat()
const issues = v.filter((x) => x && x.status !== 'clean')
log(`RESULT: clean=${v.filter((x) => x && x.status === 'clean').length} issues=${issues.length} of ${v.length}`)
return {
  summary: { validated: v.length, clean: v.filter((x) => x && x.status === 'clean').length, issues: issues.length },
  issues: issues.map((x) => ({ name: x.name, status: x.status, severity: x.severity, order_ok: x.order_ok, missing: x.real_missing, pollution: x.real_pollution, notes: x.notes })),
}
