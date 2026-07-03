from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "images"
GAL = IMG / "gallery"

products = Image.open(GAL / "fresha-00.jpg")
w, h = products.size
# Barattolo con logo in basso a sinistra
logo_crop = products.crop((int(w * 0.02), int(h * 0.52), int(w * 0.42), int(h * 0.98)))
logo_crop.save(IMG / "logo.png")
logo_crop.resize((512, 512), Image.LANCZOS).save(IMG / "logo-512.png")

interior = Image.open(GAL / "fresha-01.jpg")
iw, ih = interior.size
marble = interior.crop((int(iw * 0.15), int(ih * 0.55), int(iw * 0.85), int(ih * 0.95)))
marble.save(IMG / "marble-texture.jpg")

interior.save(IMG / "hero-bg.jpg")
print("logo.png", logo_crop.size)
print("marble-texture.jpg", marble.size)
print("hero-bg.jpg saved")
