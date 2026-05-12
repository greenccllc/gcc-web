/**
 * Tests for the labor-plan partitioning.
 * Pure function - no state, no DOM.
 */

import { describe, it, expect } from 'vitest';
import { buildLaborPlan, totalLaborHours, perCableDetail } from '@/pricing/laborPlan';
import type { LineItem } from '@models/lineItem';

function mkLine(p: Partial<LineItem>): LineItem {
  return {
    src: 'eq', name: 'x', category: 'x', unit: 'EA',
    qty: 0, costEach: 0, saleEach: 0, laborHours: 0,
    ...p
  };
}

describe('totalLaborHours', () => {
  it('returns 0 for empty input', () => {
    expect(totalLaborHours([])).toBe(0);
  });

  it('sums qty * laborHours across all lines', () => {
    expect(totalLaborHours([
      mkLine({ qty: 10, laborHours: 1 }),
      mkLine({ qty: 5,  laborHours: 2 }),
      mkLine({ qty: 1,  laborHours: 40 })
    ])).toBe(60);  // 10 + 10 + 40
  });
});

describe('buildLaborPlan', () => {
  it('returns an empty weeks array when no labor hours', () => {
    const p = buildLaborPlan([]);
    expect(p.totalHours).toBe(0);
    expect(p.weeks).toHaveLength(0);
    expect(p.truncated).toBe(false);
  });

  it('partitions hours at the default 80hr/wk crew rate', () => {
    const lines = [mkLine({ qty: 10, laborHours: 20 })];  // 200 hrs
    const p = buildLaborPlan(lines);
    expect(p.totalHours).toBe(200);
    // 200 / 80 = 2.5, so 3 weeks: 80 + 80 + 40
    expect(p.weeks).toHaveLength(3);
    expect(p.weeks[0]).toEqual({ week: 1, hours: 80 });
    expect(p.weeks[1]).toEqual({ week: 2, hours: 80 });
    expect(p.weeks[2]).toEqual({ week: 3, hours: 40 });
    expect(p.truncated).toBe(false);
  });

  it('respects a custom crewHoursPerWeek', () => {
    const lines = [mkLine({ qty: 1, laborHours: 100 })];
    const p = buildLaborPlan(lines, { crewHoursPerWeek: 40 });
    expect(p.weeks).toHaveLength(3);  // 40 + 40 + 20
    expect(p.weeks[2]?.hours).toBe(20);
  });

  it('truncates to maxWeeks when labor exceeds cap', () => {
    const lines = [mkLine({ qty: 1, laborHours: 3000 })];  // would need 38 weeks
    const p = buildLaborPlan(lines, { maxWeeks: 4 });
    expect(p.weeks).toHaveLength(4);
    expect(p.truncated).toBe(true);
  });
});

describe('perCableDetail', () => {
  it('filters out zero-hour lines', () => {
    const lines = [
      mkLine({ name: 'drop', qty: 10, laborHours: 0.5 }),
      mkLine({ name: 'jack', qty: 10, laborHours: 0 }),
      mkLine({ name: 'patch cord', qty: 40, laborHours: 0 })
    ];
    const rows = perCableDetail(lines);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe('drop');
    expect(rows[0]?.totalHours).toBe(5);
  });
});
