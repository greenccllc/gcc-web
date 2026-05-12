$ErrorActionPreference = 'Continue'
try {
    & 'C:\ProgramData\GCC\scripts\setup_gcc_site_autosync.ps1' 2>&1 | Tee-Object -FilePath 'C:\ProgramData\GCC\autosync-setup.log'
} catch {
    "EXCEPTION: $_" | Out-File 'C:\ProgramData\GCC\autosync-setup.log' -Append
}
"--- final task state ---" | Out-File 'C:\ProgramData\GCC\autosync-setup.log' -Append
Get-ScheduledTask -TaskName 'GCC-Site-Sync' -TaskPath '\' -ErrorAction SilentlyContinue | Out-File 'C:\ProgramData\GCC\autosync-setup.log' -Append
