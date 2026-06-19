#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate the circuit-breaking agent-judge workflow.
Embeds the PENDING nodes (ordered worklist minus whatever is already in the
accumulator /tmp/mtest_agent_verdicts.json) into migration-cb-wf.js.
Re-run this before each Workflow invocation to resume from where we stopped.
"""
import json, os

ORDERED = "mtest-args-ordered.json"
ACC = "/tmp/mtest_agent_verdicts.json"
OUT = "migration-cb-wf.js"

ordered = json.load(open(ORDERED))
acc = {}
if os.path.exists(ACC):
    try: acc = json.load(open(ACC))
    except Exception: acc = {}
pending = [n for n in ordered if n["safe"] not in acc]

NODES_LITERAL = json.dumps(pending, ensure_ascii=False)

template = r'''export const meta = {
  name: 'migration-cb-judge',
  description: 'Agent-based migration parity judging with a HARD circuit-breaker: stop the instant a chunk hits a rate-limit, return all verdicts gathered so far (never throw)',
  phases: [{ title: 'Judge', detail: 'judge nodes in small serial chunks; stop on first rate-limit' }],
}

const NODES = __NODES__
const DIR = '/tmp/mtest_diff'
const CHUNK = 6   // small serial waves; on the first wave that hits a failure we stop entirely

const SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' }, node_type: { type: 'string' },
    old_n: { type: 'integer' }, new_n: { type: 'integer' },
    status: { type: 'string', enum: ['clean', 'minor_gap', 'defect'] },
    severity: { type: 'string', enum: ['none', 'low', 'medium', 'high'] },
    real_pollution: { type: 'array', items: { type: 'string' } },
    real_missing: { type: 'array', items: { type: 'string' } },
    title_corruption: { type: 'array', items: { type: 'string' }, description: 'titles in NEW that are the OLD title with the parent series/topic name concatenated, or a word duplicated' },
    count_problems: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['name','node_type','old_n','new_n','status','severity','real_pollution','real_missing','title_corruption','count_problems','notes'],
}

const RULES = `Migration judging rules (apply strictly):
1. old_n=0/low or old_err set but new_n>0 -> OLD scrape failed/thin; NEW having content is CORRECT -> clean, note "old scrape thin". NOT a defect.
2. extra_in_new = POLLUTION, EXCEPT: (a) dual-audience public study content 'ושננתם'/ביאור, 'ציר זמן','סיכומים','מפות עזר','קריאה וביאור','טבלאות' -> not pollution; (b) a title that is an OLD title + a lecturer/author name and/or '(לנשים)' appended -> SAME lesson, not pollution. A trailing '(N)' count or exact duplicate title = REAL defect.
3. missing_in_new LEGIT (not a defect): teacher worksheets 'דפי עבודה','שאלות חזרה','שאלות בעיון','חידות','ביאורי מילים'; nav 'כל השיעורים','סדרת שיעורים','מעבר ל…','כל ההפטרות'; empty items. ALSO: many NEW pages group lessons into SERIES while OLD listed lessons flat — if missing lesson titles are plausibly inside a NEW series, that is NOT a real gap. REAL gap: a real series/lesson genuinely absent from NEW.
4. count_mismatch: real problem only if gap > 1.
5. TITLE-CORRUPTION: NEW titles that are the OLD title with the parent series/topic name concatenated, or a duplicated word (e.g. '...ושננתם ושננתם'). They appear as paired missing+extra of the same lesson. List them in title_corruption -> REAL defect.
status: clean / minor_gap (small real gaps, no pollution/corruption) / defect (corruption OR pollution OR count gap>1).`

function promptFor(nd) {
  return `Migration QA for node "${nd.name}" (type=${nd.type}). Read ${DIR}/${nd.safe}.json (old_n,new_n,missing_in_new,extra_in_new,count_mismatch,old_err/new_err = diff between OLD bneyzion.co.il and NEW bneyzion.vercel.app). Judge whether NEW faithfully reproduces OLD. ${RULES}\n\nReturn the structured verdict with ONLY real issues.`
}

phase('Judge')
const judged = []
let stopped = false, stopIndex = -1
for (let i = 0; i < NODES.length && !stopped; i += CHUNK) {
  const chunk = NODES.slice(i, i + CHUNK)
  const res = await parallel(chunk.map((nd) => () =>
    agent(promptFor(nd), { label: nd.safe, phase: 'Judge', schema: SCHEMA })
      .then((v) => ({ nd, v })).catch(() => ({ nd, v: null }))
  ))
  let hitLimit = false
  for (const { nd, v } of res) {
    if (v) judged.push({ ...v, _safe: nd.safe })
    else hitLimit = true
  }
  log(`chunk @${i}: judged-so-far=${judged.length}${hitLimit ? ' — FAILURE in chunk -> STOP' : ''}`)
  if (hitLimit) { stopped = true; stopIndex = i }
}

const defects = judged.filter((v) => v.status === 'defect')
log(`DONE judged=${judged.length}/${NODES.length} stopped_early=${stopped} defects=${defects.length}`)
return {
  judged,
  judged_count: judged.length,
  total_requested: NODES.length,
  stopped_early: stopped,
  stop_index: stopIndex,
}
'''

script = template.replace("__NODES__", NODES_LITERAL)
open(OUT, "w").write(script)
print(f"wrote {OUT}: pending={len(pending)} (already-judged={len(acc)} of {len(ordered)})")
if pending[:3]:
    print("next up:", [p["name"] for p in pending[:3]])
