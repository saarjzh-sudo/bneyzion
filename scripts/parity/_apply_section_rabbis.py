import json, sys, time
sys.path.insert(0, ".")
import sbq
def q(s, _t=8):
    for i in range(_t):
        try:
            d = json.loads(sbq.run(s))
            if isinstance(d, dict) and d.get("message"): time.sleep(1.3*(i+1)); continue
            return d
        except Exception: time.sleep(1.3*(i+1))
    return []
fixes = json.load(open("reports/section-rabbi-fixes.json"))["fixes"]
ids = ",".join(f"'{f['id']}'" for f in fixes)
q("DROP TABLE IF EXISTS lessons_rabbi_bak_section_20260618")
q(f"CREATE TABLE lessons_rabbi_bak_section_20260618 AS SELECT id, rabbi_id FROM lessons WHERE id IN ({ids})")
print("backed up", len(fixes), "lessons → lessons_rabbi_bak_section_20260618")
for i in range(0, len(fixes), 60):
    ch = fixes[i:i+60]
    cases = " ".join(f"WHEN id='{f['id']}' THEN '{f['rid']}'::uuid" for f in ch)
    idin = ",".join(f"'{f['id']}'" for f in ch)
    q(f"UPDATE lessons SET rabbi_id = CASE {cases} END WHERE id IN ({idin})")
print(f"APPLIED {len(fixes)} section standalone rabbi fixes")
# verify a couple
print(q("SELECT l.title, r.name FROM lessons l LEFT JOIN rabbis r ON r.id=l.rabbi_id WHERE l.id IN ('"+fixes[0]['id']+"','"+fixes[-1]['id']+"')"))
