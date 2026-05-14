-- ============================================================
-- Promote (or demote) a portal user by email.
-- Requires schema-v2.sql (Role column + CK_Clients_Role).
-- Edit @Email and @Role, then run with sqlcmd or SSMS.
-- ============================================================
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
GO
USE GCCWeb;
GO

DECLARE @Email NVARCHAR(254) = N'you@greencommllc.com';  -- <-- change
DECLARE @Role  VARCHAR(20)   = N'admin';                 -- admin | staff | client

IF @Role NOT IN ('client', 'staff', 'admin')
BEGIN
    RAISERROR('Role must be client, staff, or admin.', 16, 1);
    RETURN;
END;

UPDATE dbo.Clients
SET    Role = @Role,
       Status = 'active',
       FailedAttempts = 0,
       LockoutUntil = NULL,
       UpdatedAt = SYSUTCDATETIME()
WHERE  EmailLower = LOWER(LTRIM(RTRIM(@Email)));

IF @@ROWCOUNT = 0
BEGIN
    RAISERROR('No dbo.Clients row for that email. Sign up once or INSERT a row first.', 16, 1);
    RETURN;
END;

PRINT 'Updated Role=' + @Role + ' for ' + @Email;
GO
