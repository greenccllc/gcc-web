# Go-live HTTPS script. Run AFTER win-acme has issued a cert covering
# api.greencommllc.com. Updates appsettings.json to bind Kestrel on 443
# with the cert loaded from the Windows cert store by subject name.
#
# Also grants NETWORK SERVICE (the API app-pool identity) read access
# to the cert's private key.

$ErrorActionPreference = 'Stop'
$LogPath = "C:\Users\nmorr\AppData\Local\Temp\go-live-https.log"
Start-Transcript -Path $LogPath -Force | Out-Null

$current = [Security.Principal.WindowsIdentity]::GetCurrent()
if (-not ((New-Object Security.Principal.WindowsPrincipal $current).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator))) {
    throw "Run elevated."
}

$CertSubject = "api.greencommllc.com"

# 1. Find cert in WebHosting store (win-acme drops here)
$stores = @('WebHosting','My')
$cert = $null
foreach ($s in $stores) {
    $c = Get-ChildItem "Cert:\LocalMachine\$s" -ErrorAction SilentlyContinue | Where-Object {
        $_.Subject -match "CN=$CertSubject" -or ($_.DnsNameList.Unicode -contains $CertSubject)
    } | Sort-Object NotAfter -Descending | Select-Object -First 1
    if ($c) { $cert = $c; $foundStore = $s; break }
}
if (-not $cert) {
    Write-Error "No cert found covering $CertSubject. Run win-acme first."
    Stop-Transcript | Out-Null
    exit 1
}
Write-Host "Found cert: Thumbprint=$($cert.Thumbprint)  Store=$foundStore  Expires=$($cert.NotAfter)"

# 2. Grant NETWORK SERVICE read access to the private key
# (required so the API process can use the cert)
try {
    $keyName = ([System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)).Key.UniqueName
    $keyPath = "$env:ProgramData\Microsoft\Crypto\RSA\MachineKeys\$keyName"
    if (Test-Path $keyPath) {
        icacls $keyPath /grant "NETWORK SERVICE:R" /Q | Out-Null
        Write-Host "Granted NETWORK SERVICE read on private key"
    } else {
        Write-Warning "Could not locate private key at $keyPath"
    }
} catch {
    Write-Warning "Key ACL grant failed: $($_.Exception.Message)"
}

# 3. Update appsettings.json to add Kestrel HTTPS endpoint
$cfgPath = "C:\GCC_LLC\IIS\gcc-api\appsettings.json"
$cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json

# Add Kestrel config
if (-not $cfg.Kestrel) {
    $cfg | Add-Member -NotePropertyName 'Kestrel' -NotePropertyValue @{
        Endpoints = @{
            Http  = @{ Url = "http://0.0.0.0:5099" }
            Https = @{
                Url = "https://0.0.0.0:443"
                Certificate = @{
                    Subject     = $CertSubject
                    Store       = $foundStore
                    Location    = "LocalMachine"
                    AllowInvalid = $false
                }
            }
        }
    } -Force
} else {
    # Replace existing
    $cfg.Kestrel = @{
        Endpoints = @{
            Http  = @{ Url = "http://0.0.0.0:5099" }
            Https = @{
                Url = "https://0.0.0.0:443"
                Certificate = @{
                    Subject     = $CertSubject
                    Store       = $foundStore
                    Location    = "LocalMachine"
                    AllowInvalid = $false
                }
            }
        }
    }
}
$cfg | ConvertTo-Json -Depth 10 | Set-Content -Path $cfgPath -Encoding UTF8
icacls $cfgPath /inheritance:r 2>$null | Out-Null
icacls $cfgPath /grant "NETWORK SERVICE:(R)" "BUILTIN\Administrators:(F)" "BUDEPC01\nmorr:(F)" /Q | Out-Null
Write-Host "Updated appsettings.json with Kestrel HTTPS endpoint"

# 4. URL reservation for http.sys (lets NETWORK SERVICE bind :443)
& netsh http add urlacl url="https://+:443/" user="NT AUTHORITY\NETWORK SERVICE" 2>&1 | Out-Null
Write-Host "Reserved https://+:443/ for NETWORK SERVICE"

# 5. Restart API
Stop-ScheduledTask -TaskName "GCC-Api-Service" -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Start-ScheduledTask -TaskName "GCC-Api-Service"
Start-Sleep -Seconds 5

# 6. Verify
try {
    # Use -SkipCertificateCheck if PS7, or set TLS callback in 5.1
    [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
    $r = Invoke-WebRequest "https://127.0.0.1/api/health" -Headers @{ Host = 'api.greencommllc.com' } -UseBasicParsing -TimeoutSec 10
    Write-Host "HTTPS up: $($r.StatusCode) $($r.Content.Substring(0, [Math]::Min(80, $r.Content.Length)))"
} catch {
    Write-Warning "HTTPS test failed: $($_.Exception.Message)"
}

Stop-Transcript | Out-Null
Write-Host "Done. Check $LogPath for full log."
