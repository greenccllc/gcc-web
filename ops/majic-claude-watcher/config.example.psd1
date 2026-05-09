@{
    # ── PsExecutor (watcher 1) ───────────────────────────────────────────
    # Drop folder watched on majic-svr-iis. Anything that lands here as
    # *.ps1 will be executed elevated by the service account, then moved
    # to <DropFolder>\.processed\ (or .quarantine\ on owner mismatch).
    # MUST be a local path on majic-svr-iis, NOT a UNC share — the ACL
    # rules below are the trust boundary.
    DropFolder           = 'D:\Powershell'

    # NT account or group that is allowed to write into DropFolder.
    # Install-Service.ps1 grants this group write access; everyone else
    # is denied. Files whose NTFS owner is outside this group are
    # quarantined and never run.
    AuthorizedDroppersGroup = '<FILL_ME>\majic-droppers'

    # Where to drop .ps1 stdout/stderr/exit-code per run.
    ExecResultsFolder    = 'D:\Powershell\.results'

    # ── MemorySync (watcher 2) ───────────────────────────────────────────
    # The shared "claudework" memory store. Every script execution and
    # every file move appends a row to <ClaudeWorkShare>\filememory.md
    # so there is a single chronological trace across hosts.
    ClaudeWorkShare      = '\\<FILL_ME-server>\claudework'

    # ── RemoteClaudeSync (watcher 3) ─────────────────────────────────────
    # Domain servers whose Claude / Cursor session+memory dirs should be
    # mirrored into ClaudeWorkShare\hosts\<host>\claude|cursor\.
    # Path globs are evaluated against \\<host>\C$ — the service account
    # must have read access to the admin share on each host.
    RemoteServers = @(
        @{
            Host         = '<FILL_ME-host1>'
            ClaudePaths  = @(
                'Users\*\AppData\Roaming\Claude\sessions',
                'Users\*\.claude'
            )
            CursorPaths  = @(
                'Users\*\AppData\Roaming\Cursor\User\workspaceStorage',
                'Users\*\AppData\Roaming\Cursor\logs'
            )
            ProfileWatch = @(
                'Users\*\Downloads',
                'Users\*\Desktop',
                'Users\*\Documents'
            )
        }
        # add more entries per server
    )

    # How often to pull from each remote server (seconds).
    RemoteSyncIntervalSec = 300

    # ── FileSorter (watcher 4) ───────────────────────────────────────────
    # Where sorted files end up, organized as
    #   <FileStoreRoot>\<host>\<yyyy>\<MM>\<ext>\<originalname>
    FileStoreRoot        = '\\<FILL_ME-server>\FileStore'

    # Patterns to exclude when scanning ProfileWatch dirs.
    # Anything matching any of these patterns is left in place.
    ExclusionPatterns = @(
        '*\Program Files*',
        '*\Program Files (x86)*',
        '*\Windows\*',
        '*\AppData\Local\Microsoft\*',
        '*\AppData\Local\Temp\*',
        '*.tmp',
        '*.partial',
        '*.crdownload',
        '~$*'                # office lock files
    )

    # Files smaller than this many bytes are ignored (skip 0-byte etc).
    MinFileBytes         = 1

    # Files older than this many days are ignored on the first scan
    # (avoid hoovering up years of pre-existing files on day one).
    MaxFileAgeDays       = 7

    SortIntervalSec      = 60

    # ── Slack ────────────────────────────────────────────────────────────
    Slack = @{
        # xoxb- bot token, chat:write scope on both channels.
        BotToken         = '<FILL_ME-xoxb>'

        # Channel for operational status: importing / executing / completed / errors.
        StatusChannel    = '<FILL_ME-channel-id>'

        # Channel for memory ingestion: synced sessions, found memories, file moves.
        MemoryChannel    = '<FILL_ME-channel-id>'

        # Soft rate limit: max messages per channel per minute.
        # Excess events are batched into a single digest message.
        MaxMessagesPerMinute = 20
    }

    # ── Service ──────────────────────────────────────────────────────────
    LogPath              = 'D:\MajicWatcher\logs'

    # How long to retain log + processed/quarantined .ps1 files (days).
    RetentionDays        = 30

    # Main loop tick (seconds). PsExecutor uses FileSystemWatcher events
    # so it reacts immediately; this tick drives the periodic watchers.
    LoopIntervalSec      = 5
}
