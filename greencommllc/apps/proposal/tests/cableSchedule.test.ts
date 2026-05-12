/**
 * renderCableSchedule — INTERNAL pull sheet tests.
 *
 * Two production paths:
 *   1. Line-item authoritative (session.lines drives rows)
 *   2. Fallback canonical rows (derived from crosswalk endpoint counts)
 */

import { describe, it, expect } from 'vitest';
import { renderCableSchedule, type CableScheduleInput } from '@/outputs/cableSchedule';
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
  return { value: String(value), confidence: 1.0, src: 'test', final: true };
}

function mkIntake(
  crosswalk: Record<string, CrosswalkEntry> = {}
): IntakeState {
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

function mkSession(lines: LineItem[] = []): SessionState {
  return { lines, meta: {} };
}

function input(
  crosswalk: Record<string, CrosswalkEntry> = {},
  lines: LineItem[] = []
): CableScheduleInput {
  return {
    intake: mkIntake(crosswalk),
    session: mkSession(lines),
    brand: GCC_BRAND,
    logos: fakeLogos,
    projectLabel: 'Demo Office Build'
  };
}

describe('renderCableSchedule', () => {
  it('returns INTERNAL-classification filename + landscape HTML', () => {
    const out = renderCableSchedule(input({ data_drops_count: row(10) }));
    expect(out.filename).toBe('INTERNAL - Cable Schedule - Demo Office Build.pdf');
    expect(out.html).toContain('<!doctype html>');
    expect(out.html).toContain('class="gcc-ribbon internal">INTERNAL');
    // Landscape @page rule is injected by shellHtml when landscape: true
    expect(out.html).toMatch(/@page[\s\S]*landscape/);
  });

  it('builds rows from session.lines when provided', () => {
    const lines: LineItem[] = [
      {
        src: 'eq', name: 'Workstation Drop', category: 'Data',
        unit: 'EA', qty: 6, costEach: 0, saleEach: 0, laborHours: 0
      },
      {
        src: 'eq', name: 'WAP Drop', category: 'Wireless',
        unit: 'EA', qty: 2, costEach: 0, saleEach: 0, laborHours: 0
      }
    ];
    const out = renderCableSchedule(input({}, lines));
    expect(out.rows.length).toBe(2);
    expect(out.rows[0]?.endpoint).toBe('Workstation Drop');
    expect(out.rows[1]?.endpoint).toBe('WAP Drop');
    expect(out.totalEndpoints).toBe(8);
    // No lf metadata on the LineItems → totalLF should be 0
    expect(out.totalLF).toBe(0);
  });

  it('applies Cat 6A defaults when line items lack metadata', () => {
    const lines: LineItem[] = [
      {
        src: 'eq', name: 'Camera Drop', category: 'Video Surveillance',
        unit: 'EA', qty: 4, costEach: 0, saleEach: 0, laborHours: 0
      }
    ];
    const out = renderCableSchedule(input({}, lines));
    expect(out.html).toContain('Cat 6A Plenum (CMP)');
    expect(out.html).toContain('RJ45 T568B · both ends');
    expect(out.html).toContain('Fluke DSX-8000 · LinkWare PDF');
  });

  it('falls back to canonical rows when session.lines is empty', () => {
    const out = renderCableSchedule(input({
      data_drops_count:         row(24),
      ap_count:                 row(4),
      camera_count_commercial:  row(8),
      door_positions_count:     row(2),
      fiber_strands_count:      row(12)
    }));
    // 5 fallback categories should be present
    expect(out.rows.length).toBe(5);
    const cats = out.rows.map(r => r.category);
    expect(cats).toContain('Data');
    expect(cats).toContain('Wireless');
    expect(cats).toContain('Video Surveillance');
    expect(cats).toContain('Access Control');
    expect(cats).toContain('Backbone');

    // LF estimates: 24*175 + 4*225 + 8*200 + 2*185 + 350 = 4200+900+1600+370+350 = 7420
    expect(out.totalLF).toBe(7420);
    // Endpoints: 24 + 4 + 8 + 2 + 1 (fiber row is qty=1) = 39
    expect(out.totalEndpoints).toBe(39);
  });

  it('only synthesizes categories with positive counts', () => {
    const out = renderCableSchedule(input({
      data_drops_count: row(10)
      // no AP, camera, door, or fiber counts
    }));
    expect(out.rows.length).toBe(1);
    expect(out.rows[0]?.category).toBe('Data');
    expect(out.totalEndpoints).toBe(10);
    expect(out.totalLF).toBe(1750);
  });

  it('renders the project summary callout with MDF/IDF values', () => {
    const out = renderCableSchedule(input({
      data_drops_count: row(5),
      mdf_count:        row('1'),
      idf_count:        row('3')
    }));
    expect(out.html).toContain('Project Summary');
    expect(out.html).toContain('MDF: <strong>1</strong>');
    expect(out.html).toContain('IDF: <strong>3</strong>');
  });

  it('renders MDF/IDF as TBD when counts are missing', () => {
    const out = renderCableSchedule(input({ data_drops_count: row(5) }));
    expect(out.html).toContain('MDF: <strong>TBD</strong>');
    expect(out.html).toContain('IDF: <strong>TBD</strong>');
  });

  it('includes the 11-column table header with qty + LF + cable spec + termination', () => {
    const out = renderCableSchedule(input({ data_drops_count: row(10) }));
    expect(out.html).toContain('<th>Category</th>');
    expect(out.html).toContain('<th>Endpoint Type</th>');
    expect(out.html).toContain('<th class="qty">Qty</th>');
    expect(out.html).toContain('LF (ea · total)');
    expect(out.html).toContain('<th>Cable Spec</th>');
    expect(out.html).toContain('<th>Jacket</th>');
    expect(out.html).toContain('<th>TR / Path</th>');
    expect(out.html).toContain('<th>Termination</th>');
    expect(out.html).toContain('<th>Certification</th>');
    expect(out.html).toContain('<th>Notes</th>');
  });

  it('emits a totals row with formatted footage', () => {
    const out = renderCableSchedule(input({
      data_drops_count: row(10),
      ap_count:         row(2)
    }));
    // 10*175 + 2*225 = 2200 LF
    expect(out.html).toContain('<tr class="total-row">');
    expect(out.html).toContain('TOTALS');
    expect(out.html).toContain('2,200 LF');
  });

  it('iterates brand.standards in the standards block', () => {
    const out = renderCableSchedule(input({ data_drops_count: row(5) }));
    for (const std of GCC_BRAND.standards) {
      // The standards string is HTML-escaped, so test on the first 20 chars
      const probe = std.slice(0, 20)
        .replace(/&/g, '&amp;')
        .replace(/'/g, '&#39;');
      expect(out.html).toContain(probe);
    }
  });

  it('includes the TIA-606-C labeling scheme block + field sign-off table', () => {
    const out = renderCableSchedule(input({ data_drops_count: row(5) }));
    expect(out.html).toContain('Labeling Scheme (TIA-606-C Class 3)');
    expect(out.html).toContain('IDF2-A12-03');
    expect(out.html).toContain('BLDG-IDF2-R01');
    expect(out.html).toContain('Field Sign-off');
    expect(out.html).toContain('Foreman (GCC)');
    expect(out.html).toContain('Project Manager (GCC)');
    expect(out.html).toContain('GC / Owner Rep');
  });
});
