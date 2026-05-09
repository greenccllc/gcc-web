# FileSorter.psm1
#
# Scans each remote server's user-profile dirs (Downloads, Desktop,
# Documents, …) for new files and moves them into FileStore organized
# as <FileStoreRoot>\<host>\<yyyy>\<MM>\<ext>\<originalname>.
#
# State is kept in <ClaudeWorkShare>\.sorter-state.json so we don't
# re-process the same file across restarts.

function Sort-RemoteDownloads {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [hashtable] $Config,
        [Parameter(Mandatory)] [hashtable] $Slack,
        [Parameter(Mandatory)] [string]    $WatcherLogPath
    )

    if (-not (Test-Path $Config.FileStoreRoot)) {
        Send-SlackMessage -Slack $Slack -Channel 'status' -Severity 'warn' `
            -Text ":warning: FileStore root not reachable: $($Config.FileStoreRoot)"
        return
    }

    $statePath = Join-Path $Config.ClaudeWorkShare '.sorter-state.json'
    $seen = @{}
    if (Test-Path $statePath) {
        try {
            (Get-Content $statePath -Raw | ConvertFrom-Json).PSObject.Properties |
                ForEach-Object { $seen[$_.Name] = $_.Value }
        } catch { $seen = @{} }
    }

    $cutoff = (Get-Date).AddDays(-1 * $Config.MaxFileAgeDays)
    $movedTotal = 0

    foreach ($srv in $Config.RemoteServers) {
        $host = $srv.Host
        if (-not $srv.ProfileWatch) { continue }
        if (-not (Test-Path "\\$host\C$")) { continue }

        foreach ($rel in $srv.ProfileWatch) {
            $expanded = Get-ChildItem -Path (Join-Path "\\$host\C$" $rel) -Directory -ErrorAction SilentlyContinue
            foreach ($dir in $expanded) {
                $files = Get-ChildItem -Path $dir.FullName -File -ErrorAction SilentlyContinue |
                    Where-Object {
                        $_.Length -ge $Config.MinFileBytes -and
                        $_.LastWriteTime -ge $cutoff
                    }

                foreach ($f in $files) {
                    $skip = $false
                    foreach ($pat in $Config.ExclusionPatterns) {
                        if ($f.FullName -like $pat) { $skip = $true; break }
                    }
                    if ($skip) { continue }

                    $key = "$host|$($f.FullName)|$($f.Length)|$($f.LastWriteTimeUtc.Ticks)"
                    if ($seen.ContainsKey($key)) { continue }

                    try {
                        $ext = if ($f.Extension) { $f.Extension.TrimStart('.').ToLower() } else { 'noext' }
                        $year = $f.LastWriteTime.ToString('yyyy')
                        $mon  = $f.LastWriteTime.ToString('MM')
                        $destDir = Join-Path $Config.FileStoreRoot "$host\$year\$mon\$ext"
                        if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }

                        $destPath = Join-Path $destDir $f.Name
                        if (Test-Path $destPath) {
                            $stamp = Get-Date -Format 'yyyyMMddHHmmss'
                            $destPath = Join-Path $destDir ("{0}-{1}{2}" -f
                                [System.IO.Path]::GetFileNameWithoutExtension($f.Name), $stamp, $f.Extension)
                        }

                        # Copy then delete (Move-Item across UNC shares is unreliable on
                        # files held briefly by the user's shell). On any failure, leave
                        # the source in place and let the next tick retry.
                        Copy-Item -Path $f.FullName -Destination $destPath -Force -ErrorAction Stop
                        Remove-Item -Path $f.FullName -Force -ErrorAction Stop

                        $seen[$key] = (Get-Date).ToString('o')
                        $movedTotal++

                        Append-MemoryRecord -Config $Config -Type 'move' -Source $host `
                            -Message "Sorted ``$($f.Name)`` ($($f.Length)b) → ``$destPath``"

                        Send-SlackMessage -Slack $Slack -Channel 'memory' `
                            -Text ":file_folder: Moved ``$($f.Name)`` from $host to FileStore\$host\$year\$mon\$ext\"
                    } catch {
                        Write-WatcherLog -Path $WatcherLogPath -Channel 'FileSorter' -Event 'error' -Detail "$($f.FullName) $_"
                    }
                }
            }
        }
    }

    if ($movedTotal -gt 0) {
        $seen | ConvertTo-Json -Depth 4 | Set-Content -Path $statePath -Encoding UTF8
        Write-WatcherLog -Path $WatcherLogPath -Channel 'FileSorter' -Event 'tick' -Detail "moved=$movedTotal"
    }
}

Export-ModuleMember -Function Sort-RemoteDownloads
