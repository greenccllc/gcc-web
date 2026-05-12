/**
 * renderDropCounts — INTERNAL markdown drop-counts breakdown.
 *
 * Covers: filename shape, executive summary table, category dot-classification,
 * percentage math, totals, and per-section detail tables.
 */

import { describe, it, expect } from 'vitest';
import { renderDropCounts, type DropCountsInput } from '@/outputs/dropCounts';
import { GCC_BRAND } from '@brand/gcc';
import type { LogoMap } from '@models/brand';
import type { IntakeState, SessionState } from '@models/intake';
import type { CrosswalkEntry } from '@models/crosswalk';

const fakeLogos: LogoMap = {
  emblem:     'data:image/png;base64,AAA=',
  stacked:    'data:image/png;base64,BBB=',
  letterhead: 'data:image/png;base64,CCC='
};

function row(value: string | number): CrosswalkEntry {
  return { value: String(value), confidence: 1.0, src: 'test', final: true };
}

function mkIntake(crosswalk: Record<string, CrosswalkEntry> = {}): IntakeState {
  return {
    files: [], runs: [], currentPhase: 4,
    phases: ['parse', 'dict', 'conf', 'synth'],
    stage: 'final',
    crosswalk: {
      project_name: row('Demo Office Build'),
      ...crosswalk
    },
    openItems: [], supplements: {},
    closeoutItems: {}, pricingTiers: null, decisionInputs: null,
    altDeducts: {}, customization: null, redFlags: [], generatedAt: {},
    closeoutSort: 'due'
  };
}

const session: SessionState = { lines: [], meta: {} };

function input(crosswalk: Record<string, CrosswalkEntry> = {}): DropCountsInput {
  return {
    intake: mkIntake(crosswalk),
    session,
    brand: GCC_BRAND,
    logos: fakeLogos,
    projectLabel: 'Demo Office Build'
  };
}

describe('renderDropCounts', () => {
  it('returns INTERNAL .md filename and markdown header', () => {
    const out = renderDropCounts(input({ ap_count: row(4) }));
    expect(out.filename).toBe('INTERNAL - Drop Counts - Demo Office Build.md');
    expect(out.markdown).toMatch(/^# 📡 GCC Discrete Drop Counts — Demo Office Build/);
  });

  it('emits the executive summary table with site, date, and total endpoints', () => {
    const out = renderDropCounts(input({
      site_name:        row('GCC HQ Build'),
      site_address:     row('603 Seib Dr, O\'Fallon MO 63366'),
      ap_count:         row(4),
      cat6a_drops:      row(20)
    }));
    expect(out.markdown).toContain('## 🎯 Executive Summary');
    expect(out.markdown).toContain('| **Site** | GCC HQ Build |');
    expect(out.markdown).toContain('603 Seib Dr');
    expect(out.markdown).toContain('| **Prepared by** | GCC LLC |');
    expect(out.markdown).toMatch(/\| \*\*Date\*\* \| \d{4}-\d{2}-\d{2} \|/);
    // 20 cat6a drops + 4 APs = 24 endpoints in cat A
    expect(out.markdown).toContain('| **Total endpoints** | **24**');
  });

  it('classifies the dominant category with the green dot', () => {
    const out = renderDropCounts(input({
      cat6a_drops:    row(50),  // category A
      coax_endpoints: row(2)    // category B
    }));
    // A is 50/52 = 96% of endpoints → 🟢
    expect(out.markdown).toContain('| 🟢 | A. Data Endpoints (Cat6A) | 50 | 96% |');
    // B is 2/52 = 4% → 🟠 (under 20%)
    expect(out.markdown).toContain('| 🟠 | B. Coax Endpoints (RG6) | 2 | 4% |');
  });

  it('reports the primary trade in the exec summary line', () => {
    const out = renderDropCounts(input({
      cat6a_drops:    row(80),
      coax_endpoints: row(20)
    }));
    expect(out.primaryTrade).toMatch(/^Data \(Cat6A\) dominates/);
    expect(out.markdown).toContain('Data (Cat6A) dominates');
  });

  it('returns empty primary trade when zero endpoints', () => {
    const out = renderDropCounts(input({}));
    expect(out.primaryTrade).toBe('No endpoints captured yet');
    expect(out.totalEndpoints).toBe(0);
  });

  it('correctly sums category A from cat6_drops + cat6a_drops + ap_count + cameras + intercoms + elevator + ACS', () => {
    const out = renderDropCounts(input({
      cat6_drops:               row(5),
      cat6a_drops:              row(10),
      ap_count:                 row(3),
      cameras_interior:         row(4),
      cameras_exterior:         row(2),
      door_positions_count:     row(6),
      intercom_count:           row(1),
      elevator_phone_count:     row(2)
    }));
    // 5+10+3+4+2+6+1+2 = 33
    expect(out.markdown).toContain('| **A SUBTOTAL** | **33** |');
  });

  it('shows the all-IP no-coax message when category B is empty', () => {
    const out = renderDropCounts(input({ cat6a_drops: row(20) }));
    expect(out.markdown).toContain('*All-IP system. No RG6 coax scope.*');
  });

  it('prints fiber backbone details from fiber_runs and total_backbone_lf', () => {
    const out = renderDropCounts(input({
      fiber_runs:           row(3),
      total_backbone_lf:    row(450),
      fiber_strands_count:  row(12),
      fiber_type:           row('OM4 12-strand armored')
    }));
    expect(out.markdown).toContain('## 🟢 E. FIBER SCOPE — 3 backbone runs');
    expect(out.markdown).toContain('OM4 12-strand armored');
    expect(out.markdown).toContain('| **E SUBTOTAL** | **3** | | **450** |');
    // backbone total LF is also reflected in exec summary
    expect(out.markdown).toContain('3 runs · 450 LF');
  });

  it('sums TR buildout (rack_count + ups_units) and renders MDF/IDF totals', () => {
    const out = renderDropCounts(input({
      rack_count:    row(3),
      ups_units:     row(2),
      mdf_count:     row(1),
      idf_count:     row(2),
      ladder_rack_lf: row(120)
    }));
    expect(out.markdown).toContain('| **F SUBTOTAL** | | **5** | |');
    expect(out.markdown).toContain('1 MDF + 2 IDFs = 3 total');
    expect(out.markdown).toContain('| Ladder rack / cable runway | — | 120 LF |');
  });

  it('always emits the 5 risk-flag bullets even when crosswalk is empty', () => {
    const out = renderDropCounts(input({}));
    expect(out.markdown).toContain('## RISK FLAGS');
    expect(out.markdown).toContain('**Bond required:**');
    expect(out.markdown).toContain('**Prevailing Wage:**');
    expect(out.markdown).toContain('**After-hours work:**');
    expect(out.markdown).toContain('**Occupied site:**');
    expect(out.markdown).toContain('**Phasing required:**');
  });

  it('lists source filenames in the exec summary', () => {
    const intake = mkIntake({ ap_count: row(2) });
    intake.files = [
      { id: '1', name: 'A001 - Plans.pdf', path: '/x', size: 1, type: 'pdf', class: 'plan', status: 'parsed' },
      { id: '2', name: 'Spec 271500.pdf', path: '/y', size: 1, type: 'pdf', class: 'spec', status: 'parsed' }
    ];
    const out = renderDropCounts({
      intake, session, brand: GCC_BRAND, logos: fakeLogos, projectLabel: 'Demo'
    });
    expect(out.markdown).toContain('A001 - Plans.pdf');
    expect(out.markdown).toContain('Spec 271500.pdf');
  });

  it('accumulates totalLF from horizontal + backbone', () => {
    const out = renderDropCounts(input({
      total_horizontal_lf: row(8000),
      total_backbone_lf:   row(500)
    }));
    expect(out.totalLF).toBe(8500);
    expect(out.markdown).toContain('| **Total horizontal LF** | 8,500 |');
  });
});
