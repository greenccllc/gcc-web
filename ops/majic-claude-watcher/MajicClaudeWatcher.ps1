#requires -Version 5.1
<#
.SYNOPSIS
  Service entry point for majic-claude-watcher.

.DESCRIPTION
  Loads config.psd1, imports the four watcher modules, and runs the main
  loop. Designed to be hosted by NSSM as a Windows Service. NSSM will
  capture stdout/stderr to LogPath\service.log and restart on exit.

  PsExecutor uses a FileSystemWatcher (event-driven). The other three
  watchers run on a periodic schedule driven by LoopIntervalSec.
#>

[CmdletBinding()]
param(
    [string] $ConfigPath = (Join-Path $PSScriptRoot 'config.psd1')
)

$ErrorActionPreference = 'Continue'
Set-StrictMode -Version Latest

if (-not (Test-Path $ConfigPath)) {
    throw "Config not found: $ConfigPath. Copy config.example.psd1 → config.psd1 and fill it in."
}
$Config = Import-PowerShellDataFile -Path $ConfigPath

# ── Logging ──────────────────────────────────────────────────────────────
if (-not (Test-Path $Config.LogPath)) { New-Item -ItemType Directory -Path $Config.LogPath -Force | Out-Null }
$WatcherLogPath = Join-Path $Config.LogPath ("watcher-" + (Get-Date -Format 'yyyyMMdd') + ".log")

function Write-WatcherLog {
    param(
        [Parameter(Mandatory)] [string] $Path,
        [Parameter(Mandatory)] [string] $Channel,
        [Parameter(Mandatory)] [string] $Event,
        [string] $Detail = ''
    )
    $line = "{0}`t{1}`t{2}`t{3}" -f (Get-Date -Format 'o'), $Channel, $Event, $Detail
    Add-Content -Path $Path -Value $line -Encoding UTF8
}
# Make Write-WatcherLog visible to imported modules.
Set-Item -Path function:global:Write-WatcherLog -Value (Get-Item function:Write-WatcherLog).ScriptBlock

# ── Modules ──────────────────────────────────────────────────────────────
$ModulesDir = Join-Path $PSScriptRoot 'Modules'
Import-Module (Join-Path $ModulesDir 'Slack.psm1')            -Force
Import-Module (Join-Path $ModulesDir 'MemorySync.psm1')       -Force
Import-Module (Join-Path $ModulesDir 'PsExecutor.psm1')       -Force
Import-Module (Join-Path $ModulesDir 'RemoteClaudeSync.psm1') -Force
Import-Module (Join-Path $ModulesDir 'FileSorter.psm1')       -Force

# Slack helpers from Slack.psm1 are needed by the other modules at runtime
# — re-export into the global scope so module functions can resolve them.
Set-Item -Path function:global:Send-SlackMessage  -Value (Get-Command Send-SlackMessage).ScriptBlock
Set-Item -Path function:global:Append-MemoryRecord -Value (Get-Command Append-MemoryRecord).ScriptBlock

Write-WatcherLog -Path $WatcherLogPath -Channel 'main' -Event 'start' -Detail "version=1.0 host=$env:COMPUTERNAME"
Send-SlackMessage -Slack $Config.Slack -Channel 'status' `
    -Text ":green_circle: majic-claude-watcher started on ``$env:COMPUTERNAME``"

# ── Watcher state ────────────────────────────────────────────────────────
$psState = Initialize-PsExecutor -Config $Config
$shared  = @{
    LastRemoteSync   = (Get-Date).AddSeconds(-1 * $Config.RemoteSyncIntervalSec)
    LastSortRun      = (Get-Date).AddSeconds(-1 * $Config.SortIntervalSec)
    LastMemoryScan   = (Get-Date).AddMinutes(-5)
}

# Graceful shutdown on Ctrl+C / service stop.
$running = $true
$null = Register-EngineEvent PowerShell.Exiting -Action { $script:running = $false }

# ── Main loop ────────────────────────────────────────────────────────────
while ($running) {
    try {
        # 1. Drain the PsExecutor queue (event-driven, just process whatever arrived).
        Pump-PsExecutor -State $psState -Config $Config -Slack $Config.Slack -WatcherLogPath $WatcherLogPath

        $now = Get-Date

        # 2. claudework memory digest
        Sync-ClaudeWorkShare -Config $Config -Slack $Config.Slack -WatcherLogPath $WatcherLogPath -State $shared

        # 3. Remote Claude/Cursor pull
        if (($now - $shared.LastRemoteSync).TotalSeconds -ge $Config.RemoteSyncIntervalSec) {
            Sync-RemoteClaudeAndCursor -Config $Config -Slack $Config.Slack -WatcherLogPath $WatcherLogPath
            $shared.LastRemoteSync = $now
        }

        # 4. FileSorter
        if (($now - $shared.LastSortRun).TotalSeconds -ge $Config.SortIntervalSec) {
            Sort-RemoteDownloads -Config $Config -Slack $Config.Slack -WatcherLogPath $WatcherLogPath
            $shared.LastSortRun = $now
        }
    } catch {
        Write-WatcherLog -Path $WatcherLogPath -Channel 'main' -Event 'tick-error' -Detail "$_"
        Send-SlackMessage -Slack $Config.Slack -Channel 'status' -Severity 'error' `
            -Text ":boom: watcher tick error on $env:COMPUTERNAME: $_"
    }

    Start-Sleep -Seconds $Config.LoopIntervalSec
}

Send-SlackMessage -Slack $Config.Slack -Channel 'status' `
    -Text ":red_circle: majic-claude-watcher stopping on ``$env:COMPUTERNAME``"
Write-WatcherLog -Path $WatcherLogPath -Channel 'main' -Event 'stop'

# Cleanup
if ($psState.Watcher) { $psState.Watcher.Dispose() }
Get-EventSubscriber -SourceIdentifier 'PsExecutor.*' -ErrorAction SilentlyContinue | Unregister-Event
