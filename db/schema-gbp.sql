-- ============================================================
-- GCC Web DB — Google Business Profile connections table.
-- Idempotent: safe to re-run.
-- Apply with:  sqlcmd -S localhost\GCCLLC -d GCCWeb -i schema-gbp.sql
-- ============================================================
SET QUOTED_IDENTIFIER ON;
GO
USE GCCWeb;
GO

IF OBJECT_ID('dbo.GbpConnections','U') IS NULL
BEGIN
    CREATE TABLE dbo.GbpConnections (
        Id              BIGINT IDENTITY(1,1) PRIMARY KEY,
        CreatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
        ConnectedById   BIGINT          NOT NULL,
        Email           NVARCHAR(200)   NOT NULL,
        AccountName     NVARCHAR(200)   NULL,
        AccessTokenEnc  VARBINARY(2000) NOT NULL,
        RefreshTokenEnc VARBINARY(2000) NOT NULL,
        AccessExpiresAt DATETIME2(3)    NOT NULL,
        Scope           NVARCHAR(400)   NULL,
        Status          VARCHAR(20)     NOT NULL DEFAULT 'active',
        CONSTRAINT FK_GbpConn_Clients FOREIGN KEY (ConnectedById) REFERENCES dbo.Clients(Id)
    );
    CREATE UNIQUE INDEX UX_GbpConn_Email ON dbo.GbpConnections (Email);
    PRINT 'Created table dbo.GbpConnections';
END
ELSE
    PRINT 'dbo.GbpConnections already exists.';
GO
