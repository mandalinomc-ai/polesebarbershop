"""Scarica logo e foto da Instagram / Fresha per Polese Barbershop."""
import json
import re
import ssl
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "images"
GAL = IMG / "gallery"
IMG.mkdir(parents=True, exist_ok=True)
GAL.mkdir(parents=True, exist_ok=True)

CTX = ssl.create_default_context()
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"


def fetch(url, dest=None):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, context=CTX, timeout=30) as r:
        data = r.read()
        if dest:
            Path(dest).write_bytes(data)
        return data


def download_instagram():
    urls = []
    # Profilo pubblico — estrazione da pagina embed
    for endpoint in [
        "https://www.instagram.com/felicepolese_barber/?__a=1&__d=dis",
        "https://www.instagram.com/api/v1/users/web_profile_info/?username=felicepolese_barber",
    ]:
        try:
            req = urllib.request.Request(
                endpoint,
                headers={
                    "User-Agent": UA,
                    "X-IG-App-ID": "936619743392459",
                    "Accept": "application/json",
                },
            )
            with urllib.request.urlopen(req, context=CTX, timeout=20) as r:
                raw = r.read().decode("utf-8", errors="ignore")
                urls.extend(re.findall(r"https://[^\"'\\s]+cdninstagram\\.com[^\"'\\s]+", raw))
        except Exception as e:
            print("IG endpoint fail:", endpoint, e)

    # Jina reader fallback
    try:
        raw = fetch("https://r.jina.ai/https://www.instagram.com/felicepolese_barber/").decode("utf-8", errors="ignore")
        urls.extend(re.findall(r"https://[^\"'\\s]+cdninstagram\\.com[^\"'\\s]+", raw))
    except Exception as e:
        print("Jina IG fail:", e)

    return list(dict.fromkeys(urls))


def download_fresha():
    urls = []
    try:
        html = fetch("https://www.fresha.com/it/a/felicepolese-barber-benevento-via-giuseppe-ungaretti-6-lhtcfefq").decode("utf-8", errors="ignore")
        urls.extend(re.findall(r"https://[^\"'\\s]+(?:fresha|cloudinary|images)[^\"'\\s]*\\.(?:jpg|jpeg|png|webp)", html, re.I))
        og = re.search(r'property="og:image" content="([^"]+)"', html)
        if og:
            urls.insert(0, og.group(1))
    except Exception as e:
        print("Fresha fail:", e)
    return list(dict.fromkeys(urls))


def main():
    all_urls = download_instagram() + download_fresha()
    print(f"Trovati {len(all_urls)} URL immagine")

    manifest = {"sources": [], "logo": None, "gallery": []}

    for i, url in enumerate(all_urls[:12]):
        ext = ".jpg"
        if ".webp" in url:
            ext = ".webp"
        elif ".png" in url:
            ext = ".png"
        name = f"source-{i:02d}{ext}"
        dest = GAL / name
        try:
            fetch(url, dest)
            size = dest.stat().st_size
            if size < 2000:
                dest.unlink(missing_ok=True)
                continue
            print("OK", name, size)
            manifest["sources"].append({"url": url, "file": f"gallery/{name}"})
        except Exception as e:
            print("Skip", url[:80], e)

    # Logo = prima immagine quadrata o profile pic (solitamente contiene 'profile' o piccola)
    for item in manifest["sources"]:
        u = item["url"].lower()
        if "profile" in u or "150x150" in u or "s150x150" in u:
            src = ROOT / "assets" / "images" / item["file"]
            logo_png = IMG / "logo.png"
            logo_png.write_bytes(src.read_bytes())
            manifest["logo"] = "logo.png"
            print("Logo impostato da profile pic")
            break

    if not manifest["logo"] and manifest["sources"]:
        first = ROOT / "assets" / "images" / manifest["sources"][0]["file"]
        (IMG / "logo.png").write_bytes(first.read_bytes())
        manifest["logo"] = "logo.png"
        print("Logo fallback prima immagine")

    manifest["gallery"] = [s["file"] for s in manifest["sources"][:6]]
    (IMG / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print("Manifest scritto")


if __name__ == "__main__":
    main()
