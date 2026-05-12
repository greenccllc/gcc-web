/**
 * Shared helpers used across every output renderer.
 *
 * These are pure functions — no DOM, no globals. Every helper takes its
 * dependencies (intake, session, brand) as arguments. Ported from the
 * loose `_cw`, `_recipientBlock`, `getProjectLabel`, etc. helpers in
 * bundle-builder.html.
 */

import type { Crosswalk, CrosswalkValue } from '@models/crosswalk';
import type { IntakeState, SessionState } from '@models/intake';
import type { GccBrand } from '@models/brand';

// ─────────────────────────── string utilities ───────────────────────────

export function escapeHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function fmtCurrency(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '$0.00';
  return '$' + Number(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function fmtCurrencyRound(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '$0';
  return '$' + Math.round(n).toLocaleString('en-US');
}

export function fmtInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '0';
  return Number(n).toLocaleString('en-US');
}

// ─────────────────────────── crosswalk access ───────────────────────────

/**
 * Read a token from the crosswalk. Returns the typed value or fallback.
 * Mirrors legacy `_cw(tok, fallback)`.
 */
export function cw(crosswalk: Crosswalk, token: string, fallback = ''): string {
  const r = crosswalk[token];
  if (!r) return fallback;
  const v: CrosswalkValue = r.value;
  if (v == null || v === '') return fallback;
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

/** Same as cw() but returns a TBD placeholder when missing. */
export function cwOrTBD(crosswalk: Crosswalk, token: string): string {
  return cw(crosswalk, token, '<span style="color:#999;">TBD</span>');
}

/** Read a token as number (0 fallback). */
export function cwNum(crosswalk: Crosswalk, token: string, fallback = 0): number {
  const r = crosswalk[token];
  if (!r) return fallback;
  const v = r.value;
  if (v == null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// ─────────────────────────── project labels ─────────────────────────────

export function getProjectLabel(intake: IntakeState, _session?: SessionState): string {
  const cw0 = intake.crosswalk || {};
  const fromCw = cw(cw0, 'project_name', '') || cw(cw0, 'job_name', '');
  if (fromCw) return fromCw;
  return 'Untitled Project';
}

// ─────────────────────── proposal routing & recipient ──────────────────

export type ProposalMode = 'bid' | 'quote';

export interface ProposalRoute {
  mode: ProposalMode;
  label: string;
  templateId: string;
  prefix: string;
}

export function inferProposalRoute(intake: IntakeState): ProposalRoute {
  const cw0 = intake.crosswalk || {};
  const gc    = cw0['gc_company_name']?.value || cw0['gc_estimator_name']?.value || cw0['rfp_number']?.value;
  const home  = cw0['homeowner_name']?.value || cw0['homeowner_email']?.value || cw0['homeowner_phone']?.value;
  const owner = cw0['client_company_name']?.value || cw0['client_contact_name']?.value;
  if (gc)    return { mode: 'bid',   label: 'Bid',           templateId: 'gc-subcontractor-bid',  prefix: 'GCC-BID' };
  if (home)  return { mode: 'quote', label: 'Residential Q', templateId: 'residential-homeowner', prefix: 'GCC-RES' };
  if (owner) return { mode: 'quote', label: 'Owner Quote',   templateId: 'owner-direct-proposal', prefix: 'GCC-QUOTE' };
  return     { mode: 'quote', label: 'Owner Quote',          templateId: 'owner-direct-proposal', prefix: 'GCC-QUOTE' };
}

export type RecipientMode = 'bid' | 'residential' | 'owner';

export interface RecipientBlock {
  mode: RecipientMode;
  salutation: string;
  company: string;
  contact: string;
  address: string;
  phone: string;
  email: string;
  role: string;
  headline: string;
  framing: string;
}

export function buildRecipientBlock(intake: IntakeState): RecipientBlock {
  const route = inferProposalRoute(intake);
  const cw0 = intake.crosswalk || {};
  if (route.mode === 'bid') {
    return {
      mode: 'bid',
      salutation: 'Dear ' + cw(cw0, 'gc_estimator_name', 'Estimating Team') + ',',
      company:    cw(cw0, 'gc_company_name', 'General Contractor'),
      contact:    cw(cw0, 'gc_estimator_name', 'Estimator'),
      address:    cw(cw0, 'gc_address', ''),
      phone:      cw(cw0, 'gc_estimator_phone', ''),
      email:      cw(cw0, 'gc_estimator_email', ''),
      role:       'General Contractor',
      headline:   'Low-Voltage Div 27/28 Subcontractor Bid',
      framing:    'bid'
    };
  }
  if (route.templateId.includes('residential')) {
    return {
      mode: 'residential',
      salutation: 'Dear ' + cw(cw0, 'homeowner_name', 'Homeowner') + ',',
      company:    cw(cw0, 'homeowner_name', 'Homeowner'),
      contact:    cw(cw0, 'homeowner_name', ''),
      address:    cw(cw0, 'project_address', ''),
      phone:      cw(cw0, 'homeowner_phone', ''),
      email:      cw(cw0, 'homeowner_email', ''),
      role:       'Homeowner',
      headline:   'Residential Low-Voltage Installation Proposal',
      framing:    'residential'
    };
  }
  return {
    mode: 'owner',
    salutation: 'Dear ' + cw(cw0, 'client_contact_name', cw(cw0, 'client_company_name', 'Ownership Team')) + ',',
    company:    cw(cw0, 'client_company_name', 'Owner'),
    contact:    cw(cw0, 'client_contact_name', ''),
    address:    cw(cw0, 'project_address', ''),
    phone:      cw(cw0, 'client_contact_phone', ''),
    email:      cw(cw0, 'client_contact_email', ''),
    role:       'Owner',
    headline:   'Direct-to-Owner Low-Voltage Proposal',
    framing:    'owner'
  };
}

// ─────────────────────── visual building blocks ────────────────────────

export interface MermaidBlockOpts {
  title?: string;
  sub?: string;
  accent?: boolean;
}

/** Wraps a Mermaid code block in a .diagram-card. */
export function mermaidBlock(code: string, opts: MermaidBlockOpts = {}): string {
  const accentClass = opts.accent ? ' dc-accent' : '';
  return '<div class="diagram-card' + accentClass + '">' +
    (opts.title ? `<div class="dc-title">${escapeHtml(opts.title)}</div>` : '') +
    (opts.sub   ? `<div class="dc-sub">${escapeHtml(opts.sub)}</div>`     : '') +
    `<pre class="mermaid">${escapeHtml(code)}</pre>` +
  '</div>';
}

/** Wraps an SVG (or any inline viz HTML) in a diagram-card frame. */
export function svgChartCard(title: string, sub: string, svg: string, accent = false): string {
  const accentClass = accent ? ' dc-accent' : '';
  return '<div class="diagram-card' + accentClass + '">' +
    (title ? `<div class="dc-title">${escapeHtml(title)}</div>` : '') +
    (sub   ? `<div class="dc-sub">${escapeHtml(sub)}</div>`     : '') +
    svg +
  '</div>';
}

// ────────────────────────── endpoint kpi grid ──────────────────────────

/** Reusable KPI row for the 5 GCC endpoint counts (data, ap, cam, door, fiber). */
export function endpointSummaryGrid(intake: IntakeState): string {
  const cw0 = intake.crosswalk || {};
  const dd = cwNum(cw0, 'data_drops_count');
  const ap = cwNum(cw0, 'ap_count');
  const ca = cwNum(cw0, 'camera_count_commercial');
  const dr = cwNum(cw0, 'door_positions_count');
  const fb = cwNum(cw0, 'fiber_strands_count');
  const tile = (n: number, label: string) =>
    n ? `<div class="kpi"><div class="v">${fmtInt(n)}</div><div class="l">${label}</div></div>` : '';
  return '<div class="grid3" style="gap:8px;">' +
    tile(dd, 'Data Outlets') +
    tile(ap, 'Wireless APs') +
    tile(ca, 'IP Cameras') +
    tile(dr, 'Access Doors') +
    tile(fb, 'Fiber Strands') +
  '</div>';
}

// ────────────────────────── filename builder ───────────────────────────

export interface OutputDef {
  /** Numeric prefix for ordered customer docs (e.g. "01", "02"). */
  prefix?: string;
  /** Document base name without extension (e.g. "Cover Letter"). */
  baseName: string;
  /** Extension including the dot (".pdf", ".xlsx", ".md"). */
  ext: string;
  /** Marks an internal-only document. */
  internal?: boolean;
}

/**
 * Builds a filename matching the legacy folder-layout convention:
 *   - Customer numbered:  "01 Cover Letter - {Project}.pdf"
 *   - Customer packet:    "GCC LV Div27-28 - {Name} - {Project}.pdf"
 *   - Internal:           "INTERNAL - {Name} - {Project}.docx"
 *   - Intake/working:     "{Name} - {Project}.md"
 */
export function buildOutputFilename(def: OutputDef, project: string): string {
  let namePart: string;
  if (def.prefix && !def.internal) {
    namePart = def.prefix + ' ' + def.baseName;
  } else if (def.internal) {
    namePart = 'INTERNAL - ' + (def.prefix ? def.prefix + ' ' : '') + def.baseName;
  } else {
    namePart = def.baseName;
  }
  return namePart + ' - ' + project + def.ext;
}

// ────────────────────────── proposal number ────────────────────────────

/** Returns either the session-meta propnum or a synthesized "{prefix}-{year}-DRAFT". */
export function getOrSynthPropnum(session: SessionState, route: ProposalRoute): string {
  const m = session?.meta?.['propnum'];
  if (m && typeof m === 'string' && m.trim().length > 0) return m;
  return route.prefix + '-' + new Date().getFullYear() + '-DRAFT';
}

// ────────────────────────── signature block ────────────────────────────

/** Returns the legacy `<div class="sig">…</div>` Kaitlyn block. */
export function signatureHtml(brand: GccBrand): string {
  return '<div class="sig">' +
    `<span class="name">${escapeHtml(brand.owner.full_name)}</span>\n` +
    `${escapeHtml(brand.owner.title)} · ${escapeHtml(brand.company.dba)}\n` +
    `${escapeHtml(brand.owner.phone_fmt)} · ${escapeHtml(brand.owner.email)}` +
  '</div>';
}
