# Delete stale dbo.BcRfps rows from the first naive scrape:
#  - rows where BcBidId isn't a 24-hex BC opportunity id (e.g. "reports", "settings")
#  - rows where ProjectName is empty or DueAtText is null (incomplete sidebar/nav matches)
# Keeps only well-formed Bid Board entries.

Add-Type -AssemblyName 'System.Data'
$conn = 'Server=gcc-svr-sql.greencommcont.com\GCCLLC;Database=GCCWeb;Trusted_Connection=True;TrustServerCertificate=True;Application Name=cleanup'
$cn = New-Object System.Data.SqlClient.SqlConnection $conn
try {
    $cn.Open()
    $cmd = $cn.CreateCommand()
    $cmd.CommandText = @"
DELETE FROM dbo.BcRfps
WHERE BcBidId IS NULL
   OR LEN(BcBidId) <> 24
   OR BcBidId NOT LIKE '%[a-f0-9]%'
   OR ProjectName IS NULL OR ProjectName = ''
   OR DueAtText  IS NULL OR DueAtText  = '';
SELECT COUNT(*) AS remaining FROM dbo.BcRfps;
"@
    $reader = $cmd.ExecuteReader()
    $reader.Read() | Out-Null
    Write-Host "Remaining rows: $($reader.GetInt32(0))"
}
catch { Write-Host "ERR: $($_.Exception.Message)"; exit 1 }
finally { $cn.Close() }
