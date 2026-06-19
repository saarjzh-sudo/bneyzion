import sys, json, time
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
# the ציר-זמן Storage PDF (same timeline doc) from the דניאל copy that already has it
src = q("SELECT attachment_url FROM lessons WHERE id='0bfc2402-56d0-4baf-a4c3-e71e24b15ea8'")
url = src[0]["attachment_url"] if src else None
print("source ציר-זמן PDF:", url)
if not url or "supabase" not in url:
    print("ABORT: source attachment not on Storage"); sys.exit(1)
# back up the 3 חגי copies, then attach the same Storage PDF (identical document, Rule-13 compliant)
ids = ['7cc8a066-05ad-5381-b394-2d014154a6b2','bcca7316-7df6-50be-aa75-0d56d7b4d1c1','0e8352df-76c0-5706-8d14-fd04bfc995f7']
idin = "','".join(ids)
q(f"DROP TABLE IF EXISTS lessons_hagai_tzir_bak_20260618")
q(f"CREATE TABLE lessons_hagai_tzir_bak_20260618 AS SELECT id, attachment_url FROM lessons WHERE id IN ('{idin}')")
esc = url.replace("'", "''")
q(f"UPDATE lessons SET attachment_url='{esc}' WHERE id IN ('{idin}') AND (attachment_url IS NULL OR attachment_url='')")
print("after:", q(f"SELECT id, (attachment_url IS NOT NULL) att FROM lessons WHERE id IN ('{idin}')"))
