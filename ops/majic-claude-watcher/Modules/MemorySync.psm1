# MemorySync.psm1
#
# - Append-MemoryRecord: writes a chronological row to filememory.md on the
#   claudework share. Used by every watcher.
# - Sync-ClaudeWorkShare: scans the share for recently-added memory artifacts
#   (*.md, *.jsonl) that came from elsewhere and posts a digest to Slack.

function Append-MemoryRecord {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [hashtable] $Config,
        [Parameter(Mandatory)] [string]    $Type,        # 'exec' | 'move' | 'sync'
        [Parameter(Mandatory)] [string]    $Source,      # owner / host / agent
        [Parameter(Mandatory)] [string]    $Message,
        [string[]] $ExtraLines = @()
    )

    if (-not (Test-Path $Config.ClaudeWorkShare)) {
        Write-Warning "ClaudeWorkShare not reachable: $($Config.ClaudeWorkShare)"
        return
    }
    $path = Join-Path $Config.ClaudeWorkShare 'filememory.md'

    $lines = @(
        ('- **{0}** [{1}] _{2}_ — {3}' -f
            (Get-Date -Format 'yyyy-MM-ddTHH:mm:ssK'),
            $Type, $Source, $Message)
    )
    foreach ($l in $ExtraLines) {
        if (-not $l) { continue }
        $excerpt = ($l -replace "`r","" -split "`n" | Where-Object { $_ } | Select-Object -First 4) -join ' ¶ '
        if ($excerpt) {
            $excerpt = $excerpt.Substring(0, [Math]::Min(400, $excerpt.Length))
            $lines += "  - " + $excerpt
        }
    }

    # Append with a mutex so concurrent watchers don't interleave lines.
    $mutex = New-Object System.Threading.Mutex($false, 'Global\MajicClaudeWatcher.filememory')
    [void]$mutex.WaitOne()
    try {
        Add-Content -Path $path -Value $lines -Encoding UTF8
    } finally {
        $mutex.ReleaseMutex(); $mutex.Dispose()
    }
}

function Sync-ClaudeWorkShare {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [hashtable] $Config,
        [Parameter(Mandatory)] [hashtable] $Slack,
        [Parameter(Mandatory)] [string]    $WatcherLogPath,
        [Parameter(Mandatory)] [hashtable] $State
    )

    if (-not (Test-Path $Config.ClaudeWorkShare)) {
        Send-SlackMessage -Slack $Slack -Channel 'status' -Severity 'warn' `
            -Text ":warning: claudework share not reachable: $($Config.ClaudeWorkShare)"
        return
    }

    if (-not $State.ContainsKey('LastMemoryScan')) {
        $State.LastMemoryScan = (Get-Date).AddMinutes(-5)
    }
    $cutoff = $State.LastMemoryScan

    $new = Get-ChildItem -Path $Config.ClaudeWorkShare -Recurse -File `
            -Include '*.md','*.jsonl' -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -gt $cutoff -and $_.Name -ne 'filememory.md' }

    if ($new) {
        $list = ($new | ForEach-Object { '• `' + ($_.FullName.Substring($Config.ClaudeWorkShare.Length).TrimStart('\')) + '`' }) -join "`n"
        $count = $new.Count
        Send-SlackMessage -Slack $Slack -Channel 'memory' `
            -Text ":books: $count new memory file$(if($count -ne 1){'s'}) on claudework`n$list"
        Write-WatcherLog -Path $WatcherLogPath -Channel 'MemorySync' -Event 'digest' -Detail "$count files"
    }

    $State.LastMemoryScan = Get-Date
}

Export-ModuleMember -Function Append-MemoryRecord, Sync-ClaudeWorkShare
