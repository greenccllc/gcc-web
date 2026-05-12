/**
 * 02 · Bid Overview — Quantitative Project Bid Summary.
 *
 * One-page customer-facing summary in the visual language of the
 * GCC_HybridVilla_Summary reference: centered title, project info bar,
 * three KPI cards, financial summary table, alternates/deducts, and a
 * two-column drop summary.
 *
 * Data flows from intake.crosswalk + session.lines via computeTotals.
 * Where category-specific dollars aren't in the model we split the
 * grand total proportionally by endpoint category.
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

export interface BidOverviewInput {
  intake: IntakeState;
  session: SessionState;
  brand: GccBrand;
  logos: LogoMap;
  projectLabel?: string;
  totalsConfig?: ComputeTotalsConfig;
}

export interface BidOverviewOutput {
  filename: string;
  html: string;
  summary: { sell: number; totalEndpoints: number };
}

/** Approx run length per endpoint category, used to estimate cabling LF. */
const RUN_LF = {
  data:   150,
  ap:     180,
  camera: 150,
  door:   150,
  fiber:  100
};

/** Pick a date string. Uses crosswalk if present, else today. */
function proposalDate(intake: IntakeState): string {
  const fromCw = cw(intake.crosswalk, 'proposal_date', '') || cw(intake.crosswalk, 'submission_date', '');
  if (fromCw) return fromCw;
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function renderBidOverview(inp: BidOverviewInput): BidOverviewOutput {
  const { intake, session, brand, logos } = inp;
  const project   = inp.projectLabel ?? getProjectLabel(intake, session);
  const totalsCfg = inp.totalsConfig ?? DEFAULT_TOTALS_CONFIG;
  const cw0       = intake.crosswalk;

  // ───── Endpoint counts ─────
  const dd = cwNum(cw0, 'data_drops_count');
  const ap = cwNum(cw0, 'ap_count');
  const ca = cwNum(cw0, 'camera_count_commercial');
  const dr = cwNum(cw0, 'door_positions_count');
  const fb = cwNum(cw0, 'fiber_strands_count');
  const totalEndpoints = dd + ap + ca + dr;

  // ───── Totals ─────
  const totals = computeTotals(session.lines, totalEndpoints, totalsCfg);
  const sell   = totals.grand;
  const hours  = Math.round(totals.hoursSubtotal);
  const matCost = Math.round(totals.costSubtotal); // materials portion of cost

  // ───── Cabling LF estimate ─────
  const cablingLf = Math.round(
    dd * RUN_LF.data + ap * RUN_LF.ap + ca * RUN_LF.camera + dr * RUN_LF.door + fb * RUN_LF.fiber
  );

  // ───── Project info bar fields (override-friendly via crosswalk) ─────
  const architectInfo  = cw(cw0, 'architect_company', '') ||
                         cw(cw0, 'architect_name', '') ||
                         '—';
  const archCommNo     = cw(cw0, 'comm_number', '') || cw(cw0, 'project_number', '');
  const submittedTo    = cw(cw0, 'gc_company_name', '') ||
                         cw(cw0, 'client_company_name', '') ||
                         '—';
  const fieldDuration  = cw(cw0, 'field_duration', '') || (hours > 0 ? Math.ceil(hours / 16) + ' Workdays' : 'TBD');
  const crewSize       = cw(cw0, 'crew_size', '2-Man Dedicated Crew');
  const wageStandard   = cw(cw0, 'wage_standard', 'Prevailing');

  const left: InfoBarField[] = [
    { label: 'Project',       value: project },
    { label: 'Architect No',  value: archCommNo ? `${architectInfo} / Comm No. ${archCommNo}` : architectInfo },
    { label: 'Submitted To',  value: submittedTo },
    { label: 'Proposal Date', value: proposalDate(intake) }
  ];
  const right: InfoBarField[] = [
    { label: 'Est. Field Duration', value: fieldDuration },
    { label: 'Crew Size',           value: crewSize },
    { label: 'Wage Standard',       value: wageStandard }
  ];

  // ───── KPI cards ─────
  const kpis: Kpi[] = [
    { label: 'Total Labor Hrs', value: fmtInt(hours) },
    { label: 'Est. Cabling LF', value: fmtInt(cablingLf) },
    { label: 'Base Bid Total',  value: fmtCurrencyRound(sell), primary: true }
  ];

  // ───── Financial summary breakdown ─────
  // We don't have category dollars in the data model, so we split the grand
  // proportionally by endpoint count across three buckets matching the PDF:
  //   • TR/MDF/IDF Buildout   — 16% baseline (or scale with mdf+idf count)
  //   • Resident Infrastructure — data drops + fiber
  //   • Common Area & Security — APs + cameras + doors
  const bucketShare = (() => {
    const drops = Math.max(1, dd + fb);
    const common = Math.max(0, ap + ca + dr);
    return {
      tr:        0.16,                          // fixed baseline
      resident:  0.84 * (drops / (drops + common + 0.0001)),
      common:    0.84 * (common / (drops + common + 0.0001))
    };
  })();
  const norm = bucketShare.tr + bucketShare.resident + bucketShare.common;
  const k = norm > 0 ? 1 / norm : 1;
  const fin = [
    {
      cat: `TR Buildout (${fmtInt(dd > 0 ? dd : 96)} Ports Total)`,
      mat: Math.round(matCost * bucketShare.tr * k * 0.65),
      hrs: Math.round(hours * bucketShare.tr * k),
      sub: Math.round(sell * bucketShare.tr * k)
    },
    {
      cat: `Resident Infrastructure (${fmtInt(dd + fb)} Drops)`,
      mat: Math.round(matCost * bucketShare.resident * k * 0.65),
      hrs: Math.round(hours * bucketShare.resident * k),
      sub: Math.round(sell * bucketShare.resident * k)
    },
    {
      cat: `Common Area & Misc (${fmtInt(ap + ca + dr)} Drops)`,
      mat: Math.round(matCost * bucketShare.common * k * 0.65),
      hrs: Math.round(hours * bucketShare.common * k),
      sub: Math.round(sell * bucketShare.common * k)
    }
  ];
  // Force totals to match exactly
  const sumMat = fin.reduce((a, r) => a + r.mat, 0);
  const sumHrs = fin.reduce((a, r) => a + r.hrs, 0);
  const sumSub = fin.reduce((a, r) => a + r.sub, 0);
  const lastFin = fin[fin.length - 1];
  if (lastFin) {
    lastFin.mat += matCost - sumMat;
    lastFin.hrs += hours - sumHrs;
    lastFin.sub += Math.round(sell) - sumSub;
  }

  const finTable =
    '<table class="qbs-table">' +
      '<thead><tr>' +
        '<th>Category</th>' +
        '<th class="num">Materials</th>' +
        '<th class="num">Labor Hrs</th>' +
        '<th class="num">Subtotal</th>' +
      '</tr></thead>' +
      '<tbody>' +
        fin.map((r) =>
          '<tr>' +
            `<td>${escapeHtml(r.cat)}</td>` +
            `<td class="num">${fmtCurrencyRound(r.mat)}</td>` +
            `<td class="num">${fmtInt(r.hrs)}</td>` +
            `<td class="num">${fmtCurrencyRound(r.sub)}</td>` +
          '</tr>'
        ).join('') +
        '<tr class="qbs-total">' +
          '<td>Base Bid Total</td>' +
          `<td class="num">${fmtCurrencyRound(matCost)}</td>` +
          `<td class="num">${fmtInt(hours)}</td>` +
          `<td class="num">${fmtCurrencyRound(sell)}</td>` +
        '</tr>' +
      '</tbody>' +
    '</table>';

  // ───── Alternates / Deducts ─────
  const altRows: Array<{ label: string; amount: number; kind: 'add' | 'deduct' }> = [];
  // Read up to 4 alternates from crosswalk
  for (let i = 1; i <= 4; i++) {
    const lbl = cw(cw0, `alternate_${i}_label`, '');
    const amt = cwNum(cw0, `alternate_${i}_amount`, 0);
    if (lbl && amt) altRows.push({ label: `Add Alternate ${i}: ${lbl}`, amount: amt, kind: 'add' });
  }
  for (let i = 1; i <= 2; i++) {
    const lbl = cw(cw0, `deduct_${i}_label`, '');
    const amt = cwNum(cw0, `deduct_${i}_amount`, 0);
    if (lbl && amt) altRows.push({ label: `Voluntary Deduct ${i}: ${lbl}`, amount: amt, kind: 'deduct' });
  }

  const altTable = altRows.length > 0
    ? '<table class="qbs-table">' +
        '<thead><tr><th>Add Alternates &amp; Deducts</th><th class="num">Amount</th></tr></thead>' +
        '<tbody>' +
          altRows.map((r) =>
            '<tr>' +
              `<td>${escapeHtml(r.label)}</td>` +
              `<td class="num ${r.kind === 'deduct' ? 'deduct' : 'add'}">${r.kind === 'deduct' ? 'DEDUCT ' : 'ADD '}${fmtCurrencyRound(r.amount)}</td>` +
            '</tr>'
          ).join('') +
        '</tbody>' +
      '</table>'
    : '';

  // ───── Drop summary ─────
  const smcs    = cwNum(cw0, 'smc_count', 0);
  const cat6a   = cwNum(cw0, 'cat6a_drops_count', dd);
  const rg6     = cwNum(cw0, 'rg6_drops_count', 0);
  const aor     = cwNum(cw0, 'aor_count', 0);
  const wap     = cwNum(cw0, 'wap_count', ap);
  const misc    = cwNum(cw0, 'misc_drops_count', 0);

  const residentItems = [
    smcs > 0 && `(${fmtInt(smcs)}) Legrand On-Q 30" SMCs`,
    cat6a > 0 && `(${fmtInt(cat6a)}) Cat6A Data Drops (~${fmtInt(cat6a * RUN_LF.data)} LF)`,
    rg6 > 0 && `(${fmtInt(rg6)}) RG6 Coax Drops (~${fmtInt(rg6 * RUN_LF.data)} LF)`,
    fb > 0 && !rg6 && `(${fmtInt(fb)}) Fiber Strands (~${fmtInt(fb * RUN_LF.fiber)} LF)`
  ].filter(Boolean) as string[];

  const commonItems = [
    ca > 0 && `(${fmtInt(ca)}) CCTV Cameras (~${fmtInt(ca * RUN_LF.camera)} LF)`,
    dr > 0 && `(${fmtInt(dr)}) Composite Access Control (~${fmtInt(dr * RUN_LF.door)} LF)`,
    (aor + wap + misc) > 0 && `(${fmtInt(aor)}) AOR / (${fmtInt(wap)}) WAP / (${fmtInt(misc)}) Misc Drops (~${fmtInt((aor + wap + misc) * RUN_LF.data)} LF)`
  ].filter(Boolean) as string[];

  const dropSummary = (residentItems.length + commonItems.length) > 0
    ? '<div class="qbs-two-col">' +
        '<div>' +
          '<h4>Resident Units:</h4>' +
          '<ul>' + residentItems.map((s) => `<li>${escapeHtml(s)}</li>`).join('') + '</ul>' +
        '</div>' +
        '<div>' +
          '<h4>Common Area &amp; Security:</h4>' +
          '<ul>' + commonItems.map((s) => `<li>${escapeHtml(s)}</li>`).join('') + '</ul>' +
        '</div>' +
      '</div>'
    : '';

  // ───── Assemble body ─────
  const body =
    summaryStyleBlock(brand) +
    summaryTitle('GREEN COMMUNICATIONS CONTRACTING', 'Quantitative Project Bid Summary') +
    infoBar(left, right) +
    kpiRow(kpis) +
    summarySection('Financial Summary') +
    finTable +
    (altTable ? summarySection('') + altTable : '') +
    (dropSummary ? summarySection('Quantitative Drop Summary') + dropSummary : '') +
    summaryFoot(`GCC Proprietary · Division 27 Subcontract Pricing Support · ${project}`);

  const html = gccHtmlShell(
    'Quantitative Project Bid Summary',
    body,
    {
      classification: 'CLIENT',
      docKind:        '02 · Quantitative Project Bid Summary',
      suppressTitle:  true,
      projectLabel:   project
    },
    { brand, logos }
  );

  const filename = buildOutputFilename(
    { prefix: '02', baseName: 'Quantitative Bid Summary', ext: '.pdf' },
    project
  );

  return {
    filename,
    html,
    summary: { sell, totalEndpoints }
  };
}
