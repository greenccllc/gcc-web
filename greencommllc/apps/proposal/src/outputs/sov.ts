/**
 * 07 · Schedule of Values — line-item cost breakdown for billing.
 *
 * Uses the same summary visual language as the Quantitative Bid Summary
 * (Bid Overview) — same title block, info bar, and table style — so all
 * three documents (Summary, SOV, SOW) read as one styled set.
 *
 * Standard 11-row SOV that sums to the base bid.
 */

import type { GccBrand, LogoMap } from '@models/brand';
import type { IntakeState, SessionState } from '@models/intake';
import {
  buildOutputFilename,
  cw,
  cwNum,
  escapeHtml,
  fmtCurrencyRound,
  fmtInt,
  getProjectLabel
} from './_helpers';
import { gccHtmlShell } from './shellHtml';
import {
  computeTotals,
  DEFAULT_TOTALS_CONFIG,
  type ComputeTotalsConfig
} from '@pricing/computeTotals';
import {
  summaryStyleBlock,
  summaryTitle,
  infoBar,
  kpiRow,
  summarySection,
  summaryFoot,
  type Kpi,
  type InfoBarField
} from './summaryStyle';

export interface SovInput {
  intake: IntakeState;
  session: SessionState;
  brand: GccBrand;
  logos: LogoMap;
  projectLabel?: string;
  totalsConfig?: ComputeTotalsConfig;
}

export interface SovOutput {
  filename: string;
  html: string;
  summary: { sell: number; rowCount: number };
}

interface SovRow {
  code: string;
  description: string;
  share: number; // 0..1, share of base bid
}

/** Standard 11-row Schedule of Values. */
const SOV_ROWS: readonly SovRow[] = [
  { code: 'SOV-01', description: 'Mobilization & General Conditions',                  share: 0.05 },
  { code: 'SOV-02', description: 'Submittals, Shop Drawings & Project Management',     share: 0.06 },
  { code: 'SOV-03', description: 'Telecom Room Buildout (Racks, Cable Mgmt, Bonding)', share: 0.12 },
  { code: 'SOV-04', description: 'Backbone Cabling & Pathways',                        share: 0.10 },
  { code: 'SOV-05', description: 'Horizontal Structured Cabling (Cat 6A)',             share: 0.32 },
  { code: 'SOV-06', description: 'Wireless Access Point Drops & Mounting',             share: 0.06 },
  { code: 'SOV-07', description: 'IP Camera & Surveillance Cabling',                   share: 0.08 },
  { code: 'SOV-08', description: 'Access Control & Composite Drops',                   share: 0.06 },
  { code: 'SOV-09', description: 'Termination, Labeling & TIA-606-C Administration',   share: 0.06 },
  { code: 'SOV-10', description: 'Fluke DSX-8000 Certification (100%)',                share: 0.05 },
  { code: 'SOV-11', description: 'Closeout, As-Builts & 90-Day AMC Revisits',          share: 0.04 }
];

function proposalDate(intake: IntakeState): string {
  const fromCw = cw(intake.crosswalk, 'proposal_date', '') || cw(intake.crosswalk, 'submission_date', '');
  if (fromCw) return fromCw;
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function renderSov(inp: SovInput): SovOutput {
  const { intake, session, brand, logos } = inp;
  const project   = inp.projectLabel ?? getProjectLabel(intake, session);
  const totalsCfg = inp.totalsConfig ?? DEFAULT_TOTALS_CONFIG;
  const cw0       = intake.crosswalk;

  const dd = cwNum(cw0, 'data_drops_count');
  const ap = cwNum(cw0, 'ap_count');
  const ca = cwNum(cw0, 'camera_count_commercial');
  const dr = cwNum(cw0, 'door_positions_count');
  const totalEndpoints = dd + ap + ca + dr;

  const totals = computeTotals(session.lines, totalEndpoints, totalsCfg);
  const sell   = totals.grand;

  // ───── Info bar ─────
  const submittedTo = cw(cw0, 'gc_company_name', '') ||
                      cw(cw0, 'client_company_name', '') ||
                      '—';
  const archCommNo  = cw(cw0, 'comm_number', '') || cw(cw0, 'project_number', '');
  const architectInfo = cw(cw0, 'architect_company', '') || cw(cw0, 'architect_name', '') || '—';

  const left: InfoBarField[] = [
    { label: 'Project',       value: project },
    { label: 'Architect No',  value: archCommNo ? `${architectInfo} / Comm No. ${archCommNo}` : architectInfo },
    { label: 'Submitted To',  value: submittedTo },
    { label: 'Proposal Date', value: proposalDate(intake) }
  ];
  const right: InfoBarField[] = [
    { label: 'Endpoints', value: fmtInt(totalEndpoints) },
    { label: 'Line Items', value: String(SOV_ROWS.length) },
    { label: 'Document', value: 'AIA G703 compatible' }
  ];

  // ───── KPIs ─────
  const kpis: Kpi[] = [
    { label: 'Line Items',     value: String(SOV_ROWS.length) },
    { label: 'Total Endpoints', value: fmtInt(totalEndpoints) },
    { label: 'Base Bid Total',  value: fmtCurrencyRound(sell), primary: true }
  ];

  // ───── SOV table — distribute base bid across rows by share ─────
  const computed = SOV_ROWS.map((r) => ({ ...r, amount: Math.round(sell * r.share) }));
  // Force last row to absorb rounding so total matches sell exactly.
  const sumNoLast = computed.slice(0, -1).reduce((a, r) => a + r.amount, 0);
  const lastSov = computed[computed.length - 1];
  if (lastSov) {
    lastSov.amount = Math.round(sell) - sumNoLast;
  }
  // Cumulative for billing reference.
  let running = 0;
  const rowsWithRunning = computed.map((r) => {
    running += r.amount;
    return { ...r, running };
  });

  const sovTable =
    '<table class="qbs-table">' +
      '<thead><tr>' +
        '<th>Item</th>' +
        '<th>Scheduled Description</th>' +
        '<th class="num">Scheduled Value</th>' +
        '<th class="num">% of Total</th>' +
        '<th class="num">Cumulative</th>' +
      '</tr></thead>' +
      '<tbody>' +
        rowsWithRunning.map((r) =>
          '<tr>' +
            `<td><strong>${escapeHtml(r.code)}</strong></td>` +
            `<td>${escapeHtml(r.description)}</td>` +
            `<td class="num">${fmtCurrencyRound(r.amount)}</td>` +
            `<td class="num">${(r.share * 100).toFixed(1)}%</td>` +
            `<td class="num">${fmtCurrencyRound(r.running)}</td>` +
          '</tr>'
        ).join('') +
        '<tr class="qbs-total">' +
          '<td colspan="2">Base Bid Total</td>' +
          `<td class="num">${fmtCurrencyRound(sell)}</td>` +
          '<td class="num">100.0%</td>' +
          `<td class="num">${fmtCurrencyRound(sell)}</td>` +
        '</tr>' +
      '</tbody>' +
    '</table>';

  const billingNotes =
    '<div class="qbs-two-col">' +
      '<div>' +
        '<h4>Billing &amp; Retainage:</h4>' +
        '<ul>' +
          '<li>Monthly progress draws by AIA G702/G703 (or GC equivalent).</li>' +
          '<li>5% retainage held until Substantial Completion.</li>' +
          '<li>Net 30 from invoice approval.</li>' +
        '</ul>' +
      '</div>' +
      '<div>' +
        '<h4>Adjustments &amp; Holds:</h4>' +
        '<ul>' +
          '<li>SOV-01 Mobilization billable on first draw after award.</li>' +
          '<li>SOV-11 Closeout held until As-Builts + warranty cert delivered.</li>' +
          '<li>Change orders priced by Section 5 unit prices.</li>' +
        '</ul>' +
      '</div>' +
    '</div>';

  const body =
    summaryStyleBlock(brand) +
    summaryTitle('GREEN COMMUNICATIONS CONTRACTING', 'Schedule of Values') +
    infoBar(left, right) +
    kpiRow(kpis) +
    summarySection('Schedule of Values') +
    sovTable +
    summarySection('Notes') +
    billingNotes +
    summaryFoot(`GCC Proprietary · Division 27 Subcontract Pricing Support · ${project}`);

  const html = gccHtmlShell(
    'Schedule of Values',
    body,
    {
      classification: 'CLIENT',
      docKind:        '07 · Schedule of Values',
      suppressTitle:  true,
      projectLabel:   project
    },
    { brand, logos }
  );

  const filename = buildOutputFilename(
    { prefix: '07', baseName: 'Schedule of Values', ext: '.pdf' },
    project
  );

  return {
    filename,
    html,
    summary: { sell, rowCount: SOV_ROWS.length }
  };
}
