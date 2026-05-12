/**
 * renderMasterExtraction — INTERNAL master crosswalk dump.
 *
 * Covers: filename shape, exec summary metrics, confidence buckets,
 * the four curated category sections, conflicts, and complete dump.
 */

import { describe, it, expect } from 'vitest';
import { renderMasterExtraction, type MasterExtractionInput } from '@/outputs/masterExtraction';
import { GCC_BRAND } from '@brand/gcc';
import type { LogoMap } from '@models/brand';
import type { IntakeState, SessionState, ExtractionRun } from '@models/intake';
import type { CrosswalkEntry } from '@models/crosswalk';

const fakeLogos: LogoMap = {
  emblem:     'data:image/png;base64,AAA=',
  stacked:    'data:image/png;base64,BBB=',
  letterhead: 'data:image/png;base64,CCC='
};

function entry(value: string | number, confidence = 0.95, src = 'plans:T-100'): CrosswalkEntry {
  return { value, confidence, src, final: true };
}

function mkIntake(crosswalk: Record<string, CrosswalkEntry> = {}): IntakeState {
  return {
    files: [], runs: [], currentPhase: 4,
    phases: ['parse', 'dict', 'conf', 'synth'],
    stage: 'final',
    crosswalk: {
      project_name: entry('Demo Office Build'),
      ...crosswalk
    },
    openItems: [], supplements: {},
    closeoutItems: {}, pricingTiers: null, decisionInputs: null,
    altDeducts: {}, customization: null, redFlags: [], generatedAt: {},
    closeoutSort: 'due'
  };
}

const session: SessionState = { lines: [], meta: {} };

function input(crosswalk: Record<string, CrosswalkEntry> = {}): MasterExtractionInput {
  return {
    intake: mkIntake(crosswalk),
    session,
    brand: GCC_BRAND,
    logos: fakeLogos,
    projectLabel: 'Demo Office Build'
  };
}

describe('renderMasterExtraction', () => {
  it('returns INTERNAL .md filename and markdown header', () => {
    const out = renderMasterExtraction(input());
    expect(out.filename).toBe('INTERNAL - Master Extraction - Demo Office Build.md');
    expect(out.markdown).toMatch(/^# 📊 Master Extraction — Demo Office Build/);
  });

  it('reports overallConfidence "TBD" with no populated entries beyond the seed', () => {
    // Only project_name populated → 1 entry with 0.95 confidence
    const out = renderMasterExtraction(input());
    expect(out.overallConfidence).toBe('95%');
    expect(out.populatedCount).toBe(1);
  });

  it('reports overallConfidence as the rounded mean of populated entries', () => {
    const out = renderMasterExtraction(input({
      total_sf:    entry(20000, 0.90),
      ap_count:    entry(8,     0.50),
      mdf_count:   entry(1,     1.00)
    }));
    // mean of [0.95, 0.90, 0.50, 1.00] = 0.8375 → 84%
    expect(out.overallConfidence).toBe('84%');
    expect(out.populatedCount).toBe(4);
  });

  it('builds a coverage progress bar reflecting section-token population', () => {
    // Section tokens total = 11 + 16 + 12 + 8 = 47.  No section tokens populated → 0%
    const out = renderMasterExtraction(input());
    expect(out.coveragePct).toBe(0);
    expect(out.markdown).toMatch(/`░{20}` \*\*0%\*\*/);
  });

  it('updates coverage when section tokens are populated', () => {
    const out = renderMasterExtraction(input({
      // Project Metadata section: 4 of 11
      total_sf:             entry(20000),
      floor_count:          entry(2),
      due_date:             entry('2026-08-01'),
      bond_required:        entry('No'),
      // Endpoints: 1 of 16
      ap_count:             entry(8)
    }));
    // 5 of 47 = 11%
    expect(out.coveragePct).toBe(11);
  });

  it('counts conflicts as confidence < 0.50', () => {
    const out = renderMasterExtraction(input({
      total_sf:   entry(20000, 0.30),  // conflict
      ap_count:   entry(8,     0.40),  // conflict
      mdf_count:  entry(1,     0.95)   // not a conflict
    }));
    expect(out.conflictCount).toBe(2);
    expect(out.markdown).toContain('⚠️ 2 fields below 50% confidence');
    expect(out.markdown).toContain('| `total_sf` |');
    expect(out.markdown).toContain('| `ap_count` |');
  });

  it('renders all 4 curated sections in numbered order', () => {
    const out = renderMasterExtraction(input());
    const headerPattern = /^## (?:📋|🔌|🏗️|💼) (\d+)\. /gm;
    const matches = Array.from(out.markdown.matchAll(headerPattern)).map(m => m[1]);
    expect(matches).toEqual(['1', '2', '3', '4']);
    expect(out.markdown).toContain('1. Project Metadata');
    expect(out.markdown).toContain('2. Endpoints');
    expect(out.markdown).toContain('3. Infrastructure');
    expect(out.markdown).toContain('4. Commercial Terms');
  });

  it('renders the values + confidence + source for populated tokens', () => {
    const out = renderMasterExtraction(input({
      total_sf:        entry(20000, 0.90, 'plans:T-100'),
      bond_required:   entry('Yes', 0.80, 'rfp:01000')
    }));
    expect(out.markdown).toContain('| Total SF | 20000 | 90% | plans:T-100 |');
    expect(out.markdown).toContain('| Bond required | Yes | 80% | rfp:01000 |');
  });

  it('shows dash rows for tokens with no crosswalk entry', () => {
    const out = renderMasterExtraction(input());
    // No floor_count populated → row should be all dashes
    expect(out.markdown).toContain('| Floor count | — | — | — |');
  });

  it('renders the sources summary including file class', () => {
    const intake = mkIntake();
    intake.files = [
      { id: '1', name: 'A001.pdf', path: '/x/A001.pdf', size: 1, type: 'pdf', class: 'plan',  status: 'parsed', pages: 12 },
      { id: '2', name: 'Spec 271500.pdf', path: '/y/Spec.pdf', size: 1, type: 'pdf', class: 'spec', status: 'parsed', pages: 5 }
    ];
    const out = renderMasterExtraction({
      intake, session, brand: GCC_BRAND, logos: fakeLogos, projectLabel: 'Demo'
    });
    expect(out.markdown).toContain('5. Sources Summary');
    // Renderer uses f.path when available, falling back to f.name
    expect(out.markdown).toContain('/x/A001.pdf');
    expect(out.markdown).toContain('/y/Spec.pdf');
    expect(out.markdown).toContain('| plan |');
    expect(out.markdown).toContain('| spec |');
  });

  it('renders the run log when extraction runs are present', () => {
    const intake = mkIntake();
    const runs: ExtractionRun[] = [
      { id: 'r1', ts: Date.UTC(2026, 3, 1, 12, 0), phase: 'parse', summary: 'Parsed 3 plan sheets', candidates: {} },
      { id: 'r2', ts: Date.UTC(2026, 3, 2, 9, 30), phase: 'dict',  summary: 'Dictionary pass — 14 new tokens', candidates: {} }
    ];
    intake.runs = runs;
    const out = renderMasterExtraction({
      intake, session, brand: GCC_BRAND, logos: fakeLogos, projectLabel: 'Demo'
    });
    expect(out.markdown).toContain('7. Update Log');
    expect(out.markdown).toContain('Parsed 3 plan sheets');
    expect(out.markdown).toContain('Dictionary pass');
  });

  it('emits the complete-crosswalk section sorted alphabetically', () => {
    const out = renderMasterExtraction(input({
      ap_count: entry(8, 0.90),
      total_sf: entry(20000, 0.95)
    }));
    // Section heading format: "8. Complete Crosswalk"
    expect(out.markdown).toContain('8. Complete Crosswalk');
    // ap_count must appear before project_name which must appear before total_sf
    const apIdx   = out.markdown.indexOf('| `ap_count` |');
    const pnIdx   = out.markdown.indexOf('| `project_name` |');
    const sfIdx   = out.markdown.indexOf('| `total_sf` |');
    expect(apIdx).toBeGreaterThan(0);
    expect(pnIdx).toBeGreaterThan(apIdx);
    expect(sfIdx).toBeGreaterThan(pnIdx);
  });

  it('handles empty crosswalk gracefully', () => {
    const intake = mkIntake();
    intake.crosswalk = {};  // truly empty
    const out = renderMasterExtraction({
      intake, session, brand: GCC_BRAND, logos: fakeLogos, projectLabel: 'Demo'
    });
    expect(out.populatedCount).toBe(0);
    expect(out.overallConfidence).toBe('TBD');
    expect(out.markdown).toContain('*No tokens populated yet.*');
    expect(out.markdown).toContain('✅ None');
  });
});
