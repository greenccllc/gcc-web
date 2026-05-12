/**
 * Unit tests for the red-flag seeder.
 * Each rule in the catalog has at least one positive case.
 */

import { describe, it, expect } from 'vitest';
import { seedRedFlags, mergeRedFlags, buildRedFlagContext } from '@/risk/seedRedFlags';
import { PHASE_REQUIRED_CATS } from '@models/crosswalk';
import type { Crosswalk, TokenCategory } from '@models/crosswalk';
import type { RedFlag } from '@models/risk';

// Empty token-category map is fine for most tests — rules that need it
// override `currentPhase`/`requiredByPhase` counts via fixtures.
const emptyTokenCategories: Record<string, TokenCategory> = {};

function cw(pairs: Record<string, string | number | string[]>): Crosswalk {
  const out: Crosswalk = {};
  for (const [k, v] of Object.entries(pairs)) {
    out[k] = { value: v, confidence: 0.9, src: 'test', final: true };
  }
  return out;
}

describe('seedRedFlags', () => {
  it('raises no flags on a clean, in-area, bonded-no project', () => {
    const flags = seedRedFlags({
      crosswalk: cw({
        scope_notes: 'Standard office fit-out, normal hours.',
        project_address: 'Kansas City, MO',
        gc_company_name: 'GCC direct-to-owner',
        bond_required: 'No'
      }),
      currentPhase: 4,
      tokenCategories: emptyTokenCategories,
      requiredByPhase: PHASE_REQUIRED_CATS
    });
    expect(flags).toHaveLength(0);
  });

  it('raises prevailing-wage + occupied + short-bid on a messy public-school job', () => {
    const flags = seedRedFlags({
      crosswalk: cw({
        scope_notes: 'After-hours work required. Prevailing wage applies. Occupied summer session.',
        project_address: 'St. Louis, MO',
        gc_company_name: 'McCarthy Building Companies',
        bid_due_date: new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10)
      }),
      currentPhase: 4,
      tokenCategories: emptyTokenCategories,
      requiredByPhase: PHASE_REQUIRED_CATS
    });
    const ids = flags.map((f) => f.id).sort();
    expect(ids).toContain('rf-occupied');
    expect(ids).toContain('rf-prev-wage');
    expect(ids).toContain('rf-short-bid');
    expect(ids).toContain('rf-gc-new');
  });

  it('flags healthcare scope as high-severity ICRA', () => {
    const flags = seedRedFlags({
      crosswalk: cw({ project_type: 'Outpatient clinic renovation' }),
      currentPhase: 0,
      tokenCategories: emptyTokenCategories,
      requiredByPhase: PHASE_REQUIRED_CATS
    });
    const icra = flags.find((f) => f.id === 'rf-icra');
    expect(icra).toBeDefined();
    expect(icra?.severity).toBe('high');
  });

  it('flags out-of-area work when address is outside KCMO/STL', () => {
    const flags = seedRedFlags({
      crosswalk: cw({ project_address: '123 Main St, Denver, CO' }),
      currentPhase: 0,
      tokenCategories: emptyTokenCategories,
      requiredByPhase: PHASE_REQUIRED_CATS
    });
    expect(flags.map((f) => f.id)).toContain('rf-travel');
  });

  it('buildRedFlagContext counts low-confidence entries', () => {
    const book: Crosswalk = {
      a: { value: 'x', confidence: 0.3, src: 's', final: false },
      b: { value: 'y', confidence: 0.5, src: 's', final: false },
      c: { value: 'z', confidence: 0.9, src: 's', final: true },
      d: { value: '',  confidence: 0.0, src: 's', final: false }
    };
    const { ctx } = buildRedFlagContext({
      crosswalk: book,
      currentPhase: 0,
      tokenCategories: emptyTokenCategories,
      requiredByPhase: PHASE_REQUIRED_CATS
    });
    // a + b are low-conf (>0, <0.6). d is zero-conf (excluded).
    expect(ctx.lowConfCount).toBe(2);
  });
});

describe('mergeRedFlags', () => {
  it('preserves user flags and refreshes auto flags', () => {
    const user: RedFlag = {
      id: 'u-1', severity: 'info', category: 'Other',
      text: 'Remember to ask about UPS sizing', source: 'user', resolved: false
    };
    const oldAuto: RedFlag[] = [
      { id: 'rf-occupied', severity: 'med', category: 'Schedule', text: '...', source: 'auto', resolved: true }
    ];
    const newAuto: RedFlag[] = [
      { id: 'rf-prev-wage', severity: 'high', category: 'Commercial', text: '...', source: 'auto', resolved: false }
    ];
    const merged = mergeRedFlags([user, ...oldAuto], newAuto);
    // User flag retained. Old auto flag dropped. New auto flag added.
    expect(merged.map((f) => f.id)).toEqual(['u-1', 'rf-prev-wage']);
  });
});
