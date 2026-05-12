/**
 * Postgres connection pool. Single shared pool — pg manages the connections.
 *
 * Helpers:
 *   query<T>(sql, params)           — fire one statement, get rows
 *   one<T>(sql, params)             — like query, asserts exactly one row
 *   maybeOne<T>(sql, params)        — like query, returns the first row or null
 *   tx(fn)                          — run fn in a transaction (BEGIN/COMMIT/ROLLBACK)
 */

import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { config } from '../config.js';

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  // Render/Heroku Postgres requires SSL; locally we run without.
  ssl: config.isProd ? { rejectUnauthorized: false } : undefined
});

pool.on('error', err => {
  console.error('postgres pool idle client error:', err);
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: ReadonlyArray<unknown> = []
): Promise<T[]> {
  const res = await pool.query<T>(sql, params as unknown[]);
  return res.rows;
}

export async function one<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: ReadonlyArray<unknown> = []
): Promise<T> {
  const rows = await query<T>(sql, params);
  if (rows.length !== 1) {
    throw new Error(`Expected exactly 1 row, got ${rows.length}`);
  }
  return rows[0]!;
}

export async function maybeOne<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: ReadonlyArray<unknown> = []
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* swallow */ }
    throw err;
  } finally {
    client.release();
  }
}

export async function shutdown(): Promise<void> {
  await pool.end();
}
