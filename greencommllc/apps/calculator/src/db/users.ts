/**
 * Users repository. All SQL touching the users table lives here so the
 * route handlers stay thin and the schema column names are referenced
 * in exactly one place.
 */

import { maybeOne, one, query } from './pool.js';

export type UserRole = 'staff' | 'gc' | 'owner';

export interface UserRow {
  id: string;
  email: string;
  email_verified: boolean;
  full_name: string | null;
  password_hash: string | null;
  google_sub: string | null;
  role: UserRole;
  org_name: string | null;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const SELECT_COLS = `
  id, email, email_verified, full_name, password_hash, google_sub,
  role, org_name, is_active, last_login_at,
  created_at, updated_at
`;

export async function findByEmail(email: string): Promise<UserRow | null> {
  return maybeOne<UserRow>(
    `SELECT ${SELECT_COLS} FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [email]
  );
}

export async function findById(id: string): Promise<UserRow | null> {
  return maybeOne<UserRow>(
    `SELECT ${SELECT_COLS} FROM users WHERE id = $1 LIMIT 1`,
    [id]
  );
}

export async function findByGoogleSub(sub: string): Promise<UserRow | null> {
  return maybeOne<UserRow>(
    `SELECT ${SELECT_COLS} FROM users WHERE google_sub = $1 LIMIT 1`,
    [sub]
  );
}

export interface CreateUserInput {
  email: string;
  fullName?: string | null | undefined;
  passwordHash?: string | null | undefined;
  googleSub?: string | null | undefined;
  role?: UserRole;
  orgName?: string | null | undefined;
  emailVerified?: boolean;
}

export async function createUser(inp: CreateUserInput): Promise<UserRow> {
  return one<UserRow>(
    `INSERT INTO users (
       email, full_name, password_hash, google_sub,
       role, org_name, email_verified
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${SELECT_COLS}`,
    [
      inp.email,
      inp.fullName ?? null,
      inp.passwordHash ?? null,
      inp.googleSub ?? null,
      inp.role ?? 'staff',
      inp.orgName ?? null,
      inp.emailVerified ?? false
    ]
  );
}

export async function attachGoogleSub(userId: string, sub: string): Promise<void> {
  await query(
    `UPDATE users SET google_sub = $2, email_verified = TRUE WHERE id = $1`,
    [userId, sub]
  );
}

export async function touchLastLogin(userId: string): Promise<void> {
  await query(
    `UPDATE users SET last_login_at = now() WHERE id = $1`,
    [userId]
  );
}
