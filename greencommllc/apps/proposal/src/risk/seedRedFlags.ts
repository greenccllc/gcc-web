/**
 * seedRedFlags() — runs the catalog rules against an intake and returns
 * the auto-detected flag list. Pure function, no DOM.
 */

import type { Crosswalk, TokenCategory } from '@models/crosswalk';
import type { RedFlag, RedFlagTestContext } from '@models/risk';
import { RED_FLAG_CATALOG } from './redFlagCatalog';

const TEXT_TOKENS: readonly string[] = [
  'scope_notes',
  'schedule_notes',
  'project_type',
  'building_type',
  'hook',
  'occupancy',
  'labor_notes',
  'standards_notes',
  'commercial_notes',
  'owner'
];

export interface SeedRedFlagsInput {
  crosswalk: Crosswalk;
  /** Current phase 0..4 — drives which categories count for blank-required. */
  currentPhase: number;
  /** Lookup: token → category. Supply from TOKEN_DEFS at call site. */
  tokenCategories: Record<string, TokenCategory>;
  /** Category gating map from crosswalk module. */
  requiredByPhase: Record<number, readonly TokenCategory[]>;
}

/** Build the text blob + context used by the catalog rules. */
export function buildRedFlagContext(inp: SeedRedFlagsInput): { textBlob: string; ctx: RedFlagTestContext } {
  const cw = inp.crosswalk;
  const blob = TEXT_TOKENS.map((k) => {
    const v = cw[k]?.value;
    return Array.isArray(v) ? v.join(' ') : String(v ?? '');
  }).join(' ');

  const phase = Math.min(4, (inp.currentPhase ?? 0) + 1);
  const reqCats = inp.requiredByPhase[phase] ?? [];

  let lowConfCount = 0;
  let blankRequiredCount = 0;
  for (const [token, e] of Object.entries(cw)) {
    const v = e.value;
    const blank = v == null || v === '' || (Array.isArray(v) && v.length === 0);
    const conf = typeof e.confidence === 'number' ? e.confidence : NaN;
    if (Number.isFinite(conf) && conf > 0 && conf < 0.6) lowConfCount++;
    const cat = inp.tokenCategories[token];
    if (blank && cat && reqCats.includes(cat)) blankRequiredCount++;
  }

  // GC-new heuristic
  const gcName = String(cw['gc_company_name']?.value ?? '').toLowerCase();
  const gcIsNew = gcName.length > 0 && !/direct|kaitlyn|gcc/.test(gcName);

  // Out-of-area
  const addr = String(cw['project_address']?.value ?? '').toLowerCase();
  const outOfArea = addr.length > 0 && !/kansas city|kcmo|st\.?\s*louis|stl|missouri|mo |, mo\b/i.test(addr);

  // Bid-deadline countdown
  let bidDaysRemaining: number | null = null;
  const bidDue = String(cw['bid_due_date']?.value ?? '');
  if (bidDue) {
    const t = Date.parse(bidDue);
    if (!Number.isNaN(t)) bidDaysRemaining = Math.round((t - Date.now()) / 86_400_000);
  }

  return {
    textBlob: blob,
    ctx: { lowConfCount, blankRequiredCount, gcIsNew, outOfArea, bidDaysRemaining }
  };
}

/** Run all catalog rules against the intake and return the raised flags. */
export function seedRedFlags(inp: SeedRedFlagsInput): RedFlag[] {
  const { textBlob, ctx } = buildRedFlagContext(inp);
  const out: RedFlag[] = [];
  for (const rule of RED_FLAG_CATALOG) {
    try {
      if (rule.test(textBlob, ctx)) {
        out.push({
          id: rule.id,
          severity: rule.severity,
          category: rule.category,
          text: rule.text,
          source: 'auto',
          resolved: false
        });
      }
    } catch {
      // Individual rule errors should never cascade — skip silently.
    }
  }
  return out;
}

/** Merge user-added flags with freshly-seeded auto flags. Preserves user edits. */
export function mergeRedFlags(existing: readonly RedFlag[], autoFlags: readonly RedFlag[]): RedFlag[] {
  const userFlags = existing.filter((f) => f.source !== 'auto');
  const seen = new Set<string>();
  const merged: RedFlag[] = [];
  for (const f of [...userFlags, ...autoFlags]) {
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    merged.push(f);
  }
  return merged;
}
