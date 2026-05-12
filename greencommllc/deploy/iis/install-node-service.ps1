# ============================================================
#  Run the GCC Node web-server as a Windows service via NSSM.
#  Run from an ELEVATED PowerShell (Run as Administrator).
#
#  - Downloads NSSM (Non-Sucking Service Manager) if not present
#  - Installs / updates a Windows service called "GCC-WebServer"
#  - Configures it to run `npm -w apps/web-server start` from the repo
#  - Starts the service and verifies the backend responds on :3001
#
#  After this runs:
#    - Reboot survives — the service starts automatically
#    - Logs at C:\ProgramData\GCC-WebServer\service.log
# ============================================================

param(
  [string]$RepoRoot = "C:\Users\nmorr\Documents\GitHub\greencommllc",
  [string]$ServiceName = "GCC-WebServer",
  [string]$NodeExe = "C:\Program Files\nodejs\node.exe",
  [int]$Port = 3001
)

$ErrorActionPreference = 'Stop'
$LogPath = "C:\Users\nmorr\AppData\Local\Temp\install-node-service.log"
Start-Transcript -Path $LogPath -Force | Out-Null

# 0. Verify elevation
$current = [Security.Principal.WindowsIdentity]::GetCurrent()
$isAdmin = (New-Object Security.Principal.WindowsPrincipal $current).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw "This script must be run as Administrator." }

# 1. Verify Node + repo
if (-not (Test-Path $NodeExe)) { throw "Node not found at $NodeExe. Install Node.js LTS first." }
if (-not (Test-Path $RepoRoot)) { throw "Repo not found at $RepoRoot. Clone it first." }

$ServerDir = Join-Path $RepoRoot "apps\web-server"
$ServerEntry = Join-Path $ServerDir "index.js"
if (-not (Test-Path $ServerEntry)) { throw "Server entry not found at $ServerEntry" }

# 2. Get NSSM
$NssmDir = "C:\Program Files\nssm"
$NssmExe = Join-Path $NssmDir "nssm.exe"
if (-not (Test-Path $NssmExe)) {
  Write-Host "Downloading NSSM..."
  $tmpZip = "$env:TEMP\nssm.zip"
  $tmpExtract = "$env:TEMP\nssm-extract"
  Invoke-WebRequest -Uri "https://nssm.cc/release/nssm-2.24.zip" -OutFile $tmpZip
  if (Test-Path $tmpExtract) { Remove-Item $tmpExtract -Recurse -Force }
  Expand-Archive -Path $tmpZip -DestinationPath $tmpExtract
  New-Item -ItemType Directory -Path $NssmDir -Force | Out-Null
  $arch = if ([Environment]::Is64BitOperatingSystem) { "win64" } else { "win32" }
  Copy-Item -Path "$tmpExtract\nssm-2.24\$arch\nssm.exe" -Destination $NssmExe -Force
  Remove-Item $tmpZip, $tmpExtract -Recurse -Force
  Write-Host "NSSM installed at $NssmExe"
}

# 3. Stop + remove any existing service
$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
  if ($existing.Status -eq 'Running') {
    & $NssmExe stop $ServiceName confirm | Out-Null
    Write-Host "Stopped existing service '$ServiceName'"
  }
  & $NssmExe remove $ServiceName confirm | Out-Null
  Write-Host "Removed existing service '$ServiceName'"
}

# 4. Service log directory
$ServiceLogDir = "C:\ProgramData\$ServiceName"
New-Item -ItemType Directory -Path $ServiceLogDir -Force | Out-Null

# 5. Install via NSSM. We run node index.js directly to avoid an
#    npm-cmd intermediate process which complicates signal handling.
& $NssmExe install $ServiceName $NodeExe "$ServerEntry" | Out-Null
& $NssmExe set $ServiceName AppDirectory $ServerDir | Out-Null
& $NssmExe set $ServiceName DisplayName "GCC Web Server (Node)" | Out-Null
& $NssmExe set $ServiceName Description "GCC LLC Express webhook + integrations server (apps/web-server)" | Out-Null
& $NssmExe set $ServiceName Start SERVICE_AUTO_START | Out-Null
& $NssmExe set $ServiceName AppStdout "$ServiceLogDir\service.log" | Out-Null
& $NssmExe set $ServiceName AppStderr "$ServiceLogDir\service.log" | Out-Null
& $NssmExe set $ServiceName AppRotateFiles 1 | Out-Null
& $NssmExe set $ServiceName AppRotateBytes 5242880 | Out-Null
& $NssmExe set $ServiceName AppEnvironmentExtra "NODE_ENV=production" "PORT=$Port" | Out-Null
Write-Host "Service '$ServiceName' configured."

# 6. Start it
& $NssmExe start $ServiceName | Out-Null
Start-Sleep -Seconds 3

# 7. Verify
try {
  $r = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/health" -UseBasicParsing -TimeoutSec 5
  Write-Host "✓ Service responding: HTTP $($r.StatusCode)"
} catch {
  Write-Warning "Service is not responding on :$Port. Check logs at $ServiceLogDir\service.log"
}

Write-Host ""
Write-Host "================ Service installed ================"
Write-Host "Name:        $ServiceName"
Write-Host "Working dir: $ServerDir"
Write-Host "Logs:        $ServiceLogDir\service.log"
Write-Host "Manage:      sc query $ServiceName"
Write-Host "             sc start $ServiceName"
Write-Host "             sc stop  $ServiceName"
Write-Host "===================================================="

Stop-Transcript | Out-Null
