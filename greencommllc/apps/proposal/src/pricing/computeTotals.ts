/**
 * Totals engine — rolls up line items into the canonical Totals object
 * that drives the quote preview, Bid Overview, and Finance Summary.
 *
 * Ported from `computeTotals()` in bundle-builder.html.
 * Pure function; no DOM, no globals.
 */

import type { LineItem, Totals } from '@models/lineItem';

export interface ComputeTotalsConfig {
  /** Sales tax rate applied to material-only subtotal. 0.0725 for KCMO. */
  taxRate: number;
  /** Overhead + profit markup as fraction (0.15 = 15%). */
  ohProfit: number;
  /** Contingency as fraction (0.05 = 5%). */
  contingency: number;
  /** True when a bond is required — adds 1.5% of pre-markup subtotal. */
  bondRequired: boolean;
  /** Bond rate fraction (0.015 = 1.5%). */
  bondRate: number;
  /** Per-drop floor guardrail. Lump-sum will be raised to floor × drops. */
  perDropFloor: number;
  /** Per-drop ceiling guardrail. Lump-sum will be capped at ceiling × drops. */
  perDropCeiling: number;
}

export const DEFAULT_TOTALS_CONFIG: ComputeTotalsConfig = {
  taxRate:        0.0725,
  ohProfit:       0.15,
  contingency:    0.05,
  bondRequired:   false,
  bondRate:       0.015,
  perDropFloor:   250,
  perDropCeiling: 500
};

/**
 * Roll up line items into cost/sale subtotals and the final turnkey
 * sell price (tax → O&H → contingency → bond → drop band).
 *
 * @param lines  – The line-item bundle.
 * @param drops  – Total billable endpoints (data + AP + cam + door). Used by the floor/ceiling band.
 * @param cfg    – Markup + tax configuration. Pass `DEFAULT_TOTALS_CONFIG` to match legacy defaults.
 */
export function computeTotals(
  lines: readonly LineItem[],
  drops: number,
  cfg: ComputeTotalsConfig = DEFAULT_TOTALS_CONFIG
): Totals {
  let costSubtotal = 0;
  let saleSubtotal = 0;
  let materialCost = 0;
  let hoursSubtotal = 0;

  for (const ln of lines) {
    const qty = ln.qty;
    const c = qty * ln.costEach;
    const s = qty * ln.saleEach;
    const h = qty * ln.laborHours;
    costSubtotal += c;
    saleSubtotal += s;
    hoursSubtotal += h;
    if (ln.src === 'eq' || ln.src === 'ma') materialCost += c;
  }

  // Tax is applied to materials-only cost basis. Labor services are not taxed.
  const tax         = materialCost * cfg.taxRate;
  const preMarkup   = saleSubtotal + tax;
  const ohProfAmt   = preMarkup * cfg.ohProfit;
  const contingency = preMarkup * cfg.contingency;
  const bond        = cfg.bondRequired ? (preMarkup * cfg.bondRate) : 0;

  let sell = preMarkup + ohProfAmt + contingency + bond;

  // Per-drop floor / ceiling guardrails. Only apply when there are drops.
  if (drops > 0) {
    const floor   = drops * cfg.perDropFloor;
    const ceiling = drops * cfg.perDropCeiling;
    if (sell < floor)   sell = floor;
    if (sell > ceiling) sell = ceiling;
  }

  return {
    costSubtotal,
    saleSubtotal,
    hoursSubtotal,
    subtotal: saleSubtotal,
    grand:    sell
  };
}

/** Convenience — just the grand total. Useful for base-sell lookups. */
export function sellPrice(
  lines: readonly LineItem[],
  drops: number,
  cfg: ComputeTotalsConfig = DEFAULT_TOTALS_CONFIG
): number {
  return computeTotals(lines, drops, cfg).grand;
}
