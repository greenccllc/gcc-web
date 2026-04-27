-- ============================================================
-- GCC Web DB — schema v2 (roles, settings, projects, files, QB)
-- Idempotent: safe to re-run.
-- ============================================================
SET QUOTED_IDENTIFIER ON;
GO
USE GCCWeb;
GO

-- ── 1. Clients: add Role + company info ─────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name='Role' AND Object_ID=OBJECT_ID('dbo.Clients'))
    ALTER TABLE dbo.Clients ADD Role VARCHAR(20) NOT NULL DEFAULT 'client';
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name='CompanyAddress' AND Object_ID=OBJECT_ID('dbo.Clients'))
    ALTER TABLE dbo.Clients ADD
        CompanyAddress  NVARCHAR(400)   NULL,
        CompanyEin      NVARCHAR(20)    NULL,
        CompanyDuns     NVARCHAR(20)    NULL,
        BillingAddress  NVARCHAR(400)   NULL,
        Title           NVARCHAR(100)   NULL,
        AvatarUrl       NVARCHAR(400)   NULL;
GO

-- Role values: 'client', 'staff', 'admin'
IF OBJECT_ID('dbo.CK_Clients_Role','C') IS NULL
    ALTER TABLE dbo.Clients ADD CONSTRAINT CK_Clients_Role
        CHECK (Role IN ('client','staff','admin'));
GO

-- ── 2. Settings: per-user key/value JSON store ──────────────
-- Used for: bundler API keys, UI preferences, company config, etc.
IF OBJECT_ID('dbo.Settings','U') IS NULL
BEGIN
    CREATE TABLE dbo.Settings (
        Id              BIGINT IDENTITY(1,1) PRIMARY KEY,
        ClientId        BIGINT          NOT NULL,
        Scope           VARCHAR(40)     NOT NULL,    -- 'bundler', 'profile', 'ui', 'integrations'
        [Key]           VARCHAR(100)    NOT NULL,
        ValueJson       NVARCHAR(MAX)   NOT NULL,
        IsSecret        BIT             NOT NULL DEFAULT 0,
        UpdatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_Settings_Clients FOREIGN KEY (ClientId) REFERENCES dbo.Clients(Id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX UX_Settings_ClientScopeKey ON dbo.Settings (ClientId, Scope, [Key]);
    PRINT 'Created table dbo.Settings';
END
GO

-- ── 3. Projects: organize estimates, files, history ────────
IF OBJECT_ID('dbo.Projects','U') IS NULL
BEGIN
    CREATE TABLE dbo.Projects (
        Id              BIGINT IDENTITY(1,1) PRIMARY KEY,
        CreatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
        ClientId        BIGINT          NULL,        -- owner client (NULL = staff-owned, no client yet)
        Name            NVARCHAR(200)   NOT NULL,
        Slug            NVARCHAR(100)   NULL,
        ProjectType     VARCHAR(40)     NULL,        -- senior-living, residential, etc.
        Status          VARCHAR(20)     NOT NULL DEFAULT 'active',  -- lead, prospect, active, won, lost, archived
        Address         NVARCHAR(400)   NULL,
        BidValue        DECIMAL(12,2)   NULL,
        DueDate         DATE            NULL,
        Notes           NVARCHAR(MAX)   NULL,
        AssignedStaffId BIGINT          NULL,
        CONSTRAINT FK_Projects_Clients FOREIGN KEY (ClientId) REFERENCES dbo.Clients(Id),
        CONSTRAINT FK_Projects_Staff   FOREIGN KEY (AssignedStaffId) REFERENCES dbo.Clients(Id)
    );
    CREATE INDEX IX_Projects_ClientId ON dbo.Projects (ClientId);
    CREATE INDEX IX_Projects_Status   ON dbo.Projects (Status);
    CREATE INDEX IX_Projects_Name     ON dbo.Projects (Name);
    PRINT 'Created table dbo.Projects';
END
GO

-- Link estimates to projects (optional)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name='ProjectId' AND Object_ID=OBJECT_ID('dbo.Estimates'))
    ALTER TABLE dbo.Estimates ADD ProjectId BIGINT NULL;
GO
IF OBJECT_ID('dbo.FK_Estimates_Projects','F') IS NULL
    ALTER TABLE dbo.Estimates ADD CONSTRAINT FK_Estimates_Projects
        FOREIGN KEY (ProjectId) REFERENCES dbo.Projects(Id);
GO

-- ── 4. Files: per-project uploads ───────────────────────────
IF OBJECT_ID('dbo.Files','U') IS NULL
BEGIN
    CREATE TABLE dbo.Files (
        Id              BIGINT IDENTITY(1,1) PRIMARY KEY,
        CreatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
        ProjectId       BIGINT          NULL,           -- null = client-level / unassigned
        ClientId        BIGINT          NOT NULL,       -- always owned by a client
        UploadedById    BIGINT          NOT NULL,       -- who uploaded
        FileName        NVARCHAR(400)   NOT NULL,
        StoragePath     NVARCHAR(1000)  NOT NULL,       -- relative path on disk or S3 key
        ContentType     VARCHAR(100)    NULL,
        SizeBytes       BIGINT          NOT NULL DEFAULT 0,
        Sha256          VARBINARY(32)   NULL,
        Tag             VARCHAR(40)     NULL,           -- 'plan', 'spec', 'photo', 'invoice', etc.
        Metadata        NVARCHAR(MAX)   NULL,
        CONSTRAINT FK_Files_Project  FOREIGN KEY (ProjectId)    REFERENCES dbo.Projects(Id),
        CONSTRAINT FK_Files_Client   FOREIGN KEY (ClientId)     REFERENCES dbo.Clients(Id),
        CONSTRAINT FK_Files_Uploader FOREIGN KEY (UploadedById) REFERENCES dbo.Clients(Id)
    );
    CREATE INDEX IX_Files_ProjectId ON dbo.Files (ProjectId);
    CREATE INDEX IX_Files_ClientId  ON dbo.Files (ClientId);
    CREATE INDEX IX_Files_CreatedAt ON dbo.Files (CreatedAt DESC);
    PRINT 'Created table dbo.Files';
END
GO

-- ── 5. QuickBooks OAuth connections ─────────────────────────
-- One row per OAuth-connected QB company. Tokens stored encrypted
-- (App-side: use ASP.NET Data Protection API for column-level encryption).
IF OBJECT_ID('dbo.QbConnections','U') IS NULL
BEGIN
    CREATE TABLE dbo.QbConnections (
        Id              BIGINT IDENTITY(1,1) PRIMARY KEY,
        CreatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
        ConnectedById   BIGINT          NOT NULL,       -- who connected the account
        RealmId         VARCHAR(40)     NOT NULL,       -- QB company ID
        CompanyName     NVARCHAR(200)   NULL,
        AccessTokenEnc  VARBINARY(2000) NOT NULL,       -- encrypted bearer
        RefreshTokenEnc VARBINARY(2000) NOT NULL,       -- encrypted refresh
        AccessExpiresAt DATETIME2(3)    NOT NULL,
        RefreshExpiresAt DATETIME2(3)   NOT NULL,
        Scope           NVARCHAR(400)   NULL,
        Status          VARCHAR(20)     NOT NULL DEFAULT 'active',
        CONSTRAINT FK_QbConn_Clients FOREIGN KEY (ConnectedById) REFERENCES dbo.Clients(Id)
    );
    CREATE UNIQUE INDEX UX_QbConn_RealmId ON dbo.QbConnections (RealmId);
    PRINT 'Created table dbo.QbConnections';
END
GO

-- ── 6. Invoices (read-mirror from QB; can be local-first too) ──
IF OBJECT_ID('dbo.Invoices','U') IS NULL
BEGIN
    CREATE TABLE dbo.Invoices (
        Id              BIGINT IDENTITY(1,1) PRIMARY KEY,
        CreatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt       DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
        ClientId        BIGINT          NOT NULL,
        ProjectId       BIGINT          NULL,
        QbInvoiceId     VARCHAR(40)     NULL,           -- mirror to QB
        QbRealmId       VARCHAR(40)     NULL,
        Number          NVARCHAR(40)    NOT NULL,
        InvoiceDate     DATE            NOT NULL,
        DueDate         DATE            NULL,
        Subtotal        DECIMAL(12,2)   NOT NULL DEFAULT 0,
        Tax             DECIMAL(12,2)   NOT NULL DEFAULT 0,
        Total           DECIMAL(12,2)   NOT NULL DEFAULT 0,
        Balance         DECIMAL(12,2)   NOT NULL DEFAULT 0,
        Status          VARCHAR(20)     NOT NULL DEFAULT 'draft',
        PdfPath         NVARCHAR(1000)  NULL,
        CONSTRAINT FK_Invoices_Clients  FOREIGN KEY (ClientId) REFERENCES dbo.Clients(Id),
        CONSTRAINT FK_Invoices_Projects FOREIGN KEY (ProjectId) REFERENCES dbo.Projects(Id)
    );
    CREATE INDEX IX_Invoices_ClientId  ON dbo.Invoices (ClientId);
    CREATE INDEX IX_Invoices_Status    ON dbo.Invoices (Status);
    CREATE INDEX IX_Invoices_QbInvoice ON dbo.Invoices (QbInvoiceId);
    PRINT 'Created table dbo.Invoices';
END
GO

-- ── 7. ProposalDrafts (autonomous proposal generator + tray approval gate) ──
-- gcc-proposal-worker subscribes to Pub/Sub topic gcc-proposal, generates
-- a DRAFT proposal docx in the job's Internal/ folder, and INSERTs a row
-- here with Status='pending'. GCC Manager (gcc-tray) polls for pending
-- rows and presents them to Nathan for accept/reject. ONLY when accepted
-- does the docx get promoted from Internal/ to Client/Proposal/v#/.
IF OBJECT_ID('dbo.ProposalDrafts','U') IS NULL
BEGIN
    CREATE TABLE dbo.ProposalDrafts (
        Id                  BIGINT IDENTITY(1,1) PRIMARY KEY,
        CreatedAt           DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt           DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
        -- Identity of the source extraction this draft was generated from.
        ExtractionId        VARCHAR(80)     NOT NULL,           -- gcc_bids.bid_extractions.extraction_id
        SourceFileId        VARCHAR(80)     NULL,               -- the originating Intake/ Drive file id (RFP)
        ProjectName         NVARCHAR(400)   NOT NULL,
        JobFolderId         VARCHAR(80)     NOT NULL,           -- the 5-Jobs/{phase}/{job}/ folder id
        JobFolderName       NVARCHAR(400)   NULL,
        PhaseFolder         NVARCHAR(80)    NULL,               -- '2. In Progress' / '3. Proposal Sent' / etc.
        -- Where the draft docx lives BEFORE acceptance (always Internal/).
        DraftDocxFileId     VARCHAR(80)     NULL,               -- Drive file id of the draft
        DraftDocxName       NVARCHAR(400)   NULL,               -- e.g. '03 Bid Proposal Vauto-1714175400.docx'
        DraftSizeBytes      BIGINT          NULL,
        -- Where it lands AFTER acceptance.
        ClientFileId        VARCHAR(80)     NULL,               -- copy in Client/Proposal/v#/ once accepted
        ClientFolderName    NVARCHAR(80)    NULL,               -- e.g. 'v3'
        -- Approval gate.
        Status              VARCHAR(20)     NOT NULL DEFAULT 'pending',
        DecidedAt           DATETIME2(3)    NULL,
        DecidedById         BIGINT          NULL,               -- dbo.Clients.Id of accepting/rejecting staff
        DecisionReason      NVARCHAR(400)   NULL,               -- typed reason on reject; optional on accept
        -- Worker bookkeeping.
        WorkerHost          NVARCHAR(120)   NULL,               -- which worker host generated this draft
        WorkerVersion       VARCHAR(40)     NULL,               -- gcc-proposal-worker semver
        TemplateSourceFile  NVARCHAR(400)   NULL,               -- which Past Versions/V*.docx was filled in
        ErrorMessage        NVARCHAR(2000)  NULL,               -- if Status='failed'
        CONSTRAINT CK_ProposalDrafts_Status
            CHECK (Status IN ('pending','accepted','rejected','failed','superseded'))
    );
    CREATE INDEX IX_ProposalDrafts_Status      ON dbo.ProposalDrafts (Status, CreatedAt DESC);
    CREATE INDEX IX_ProposalDrafts_JobFolderId ON dbo.ProposalDrafts (JobFolderId);
    CREATE INDEX IX_ProposalDrafts_Extraction  ON dbo.ProposalDrafts (ExtractionId);
    PRINT 'Created table dbo.ProposalDrafts';
END
GO

PRINT '--- Schema v2 complete ---';
SELECT name FROM sys.tables WHERE schema_id = SCHEMA_ID('dbo') ORDER BY name;
GO
