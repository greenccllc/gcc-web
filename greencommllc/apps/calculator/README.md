# calc-app

GCC LV Div 27/28 proposal generator — web app behind login.

```
calc.greencommllc.com (this app — Node + Express + Postgres)
  ├── owns its own auth — Postgres users + bcrypt + Google OAuth
  └── runs the proposal-generator-ts engine for renders
```

Two sign-in paths converge to the same Postgres `users` row:

1. **Email + password** — local signup, bcrypt
2. **Google OAuth** — direct OIDC flow against Google

## Quick start (local)

```bash
# 1. start postgres
cp .env.example .env       # edit secrets
npm install
docker compose up -d postgres

# 2. apply migrations
npm run db:migrate

# 3. run the server
npm run dev                # tsx watch on :3001
open http://localhost:3001
```

The first user you create via the UI gets `role='gc'`. Promote yourself to
`role='staff'` directly in Postgres:

```sql
UPDATE users SET role = 'staff' WHERE email = 'nmorris@greencommllc.com';
```

## Routes

| Method | Path                          | Auth     | Notes                          |
| ------ | ----------------------------- | -------- | ------------------------------ |
| GET    | /healthz                      | none     | liveness                       |
| GET    | /readyz                       | none     | pg ping                        |
| POST   | /auth/signup                  | none     | email + password               |
| POST   | /auth/login                   | none     | email + password               |
| POST   | /auth/logout                  | none     | revokes session                |
| GET    | /auth/me                      | session  | returns logged-in user         |
| GET    | /auth/google                  | none     | starts Google OAuth            |
| GET    | /auth/google/callback         | none     | OIDC redirect target           |
| GET    | /api/projects                 | session  | list projects                  |
| POST   | /api/projects                 | session  | create project                 |
| GET    | /api/projects/:slug           | session  | get one (intake + sessionState)|
| PATCH  | /api/projects/:slug           | session  | partial update                 |

## Schema

See `migrations/001_init.sql`. Key tables:

- `users` — id, email, password_hash, google_sub, role
- `user_sessions` — opaque session id (in cookie JWT), revocable
- `projects` — slug, display_name, intake JSONB, session_state JSONB
- `project_outputs` — every rendered artifact, cached + audit-logged
- `audit_log` — append-only login + render trail

## Engine

The renderers (cover letter, bid proposal, SOW, qualifications, master
extraction, drop counts, cable schedule, field guide…) live in the
sibling repo `proposal-generator-ts/` and are mounted via a relative
file dependency in `package.json`. To wire a new renderer into the
calc-app, add a row to `src/routes/renders.ts` (TODO — task #30).
