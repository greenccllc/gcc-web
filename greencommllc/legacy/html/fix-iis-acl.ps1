# Run elevated. Grants IUSR (anonymous IIS user) and ApplicationPoolIdentity
# read access to the source folder so the GCC-Bundler site can serve files.

$ErrorActionPreference = 'Stop'
$LogPath = "C:\Users\nmorr\AppData\Local\Temp\fix-iis-acl.log"
Start-Transcript -Path $LogPath -Force | Out-Null

$SourceRoot = "C:\Users\nmorr\Downloads\proposal system\Proposal Generator"
$SiteName   = "GCC-Bundler"

$current = [Security.Principal.WindowsIdentity]::GetCurrent()
$isAdmin = (New-Object Security.Principal.WindowsPrincipal $current).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw "Run as Administrator." }

# Grant IUSR (the anonymous web user) read on source folder
$acl = Get-Acl -LiteralPath $SourceRoot
$accounts = @("IUSR", "IIS AppPool\$SiteName", "NT SERVICE\W3SVC")
foreach ($acct in $accounts) {
    try {
        $rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
            $acct, "ReadAndExecute,ListDirectory", "ContainerInherit,ObjectInherit", "None", "Allow"
        )
        $acl.AddAccessRule($rule)
        Write-Host "Granted ReadAndExecute to $acct"
    } catch {
        Write-Warning "Could not add $acct - $($_.Exception.Message)"
    }
}
Set-Acl -LiteralPath $SourceRoot -AclObject $acl
Write-Host "ACL applied to $SourceRoot"

# Push ACL down to all existing children too (junctions don't always inherit cleanly)
icacls $SourceRoot /grant "IUSR:(OI)(CI)RX" /T /Q | Out-Null
Write-Host "icacls inheritance push complete"

# Verify by hitting the URL
Start-Sleep -Seconds 1
try {
    $r = Invoke-WebRequest -Uri "http://localhost:8765/bundle-builder.html" -UseBasicParsing -TimeoutSec 8
    Write-Host ""
    Write-Host "OK Local: HTTP $($r.StatusCode) - $([math]::Round($r.RawContentLength/1024)) KB"
} catch {
    Write-Warning "Local still failing: $($_.Exception.Message)"
}

Stop-Transcript | Out-Null
