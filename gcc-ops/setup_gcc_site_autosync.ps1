# One-time setup for GCC-Site-Sync scheduled task.
# Runs C:\GCC_LLC\Repos\gcc-site\publish.ps1 every 2 minutes as SYSTEM,
# keeping C:\GCC_LLC\IIS\gcc-site in sync with origin/main automatically.
#
# Run as administrator. Idempotent -- re-running rewrites the task definition.

# Note: NOT setting ErrorActionPreference=Stop -- we want native exit codes
# from schtasks.exe (which returns 1 when deleting a non-existent task) to
# be tolerated rather than thrown.

$TaskName    = 'GCC-Site-Sync'
$Script      = 'C:\GCC_LLC\Repos\gcc-site\publish.ps1'
$IntervalMin = 2

if (-not (Test-Path $Script)) {
    Write-Host "Script not found: $Script"
    exit 1
}

# Delete existing if present. Tolerate "task doesn't exist" (exit code 1).
& schtasks.exe /Delete /TN $TaskName /F 2>&1 | Out-Null

# /SC MINUTE /MO 2 = every 2 minutes, repeating forever.
# /RU SYSTEM       = run as NT AUTHORITY\SYSTEM (no password needed).
# /RL HIGHEST      = elevated.
# /F               = overwrite without prompt.
$tr = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$Script`""
& schtasks.exe /Create `
    /TN $TaskName `
    /TR $tr `
    /SC MINUTE `
    /MO $IntervalMin `
    /RU 'SYSTEM' `
    /RL HIGHEST `
    /F 2>&1 | Out-Host
if ($LASTEXITCODE -ne 0) {
    Write-Host "schtasks /Create failed with exit code $LASTEXITCODE"
    exit 2
}

# Fire it once immediately so we don't have to wait for the first interval.
& schtasks.exe /Run /TN $TaskName 2>&1 | Out-Host

Write-Host ""
Write-Host "Registered $TaskName -- runs every $IntervalMin min as SYSTEM."
& schtasks.exe /Query /TN $TaskName /V /FO LIST 2>&1 | Select-String -Pattern 'TaskName|Status|Next Run|Last Run|Run As|Schedule'
