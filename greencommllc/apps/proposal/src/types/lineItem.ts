/**
 * Line items in the quote — the working set shown in center pane of Stage 2
 * and in the Bid Proposal §1 Base Bid. Grouped by `src` (eq / ma / sv)
 * in the quote preview.
 */

/**
 * Line-item source bucket:
 *   eq = Equipment (endpoints, racks, APs)
 *   ma = Materials (cable, connectors, labels, consumables)
 *   sv = Services (commissioning, certification, close-out)
 */
export type LineSource = 'eq' | 'ma' | 'sv';

export interface LineItem {
  /** Auto-assigned unique id per session. */
  id?: string;
  /** Source bucket — feeds the §1 Base Bid 3-bucket split. */
  src: LineSource;
  /** Catalog name / SKU. */
  name: string;
  /** Freeform category used for roll-up tables and donut charts. */
  category: string;
  /** Unit of measure (EA, LF, LOT, HR, etc.). */
  unit: string;
  /** Installed quantity. */
  qty: number;
  /** Our cost per unit (what GCC pays). */
  costEach: number;
  /** List price per unit (what the line item sells for). */
  saleEach: number;
  /** Labor hours per unit (for the labor plan + weekly bar chart). */
  laborHours: number;
  /** Optional overrides. */
  vendor?: string;
  notes?: string;
}

/** Totals produced by `computeTotals()`. */
export interface Totals {
  /** Sum of extended cost (catalog cost × qty). */
  costSubtotal: number;
  /** Sum of extended sale (line-item list × qty). */
  saleSubtotal: number;
  /** Sum of labor hours (hrs × qty). */
  hoursSubtotal: number;
  /** Subtotal before markup (same as saleSubtotal today; reserved for future). */
  subtotal: number;
  /** Final turnkey grand total (applies tax / markup / contingency / bond / drop band). */
  grand: number;
}
