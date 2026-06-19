export const meta = {
  name: 'bneyzion-section-sample-verify',
  description: 'Visual 1:1 check of 10 sample SECTION pages (heuristic render) NEW vs OLD',
  phases: [{ title: 'Verify' }],
}
const TITLES = [
  'הגישה הראויה ללימוד תנך','גלות וגאולה','ארבע המלכויות','בית המקדש והכהנים','דוד המלך',
  'חנוכה','פורים','פסח','הפטרת בראשית','הפטרת נח',
  'הפטרת בא','הפטרת יתרו','נבואה ונביאים','ירושלים','מלחמה',
]
const items = TITLES.map(t => ({ title: t, newPath: `/tmp/sverify/${t}-new.png`, oldPath: `/tmp/sverify/${t}-old.png` }))
const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['title','verdict','issues'],
  properties: {
    title: { type: 'string' },
    verdict: { type: 'string', enum: ['match','discrepancy','unreadable'] },
    issues: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['type','detail'],
      properties: { type: { type: 'string', enum: ['missing_series','missing_lesson','extra_item','wrong_author','wrong_order','empty_card','other'] }, detail: { type: 'string' } } } },
  },
}
const prompt = (it) => `STRICT 1:1 visual parity check, Bnei Zion SECTION page "${it.title}" (a מועד/נושא/הפטרה/לימוד category, NOT a book).
NEW: ${it.newPath}
OLD (ground truth): ${it.oldPath}
Compare the listing content TOP-TO-BOTTOM: same series + standalone lesson cards, same order, same authors. Report only real content discrepancies (missing/extra/wrong-author/wrong-order/empty). IGNORE chat widget (בנצי/בוצי), header/footer/nav, fonts/colors/layout, internal lesson-count of a series. If 1:1 → verdict="match", issues=[]. If a shot is blank → "unreadable".`
const results = await pipeline(items, (it) =>
  agent(prompt(it), { label: `sec:${it.title}`, phase: 'Verify', schema: SCHEMA }).then(r => r || { title: it.title, verdict: 'unreadable', issues: [] }))
const clean = results.filter(r => r.verdict === 'match').map(r => r.title)
const flagged = results.filter(r => r.verdict === 'discrepancy' && r.issues.length)
log(`SECTION sample: ${clean.length}/${results.length} clean`)
return { clean, flagged, unreadable: results.filter(r => r.verdict === 'unreadable').map(r => r.title) }
