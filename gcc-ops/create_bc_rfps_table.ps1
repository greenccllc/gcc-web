# Create dbo.BcRfps in GCCWeb. Run elevated -- needs SQL sysadmin / db_owner.
# Idempotent.

$conn = 'Server=gcc-svr-sql.greencommcont.com\GCCLLC;Database=GCCWeb;Trusted_Connection=True;TrustServerCertificate=True;Application Name=GccApi-setup'
$sql = @'
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'BcRfps' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.BcRfps (
        Id           BIGINT IDENTITY PRIMARY KEY,
        BcBidId      NVARCHAR(128) NULL,
        ProjectName  NVARCHAR(500) NOT NULL,
        Gc           NVARCHAR(500) NULL,
        Location     NVARCHAR(500) NULL,
        DueAtText    NVARCHAR(200) NULL,
        Status       NVARCHAR(100) NULL,
        Href         NVARCHAR(1000) NULL,
        RawText      NVARCHAR(MAX) NULL,
        PayloadJson  NVARCHAR(MAX) NULL,
        FirstSeenAt  DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME(),
        LastSeenAt   DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME(),
        Source       NVARCHAR(100) NULL
    );
    CREATE UNIQUE INDEX IX_BcRfps_BcBidId ON dbo.BcRfps(BcBidId) WHERE BcBidId IS NOT NULL;
    PRINT 'Created dbo.BcRfps';
END
ELSE PRINT 'dbo.BcRfps already exists';

-- Make sure NETWORK SERVICE (the gcc-api process identity) can read/write it.
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.BcRfps TO [NT AUTHORITY\NETWORK SERVICE];
PRINT 'Granted NETWORK SERVICE CRUD on dbo.BcRfps';
'@

Add-Type -AssemblyName 'System.Data'
$cn = New-Object System.Data.SqlClient.SqlConnection $conn
try {
    $cn.Open()
    $cmd = $cn.CreateCommand()
    $cmd.CommandText = $sql
    $cmd.CommandTimeout = 30
    # InfoMessage so PRINT statements come through.
    $cn.add_InfoMessage({ param($s, $e) Write-Host "  SQL: $($e.Message)" })
    $cmd.ExecuteNonQuery() | Out-Null
    Write-Host 'Done.'
}
catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    exit 1
}
finally { $cn.Close() }
