-- ─────────────────────────────────────────────────────────────────────────
-- 001_init.sql — initial schema
--
-- Tables:
--   users              — credentials + identity (bcrypt OR google_sub)
--   user_sessions      — opaque session id + cookie payload (refresh tokens, audit)
--   projects           — one row per deal. Holds intake + session as JSONB
--                        (matches IntakeState / SessionState in proposal-generator-ts)
--   project_outputs    — generated artifacts (cache + audit). Filename + body.
--   audit_log          — append-only auth+render events for SOC-ish trail
-- ─────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── users ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT         NOT NULL UNIQUE,
  email_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
  full_name       TEXT,
  -- one or more of these will be set depending on signup path
  password_hash   TEXT,                    -- bcrypt hash, null if OAuth-only
  google_sub      TEXT         UNIQUE,     -- Google OIDC subject
  -- role: 'staff' = GCC employees with full access; 'gc' = general contractor
  -- estimators with read-only on shared deals; 'owner' = property owners with
  -- read on their own deals only
  role            TEXT         NOT NULL DEFAULT 'staff'
                  CHECK (role IN ('staff', 'gc', 'owner')),
  org_name        TEXT,                    -- e.g. "Pinnacle Construction"
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_email_lower_idx ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS users_google_sub_idx  ON users (google_sub);

-- ─── user_sessions ────────────────────────────────────────────────────────
-- Session id is the cookie value (random 32 bytes). JWT carries the same id
-- so revocation is real (delete the row, the JWT becomes useless next req).
CREATE TABLE IF NOT EXISTS user_sessions (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- 'password' | 'google'
  auth_method     TEXT         NOT NULL,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ  NOT NULL,
  revoked_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS user_sessions_user_idx     ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS user_sessions_expires_idx  ON user_sessions (expires_at)
  WHERE revoked_at IS NULL;

-- ─── projects ─────────────────────────────────────────────────────────────
-- One row per deal. The proposal-generator-ts engine works on IntakeState +
-- SessionState; we round-trip those as JSONB so renderers don't change.
CREATE TABLE IF NOT EXISTS projects (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  -- short slug used in URLs and filenames, e.g. "olive-st-mob-2026"
  slug            TEXT         NOT NULL UNIQUE,
  display_name    TEXT         NOT NULL,
  -- project_label that flows into output filenames + headers
  project_label   TEXT         NOT NULL,
  owner_user_id   UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  -- IntakeState (Stage 1-3) — files, runs, crosswalk, openItems, etc.
  intake          JSONB        NOT NULL DEFAULT '{}'::jsonb,
  -- SessionState (Stage 4) — line items, meta, propnum
  session_state   JSONB        NOT NULL DEFAULT '{}'::jsonb,
  -- Lifecycle: 'intake' | 'review' | 'priced' | 'sent' | 'won' | 'lost' | 'archived'
  status          TEXT         NOT NULL DEFAULT 'intake'
                  CHECK (status IN ('intake', 'review', 'priced', 'sent', 'won', 'lost', 'archived')),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_owner_idx       ON projects (owner_user_id);
CREATE INDEX IF NOT EXISTS projects_status_idx      ON projects (status);

-- ─── project_outputs ──────────────────────────────────────────────────────
-- Cache of every generated artifact. Lets us serve back the exact file we
-- last gave the customer + audit who pulled what when.
CREATE TABLE IF NOT EXISTS project_outputs (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  -- e.g. "cover-letter", "bid-proposal", "field-guide"
  kind            TEXT         NOT NULL,
  filename        TEXT         NOT NULL,
  -- 'html' | 'pdf' | 'xlsx' | 'md'
  format          TEXT         NOT NULL,
  -- mime type for the response
  mime_type       TEXT         NOT NULL,
  -- size in bytes (for quick listing without loading body)
  size_bytes      BIGINT       NOT NULL,
  -- rendered body. text formats stored as text; binary (pdf/xlsx) base64.
  body_text       TEXT,
  body_b64        TEXT,
  -- snapshot of input inputs at render time (so we can re-render same)
  intake_snapshot   JSONB,
  session_snapshot  JSONB,
  -- who pulled it, when
  rendered_by_user_id UUID     REFERENCES users(id) ON DELETE SET NULL,
  rendered_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK ((body_text IS NOT NULL) <> (body_b64 IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS project_outputs_project_idx ON project_outputs (project_id, kind);
CREATE INDEX IF NOT EXISTS project_outputs_recent_idx  ON project_outputs (rendered_at DESC);

-- ─── audit_log ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id              BIGSERIAL    PRIMARY KEY,
  occurred_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  user_id         UUID         REFERENCES users(id) ON DELETE SET NULL,
  -- 'login.password' | 'login.google' | 'login.fail'
  -- 'logout' | 'render.cover_letter' | 'render.bid_proposal' | 'export.zip' | ...
  event           TEXT         NOT NULL,
  ip_address      INET,
  user_agent      TEXT,
  metadata        JSONB
);

CREATE INDEX IF NOT EXISTS audit_user_recent_idx  ON audit_log (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_event_recent_idx ON audit_log (event,   occurred_at DESC);

-- ─── updated_at trigger ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
