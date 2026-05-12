/**
 * INTERNAL · Cable Schedule — pull sheet for the foreman.
 *
 * Ported from `onExportCableSchedule` (bundle-builder.html line 19183).
 *
 * Authoritative source is the `session.lines` array; if no scope lines
 * have been entered, fall back to canonical default rows derived from the
 * intake endpoint counts so a freshly-seeded job still produces a usable
 * field document.
 *
 * Output is a landscape HTML doc with the INTERNAL ribbon — never mailed
 * to the customer. Standards block + TIA-606-C labeling scheme + a
 * three-row field sign-off table are appended.
 */

import type { GccBrand, LogoMap } from '@models/brand';
import type { IntakeState, SessionState } from '@models/intake';
import type { LineItem } from '@models/lineItem';
import {
  buildOutputFilename,
  cw,
  cwNum,
  escapeHtml,
  fmtInt,
  getProjectLabel
} from './_helpers';
import { gccHtmlShell } from './shellHtml';

export interface CableScheduleInput {
  intake: IntakeState;
  session: SessionState;
  brand: GccBrand;
  logos: LogoMap;
  projectLabel?: string;
}

export interface CableScheduleRow {
  idx: number;
  category: string;
  endpoint: string;
  qty: number;
  lf: number;
  cable: string;
  color: string;
  tr: string;
  terminate: string;
  test: string;
  notes: string;
}

export interface CableScheduleOutput {
  filename: string;
  html: string;
  rows: CableScheduleRow[];
  totalEndpoints: number;
  totalLF: number;
}

/**
 * Lift cable / TR / termination metadata off a LineItem if present, otherwise
 * use the canonical Cat 6A defaults. Reads through `notes` so a foreman can
 * pin a custom path on a single line without a schema migration.
 */
function rowFromLine(ln: LineItem, idx: number): CableScheduleRow {
  const meta = (ln as unknown as Record<string, unknown>);
  const pick = (key: string, dflt: string): string => {
    const v = meta[key];
    return (typeof v === 'string' && v) ? v : dflt;
  };
  const lf = (typeof meta['lf'] === 'number' ? meta['lf'] as number : 0);
  return {
    idx,
    category:  ln.category || 'Structured Cabling',
    endpoint:  ln.name     || '(unnamed)',
    qty:       ln.qty      || 0,
    lf,
    cable:     pick('cable',     'Cat 6A Plenum (CMP)'),
    color:     pick('color',     'Blue'),
    tr:        pick('tr',        ''),
    terminate: pick('terminate', 'RJ45 T568B · both ends'),
    test:      pick('test',      'Fluke DSX-8000 · LinkWare PDF'),
    notes:     pick('notes',     '')
  };
}

export function renderCableSchedule(inp: CableScheduleInput): CableScheduleOutput {
  const { intake, session, brand, logos } = inp;
  const project   = inp.projectLabel ?? getProjectLabel(intake, session);
  const cw0       = intake.crosswalk;

  const dataDrops = cwNum(cw0, 'data_drops_count');
  const apCount   = cwNum(cw0, 'ap_count');
  const camCount  = cwNum(cw0, 'camera_count_commercial');
  const doorCount = cwNum(cw0, 'door_positions_count');
  const fiberStr  = cwNum(cw0, 'fiber_strands_count');
  const mdf       = cw(cw0, 'mdf_count', 'TBD');
  const idf       = cw(cw0, 'idf_count', 'TBD');

  const rows: CableScheduleRow[] = [];
  let rowIdx = 1;

  // Authoritative: line items with positive qty
  for (const ln of session.lines) {
    if (!ln || !(ln.qty > 0)) continue;
    rows.push(rowFromLine(ln, rowIdx++));
  }

  // Fallback canonical rows derived from endpoint counts
  if (rows.length === 0) {
    const seedRows: Array<Omit<CableScheduleRow, 'idx'>> = [];
    if (dataDrops > 0) seedRows.push({ category: 'Data',                endpoint: 'Workstation / Data Outlet',       qty: dataDrops, lf: dataDrops * 175, cable: 'Cat 6A Plenum (CMP)',   color: 'Blue', tr: 'MDF/IDF → WAO', terminate: 'RJ45 T568B · both ends',     test: 'Fluke DSX-8000 · LinkWare', notes: 'Service loops: 12 ft TR, 3 ft outlet' });
    if (apCount   > 0) seedRows.push({ category: 'Wireless',            endpoint: 'Wireless Access Point (WAP)',     qty: apCount,   lf: apCount   * 225, cable: 'Cat 6A Plenum (CMP)',   color: 'Blue', tr: 'IDF → AP',     terminate: 'RJ45 T568B · PoE+ certified', test: 'Fluke DSX-8000 · PoE verify', notes: 'Ceiling-mount; 18 ft service loop' });
    if (camCount  > 0) seedRows.push({ category: 'Video Surveillance',  endpoint: 'IP Camera',                       qty: camCount,  lf: camCount  * 200, cable: 'Cat 6A Plenum (CMP)',   color: 'Red',  tr: 'IDF → CAM',    terminate: 'RJ45 T568B · PoE+ certified', test: 'Fluke DSX-8000 · PoE verify', notes: 'Coordinate NVR port maps' });
    if (doorCount > 0) seedRows.push({ category: 'Access Control',      endpoint: 'Door Position / Reader',          qty: doorCount, lf: doorCount * 185, cable: 'Cat 6A Plenum (CMP)',   color: 'Red',  tr: 'IDF → Door',   terminate: 'RJ45 T568B · both ends',      test: 'Fluke DSX-8000 · LinkWare',   notes: 'Door hardware integration by others' });
    if (fiberStr  > 0) seedRows.push({ category: 'Backbone',            endpoint: 'MM/SM Fiber Backbone',            qty: 1,         lf: 350,             cable: 'OM4 12-strand armored', color: 'Aqua', tr: 'MDF ↔ IDF',    terminate: 'LC duplex · factory pre-term', test: 'OTDR · Tier 1 + 2 cert',     notes: `Consolidate per strand count (${fiberStr} strands total)` });
    for (const r of seedRows) rows.push({ ...r, idx: rowIdx++ });
  }

  const totalLF        = rows.reduce((s, r) => s + (r.lf || 0), 0);
  const totalEndpoints = rows.reduce((s, r) => s + (r.qty || 0), 0);
  const categories     = new Set(rows.map(r => r.category)).size;

  const summaryCard =
    '<div class="callout"><strong>Project Summary</strong><br>' +
    `MDF: <strong>${escapeHtml(mdf)}</strong> · ` +
    `IDF: <strong>${escapeHtml(idf)}</strong> · ` +
    `Total endpoints: <strong>${fmtInt(totalEndpoints)}</strong> · ` +
    `Estimated pull footage: <strong>${fmtInt(totalLF)} LF</strong>` +
    '</div>';

  const tableRows = rows.map(r => {
    const eachLf = r.qty ? Math.round(r.lf / r.qty) : r.lf;
    return '<tr>' +
      `<td>${r.idx}</td>` +
      `<td>${escapeHtml(r.category)}</td>` +
      `<td>${escapeHtml(r.endpoint)}</td>` +
      `<td class="qty">${fmtInt(r.qty)}</td>` +
      `<td class="qty">${fmtInt(eachLf)} · ${fmtInt(r.lf)}</td>` +
      `<td>${escapeHtml(r.cable)}</td>` +
      `<td>${escapeHtml(r.color)}</td>` +
      `<td>${escapeHtml(r.tr)}</td>` +
      `<td>${escapeHtml(r.terminate)}</td>` +
      `<td>${escapeHtml(r.test)}</td>` +
      `<td>${escapeHtml(r.notes)}</td>` +
    '</tr>';
  }).join('');

  const tableHtml =
    '<table>' +
      '<thead><tr>' +
        '<th style="width:32px;">#</th>' +
        '<th>Category</th>' +
        '<th>Endpoint Type</th>' +
        '<th class="qty">Qty</th>' +
        '<th class="qty">LF (ea · total)</th>' +
        '<th>Cable Spec</th>' +
        '<th>Jacket</th>' +
        '<th>TR / Path</th>' +
        '<th>Termination</th>' +
        '<th>Certification</th>' +
        '<th>Notes</th>' +
      '</tr></thead><tbody>' +
      tableRows +
      '<tr class="total-row">' +
        '<td colspan="3">TOTALS</td>' +
        `<td class="qty">${fmtInt(totalEndpoints)}</td>` +
        `<td class="qty">${fmtInt(totalLF)} LF</td>` +
        `<td colspan="6" style="text-align:right;color:${brand.colors.slate};">` +
          `Includes ${rows.length} cable runs across ${categories} categor${categories === 1 ? 'y' : 'ies'}` +
        '</td>' +
      '</tr>' +
    '</tbody></table>';

  const standardsBlock =
    '<h3>Standards &amp; Test Protocol</h3>' +
    '<ul>' +
      brand.standards.map(s => `<li>${escapeHtml(s)}</li>`).join('') +
    '</ul>' +
    '<div class="note"><strong>Certification:</strong> 100% of installed terminations tested with Fluke DSX-8000; LinkWare PDFs delivered at substantial completion. Any link failing Tier 1 is re-terminated or re-pulled at no cost to Owner.</div>';

  const labelingBlock =
    '<h3>Labeling Scheme (TIA-606-C Class 3)</h3>' +
    '<table>' +
      '<thead><tr><th>Location</th><th>Format</th><th>Example</th></tr></thead>' +
      '<tbody>' +
        '<tr><td>Outlet faceplate</td><td>[TR]-[Patch#]-[Port]</td><td>IDF2-A12-03</td></tr>' +
        '<tr><td>Cable jacket (both ends)</td><td>[TR]-[Patch#]-[Port]</td><td>IDF2-A12-03</td></tr>' +
        '<tr><td>Patch panel port</td><td>[TR]-[Patch#]-[Port]</td><td>IDF2-A12-03</td></tr>' +
        '<tr><td>Rack / cabinet face</td><td>[Site]-[TR]-[Rack#]</td><td>BLDG-IDF2-R01</td></tr>' +
        '<tr><td>Firestop penetration</td><td>[TR]-FS-[Seq]</td><td>IDF2-FS-007</td></tr>' +
      '</tbody>' +
    '</table>';

  const signoffBlock =
    '<h3>Field Sign-off</h3>' +
    '<table>' +
      '<thead><tr><th>Role</th><th>Name</th><th>Date</th><th>Signature</th></tr></thead>' +
      '<tbody>' +
        '<tr><td>Foreman (GCC)</td><td></td><td></td><td></td></tr>' +
        '<tr><td>Project Manager (GCC)</td><td></td><td></td><td></td></tr>' +
        '<tr><td>GC / Owner Rep</td><td></td><td></td><td></td></tr>' +
      '</tbody>' +
    '</table>';

  const body = summaryCard + '<h2>Cable Schedule</h2>' + tableHtml + standardsBlock + labelingBlock + signoffBlock;

  const html = gccHtmlShell(
    'Cable Schedule',
    body,
    {
      classification: 'INTERNAL',
      docKind:        'Structured Cabling · Pull Sheet · TIA-606-C Labeled',
      landscape:      true,
      projectLabel:   project
    },
    { brand, logos }
  );

  const filename = buildOutputFilename(
    { prefix: '', baseName: 'Cable Schedule', ext: '.pdf', internal: true },
    project
  );

  return { filename, html, rows, totalEndpoints, totalLF };
}
