# Recover the gcc-site IIS host after a reboot or crash.
#
# Usage (from any shell - self-elevates via UAC):
#   .\ops\recover-iis.ps1
#
# What it does, in order:
#   1. Self-elevate to admin
#   2. Snapshot current service state (W3SVC, WAS, cloudflared, dotnet/express
#      backends if registered as services)
#   3. Set those services to Automatic so the next reboot comes up clean
#   4. Start anything that's stopped
#   5. Start every IIS app pool that isn't running
#   6. iisreset /restart for a clean cycle
#   7. Smoke-test the four canonical URLs from inside the box
#   8. Tail the cloudflared log so we can see if the tunnel is registered
#   9. Write a transcript to %TEMP%\gcc-site-recover.log so the run can be
#      pasted back for triage
#
# Idempotent. Safe to run repeatedly. Designed so a non-developer can double-
# click it via the publish.ps1 sibling pattern and walk away.

$ErrorActionPreference = 'Continue'

# --- 1. Self-elevate ------------------------------------------------------
$cur = [Security.Principal.WindowsIdentity]::GetCurrent()
if (-not ((New-Object Security.Principal.WindowsPrincipal $cur).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator))) {
    Write-Host "Re-launching elevated..." -ForegroundColor Yellow
    Start-Process -FilePath powershell -Verb RunAs -ArgumentList @(
        '-NoProfile','-ExecutionPolicy','Bypass','-File',$PSCommandPath
    ) -Wait
    exit 0
}

$LogPath = "$env:TEMP\gcc-site-recover.log"
Start-Transcript -Path $LogPath -Force | Out-Null
Write-Host "Running as $($cur.Name)"
Write-Host "Log: $LogPath"
Write-Host ""

# --- 2. Service snapshot --------------------------------------------------
# Core services we care about. Backends (dotnet API on :5099, Express admin
# console on :3001) may or may not be registered as Windows services - if
# they're scheduled tasks or run under nssm with a custom name, list them
# here too. Missing services are skipped silently.
$CoreServices = @('WAS','W3SVC','cloudflared')
$BackendServices = @('GCCSite-Api','GCCSite-AdminConsole','gcc-api','gcc-admin-console')
$AllServices = $CoreServices + $BackendServices

Write-Host "=== 1. Service snapshot ==="
$snapshot = foreach ($name in $AllServices) {
    $svc = Get-Service -Name $name -ErrorAction SilentlyContinue
    if ($svc) {
        [pscustomobject]@{
            Name      = $svc.Name
            Status    = $svc.Status
            StartType = $svc.StartType
            Present   = $true
        }
    } else {
        [pscustomobject]@{
            Name      = $name
            Status    = '(not installed)'
            StartType = '-'
            Present   = $false
        }
    }
}
$snapshot | Format-Table -AutoSize | Out-String | Write-Host

# --- 3. Pin startup type to Automatic -------------------------------------
Write-Host "=== 2. Pin services to Automatic ==="
foreach ($row in $snapshot | Where-Object Present) {
    try {
        if ($row.Name -eq 'cloudflared') {
            # Windows PowerShell 5.1 (what `powershell.exe` resolves to on the
            # box) doesn't accept `-StartupType AutomaticDelayedStart` -
            # that enum value only exists in PowerShell 7+. Shell out to
            # sc.exe so this works on both shells. The literal space after
            # `start=` is required by sc.exe's argument parser.
            $sc = & sc.exe config $row.Name start= delayed-auto 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  $($row.Name): AutomaticDelayedStart (via sc.exe)"
            } else {
                throw "sc.exe exited $LASTEXITCODE: $sc"
            }
        } else {
            Set-Service -Name $row.Name -StartupType Automatic -ErrorAction Stop
            Write-Host "  $($row.Name): Automatic"
        }
    } catch {
        Write-Host "  $($row.Name): could not set ($($_.Exception.Message))" -ForegroundColor Yellow
    }
}
Write-Host ""

# --- 4. Start anything stopped -------------------------------------------
Write-Host "=== 3. Start stopped services ==="
foreach ($row in $snapshot | Where-Object { $_.Present -and $_.Status -ne 'Running' }) {
    try {
        Start-Service -Name $row.Name -ErrorAction Stop
        Write-Host "  $($row.Name): started" -ForegroundColor Green
    } catch {
        Write-Host "  $($row.Name): start FAILED - $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# --- 5. App pools --------------------------------------------------------
Write-Host "=== 4. IIS app pools ==="
Import-Module WebAdministration -ErrorAction SilentlyContinue
if (Get-Module WebAdministration) {
    Get-ChildItem IIS:\AppPools | ForEach-Object {
        $pool = $_
        $state = (Get-WebAppPoolState -Name $pool.Name).Value
        if ($state -ne 'Started') {
            try {
                Start-WebAppPool -Name $pool.Name
                Write-Host "  $($pool.Name): was $state, started" -ForegroundColor Green
            } catch {
                Write-Host "  $($pool.Name): was $state, start FAILED - $($_.Exception.Message)" -ForegroundColor Red
            }
        } else {
            Write-Host "  $($pool.Name): Started"
        }
    }
} else {
    Write-Host "  WebAdministration module not available - skipping app-pool check" -ForegroundColor Yellow
}
Write-Host ""

# --- 6. iisreset --------------------------------------------------------
Write-Host "=== 5. iisreset /restart ==="
& iisreset /restart 2>&1 | ForEach-Object { Write-Host "  $_" }
Write-Host ""

# --- 7. Smoke test ------------------------------------------------------
Write-Host "=== 6. Smoke test (Host: greencommllc.com) ==="
$probes = @('/','/index.html','/contact.html','/services.html','/admin/','/admin/console/')
foreach ($p in $probes) {
    $code = & curl.exe -s -o NUL -w "%{http_code}" -m 8 -H "Host: greencommllc.com" "http://localhost$p"
    $color = if ($code -match '^[23]') { 'Green' } elseif ($code -match '^3') { 'Cyan' } else { 'Red' }
    Write-Host ("  [{0}] {1}" -f $code, $p) -ForegroundColor $color
}
Write-Host ""

# Also probe the api host header so we catch a broken backend separately
Write-Host "=== 7. Smoke test (Host: api.greencommllc.com) ==="
$apiProbes = @('/','/health')
foreach ($p in $apiProbes) {
    $code = & curl.exe -s -o NUL -w "%{http_code}" -m 8 -H "Host: api.greencommllc.com" "http://localhost$p"
    $color = if ($code -match '^[23]') { 'Green' } else { 'Red' }
    Write-Host ("  [{0}] {1}" -f $code, $p) -ForegroundColor $color
}
Write-Host ""

# --- 8. Cloudflared log tail --------------------------------------------
Write-Host "=== 8. cloudflared log (last 30 lines) ==="
$cfLogs = @(
    "$env:ProgramData\Cloudflare\cloudflared\cloudflared.log",
    "$env:USERPROFILE\.cloudflared\cloudflared.log"
) | Where-Object { Test-Path $_ }
if ($cfLogs) {
    Get-Content $cfLogs[0] -Tail 30 | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host "  No cloudflared log found at the usual locations." -ForegroundColor Yellow
    Write-Host "  Try: Get-WinEvent -ProviderName cloudflared -MaxEvents 30"
}
Write-Host ""

# --- 9. Final state ------------------------------------------------------
Write-Host "=== 9. Final service state ==="
foreach ($name in $AllServices) {
    $svc = Get-Service -Name $name -ErrorAction SilentlyContinue
    if ($svc) {
        $color = if ($svc.Status -eq 'Running') { 'Green' } else { 'Red' }
        Write-Host ("  {0,-25} {1}" -f $svc.Name, $svc.Status) -ForegroundColor $color
    }
}

Stop-Transcript | Out-Null
Write-Host ""
Write-Host "Done. Full transcript: $LogPath" -ForegroundColor Cyan
