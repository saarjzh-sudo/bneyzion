#!/usr/bin/env python3
"""
teachers_parity_watch.py — 3×/day watchdog for Teachers Wing parity.

Runs teachers_parity.py --watch, logs the one-line status, and (only on regression —
substantive gaps increased vs the last run) sends a WhatsApp alert to Saar's self chat.
Quiet when nothing drifts. Scheduled by launchd com.bneyzion.teachers-parity (08:00/14:00/20:00).

Green API creds are READ FROM the config file at runtime (never hardcoded) per Saar's iron rule.
"""
import subprocess, json, os, re, datetime, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
LOG = os.path.join(HERE, "teachers-parity-watch.log")
STATE = os.path.join(HERE, "teachers-parity-state.json")
PY = "/opt/homebrew/bin/python3"
SAAR = "972526018772@c.us"
# Green API creds live here (shigor-pro references). Read at runtime — do not hardcode.
CLIENTS_MD = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(HERE))),
    "וואן-מן-שואו", "סקילים", "01-skills", "shigor-pro", "references", "clients.md")

def _noproxy_env():
    env = dict(os.environ)
    for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy","ALL_PROXY","all_proxy"):
        env.pop(k, None)
    env["NO_PROXY"] = "*"
    return env

def green_creds():
    """Parse Green API instance + token from the shigor-pro clients.md (the single source)."""
    txt = open(CLIENTS_MD, encoding="utf-8").read()
    seg = txt.split("Green API", 1)[1] if "Green API" in txt else txt
    inst = re.search(r"Instance:\s*([0-9]+)", seg)
    tok = re.search(r"Token:\s*([0-9a-f]{30,})", seg)
    if not (inst and tok):
        raise RuntimeError("Green API creds not found in clients.md")
    return inst.group(1), tok.group(1)

def run_parity():
    p = subprocess.run([PY, os.path.join(HERE, "teachers_parity.py"), "--watch"],
                       capture_output=True, text=True, env=_noproxy_env(), timeout=600, cwd=HERE)
    return (p.stdout or "").strip() or (p.stderr or "").strip()

def run_book_listing():
    """Self-heal the per-book Teachers-Wing listing (order/membership/missing) to match the
       old-site ground truth 1:1, and return the drift report dict. Idempotent — does nothing
       when the live listing already equals the ground truth."""
    p = subprocess.run([PY, os.path.join(HERE, "teachers_book_listing.py"), "--watch"],
                       capture_output=True, text=True, env=_noproxy_env(), timeout=900, cwd=HERE)
    line = (p.stdout or "").strip().splitlines()[-1] if p.stdout.strip() else (p.stderr or "").strip()
    rep = {}
    try:
        rep = json.load(open(os.path.join(HERE, "teachers-book-listing-watch-report.json"), encoding="utf-8"))
    except Exception:
        pass
    return line, rep

def parse(line):
    def g(k):
        m = re.search(rf"{k}=(\d+)", line); return int(m.group(1)) if m else None
    return {"depth_gaps": g("depth_gaps"), "real_absent": g("real_absent"),
            "tag": g("tag"), "link": g("link"), "false_pos": g("false_pos")}

def send_wa(text):
    try:
        inst, tok = green_creds()
        for k in list(os.environ):
            if k.lower().endswith("_proxy"): os.environ.pop(k, None)
        url = f"https://api.greenapi.com/waInstance{inst}/sendMessage/{tok}"
        data = json.dumps({"chatId": SAAR, "message": text}).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=30).read()
        return True
    except Exception:
        return False

def main():
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    line = run_parity()
    cur = parse(line)
    prev = {}
    if os.path.exists(STATE):
        try: prev = json.load(open(STATE))
        except Exception: prev = {}

    # Self-heal the per-book 1:1 listing (order/data/missing) against the old-site ground truth.
    bl_line, bl = run_book_listing()

    with open(LOG, "a", encoding="utf-8") as f:
        f.write(f"{ts}  {line}\n{ts}  listing  {bl_line}\n")

    drift = []
    for k in ("depth_gaps", "real_absent"):
        if prev.get(k) is not None and cur.get(k) is not None and cur[k] > prev[k]:
            drift.append(f"{k}: {prev[k]}→{cur[k]}")

    # Book-listing self-heal events worth telling Saar about.
    heal_msgs = []
    healed = bl.get("healed") or []
    if healed:
        heal_msgs.append("תוקנו אוטומטית (סדר/חוסר/דאטה): " + ", ".join(healed))
    if bl.get("unresolved_gaps"):
        g = bl["unresolved_gaps"]
        heal_msgs.append(f"תוכן חסר בישן שלא נמצא ({len(g)}): " +
                         ", ".join(f"{x['book']}/{x['title'][:18]}" for x in g[:6]))
    if bl.get("author_mismatch"):
        a = bl["author_mismatch"]
        heal_msgs.append(f"אי-התאמת מחבר ({len(a)}): " +
                         ", ".join(f"{x['book']}/{x['title'][:14]}" for x in a[:6]))

    if drift or heal_msgs:
        parts = [f"⚠️ פאריטי אגף-המורים (בני ציון) {ts}:"]
        if drift:
            parts.append("רגרסיית-תוכן: " + "; ".join(drift))
        parts += heal_msgs
        parts.append(line)
        ok = send_wa("\n".join(parts))
        with open(LOG, "a", encoding="utf-8") as f:
            f.write(f"{ts}  ALERT {'sent' if ok else 'FAILED'}: drift={drift} heal={heal_msgs}\n")

    json.dump(cur, open(STATE, "w"))
    print(f"{ts}  {line}  | listing {bl_line}  drift={drift or 'none'} heal={healed or 'none'}")

if __name__ == "__main__":
    main()
