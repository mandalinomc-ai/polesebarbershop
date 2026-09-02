# Sync salon mp4 from the wrong Windows folder (public/video/) to repo paths.
# Run from repo root in PowerShell:
#   .\scripts\sync-videos.ps1
#
# Optional custom source:
#   .\scripts\sync-videos.ps1 -SourceDir "C:\path\to\public\video"

param(
    [string]$SourceDir = "$PSScriptRoot\..\public\video",
    [string]$ReelDir = "$PSScriptRoot\..\public\assets\video"
)

$ErrorActionPreference = "Stop"

function Resolve-SourceFile {
    param([string]$BaseName)
    $candidates = @(
        (Join-Path $SourceDir "$BaseName.mp4"),
        (Join-Path $SourceDir $BaseName)
    )
    foreach ($path in $candidates) {
        if (Test-Path -LiteralPath $path -PathType Leaf) {
            return $path
        }
    }
    return $null
}

function Copy-Video {
    param(
        [string]$SourceBase,
        [string]$DestPath
    )
    $src = Resolve-SourceFile -BaseName $SourceBase
    if (-not $src) {
        Write-Warning "SKIP (not found): $SourceBase"
        return $false
    }
    $destParent = Split-Path -Parent $DestPath
    if (-not (Test-Path -LiteralPath $destParent)) {
        New-Item -ItemType Directory -Path $destParent -Force | Out-Null
    }
    Copy-Item -LiteralPath $src -Destination $DestPath -Force
    Write-Host "OK  $SourceBase -> $DestPath"
    return $true
}

# Source base name (in public/video/) -> destination relative to repo
$Mappings = [ordered]@{
    "taglio-01"              = Join-Path $ReelDir "taglio-01.mp4"
    "taglio-02"              = Join-Path $ReelDir "taglio-02.mp4"
    "taglio-03"              = Join-Path $ReelDir "taglio-03.mp4"
    "colorazione-01"         = Join-Path $ReelDir "colorazione-01.mp4"
    "colorazione-02"         = Join-Path $ReelDir "colorazione-02.mp4"
    "colorazione-03"         = Join-Path $ReelDir "colorazione-03.mp4"
    "razor fade"             = Join-Path $ReelDir "razor-fade.mp4"
    "taper fade"             = Join-Path $ReelDir "taper-fade.mp4"
    "burst fade"             = Join-Path $ReelDir "burst-fade.mp4"
    "decolorazione cute"     = Join-Path $ReelDir "decolorazione-cute.mp4"
    "video felice polese bio" = Join-Path $ReelDir "video-felice-polese-bio.mp4"
}

Write-Host ""
Write-Host "Salon video sync"
Write-Host "  Source : $SourceDir"
Write-Host "  Dest   : $ReelDir"
Write-Host ""

if (-not (Test-Path -LiteralPath $SourceDir)) {
    Write-Error "Source folder not found: $SourceDir"
}

$copied = 0
$skipped = 0
foreach ($entry in $Mappings.GetEnumerator()) {
    if (Copy-Video -SourceBase $entry.Key -DestPath $entry.Value) {
        $copied++
    } else {
        $skipped++
    }
}

Write-Host ""
Write-Host "Optional clips (not copied — site works without them):"
Write-Host "  meches            -> spare colorazione reel or archive"
Write-Host "  barba-pro.jpg / tintura-barba.jpg -> public/images/"
Write-Host ""
Write-Host "Done: $copied copied, $skipped skipped."
Write-Host ""
Write-Host "Next steps:"
Write-Host "  git add public/assets/video"
Write-Host "  git commit -m \"Add real salon videos\""
Write-Host "  git push"
