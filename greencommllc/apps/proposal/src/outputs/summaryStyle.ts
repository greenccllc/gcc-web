/**
 * Quantitative Bid Summary visual language — matches GCC_HybridVilla_Summary
 * reference PDF. Used by Bid Overview (the summary itself), SOV, and SOW so
 * all three documents read as a single styled set.
 *
 * Pure HTML/CSS helpers. No DOM. Each function returns a string fragment.
 */

import type { GccBrand } from '@models/brand';
import { escapeHtml } from './_helpers';

/**
 * Styles to inject inside a deliverable. Scoped under .qbs-* class names so
 * they don't fight the brand shell's defaults.
 */
export function summaryStyleBlock(brand: GccBrand): string {
  const c = brand.colors;
  return `<style>
  .qbs-title-block { text-align:center; margin: 4pt 0 14pt; }
  .qbs-title { color: ${c.forestDark}; font-size: 26pt; font-weight: 800; letter-spacing: 0.01em; margin: 0; line-height: 1.05; }
  .qbs-subtitle { color: ${c.forestDark}; font-size: 11pt; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; margin: 4pt 0 0; }
  .qbs-rule { border: 0; border-top: 4pt solid ${c.forestDark}; margin: 10pt 0 14pt; }
  .qbs-rule-thin { border: 0; border-top: 0.75pt solid ${c.rule}; margin: 18pt 0 8pt; }

  .qbs-info-bar {
    background: #F6F8F8;
    border: 0.5pt solid ${c.rule};
    border-radius: 3pt;
    padding: 10pt 14pt;
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 18pt;
    row-gap: 3pt;
    font-size: 9.5pt;
    margin-bottom: 14pt;
  }
  .qbs-info-bar .qbs-fld { color: ${c.ink}; }
  .qbs-info-bar .qbs-fld strong { color: ${c.ink}; }

  .qbs-kpi-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12pt;
    margin-bottom: 16pt;
  }
  .qbs-kpi {
    border: 1.25pt solid ${c.forestDark};
    border-radius: 3pt;
    padding: 14pt 8pt 10pt;
    text-align: center;
    background: #fff;
  }
  .qbs-kpi-primary { background: ${c.greenTint}; }
  .qbs-kpi-value {
    font-size: 22pt;
    font-weight: 800;
    color: ${c.forestDark};
    line-height: 1;
    letter-spacing: -0.01em;
  }
  .qbs-kpi-label {
    font-size: 9pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: ${c.slate};
    margin-top: 4pt;
  }

  .qbs-h2 {
    color: ${c.forestDark};
    font-size: 12pt;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 14pt 0 6pt;
  }

  .qbs-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12pt;
    font-size: 9.5pt;
  }
  .qbs-table thead th {
    background: ${c.forestDark};
    color: #fff;
    text-align: left;
    padding: 7pt 10pt;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 9pt;
    letter-spacing: 0.04em;
  }
  .qbs-table thead th.num { text-align: right; }
  .qbs-table tbody td {
    border-bottom: 0.5pt solid ${c.rule};
    padding: 7pt 10pt;
    color: ${c.ink};
  }
  .qbs-table tbody td.num { text-align: right; }
  .qbs-table tbody tr.qbs-total td {
    font-weight: 800;
    color: ${c.forestDark};
    border-top: 1.25pt solid ${c.forestDark};
    border-bottom: 0;
    background: #FBFDFB;
    text-transform: uppercase;
    font-size: 9.5pt;
    letter-spacing: 0.04em;
  }
  .qbs-table tbody td.deduct { color: #B71C1C; font-weight: 700; }
  .qbs-table tbody td.add    { color: ${c.forestDark}; font-weight: 700; }

  .qbs-two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 28pt;
    row-gap: 4pt;
    margin: 6pt 0 10pt;
  }
  .qbs-two-col h4 {
    color: ${c.forestDark};
    font-size: 10pt;
    font-weight: 800;
    margin: 0 0 4pt;
  }
  .qbs-two-col ul {
    margin: 0 0 6pt 14pt;
    padding: 0;
    font-size: 9.5pt;
    line-height: 1.55;
  }
  .qbs-two-col ul li::marker { color: ${c.forestDark}; }

  .qbs-foot {
    text-align: center;
    color: ${c.slate};
    font-size: 8.5pt;
    font-style: italic;
    margin-top: 16pt;
    border-top: 0.25pt solid ${c.rule};
    padding-top: 8pt;
  }
</style>`;
}

/** Centered project title block + subtitle + thick green rule. */
export function summaryTitle(title: string, subtitle: string): string {
  return (
    '<div class="qbs-title-block">' +
      `<h1 class="qbs-title">${escapeHtml(title)}</h1>` +
      `<div class="qbs-subtitle">${escapeHtml(subtitle)}</div>` +
    '</div>' +
    '<hr class="qbs-rule" />'
  );
}

export interface InfoBarField {
  label: string;
  value: string;
}

/** Two-column project info bar. Pass left + right column fields separately. */
export function infoBar(left: InfoBarField[], right: InfoBarField[]): string {
  const max = Math.max(left.length, right.length);
  const rows: string[] = [];
  for (let i = 0; i < max; i++) {
    const l = left[i];
    if (l) {
      rows.push(`<div class="qbs-fld"><strong>${escapeHtml(l.label)}:</strong> ${escapeHtml(l.value)}</div>`);
    } else {
      rows.push('<div class="qbs-fld"></div>');
    }
    const r = right[i];
    if (r) {
      rows.push(`<div class="qbs-fld"><strong>${escapeHtml(r.label)}:</strong> ${escapeHtml(r.value)}</div>`);
    } else {
      rows.push('<div class="qbs-fld"></div>');
    }
  }
  return '<div class="qbs-info-bar">' + rows.join('') + '</div>';
}

export interface Kpi {
  label: string;
  value: string;
  /** Set true on exactly one KPI to give it the green-tinted highlight. */
  primary?: boolean;
}

/** Three KPI cards in a row. */
export function kpiRow(kpis: Kpi[]): string {
  return (
    '<div class="qbs-kpi-row">' +
      kpis.map((k) =>
        `<div class="qbs-kpi${k.primary ? ' qbs-kpi-primary' : ''}">` +
          `<div class="qbs-kpi-value">${escapeHtml(k.value)}</div>` +
          `<div class="qbs-kpi-label">${escapeHtml(k.label)}</div>` +
        '</div>'
      ).join('') +
    '</div>'
  );
}

/** Section header in the qbs visual language. */
export function summarySection(title: string): string {
  return `<h2 class="qbs-h2">${escapeHtml(title)}</h2>`;
}

/** Italic centered footer line. */
export function summaryFoot(text: string): string {
  return `<div class="qbs-foot">${escapeHtml(text)}</div>`;
}
