# Salon video sync (Windows)

Your clips are in the **wrong folder** on PC:

```
C:\Users\pcgam\Desktop\progetti CURSOR\siti-web\polesebarbershop\public\video\
```

The site reads videos from:

| Purpose | Correct folder |
|---------|----------------|
| Hero reels, gallery, techniques | `public\assets\video\` |
| Felice bio beside “About” | `public\assets\videos\felice-working.mp4` |

The URL `/video/...` is rewritten to `/assets/video/...` — do **not** keep files only under `public\video\`.

## Quick sync (PowerShell)

From the repo root:

```powershell
cd "C:\Users\pcgam\Desktop\progetti CURSOR\siti-web\polesebarbershop"
.\scripts\sync-videos.ps1
```

Then commit and push:

```powershell
git add public/assets/video public/assets/videos
git commit -m "Add real salon videos"
git push
```

## Mapping table

| Your file in `public\video\` | Copy/rename to | Used on site |
|------------------------------|----------------|--------------|
| `taglio-01` | `public\assets\video\taglio-01.mp4` | Hero grid, service reel |
| `taglio-02` | `public\assets\video\taglio-02.mp4` | Hero grid, service reel |
| `taglio-03` | `public\assets\video\taglio-03.mp4` | Gallery / salon work |
| `colorazione-01` | `public\assets\video\colorazione-01.mp4` | Hero grid, service reel |
| `colorazione-02` | `public\assets\video\colorazione-02.mp4` | Gallery / salon work |
| `colorazione-03` | `public\assets\video\colorazione-03.mp4` | Gallery / salon work |
| `razor fade` | `public\assets\video\razor-fade.mp4` | Tecniche — Razor Fade |
| `taper fade` | `public\assets\video\taper-fade.mp4` | Tecniche — Taper Fade |
| `burst fade` | `public\assets\video\burst-fade.mp4` | Tecniche — Burst Fade |
| `video felice polese bio` | `public\assets\videos\felice-working.mp4` | About section beside bio |
| `meches` | *(optional)* | Not wired — spare / archive |
| `decolorazione cute` | *(optional)* | Not wired — spare / archive |

Filenames may appear without `.mp4` in Explorer; the sync script checks both forms.

## Manual move (if you prefer)

```powershell
$root = "C:\Users\pcgam\Desktop\progetti CURSOR\siti-web\polesebarbershop"
$src  = Join-Path $root "public\video"
$reel = Join-Path $root "public\assets\video"
$bio  = Join-Path $root "public\assets\videos"

New-Item -ItemType Directory -Force -Path $reel, $bio | Out-Null

Copy-Item "$src\taglio-01*"        (Join-Path $reel "taglio-01.mp4")        -Force
Copy-Item "$src\taglio-02*"        (Join-Path $reel "taglio-02.mp4")        -Force
Copy-Item "$src\taglio-03*"        (Join-Path $reel "taglio-03.mp4")        -Force
Copy-Item "$src\colorazione-01*"   (Join-Path $reel "colorazione-01.mp4")   -Force
Copy-Item "$src\colorazione-02*"   (Join-Path $reel "colorazione-02.mp4")   -Force
Copy-Item "$src\colorazione-03*"   (Join-Path $reel "colorazione-03.mp4")   -Force
Copy-Item "$src\razor fade*"        (Join-Path $reel "razor-fade.mp4")       -Force
Copy-Item "$src\taper fade*"        (Join-Path $reel "taper-fade.mp4")       -Force
Copy-Item "$src\burst fade*"        (Join-Path $reel "burst-fade.mp4")       -Force
Copy-Item "$src\video felice polese bio*" (Join-Path $bio "felice-working.mp4") -Force
```

After deploy you will see:

- **Hero** — taglio-01, taglio-02, colorazione-01
- **About Felice** — bio video when `felice-working.mp4` is present
- **Tecniche** — razor fade, taper fade, burst fade
- **Gallery** — taglio-03 + colorazione reels
