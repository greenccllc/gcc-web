/**
 * Tiny migration runner. Reads every *.sql in migrations/ in lexical order
 * and applies the ones not already in schema_migrations. --reset drops the
 * public schema first (DEV ONLY — refuses if NODE_ENV=production).
 */

import { readdir, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, '..', 'migrations');

async function main(): Promise<void> {
  const reset = process.argv.includes('--reset');
  const url = process.env['DATABASE_URL'];
  if (!url) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });

  try {
    if (reset) {
      if (process.env['NODE_ENV'] === 'production') {
        console.error('Refusing --reset in production.');
        process.exit(2);
      }
      console.warn('--reset: dropping public schema');
      await pool.query('DROP SCHEMA public CASCADE');
      await pool.query('CREATE SCHEMA public');
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename     TEXT        PRIMARY KEY,
        applied_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const filenames = (await readdir(MIGRATIONS_DIR))
      .filter(f => f.endsWith('.sql'))
      .sort();

    const applied = new Set<string>(
      (await pool.query<{ filename: string }>('SELECT filename FROM schema_migrations'))
        .rows.map(r => r.filename)
    );

    let appliedCount = 0;
    for (const filename of filenames) {
      if (applied.has(filename)) {
        console.log(`= ${filename}`);
        continue;
      }
      const sql = await readFile(resolve(MIGRATIONS_DIR, filename), 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [filename]
        );
        await client.query('COMMIT');
        appliedCount++;
        console.log(`+ ${filename}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`x ${filename}\n`, err);
        process.exit(3);
      } finally {
        client.release();
      }
    }

    console.log(`\nDone. ${appliedCount} new migration(s) applied.`);
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
