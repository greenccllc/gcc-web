/**
 * 04 · Statement of Work — commercial terms + schedule + responsibilities.
 *
 * Same summary visual language as the Quantitative Bid Summary and SOV:
 * centered title, project info bar, KPI row, summary section headings,
 * styled tables and two-column lists. Eight numbered SOW sections live
 * inside this consistent shell.
 */

import type { GccBrand, LogoMap } from '@models/brand';
import type { IntakeState, SessionState } from '@models/intake';
import {
  buildOutputFilename,
  buildRecipientBlock,
  cw,
  cwNum,
  escapeHtml,
  fmtInt,
  getProjectLabel
} from './_helpers';
import { gccHtmlShell } from './shellHtml';
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

export interface SowInput {
  intake: IntakeState;
  session: SessionState;
  brand: GccBrand;
  logos: LogoMap;
  projectLabel?: string;
}

export interface SowOutput {
  filename: string;
  html: string;
}

function proposalDate(intake: IntakeState): string {
  const fromCw = cw(intake.crosswalk, 'proposal_date', '') || cw(intake.crosswalk, 'submission_date', '');
  if (fromCw) return fromCw;
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function renderSow(inp: SowInput): SowOutput {
  const { intake, session, brand, logos } = inp;
  const project = inp.projectLabel ?? getProjectLabel(intake, session);
  const rcp     = buildRecipientBlock(intake);
  const cw0     = intake.crosswalk;

  const dd = cwNum(cw0, 'data_drops_count');
  const ap = cwNum(cw0, 'ap_count');
  const ca = cwNum(cw0, 'camera_count_commercial');
  const dr = cwNum(cw0, 'door_positions_count');
  const totalEndpoints = dd + ap + ca + dr;

  const submittedTo  = cw(cw0, 'gc_company_name', '') || cw(cw0, 'client_company_name', '') || rcp.company || '—';
  const archCommNo   = cw(cw0, 'comm_number', '') || cw(cw0, 'project_number', '');
  const architectInfo = cw(cw0, 'architect_company', '') || cw(cw0, 'architect_name', '') || '—';

  const left: InfoBarField[] = [
    { label: 'Project',       value: project },
    { label: 'Architect No',  value: archCommNo ? `${architectInfo} / Comm No. ${archCommNo}` : architectInfo },
    { label: 'Counterparty',  value: `${submittedTo} (${rcp.role})` },
    { label: 'Proposal Date', value: proposalDate(intake) }
  ];
  const right: InfoBarField[] = [
    { label: 'Document',  value: 'Statement of Work' },
    { label: 'Sections',  value: '8 — Parties → Acceptance' },
    { label: 'Endpoints', value: fmtInt(totalEndpoints) }
  ];

  const kpis: Kpi[] = [
    { label: 'Sections',           value: '8' },
    { label: 'Total Endpoints',    value: fmtInt(totalEndpoints) },
    { label: 'Acceptance Required', value: 'Section 8', primary: true }
  ];

  // ───── 1. Parties ─────
  const parties =
    `<p>This Statement of Work ("SOW") is between <strong>GreenComm LLC</strong> d/b/a <strong>GCC LLC</strong> ("Contractor") and <strong>${escapeHtml(rcp.company)}</strong> ("${escapeHtml(rcp.role)}") for Division 27/28 low-voltage scope on the <strong>${escapeHtml(project)}</strong> project. It is incorporated by reference into the accompanying Bid Proposal.</p>`;

  // ───── 2. Scope Deliverables ─────
  const scope =
    '<p>Contractor shall furnish all labor, materials, tools, supervision, and incidentals required to execute the Division 27/28 scope as described in the Bid Proposal Section 2, including but not limited to:</p>' +
    '<ul>' +
      '<li>Structured cabling system (horizontal + backbone)</li>' +
      '<li>Telecommunications room buildout (racks, cable management, bonding)</li>' +
      '<li>Termination, labeling, testing, and certification</li>' +
      '<li>Firestop and penetration sealing of openings created by Contractor</li>' +
      '<li>Close-out documentation (test reports, labeling register, as-built drawings)</li>' +
    '</ul>';

  // ───── 3 + 4. Responsibilities — 2-col layout ─────
  const responsibilities =
    '<div class="qbs-two-col">' +
      '<div>' +
        '<h4>Contractor Responsibilities:</h4>' +
        '<ul>' +
          '<li>Obtain all trade permits required by AHJ; inspections coordinated with GC/Owner.</li>' +
          "<li>Maintain in force: $1M/$2M general liability, $1M auto, $1M workers' comp, $1M umbrella.</li>" +
          '<li>Provide competent, licensed supervision on site during all active work.</li>' +
          '<li>Furnish submittals within 5 business days of award; respond to RFIs within 24 hours.</li>' +
          '<li>Keep work area clean and free of trip hazards at end of each work day.</li>' +
          '<li>Coordinate with EC on power, HVAC on TR cooling, architectural on pathways.</li>' +
        '</ul>' +
      '</div>' +
      '<div>' +
        `<h4>${escapeHtml(rcp.role)} Responsibilities:</h4>` +
        '<ul>' +
          '<li>Timely access to site during normal working hours (7a–5p, M–F).</li>' +
          '<li>120V dedicated circuits to rack locations (MDF/IDF) terminated at receptacle.</li>' +
          '<li>Conduit sleeves through rated assemblies sized per RCDD-stamped drawings.</li>' +
          '<li>Environmental conditions: TR cooled to manufacturer spec before rack delivery.</li>' +
          '<li>Timely response to RFIs (goal: 72 hours).</li>' +
          '<li>Coordination of tied trades (architectural, electrical, mechanical).</li>' +
        '</ul>' +
      '</div>' +
    '</div>';

  // ───── 5. Schedule table ─────
  const schedule =
    '<table class="qbs-table">' +
      '<thead><tr><th>Phase</th><th>Dependency</th><th class="num">Duration</th></tr></thead>' +
      '<tbody>' +
        '<tr><td>Submittals</td><td>Contract execution</td><td class="num">5 business days</td></tr>' +
        '<tr><td>Mobilization</td><td>Submittal approval + ceiling access</td><td class="num">1 business day</td></tr>' +
        '<tr><td>Rough-in pull</td><td>Ceiling open · no conflicting trade above</td><td class="num">Per schedule</td></tr>' +
        '<tr><td>Termination</td><td>Rough-in + TR rack installed</td><td class="num">Per schedule</td></tr>' +
        '<tr><td>Test &amp; certify</td><td>Termination complete</td><td class="num">5–10 business days</td></tr>' +
        '<tr><td>Close-out</td><td>Substantial completion</td><td class="num">10 business days</td></tr>' +
      '</tbody>' +
    '</table>';

  // ───── 6 + 7. Commercial + Warranty — 2-col ─────
  const commercialAndWarranty =
    '<div class="qbs-two-col">' +
      '<div>' +
        '<h4>Commercial Terms:</h4>' +
        '<ul>' +
          `<li><strong>Progress billings:</strong> Monthly, AIA G702/G703 format, following ${escapeHtml(rcp.role)} billing cycle.</li>` +
          '<li><strong>Payment:</strong> Net 30 from invoice approval.</li>' +
          '<li><strong>Retainage:</strong> 5% held through Substantial Completion; released at close-out acceptance.</li>' +
          '<li><strong>Change orders:</strong> AIA G701 format. 15% on material, 10% on labor. Verbal approvals not executable.</li>' +
          '<li><strong>Disputes:</strong> Good-faith negotiation first; mediation before litigation.</li>' +
          '<li><strong>Governing law:</strong> Missouri.</li>' +
        '</ul>' +
      '</div>' +
      '<div>' +
        '<h4>Warranty:</h4>' +
        '<ul>' +
          '<li><strong>Workmanship:</strong> Lifetime of the installed system. Contractor remedies any termination, labeling, or performance deficiency attributable to workmanship at no cost for the life of the building.</li>' +
          '<li><strong>Components:</strong> 25-year manufacturer warranty (Panduit / CommScope) for channel performance.</li>' +
          '<li><strong>AMC revisits:</strong> Two (2) no-cost site visits within 90 days of Substantial Completion for minor adjustments, move-add-changes, or user coaching.</li>' +
        '</ul>' +
      '</div>' +
    '</div>';

  const acceptance =
    `<p>This SOW is accepted by signature on the companion Bid Proposal Section 8 Acceptance block. Both documents are incorporated by reference into the executed agreement between <strong>GCC LLC</strong> and <strong>${escapeHtml(rcp.company)}</strong>.</p>`;

  const body =
    summaryStyleBlock(brand) +
    summaryTitle('GREEN COMMUNICATIONS CONTRACTING', 'Statement of Work') +
    infoBar(left, right) +
    kpiRow(kpis) +
    summarySection('1. Parties & Definitions') + parties +
    summarySection('2. Scope Deliverables') + scope +
    summarySection('3 & 4. Responsibilities') + responsibilities +
    summarySection('5. Schedule') + schedule +
    summarySection('6 & 7. Commercial Terms & Warranty') + commercialAndWarranty +
    summarySection('8. Acceptance') + acceptance +
    summaryFoot(`GCC Proprietary · Division 27 Subcontract Pricing Support · ${project}`);

  const html = gccHtmlShell(
    'Statement of Work',
    body,
    {
      classification: 'CLIENT',
      docKind:        '04 · Statement of Work',
      suppressTitle:  true,
      projectLabel:   project
    },
    { brand, logos }
  );

  const filename = buildOutputFilename(
    { prefix: '04', baseName: 'Statement of Work', ext: '.pdf' },
    project
  );

  return { filename, html };
}
