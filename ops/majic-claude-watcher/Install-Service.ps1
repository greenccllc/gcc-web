#requires -RunAsAdministrator
<#
.SYNOPSIS
  Installs majic-claude-watcher as a Windows Service via NSSM.

.DESCRIPTION
  - Creates the drop folder and ACLs it (only Administrators and the
    AuthorizedDroppersGroup can write).
  - Registers the NSSM service to run MajicClaudeWatcher.ps1 under the
    supplied service account.
  - Configures restart-on-failure and stdout/stderr capture.
  - Starts the service.

.PARAMETER ServiceAccount
  Domain\User to run the service as. Must be a local admin on this box and
  have read access to all RemoteServers' C$ shares.

.PARAMETER ServiceAccountPassword
  SecureString. Pipe (Read-Host -AsSecureString) when invoking.

.PARAMETER ConfigPath
  Path to config.psd1. Defaults to a sibling file.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $ServiceAccount,
    [Parameter(Mandatory)] [securestring] $ServiceAccountPassword,
    [string] $ServiceName = 'MajicClaudeWatcher',
    [string] $ConfigPath  = (Join-Path $PSScriptRoot 'config.psd1')
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $ConfigPath)) {
    throw "Config not found: $ConfigPath. Copy config.example.psd1 → config.psd1 first."
}
$Config = Import-PowerShellDataFile -Path $ConfigPath

$nssm = Get-Command nssm.exe -ErrorAction SilentlyContinue
if (-not $nssm) { throw "nssm.exe not on PATH. Install NSSM (https://nssm.cc/) and re-run." }

# ── 1. Ensure folders exist ──────────────────────────────────────────────
foreach ($p in @($Config.DropFolder, $Config.ExecResultsFolder, $Config.LogPath,
                 (Join-Path $Config.DropFolder '.processed'),
                 (Join-Path $Config.DropFolder '.quarantine'))) {
    if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p -Force | Out-Null }
}

# ── 2. ACL the drop folder ───────────────────────────────────────────────
# Trust boundary: only Administrators and AuthorizedDroppersGroup can write.
Write-Host "ACLing $($Config.DropFolder) — only Administrators + $($Config.AuthorizedDroppersGroup) get write."
$acl = New-Object System.Security.AccessControl.DirectorySecurity
$acl.SetAccessRuleProtection($true, $false)   # disable inheritance, drop inherited rules

$inherit = [System.Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit'
$prop    = [System.Security.AccessControl.PropagationFlags]::None

# SYSTEM full control (needed for service to manage the dir)
$acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule(
    'NT AUTHORITY\SYSTEM', 'FullControl', $inherit, $prop, 'Allow')))

# Local Administrators full control (recovery)
$acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule(
    'BUILTIN\Administrators', 'FullControl', $inherit, $prop, 'Allow')))

# AuthorizedDroppersGroup: write + delete on this folder, no traverse to .processed/.quarantine
$acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule(
    $Config.AuthorizedDroppersGroup,
    'Write,Read,Delete,Synchronize',
    $inherit, $prop, 'Allow')))

# Service account itself needs full control to execute, move to .processed, quarantine
$acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule(
    $ServiceAccount, 'FullControl', $inherit, $prop, 'Allow')))

Set-Acl -Path $Config.DropFolder -AclObject $acl

# ── 3. Register the service via NSSM ─────────────────────────────────────
$existing = & nssm status $ServiceName 2>$null
if ($existing -and $LASTEXITCODE -eq 0) {
    Write-Host "Service '$ServiceName' already exists; stopping + reinstalling."
    & nssm stop   $ServiceName confirm | Out-Null
    & nssm remove $ServiceName confirm | Out-Null
}

$psExe = (Get-Command powershell.exe).Source
$entry = Join-Path $PSScriptRoot 'MajicClaudeWatcher.ps1'

& nssm install $ServiceName $psExe `
    "-NoProfile -ExecutionPolicy Bypass -File `"$entry`""    | Out-Null
& nssm set $ServiceName AppDirectory  $PSScriptRoot          | Out-Null
& nssm set $ServiceName DisplayName   'Majic Claude Watcher' | Out-Null
& nssm set $ServiceName Description   'Local agent: PS executor, claudework memory sync, file sorter.' | Out-Null
& nssm set $ServiceName Start         SERVICE_AUTO_START     | Out-Null
& nssm set $ServiceName AppStdout     (Join-Path $Config.LogPath 'service.log') | Out-Null
& nssm set $ServiceName AppStderr     (Join-Path $Config.LogPath 'service.log') | Out-Null
& nssm set $ServiceName AppRotateFiles 1                     | Out-Null
& nssm set $ServiceName AppRotateBytes 10485760              | Out-Null
& nssm set $ServiceName AppExit Default Restart              | Out-Null
& nssm set $ServiceName AppRestartDelay 5000                 | Out-Null

# Service account
$plain = [Runtime.InteropServices.Marshal]::PtrToStringUni(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ServiceAccountPassword))
& nssm set $ServiceName ObjectName $ServiceAccount $plain    | Out-Null
$plain = $null
[GC]::Collect()

Start-Service $ServiceName
Write-Host ""
Write-Host "Installed and started '$ServiceName'." -ForegroundColor Green
Write-Host "Logs: $($Config.LogPath)\service.log"
Write-Host "Drop:  $($Config.DropFolder)  (writable by: $($Config.AuthorizedDroppersGroup))"
