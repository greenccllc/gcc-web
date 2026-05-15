# ============================================================
#  IIS reverse-proxy site for api.greencommllc.com
#  Run from an ELEVATED PowerShell (Run as Administrator).
#
#  - Verifies URL Rewrite + ARR are installed and proxy is enabled
#  - Creates a junction in C:\inetpub\gcc-api -> repo's deploy/iis folder
#    (so web.config edits go live without copying)
#  - Creates an IIS site "GCC-API" bound to *:80:api.greencommllc.com
#  - Opens Windows Firewall for inbound 80/TCP if not already open
#  - Verifies the site responds and the Node backend is reachable
# ============================================================

param(
  [string]$RepoRoot = "C:\Users\nmorr\Documents\GitHub\greencommllc",
  [string]$JunctionPath = "C:\inetpub\gcc-api",
  [string]$SiteName = "GCC-API",
  [string]$Hostname = "api.greencommllc.com",
  [int]$BackendPort = 3001
)

$ErrorActionPreference = 'Stop'
$LogPath = "C:\Users\nmorr\AppData\Local\Temp\setup-api-site.log"
Start-Transcript -Path $LogPath -Force | Out-Null

# 0. Verify elevation
$current = [Security.Principal.WindowsIdentity]::GetCurrent()
$isAdmin = (New-Object Security.Principal.WindowsPrincipal $current).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw "This script must be run as Administrator." }

# 1. Verify source folder
$DeploySource = Join-Path $RepoRoot "deploy\iis"
if (-not (Test-Path -LiteralPath $DeploySource)) {
  throw "Deploy folder not found: $DeploySource. Clone the repo first."
}
$WebConfigSrc = Join-Path $DeploySource "web.config"
if (-not (Test-Path -LiteralPath $WebConfigSrc)) {
  throw "web.config not found at $WebConfigSrc"
}

# 2. URL Rewrite + ARR check
Import-Module WebAdministration
$rewriteInstalled = Test-Path "C:\Windows\System32\inetsrv\rewrite.dll"
if (-not $rewriteInstalled) {
  throw "IIS URL Rewrite module not installed. Get it: https://www.iis.net/downloads/microsoft/url-rewrite"
}
$arrInstalled = Test-Path "C:\Windows\System32\inetsrv\config\applicationHost.config"
$arrEnabled = $false
try {
  $proxyCfg = Get-WebConfigurationProperty -PSPath "MACHINE/WEBROOT/APPHOST" -Filter "system.webServer/proxy" -Name "enabled" -ErrorAction Stop
  $arrEnabled = ($proxyCfg.Value -eq $true) -or ($proxyCfg -eq $true)
} catch { $arrEnabled = $false }
if (-not $arrEnabled) {
  Write-Warning "ARR proxy is not enabled. Enabling now..."
  Set-WebConfigurationProperty -PSPath "MACHINE/WEBROOT/APPHOST" -Filter "system.webServer/proxy" -Name "enabled" -Value "True"
  Write-Host "ARR proxy enabled at the server level."
}

# 3. Create junction
if (Test-Path -LiteralPath $JunctionPath) {
  $item = Get-Item -LiteralPath $JunctionPath -Force
  if ($item.LinkType -eq 'Junction' -or $item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    Remove-Item -LiteralPath $JunctionPath -Force -Recurse
    Write-Host "Removed existing junction at $JunctionPath"
  } else {
    throw "$JunctionPath exists and is not a junction. Move/rename it first."
  }
}
New-Item -ItemType Junction -Path $JunctionPath -Target $DeploySource | Out-Null
Write-Host "Junction $JunctionPath -> $DeploySource"

# 4. Grant IIS_IUSRS read on deploy/iis
$acl = Get-Acl -LiteralPath $DeploySource
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
  "IIS_IUSRS","ReadAndExecute,ListDirectory","ContainerInherit,ObjectInherit","None","Allow"
)
$acl.AddAccessRule($rule)
Set-Acl -LiteralPath $DeploySource -AclObject $acl
Write-Host "Granted IIS_IUSRS read on $DeploySource"

# 5. Remove any pre-existing site with our name
if (Get-Website -Name $SiteName -ErrorAction SilentlyContinue) {
  Remove-Website -Name $SiteName
  Write-Host "Removed prior site '$SiteName'"
}

# 6. Create the site bound to host header on :80
New-Website -Name $SiteName `
            -PhysicalPath $JunctionPath `
            -Port 80 `
            -HostHeader $Hostname `
            -Force | Out-Null
Write-Host "Created site '$SiteName' on http://$Hostname/"

# 7. Firewall — open 80 for inbound (idempotent)
$ruleName = "GCC-API-Inbound-80"
Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName $ruleName `
                    -Direction Inbound `
                    -Protocol TCP `
                    -LocalPort 80 `
                    -Action Allow `
                    -Profile Any | Out-Null
Write-Host "Firewall rule '$ruleName' added for inbound TCP 80"

# 8. Backend health
Start-Sleep -Seconds 1
try {
  $r = Invoke-WebRequest -Uri "http://127.0.0.1:$BackendPort/health" -UseBasicParsing -TimeoutSec 4
  Write-Host "✓ Node backend on $BackendPort responded HTTP $($r.StatusCode)"
} catch {
  Write-Warning "Node backend (port $BackendPort) is NOT responding. Install + start it:"
  Write-Warning "  cd $RepoRoot ; npm install ; npm -w apps/web-server start"
  Write-Warning "  (Use deploy/iis/install-node-service.ps1 to make it auto-start.)"
}

# 9. Site test (skipped if DNS not resolving yet)
try {
  $r2 = Invoke-WebRequest -Uri "http://$Hostname/health" -UseBasicParsing -TimeoutSec 4 -Headers @{ Host = $Hostname }
  Write-Host "✓ http://$Hostname/health -> $($r2.StatusCode)"
} catch {
  Write-Warning "DNS for $Hostname not pointing here yet (expected before you update DNS records)."
}

Write-Host ""
Write-Host "================ Setup complete ================"
Write-Host "Site:        $SiteName"
Write-Host "Host header: $Hostname"
Write-Host "Backend:     http://127.0.0.1:$BackendPort"
Write-Host "Junction:    $JunctionPath -> $DeploySource"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. At your DNS registrar, create a record for $Hostname (see deploy/iis/DEPLOY.md)."
Write-Host "  2. Make sure your router forwards 80/TCP to this host's LAN IP."
Write-Host "  3. Run install-node-service.ps1 to keep the Node backend running."
Write-Host "  4. Test from outside the LAN: curl http://$Hostname/health"
Write-Host ""
Write-Host "Get HTTPS with win-acme: https://www.win-acme.com (free Let's Encrypt cert)."
Write-Host "================================================="

Stop-Transcript | Out-Null
