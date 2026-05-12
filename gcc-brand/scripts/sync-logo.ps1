# Mirror the master ICO -> raster/ + extract per-size PNGs.
# Run after dropping a new gcc-logo-transparent.ico into source/.
#
# Idempotent.

[CmdletBinding()]
param(
  [string]$Master = (Join-Path $PSScriptRoot '..\source\gcc-logo-transparent.ico'),
  [string]$OutDir = (Join-Path $PSScriptRoot '..\raster'),
  [int[]]$Sizes  = @(16, 24, 32, 48, 64, 128, 256)
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $Master)) {
  throw "Master ICO not found at $Master"
}
$Master = (Resolve-Path -LiteralPath $Master).Path
if (-not (Test-Path -LiteralPath $OutDir)) { New-Item -ItemType Directory -Force -Path $OutDir | Out-Null }
$OutDir = (Resolve-Path -LiteralPath $OutDir).Path

Add-Type -AssemblyName System.Drawing

# 1) Mirror master ICO -> raster/gcc-logo.ico
$dstIco = Join-Path $OutDir 'gcc-logo.ico'
Copy-Item -LiteralPath $Master -Destination $dstIco -Force
Write-Host "mirrored $dstIco"

# 2) Extract per-size PNGs.
foreach ($size in $Sizes) {
  $dstPng = Join-Path $OutDir ("gcc-logo-{0}.png" -f $size)
  $ico = New-Object System.Drawing.Icon $Master, $size, $size
  $bmp = $ico.ToBitmap()
  if ($bmp.Width -ne $size) {
    $resized = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($resized)
    $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($bmp, 0, 0, $size, $size)
    $g.Dispose()
    $resized.Save($dstPng, [System.Drawing.Imaging.ImageFormat]::Png)
    $resized.Dispose()
  } else {
    $bmp.Save($dstPng, [System.Drawing.Imaging.ImageFormat]::Png)
  }
  $bmp.Dispose(); $ico.Dispose()
  Write-Host "wrote $dstPng"
}
