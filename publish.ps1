# Sync the IIS gcc-site clone to latest origin/main on GitHub.
#
# Usage (from any shell - self-elevates via UAC):
#   .\publish.ps1
#   .\publish.ps1 -IisPath D:\IIS\gcc-site      # override docroot
#
# By default this script targets itself: it lives inside the cloned IIS
# folder (e.g. D:\IIS\gcc-site\publish.ps1) and uses $PSScriptRoot as the
# repo root. Pass -IisPath or set $env:GCC_SITE_IIS_DIR to override.
# (The old BUDEPC01 path C:\GCC_LLC\IIS\gcc-site is no longer used.)
#
# Steps:
#   1. cd <IisPath>
#   2. git fetch origin
#   3. git reset --hard origin/main   (track + restore everything in main)
#   4. git clean -fdx                 (remove anything not in main)
#   5. Hit / on localhost with Host: greencommllc.com header to confirm IIS
#
# Designed to be idempotent and re-runnable:
#   - safe to re-run with no changes (no-op after fetch)
#   - GCC-Site-Sync scheduled task fires this every 2 min so a `git push`
#     to origin/main propagates to IIS without a human touching the box

param(
    [string]$IisPath = $(if ($env:GCC_SITE_IIS_DIR) { $env:GCC_SITE_IIS_DIR } elseif ($PSScriptRoot -and (Test-Path (Join-Path $PSScriptRoot '.git'))) { $PSScriptRoot } else { 'D:\IIS\gcc-site' })
)

$ErrorActionPreference = 'Continue'

# Self-elevate: relaunch with UAC if not already admin.
$cur = [Security.Principal.WindowsIdentity]::GetCurrent()
if (-not ((New-Object Security.Principal.WindowsPrincipal $cur).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator))) {
    Write-Host "Re-launching elevated..." -ForegroundColor Yellow
    Start-Process -FilePath powershell -Verb RunAs -ArgumentList @(
        '-NoProfile','-ExecutionPolicy','Bypass','-File',$PSCommandPath
    ) -Wait
    exit 0
}

$LogPath = "$env:TEMP\gcc-site-redeploy.log"
Start-Transcript -Path $LogPath -Force | Out-Null
Write-Host "Running as $($cur.Name)"
Write-Host "IisPath: $IisPath"

if (-not (Test-Path $IisPath)) {
    Write-Error "IIS gcc-site path missing: $IisPath"
    Stop-Transcript | Out-Null
    exit 1
}
Set-Location $IisPath

# git runs as SYSTEM under the scheduled task; pin safe.directory so the
# 'dubious ownership' guard doesn't fire on each command. Stays per-call.
$safeArg = "safe.directory=$($IisPath -replace '\\','/')"

# 1. Fetch
Write-Host ""
Write-Host "=== 1. git fetch origin ==="
& git -c $safeArg fetch origin --prune 2>&1 | ForEach-Object { Write-Host "  $_" }

# 2. Capture before/after for the summary
$before = (& git -c $safeArg rev-parse HEAD).Trim()
$remote = (& git -c $safeArg rev-parse origin/main).Trim()

# 3. Hard reset to remote main
Write-Host ""
Write-Host "=== 2. git reset --hard origin/main ==="
& git -c $safeArg reset --hard origin/main 2>&1 | ForEach-Object { Write-Host "  $_" }

# 4. Remove anything not in main (stale untracked files from past manual copies)
Write-Host ""
Write-Host "=== 3. git clean -fdx ==="
& git -c $safeArg clean -fdx 2>&1 | ForEach-Object { Write-Host "  $_" }

$after = (& git -c $safeArg rev-parse HEAD).Trim()

# 5. Summary + smoke test
Write-Host ""
Write-Host "=== 4. Sync summary ==="
Write-Host "  before:  $before"
Write-Host "  after:   $after"
Write-Host "  remote:  $remote"
if ($before -ne $after) {
    $delta = & git -c $safeArg log "$before..$after" --oneline
    Write-Host "  applied:"
    $delta | ForEach-Object { Write-Host "    $_" }
} else {
    Write-Host "  (no new commits)"
}

Write-Host ""
Write-Host "=== 5. Verify ==="
# gcc-site is bound to host header greencommllc.com on this box; localhost
# without the header lands on the default IIS welcome page.
$probes = @('/','/index.html','/contact.html','/services.html')
foreach ($p in $probes) {
    $code = & curl.exe -s -o NUL -w "%{http_code}" -m 8 -H "Host: greencommllc.com" "http://localhost$p"
    Write-Host "  [$code] greencommllc.com$p"
}

Stop-Transcript | Out-Null
Write-Host ""
Write-Host "Log: $LogPath"
