/**
 * End-to-end test for the Finance Summary output generator.
 *
 * Builds a realistic intake fixture, runs renderFinanceSummary, and
 * asserts the resulting HTML contains every section expected by the
 * legacy Finance Summary output.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderFinanceSummary, type FinanceSummaryInput } from '@/outputs/financeSummary';
import { GCC_BRAND } from '@brand/gcc';
import type { LogoMap } from '@models/brand';
import type { IntakeState, SessionState } from '@models/intake';
import type { LineItem } from '@models/lineItem';

const fakeLogos: LogoMap = {
  emblem:     'data:image/png;base64,AAA=',
  stacked:    'data:image/png;base64,BBB=',
  letterhead: 'data:image/png;base64,CCC='
};

function mkIntake(overrides: Partial<IntakeState> = {}): IntakeState {
  return {
    files: [],
    runs: [],
    currentPhase: 4,
    phases: ['parse', 'dict', 'conf', 'synth'],
    stage: 'final',
    crosswalk: {
      project_name:    { value: 'Parkway North HS',       confidence: 0.9, src: 'test', final: true },
      project_type:    { value: 'K-12 public school',     confidence: 0.9, src: 'test', final: true },
      project_address: { value: '12046 Barrett, MO',       confidence: 0.9, src: 'test', final: true },
      gc_company_name: { value: 'McCarthy Building',       confidence: 0.9, src: 'test', final: true },
      scope_notes:     { value: 'After-hours + prevailing wage', confidence: 0.9, src: 'test', final: true },
      bond_required:   { value: 'Yes',                    confidence: 1.0, src: 'test', final: true }
    },
    openItems: [],
    supplements: {},
    closeoutItems: { 'as-builts': true, 'fluke-certs': false },
    pricingTiers: null,
    decisionInputs: null,
    altDeducts: {},
    customization: null,
    redFlags: [],
    generatedAt: {},
    closeoutSort: 'due',
    ...overrides
  };
}

function mkSession(): SessionState {
  const lines: LineItem[] = [
    { src: 'eq', name: 'Cat6A Drop',  category: 'Structured Cabling', unit: 'EA',  qty: 220, costEach: 12,  saleEach: 28,   laborHours: 0.75 },
    { src: 'eq', name: 'MR46 AP',     category: 'Wireless Access',    unit: 'EA',  qty: 18,  costEach: 320, saleEach: 680,  laborHours: 2.5  },
    { src: 'eq', name: 'P3245-LVE',   category: 'Video Surveillance', unit: 'EA',  qty: 24,  costEach: 260, saleEach: 540,  laborHours: 3    },
    { src: 'eq', name: 'Door Kit',    category: 'Access Control',     unit: 'EA',  qty: 12,  costEach: 450, saleEach: 950,  laborHours: 6    },
    { src: 'sv', name: 'Fluke Cert',  category: 'Commissioning',      unit: 'LOT', qty: 1,   costEach: 0,   saleEach: 8500, laborHours: 40   }
  ];
  return { lines, meta: {} };
}

describe('renderFinanceSummary', () => {
  let input: FinanceSummaryInput;

  beforeEach(() => {
    input = {
      intake: mkIntake(),
      session: mkSession(),
      brand: GCC_BRAND,
      logos: fakeLogos,
      drops: 274,             // 220 + 18 + 24 + 12
      projectLabel: 'Parkway North HS'
    };
  });

  it('returns a filename + html + summary', () => {
    const out = renderFinanceSummary(input);
    expect(out.filename).toMatch(/INTERNAL - Finance Summary - Parkway North HS\.xlsx/);
    expect(out.html).toContain('<!doctype html>');
    expect(out.summary.cost).toBeGreaterThan(0);
    expect(out.summary.sell).toBeGreaterThan(0);
  });

  it('includes the hero + all 4 stage-4 sections', () => {
    const { html } = renderFinanceSummary(input);
    expect(html).toContain('class="doc-hero"');
    expect(html).toContain('Price Build-Up Waterfall');
    expect(html).toContain('Margin Health');
    expect(html).toContain('Labor Hours by Category');
    expect(html).toContain('Pricing Strategy (Stage 4 Configurator)');
    expect(html).toContain('Decision Inputs (Stage 4 Configurator)');
    expect(html).toContain('Risk to GCC');
    expect(html).toContain('Closeout Items');
  });

  it('highlights the chosen pricing tier with a ribbon', () => {
    const { html } = renderFinanceSummary(input);
    expect(html).toContain('class="pt-out-card pt-out-reco"');
    expect(html).toContain('★ Chosen');
  });

  it('renders red flags detected from crosswalk (after-hours + prevailing wage + bond + new GC)', () => {
    const { html, summary } = renderFinanceSummary(input);
    // At least 2 high-severity flags from prev-wage, and the GC-new flag
    expect(summary.flagCount.high).toBeGreaterThanOrEqual(1);
    expect(html).toContain('Prevailing wage');
    expect(html).toContain('GC / Prime contractor');
  });

  it('closeout table reflects user-set state (as-builts ✓, fluke-certs -)', () => {
    const { html } = renderFinanceSummary(input);
    // fluke-certs was set to false → dash
    expect(html).toMatch(/<td>—<\/td>\s*<td>Fluke Test Certifications<\/td>/);
    // as-builts was set to true → check
    expect(html).toMatch(/<td>✓<\/td>\s*<td>As-Built Drawings<\/td>/);
  });

  it('computes a blended margin consistent with cost vs sell', () => {
    const { summary } = renderFinanceSummary(input);
    const expected = ((summary.sell - summary.cost) / summary.sell) * 100;
    expect(summary.marginPct).toBeCloseTo(expected, 4);
  });

  it('marks INTERNAL classification in the ribbon', () => {
    const { html } = renderFinanceSummary(input);
    expect(html).toContain('class="gcc-ribbon internal"');
    expect(html).toContain('DO NOT DISTRIBUTE');
  });
});
