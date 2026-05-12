/**
 * Projects CRUD. One row per deal. Intake + session_state are stored as
 * JSONB so the proposal-generator-ts engine can round-trip them without
 * schema changes when the engine evolves.
 */

import { Router, type Request } from 'express';
import { z } from 'zod';
import { maybeOne, one, query } from '../db/pool.js';
import { loadSession, requireAuth } from '../middleware/session.js';

export const projectsRouter: Router = Router();
projectsRouter.use(loadSession);
projectsRouter.use(requireAuth);

interface ProjectRow {
  id: string;
  slug: string;
  display_name: string;
  project_label: string;
  owner_user_id: string;
  intake: unknown;
  session_state: unknown;
  status: string;
  created_at: Date;
  updated_at: Date;
}

const SELECT_COLS = `
  id, slug, display_name, project_label, owner_user_id,
  intake, session_state, status,
  created_at, updated_at
`;

function publicProject(row: ProjectRow): Record<string, unknown> {
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    projectLabel: row.project_label,
    ownerUserId: row.owner_user_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function canSeeAllProjects(req: Request): boolean {
  return req.user?.role === 'staff';
}

// ─── list ────────────────────────────────────────────────────────────────
projectsRouter.get('/', async (req, res) => {
  const userId = req.user!.id;
  const rows = canSeeAllProjects(req)
    ? await query<ProjectRow>(`SELECT ${SELECT_COLS} FROM projects ORDER BY updated_at DESC LIMIT 200`)
    : await query<ProjectRow>(
        `SELECT ${SELECT_COLS} FROM projects WHERE owner_user_id = $1
         ORDER BY updated_at DESC LIMIT 200`,
        [userId]
      );
  res.json({ projects: rows.map(publicProject) });
});

// ─── create ──────────────────────────────────────────────────────────────
const createSchema = z.object({
  slug:         z.string().min(2).max(80).regex(/^[a-z0-9][a-z0-9-_]*$/),
  displayName:  z.string().min(1).max(200),
  projectLabel: z.string().min(1).max(200),
  status:       z.enum(['intake', 'review', 'priced', 'sent', 'won', 'lost', 'archived']).optional()
});

projectsRouter.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_input', issues: parsed.error.issues });
    return;
  }
  const existing = await maybeOne<ProjectRow>(
    `SELECT ${SELECT_COLS} FROM projects WHERE slug = $1`,
    [parsed.data.slug]
  );
  if (existing) { res.status(409).json({ error: 'slug_in_use' }); return; }

  const row = await one<ProjectRow>(
    `INSERT INTO projects
       (slug, display_name, project_label, owner_user_id, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${SELECT_COLS}`,
    [
      parsed.data.slug,
      parsed.data.displayName,
      parsed.data.projectLabel,
      req.user!.id,
      parsed.data.status ?? 'intake'
    ]
  );
  res.status(201).json({ project: publicProject(row) });
});

// ─── get one ─────────────────────────────────────────────────────────────
projectsRouter.get('/:slug', async (req, res) => {
  const row = await maybeOne<ProjectRow>(
    `SELECT ${SELECT_COLS} FROM projects WHERE slug = $1`,
    [req.params.slug]
  );
  if (!row) { res.status(404).json({ error: 'not_found' }); return; }
  if (!canSeeAllProjects(req) && row.owner_user_id !== req.user!.id) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  res.json({
    project: publicProject(row),
    intake: row.intake,
    sessionState: row.session_state
  });
});

// ─── patch (intake / sessionState / status) ──────────────────────────────
const patchSchema = z.object({
  displayName:  z.string().min(1).max(200).optional(),
  projectLabel: z.string().min(1).max(200).optional(),
  status:       z.enum(['intake', 'review', 'priced', 'sent', 'won', 'lost', 'archived']).optional(),
  intake:       z.unknown().optional(),
  sessionState: z.unknown().optional()
});

projectsRouter.patch('/:slug', async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_input', issues: parsed.error.issues });
    return;
  }
  const row = await maybeOne<ProjectRow>(
    `SELECT ${SELECT_COLS} FROM projects WHERE slug = $1`,
    [req.params.slug]
  );
  if (!row) { res.status(404).json({ error: 'not_found' }); return; }
  if (!canSeeAllProjects(req) && row.owner_user_id !== req.user!.id) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }

  const sets: string[] = [];
  const params: unknown[] = [row.id];
  let i = 2;

  if (parsed.data.displayName  !== undefined) { sets.push(`display_name  = $${i++}`); params.push(parsed.data.displayName); }
  if (parsed.data.projectLabel !== undefined) { sets.push(`project_label = $${i++}`); params.push(parsed.data.projectLabel); }
  if (parsed.data.status       !== undefined) { sets.push(`status        = $${i++}`); params.push(parsed.data.status); }
  if (parsed.data.intake       !== undefined) { sets.push(`intake        = $${i++}::jsonb`); params.push(JSON.stringify(parsed.data.intake)); }
  if (parsed.data.sessionState !== undefined) { sets.push(`session_state = $${i++}::jsonb`); params.push(JSON.stringify(parsed.data.sessionState)); }

  if (sets.length === 0) {
    res.json({ project: publicProject(row), changed: false });
    return;
  }

  const updated = await one<ProjectRow>(
    `UPDATE projects SET ${sets.join(', ')} WHERE id = $1
     RETURNING ${SELECT_COLS}`,
    params
  );
  res.json({ project: publicProject(updated), changed: true });
});
