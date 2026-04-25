# DNS watcher - runs every 20 min via Task Scheduler.
# Checks if GoDaddy authoritative NS is serving our new records.
# When it sees the apex resolving to 150.195.183.104, runs win-acme
# to issue HTTPS certs for greencommllc.com + www + proposal.

$LogPath = "C:\Users\nmorr\AppData\Local\Temp\dns-watcher.log"
$TargetIp = "150.195.183.104"
$Hosts = @("greencommllc.com", "www.greencommllc.com", "proposal.greencommllc.com")
$WacsPath = "C:\tools\win-acme\wacs.exe"
$MarkerFile = "C:\Users\nmorr\.unifi\cert-issued.marker"

function Log($msg) {
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
    Add-Content -Path $LogPath -Value $line
}

Log "Watcher tick"

if (Test-Path $MarkerFile) {
    Log "Marker exists, cert already issued. Task can be disabled."
    exit 0
}

$allOk = $true
foreach ($h in $Hosts) {
    $viaAuth = $null
    try {
        $r = Resolve-DnsName $h -Server 'ns29.domaincontrol.com' -DnsOnly -ErrorAction Stop
        $a = ($r | Where-Object { $_.Type -eq 'A' } | Select-Object -First 1).IPAddress
        $c = ($r | Where-Object { $_.Type -eq 'CNAME' } | Select-Object -First 1).NameHost
        if ($c) { $viaAuth = "CNAME=$c" } else { $viaAuth = $a }
    } catch { $viaAuth = "err:$($_.Exception.Message)" }

    $viaPublic = $null
    try {
        $r = Invoke-RestMethod "https://dns.google/resolve?name=$h&type=A" -TimeoutSec 5
        if ($r.Answer) {
            $viaPublic = ($r.Answer | Where-Object { $_.type -eq 1 } | Select-Object -First 1).data
        }
    } catch {}

    $ok = $viaPublic -eq $TargetIp
    Log "  $h  auth=$viaAuth  public=$viaPublic  ok=$ok"
    if (-not $ok) { $allOk = $false }
}

if (-not $allOk) {
    Log "DNS not ready yet"
    exit 0
}

Log "DNS propagated. Running win-acme..."

$wacArgs = @(
    "--target", "manual",
    "--host", "greencommllc.com,www.greencommllc.com,proposal.greencommllc.com",
    "--store", "certificatestore",
    "--certificatestore", "WebHosting",
    "--installation", "iis",
    "--accepttos",
    "--emailaddress", "info@greencommllc.com"
)

try {
    & $WacsPath @wacArgs 2>&1 | ForEach-Object { Log $_ }
    $exitCode = $LASTEXITCODE
    Log "wacs exit code: $exitCode"
    if ($exitCode -eq 0) {
        Set-Content -Path $MarkerFile -Value ((Get-Date).ToString())
        Log "Marker written: cert issued"
    }
} catch {
    Log "win-acme error: $_"
}
