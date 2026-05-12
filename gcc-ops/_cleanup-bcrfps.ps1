$conn = "Server=localhost\GCCLLC;Database=GCCWeb;Trusted_Connection=True;TrustServerCertificate=True;Application Name=cleanup"
Add-Type -AssemblyName "System.Data"
$cn = New-Object System.Data.SqlClient.SqlConnection $conn
try {
    $cn.Open()
    $cmd = $cn.CreateCommand()
    $cmd.CommandText = "DELETE FROM dbo.BcRfps WHERE (DueAtText IS NULL OR DueAtText = '''') AND Source LIKE ''bc-scraper%''"
    $n = $cmd.ExecuteNonQuery()
    "Deleted $n stale row(s)."
} catch { "ERR: $($_.Exception.Message)" } finally { $cn.Close() }
