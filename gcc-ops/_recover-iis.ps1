Set-Location 'C:\GCC_LLC\IIS\gcc-site'
& git remote add origin 'https://github.com/Particles816/gcc-site.git' 2>&1
& git fetch origin --prune 2>&1 | Select-Object -Last 5
& git reset --hard origin/main 2>&1 | Select-Object -Last 3
Write-Host '--- HEAD now ---'
& git log -1 --oneline
Write-Host '--- file count ---'
(Get-ChildItem -File).Count
Write-Host '--- index.html restored? ---'
Test-Path 'index.html'
Write-Host '--- web.config restored? ---'
Test-Path 'web.config'
Write-Host '--- probes ---'
foreach ($u in @('http://localhost/', 'http://localhost/index.html', 'http://localhost/contact.html')) {
    $code = & curl.exe -s -o NUL -w "%{http_code}" -m 8 "$u"
    Write-Host "  [$code] $u"
}
