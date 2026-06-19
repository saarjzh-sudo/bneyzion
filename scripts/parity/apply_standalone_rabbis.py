import os, sys, json, time, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import sbq
def q(s, _t=8):
    for i in range(_t):
        out = sbq.run(s)
        try:
            d = json.loads(out)
            if isinstance(d, dict) and d.get("message"): time.sleep(1.3*(i+1)); continue
            return d
        except Exception: time.sleep(1.3*(i+1))
    return None
def noenv():
    e = dict(os.environ)
    for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy"): e.pop(k, None)
    e["NO_PROXY"] = "*"; return e
SNAP = "lessons_rabbi_bak_standalone_20260618"
q(f"DROP TABLE IF EXISTS {SNAP}")
q(f"CREATE TABLE {SNAP} AS SELECT id, rabbi_id FROM lessons")
n = q(f"SELECT COUNT(*) n FROM {SNAP}")
print(f"snapshot {SNAP}: {n[0]['n'] if n else 0} rows")
for b in ["במדבר", "מלכים א", "תהלים"]:
    p = subprocess.run([sys.executable, "-u", os.path.join(HERE, "fix_lesson_rabbis.py"), "--book", b, "--apply"],
                       cwd=HERE, capture_output=True, text=True, env=noenv(), timeout=1800)
    applied = [ln for ln in (p.stdout or "").splitlines() if ln.startswith("APPLIED")]
    print(f"{b}: {applied[0] if applied else '(no apply line)'}")
