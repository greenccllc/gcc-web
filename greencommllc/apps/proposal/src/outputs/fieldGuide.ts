/**
 * INTERNAL · Field Guide — on-site installer reference.
 *
 * Ported from `onExportFieldGuide` (bundle-builder.html line 19643).
 *
 * Print-and-fold document that rides in the job binder. Contains the
 * GCC non-negotiables, jacket-color convention, TR buildout spec,
 * daily pull rhythm, test protocol, and 24/7 escalation contact. The
 * scope-notes section pulls up to 12 session.lines as a quick field
 * reference so the foreman sees the bundle at a glance.
 */

import type { GccBrand, LogoMap } from '@models/brand';
import type { IntakeState, SessionState } from '@models/intake';
import {
  buildOutputFilename,
  cw,
  cwNum,
  escapeHtml,
  fmtInt,
  getProjectLabel
} from './_helpers';
import { gccHtmlShell } from './shellHtml';

export interface FieldGuideInput {
  intake: IntakeState;
  session: SessionState;
  brand: GccBrand;
  logos: LogoMap;
  projectLabel?: string;
}

export interface FieldGuideOutput {
  filename: string;
  html: string;
}

export function renderFieldGuide(inp: FieldGuideInput): FieldGuideOutput {
  const { intake, session, brand, logos } = inp;
  const project = inp.projectLabel ?? getProjectLabel(intake, session);
  const cw0 = intake.crosswalk;

  const mdf  = cw(cw0, 'mdf_count', 'TBD');
  const idf  = cw(cw0, 'idf_count', 'TBD');
  const gc   = cw(cw0, 'gc_company_name', 'Direct-to-Owner');
  const pm   = cw(cw0, 'project_manager_name', 'GCC Project Manager');
  const planFiles = intake.files.filter(f => f.class === 'plan');

  const dataDrops = cwNum(cw0, 'data_drops_count');
  const apCount   = cwNum(cw0, 'ap_count');
  const camCount  = cwNum(cw0, 'camera_count_commercial');
  const doorCount = cwNum(cw0, 'door_positions_count');

  const metaBlock =
    '<div class="gcc-meta"><dl>' +
      '<dt>Project</dt><dd>' + escapeHtml(project) + '</dd>' +
      '<dt>GC / Owner</dt><dd>' + escapeHtml(gc) + '</dd>' +
      '<dt>PM</dt><dd>' + escapeHtml(pm) + '</dd>' +
      '<dt>MDF / IDF</dt><dd>' + escapeHtml(mdf) + ' / ' + escapeHtml(idf) + '</dd>' +
      '<dt>Endpoints</dt><dd>' +
        fmtInt(dataDrops) + ' data · ' +
        fmtInt(apCount)   + ' AP · ' +
        fmtInt(camCount)  + ' cam · ' +
        fmtInt(doorCount) + ' door' +
      '</dd>' +
      '<dt>Plans on file</dt><dd>' +
        fmtInt(planFiles.length) + ' sheet set' + (planFiles.length === 1 ? '' : 's') +
      '</dd>' +
    '</dl></div>';

  const overview =
    '<h2>Section 1 &nbsp;How to Use This Field Guide</h2>' +
    '<p>This is the single-source reference the installing crew carries on site. Print it, fold it into the job binder, and reference it at pull-prep, mid-pull, termination, and close-out. If something in the field contradicts this guide, <strong>stop and call the PM</strong> before improvising — every deviation drives a change-order in or out of scope.</p>' +
    '<div class="callout"><strong>Non-negotiables on every GCC job:</strong><br>' +
      '• Cat 6A plenum (CMP) minimum for all horizontal data runs<br>' +
      '• Fluke DSX-8000 certification on 100% of terminations — no spot-check, no exceptions<br>' +
      '• TIA-606-C CLASS 3 labeling, both ends, machine-printed (no handwriting)<br>' +
      '• Service loops: 12 ft above TR, 3 ft at outlet<br>' +
      '• Firestop each penetration the day it\'s pulled — not at punchlist</div>';

  const colorStd =
    '<h2>Section 2 &nbsp;Cable Jacket Color Convention</h2>' +
    '<table>' +
      '<thead><tr><th>Category</th><th>Use Case</th><th>Jacket Color</th><th>Spec</th></tr></thead>' +
      '<tbody>' +
        '<tr><td>Data (A)</td>   <td>Workstations, VoIP, WAPs</td><td style="background:#1E88E5;color:#fff;font-weight:600;">Blue</td>   <td>Cat 6A Plenum CMP, 500 MHz</td></tr>' +
        '<tr><td>AV Coax (B)</td><td>Baseband / RF video</td>      <td style="background:#212121;color:#fff;font-weight:600;">Black</td>  <td>RG-6 Quad-Shield plenum</td></tr>' +
        '<tr><td>AV HDMI (C)</td><td>Digital display</td>           <td style="background:#F5F5F5;color:#212121;font-weight:600;border:1px solid #999;">White</td>  <td>Premium certified HDMI, plenum</td></tr>' +
        '<tr><td>Access (D)</td> <td>Card readers, IP cameras, door hw</td><td style="background:#E53935;color:#fff;font-weight:600;">Red</td>    <td>Cat 6A Plenum CMP</td></tr>' +
        '<tr><td>Fiber (E)</td>  <td>Backbone, inter-building</td>  <td style="background:#F57C00;color:#fff;font-weight:600;">Orange / Yellow</td><td>OM4 MM (orange), OS2 SM (yellow)</td></tr>' +
      '</tbody>' +
    '</table>' +
    `<p style="font-size:9pt;color:${brand.colors.slate};">Category letters above match the line-item categories in the Cable Schedule. If a jacket color on a reel doesn't match the category, <strong>do not pull it</strong> — call the PM.</p>`;

  const tr =
    '<h2>Section 3 &nbsp;TR / MDF / IDF Buildout</h2>' +
    '<table>' +
      '<thead><tr><th>Item</th><th>Specification</th></tr></thead>' +
      '<tbody>' +
        '<tr><td>Rack</td><td>2-post or 4-post per drawing · 42U standard · seismic-anchored if AHJ requires</td></tr>' +
        '<tr><td>Ladder rack</td><td>#12 AWG 6-rung above rack, anchored every 5 ft, bonded to TGB</td></tr>' +
        '<tr><td>Bonding</td><td>TIA-607-D · #6 AWG minimum to TGB · #2 AWG TGB to TMGB · 100 mΩ or less</td></tr>' +
        '<tr><td>UPS</td><td>Per drawing — coordinate receptacle + dedicated circuit with EC 2 weeks ahead</td></tr>' +
        '<tr><td>Patch panels</td><td>Category 6A angled 24-port · Panduit or CommScope · labeled both sides</td></tr>' +
        '<tr><td>Cable mgmt</td><td>Horizontal 2U every 24 ports · vertical full height · D-rings on rear</td></tr>' +
        '<tr><td>Fiber enclosure</td><td>1U or 2U LC-LC · pre-terminated modules · splice tray only if drawing calls for field splice</td></tr>' +
      '</tbody>' +
    '</table>';

  const sequence =
    '<h2>Section 4 &nbsp;Pull Sequence &amp; Daily Rhythm</h2>' +
    '<ol>' +
      '<li><strong>Start-of-day:</strong> Verify PPE, walk the pull path, confirm JHA signed, check ceiling grid status from GC (open ceiling = pull · closed ceiling = stop).</li>' +
      '<li><strong>Pre-pull:</strong> Pre-label cable reels with TR origin. Stage J-hooks and velcro every 4-5 ft max. Confirm firestop material is on site.</li>' +
      '<li><strong>Pull:</strong> No kinks · no sharp bends · no zip-ties at cable level · no running parallel to electrical within 12" · cross at 90°.</li>' +
      '<li><strong>Mid-pull check:</strong> Every 500 ft, toner-test and log on run sheet. Any failed link gets flagged <em>before</em> termination.</li>' +
      '<li><strong>Terminate:</strong> T568B both ends · maintain pair twist to within 0.5" of jack · IDC tool, not pliers.</li>' +
      '<li><strong>Certify:</strong> Fluke DSX-8000 · save to project .flw file · upload to shared drive end-of-day.</li>' +
      '<li><strong>Firestop:</strong> 3M CP-25WB+ or Hilti CP-606 · photograph each penetration with TR-FS-xxx label visible.</li>' +
      '<li><strong>End-of-day:</strong> Secure materials, lock TR, update installed-count on job board, email PM day sheet.</li>' +
    '</ol>';

  const lineNotes = session.lines.slice(0, 12);
  const scopeBlock =
    '<h2>Section 5 &nbsp;Scope Notes from Extraction</h2>' +
    (lineNotes.length
      ? '<ul>' + lineNotes.map(ln => {
          const nm = escapeHtml(ln.name || '(unnamed)');
          const body = ln.notes
            ? escapeHtml(ln.notes)
            : 'see line detail · qty ' + fmtInt(ln.qty || 0);
          return `<li><strong>${nm}:</strong> ${body}</li>`;
        }).join('') + '</ul>'
      : '<p style="color:#999;">No line items populated yet. Run extraction and refine the bundle to pre-populate this section.</p>');

  const testProcedure =
    '<h2>Section 6 &nbsp;Test &amp; Certification Procedure</h2>' +
    '<p>Run Tier 1 permanent-link tests on every installed horizontal. Fiber runs get Tier 1 insertion-loss <em>and</em> Tier 2 OTDR traces. Any link that fails gets re-terminated once; if it fails a second time it\'s re-pulled. No pass-through, no "close enough."</p>' +
    '<h3>Pass criteria (Cat 6A)</h3>' +
    '<ul>' +
      '<li>NEXT margin: ≥ 3.0 dB</li>' +
      '<li>Return loss margin: ≥ 2.0 dB</li>' +
      '<li>Propagation delay ≤ 555 ns @ 100 m</li>' +
      '<li>Insertion loss within Category 6A limits at all frequencies</li>' +
    '</ul>' +
    '<h3>Pass criteria (OM4 fiber)</h3>' +
    '<ul>' +
      '<li>Insertion loss ≤ 3.0 dB per connector · ≤ 0.75 dB per splice</li>' +
      '<li>OTDR reflectance: ≤ -35 dB UPC · ≤ -55 dB APC</li>' +
      '<li>Length matches drawing ± 3 meters</li>' +
    '</ul>';

  const escalation =
    '<h2>Section 7 &nbsp;Escalation &amp; Safety</h2>' +
    '<table>' +
      '<thead><tr><th>Situation</th><th>Action</th><th>Escalate To</th></tr></thead>' +
      '<tbody>' +
        '<tr><td>Unexpected asbestos, lead, or hazmat in pull path</td><td>STOP. Evacuate. Do not disturb.</td><td>GC super + GCC PM immediately</td></tr>' +
        '<tr><td>Live electrical in suspected dead pathway</td><td>STOP. LOTO. Confirm with EC.</td><td>GC super + GCC PM</td></tr>' +
        '<tr><td>Drawing/field mismatch &gt; 5 drops</td><td>Document with photo, do not field-improvise.</td><td>GCC PM before EOD</td></tr>' +
        '<tr><td>Architectural rework blocking TR</td><td>Note on day sheet, reschedule.</td><td>GCC PM day-of</td></tr>' +
        `<tr><td>Injury (any severity)</td><td>Render aid. Call 911 if needed. Secure scene.</td><td>GCC PM + ${escapeHtml(brand.owner.full_name)} immediately</td></tr>` +
      '</tbody>' +
    '</table>' +
    `<div class="note"><strong>24/7 escalation:</strong> ${escapeHtml(brand.owner.full_name)} — ${escapeHtml(brand.owner.phone_fmt)} · ${escapeHtml(brand.owner.email)}</div>`;

  const body = metaBlock + overview + colorStd + tr + sequence + scopeBlock + testProcedure + escalation;

  const html = gccHtmlShell(
    'Field Guide',
    body,
    {
      classification: 'INTERNAL',
      docKind: 'GCC LV Div 27-28 · On-Site Installer Reference',
      projectLabel: project
    },
    { brand, logos }
  );

  const filename = buildOutputFilename(
    { prefix: '', baseName: 'Field Guide', ext: '.pdf', internal: true },
    project
  );

  return { filename, html };
}
