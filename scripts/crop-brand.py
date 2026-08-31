from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "images"
GAL = IMG / "gallery"

# Official Felice Polese mark lives in logo.png / logo-512.png (exported from PDF).
# Do not overwrite those files from product photography.

interior = Image.open(GAL / "fresha-01.jpg")
iw, ih = interior.size
marble = interior.crop((int(iw * 0.15), int(ih * 0.55), int(iw * 0.85), int(ih * 0.95)))
marble.save(IMG / "marble-texture.jpg")

interior.save(IMG / "hero-bg.jpg")
print("marble-texture.jpg", marble.size)
print("hero-bg.jpg saved")
