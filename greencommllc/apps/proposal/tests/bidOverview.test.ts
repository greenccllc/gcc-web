/**
 * renderBidOverview — quantitative project bid summary in the PDF visual style.
 */

import { describe, it, expect } from 'vitest';
import { renderBidOverview, type BidOverviewInput } from '@/outputs/bidOverview';
import { GCC_BRAND } from '@brand/gcc';
import type { LogoMap } from '@models/brand';
import type { IntakeState, SessionState } from '@models/intake';
import type { CrosswalkEntry } from '@models/crosswalk';
import type { LineItem } from '@models/lineItem';

const fakeLogos: LogoMap = {
  emblem:     'data:image/png;base64,AAA=',
  stacked:    'data:image/png;base64,BBB=',
  letterhead: 'data:image/png;base64,CCC='
};

function row(value: string | number): CrosswalkEntry {
  return { value, confidence: 1.0, src: 'test', final: true };
}

function mkIntake(overrides: Record<string, CrosswalkEntry> = {}): IntakeState {
  return {
    files: [], runs: [], currentPhase: 4,
    phases: ['parse', 'dict', 'conf', 'synth'],
    stage: 'final',
    crosswalk: {
      project_name:            row('Demo Office Build'),
      gc_company_name:         row('McCarthy Building'),
      data_drops_count:        row(220),
      ap_count:                row(18),
      camera_count_commercial: row(24),
      door_positions_count:    row(12),
      fiber_strands_count:     row(48),
      mdf_count:               row(1),
      idf_count:               row(2),
      ...overrides
    },
    openItems: [], supplements: {},
    closeoutItems: {}, pricingTiers: null, decisionInputs: null,
    altDeducts: {}, customization: null, redFlags: [], generatedAt: {},
    closeoutSort: 'due'
  };
}

function mkSession(): SessionState {
  const lines: LineItem[] = [
    { src: 'eq', name: 'Cat6A Drop', category: 'Structured Cabling', unit: 'EA', qty: 220, costEach: 12, saleEach: 28,  laborHours: 0.75 },
    { src: 'eq', name: 'MR46 AP',    category: 'Wireless',           unit: 'EA', qty: 18,  costEach: 320, saleEach: 680, laborHours: 2.5 }
  ];
  return { lines, meta: {} };
}

function input(intake = mkIntake()): BidOverviewInput {
  return {
    intake,
    session: mkSession(),
    brand: GCC_BRAND,
    logos: fakeLogos,
    projectLabel: 'Demo Office Build'
  };
}

describe('renderBidOverview', () => {
  it('returns filename + html + positive sell/endpoints summary', () => {
    const out = renderBidOverview(input());
    expect(out.filename).toBe('02 Quantitative Bid Summary - Demo Office Build.pdf');
    expect(out.html).toContain('<!doctype html>');
    expect(out.summary.sell).toBeGreaterThan(0);
    expect(out.summary.totalEndpoints).toBe(220 + 18 + 24 + 12);
  });

  it('renders the centered title block + green rule', () => {
    const out = renderBidOverview(input());
    expect(out.html).toContain('GREEN COMMUNICATIONS CONTRACTING');
    expect(out.html).toContain('Quantitative Project Bid Summary');
    expect(out.html).toContain('class="qbs-title"');
    expect(out.html).toContain('class="qbs-rule"');
  });

  it('renders the project info bar with project + submitted-to', () => {
    const out = renderBidOverview(input());
    expect(out.html).toContain('class="qbs-info-bar"');
    expect(out.html).toContain('<strong>Project:</strong> Demo Office Build');
    expect(out.html).toContain('<strong>Submitted To:</strong> McCarthy Building');
    expect(out.html).toContain('<strong>Crew Size:</strong>');
    expect(out.html).toContain('<strong>Wage Standard:</strong>');
  });

  it('renders three KPI cards including the primary base-bid total', () => {
    const out = renderBidOverview(input());
    expect(out.html).toContain('class="qbs-kpi-row"');
    expect(out.html).toContain('Total Labor Hrs');
    expect(out.html).toContain('Est. Cabling LF');
    expect(out.html).toContain('Base Bid Total');
    expect(out.html).toContain('qbs-kpi-primary'); // base-bid card is primary
  });

  it('renders the financial summary table with three category rows + total', () => {
    const out = renderBidOverview(input());
    expect(out.html).toContain('Financial Summary');
    expect(out.html).toContain('class="qbs-table"');
    expect(out.html).toContain('TR Buildout');
    expect(out.html).toContain('Resident Infrastructure');
    expect(out.html).toContain('Common Area &amp; Misc');
    expect(out.html).toContain('class="qbs-total"');
  });

  it('renders the drop summary 2-col layout when endpoints are present', () => {
    const out = renderBidOverview(input());
    expect(out.html).toContain('Quantitative Drop Summary');
    expect(out.html).toContain('Resident Units:');
    expect(out.html).toContain('Common Area');
    expect(out.html).toContain('CCTV Cameras');
  });

  it('omits drop summary when no endpoints are entered', () => {
    const out = renderBidOverview(input(mkIntake({
      data_drops_count:        row(0),
      ap_count:                row(0),
      camera_count_commercial: row(0),
      door_positions_count:    row(0),
      fiber_strands_count:     row(0)
    })));
    expect(out.html).not.toContain('Quantitative Drop Summary');
  });

  it('shows alternates + deducts when crosswalk supplies them', () => {
    const out = renderBidOverview(input(mkIntake({
      alternate_1_label:  row('Network Device Configuration'),
      alternate_1_amount: row(3250),
      deduct_1_label:     row('Stacked Discount'),
      deduct_1_amount:    row(6245)
    })));
    expect(out.html).toContain('Add Alternates &amp; Deducts');
    expect(out.html).toContain('Add Alternate 1: Network Device Configuration');
    expect(out.html).toContain('ADD $3,250');
    expect(out.html).toContain('Voluntary Deduct 1: Stacked Discount');
    expect(out.html).toContain('DEDUCT $6,245');
    expect(out.html).toContain('class="num deduct"');
  });

  it('renders the italic GCC Proprietary footer line with project label', () => {
    const out = renderBidOverview(input());
    expect(out.html).toContain('class="qbs-foot"');
    expect(out.html).toContain('GCC Proprietary · Division 27 Subcontract Pricing Support · Demo Office Build');
  });
});
