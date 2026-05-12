/**
 * 01 · Cover Letter — first page of the customer-facing proposal packet.
 *
 * Ported from `onExportCoverLetter` (bundle-builder.html line 20166).
 *
 * Mode-aware body copy:
 *   - bid         — GC-facing subcontractor bid (Panduit/CommScope warranty, AMC revisits)
 *   - residential — homeowner-facing, conversational, 30-day price hold
 *   - owner       — direct-to-owner quote, 60-day hold
 *
 * Includes a Mermaid Gantt of project phases that renders when the doc is
 * opened in a browser and is inert in Word / PDF viewers.
 */

import type { GccBrand, LogoMap } from '@models/brand';
import type { IntakeState, SessionState } from '@models/intake';
import {
  buildRecipientBlock,
  cw,
  escapeHtml,
  getOrSynthPropnum,
  getProjectLabel,
  inferProposalRoute,
  mermaidBlock,
  signatureHtml,
  buildOutputFilename
} from './_helpers';
import { gccHtmlShell } from './shellHtml';

export interface CoverLetterInput {
  intake: IntakeState;
  session: SessionState;
  brand: GccBrand;
  logos: LogoMap;
  /** Optional project label override. Defaults to intake crosswalk/session meta. */
  projectLabel?: string;
}

export interface CoverLetterOutput {
  filename: string;
  html: string;
}

export function renderCoverLetter(inp: CoverLetterInput): CoverLetterOutput {
  const { intake, session, brand, logos } = inp;
  const project = inp.projectLabel ?? getProjectLabel(intake, session);
  const rcp     = buildRecipientBlock(intake);
  const route   = inferProposalRoute(intake);
  const cw0     = intake.crosswalk;

  const bidDue = cw(cw0, 'bid_due_date', '');
  const today  = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  const propNum = getOrSynthPropnum(session, route);

  // ───── Recipient + date + RE line ─────
  const recipientBlock =
    '<div style="margin:0 0 18px;">' +
      `<div>${escapeHtml(today)}</div>` +
      '<div style="margin-top:10px;">' +
        (rcp.contact ? `<strong>${escapeHtml(rcp.contact)}</strong><br>` : '') +
        (rcp.company ? `${escapeHtml(rcp.company)}<br>` : '') +
        (rcp.address ? `${escapeHtml(rcp.address)}<br>` : '') +
        (rcp.phone   ? `${escapeHtml(rcp.phone)}<br>`   : '') +
        (rcp.email   ? `${escapeHtml(rcp.email)}`       : '') +
      '</div>' +
      `<div style="margin-top:12px;font-size:9pt;color:${brand.colors.slate};">` +
        `<strong>RE:</strong> ${escapeHtml(rcp.headline)} — ${escapeHtml(project)}<br>` +
        `<strong>Proposal #:</strong> ${escapeHtml(propNum)}` +
        (bidDue ? ` &nbsp;·&nbsp; <strong>Bid due:</strong> ${escapeHtml(bidDue)}` : '') +
      '</div>' +
    '</div>';

  // ───── Body copy by recipient mode ─────
  let body = '';
  if (rcp.mode === 'bid') {
    body =
      `<p>${escapeHtml(rcp.salutation)}</p>` +
      `<p>Thank you for the invitation to bid low-voltage structured cabling and electronic safety systems on <strong>${escapeHtml(project)}</strong>. GCC LLC is pleased to submit this proposal for Division 27 (Communications) and Division 28 (Electronic Safety &amp; Security) scope.</p>` +
      '<p>Our bid is built from a full take-off of the contract documents, an item-level cable schedule, and a weekly crew-loaded labor plan — all generated against the most current drawing set on file with us. The bid amount you will find in the attached Bid Proposal is firm for 60 days and includes:</p>' +
      '<ul>' +
        '<li>Category 6A plenum (CMP) baseline on all horizontal data</li>' +
        '<li>Fluke DSX-8000 certification on 100% of installed terminations — LinkWare PDFs at substantial completion</li>' +
        '<li>TIA-606-C CLASS 3 labeling with barcode-backed drawing register</li>' +
        '<li>Lifetime workmanship warranty + 25-year manufacturer components warranty (Panduit / CommScope)</li>' +
        '<li>Two (2) AMC revisits within 90 days of substantial completion at no additional charge</li>' +
      '</ul>' +
      '<p>We have priced to the drawings, not around them. Where the specification is silent, we have assumed the higher-performance option (Cat 6A over Cat 6, OM4 over OM3, PoE++ capable over PoE+) rather than the cheapest path — this is our standard approach on every project, not an upsell.</p>' +
      '<p>Qualifications, exclusions, and pricing detail are itemized in the attached packet (Section 1–Section 8 Bid Proposal, Section 4 Statement of Work, Section 5 Qualifications, Section 6 Standards). If any clarification is needed prior to the bid deadline, please call me directly — I carry the phone 24/7 during bid weeks.</p>';
  } else if (rcp.mode === 'residential') {
    body =
      `<p>${escapeHtml(rcp.salutation)}</p>` +
      `<p>Thank you for the opportunity to quote your low-voltage installation at <strong>${escapeHtml(project)}</strong>. I appreciate you inviting GCC into your home, and I want to share a little about how we approach residential work before you get to the pricing.</p>` +
      '<p>We treat every home the same way we treat a commercial job: properly pathed, properly supported, properly terminated, properly tested. The difference is that in a home, the quality you can see and the quality you can\'t see matter equally — the finished faceplate has to look right <em>and</em> the cable behind it has to pass the same Fluke certification we use on a school or hospital. That is what you are paying for.</p>' +
      '<p>The attached proposal covers:</p>' +
      '<ul>' +
        '<li>Pre-wire and rough-in of all structured cabling (Cat 6A data, coax where needed)</li>' +
        '<li>Wireless access point placement for whole-home coverage (no dead spots)</li>' +
        '<li>Labeled and tested patch panel in a clean central location of your choice</li>' +
        '<li>Written test results handed to you on paper and emailed as PDFs</li>' +
        '<li>Clean-up each day — you shouldn\'t know we were there when we leave</li>' +
      '</ul>' +
      '<p>Pricing holds for 30 days. We schedule residential work around your life, not ours — if you need us out before a drywall date or around a family event, just say the word and we will plan around it.</p>';
  } else {
    body =
      `<p>${escapeHtml(rcp.salutation)}</p>` +
      `<p>Thank you for the opportunity to price the low-voltage scope on <strong>${escapeHtml(project)}</strong> directly. Proposals sent owner-direct (rather than through a general contractor) let us carry the schedule, the quality control, and the warranty all in one hand — which is how we prefer to work.</p>` +
      '<p>The attached proposal is a turn-key figure covering:</p>' +
      '<ul>' +
        '<li>Structured cabling (Div 27) — Cat 6A plenum horizontal, OM4 fiber backbone</li>' +
        '<li>Electronic safety &amp; security pathways (Div 28) — per drawings</li>' +
        '<li>Labor, materials, fluke certification, labeling, firestop, and final close-out documentation</li>' +
        '<li>Coordination with your electrical, architectural, and IT teams directly — you deal with us, not a general contractor in the middle</li>' +
      '</ul>' +
      '<p>Pricing holds for 60 days. Once you accept, we will issue a schedule with mobilization and substantial-completion dates within 5 business days, and begin pre-construction coordination immediately.</p>';
  }

  // ───── Close + signature ─────
  const close =
    `<p>Please do not hesitate to reach out with questions or clarifications. My direct line is ${escapeHtml(brand.owner.phone_fmt)} and my email is ${escapeHtml(brand.owner.email)}.</p>` +
    signatureHtml(brand);

  // ───── Project phases Gantt (renders in browser-opened copies) ─────
  const anchor = new Date();
  const anchorStr = anchor.toISOString().slice(0, 10);
  const gantt =
    'gantt\n' +
    `    title Project Phases — ${project.replace(/[\n:]/g, ' ').slice(0, 60)}\n` +
    '    dateFormat YYYY-MM-DD\n' +
    '    axisFormat %b %d\n' +
    '    section Pre-Construction\n' +
    `    Site walk &amp; RFIs       :done,    phase1, ${anchorStr}, 5d\n` +
    '    Material release          :active,  phase2, after phase1, 5d\n' +
    '    section Install\n' +
    '    Rough-in &amp; cable pulls :         phase3, after phase2, 15d\n' +
    '    Terminate &amp; certify   :         phase4, after phase3, 10d\n' +
    '    section Closeout\n' +
    '    Owner walk / punchlist   :         phase5, after phase4, 3d\n' +
    '    As-builts &amp; warranty  :crit,    phase6, after phase5, 7d';

  const ganttCard = mermaidBlock(gantt, {
    title: 'Project Phase Timeline',
    sub:   'Approximate duration shown for planning reference — actual dates in Section 4 Statement of Work.',
    accent: true
  });

  const html = gccHtmlShell(
    'Cover Letter',
    recipientBlock + body + ganttCard + close,
    {
      classification: 'CLIENT',
      docKind:        '01 · Cover Letter',
      logo:           'letterhead',
      projectLabel:   project
    },
    { brand, logos }
  );

  const filename = buildOutputFilename(
    { prefix: '01', baseName: 'Cover Letter', ext: '.pdf' },
    project
  );

  return { filename, html };
}
