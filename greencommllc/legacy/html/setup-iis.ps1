# ============================================================
# IIS setup for GCC Bundler
# Run from an ELEVATED PowerShell (Run as Administrator)
# ============================================================
#
#   - Creates a junction at C:\inetpub\bundler -> the GCC source folder
#     (so edits to the source go live without copying)
#   - Stops the conflicting Default Web Site (if it was bound to :80)
#   - Creates/updates IIS site "GCC-Bundler" bound to *:8765
#   - Sets bundle-builder.html as default document
#   - Registers extra MIME types (.gccjob, .json, .xlsx)
#   - Opens Windows Firewall for inbound 8765/TCP
#   - Grants IIS_IUSRS read on the source folder (so IIS can serve files)
#   - Verifies the site responds
#
# Public access: with router port-forwarding 80 -> 10.0.0.194:8765,
#                anyone hitting your public IP on port 80 will reach
#                this site. See the WARNING block at the bottom.
# ============================================================

param(
    [string]$SourceRoot = "C:\Users\nmorr\Downloads\proposal system\Proposal Generator",
    [string]$JunctionPath = "C:\inetpub\bundler",
    [string]$SiteName = "GCC-Bundler",
    [int]$Port = 8765,
    [string]$DefaultDoc = "bundle-builder.html"
)

$ErrorActionPreference = 'Stop'

# Tee all output to a log file so the elevated process leaves a trace.
# Hardcoded path - elevated sessions run under SYSTEM/Admin %TEMP% which
# differs from the calling user's %TEMP%, so don't rely on $env:TEMP.
$LogPath = "C:\Users\nmorr\AppData\Local\Temp\setup-iis.log"
Start-Transcript -Path $LogPath -Force | Out-Null

# 0. Verify elevation
$current = [Security.Principal.WindowsIdentity]::GetCurrent()
$isAdmin = (New-Object Security.Principal.WindowsPrincipal $current).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw "This script must be run as Administrator." }

# 1. Verify source exists
if (-not (Test-Path -LiteralPath $SourceRoot)) {
    throw "Source folder not found: $SourceRoot"
}

# 2. Free port 8765 if anything (e.g., the Node dev server) is holding it
$holders = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
foreach ($h in $holders) {
    Write-Host "Port $Port held by PID $($h.OwningProcess) - stopping..."
    Stop-Process -Id $h.OwningProcess -Force -ErrorAction SilentlyContinue
}

# 3. Create junction C:\inetpub\bundler -> source folder
if (Test-Path -LiteralPath $JunctionPath) {
    $item = Get-Item -LiteralPath $JunctionPath -Force
    if ($item.LinkType -eq 'Junction' -or $item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
        Remove-Item -LiteralPath $JunctionPath -Force -Recurse
        Write-Host "Removed existing junction at $JunctionPath"
    } else {
        throw "$JunctionPath exists and is NOT a junction. Move/rename it first."
    }
}
New-Item -ItemType Junction -Path $JunctionPath -Target $SourceRoot | Out-Null
Write-Host "Created junction $JunctionPath -> $SourceRoot"

# 4. Grant IIS_IUSRS read access on the source folder (junctions inherit)
$acl = Get-Acl -LiteralPath $SourceRoot
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    "IIS_IUSRS","ReadAndExecute,ListDirectory","ContainerInherit,ObjectInherit","None","Allow"
)
$acl.AddAccessRule($rule)
Set-Acl -LiteralPath $SourceRoot -AclObject $acl
Write-Host "Granted IIS_IUSRS read on $SourceRoot"

# 5. Configure IIS - load WebAdministration module
Import-Module WebAdministration

# 5a. Stop Default Web Site if it'd conflict
$dws = Get-Website -Name "Default Web Site" -ErrorAction SilentlyContinue
if ($dws) {
    if ($dws.State -eq "Started") {
        Stop-Website -Name "Default Web Site"
        Write-Host "Stopped 'Default Web Site' (was running on $($dws.Bindings.Collection.bindingInformation -join ', '))"
    }
}

# 5b. Remove any pre-existing site with our name
if (Get-Website -Name $SiteName -ErrorAction SilentlyContinue) {
    Remove-Website -Name $SiteName
    Write-Host "Removed prior site '$SiteName'"
}

# 5c. Create the site bound to *:$Port:
New-Website -Name $SiteName `
            -PhysicalPath $JunctionPath `
            -Port $Port `
            -Force | Out-Null
Write-Host "Created site '$SiteName' on port $Port -> $JunctionPath"

# 5d. Set default document
$siteRoot = "IIS:\Sites\$SiteName"
Clear-WebConfiguration -PSPath $siteRoot -Filter "/system.webServer/defaultDocument/files" -ErrorAction SilentlyContinue
Add-WebConfigurationProperty -PSPath $siteRoot -Filter "/system.webServer/defaultDocument/files" -Name "." -Value @{ value = $DefaultDoc }
Write-Host "Default document set to $DefaultDoc"

# 5e. Register extra MIME types if missing
$mimeMap = @{
    ".gccjob" = "application/octet-stream"
    ".json"   = "application/json"
    ".xlsx"   = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ".woff2"  = "font/woff2"
}
foreach ($ext in $mimeMap.Keys) {
    $existing = Get-WebConfigurationProperty -PSPath $siteRoot -Filter "/system.webServer/staticContent/mimeMap[@fileExtension='$ext']" -Name "." -ErrorAction SilentlyContinue
    if (-not $existing) {
        Add-WebConfigurationProperty -PSPath $siteRoot -Filter "/system.webServer/staticContent" -Name "." -Value @{ fileExtension = $ext; mimeType = $mimeMap[$ext] }
        Write-Host "Added MIME type $ext -> $($mimeMap[$ext])"
    }
}

# 5f. Disable response caching so edits go live immediately
Set-WebConfigurationProperty -PSPath $siteRoot -Filter "/system.webServer/staticContent/clientCache" -Name "cacheControlMode" -Value "DisableCache"

# 6. Firewall - open inbound 8765/TCP
$ruleName = "GCC-Bundler-Inbound-$Port"
Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName $ruleName `
                    -Direction Inbound `
                    -Protocol TCP `
                    -LocalPort $Port `
                    -Action Allow `
                    -Profile Any | Out-Null
Write-Host "Firewall rule '$ruleName' added for inbound TCP $Port"

# 7. Start the site
Start-Website -Name $SiteName

# 8. Verify
Start-Sleep -Seconds 2
try {
    $r = Invoke-WebRequest -Uri "http://localhost:$Port/$DefaultDoc" -UseBasicParsing -TimeoutSec 6
    Write-Host ""
    Write-Host "✓ Local: HTTP $($r.StatusCode) - $([math]::Round($r.RawContentLength/1024)) KB"
} catch {
    Write-Warning "Local check failed: $($_.Exception.Message)"
}
try {
    $r2 = Invoke-WebRequest -Uri "http://10.0.0.194:$Port/$DefaultDoc" -UseBasicParsing -TimeoutSec 6
    Write-Host "✓ LAN  : HTTP $($r2.StatusCode) - $([math]::Round($r2.RawContentLength/1024)) KB"
} catch {
    Write-Warning "LAN check failed: $($_.Exception.Message) (could be firewall, that's OK if WAN port-forward still works)"
}

Write-Host ""
Write-Host "================ Setup complete ================"
Write-Host "Site:        $SiteName"
Write-Host "Physical:    $JunctionPath  ->  $SourceRoot"
Write-Host "Local URL:   http://localhost:$Port/"
Write-Host "LAN URL:     http://10.0.0.194:$Port/"
Write-Host "Public URL:  http://<your-public-ip>/    (router 80 -> 10.0.0.194:$Port)"
Write-Host ""
Write-Host "===================== WARNING ===================="
Write-Host " You're exposing this app to the public internet."
Write-Host " Recommended hardening:"
Write-Host "   1. Get a real domain + Let's Encrypt cert (win-acme)"
Write-Host "      and bind HTTPS on port 443 instead of plain HTTP."
Write-Host "   2. Add Windows Authentication or IP allow-list if"
Write-Host "      this is internal-only."
Write-Host "   3. Consider Cloudflare Tunnel as an alternative -"
Write-Host "      avoids opening ports on your home router."
Write-Host "=================================================="

Stop-Transcript | Out-Null
