$ErrorActionPreference = 'Continue'
$SiteRoot = Split-Path -Parent $PSScriptRoot
$WebsiteRoot = Split-Path -Parent $SiteRoot
$ApiPublish = Join-Path $WebsiteRoot 'gcc-api\publish.ps1'
$SitePublish = Join-Path $SiteRoot 'publish.ps1'
$AutoSync = Join-Path $PSScriptRoot 'setup_gcc_site_autosync.ps1'

Write-Host '==== Step 1: redeploy gcc-api ===='
& $ApiPublish
Write-Host ''
Write-Host '==== Step 2: sync gcc-site (initial run) ===='
& $SitePublish
Write-Host ''
Write-Host '==== Step 3: register GCC-Site-Sync scheduled task ===='
& $AutoSync
