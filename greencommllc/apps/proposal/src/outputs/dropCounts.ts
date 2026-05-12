/**
 * INTERNAL · Drop Counts — discrete cable-type breakdown as Markdown.
 *
 * Ported from `onExportDropCounts` (bundle-builder.html line 13846).
 *
 * Output is a `.md` file (not HTML) — consumed in Obsidian / VS Code during
 * BTQ lock. Categories A-F match the legacy shop structure:
 *   A = Data (Cat6A)     — APs, drops, cameras, intercoms, elevator phones, ACS
 *   B = Coax (RG6)       — CATV / TV scope
 *   C = HDMI             — wall-to-display runs
 *   D = Composite        — ACS composite, speaker wire, multi-pair
 *   E = Fiber            — backbone runs + strand spec
 *   F = TR Buildout      — racks, ladder, UPS, patch panels
 *
 * The legacy version depends on runVerificationChecks / intake.rules /
 * computeScopeRules — none of which have been ported yet. This port
 * degrades those blocks gracefully: verification checks section is
 * omitted when no `verificationChecks` are passed in, and the trade-flag
 * / exclusions tail is omitted when those lists are empty.
 */

import type { GccBrand, LogoMap } from '@models/brand';
import type { IntakeState, SessionState } from '@models/intake';
import { cw, cwNum, getProjectLabel, buildOutputFilename } from './_helpers';

export interface DropCountsInput {
  intake: IntakeState;
  session: SessionState;
  brand: GccBrand;
  logos?: LogoMap;
  projectLabel?: string;
}

export interface DropCountsOutput {
  filename: string;
  markdown: string;
  totalEndpoints: number;
  totalLF: number;
  primaryTrade: string;
}

function dash(v: string | number | null | undefined): string {
  if (v == null || v === '') return '—';
  if (typeof v === 'number') return v ? String(v) : '—';
  return String(v);
}

export function renderDropCounts(inp: DropCountsInput): DropCountsOutput {
  const { intake, session } = inp;
  void session; // markdown doesn't read session.lines today
  const project = inp.projectLabel ?? getProjectLabel(intake, session);
  const cw0 = intake.crosswalk;

  const get  = (t: string) => cwNum(cw0, t);
  const getS = (t: string) => cw(cw0, t, '—');

  // ── Category subtotals ────────────────────────────────────────────────
  const A_qty =
    get('cat6_drops') + get('cat6a_drops') + get('ap_count') +
    get('cameras_interior') + get('cameras_exterior') +
    get('door_positions_count') + get('intercom_count') + get('elevator_phone_count');
  const A_LF   = get('total_horizontal_lf');
  const B_qty  = get('coax_endpoints');
  const C_qty  = get('hdmi_endpoints');
  const D_qty  = get('acs_composite_drops') + get('speaker_count') + get('intercom_count');
  const E_runs = get('fiber_runs');
  const E_LF   = get('total_backbone_lf');
  const F_qty  = get('rack_count') + get('ups_units');

  const totalEndpoints = A_qty + B_qty + C_qty + D_qty;
  const totalLF        = A_LF + E_LF;

  const pct = (q: number): number =>
    totalEndpoints ? Math.round((q / totalEndpoints) * 100) : 0;

  const dot = (q: number): string => {
    if (!q) return '⚪';
    const p = pct(q);
    if (p >= 60) return '🟢';
    if (p >= 20) return '🟡';
    return '🟠';
  };

  const cats = [
    { name: 'Data (Cat6A)', q: A_qty },
    { name: 'Coax (RG6)',   q: B_qty },
    { name: 'HDMI',         q: C_qty },
    { name: 'Composite',    q: D_qty }
  ].sort((a, b) => b.q - a.q);

  const top = cats[0];
  const primaryTrade = (top && top.q > 0)
    ? `${top.name} dominates (${pct(top.q)}% of endpoints)`
    : 'No endpoints captured yet';

  const activeCatCount = cats.filter(c => c.q > 0).length;

  const siteLabel    = cw(cw0, 'site_name', '') || cw(cw0, 'project_name', '—');
  const siteAddress  = cw(cw0, 'site_address', '—');
  const fileNames    = intake.files.map(f => f.name).slice(0, 10).join(', ') || '—';
  const today        = new Date().toISOString().slice(0, 10);

  // ── Markdown assembly ─────────────────────────────────────────────────
  const out: string[] = [];

  out.push(`# 📡 GCC Discrete Drop Counts — ${project}`);
  out.push('');
  out.push('---');
  out.push('');

  // ── Executive summary ─────────────────────────────────────────────────
  out.push('## 🎯 Executive Summary');
  out.push('');
  out.push('| | |');
  out.push('|---|---|');
  out.push(`| **Site** | ${siteLabel} |`);
  out.push(`| **Address** | ${siteAddress} |`);
  out.push(`| **Prepared by** | GCC LLC |`);
  out.push(`| **Date** | ${today} |`);
  out.push(`| **Total endpoints** | **${totalEndpoints.toLocaleString()}** across ${activeCatCount} cable type${activeCatCount === 1 ? '' : 's'} |`);
  out.push(`| **Total horizontal LF** | ${totalLF ? totalLF.toLocaleString() : '—'} |`);
  out.push(`| **Backbone fiber** | ${E_runs || 0} run${E_runs === 1 ? '' : 's'} · ${E_LF ? E_LF.toLocaleString() + ' LF' : 'LF TBD'} |`);
  out.push(`| **Primary trade** | ${primaryTrade} |`);
  out.push(`| **Source docs** | ${fileNames} |`);
  out.push('');
  out.push('---');
  out.push('');

  // ── Category breakdown ────────────────────────────────────────────────
  out.push('## 📊 Category Breakdown');
  out.push('');
  out.push('Legend: 🟢 dominant · 🟡 material · 🟠 minor · ⚪ none');
  out.push('');
  out.push('| | Category | Endpoints | Share | Cable LF |');
  out.push('|---|----------|----------:|------:|---------:|');
  out.push(`| ${dot(A_qty)} | A. Data Endpoints (Cat6A) | ${A_qty} | ${pct(A_qty)}% | ${A_LF ? A_LF.toLocaleString() : '—'} |`);
  out.push(`| ${dot(B_qty)} | B. Coax Endpoints (RG6) | ${B_qty} | ${pct(B_qty)}% | — |`);
  out.push(`| ${dot(C_qty)} | C. HDMI Endpoints | ${C_qty} | ${pct(C_qty)}% | — |`);
  out.push(`| ${dot(D_qty)} | D. Composite Endpoints | ${D_qty} | ${pct(D_qty)}% | — |`);
  out.push(`| ${E_runs ? '🟢' : '⚪'} | E. Fiber (runs / LF) | ${E_runs} runs | — | ${E_LF ? E_LF.toLocaleString() + ' LF' : '—'} |`);
  out.push(`| ${F_qty ? '🟡' : '⚪'} | F. TR Buildout items | ${F_qty} | — | — |`);
  out.push(`| | **TOTAL ENDPOINTS** | **${totalEndpoints}** | **100%** | **${totalLF ? totalLF.toLocaleString() : '—'}** |`);
  out.push('');
  out.push('---');
  out.push('');

  // ── A. Data ───────────────────────────────────────────────────────────
  out.push(`## 🟢 A. DATA ENDPOINTS (Cat6 / Cat6A) ${A_qty ? `— ${pct(A_qty)}% of total` : '— no scope'}`);
  out.push('');
  out.push('**Cable type:** Cat6A plenum (default)');
  out.push('**Termination:** T568B');
  out.push('**Test standard:** Fluke DSX-8000 Cat6A certification');
  out.push('');
  const dataDrops = get('cat6_drops') + get('cat6a_drops') || get('data_drops_count');
  const elevators = get('elevator_shafts');
  out.push('| Sub-group | Qty | Mount | Cable type | LF |');
  out.push('|-----------|----:|-------|-----------|---:|');
  out.push(`| WAPs (biscuit/ceiling) | ${dash(get('ap_count'))} | Ceiling | Cat6A | — |`);
  out.push(`| Wall / floor boxes (data drops) | ${dash(dataDrops)} | Wall | Cat6A | — |`);
  out.push(`| Cameras — interior | ${dash(get('cameras_interior'))} | Ceiling | Cat6A | — |`);
  out.push(`| Cameras — exterior | ${dash(get('cameras_exterior'))} | Soffit | Cat6A | — |`);
  out.push(`| Intercoms / call stations | ${dash(get('intercom_count'))} | Wall | Cat6A | — |`);
  out.push(`| Elevator phones (${dash(elevators)} × 2) | ${dash(get('elevator_phone_count'))} | Biscuit | Cat6A | — |`);
  out.push(`| ACS devices (direct to controller) | ${dash(get('door_positions_count'))} | — | Cat6A | — |`);
  out.push(`| **A SUBTOTAL** | **${A_qty}** | | | **${A_LF || '—'}** |`);
  out.push('');
  out.push('---');
  out.push('');

  // ── B. Coax ───────────────────────────────────────────────────────────
  out.push(`## ${B_qty ? '🟠' : '⚪'} B. COAX ENDPOINTS (RG6) ${B_qty ? `— ${pct(B_qty)}% of total` : '— no scope (all-IP system)'}`);
  out.push('');
  if (!B_qty) {
    out.push('> *All-IP system. No RG6 coax scope.*');
  } else {
    out.push('| Sub-group | Qty | Mount | LF |');
    out.push('|-----------|----:|-------|---:|');
    out.push(`| TV / CATV boxes | ${B_qty} | — | — |`);
    out.push(`| **B SUBTOTAL** | **${B_qty}** | | **—** |`);
  }
  out.push('');
  out.push('---');
  out.push('');

  // ── C. HDMI ───────────────────────────────────────────────────────────
  out.push(`## ${C_qty ? '🟠' : '⚪'} C. HDMI ENDPOINTS ${C_qty ? `— ${pct(C_qty)}% of total` : '— no scope'}`);
  out.push('');
  out.push('| Sub-group | Qty | Run length | Connector | LF |');
  out.push('|-----------|----:|-----------:|-----------|---:|');
  out.push(`| Wall-to-display | ${dash(C_qty)} | — | HDMI 2.1 | — |`);
  out.push(`| **C SUBTOTAL** | **${C_qty}** | | | **—** |`);
  out.push('');
  out.push('---');
  out.push('');

  // ── D. Composite ──────────────────────────────────────────────────────
  out.push(`## ${D_qty ? '🟡' : '⚪'} D. COMPOSITE ENDPOINTS ${D_qty ? `— ${pct(D_qty)}% of total` : '— no scope'}`);
  out.push('');
  out.push('| Cable type | Device | Qty | LF |');
  out.push('|-----------|--------|----:|---:|');
  out.push(`| ACS composite (18/4 + 22/4) | Door reader | ${dash(get('acs_composite_drops'))} | — |`);
  out.push(`| Speaker wire (16/4) | Ceiling speaker | ${dash(get('speaker_count'))} | — |`);
  out.push(`| Intercom multi-pair (22/6) | Call station | ${dash(get('intercom_count'))} | — |`);
  out.push(`| **D SUBTOTAL** | | **${D_qty}** | **—** |`);
  out.push('');
  out.push('---');
  out.push('');

  // ── E. Fiber ──────────────────────────────────────────────────────────
  const fiberType = getS('fiber_type') !== '—' ? getS('fiber_type') : '12-strand OM3';
  out.push(`## ${E_runs ? '🟢' : '⚪'} E. FIBER SCOPE ${E_runs ? `— ${E_runs} backbone run${E_runs === 1 ? '' : 's'}` : '— no backbone fiber'}`);
  out.push('');
  out.push(`**Default:** ${fiberType} unless spec requires otherwise`);
  out.push('');
  out.push('| Item | Qty | Detail | LF |');
  out.push('|------|----:|--------|---:|');
  out.push(`| Fiber runs (MDF to IDF) | ${dash(E_runs)} | ${getS('fiber_strands_count')} × ${fiberType} | ${E_LF || '—'} |`);
  out.push(`| Rack-mount fiber panels | — | — | — |`);
  out.push(`| **E SUBTOTAL** | **${E_runs}** | | **${E_LF || '—'}** |`);
  out.push('');
  out.push('---');
  out.push('');

  // ── F. TR Buildout ────────────────────────────────────────────────────
  const mdfCount = get('mdf_count') || 1;
  const idfCount = get('idf_count');
  out.push(`## ${F_qty ? '🟡' : '⚪'} F. TR BUILDOUT ${F_qty ? `— ${F_qty} item${F_qty === 1 ? '' : 's'}` : '— no TR buildout'}`);
  out.push('');
  out.push(`**Telecom rooms:** ${mdfCount} MDF + ${dash(idfCount)} IDFs = ${mdfCount + idfCount} total`);
  out.push('');
  out.push('| Item | Per TR | Total | Notes |');
  out.push('|------|-------:|------:|-------|');
  out.push(`| Server racks | 1 | ${dash(get('rack_count'))} | ${getS('rack_spec')} |`);
  out.push(`| Ladder rack / cable runway | — | ${dash(get('ladder_rack_lf'))} LF | Aerial / wall-mount |`);
  out.push(`| UPS | — | ${dash(get('ups_units'))} | GCC-furnished or OFCI |`);
  out.push(`| Patch panels | — | ${dash(get('patch_panels'))} | — |`);
  out.push(`| **F SUBTOTAL** | | **${F_qty}** | |`);
  out.push('');
  out.push('---');
  out.push('');

  // ── G. Materials & supplies ───────────────────────────────────────────
  out.push('## 📦 G. MATERIALS & SUPPLIES (nested under categories)');
  out.push('');
  out.push('### Under A (Data)');
  out.push(`- Cat6A cable: ${A_LF || '—'} LF`);
  out.push(`- J-hooks: ${A_LF ? Math.ceil(A_LF / 5) : '—'} (LF ÷ 5′ spacing)`);
  out.push('- Velcro rolls, labels, mud rings, blank inserts — per catalog');
  out.push('');
  out.push('### Under E (Fiber)');
  out.push(`- ${fiberType}: ${E_LF || '—'} LF`);
  out.push('');
  out.push('---');
  out.push('');

  // ── Risk flags ────────────────────────────────────────────────────────
  out.push('## RISK FLAGS');
  out.push('');
  out.push(`- **Bond required:** ${getS('bond_required')}`);
  out.push(`- **Prevailing Wage:** ${getS('prevailing_wage')}`);
  out.push(`- **After-hours work:** ${getS('after_hours_required')}`);
  out.push(`- **Occupied site:** ${getS('occupied_site')}`);
  out.push(`- **Phasing required:** ${getS('phasing_required')}`);
  out.push('');
  out.push('---');
  out.push('');

  out.push('*Prepared per 3-Intake/Extraction Rules.md. Quantities match BTQ at date of publish.*');
  out.push('');

  const markdown = out.join('\n');

  const filename = buildOutputFilename(
    { prefix: '', baseName: 'Drop Counts', ext: '.md', internal: true },
    project
  );

  return { filename, markdown, totalEndpoints, totalLF, primaryTrade };
}
