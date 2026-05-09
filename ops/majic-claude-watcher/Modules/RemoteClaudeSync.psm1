# RemoteClaudeSync.psm1
#
# Mirrors Claude + Cursor session/memory dirs from each domain server in
# Config.RemoteServers into:
#   <ClaudeWorkShare>\hosts\<host>\claude\…
#   <ClaudeWorkShare>\hosts\<host>\cursor\…
#
# Pulls via the remote host's C$ admin share — the service account must
# have read access. Uses robocopy for incremental sync (mirror semantics
# without delete: /XO /MAXAGE).

function Sync-RemoteClaudeAndCursor {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [hashtable] $Config,
        [Parameter(Mandatory)] [hashtable] $Slack,
        [Parameter(Mandatory)] [string]    $WatcherLogPath
    )

    if (-not (Test-Path $Config.ClaudeWorkShare)) {
        Send-SlackMessage -Slack $Slack -Channel 'status' -Severity 'warn' `
            -Text ":warning: claudework share not reachable; skipping remote sync"
        return
    }

    foreach ($srv in $Config.RemoteServers) {
        $host = $srv.Host
        $base = "\\$host\C$"
        if (-not (Test-Path $base)) {
            Send-SlackMessage -Slack $Slack -Channel 'status' -Severity 'warn' `
                -Text ":warning: $host C$ share not reachable; skipping"
            Write-WatcherLog -Path $WatcherLogPath -Channel 'RemoteClaudeSync' -Event 'unreachable' -Detail $host
            continue
        }

        $totalCopied = 0
        foreach ($kind in 'claude','cursor') {
            $patterns = if ($kind -eq 'claude') { $srv.ClaudePaths } else { $srv.CursorPaths }
            foreach ($rel in $patterns) {
                # Expand wildcards (Users\* etc.) against the live filesystem.
                $expanded = Get-ChildItem -Path (Join-Path $base $rel) -Directory -ErrorAction SilentlyContinue
                foreach ($src in $expanded) {
                    # Mirror-style path under the share, preserving the user component
                    $userSegment = if ($src.FullName -match '\\Users\\([^\\]+)') { $matches[1] } else { 'shared' }
                    $leaf = $src.Name
                    $dst = Join-Path $Config.ClaudeWorkShare ("hosts\$host\$kind\$userSegment\$leaf")
                    if (-not (Test-Path $dst)) { New-Item -ItemType Directory -Path $dst -Force | Out-Null }

                    # robocopy: /E recurse, /XO skip older, /R:1 retry once, /W:2 wait 2s
                    $rcLog = Join-Path (Split-Path $WatcherLogPath -Parent) "robocopy-$host-$kind-$userSegment-$leaf.log"
                    $rcArgs = @($src.FullName, $dst, '/E', '/XO', '/R:1', '/W:2', '/NFL', '/NDL', '/NP', '/LOG+:' + $rcLog)
                    $rc = Start-Process -FilePath 'robocopy.exe' -ArgumentList $rcArgs -Wait -PassThru -WindowStyle Hidden
                    # robocopy exit codes <8 = success-ish
                    if ($rc.ExitCode -ge 8) {
                        Write-WatcherLog -Path $WatcherLogPath -Channel 'RemoteClaudeSync' -Event 'robocopy-error' -Detail "$host $kind $userSegment $leaf rc=$($rc.ExitCode)"
                    } else {
                        $totalCopied++
                    }
                }
            }
        }

        if ($totalCopied -gt 0) {
            Send-SlackMessage -Slack $Slack -Channel 'memory' `
                -Text ":arrows_counterclockwise: Synced $totalCopied path(s) from ``$host`` (Claude + Cursor)"
            Append-MemoryRecord -Config $Config -Type 'sync' -Source $host `
                -Message "Pulled $totalCopied path(s) into claudework\hosts\$host"
            Write-WatcherLog -Path $WatcherLogPath -Channel 'RemoteClaudeSync' -Event 'synced' -Detail "$host paths=$totalCopied"
        }
    }
}

Export-ModuleMember -Function Sync-RemoteClaudeAndCursor
