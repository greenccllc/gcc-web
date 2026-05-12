/**
 * 03 · Bid Proposal — Section 1–Section 8 RFP-formal doc.
 *
 * Ported from `onExportBidProposal` (bundle-builder.html line 20429).
 *
 * Structure (per 3-Intake/1-Bids/Format Guide.md):
 *   §1  Base Bid — 3-bucket (Materials / Labor / Services) + endpoint grid
 *   §2  Schedule of Values — 11 rows, sums exactly to Base Bid
 *   §3  Quantities & Allowances — basis-of-bid endpoints + included upgrades
 *   §4  Alternates — ADDs A1–A4, DEDUCTs D1–D2
 *   §5  Unit Prices — U1–U10, supply+install
 *   §6  Commercial Terms — 9 clauses (billing → precedence)
 *   §7  Exclusions — standard A–K library
 *   §8  Acceptance — 2-column signature block
 *
 * Every section starts on a fresh page (avoid-break-inside per Format Guide).
 */

import type { GccBrand, LogoMap } from '@models/brand';
import type { IntakeState, SessionState } from '@models/intake';
import {
  buildOutputFilename,
  buildRecipientBlock,
  cw,
  cwNum,
  endpointSummaryGrid,
  escapeHtml,
  fmtCurrency,
  fmtCurrencyRound,
  fmtInt,
  getOrSynthPropnum,
  getProjectLabel,
  inferProposalRoute
} from './_helpers';
import { gccHtmlShell } from './shellHtml';
import {
  computeTotals,
  DEFAULT_TOTALS_CONFIG,
  type ComputeTotalsConfig
} from '@pricing/computeTotals';

export interface BidProposalInput {
  intake: IntakeState;
  session: SessionState;
  brand: GccBrand;
  logos: LogoMap;
  projectLabel?: string;
  totalsConfig?: ComputeTotalsConfig;
}

export interface BidProposalOutput {
  filename: string;
  html: string;
  summary: {
    baseBid: number;
    endpointsTotal: number;
    materials: number;
    labor: number;
    services: number;
  };
}

/**
 * Split the turnkey sell price into 3 buckets (materials / labor / services)
 * in proportion to the underlying line items' sale contribution. Legacy
 * `_bucketTotals()` equivalent — see bundle-builder.html line ~20116.
 */
function bucketTotals(
  session: SessionState,
  baseBid: number
): { materials: number; labor: number; services: number } {
  let ms = 0, lb = 0, sv = 0;
  for (const ln of session.lines) {
    const contribution = ln.qty * ln.saleEach;
    if (ln.src === 'eq' || ln.src === 'ma') ms += contribution;
    else if (ln.src === 'sv')               sv += contribution;
    else                                     lb += contribution;
  }
  // Add labor contribution (hours × rate proxy via line sale already included above
  // for 'eq'/'ma' items whose saleEach is materials-only; labor lines are src='sv'
  // in the legacy mapping). To match legacy behavior, we simply scale proportionally
  // to the turnkey base bid:
  const lineSum = ms + lb + sv;
  if (lineSum <= 0) {
    // Fallback split when there are no lines — weight-of-guide default.
    return { materials: baseBid * 0.55, labor: baseBid * 0.35, services: baseBid * 0.10 };
  }
  const kMs = ms / lineSum;
  const kLb = lb / lineSum;
  // Services absorbs rounding so the three sum to baseBid exactly.
  const matRound = Math.round(baseBid * kMs * 100) / 100;
  const labRound = Math.round(baseBid * kLb * 100) / 100;
  const svRound  = Math.round((baseBid - matRound - labRound) * 100) / 100;
  return { materials: matRound, labor: labRound, services: svRound };
}

export function renderBidProposal(inp: BidProposalInput): BidProposalOutput {
  const { intake, session, brand, logos } = inp;
  const project   = inp.projectLabel ?? getProjectLabel(intake, session);
  const rcp       = buildRecipientBlock(intake);
  const route     = inferProposalRoute(intake);
  const totalsCfg = inp.totalsConfig ?? DEFAULT_TOTALS_CONFIG;
  const cw0       = intake.crosswalk;

  // ───── Endpoint counts (used across Section 1, 3, 5) ─────
  const dd = cwNum(cw0, 'data_drops_count');
  const ap = cwNum(cw0, 'ap_count');
  const ca = cwNum(cw0, 'camera_count_commercial');
  const dr = cwNum(cw0, 'door_positions_count');
  const fb = cwNum(cw0, 'fiber_strands_count');
  const billableEndpoints = dd + ap + ca + dr;
  const endpointsTotal    = billableEndpoints + (fb > 0 ? 1 : 0);

  // ───── Totals & bucket split ─────
  const totals  = computeTotals(session.lines, billableEndpoints, totalsCfg);
  const baseBid = totals.grand;
  const bk      = bucketTotals(session, baseBid);

  const propNum = getOrSynthPropnum(session, route);
  const today   = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  const bidDue = cw(cw0, 'bid_due_date', 'Per GC schedule');

  // ───── Section 2 SOV — 11 rows, normalized to sum exactly to baseBid ─────
  const sovDist: ReadonlyArray<{ lbl: string; share: number }> = [
    { lbl: 'General Conditions (mobilization, permits, project management)', share: 0.06 },
    { lbl: 'Pathways & Rough-In Coordination',                               share: 0.04 },
    { lbl: 'Copper Horizontal Cabling (Cat 6A plenum)',                      share: 0.28 },
    { lbl: 'Fiber Backbone Cabling (OM4 / OS2 per spec)',                    share: 0.08 },
    { lbl: 'MDF / IDF Racks, Patch Panels, Cable Management',                share: 0.10 },
    { lbl: 'Termination, Cleaning & Fluke DSX-8000 Certification',           share: 0.16 },
    { lbl: 'Wireless Access Point Infrastructure',                           share: 0.05 },
    { lbl: 'IP Video Surveillance Cabling & Termination',                    share: 0.06 },
    { lbl: 'Access Control Cabling (composite per door)',                    share: 0.05 },
    { lbl: 'TIA-606-C Labeling & Administration',                            share: 0.05 },
    { lbl: 'Close-Out Documentation, As-Builts & Warranty',                  share: 0.07 }
  ];
  const sovSum = sovDist.reduce((s, r) => s + r.share, 0);
  let sovRunning = 0;
  const sovRows = sovDist.map((r, i) => {
    const norm = r.share / sovSum;
    let value = Math.round(baseBid * norm * 100) / 100;
    sovRunning += value;
    if (i === sovDist.length - 1) {
      value = Math.round((baseBid - (sovRunning - value)) * 100) / 100;
    }
    return { num: String(i + 1).padStart(2, '0'), lbl: r.lbl, value };
  });

  // ───── Canonical unit prices ─────
  const unitPrices = [
    { id: 'U1',  desc: 'Cat 6A plenum data drop — add (supply + install, 70\' avg)',         uom: 'EA', price:  475 },
    { id: 'U2',  desc: 'Cat 6A plenum data drop — delete (credit for unrun drop)',           uom: 'EA', price: -325 },
    { id: 'U3',  desc: 'Cat 6A plenum camera drop — add (includes pendant/wall-mount prep)', uom: 'EA', price:  525 },
    { id: 'U4',  desc: 'Cat 6A plenum WAP drop — add (includes PoE+ capable termination)',   uom: 'EA', price:  495 },
    { id: 'U5',  desc: 'Access-control composite door cable — add (per door opening)',       uom: 'EA', price:  685 },
    { id: 'U6',  desc: 'Fiber strand termination — single-mode LC/UPC (per strand)',         uom: 'EA', price:   42 },
    { id: 'U7',  desc: 'Fiber strand termination — multimode LC/UPC (per strand)',           uom: 'EA', price:   38 },
    { id: 'U8',  desc: 'Core drill 2" conduit sleeve (above ceiling / between TR)',          uom: 'EA', price:  165 },
    { id: 'U9',  desc: 'Firestop penetration per UL-listed assembly (2" diameter)',          uom: 'EA', price:   58 },
    { id: 'U10', desc: 'Overtime / after-hours labor premium (over straight-time rate)',     uom: 'HR', price:   45 }
  ] as const;

  // ───── Section 4 alternates ─────
  const alternates = [
    {
      id: 'A1', type: 'ADD',
      desc: 'Performance & Payment Bond (1.5% of Base Bid)',
      value: baseBid > 0 ? `ADD ${fmtCurrency(baseBid * 0.015)}` : 'ADD — TBD'
    },
    { id: 'A2', type: 'ADD',    desc: 'After-hours / weekend labor (prorated by hours in Section 5 U10)',                              value: 'ADD — prorated per U10' },
    { id: 'A3', type: 'ADD',    desc: 'Temporary construction Wi-Fi (temp WAPs + cellular backhaul through substantial completion)',   value: 'ADD — TBD scope-specific' },
    { id: 'A4', type: 'ADD',    desc: 'ERCES / BDA / DAS public-safety radio infrastructure',                                          value: 'ADD — Div 28 life-safety, scope-specific' },
    { id: 'D1', type: 'DEDUCT', desc: 'Deflate horizontal cabling from Cat 6A plenum to Cat 6 plenum',                                 value: 'NO CHANGE — Cat 6A is GCC baseline; see Section 3.2 Included Upgrades' },
    { id: 'D2', type: 'DEDUCT', desc: 'Omit TIA-606-C barcode-backed labeling (revert to hand-written)',                               value: 'NO CHANGE — CLASS 3 labeling is GCC baseline; see Section 3.2' }
  ] as const;

  // ───── Section 7 exclusions ─────
  const exclusions: ReadonlyArray<readonly [string, string]> = [
    ['A', 'Fire Alarm & Intrusion Detection (Div 28 life-safety carve-outs)'],
    ['B', 'ERCES / BDA / DAS public-safety radio systems (see Section 4 Alt A4)'],
    ['C', 'OFOI trailer Wi-Fi access points, temporary construction Wi-Fi (see Section 4 Alt A3)'],
    ['D', 'Lighting controls, Building Management Systems (BMS), HVAC integration'],
    ['E', 'Conduit, J-hooks, sleeves, and fire-stop above accessible ceilings (by Electrical Contractor)'],
    ['F', '120 V / 208 V power to rack and IDF locations (by Electrical Contractor)'],
    ['G', 'Demolition, ACT ceiling removal / replacement, concrete saw-cutting (by General Contractor)'],
    ['H', 'Patching, painting, and drywall restoration after cable pathways (by General Contractor)'],
    ['I', 'Performance / payment bonds beyond standard filing fees (see Section 4 Alt A1)'],
    ['J', 'Engineered RCDD-stamped designs or re-designs (unless itemized in Section 2 SOV)'],
    ['K', 'After-hours, weekend, or holiday labor premium (see Section 4 Alt A2 and Section 5 U10)']
  ];

  // ───── Proposal meta block ─────
  const proposalMeta =
    '<div class="gcc-meta"><dl>' +
      `<dt>Proposal #</dt><dd>${escapeHtml(propNum)}</dd>` +
      `<dt>Issued</dt><dd>${escapeHtml(today)}</dd>` +
      `<dt>Project</dt><dd>${escapeHtml(project)}</dd>` +
      `<dt>Bid Due</dt><dd>${escapeHtml(bidDue)}</dd>` +
      `<dt>To</dt><dd>${escapeHtml(rcp.company || rcp.contact || '')}</dd>` +
      '<dt>Firm For</dt><dd>60 days from bid date</dd>' +
    '</dl></div>';

  // ───── Section 1: Base Bid ─────
  const sec1 =
    '<h2>Section 1 &nbsp;Base Bid</h2>' +
    `<p>GCC proposes a <strong>lump-sum, turn-key</strong> bid for the Division 27 (Communications) and Division 28 (Electronic Safety &amp; Security) scope at <strong>${escapeHtml(project)}</strong>. The Base Bid covers all labor, material, supervision, certification, and close-out documentation required for a complete and working installation per contract documents, specifications, and addenda on file through the bid date.</p>` +
    endpointSummaryGrid(intake) +
    '<h3>1.1 &nbsp;Base Bid Summary — 3-Bucket Breakdown</h3>' +
    '<table style="max-width:5.5in;">' +
      '<thead><tr><th>Bucket</th><th class="num">Value</th></tr></thead>' +
      '<tbody>' +
        `<tr><td>Materials (hardware, cable, racks, patch panels, faceplates)</td><td class="money">${fmtCurrency(bk.materials)}</td></tr>` +
        `<tr><td>Labor (termination, certification, pathway coordination, management)</td><td class="money">${fmtCurrency(bk.labor)}</td></tr>` +
        `<tr><td>Services (mobilization, close-out documentation, warranty support)</td><td class="money">${fmtCurrency(bk.services)}</td></tr>` +
        `<tr class="total-row"><td><strong>Lump-Sum Base Bid — firm 60 days</strong></td><td class="money"><strong>${fmtCurrency(baseBid)}</strong></td></tr>` +
      '</tbody>' +
    '</table>' +
    `<p style="font-size:9pt;color:${brand.colors.slate};"><em>Bucket values are proportional to the take-off and always sum to the Base Bid. Commercial terms governing this price are in Section 6; exclusions are in Section 7.</em></p>`;

  // ───── Section 2: SOV ─────
  const sec2 =
    '<div class="pg-break"></div>' +
    '<h2>Section 2 &nbsp;Schedule of Values</h2>' +
    '<p>Values below are the agreed Schedule of Values (SOV) for progress billings. Monthly AIA G702 / G703 applications will draw against these line items. The eleven rows sum exactly to the Section 1 Base Bid.</p>' +
    '<table>' +
      '<thead><tr><th style="width:48px;">#</th><th>Work Item</th><th class="num" style="width:115px;">Value</th></tr></thead>' +
      '<tbody>' +
        sovRows.map(r =>
          `<tr><td>${escapeHtml(r.num)}</td><td>${escapeHtml(r.lbl)}</td><td class="money">${fmtCurrency(r.value)}</td></tr>`
        ).join('') +
        `<tr class="total-row"><td></td><td><strong>SOV Total — equals Section 1 Base Bid</strong></td><td class="money"><strong>${fmtCurrency(baseBid)}</strong></td></tr>` +
      '</tbody>' +
    '</table>';

  // ───── Section 3: Quantities & Allowances ─────
  const sec3 =
    '<div class="pg-break"></div>' +
    '<h2>Section 3 &nbsp;Quantities &amp; Allowances</h2>' +
    '<h3>3.1 &nbsp;Basis-of-Bid Quantities</h3>' +
    '<p>The Base Bid in Section 1 is built from the following endpoint count taken from the most recent drawing set and RFP package on file.</p>' +
    '<table style="max-width:5.5in;">' +
      '<thead><tr><th>Endpoint Type</th><th class="num">Quantity</th><th>Basis</th></tr></thead>' +
      '<tbody>' +
        `<tr><td>Cat 6A Data Outlets</td><td class="num">${fmtInt(dd)}</td><td>Horizontal work-area outlets per T-sheets</td></tr>` +
        `<tr><td>Wireless Access Point Drops</td><td class="num">${fmtInt(ap)}</td><td>Coordinated with RF heat-map / spec</td></tr>` +
        `<tr><td>IP Camera Drops</td><td class="num">${fmtInt(ca)}</td><td>Per Div 28 camera schedule / plans</td></tr>` +
        `<tr><td>Access-Control Door Positions</td><td class="num">${fmtInt(dr)}</td><td>Composite cable per door opening</td></tr>` +
        `<tr><td>Fiber Backbone Strands</td><td class="num">${fmtInt(fb)}</td><td>OM4 / OS2 per project specification</td></tr>` +
        `<tr class="total-row"><td><strong>Total Endpoints</strong></td><td class="num"><strong>${fmtInt(endpointsTotal)}</strong></td><td>${fmtInt(billableEndpoints)} qualify for per-drop turnkey band</td></tr>` +
      '</tbody>' +
    '</table>' +
    '<h3>3.2 &nbsp;Included Upgrades (Above Drawing Minimum)</h3>' +
    '<p>The following are <strong>included in the Base Bid at no additional charge</strong>, even where the specification permits lower-tier alternatives:</p>' +
    '<ul>' +
      brand.includedUpgrades.map(s => `<li>${escapeHtml(s)}</li>`).join('') +
    '</ul>' +
    '<div class="callout"><strong>Cat 6A plenum baseline.</strong> We do not bid to Cat 6 even where drawings allow it. This is the single most consistent delta between a GCC bid and a value-engineered competitor, and it is not negotiable downward — see Section 4 Alt D1.</div>' +
    '<h3>3.3 &nbsp;Owner-Direct Allowances</h3>' +
    '<p>No Owner-direct allowances are included in the Base Bid unless explicitly line-itemed above. Allowances, if added by addendum or change order, are managed per Section 6.2 Change Orders.</p>';

  // ───── Section 4: Alternates ─────
  const sec4 =
    '<div class="pg-break"></div>' +
    '<h2>Section 4 &nbsp;Alternates</h2>' +
    '<p>Price impact of the following alternates, evaluated against the Section 1 Base Bid. ADD alternates increase the contract sum; DEDUCT alternates decrease it (or are held as NO CHANGE where GCC declines to deflate a baseline specification).</p>' +
    '<table>' +
      '<thead><tr><th style="width:54px;">Alt</th><th style="width:70px;">Type</th><th>Description</th><th class="num" style="width:160px;">Impact</th></tr></thead>' +
      '<tbody>' +
        alternates.map(a =>
          '<tr>' +
            `<td>${escapeHtml(a.id)}</td>` +
            `<td>${escapeHtml(a.type)}</td>` +
            `<td>${escapeHtml(a.desc)}</td>` +
            `<td class="money">${escapeHtml(a.value)}</td>` +
          '</tr>'
        ).join('') +
      '</tbody>' +
    '</table>' +
    `<p style="font-size:9pt;color:${brand.colors.slate};"><em>Alternates are priced firm for 60 days alongside the Base Bid. Acceptance requires written notice prior to contract execution.</em></p>`;

  // ───── Section 5: Unit Prices ─────
  const sec5 =
    '<div class="pg-break"></div>' +
    '<h2>Section 5 &nbsp;Unit Prices</h2>' +
    '<p>Unit prices below govern additions and deletions to the Base Bid via written change order per Section 6.2. All prices are <strong>supply and install</strong>, complete and tested to GCC baseline (see Section 3.2).</p>' +
    '<table>' +
      '<thead><tr><th style="width:54px;">#</th><th>Description (Supply + Install)</th><th style="width:60px;">UOM</th><th class="num" style="width:110px;">Unit Price</th></tr></thead>' +
      '<tbody>' +
        unitPrices.map(u =>
          '<tr>' +
            `<td>${escapeHtml(u.id)}</td>` +
            `<td>${escapeHtml(u.desc)}</td>` +
            `<td>${escapeHtml(u.uom)}</td>` +
            `<td class="money">${fmtCurrency(u.price)}</td>` +
          '</tr>'
        ).join('') +
      '</tbody>' +
    '</table>' +
    `<p style="font-size:9pt;color:${brand.colors.slate};"><em>Unit prices are firm for the duration of the contract. Quantities triggered by unsupplied scope revisions accumulate against the Section 6.2 change-order cap.</em></p>`;

  // ───── Section 6: Commercial Terms ─────
  const sec6 =
    '<div class="pg-break"></div>' +
    '<h2>Section 6 &nbsp;Commercial Terms</h2>' +

    '<div class="clause"><span class="clause-num">6.1</span><strong>Billing &amp; Payment.</strong> Monthly progress billings on AIA G702 / G703 application-for-payment forms. Net 30 days from application approval. Retainage capped at five percent (5%), released at substantial completion upon acceptance of close-out documentation per Section 6.3. Prompt-pay terms: a two percent (2%) discount is offered for payment within fifteen (15) days of application approval.</div>' +

    '<div class="clause"><span class="clause-num">6.2</span><strong>Change Orders.</strong> All changes to scope or pricing shall be documented on AIA G701 Change Order form and fully executed prior to commencement of changed work. Change-order pricing applies GCC\'s standard markups of fifteen percent (15%) on material cost and ten percent (10%) on labor cost. Field directives issued without a fully executed change order shall be tracked on a T&amp;M basis with markups applied at invoice.</div>' +

    '<div class="clause"><span class="clause-num">6.3</span><strong>Milestones &amp; Schedule.</strong></div>' +
    '<table style="max-width:6.0in;">' +
      '<thead><tr><th>Milestone</th><th>Target</th></tr></thead>' +
      '<tbody>' +
        `<tr><td>Contract execution</td><td>${escapeHtml(cw(cw0, 'contract_target_date', 'Per GC / Owner schedule'))}</td></tr>` +
        '<tr><td>Shop drawings &amp; submittals delivered</td><td>5 business days after award</td></tr>' +
        `<tr><td>Mobilization on site</td><td>${escapeHtml(cw(cw0, 'mobilization_date', '5 business days after executed contract'))}</td></tr>` +
        '<tr><td>Rough-in complete</td><td>Per construction schedule (T-sheets)</td></tr>' +
        '<tr><td>Termination &amp; Fluke certification window</td><td>2-week window prior to substantial completion</td></tr>' +
        `<tr><td>Substantial completion</td><td>${escapeHtml(cw(cw0, 'substantial_completion', 'Per contract documents'))}</td></tr>` +
        '<tr><td>Close-out documentation delivered</td><td>10 business days after substantial completion</td></tr>' +
      '</tbody>' +
    '</table>' +

    '<div class="clause"><span class="clause-num">6.4</span><strong>Warranty.</strong> Lifetime workmanship warranty on all GCC-performed labor. Twenty-five (25) year manufacturer components warranty on Panduit / CommScope structured cabling system. Two (2) AMC revisits within ninety (90) days of substantial completion at no additional charge. Warranty period runs from the date of substantial completion as documented on AIA G704.</div>' +

    '<div class="clause"><span class="clause-num">6.5</span><strong>Risk &amp; Insurance.</strong> GCC maintains the following insurance coverages, with Certificate of Insurance and Additional Insured endorsement available upon award: Commercial General Liability — $1,000,000 per occurrence / $2,000,000 aggregate; Automobile Liability — $1,000,000 combined single limit; Workers\' Compensation &amp; Employers\' Liability per Missouri statutory minimums; Umbrella Liability — $5,000,000 per occurrence.</div>' +

    '<div class="clause"><span class="clause-num">6.6</span><strong>Governing Law &amp; Venue.</strong> This agreement is governed by the laws of the State of Missouri. Venue for any dispute arising hereunder shall lie exclusively in the Circuit Court of Jackson County, Missouri, or the U.S. District Court for the Western District of Missouri.</div>' +

    '<div class="clause"><span class="clause-num">6.7</span><strong>Termination.</strong> <em>For convenience</em> — either party may terminate upon seven (7) days written notice; GCC shall be compensated for all work completed to the date of termination plus demobilization costs and standing commitments (equipment on order, crew re-allocation). <em>For cause</em> — termination shall be preceded by ten (10) days written notice and opportunity to cure. Default by the Owner/GC in payment beyond thirty (30) days past due is cause for suspension of work upon five (5) days written notice.</div>' +

    '<div class="clause"><span class="clause-num">6.8</span><strong>Mechanic\'s Lien.</strong> GCC expressly preserves its mechanic\'s lien rights under Missouri Revised Statutes Chapter 429. No lien waiver shall be executed prior to receipt of cleared funds. Partial lien waivers shall be tendered only for the value billed in the related pay application.</div>' +

    '<div class="clause"><span class="clause-num">6.9</span><strong>Order of Precedence.</strong> In the event of conflict among the contract documents, the following order of precedence shall govern: (1) this proposal and any attached or incorporated addenda; (2) fully-executed change orders; (3) the prime contract between GCC and the Owner/GC; (4) the project specifications; (5) the project drawings. More stringent provisions shall govern over less stringent.</div>';

  // ───── Section 7: Exclusions ─────
  const sec7 =
    '<div class="pg-break"></div>' +
    '<h2>Section 7 &nbsp;Exclusions</h2>' +
    '<p>The following scope is <strong>expressly excluded</strong> from the Base Bid. Where a related Alternate or Unit Price exists, it is cross-referenced.</p>' +
    '<table>' +
      '<thead><tr><th style="width:40px;">#</th><th>Excluded Scope</th></tr></thead>' +
      '<tbody>' +
        exclusions.map(e =>
          '<tr>' +
            `<td>${escapeHtml(e[0])}</td>` +
            `<td>${escapeHtml(e[1])}</td>` +
          '</tr>'
        ).join('') +
      '</tbody>' +
    '</table>' +
    `<p style="font-size:9pt;color:${brand.colors.slate};"><em>Additional scope-specific exclusions, if any, are itemized in the companion Section 5 Qualifications document.</em></p>`;

  // ───── Section 8: Acceptance ─────
  const sec8 =
    '<div class="pg-break"></div>' +
    '<h2>Section 8 &nbsp;Acceptance</h2>' +
    `<p>This proposal, together with the companion 04 Statement of Work, 05 Qualifications, and 06 Standards documents, constitutes GCC's complete response to the ${escapeHtml(rcp.headline.toLowerCase())} for <strong>${escapeHtml(project)}</strong>. Acceptance below binds the parties to the Base Bid of <strong>${fmtCurrencyRound(baseBid)}</strong>, the Schedule of Values in Section 2, and the Commercial Terms in Section 6. Alternates and Unit Prices are binding for 60 days from the bid date.</p>` +
    '<div class="sig-grid avoid-break">' +
      '<div class="sig-col">' +
        '<div class="lbl">Submitted by — Green Communications Contracting LLC</div>' +
        `<div>Name: ${escapeHtml(brand.owner.full_name)}</div>` +
        `<div>Title: ${escapeHtml(brand.owner.title)}</div>` +
        '<div style="margin-top:14pt;">Signature: _____________________________</div>' +
        '<div style="margin-top:10pt;">Date: ____________________</div>' +
      '</div>' +
      '<div class="sig-col">' +
        `<div class="lbl">Accepted by — ${escapeHtml(rcp.role)}</div>` +
        `<div>Name: ${escapeHtml(rcp.contact || '')}</div>` +
        `<div>Company: ${escapeHtml(rcp.company || '')}</div>` +
        '<div style="margin-top:14pt;">Signature: _____________________________</div>' +
        '<div style="margin-top:10pt;">Date: ____________________</div>' +
      '</div>' +
    '</div>' +
    `<p style="margin-top:18pt;font-size:9pt;color:${brand.colors.slate};">Questions or clarifications prior to execution — direct line ${escapeHtml(brand.owner.phone_fmt)} or ${escapeHtml(brand.owner.email)}.</p>`;

  const body = proposalMeta + sec1 + sec2 + sec3 + sec4 + sec5 + sec6 + sec7 + sec8;

  const html = gccHtmlShell(
    'Bid Proposal',
    body,
    {
      classification: 'CLIENT',
      docKind:        '03 · Bid Proposal',
      subline:        'Section 1 Base Bid · Section 2 Schedule of Values · Section 3 Quantities & Allowances · Section 4 Alternates · Section 5 Unit Prices · Section 6 Commercial Terms · Section 7 Exclusions · Section 8 Acceptance',
      projectLabel:   project
    },
    { brand, logos }
  );

  const filename = buildOutputFilename(
    { prefix: '03', baseName: 'Bid Proposal', ext: '.pdf' },
    project
  );

  return {
    filename,
    html,
    summary: {
      baseBid,
      endpointsTotal,
      materials: bk.materials,
      labor:     bk.labor,
      services:  bk.services
    }
  };
}
