export const meta = {
  name: 'bneyzion-verify-books-1to1',
  description: 'Visual 1:1 parity check: each book NEW vs OLD full-page screenshot, report discrepancies',
  phases: [{ title: 'Verify', detail: 'one agent per book reads both screenshots and compares' }],
}

// 37 books in old-site/manifest order; screenshot paths are deterministic in /tmp/verify
const BOOK_NAMES = [
  'בראשית','שמות','ויקרא','במדבר','דברים','יהושע','שופטים','שמואל א','שמואל ב','מלכים א',
  'מלכים ב','ישעיהו','ירמיהו','יחזקאל','הושע','יואל','עמוס','עובדיה','יונה','מיכה','נחום',
  'חבקוק','צפניה','חגי','זכריה','מלאכי','תהלים','משלי','איוב','שיר השירים','רות','איכה',
  'קהלת','אסתר','דניאל','עזרא ונחמיה','דברי הימים',
]
const books = BOOK_NAMES.map(b => ({ book: b, newPath: `/tmp/verify/${b}-new.png`, oldPath: `/tmp/verify/${b}-old.png` }))

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['book', 'verdict', 'issues'],
  properties: {
    book: { type: 'string' },
    verdict: { type: 'string', enum: ['match', 'discrepancy', 'unreadable'] },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'detail'],
        properties: {
          type: { type: 'string', enum: ['missing_series', 'missing_lesson', 'extra_item', 'wrong_author', 'wrong_order', 'empty_card', 'other'] },
          detail: { type: 'string' },
        },
      },
    },
  },
}

const prompt = (b) => `You are performing a STRICT 1:1 visual parity check for the Bnei Zion Tanach site, book category page "${b.book}".

Read these two full-page screenshots (Hebrew, RTL):
- NEW site: ${b.newPath}
- OLD site (ground truth): ${b.oldPath}

Compare them TOP-TO-BOTTOM as content listings (series cards + standalone lesson cards):
1. Same series/lessons present, in the SAME order.
2. Same author/rabbi name shown on each card.
3. No EXTRA item on NEW that is absent on OLD; no MISSING item on NEW that exists on OLD.
4. No empty/blank cards.

IGNORE (not discrepancies): the floating chat widget ("בנצי"/"בוצי"), header/footer/nav chrome, fonts/colors/spacing/pixel layout, pagination of long lists, and minor count differences in a series's internal lesson total.

Return ONLY real content discrepancies. If the two pages match 1:1 on content+order+authors, verdict="match" with issues=[]. If a screenshot failed to load/blank, verdict="unreadable". Be precise in each detail (name the series/lesson and what differs).`

const results = await pipeline(
  books,
  (b) => agent(prompt(b), { label: `verify:${b.book}`, phase: 'Verify', schema: SCHEMA }).then(r => r || { book: b.book, verdict: 'unreadable', issues: [] })
)

const clean = results.filter(r => r && r.verdict === 'match')
const flagged = results.filter(r => r && r.verdict === 'discrepancy' && r.issues.length)
const unreadable = results.filter(r => r && r.verdict === 'unreadable')
log(`VERIFY done: ${clean.length} clean, ${flagged.length} with discrepancies, ${unreadable.length} unreadable`)
return { clean: clean.map(r => r.book), flagged, unreadable: unreadable.map(r => r.book) }
