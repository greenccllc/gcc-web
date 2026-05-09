#requires -RunAsAdministrator
[CmdletBinding()]
param(
    [string] $ServiceName = 'MajicClaudeWatcher'
)

$ErrorActionPreference = 'SilentlyContinue'

$nssm = Get-Command nssm.exe -ErrorAction SilentlyContinue
if (-not $nssm) { throw "nssm.exe not on PATH." }

& nssm stop   $ServiceName confirm | Out-Null
& nssm remove $ServiceName confirm | Out-Null
Write-Host "Removed service '$ServiceName'. Drop folder, config, and logs left in place."
