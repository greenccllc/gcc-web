<#
.SYNOPSIS
  Apply idempotent GCCWeb SQL scripts (base schema optional, then v2 + GBP).

.DESCRIPTION
  Runs sqlcmd against the listed files in order. Use -IncludeBase on a fresh
  SQL instance (creates database GCCWeb + core tables). For routine updates
  on an existing GCCWeb, omit -IncludeBase (runs schema-v2.sql + schema-gbp.sql).

.PARAMETER ServerInstance
  SQL Server instance. Production GCC uses host **gcc-svr-sql** (default).
  Use **gcc-svr-sql\INSTANCE** if SQL Browser / a named instance is required.

.PARAMETER Database
  Catalog name (default GCCWeb).

.PARAMETER IncludeBase
  If set, runs schema.sql first against master (creates GCCWeb if missing).

.PARAMETER SqlUser
  SQL authentication login (optional; default is Windows integrated -E).

.PARAMETER SqlPassword
  Password for SqlUser (required when SqlUser is set).

.EXAMPLE
  .\update-gccweb.ps1

.EXAMPLE
  .\update-gccweb.ps1 -ServerInstance 'gcc-svr-sql\GCCLLC' -IncludeBase

.EXAMPLE
  .\update-gccweb.ps1 -ServerInstance 'gcc-svr-sql' -SqlUser 'sa' -SqlPassword '***'
#>
[CmdletBinding()]
param(
    [string] $ServerInstance = 'gcc-svr-sql',

    [string] $Database = 'GCCWeb',

    [switch] $IncludeBase,

    [string] $SqlUser,

    [string] $SqlPassword
)

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

function Invoke-GccSqlFile {
    param(
        [Parameter(Mandatory)] [string] $InputPath,
        [string] $SqlcmdDatabase = $Database
    )
    if (-not (Test-Path $InputPath)) { throw "Missing file: $InputPath" }
    $full = (Resolve-Path $InputPath).Path
    $auth = @('-E')
    if ($SqlUser) {
        if (-not $SqlPassword) { throw 'SqlPassword is required when SqlUser is set.' }
        $auth = @('-U', $SqlUser, '-P', $SqlPassword)
    }
    Write-Host "sqlcmd -S $ServerInstance -d $SqlcmdDatabase -i $full $($auth[0])" -ForegroundColor Cyan
    & sqlcmd.exe -S $ServerInstance -d $SqlcmdDatabase -b @auth -i $full
    if ($LASTEXITCODE -ne 0) { throw "sqlcmd failed (exit $LASTEXITCODE) on $full" }
}

$exe = Get-Command sqlcmd.exe -ErrorAction SilentlyContinue
if (-not $exe) {
    throw 'sqlcmd.exe not on PATH. Install SQL Server Command Line Utilities or use SSMS to run schema-v2.sql manually.'
}

if ($IncludeBase) {
    Write-Host '--- schema.sql (master + GCCWeb bootstrap) ---' -ForegroundColor Yellow
    Invoke-GccSqlFile -InputPath (Join-Path $here 'schema.sql') -SqlcmdDatabase 'master'
}

Write-Host '--- schema-v2.sql ---' -ForegroundColor Yellow
Invoke-GccSqlFile -InputPath (Join-Path $here 'schema-v2.sql')

Write-Host '--- schema-gbp.sql ---' -ForegroundColor Yellow
Invoke-GccSqlFile -InputPath (Join-Path $here 'schema-gbp.sql')

Write-Host 'GCCWeb update scripts finished.' -ForegroundColor Green
