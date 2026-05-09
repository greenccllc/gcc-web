# PsExecutor.psm1
#
# Watches the drop folder for new *.ps1 files and runs them elevated.
# Trust boundary is the NTFS ACL on the drop folder (see Install-Service.ps1).
# As a second check, the file's NTFS owner must resolve to a member of
# AuthorizedDroppersGroup or .quarantine\ kicks in.

function Initialize-PsExecutor {
    [CmdletBinding()]
    param([Parameter(Mandatory)] [hashtable] $Config)

    foreach ($p in @($Config.DropFolder, $Config.ExecResultsFolder,
                     (Join-Path $Config.DropFolder '.processed'),
                     (Join-Path $Config.DropFolder '.quarantine'))) {
        if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p -Force | Out-Null }
    }

    # Create a FileSystemWatcher; surface events through a thread-safe queue
    # because the watcher fires on its own pool thread.
    $queue = [System.Collections.Concurrent.ConcurrentQueue[string]]::new()
    $fsw = New-Object System.IO.FileSystemWatcher $Config.DropFolder, '*.ps1'
    $fsw.IncludeSubdirectories = $false
    $fsw.NotifyFilter = [System.IO.NotifyFilters]'FileName, LastWrite, CreationTime'
    $fsw.EnableRaisingEvents = $true

    # Register Created + Renamed: a cut/paste or rename into the drop folder
    # arrives as a Renamed event, not Created. Both must enqueue the file.
    Register-ObjectEvent -InputObject $fsw -EventName 'Created' `
        -SourceIdentifier 'PsExecutor.Created' `
        -MessageData $queue `
        -Action { $event.MessageData.Enqueue($eventArgs.FullPath) } | Out-Null

    Register-ObjectEvent -InputObject $fsw -EventName 'Renamed' `
        -SourceIdentifier 'PsExecutor.Renamed' `
        -MessageData $queue `
        -Action { $event.MessageData.Enqueue($eventArgs.FullPath) } | Out-Null

    # Backlog scan: scripts already in the folder when the service starts
    # (e.g. dropped while the service was down) won't fire FSW events, so
    # enqueue them explicitly. Only files at the top level — .processed/
    # and .quarantine/ subdirs are intentionally excluded.
    Get-ChildItem -Path $Config.DropFolder -Filter '*.ps1' -File -ErrorAction SilentlyContinue |
        ForEach-Object { $queue.Enqueue($_.FullName) }

    [pscustomobject]@{
        Watcher       = $fsw
        Queue         = $queue
        UnstableTries = @{}    # path -> retry count, bounded by Pump-PsExecutor
    }
}

function Get-FileOwnerName {
    param([string] $Path)
    try {
        ((Get-Acl $Path).Owner)
    } catch { $null }
}

function Test-OwnerAuthorized {
    param(
        [string] $OwnerName,
        [string] $AuthorizedGroup
    )
    if (-not $OwnerName) { return $false }

    # Owner is local Administrators or matches the group directly
    if ($OwnerName -ieq $AuthorizedGroup) { return $true }
    if ($OwnerName -like 'BUILTIN\Administrators') { return $true }

    # Resolve the group's members and see if owner is one of them
    try {
        $groupParts = $AuthorizedGroup -split '\\', 2
        $groupName  = if ($groupParts.Count -eq 2) { $groupParts[1] } else { $AuthorizedGroup }
        $domain     = if ($groupParts.Count -eq 2) { $groupParts[0] } else { $env:USERDOMAIN }

        $searcher = [adsisearcher]"(&(objectCategory=group)(sAMAccountName=$groupName))"
        $result = $searcher.FindOne()
        if (-not $result) { return $false }

        $members = $result.Properties['member']
        foreach ($dn in $members) {
            $entry = [adsi]"LDAP://$dn"
            $sam = $entry.Properties['sAMAccountName'][0]
            if ($sam -and ($OwnerName -ieq "$domain\$sam")) { return $true }
        }
    } catch {
        Write-Warning "Owner-group check failed for '$AuthorizedGroup': $_"
    }
    return $false
}

function Invoke-DroppedScript {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [hashtable] $Config,
        [Parameter(Mandatory)] [string]    $ScriptPath,
        [Parameter(Mandatory)] [hashtable] $Slack,
        [Parameter(Mandatory)] [string]    $WatcherLogPath
    )

    $name = Split-Path $ScriptPath -Leaf
    $owner = Get-FileOwnerName -Path $ScriptPath
    Write-WatcherLog -Path $WatcherLogPath -Channel 'PsExecutor' -Event 'detected' -Detail "$name owner=$owner"

    if (-not (Test-OwnerAuthorized -OwnerName $owner -AuthorizedGroup $Config.AuthorizedDroppersGroup)) {
        $dest = Join-Path (Join-Path $Config.DropFolder '.quarantine') $name
        Move-Item -Path $ScriptPath -Destination $dest -Force
        Send-SlackMessage -Slack $Slack -Channel 'status' -Severity 'warn' `
            -Text ":no_entry: Quarantined unauthorized script ``$name`` (owner=$owner)"
        Write-WatcherLog -Path $WatcherLogPath -Channel 'PsExecutor' -Event 'quarantine' -Detail "$name owner=$owner"
        return
    }

    Send-SlackMessage -Slack $Slack -Channel 'status' `
        -Text ":inbox_tray: Importing ``$name`` (owner=$owner)"
    Send-SlackMessage -Slack $Slack -Channel 'status' `
        -Text ":runner: Executing ``$name``"

    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $base  = Join-Path $Config.ExecResultsFolder "$stamp-$($name -replace '\.ps1$','')"
    $stdoutFile = "$base.stdout.log"
    $stderrFile = "$base.stderr.log"

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $proc = Start-Process -FilePath 'powershell.exe' `
        -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',$ScriptPath) `
        -RedirectStandardOutput $stdoutFile `
        -RedirectStandardError  $stderrFile `
        -PassThru -Wait -WindowStyle Hidden
    $sw.Stop()

    $exit = $proc.ExitCode
    $stdout = if (Test-Path $stdoutFile) { Get-Content $stdoutFile -Raw -ErrorAction SilentlyContinue } else { '' }
    $stderr = if (Test-Path $stderrFile) { Get-Content $stderrFile -Raw -ErrorAction SilentlyContinue } else { '' }
    $excerpt = if ($stdout) { ($stdout.Trim() -split "`n" | Select-Object -Last 8) -join "`n" } else { '(no stdout)' }

    $sev = if ($exit -eq 0) { 'info' } else { 'error' }
    $statusEmoji = if ($exit -eq 0) { ':white_check_mark:' } else { ':x:' }
    Send-SlackMessage -Slack $Slack -Channel 'status' -Severity $sev `
        -Text "$statusEmoji ``$name`` exit=$exit in $([int]$sw.Elapsed.TotalSeconds)s`n``````$excerpt```````"

    # Append memory + move processed file
    Append-MemoryRecord -Config $Config -Type 'exec' -Source $owner `
        -Message "Executed ``$name`` exit=$exit duration=$([int]$sw.Elapsed.TotalSeconds)s" `
        -ExtraLines @($stdout, $stderr)

    Send-SlackMessage -Slack $Slack -Channel 'memory' `
        -Text ":brain: Logged exec ``$name`` (exit=$exit) to filememory.md"

    $processed = Join-Path (Join-Path $Config.DropFolder '.processed') "$stamp-$name"
    Move-Item -Path $ScriptPath -Destination $processed -Force
    Write-WatcherLog -Path $WatcherLogPath -Channel 'PsExecutor' -Event 'completed' -Detail "$name exit=$exit"
}

function Pump-PsExecutor {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] $State,           # from Initialize-PsExecutor
        [Parameter(Mandatory)] [hashtable] $Config,
        [Parameter(Mandatory)] [hashtable] $Slack,
        [Parameter(Mandatory)] [string]    $WatcherLogPath
    )

    # Snapshot the queue so any items we re-enqueue (unstable retry) are
    # processed on the next pump, not this one — avoids a hot loop when a
    # file is genuinely stuck mid-write.
    $batch = New-Object 'System.Collections.Generic.List[string]'
    $script = $null
    while ($State.Queue.TryDequeue([ref]$script)) { $batch.Add($script) }

    $maxUnstableTries = 5

    foreach ($script in $batch) {
        # FileSystemWatcher fires before the writer is finished — wait for the
        # file to settle (size stable across two reads) before we touch it.
        $stable = $false
        $missing = $false
        for ($i = 0; $i -lt 30 -and -not $stable; $i++) {
            Start-Sleep -Milliseconds 200
            try {
                $a = (Get-Item $script -ErrorAction Stop).Length
                Start-Sleep -Milliseconds 200
                $b = (Get-Item $script -ErrorAction Stop).Length
                if ($a -eq $b -and $a -gt 0) { $stable = $true }
            } catch {
                $missing = $true
                break
            }
        }

        if ($missing) {
            # File vanished between event and pump (already moved/deleted by
            # someone). Drop quietly; nothing to retry.
            $State.UnstableTries.Remove($script)
            Write-WatcherLog -Path $WatcherLogPath -Channel 'PsExecutor' -Event 'gone' -Detail $script
            continue
        }

        if (-not $stable) {
            $tries = if ($State.UnstableTries.ContainsKey($script)) {
                $State.UnstableTries[$script] + 1
            } else { 1 }
            $State.UnstableTries[$script] = $tries
            if ($tries -lt $maxUnstableTries) {
                # Re-enqueue for a later pump so a slow network copy can finish.
                $State.Queue.Enqueue($script)
                Write-WatcherLog -Path $WatcherLogPath -Channel 'PsExecutor' -Event 'requeue-unstable' -Detail "$script tries=$tries"
            } else {
                # Give up: quarantine so the operator can investigate.
                $State.UnstableTries.Remove($script)
                $name = Split-Path $script -Leaf
                try {
                    $dest = Join-Path (Join-Path $Config.DropFolder '.quarantine') "unstable-$name"
                    Move-Item -Path $script -Destination $dest -Force -ErrorAction Stop
                } catch { }
                Send-SlackMessage -Slack $Slack -Channel 'status' -Severity 'warn' `
                    -Text ":warning: Quarantined ``$name`` after $maxUnstableTries unstable-size retries"
                Write-WatcherLog -Path $WatcherLogPath -Channel 'PsExecutor' -Event 'give-up-unstable' -Detail $script
            }
            continue
        }

        $State.UnstableTries.Remove($script)
        try {
            Invoke-DroppedScript -Config $Config -ScriptPath $script -Slack $Slack -WatcherLogPath $WatcherLogPath
        } catch {
            Send-SlackMessage -Slack $Slack -Channel 'status' -Severity 'error' `
                -Text ":boom: PsExecutor failed on ``$(Split-Path $script -Leaf)``: $_"
            Write-WatcherLog -Path $WatcherLogPath -Channel 'PsExecutor' -Event 'error' -Detail "$script $_"
        }
    }
}

Export-ModuleMember -Function Initialize-PsExecutor, Pump-PsExecutor
