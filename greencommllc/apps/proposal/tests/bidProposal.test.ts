/**
 * renderBidProposal — verify all 8 sections + numeric invariants.
 */

import { describe, it, expect } from 'vitest';
import { renderBidProposal, type BidProposalInput } from '@/outputs/bidProposal';
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

function mkIntake(): IntakeState {
  return {
    files: [], runs: [], currentPhase: 4,
    phases: ['parse', 'dict', 'conf', 'synth'],
    stage: 'final',
    crosswalk: {
      project_name:            row('Demo Office Build'),
      gc_company_name:         row('McCarthy Building'),
      gc_estimator_name:       row('Jane Estimator'),
      bid_due_date:            row('2026-05-15'),
      data_drops_count:        row(220),
      ap_count:                row(18),
      camera_count_commercial: row(24),
      door_positions_count:    row(12),
      fiber_strands_count:     row(48),
      mobilization_date:       row('2026-06-01'),
      substantial_completion:  row('2026-09-30')
    },
    openItems: [], supplements: {},
    closeoutItems: {}, pricingTiers: null, decisionInputs: null,
    altDeducts: {}, customization: null, redFlags: [], generatedAt: {},
    closeoutSort: 'due'
  };
}

function mkSession(): SessionState {
  const lines: LineItem[] = [
    { src: 'eq', name: 'Cat6A Drop', category: 'Structured Cabling', unit: 'EA', qty: 220, costEach: 12,  saleEach: 28,   laborHours: 0.75 },
    { src: 'eq', name: 'MR46 AP',    category: 'Wireless',           unit: 'EA', qty: 18,  costEach: 320, saleEach: 680,  laborHours: 2.5 },
    { src: 'eq', name: 'P3245',      category: 'Cameras',            unit: 'EA', qty: 24,  costEach: 260, saleEach: 540,  laborHours: 3 },
    { src: 'sv', name: 'Fluke Cert', category: 'Commissioning',      unit: 'LOT', qty: 1,  costEach: 0,   saleEach: 8500, laborHours: 40 }
  ];
  return { lines, meta: { propnum: 'GCC-BID-2026-007' } };
}

function input(): BidProposalInput {
  return {
    intake: mkIntake(),
    session: mkSession(),
    brand: GCC_BRAND,
    logos: fakeLogos,
    projectLabel: 'Demo Office Build'
  };
}

describe('renderBidProposal', () => {
  it('returns a CLIENT-classification PDF with the 03 · Bid Proposal kind', () => {
    const out = renderBidProposal(input());
    expect(out.filename).toBe('03 Bid Proposal - Demo Office Build.pdf');
    expect(out.html).toContain('<!doctype html>');
    expect(out.html).toContain('class="gcc-ribbon client">CLIENT');
    expect(out.html).toContain('03 · Bid Proposal');
  });

  it('renders all 8 section headers in order', () => {
    const out = renderBidProposal(input());
    const sectionPattern = /Section\s+([1-8])\s+&nbsp;/g;
    const matches = Array.from(out.html.matchAll(sectionPattern)).map(m => m[1]);
    expect(matches).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
  });

  it('the SOV total in §2 sums exactly to the §1 Base Bid', () => {
    const out = renderBidProposal(input());
    // Pull all "money"-class cells from §2 SOV table (split on body h2 form, not the
    // subline which also mentions "Section 2 ...").
    const sovBlock =
      out.html.split('Section 2 &nbsp;Schedule of Values')[1]
        ?.split('Section 3 &nbsp;')[0] ?? '';
    const moneyCells = Array.from(sovBlock.matchAll(/class="money">\s*(?:<strong>\s*)?\$?([\d,]+\.\d{2})/g))
      .map(m => Number(m[1]?.replace(/,/g, '')));
    // 11 row values + 1 total = 12 money cells.
    expect(moneyCells.length).toBeGreaterThanOrEqual(12);
    const items = moneyCells.slice(0, 11);
    const total = moneyCells[11];
    const sum = Math.round(items.reduce((a, b) => a + b, 0) * 100) / 100;
    expect(sum).toBeCloseTo(total!, 2);
    expect(total).toBeCloseTo(out.summary.baseBid, 2);
  });

  it('emits the canonical 10 unit prices (U1 through U10)', () => {
    const out = renderBidProposal(input());
    for (let i = 1; i <= 10; i++) {
      expect(out.html).toContain(`>U${i}<`);
    }
  });

  it('emits A1–A4 ADD alternates and D1–D2 DEDUCT placeholders', () => {
    const out = renderBidProposal(input());
    for (const id of ['A1', 'A2', 'A3', 'A4', 'D1', 'D2']) {
      expect(out.html).toContain(`>${id}<`);
    }
    expect(out.html).toContain('NO CHANGE — Cat 6A is GCC baseline');
  });

  it('lists all 11 standard exclusions A through K', () => {
    const out = renderBidProposal(input());
    const exclBlock =
      out.html.split('Section 7 &nbsp;Exclusions')[1]
        ?.split('Section 8 &nbsp;')[0] ?? '';
    for (const letter of 'ABCDEFGHIJK') {
      expect(exclBlock).toContain(`<td>${letter}</td>`);
    }
  });

  it('embeds the proposal number from session.meta.propnum', () => {
    const out = renderBidProposal(input());
    expect(out.html).toContain('GCC-BID-2026-007');
  });

  it('embeds milestone dates from crosswalk in §6.3 schedule', () => {
    const out = renderBidProposal(input());
    expect(out.html).toContain('2026-06-01');
    expect(out.html).toContain('2026-09-30');
  });

  it('§8 acceptance shows the Base Bid in dollars', () => {
    const out = renderBidProposal(input());
    expect(out.summary.baseBid).toBeGreaterThan(0);
    const accBlock = out.html.split('Section 8 &nbsp;Acceptance')[1] ?? '';
    expect(accBlock).toContain('Submitted by — Green Communications');
    expect(accBlock).toContain(GCC_BRAND.owner.full_name);
  });

  it('the 3-bucket breakdown sums to the Base Bid', () => {
    const out = renderBidProposal(input());
    const bucketSum = out.summary.materials + out.summary.labor + out.summary.services;
    expect(bucketSum).toBeCloseTo(out.summary.baseBid, 2);
  });

  it('inserts pg-break separators between sections 2–8 (each new section)', () => {
    const out = renderBidProposal(input());
    const breakCount = (out.html.match(/<div class="pg-break"><\/div>/g) ?? []).length;
    // §2–§8 = 7 page breaks
    expect(breakCount).toBe(7);
  });
});
