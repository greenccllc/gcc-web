/**
 * INTERNAL · Master Extraction — consolidated crosswalk dump as Markdown.
 *
 * Ported from `onExportMasterExtraction` (bundle-builder.html line 13594).
 *
 * The legacy version iterates a global TOKEN_DEFS array (~168 tokens with
 * categories, dtypes, required-flags). That global doesn't exist in the
 * TS port yet — instead this renderer drives off a curated section map
 * that mirrors the §1-§5 hard-coded sections in the legacy export, then
 * tails with a "complete crosswalk" dump iterating every populated entry.
 *
 * Output sections (matches legacy 1:1 for hand-coded parts):
 *   Executive Summary + Confidence Distribution
 *   1. Project Metadata
 *   2. Endpoints
 *   3. Infrastructure
 *   4. Commercial Terms
 *   5. Sources Summary
 *   6. Conflicts Requiring Human Resolution
 *   7. Update Log
 *   8. Complete Token Crosswalk (every populated entry)
 *
 * Sections that depend on `intake.rules` / `runVerificationChecks` /
 * TOKEN_DEFS in the legacy are intentionally omitted here — degrades
 * gracefully until those modules are ported.
 */

import type { GccBrand, LogoMap } from '@models/brand';
import type { CrosswalkValue } from '@models/crosswalk';
import type { IntakeState, SessionState } from '@models/intake';
import { buildOutputFilename, getProjectLabel } from './_helpers';

export interface MasterExtractionInput {
  intake: IntakeState;
  session: SessionState;
  brand: GccBrand;
  logos?: LogoMap;
  projectLabel?: string;
}

export interface MasterExtractionOutput {
  filename: string;
  markdown: string;
  coveragePct: number;
  populatedCount: number;
  conflictCount: number;
  overallConfidence: string;
}

/* ────────────────────── curated section map ────────────────────── */

interface SectionDef {
  emoji: string;
  title: string;
  rows: ReadonlyArray<readonly [string, string]>;  // [token, label]
}

const SECTIONS: readonly SectionDef[] = [
  {
    emoji: '📋',
    title: 'Project Metadata',
    rows: [
      ['total_sf',              'Total SF'],
      ['floor_count',           'Floor count'],
      ['phases_documented',     'Phases documented'],
      ['phases_in_scope',       'Phases in scope'],
      ['due_date',              'Due date'],
      ['market_type',           'Market type'],
      ['division_scope',        'Division scope'],
      ['bid_structure',         'Bid structure'],
      ['bond_required',         'Bond required'],
      ['prevailing_wage',       'Prevailing wage'],
      ['after_hours_required',  'After-hours required']
    ]
  },
  {
    emoji: '🔌',
    title: 'Endpoints',
    rows: [
      ['data_drops_count',       'Total data drops'],
      ['cat6_drops',             'Cat6 drops'],
      ['cat6a_drops',            'Cat6A drops'],
      ['ap_count',               'WAPs'],
      ['cameras_interior',       'IP cameras (interior)'],
      ['cameras_exterior',       'IP cameras (exterior)'],
      ['door_positions_count',   'ACS card readers / doors'],
      ['strike_maglock_count',   'Electric strikes / mag locks'],
      ['rex_sensor_count',       'REX / motion / position sensors'],
      ['intercom_count',         'Intercoms / call stations'],
      ['elevator_phone_count',   'Elevator phones (shafts × 2)'],
      ['tv_drops',               'TV drops'],
      ['speaker_count',          'Speakers (PoE / LV)'],
      ['coax_endpoints',         'Coax endpoints'],
      ['hdmi_endpoints',         'HDMI endpoints'],
      ['acs_composite_drops',    'ACS composite drops']
    ]
  },
  {
    emoji: '🏗️',
    title: 'Infrastructure',
    rows: [
      ['mdf_count',           'MDF count (should = 1)'],
      ['idf_count',           'IDF count'],
      ['fiber_runs',          'Backbone fiber runs'],
      ['fiber_type',          'Fiber type (OS2 / OM3 / OM4)'],
      ['fiber_strands_count', 'Fiber strand count per run'],
      ['total_horizontal_lf', 'Total horizontal cable LF'],
      ['total_backbone_lf',   'Total backbone fiber LF'],
      ['rack_count',          'Rack count'],
      ['rack_spec',           'Rack spec'],
      ['ladder_rack_lf',      'Ladder rack LF'],
      ['patch_panels',        'Patch panels'],
      ['ups_units',           'UPS units']
    ]
  },
  {
    emoji: '💼',
    title: 'Commercial Terms',
    rows: [
      ['payment_net_days',       'Payment terms (net days)'],
      ['retainage_pct',          'Retainage %'],
      ['liquidated_damages',     'Liquidated damages'],
      ['warranty_required',      'Warranty required'],
      ['bond_required',          'Bond required'],
      ['insurance_limits',       'Insurance limits'],
      ['project_duration',       'Project duration'],
      ['substantial_completion', 'Substantial completion date']
    ]
  }
] as const;

/* ────────────────────────── utils ────────────────────────── */

function cellOrDash(v: CrosswalkValue | undefined): string {
  if (v == null || v === '') return '—';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  return String(v);
}

function confCell(c: number | undefined): string {
  if (c == null || !Number.isFinite(c)) return '—';
  return Math.round(c * 100) + '%';
}

function srcCell(s: string | undefined): string {
  if (!s) return '—';
  return s.length > 32 ? s.slice(0, 29) + '…' : s;
}

/* ────────────────────────── main ────────────────────────── */

export function renderMasterExtraction(inp: MasterExtractionInput): MasterExtractionOutput {
  const { intake, session } = inp;
  void session;
  const project = inp.projectLabel ?? getProjectLabel(intake, session);
  const cw0 = intake.crosswalk;
  const ts  = new Date().toISOString().slice(0, 16).replace('T', ' ');

  const allEntries = Object.entries(cw0);
  const populatedEntries = allEntries.filter(([, v]) =>
    v.value != null && v.value !== '' && !(Array.isArray(v.value) && v.value.length === 0)
  );
  const conflictEntries = allEntries.filter(([, v]) =>
    typeof v.confidence === 'number' && v.confidence < 0.50
  );

  const confList = populatedEntries
    .map(([, v]) => v.confidence)
    .filter(n => typeof n === 'number');
  const overallConfidence = confList.length
    ? Math.round((confList.reduce((a, b) => a + b, 0) / confList.length) * 100) + '%'
    : 'TBD';

  // Confidence buckets across the populated entries
  const buckets = { high: 0, med: 0, low: 0, missing: 0 };
  for (const [, v] of populatedEntries) {
    if (v.confidence == null) buckets.med++;
    else if (v.confidence >= 0.80) buckets.high++;
    else if (v.confidence >= 0.50) buckets.med++;
    else buckets.low++;
  }
  // Count tokens referenced in SECTIONS that are NOT populated → "missing"
  const sectionTokens = new Set(SECTIONS.flatMap(s => s.rows.map(r => r[0])));
  for (const tok of sectionTokens) {
    const v = cw0[tok];
    if (!v || v.value == null || v.value === '') buckets.missing++;
  }

  const totalSection = sectionTokens.size;
  const sectionPopulated = totalSection - buckets.missing;
  const coveragePct = totalSection ? Math.round((sectionPopulated / totalSection) * 100) : 0;

  const barCells   = 20;
  const barFilled  = Math.round((coveragePct / 100) * barCells);
  const coverageBar = '█'.repeat(barFilled) + '░'.repeat(barCells - barFilled);

  const conflictCount = conflictEntries.length;
  const fileCount = intake.files.length;
  const runCount  = intake.runs.length;

  const out: string[] = [];

  /* ── Header ───────────────────────────────────────────────── */
  out.push(`# 📊 Master Extraction — ${project}`);
  out.push('');
  out.push('> Running consolidated view of every field extracted from every `Intake/` source, across every Run. Most-likely-value chosen per `3-Intake/Extraction Rules.md` Section 14.');
  out.push('');
  out.push('---');
  out.push('');

  /* ── Executive summary ────────────────────────────────────── */
  out.push('## 🎯 Executive Summary');
  out.push('');
  out.push('| | |');
  out.push('|---|---|');
  out.push(`| **Job** | ${project} |`);
  out.push(`| **Last updated** | ${ts} |`);
  out.push(`| **Coverage** | \`${coverageBar}\` **${coveragePct}%** (${sectionPopulated} of ${totalSection} variables) |`);
  out.push(`| **Overall confidence** | ${overallConfidence} |`);
  out.push(`| **Conflicts flagged** | ${conflictCount === 0 ? '✅ None' : `⚠️ ${conflictCount} field${conflictCount === 1 ? '' : 's'} below 50% confidence`} |`);
  out.push(`| **Intake sources** | ${fileCount} file${fileCount === 1 ? '' : 's'} · ${runCount} Run${runCount === 1 ? '' : 's'} |`);
  out.push('');

  /* ── Confidence distribution ──────────────────────────────── */
  out.push('### Confidence Distribution');
  out.push('');
  out.push('| Bucket | Count | Share |');
  out.push('|--------|------:|------:|');
  const denom = Math.max(totalSection, 1);
  out.push(`| 🟢 High (≥80%) | ${buckets.high} | ${Math.round((buckets.high / denom) * 100)}% |`);
  out.push(`| 🟡 Medium (50–80%) | ${buckets.med} | ${Math.round((buckets.med / denom) * 100)}% |`);
  out.push(`| 🔴 Low (<50%) | ${buckets.low} | ${Math.round((buckets.low / denom) * 100)}% |`);
  out.push(`| ⚪ Missing | ${buckets.missing} | ${Math.round((buckets.missing / denom) * 100)}% |`);
  out.push('');
  out.push('---');
  out.push('');

  /* ── Curated sections 1..N ────────────────────────────────── */
  let secIdx = 1;
  for (const sec of SECTIONS) {
    out.push(`## ${sec.emoji} ${secIdx}. ${sec.title}`);
    out.push('');
    out.push('| Field | Value | Conf | Source |');
    out.push('|-------|-------|------|--------|');
    for (const [tok, label] of sec.rows) {
      const v = cw0[tok];
      out.push(
        `| ${label} ` +
        `| ${cellOrDash(v?.value)} ` +
        `| ${confCell(v?.confidence)} ` +
        `| ${srcCell(v?.src)} |`
      );
    }
    out.push('');
    out.push('---');
    out.push('');
    secIdx++;
  }

  /* ── Sources Summary ──────────────────────────────────────── */
  out.push(`## 📂 ${secIdx}. Sources Summary`);
  out.push('');
  out.push('| Intake File | Class | Pages | Date of Source | Runs Completed |');
  out.push('|-------------|-------|------:|----------------|----------------|');
  if (fileCount === 0) {
    out.push('| — | — | — | — | — |');
  } else {
    for (const f of intake.files.slice(0, 40)) {
      out.push(
        `| ${f.path || f.name} ` +
        `| ${f.class} ` +
        `| ${f.pages ?? '—'} ` +
        `| ${ts.slice(0, 10)} ` +
        `| ${runCount} |`
      );
    }
  }
  out.push('');
  out.push('---');
  out.push('');
  secIdx++;

  /* ── Conflicts ────────────────────────────────────────────── */
  out.push(`## ⚠️ ${secIdx}. Conflicts Requiring Human Resolution`);
  out.push('');
  out.push('| Item | Tentatively Chosen | Confidence | Source | Why Flagged |');
  out.push('|------|--------------------|-----------:|--------|-------------|');
  if (conflictEntries.length === 0) {
    out.push('| — | — | — | — | — |');
  } else {
    for (const [tok, v] of conflictEntries.slice(0, 20)) {
      out.push(
        `| \`${tok}\` ` +
        `| ${cellOrDash(v.value)} ` +
        `| ${confCell(v.confidence)} ` +
        `| ${srcCell(v.src)} ` +
        `| conf ${confCell(v.confidence)} (<50%) |`
      );
    }
  }
  out.push('');
  out.push('---');
  out.push('');
  secIdx++;

  /* ── Update Log ───────────────────────────────────────────── */
  out.push(`## 📅 ${secIdx}. Update Log (append-only)`);
  out.push('');
  out.push('| Timestamp | Run # | Phase | Summary |');
  out.push('|-----------|------:|-------|---------|');
  if (runCount === 0) {
    out.push('| — | — | — | — |');
  } else {
    intake.runs.slice(-10).forEach((r, i) => {
      const tsRun = new Date(r.ts).toISOString().slice(0, 16).replace('T', ' ');
      out.push(
        `| ${tsRun} ` +
        `| ${i + 1} ` +
        `| ${r.phase} ` +
        `| ${srcCell((r.summary || '').slice(0, 80))} |`
      );
    });
  }
  out.push('');
  out.push('---');
  out.push('');
  secIdx++;

  /* ── Complete crosswalk dump ──────────────────────────────── */
  out.push(`## 📒 ${secIdx}. Complete Crosswalk (all populated tokens)`);
  out.push('');
  out.push(`> ${populatedEntries.length} populated token${populatedEntries.length === 1 ? '' : 's'}. Sorted alphabetically. Empty entries omitted.`);
  out.push('');
  if (populatedEntries.length === 0) {
    out.push('*No tokens populated yet.*');
  } else {
    out.push('| Token | Value | Conf | Source |');
    out.push('|-------|-------|------|--------|');
    [...populatedEntries].sort(([a], [b]) => a.localeCompare(b)).forEach(([tok, v]) => {
      out.push(
        `| \`${tok}\` ` +
        `| ${cellOrDash(v.value)} ` +
        `| ${confCell(v.confidence)} ` +
        `| ${srcCell(v.src)} |`
      );
    });
  }
  out.push('');
  out.push('---');
  out.push('');
  out.push('*Governance: `3-Intake/Extraction Rules.md` Section 10–14. Update on every analysis Run.*');
  out.push('');

  const markdown = out.join('\n');

  const filename = buildOutputFilename(
    { prefix: '', baseName: 'Master Extraction', ext: '.md', internal: true },
    project
  );

  return {
    filename,
    markdown,
    coveragePct,
    populatedCount: populatedEntries.length,
    conflictCount,
    overallConfidence
  };
}
