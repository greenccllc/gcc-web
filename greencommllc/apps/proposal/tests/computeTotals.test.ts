/**
 * Pricing math regression tests.
 * Pins legacy `computeTotals` behavior: tax on materials, markup cascade,
 * per-drop floor/ceiling band.
 */

import { describe, it, expect } from 'vitest';
import {
  computeTotals,
  sellPrice,
  DEFAULT_TOTALS_CONFIG
} from '@/pricing/computeTotals';
import type { LineItem } from '@models/lineItem';

function mkLine(partial: Partial<LineItem>): LineItem {
  return {
    src: 'eq', name: 'x', category: 'x', unit: 'EA',
    qty: 0, costEach: 0, saleEach: 0, laborHours: 0,
    ...partial
  };
}

describe('computeTotals', () => {
  it('rolls up empty line-item list to zero', () => {
    const t = computeTotals([], 0);
    expect(t).toEqual({
      costSubtotal: 0, saleSubtotal: 0, hoursSubtotal: 0,
      subtotal: 0, grand: 0
    });
  });

  it('applies tax ONLY to materials (not services)', () => {
    // Two lines: one 'eq' material and one 'sv' service with same cost.
    // With drops=0 the floor/ceiling don't trigger.
    const lines: LineItem[] = [
      mkLine({ src: 'eq', qty: 1, costEach: 1000, saleEach: 1000 }),
      mkLine({ src: 'sv', qty: 1, costEach: 1000, saleEach: 1000 })
    ];
    const t = computeTotals(lines, 0);
    // Materials cost basis = 1000; tax = 72.50
    // preMarkup = 2000 sale + 72.50 tax = 2072.50
    // O&H 15% = 310.875
    // Contingency 5% = 103.625
    // Grand = 2072.50 + 310.875 + 103.625 = 2487
    expect(t.saleSubtotal).toBe(2000);
    expect(t.costSubtotal).toBe(2000);
    expect(t.grand).toBeCloseTo(2487, 2);
  });

  it('raises price to per-drop floor when formula falls below the band', () => {
    // Very cheap line item, drops=1 should trigger the $250 floor.
    const lines: LineItem[] = [mkLine({ src: 'eq', qty: 1, costEach: 10, saleEach: 20 })];
    const t = computeTotals(lines, 1);
    expect(t.grand).toBe(250);   // 1 drop × $250 floor
  });

  it('caps price at per-drop ceiling when formula overruns the band', () => {
    // Big single drop that overshoots $500 ceiling per drop.
    const lines: LineItem[] = [mkLine({ src: 'eq', qty: 1, costEach: 1000, saleEach: 5000 })];
    const t = computeTotals(lines, 1);
    expect(t.grand).toBe(500);   // 1 drop × $500 ceiling
  });

  it('honors a custom bond rate when bondRequired is true', () => {
    const lines: LineItem[] = [mkLine({ src: 'eq', qty: 1, costEach: 1000, saleEach: 1000 })];
    const withoutBond = computeTotals(lines, 0);
    const withBond    = computeTotals(lines, 0, { ...DEFAULT_TOTALS_CONFIG, bondRequired: true });
    // Bond adds 1.5% of preMarkup. preMarkup = 1000 + 72.50 = 1072.50
    // Bond = 16.0875
    // Delta = bond × (1 + 0 O&H applied on top? Actually bond is flat-added after OH.)
    // Legacy: sell = preMarkup + ohProfit + contingency + bond
    // So delta = 16.0875
    expect(withBond.grand - withoutBond.grand).toBeCloseTo(16.0875, 3);
  });

  it('sellPrice is shorthand for computeTotals(...).grand', () => {
    const lines: LineItem[] = [mkLine({ src: 'eq', qty: 10, costEach: 12, saleEach: 28 })];
    const p = sellPrice(lines, 10);
    const t = computeTotals(lines, 10);
    expect(p).toBe(t.grand);
  });

  it('hours subtotal sums across all bucket types', () => {
    const lines: LineItem[] = [
      mkLine({ src: 'eq', qty: 10, laborHours: 0.5 }),  // 5 hrs
      mkLine({ src: 'ma', qty: 5,  laborHours: 0.2 }),  // 1 hr
      mkLine({ src: 'sv', qty: 1,  laborHours: 40  })   // 40 hrs
    ];
    const t = computeTotals(lines, 0);
    expect(t.hoursSubtotal).toBeCloseTo(46, 2);
  });
});
