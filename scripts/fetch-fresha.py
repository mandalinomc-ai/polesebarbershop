import json
import re
import ssl
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "fresha-temp.html").read_text(encoding="utf-8", errors="ignore")
ctx = ssl._create_unverified_context()
img_dir = ROOT / "assets" / "images"
gal = img_dir / "gallery"
gal.mkdir(parents=True, exist_ok=True)

urls = []
for m in re.finditer(r"https://images\.fresha\.com/locations/[^\s\"'<>]+", html):
    u = m.group(0).replace("&amp;", "&")
    base = u.split("?")[0]
    if base not in urls:
        urls.append(base)

print("URLs:", len(urls))
downloaded = []
for i, base in enumerate(urls):
    fetch = base + "?f_width=1400"
    dest = gal / f"fresha-{i:02d}.jpg"
    try:
        req = urllib.request.Request(fetch, headers={"User-Agent": "Mozilla/5.0"})
        data = urllib.request.urlopen(req, context=ctx, timeout=45).read()
        if len(data) < 2000:
            continue
        dest.write_bytes(data)
        downloaded.append(dest)
        print("OK", dest.name, len(data))
    except Exception as e:
        print("ERR", base[:80], e)

if downloaded:
    (img_dir / "logo.jpg").write_bytes(downloaded[0].read_bytes())
    (img_dir / "brand-products.jpg").write_bytes(downloaded[0].read_bytes())

manifest = {
    "logo": "logo.jpg",
    "brand": "brand-products.jpg",
    "gallery": [f"gallery/{p.name}" for p in downloaded],
}
(img_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
