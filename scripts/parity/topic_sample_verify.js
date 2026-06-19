export const meta = {
  name: 'bneyzion-topic-sample-verify',
  description: 'Visual 1:1 check of sample TOPIC (subject) pages NEW vs OLD',
  phases: [{ title: 'Verify' }],
}
const TITLES = ['דוד המלך','גאולה','ראש השנה','האזנה לפסוקים עם ביאור פשוט','ירושלים','תשובה','ארץ ישראל','משיח']
const items = TITLES.map(t => ({ title: t, newPath: `/tmp/tverify/${t}-new.png`, oldPath: `/tmp/tverify/${t}-old.png` }))
const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['title','verdict','issues'],
  properties: {
    title: { type: 'string' },
    verdict: { type: 'string', enum: ['match','discrepancy','unreadable'] },
    issues: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['type','detail'],
      properties: { type: { type: 'string', enum: ['missing_lesson','extra_item','wrong_order','wrong_author','empty','other'] }, detail: { type: 'string' } } } },
  },
}
const prompt = (it) => `STRICT 1:1 visual parity check, Bnei Zion TOPIC/subject page "${it.title}".
NEW: ${it.newPath}
OLD (ground truth, the ?subject= filtered listing): ${it.oldPath}
Both list the lessons/items tagged to this subject. Compare TOP-TO-BOTTOM: same items, same order, same authors. Report only real content discrepancies (missing/extra/wrong-order/wrong-author/empty). IGNORE the chat widget (בנצי/בוצי), header/footer/nav, fonts/colors/layout. The OLD page may paginate or lazy-load; judge by what's visible. If 1:1 → verdict="match", issues=[]. Blank shot → "unreadable".`
const results = await pipeline(items, (it) =>
  agent(prompt(it), { label: `topic:${it.title}`, phase: 'Verify', schema: SCHEMA }).then(r => r || { title: it.title, verdict: 'unreadable', issues: [] }))
const clean = results.filter(r => r.verdict === 'match').map(r => r.title)
const flagged = results.filter(r => r.verdict === 'discrepancy' && r.issues.length)
log(`TOPIC sample: ${clean.length}/${results.length} clean`)
return { clean, flagged, unreadable: results.filter(r => r.verdict === 'unreadable').map(r => r.title) }
