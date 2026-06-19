export const meta = {
  name: 'bneyzion-rabbi-sample-verify',
  description: 'Visual 1:1 check of sample RABBI pages NEW vs OLD',
  phases: [{ title: 'Verify' }],
}
const NAMES = [
  "הרב יואב אוריאל","הרב איתן שנדורפי","הרב מנחם שחור","הרב יוסי ברינר",
  "הרבנית דנה סליי (לנשים)","הרב עמנואל בן ארצי","הרב אברהם וסרמן","הרב יוסף שילר",
]
const safe = (n) => n.replace(/\//g, "_").replace(/"/g, "").replace(/ /g, "_")
const items = NAMES.map(n => ({ name: n, newPath: `/tmp/rverify/${safe(n)}-new.png`, oldPath: `/tmp/rverify/${safe(n)}-old.png` }))
const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['name','verdict','issues'],
  properties: {
    name: { type: 'string' },
    verdict: { type: 'string', enum: ['match','discrepancy','unreadable'] },
    issues: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['type','detail'],
      properties: { type: { type: 'string', enum: ['missing_series','missing_lesson','extra_item','wrong_order','empty','other'] }, detail: { type: 'string' } } } },
  },
}
const prompt = (it) => `STRICT 1:1 visual parity check, Bnei Zion RABBI page for "${it.name}".
NEW: ${it.newPath}
OLD (ground truth, the rabbi's ?rav= listing): ${it.oldPath}
Both list this rabbi's series + standalone lessons. Compare TOP-TO-BOTTOM: same items, same order, same titles. Report only real content discrepancies (missing/extra/wrong-order/empty). IGNORE the chat widget (בנצי/בוצי), header/footer/nav, fonts/colors/layout, and small lesson-count badges inside a series. The OLD page may group by book/section — judge content membership + order. If the new page shows the same items 1:1 → verdict="match". Blank/empty new page → "empty" issue. Blank shot → "unreadable".`
const results = await pipeline(items, (it) =>
  agent(prompt(it), { label: `rabbi:${it.name}`, phase: 'Verify', schema: SCHEMA }).then(r => r || { name: it.name, verdict: 'unreadable', issues: [] }))
const clean = results.filter(r => r.verdict === 'match').map(r => r.name)
const flagged = results.filter(r => r.verdict === 'discrepancy' && r.issues.length)
log(`RABBI sample: ${clean.length}/${results.length} clean`)
return { clean, flagged, unreadable: results.filter(r => r.verdict === 'unreadable').map(r => r.name) }
