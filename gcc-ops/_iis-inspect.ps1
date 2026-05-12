$appcmd = "$env:windir\System32\inetsrv\appcmd.exe"
$out = 'C:\ProgramData\GCC\iis-info.txt'
"=== sites ===" | Out-File $out
& $appcmd list site /text:* | Out-File $out -Append
"=== apps ===" | Out-File $out -Append
& $appcmd list app | Out-File $out -Append
