# One-time setup for the GCC-Bc-Scrape scheduled task.
# Runs the merged gcc-bc-scraper wrapper every 15 min as SYSTEM.
#
# Also sets GCC_GOOGLE_ADMIN_SECRET as a MACHINE-level env var so the SYSTEM
# task can read it (User-level vars don't apply to SYSTEM).
#
# Run as administrator. Idempotent.

$TaskName    = 'GCC-Bc-Scrape'
$SiteRoot    = Split-Path -Parent $PSScriptRoot
$WebsiteRoot = Split-Path -Parent $SiteRoot
$GccRoot     = Split-Path -Parent $WebsiteRoot
$WorkingDir  = Join-Path $GccRoot 'Extractor\gcc-scoper\gcc-bc-scraper'
$Wrapper     = "$WorkingDir\run-scheduled.cmd"
$IntervalMin = 15

# Source GCC_GOOGLE_ADMIN_SECRET. Promote whatever is already at User
# scope (set by the operator per C:\ProgramData\GCC\secrets\README.md) up
# to Machine scope so the SYSTEM-running scheduled task can read it. If
# it's not set at User scope yet, prompt securely.
$Secret = [Environment]::GetEnvironmentVariable('GCC_GOOGLE_ADMIN_SECRET', 'User')
if ([string]::IsNullOrWhiteSpace($Secret)) {
    $sec    = Read-Host -AsSecureString 'GCC_GOOGLE_ADMIN_SECRET (paste from your password manager)'
    $Secret = [System.Net.NetworkCredential]::new('', $sec).Password
}
if ([string]::IsNullOrWhiteSpace($Secret)) { Write-Host 'No secret provided; aborting.'; exit 1 }

if (-not (Test-Path $Wrapper)) { Write-Host "Missing: $Wrapper"; exit 1 }

# Set GCC_GOOGLE_ADMIN_SECRET + GCC_API_BASE machine-wide so SYSTEM sees them.
[Environment]::SetEnvironmentVariable('GCC_GOOGLE_ADMIN_SECRET', $Secret, 'Machine')
[Environment]::SetEnvironmentVariable('GCC_API_BASE', 'http://localhost:5099', 'Machine')
Write-Host 'Set GCC_GOOGLE_ADMIN_SECRET + GCC_API_BASE at machine scope.'

# Delete existing if present (tolerant).
& schtasks.exe /Delete /TN $TaskName /F 2>&1 | Out-Null

# Use the .cmd wrapper -- no spaces in the path, no quoting headaches.
& schtasks.exe /Create /TN $TaskName /TR $Wrapper /SC MINUTE /MO $IntervalMin /RU 'SYSTEM' /RL HIGHEST /F 2>&1 | Out-Host
if ($LASTEXITCODE -ne 0) { Write-Host "schtasks /Create failed: $LASTEXITCODE"; exit 2 }

# Don't auto-fire -- without storage state the run will exit code 2.
Write-Host ""
Write-Host "Registered $TaskName -- runs every $IntervalMin min as SYSTEM."
& schtasks.exe /Query /TN $TaskName /FO LIST 2>&1 | Select-String -Pattern 'TaskName|Status|Next Run|Last Run|Run As'

Write-Host ""
Write-Host "NEXT STEP: run the one-time login to capture your BC session:"
Write-Host "  cd $WorkingDir"
Write-Host "  npm run login"
Write-Host ""
Write-Host "After that, the scheduled task will start producing rows in dbo.BcRfps automatically."
