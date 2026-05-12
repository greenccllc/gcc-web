/**
 * Tests for deriveJobSummary() - drives the sticky top header.
 * Every field falls back to "" when the source is missing so the header
 * can show em-dash placeholders without special-casing.
 */

import { describe, it, expect } from 'vitest';
import { deriveJobSummary } from '@/pricing/jobSummary';
import type { Crosswalk } from '@models/crosswalk';
import type { LineItem } from '@models/lineItem';

function cw(pairs: Record<string, string | number>): Crosswalk {
  const out: Crosswalk = {};
  for (const [k, v] of Object.entries(pairs)) {
    out[k] = { value: v, confidence: 0.9, src: 'test', final: true };
  }
  return out;
}

const noLines: LineItem[] = [];

describe('deriveJobSummary', () => {
  it('returns all-blank fields on empty intake', () => {
    const s = deriveJobSummary({ crosswalk: {}, lines: noLines, drops: 0 });
    expect(s.customer).toBe('');
    expect(s.project).toBe('');
    expect(s.propnum).toBe('');
    expect(s.dateIso).toBe('');
    expect(s.endpoints).toBe('');
    expect(s.bidValue).toBe('');
    expect(s.daysToBid).toBeNull();
    expect(s.mode).toBe('unknown');
  });

  it('prefers GC company over client/homeowner for customer', () => {
    const s = deriveJobSummary({
      crosswalk: cw({ gc_company_name: 'McCarthy', client_company_name: 'Owner Co' }),
      lines: noLines, drops: 0
    });
    expect(s.customer).toBe('McCarthy');
    expect(s.mode).toBe('bid');
  });

  it('infers owner mode from client_company_name when no GC', () => {
    const s = deriveJobSummary({
      crosswalk: cw({ client_company_name: 'Example Inc.' }),
      lines: noLines, drops: 0
    });
    expect(s.customer).toBe('Example Inc.');
    expect(s.mode).toBe('owner');
  });

  it('infers residential mode from homeowner_name', () => {
    const s = deriveJobSummary({
      crosswalk: cw({ homeowner_name: 'Smith Residence' }),
      lines: noLines, drops: 0
    });
    expect(s.mode).toBe('residential');
  });

  it('normalizes free-form dates to ISO', () => {
    const s = deriveJobSummary({
      crosswalk: cw({ bid_due_date: 'March 15 2027' }),
      lines: noLines, drops: 0
    });
    expect(s.dateIso).toBe('2027-03-15');
  });

  it('passes through ISO dates unchanged + computes daysToBid', () => {
    // +3 days from now — daysToBid ends up 2 or 3 depending on midnight-UTC
    // rollover relative to wall-time, so assert a small window.
    const future = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
    const s = deriveJobSummary({
      crosswalk: cw({ bid_due_date: future }),
      lines: noLines, drops: 0
    });
    expect(s.dateIso).toBe(future);
    expect(s.daysToBid).not.toBeNull();
    expect(s.daysToBid!).toBeGreaterThanOrEqual(2);
    expect(s.daysToBid!).toBeLessThanOrEqual(3);
  });

  it('formats endpoints as "N + M fiber" when fiber > 0', () => {
    const s = deriveJobSummary({
      crosswalk: cw({
        data_drops_count: 220,
        ap_count: 18,
        camera_count_commercial: 24,
        door_positions_count: 12,
        fiber_strands_count: 48
      }),
      lines: noLines, drops: 274
    });
    expect(s.endpoints).toBe('274 + 48 fiber');
  });

  it('omits fiber suffix when zero strands', () => {
    const s = deriveJobSummary({
      crosswalk: cw({
        data_drops_count: 100,
        ap_count: 10
      }),
      lines: noLines, drops: 110
    });
    expect(s.endpoints).toBe('110');
  });

  it('computes bidValue from line items via computeTotals', () => {
    const lines: LineItem[] = [
      { src: 'eq', qty: 100, costEach: 20, saleEach: 50, laborHours: 0.5,
        category: 'Cabling', name: 'drop', unit: 'EA' }
    ];
    const s = deriveJobSummary({ crosswalk: {}, lines, drops: 100 });
    // Sell should be floored at $250 × 100 = $25,000 (per-drop floor)
    expect(s.bidValue).toBe('$25,000');
  });

  it('falls back to "" for bidValue when no line items', () => {
    const s = deriveJobSummary({ crosswalk: {}, lines: noLines, drops: 0 });
    expect(s.bidValue).toBe('');
  });
});
