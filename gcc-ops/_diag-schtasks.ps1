$WorkingDir = 'C:\GCC_LLC\Repos\bc-scraper'
$NodeExe    = 'C:\Program Files\nodejs\node.exe'
$tr = "cmd.exe /c cd /d `"$WorkingDir`" && `"$NodeExe`" scrape.js"
$out = 'C:\ProgramData\GCC\schtasks-diag.log'
"Command to register: $tr" | Out-File $out
& schtasks.exe /Delete /TN 'GCC-Bc-Scrape' /F 2>&1 | Out-File $out -Append
"---" | Out-File $out -Append
& schtasks.exe /Create /TN 'GCC-Bc-Scrape' /TR $tr /SC MINUTE /MO 15 /RU 'SYSTEM' /RL HIGHEST /F 2>&1 | Out-File $out -Append
"exit: $LASTEXITCODE" | Out-File $out -Append
