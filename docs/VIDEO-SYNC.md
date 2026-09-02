# Salon video sync (Windows)

Your clips live in the **source folder** on PC (not where the site reads them):

```
C:\Users\pcgam\Desktop\progetti CURSOR\siti-web\polesebarbershop\public\video\
```

The site serves videos from `public\assets\video\`. The URL `/video/...` is rewritten to `/assets/video/...` — do **not** leave files only under `public\video\`.

## Quick sync (PowerShell)

From the repo root — **no manual rename needed**:

```powershell
cd "C:\Users\pcgam\Desktop\progetti CURSOR\siti-web\polesebarbershop"
.\scripts\sync-videos.ps1
```

The script reads your original filenames from `public\video\` and copies them into `public\assets\video\` with URL-safe names.

Then commit and push:

```powershell
git add public/assets/video
git commit -m "Add real salon videos"
git push
```

## Mapping table

| Your file in `public\video\` | Copied to (dest) | Site URL |
|------------------------------|------------------|----------|
| `taglio-01` | `public\assets\video\taglio-01.mp4` | `/video/taglio-01.mp4` |
| `taglio-02` | `public\assets\video\taglio-02.mp4` | `/video/taglio-02.mp4` |
| `taglio-03` | `public\assets\video\taglio-03.mp4` | `/video/taglio-03.mp4` |
| `colorazione-01` | `public\assets\video\colorazione-01.mp4` | `/video/colorazione-01.mp4` |
| `colorazione-02` | `public\assets\video\colorazione-02.mp4` | `/video/colorazione-02.mp4` |
| `colorazione-03` | `public\assets\video\colorazione-03.mp4` | `/video/colorazione-03.mp4` |
| `razor fade` | `public\assets\video\razor-fade.mp4` | `/video/razor-fade.mp4` |
| `taper fade` | `public\assets\video\taper-fade.mp4` | `/video/taper-fade.mp4` |
| `burst fade` | `public\assets\video\burst-fade.mp4` | `/video/burst-fade.mp4` |
| **`video felice polese bio`** | **`public\assets\video\video-felice-polese-bio.mp4`** | **`/video/video-felice-polese-bio.mp4`** (About section beside bio) |
| `meches` | *(optional — not wired)* | — |
| `decolorazione cute` | *(optional — not wired)* | — |

Filenames may appear without `.mp4` in Explorer; the sync script checks both forms.

## Bio video (Felice beside About)

1. Put your clip in `public\video\` as **`video felice polese bio.mp4`** (exact name, spaces OK).
2. Run `.\scripts\sync-videos.ps1` — it copies to `public\assets\video\video-felice-polese-bio.mp4`.
3. Commit and push. The About section shows the video when that synced file exists.

## Manual copy (if you prefer)

```powershell
$root = "C:\Users\pcgam\Desktop\progetti CURSOR\siti-web\polesebarbershop"
$src  = Join-Path $root "public\video"
$dest = Join-Path $root "public\assets\video"

New-Item -ItemType Directory -Force -Path $dest | Out-Null

Copy-Item "$src\taglio-01*"              (Join-Path $dest "taglio-01.mp4")              -Force
Copy-Item "$src\taglio-02*"              (Join-Path $dest "taglio-02.mp4")              -Force
Copy-Item "$src\taglio-03*"              (Join-Path $dest "taglio-03.mp4")              -Force
Copy-Item "$src\colorazione-01*"         (Join-Path $dest "colorazione-01.mp4")         -Force
Copy-Item "$src\colorazione-02*"         (Join-Path $dest "colorazione-02.mp4")         -Force
Copy-Item "$src\colorazione-03*"         (Join-Path $dest "colorazione-03.mp4")         -Force
Copy-Item "$src\razor fade*"             (Join-Path $dest "razor-fade.mp4")             -Force
Copy-Item "$src\taper fade*"             (Join-Path $dest "taper-fade.mp4")             -Force
Copy-Item "$src\burst fade*"             (Join-Path $dest "burst-fade.mp4")             -Force
Copy-Item "$src\video felice polese bio*" (Join-Path $dest "video-felice-polese-bio.mp4") -Force
```

After deploy you will see:

- **Hero** — taglio-01, taglio-02, colorazione-01
- **About Felice** — bio video when `video-felice-polese-bio.mp4` is present
- **Tecniche** — razor fade, taper fade, burst fade
- **Gallery** — taglio-03 + colorazione reels
