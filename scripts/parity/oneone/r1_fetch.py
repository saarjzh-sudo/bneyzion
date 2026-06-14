#!/usr/bin/env python3
"""R1 fetcher: curl --noproxy -L, cache raw HTML under r1cache/<sha1(url)>.html."""
import sys, os, hashlib, subprocess

CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "r1cache")
os.makedirs(CACHE, exist_ok=True)

def fetch(url, force=False):
    sha = hashlib.sha1(url.encode("utf-8")).hexdigest()
    path = os.path.join(CACHE, sha + ".html")
    if os.path.exists(path) and not force and os.path.getsize(path) > 500:
        return open(path, encoding="utf-8", errors="replace").read(), path, True
    env = dict(os.environ)
    for k in ("HTTP_PROXY","HTTPS_PROXY","http_proxy","https_proxy","ALL_PROXY","all_proxy"):
        env.pop(k, None)
    env["NO_PROXY"] = "*"
    p = subprocess.run([
        "curl","-s","--noproxy","*","-L","--compressed",
        "-A","Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        url,
    ], capture_output=True, text=True, env=env, timeout=120)
    html = p.stdout
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    return html, path, False

if __name__ == "__main__":
    url = sys.argv[1]
    force = len(sys.argv) > 2 and sys.argv[2] == "--force"
    html, path, cached = fetch(url, force)
    print(f"cached={cached} bytes={len(html)} path={path}")
    print("categoryTable count:", html.count("categoryTable"))
