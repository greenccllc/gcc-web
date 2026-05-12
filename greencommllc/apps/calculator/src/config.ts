/**
 * Centralized environment config. Validated at boot — server refuses to
 * start if anything required is missing or malformed. No `process.env`
 * lookups anywhere else in the codebase.
 */

import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  PUBLIC_BASE_URL: z.string().url(),
  ALLOWED_PARENT_ORIGINS: z.string().min(1),

  DATABASE_URL: z.string().min(1),

  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be 32+ chars'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(15).default(10),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(2_592_000),

  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_CALLBACK_URL: z.string().url().default('http://localhost:3001/auth/google/callback'),
  GOOGLE_HOSTED_DOMAIN: z.string().optional().default('')
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const config = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === 'production',
  isDev:  parsed.data.NODE_ENV === 'development',
  isTest: parsed.data.NODE_ENV === 'test',
  allowedParentOrigins: parsed.data.ALLOWED_PARENT_ORIGINS
    .split(',').map(s => s.trim()).filter(Boolean),
  googleEnabled: Boolean(parsed.data.GOOGLE_CLIENT_ID && parsed.data.GOOGLE_CLIENT_SECRET)
} as const;

export type Config = typeof config;
