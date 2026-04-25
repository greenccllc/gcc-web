-- ============================================================
-- GCC Web Database — schema for marketing site backend
-- Tables: Leads, Clients, Sessions, Estimates, Activity
-- ============================================================

USE master;
GO

IF DB_ID('GCCWeb') IS NULL
BEGIN
    CREATE DATABASE GCCWeb;
    PRINT 'Created database GCCWeb';
END
ELSE
    PRINT 'Database GCCWeb already exists';
GO

USE GCCWeb;
GO

-- ─── Leads ─────────────────────────────────────────────────────
-- Anything submitted by a non-authenticated visitor lands here.
-- Source = which form/page produced the lead.
IF OBJECT_ID('dbo.Leads','U') IS NULL
BEGIN
    CREATE TABLE dbo.Leads (
        Id              BIGINT IDENTITY(1,1) PRIMARY KEY,
        CreatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
        Source          VARCHAR(40)     NOT NULL,           -- 'contact', 'estimator-public-commercial', 'estimator-public-residential'
        Name            NVARCHAR(200)   NULL,
        Email           NVARCHAR(254)   NULL,
        Phone           NVARCHAR(40)    NULL,
        Company         NVARCHAR(200)   NULL,
        Vertical        NVARCHAR(60)    NULL,               -- senior-living, education, etc.
        Metro           VARCHAR(20)     NULL,               -- KCMO, STL, both, outside
        Message         NVARCHAR(MAX)   NULL,
        EstimateMin     DECIMAL(12,2)   NULL,
        EstimateMid     DECIMAL(12,2)   NULL,
        EstimateMax     DECIMAL(12,2)   NULL,
        PayloadJson     NVARCHAR(MAX)   NULL,               -- raw form payload for traceability
        IpAddress       VARCHAR(45)     NULL,
        UserAgent       NVARCHAR(500)   NULL,
        Status          VARCHAR(20)     NOT NULL DEFAULT 'new',  -- new, contacted, quoted, won, lost, spam
        Notes           NVARCHAR(MAX)   NULL
    );
    CREATE INDEX IX_Leads_CreatedAt ON dbo.Leads (CreatedAt DESC);
    CREATE INDEX IX_Leads_Status    ON dbo.Leads (Status);
    CREATE INDEX IX_Leads_Email     ON dbo.Leads (Email);
    PRINT 'Created table dbo.Leads';
END
GO

-- ─── Clients ────────────────────────────────────────────────────
-- Authenticated portal users. Hashing: PBKDF2 with random salt.
IF OBJECT_ID('dbo.Clients','U') IS NULL
BEGIN
    CREATE TABLE dbo.Clients (
        Id              BIGINT IDENTITY(1,1) PRIMARY KEY,
        CreatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
        Email           NVARCHAR(254)   NOT NULL,
        EmailLower      AS LOWER(Email) PERSISTED,
        PasswordHash    VARBINARY(64)   NOT NULL,
        PasswordSalt    VARBINARY(32)   NOT NULL,
        PasswordIters   INT             NOT NULL DEFAULT 100000,
        Name            NVARCHAR(200)   NULL,
        Company         NVARCHAR(200)   NULL,
        Phone           NVARCHAR(40)    NULL,
        ClientType      VARCHAR(20)     NOT NULL,           -- residential, commercial
        Status          VARCHAR(20)     NOT NULL DEFAULT 'active',  -- active, locked, deleted
        LastSignInAt    DATETIME2(3)    NULL,
        LastSignInIp    VARCHAR(45)     NULL,
        FailedAttempts  INT             NOT NULL DEFAULT 0,
        LockoutUntil    DATETIME2(3)    NULL
    );
    CREATE UNIQUE INDEX UX_Clients_EmailLower ON dbo.Clients (EmailLower);
    PRINT 'Created table dbo.Clients';
END
GO

-- ─── Sessions ───────────────────────────────────────────────────
-- Cookie-bound session tokens. Token is a 256-bit random value;
-- we store its SHA-256 hash here so DB compromise doesn't leak
-- live cookies.
IF OBJECT_ID('dbo.Sessions','U') IS NULL
BEGIN
    CREATE TABLE dbo.Sessions (
        Id              BIGINT IDENTITY(1,1) PRIMARY KEY,
        ClientId        BIGINT          NOT NULL,
        TokenHash       VARBINARY(32)   NOT NULL,
        CreatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
        ExpiresAt       DATETIME2(3)    NOT NULL,
        LastSeenAt      DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
        IpAddress       VARCHAR(45)     NULL,
        UserAgent       NVARCHAR(500)   NULL,
        RevokedAt       DATETIME2(3)    NULL,
        CONSTRAINT FK_Sessions_Clients FOREIGN KEY (ClientId) REFERENCES dbo.Clients(Id)
    );
    CREATE UNIQUE INDEX UX_Sessions_TokenHash ON dbo.Sessions (TokenHash);
    CREATE INDEX IX_Sessions_ClientId ON dbo.Sessions (ClientId);
    CREATE INDEX IX_Sessions_ExpiresAt ON dbo.Sessions (ExpiresAt);
    PRINT 'Created table dbo.Sessions';
END
GO

-- ─── Estimates ──────────────────────────────────────────────────
-- Saved estimator sessions, both authenticated and anonymous (with
-- email-only handoff). Payload is the full form data + computed
-- range so we can re-render later.
IF OBJECT_ID('dbo.Estimates','U') IS NULL
BEGIN
    CREATE TABLE dbo.Estimates (
        Id              BIGINT IDENTITY(1,1) PRIMARY KEY,
        CreatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
        ClientId        BIGINT          NULL,               -- NULL = anonymous (use Email instead)
        Email           NVARCHAR(254)   NULL,
        Source          VARCHAR(40)     NOT NULL,           -- 'public-commercial','public-residential','client-commercial','client-residential'
        ClientType      VARCHAR(20)     NOT NULL,           -- residential, commercial
        ProjectName     NVARCHAR(200)   NULL,
        EstimateMin     DECIMAL(12,2)   NOT NULL,
        EstimateMid     DECIMAL(12,2)   NOT NULL,
        EstimateMax     DECIMAL(12,2)   NOT NULL,
        LineItemCount   INT             NOT NULL DEFAULT 0,
        PayloadJson     NVARCHAR(MAX)   NOT NULL,           -- {form: {...}, lines: [...]}
        Status          VARCHAR(20)     NOT NULL DEFAULT 'draft',   -- draft, submitted, quoted, won, lost
        Notes           NVARCHAR(MAX)   NULL,
        CONSTRAINT FK_Estimates_Clients FOREIGN KEY (ClientId) REFERENCES dbo.Clients(Id)
    );
    CREATE INDEX IX_Estimates_ClientId  ON dbo.Estimates (ClientId);
    CREATE INDEX IX_Estimates_Email     ON dbo.Estimates (Email);
    CREATE INDEX IX_Estimates_CreatedAt ON dbo.Estimates (CreatedAt DESC);
    PRINT 'Created table dbo.Estimates';
END
GO

-- ─── Activity ───────────────────────────────────────────────────
-- Lightweight audit/activity log: signups, signins, estimate saves.
-- Keeps the security audit trail separate from business data.
IF OBJECT_ID('dbo.Activity','U') IS NULL
BEGIN
    CREATE TABLE dbo.Activity (
        Id              BIGINT IDENTITY(1,1) PRIMARY KEY,
        CreatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
        ClientId        BIGINT          NULL,
        Action          VARCHAR(40)     NOT NULL,           -- signup, signin, signin-fail, signout, estimate-save, lead-create
        IpAddress       VARCHAR(45)     NULL,
        UserAgent       NVARCHAR(500)   NULL,
        DetailsJson     NVARCHAR(MAX)   NULL
    );
    CREATE INDEX IX_Activity_CreatedAt ON dbo.Activity (CreatedAt DESC);
    CREATE INDEX IX_Activity_ClientId  ON dbo.Activity (ClientId);
    CREATE INDEX IX_Activity_Action    ON dbo.Activity (Action);
    PRINT 'Created table dbo.Activity';
END
GO

PRINT '--- Schema complete ---';
SELECT name FROM sys.tables WHERE schema_id = SCHEMA_ID('dbo') ORDER BY name;
GO
