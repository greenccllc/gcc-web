/**
 * Job-level summary derivations.
 *
 * Pulls the sticky-header job facts from the intake crosswalk + session
 * lines + configured totals. Pure functions, no DOM.
 */

import type { Crosswalk } from '@models/crosswalk';
import type { LineItem } from '@models/lineItem';
import { computeTotals, DEFAULT_TOTALS_CONFIG, type ComputeTotalsConfig } from './computeTotals';

function pick(cw: Crosswalk, ...keys: string[]): string {
  for (const k of keys) {
    const v = cw[k]?.value;
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function pickNum(cw: Crosswalk, ...keys: string[]): number {
  for (const k of keys) {
    const v = cw[k]?.value;
    if (v == null) continue;
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 0;
}

export interface JobSummary {
  /** Short label e.g. "McCarthy Building Companies". Empty when unknown. */
  customer:   string;
  /** Project name from extraction. Empty when unknown. */
  project:    string;
  /** Proposal / bid tracking number. Empty when unknown. */
  propnum:    string;
  /** Proposal / bid-due date in ISO format (YYYY-MM-DD). Empty when unknown. */
  dateIso:    string;
  /** Summary line like "274 + 48 fiber". Empty when no endpoints. */
  endpoints:  string;
  /** Formatted sell price e.g. "$51,260". Empty when no line items. */
  bidValue:   string;
  /** Days until bid due, signed. null when no due date. */
  daysToBid:  number | null;
  /** Route inference: 'bid' (subcontractor to GC) | 'owner' | 'residential'. */
  mode:       'bid' | 'owner' | 'residential' | 'unknown';
}

export interface JobSummaryInput {
  crosswalk: Crosswalk;
  lines: readonly LineItem[];
  drops: number;
  totalsConfig?: ComputeTotalsConfig;
}

/**
 * Compute the sticky-header summary fields. Every field returns "" rather
 * than null/undefined so the header can show em-dash placeholders without
 * special-casing.
 */
export function deriveJobSummary(inp: JobSummaryInput): JobSummary {
  const cw = inp.crosswalk;

  const customer = pick(cw, 'gc_company_name', 'client_company_name', 'homeowner_name');
  const project  = pick(cw, 'project_name');
  const propnum  = pick(cw, 'gcc_bid_number', 'bid_number', 'proposal_number');

  // Date normalization — accept ISO or free-form, output YYYY-MM-DD.
  let dateIso = '';
  const raw = pick(cw, 'proposal_date', 'bid_due_date', 'due_date');
  if (raw) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      dateIso = raw;
    } else {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) dateIso = d.toISOString().slice(0, 10);
    }
  }

  // Days to bid — derive from dateIso (null when no date).
  let daysToBid: number | null = null;
  if (dateIso) {
    const t = Date.parse(dateIso);
    if (!Number.isNaN(t)) daysToBid = Math.round((t - Date.now()) / 86_400_000);
  }

  // Endpoint count.
  const dd = pickNum(cw, 'data_drops_count');
  const ap = pickNum(cw, 'ap_count');
  const ca = pickNum(cw, 'camera_count_commercial');
  const dr = pickNum(cw, 'door_positions_count');
  const fb = pickNum(cw, 'fiber_strands_count');
  const totalEp = dd + ap + ca + dr;
  const endpoints = totalEp > 0
    ? totalEp.toLocaleString('en-US') + (fb > 0 ? ' + ' + fb + ' fiber' : '')
    : '';

  // Bid value — compute totals only when we have line items.
  let bidValue = '';
  if (inp.lines.length > 0) {
    const t = computeTotals(inp.lines, inp.drops, inp.totalsConfig ?? DEFAULT_TOTALS_CONFIG);
    if (t.grand > 0) bidValue = '$' + Math.round(t.grand).toLocaleString('en-US');
  }

  // Route inference — drives header pill + downstream doc framing.
  let mode: JobSummary['mode'] = 'unknown';
  if (pick(cw, 'gc_company_name'))       mode = 'bid';
  else if (pick(cw, 'homeowner_name'))   mode = 'residential';
  else if (pick(cw, 'client_company_name')) mode = 'owner';

  return { customer, project, propnum, dateIso, endpoints, bidValue, daysToBid, mode };
}
