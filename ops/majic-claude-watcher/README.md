# majic-claude-watcher

A local PowerShell agent that runs on `majic-svr-iis` and acts as the
single execution + memory hub for the Majic LLM ecosystem.

> **Stop-gap location.** This agent doesn't logically belong in `gcc-site`
> (the marketing site / portal frontend). It lives here because that's the
> repo we have access to today. See `MIGRATION.md` — when `majic-agent` is
> available, this whole folder should move there with no code changes.

## What it does

Four cooperating watchers in one Windows service (`MajicClaudeWatcher`):

| # | Watcher | Trigger | Action |
|---|---------|---------|--------|
| 1 | **PsExecutor** | new `*.ps1` lands in the drop folder on `majic-svr-iis` | Validates the file's owner, runs it elevated, captures stdout/stderr/exit, posts status to Slack, appends a memory record to the `claudework` share |
| 2 | **MemorySync** | `claudework` share file change | Indexes new `*.md` / `*.jsonl` memories, posts a digest to the Slack memory channel |
| 3 | **RemoteClaudeSync** | every `RemoteSyncIntervalSec` | Pulls each domain server's local Claude + Cursor session/memory dirs into `claudework` so there's a single corpus across hosts |
| 4 | **FileSorter** | every `SortIntervalSec` | Scans configured user-profile dirs (Downloads, Desktop, Documents) on watched servers for new generated/downloaded files, copies them into `FileStore` sorted by date/extension, appends a trace line to `filememory.md`, and posts to the Slack memory channel. Excludes Program Files / Windows / system locations. |

All four run autonomously. No user interaction. Errors are caught per-tick
so one failing watcher does not stop the others, and every error is posted
to the Slack status channel.

## Prerequisites

- Windows Server 2019+ on `majic-svr-iis` with PowerShell 5.1 or 7+
- [NSSM](https://nssm.cc/) on `PATH` (used to register the service)
- A dedicated service account with:
  - Local admin on `majic-svr-iis` (PsExecutor runs scripts elevated)
  - Read access to the C$ admin shares of every host listed in `RemoteServers`
  - Read/write to the `claudework` and `FileStore` UNC paths
- A Slack bot token (`xoxb-…`) with `chat:write` in both the **status** and **memory** channels
- An out-of-band channel to drop `.ps1` files into the drop folder — typically the gcc-api remote-exec endpoint, but any authorized writer works

## Install

```powershell
# As local admin on majic-svr-iis:
cd C:\GCC_LLC\majic-claude-watcher
Copy-Item config.example.psd1 config.psd1
notepad config.psd1     # fill in the <FILL_ME> values, then save

.\Install-Service.ps1 -ServiceAccount 'CONTOSO\svc-majic' -ServiceAccountPassword (Read-Host -AsSecureString 'svc password')
```

`Install-Service.ps1`:

1. Creates the drop folder if missing.
2. ACLs the drop folder so only `Administrators` and the configured
   `AuthorizedDroppers` group can write to it (everyone else: read-only or
   no access). This is the primary trust boundary for elevated execution.
3. Creates the service via NSSM, runs as the supplied service account,
   restart-on-failure, log to `LogPath\service.log`.
4. Starts the service.

## Uninstall

```powershell
.\Uninstall-Service.ps1
```

Stops, unregisters, and removes the NSSM service. Drop folder and config
are left in place.

## Configuration

See `config.example.psd1` — every value is documented inline. Anything
marked `<FILL_ME>` must be set before the service will start.

### Trust boundary

The PsExecutor watcher runs every `.ps1` in the drop folder **elevated**.
The only thing keeping the box safe is who can write to that folder.

`Install-Service.ps1` ACLs the folder to:

- `Administrators` — full control (recovery)
- `<AuthorizedDroppersGroup>` — write + delete
- `Everyone` — no access

Before each script runs, PsExecutor also re-checks the file owner. Files
owned by anyone outside the authorized writers are quarantined under
`<DropFolder>\.quarantine\` and reported to the Slack status channel.
This is belt-and-braces in case the ACL is ever loosened.

## Layout

```
ops/majic-claude-watcher/
├── README.md                  ← you are here
├── MIGRATION.md               ← move to majic-agent when available
├── config.example.psd1        ← copy → config.psd1, fill in
├── Install-Service.ps1
├── Uninstall-Service.ps1
├── MajicClaudeWatcher.ps1     ← service entry point (main loop)
└── Modules/
    ├── Slack.psm1             ← Send-SlackMessage
    ├── PsExecutor.psm1        ← watcher 1
    ├── MemorySync.psm1        ← watcher 2
    ├── RemoteClaudeSync.psm1  ← watcher 3
    └── FileSorter.psm1        ← watcher 4
```

## Logs

- `LogPath\service.log` — service stdout/stderr (NSSM)
- `LogPath\watcher-YYYYMMDD.log` — structured run log (one line per event)
- `<ClaudeWorkShare>\filememory.md` — append-only trace of every file move + every script execution
