/**
 * Labor-plan partitioning.
 *
 * Splits total labor hours into weekly chunks at the crew rate
 * (default 80 hrs/wk = 2 persons × 40 hrs). Pure function — no state,
 * no DOM — so it's easy to unit-test.
 */

import type { LineItem } from '@models/lineItem';

export interface WeeklyBucket {
  /** 1-based week number. */
  week: number;
  /** Hours booked in this week. */
  hours: number;
}

export interface LaborPlan {
  totalHours: number;
  crewHoursPerWeek: number;
  weeks: WeeklyBucket[];
  /** Upper bound on `weeks.length`. Labor plans longer than this get
   *  truncated; used to prevent runaway plans on corrupt inputs. */
  maxWeeks: number;
  truncated: boolean;
}

export interface LaborPlanOptions {
  /** Crew rate in hours per week. Default: 80 (2 people × 40 hrs). */
  crewHoursPerWeek?: number;
  /** Safety cap on weeks. Default: 26. */
  maxWeeks?: number;
}

export function totalLaborHours(lines: readonly LineItem[]): number {
  return lines.reduce((s, l) => s + l.qty * l.laborHours, 0);
}

export function buildLaborPlan(
  lines: readonly LineItem[],
  opts: LaborPlanOptions = {}
): LaborPlan {
  const crewHoursPerWeek = Math.max(1, opts.crewHoursPerWeek ?? 80);
  const maxWeeks = Math.max(1, opts.maxWeeks ?? 26);
  const totalHours = totalLaborHours(lines);

  const weeks: WeeklyBucket[] = [];
  let remaining = totalHours;
  let w = 1;
  while (remaining > 0 && w <= maxWeeks) {
    const hours = Math.min(crewHoursPerWeek, remaining);
    weeks.push({ week: w, hours });
    remaining -= hours;
    w++;
  }
  return {
    totalHours,
    crewHoursPerWeek,
    weeks,
    maxWeeks,
    truncated: remaining > 0
  };
}

export interface PerCableRow {
  name: string;
  category: string;
  qty: number;
  hoursEach: number;
  totalHours: number;
}

export function perCableDetail(lines: readonly LineItem[]): PerCableRow[] {
  return lines
    .filter(l => l.laborHours > 0)
    .map(l => ({
      name: l.name,
      category: l.category,
      qty: l.qty,
      hoursEach: l.laborHours,
      totalHours: l.qty * l.laborHours
    }));
}
