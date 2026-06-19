import json, sys, time
sys.path.insert(0, ".")
import sbq
def q(s):
    for i in range(8):
        try:
            d = json.loads(sbq.run(s))
            if isinstance(d, dict) and d.get("message"): time.sleep(1.2*(i+1)); continue
            return d
        except Exception: time.sleep(1.2*(i+1))
    return []
d = json.load(open("/tmp/sha-p.json"))
ser = [r for r in d["rows"] if r["kind"] == "series" and r["title"].strip() == "ספר שמואל א"]
sids = [r["series_id"] for r in ser]
ids = "','".join(sids)
rabbis = {r["id"]: r["name"] for r in q(f"SELECT s.id,r.name FROM series s LEFT JOIN rabbis r ON r.id=s.rabbi_id WHERE s.id IN ('{ids}')")}
print("emitted=", d["emitted"], "gaps=", len(d["gaps_unresolved"]))
print("two 'ספר שמואל א' entries:")
for r in ser:
    print(f"  pos{r['order_index']:>2} series_id={r['series_id'][:8]} rabbi={rabbis.get(r['series_id'])}")
