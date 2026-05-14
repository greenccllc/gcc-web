<#
.SYNOPSIS
  Find SQL Server backups (.bak / .trn) under GCC installer and FileStore paths.

.DESCRIPTION
  Run on the machine where X: and D: exist (e.g. gcc-svr-sql). Lists candidates
  for RESTORE. Does not execute restore.

.EXAMPLE
  .\find-sql-backups.ps1

.EXAMPLE
  .\find-sql-backups.ps1 -Roots @('D:\FileStore\Database','X:\Installers\SQL')
#>
[CmdletBinding()]
param(
    [string[]] $Roots = @(
        'X:\Installers\SQL',
        'X:\Installers\SQL2025-Express',
        'D:\FileStore\Database'
    )
)

$ErrorActionPreference = 'SilentlyContinue'
$all = [System.Collections.Generic.List[object]]::new()

foreach ($root in $Roots) {
    if (-not (Test-Path -LiteralPath $root)) {
        Write-Warning "Missing or inaccessible: $root"
        continue
    }
    Get-ChildItem -LiteralPath $root -File -Recurse -ErrorAction SilentlyContinue |
        Where-Object { $_.Extension -match '^\.(bak|trn)$' } |
        ForEach-Object {
            $all.Add([pscustomobject]@{
                    Directory = $root
                    FullPath  = $_.FullName
                    SizeMB    = [math]::Round($_.Length / 1MB, 2)
                    LastWrite = $_.LastWriteTime
                })
            }
}

if ($all.Count -eq 0) {
    Write-Host 'No .bak or .trn files found under the scanned roots.' -ForegroundColor Yellow
    foreach ($root in $Roots) {
        if (-not (Test-Path -LiteralPath $root)) { continue }
        Write-Host "`nTop-level listing: $root" -ForegroundColor Cyan
        Get-ChildItem -LiteralPath $root -ErrorAction SilentlyContinue |
            Select-Object Mode, Length, LastWriteTime, Name |
            Format-Table -AutoSize
    }
    exit 0
}

$all | Sort-Object SizeMB -Descending | Format-Table -AutoSize

$baks = @($all | Where-Object { $_.FullPath -like '*.bak' })
Write-Host ("`n.bak count: {0}" -f $baks.Count) -ForegroundColor Cyan
Write-Host "`nNext: run in SSMS/sqlcmd on the target instance:" -ForegroundColor Green
Write-Host "  RESTORE FILELISTONLY FROM DISK = N'<path.bak>';"
Write-Host "  RESTORE DATABASE [GCCWeb] FROM DISK = N'<path.bak>' WITH REPLACE, STATS = 10;"
Write-Host "  -- add MOVE ... TO ... clauses if logical data/log names differ from existing files."
