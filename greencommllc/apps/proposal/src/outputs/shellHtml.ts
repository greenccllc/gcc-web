/**
 * gccHtmlShell — wraps any output document body in the GCC brand shell.
 *
 * Produces a self-contained HTML string:
 *   - @page margins + print CSS
 *   - Classification ribbon (CLIENT / INTERNAL)
 *   - Letterhead band (logo + tagline + contact + Forest Green rule)
 *   - Optional legacy title band OR modern .doc-hero block
 *   - The body innerHtml
 *   - Footer with project + brand line + timestamp
 *   - Lazy Mermaid loader (only activates when a <pre class="mermaid"> is
 *     present and the doc is viewed in a browser)
 *
 * This is a PURE function. It does not touch the DOM. It takes the brand,
 * logos, and body content as arguments and returns a string.
 *
 * Ported from bundle-builder.html ~line 8589.
 */

import type { GccBrand, LogoVariant, LogoMap } from '@models/brand';

export type DocClassification = 'CLIENT' | 'INTERNAL';

export interface GccHtmlShellOptions {
  /** Document classification. Drives the ribbon color + "DO NOT DISTRIBUTE" suffix. */
  classification?: DocClassification;
  /** Small label above the title. e.g. "02 · Executive Summary". */
  docKind?: string;
  /** One-line subhead shown under the title. */
  subline?: string;
  /** Which logo to use in the letterhead. 'emblem' is the default. */
  logo?: LogoVariant;
  /** Landscape page size (for wide tables). Defaults to portrait Letter. */
  landscape?: boolean;
  /** Background color for the body. Defaults to white. */
  pageBg?: string;
  /** Project name shown in the footer. Defaults to 'Untitled Project'. */
  projectLabel?: string;
  /** Set true when the body contains its own .doc-hero — suppresses the legacy title band. */
  suppressTitle?: boolean;
  /** Override ribbon color. Defaults to brand forestGreen (client) or slate (internal). */
  accent?: string;
}

export interface GccHtmlShellDeps {
  brand: GccBrand;
  /** Logo base64 data URIs, one per variant. Supply GCC_LOGOS. */
  logos: LogoMap;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function gccHtmlShell(
  title: string,
  innerHtml: string,
  opts: GccHtmlShellOptions,
  deps: GccHtmlShellDeps
): string {
  const B             = deps.brand;
  const classification = (opts.classification ?? 'CLIENT').toUpperCase() as DocClassification;
  const isInternal    = classification === 'INTERNAL';
  const ribbon        = opts.accent ?? (isInternal ? B.colors.slate : B.colors.forestGreen);
  const project       = opts.projectLabel ?? 'Untitled Project';
  const docKind       = opts.docKind ?? '';
  const generatedAt   = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const logoKey: LogoVariant = opts.logo ?? 'emblem';
  const logoSrc       = logoKey !== 'none' ? (deps.logos[logoKey] ?? '') : '';
  const pageCss = opts.landscape
    ? '@page { size: Letter landscape; margin: 0.55in 0.55in 0.65in 0.55in; }'
    : '@page { size: Letter; margin: 0.75in 0.75in 0.65in 0.75in; }';
  const bgColor = opts.pageBg ?? '#ffffff';

  const css = [
    pageCss,
    'html,body{margin:0;padding:0;}',
    `body{font-family:"Calibri","Inter","Segoe UI",Arial,sans-serif;color:${B.colors.ink};font-size:10pt;line-height:1.4;background:${bgColor};}`,
    '.gcc-doc{max-width:7.0in;margin:0 auto;padding:0 0 24px 0;}',
    // Classification ribbon
    '.gcc-ribbon-row{margin:0 0 6px;text-align:right;}',
    `.gcc-ribbon{font-size:7.5pt;letter-spacing:0.2em;text-transform:uppercase;background:${ribbon};color:#fff;padding:3px 10px;border-radius:2px;display:inline-block;font-weight:600;}`,
    isInternal
      ? `.gcc-ribbon.internal{background:${B.colors.slate};color:#fff;}`
      : `.gcc-ribbon.client{background:${B.colors.forestGreen};color:#fff;}`,
    // Letterhead band
    `.gcc-letterhead{display:flex;justify-content:space-between;align-items:center;gap:18px;padding:0 0 6px;border-bottom:1.5pt solid ${B.colors.forestGreen};margin:0 0 10pt;}`,
    '.gcc-letterhead .lh-left{display:flex;align-items:center;gap:10px;}',
    '.gcc-letterhead .lh-left img.emblem{height:0.60in;width:auto;display:block;}',
    '.gcc-letterhead .lh-left img.stacked{height:0.90in;width:auto;display:block;}',
    '.gcc-letterhead .lh-left img.letterhead{height:2.00in;width:auto;display:block;}',
    '.gcc-letterhead .lh-left .wordmark{display:flex;flex-direction:column;line-height:1.05;}',
    `.gcc-letterhead .lh-left .wordmark .n1{font-size:14pt;font-weight:700;color:${B.colors.forestGreen};letter-spacing:0.01em;}`,
    `.gcc-letterhead .lh-left .wordmark .n2{font-size:8.5pt;font-weight:600;color:${B.colors.forestDark};letter-spacing:0.18em;text-transform:uppercase;margin-top:1pt;}`,
    '.gcc-letterhead .lh-right{text-align:right;line-height:1.3;}',
    `.gcc-letterhead .lh-right .tag{font-size:11pt;font-style:italic;color:${B.colors.forestGreen};font-weight:600;white-space:nowrap;}`,
    `.gcc-letterhead .lh-right .contact{font-size:8.5pt;color:${B.colors.slate};margin-top:2pt;}`,
    // Title band
    '.gcc-title-band{margin:0 0 14pt;}',
    `.gcc-title-band .kind{font-size:8.5pt;color:${B.colors.slate};font-weight:600;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:2pt;}`,
    `.gcc-title-band h1{margin:0;font-size:18pt;font-weight:700;color:${B.colors.forestDark};letter-spacing:-0.005em;line-height:1.15;}`,
    `.gcc-title-band .subline{margin-top:3pt;font-size:9pt;color:${B.colors.slate};}`,
    // Meta strip
    `.gcc-meta{background:${B.colors.greenTint};border-left:3px solid ${B.colors.forestGreen};padding:7pt 11pt;margin:0 0 14pt;font-size:9pt;color:${B.colors.ink};}`,
    '.gcc-meta dl{margin:0;display:grid;grid-template-columns:110px 1fr 110px 1fr;gap:3pt 12pt;}',
    `.gcc-meta dt{font-weight:700;color:${B.colors.forestDark};}`,
    '.gcc-meta dd{margin:0;}',
    // Body typography
    `.gcc-doc h2{color:${B.colors.forestDark};font-size:14pt;margin:16pt 0 6pt;padding-bottom:3pt;border-bottom:1pt solid ${B.colors.forestGreen};font-weight:700;line-height:1.2;}`,
    '.gcc-doc h2:first-of-type{margin-top:0;}',
    `.gcc-doc h3{color:${B.colors.forestDark};font-size:11pt;margin:10pt 0 4pt;font-weight:700;}`,
    `.gcc-doc h4{color:${B.colors.slate};font-size:9pt;margin:8pt 0 3pt;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;}`,
    '.gcc-doc p{margin:0 0 6pt;}',
    '.gcc-doc ul,.gcc-doc ol{margin:0 0 8pt;padding-left:16pt;}',
    '.gcc-doc li{margin-bottom:2pt;}',
    // Tables
    '.gcc-doc table{width:100%;border-collapse:collapse;margin:6pt 0 12pt;font-size:9pt;}',
    `.gcc-doc th{background:${B.colors.forestGreen};color:#fff;text-align:left;padding:6pt 8pt;font-weight:700;border:0.5pt solid ${B.colors.forestDark};font-size:10pt;}`,
    `.gcc-doc td{padding:6pt 8pt;border:0.5pt solid ${B.colors.rule};vertical-align:top;}`,
    `.gcc-doc tbody tr:nth-child(even){background:${B.colors.greenTint};}`,
    '.gcc-doc .num,.gcc-doc .qty,.gcc-doc .money{text-align:right;font-variant-numeric:tabular-nums;}',
    `.gcc-doc .total-row td{background:${B.colors.goldTint};font-weight:700;color:${B.colors.forestDark};border-top:1.5pt solid ${B.colors.warmGold};}`,
    `.gcc-doc .note{background:#FFFDF2;border-left:3px solid ${B.colors.warmGold};padding:7pt 11pt;margin:8pt 0;font-size:9pt;color:${B.colors.ink};}`,
    `.gcc-doc .callout{background:${B.colors.greenTint};border:1pt solid ${B.colors.forestGreen};border-radius:3pt;padding:8pt 12pt;margin:8pt 0;}`,
    '.gcc-doc .clause{margin:0 0 10pt;}',
    `.gcc-doc .clause-num{display:inline-block;min-width:2.2em;font-weight:700;color:${B.colors.forestDark};}`,
    `.gcc-doc .sig{margin-top:22pt;padding-top:10pt;border-top:0.5pt solid #DDD;white-space:pre-line;font-size:10pt;color:${B.colors.ink};}`,
    `.gcc-doc .sig .name{font-weight:700;color:${B.colors.forestDark};}`,
    '.gcc-doc .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:28pt;margin-top:18pt;}',
    `.gcc-doc .sig-grid .sig-col{padding-top:8pt;border-top:0.5pt solid ${B.colors.ink};font-size:9pt;color:${B.colors.slate};}`,
    `.gcc-doc .sig-grid .sig-col .lbl{font-weight:700;color:${B.colors.forestDark};margin-bottom:4pt;font-size:8.5pt;text-transform:uppercase;letter-spacing:0.08em;}`,
    '.gcc-doc .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12pt;}',
    '.gcc-doc .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:10pt;}',
    '.gcc-doc .grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:10pt;}',
    `.gcc-doc .kpi{background:#fff;border:1pt solid ${B.colors.forestGreen};border-radius:4pt;padding:8pt 10pt;text-align:center;}`,
    `.gcc-doc .kpi .v{font-size:18pt;font-weight:700;color:${B.colors.forestDark};line-height:1.1;font-variant-numeric:tabular-nums;}`,
    `.gcc-doc .kpi .l{font-size:8pt;color:${B.colors.slate};text-transform:uppercase;letter-spacing:0.08em;margin-top:2pt;}`,
    // Modern hero / cover
    `.gcc-doc .doc-hero{position:relative;background:linear-gradient(135deg,${B.colors.greenTint} 0%,#ffffff 65%);border:1pt solid ${B.colors.rule};border-left:6pt solid ${B.colors.forestGreen};border-radius:4pt;padding:18pt 22pt 18pt 24pt;margin:0 0 14pt;overflow:hidden;}`,
    `.gcc-doc .doc-hero:before{content:"";position:absolute;right:-40pt;top:-40pt;width:140pt;height:140pt;border-radius:50%;background:${B.colors.goldTint};opacity:0.6;z-index:0;}`,
    `.gcc-doc .doc-hero:after{content:"";position:absolute;right:20pt;bottom:-30pt;width:80pt;height:80pt;border-radius:50%;background:${B.colors.forestGreen};opacity:0.08;z-index:0;}`,
    '.gcc-doc .doc-hero>*{position:relative;z-index:1;}',
    `.gcc-doc .doc-hero .h-kind{font-size:8pt;color:${B.colors.warmGold};font-weight:800;text-transform:uppercase;letter-spacing:0.2em;margin:0 0 4pt;}`,
    `.gcc-doc .doc-hero .h-title{font-size:24pt;font-weight:800;color:${B.colors.forestDark};line-height:1.08;letter-spacing:-0.01em;margin:0 0 8pt;max-width:5.5in;}`,
    `.gcc-doc .doc-hero .h-sub{font-size:10pt;color:${B.colors.slate};line-height:1.45;margin:0 0 10pt;max-width:5.5in;}`,
    `.gcc-doc .doc-hero .h-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:8pt 14pt;margin-top:8pt;padding-top:8pt;border-top:0.5pt solid ${B.colors.rule};}`,
    `.gcc-doc .doc-hero .h-meta dt{font-size:7.5pt;color:${B.colors.slate};text-transform:uppercase;letter-spacing:0.1em;font-weight:600;margin:0;}`,
    `.gcc-doc .doc-hero .h-meta dd{font-size:10pt;color:${B.colors.forestDark};font-weight:700;margin:1pt 0 0;}`,
    // Diagram card + pricing grid + ROI bars + timeline + chips + section divider
    `.gcc-doc .diagram-card{background:#ffffff;border:1pt solid ${B.colors.rule};border-radius:4pt;padding:12pt 14pt;margin:10pt 0 14pt;box-shadow:0 1pt 3pt rgba(0,0,0,0.04);}`,
    `.gcc-doc .diagram-card .dc-title{font-size:10pt;font-weight:800;color:${B.colors.forestDark};text-transform:uppercase;letter-spacing:0.08em;margin:0 0 3pt;}`,
    `.gcc-doc .diagram-card .dc-sub{font-size:8.5pt;color:${B.colors.slate};margin:0 0 10pt;}`,
    '.gcc-doc .diagram-card svg{display:block;max-width:100%;height:auto;}',
    `.gcc-doc .diagram-card pre.mermaid{background:transparent;border:none;margin:0;padding:0;font-size:8.5pt;color:${B.colors.slate};font-family:"Consolas","Courier New",monospace;white-space:pre-wrap;}`,
    `.gcc-doc .diagram-card.dc-accent{border-left:4pt solid ${B.colors.warmGold};}`,
    '.gcc-doc .pt-out-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10pt;margin:10pt 0 14pt;}',
    `.gcc-doc .pt-out-card{position:relative;background:#ffffff;border:1pt solid ${B.colors.rule};border-radius:4pt;padding:12pt 12pt 10pt;text-align:left;}`,
    `.gcc-doc .pt-out-card.pt-out-reco{border:2pt solid ${B.colors.warmGold};background:${B.colors.goldTint};box-shadow:0 2pt 6pt rgba(212,175,55,0.18);}`,
    `.gcc-doc .pt-out-ribbon{position:absolute;top:-8pt;right:10pt;font-size:7pt;font-weight:900;letter-spacing:0.1em;background:${B.colors.warmGold};color:#fff;padding:2pt 7pt;border-radius:2pt;text-transform:uppercase;}`,
    `.gcc-doc .pt-out-label{font-size:9pt;color:${B.colors.slate};text-transform:uppercase;letter-spacing:0.08em;font-weight:700;margin:0 0 4pt;}`,
    `.gcc-doc .pt-out-price{font-size:20pt;font-weight:800;color:${B.colors.forestDark};font-variant-numeric:tabular-nums;line-height:1.1;margin:0 0 4pt;}`,
    `.gcc-doc .pt-out-note{font-size:8.5pt;color:${B.colors.slate};line-height:1.35;margin:0;}`,
    '.gcc-doc .roi-bars{display:flex;flex-direction:column;gap:6pt;margin:8pt 0 14pt;}',
    '.gcc-doc .roi-bar-row{display:grid;grid-template-columns:140pt 1fr 90pt;gap:8pt;align-items:center;font-size:9pt;}',
    `.gcc-doc .roi-bar-k{color:${B.colors.slate};font-weight:600;}`,
    `.gcc-doc .roi-bar-track{background:${B.colors.greenTint};height:14pt;border-radius:2pt;overflow:hidden;position:relative;}`,
    `.gcc-doc .roi-bar-fill{height:100%;background:linear-gradient(90deg,${B.colors.forestGreen},${B.colors.forestDark});border-radius:2pt;}`,
    `.gcc-doc .roi-bar-fill.bar-gold{background:linear-gradient(90deg,${B.colors.warmGold},#B8951F);}`,
    `.gcc-doc .roi-bar-v{color:${B.colors.forestDark};font-weight:800;font-variant-numeric:tabular-nums;text-align:right;}`,
    '.gcc-doc .chip-row{display:flex;flex-wrap:wrap;gap:5pt;margin:4pt 0 10pt;}',
    `.gcc-doc .chip{display:inline-block;font-size:8pt;font-weight:700;padding:3pt 8pt;border-radius:999pt;background:${B.colors.greenTint};color:${B.colors.forestDark};border:0.5pt solid ${B.colors.forestGreen};letter-spacing:0.04em;}`,
    `.gcc-doc .chip.chip-gold{background:${B.colors.goldTint};color:${B.colors.forestDark};border-color:${B.colors.warmGold};}`,
    `.gcc-doc .chip.chip-slate{background:#F3F5F4;color:${B.colors.slate};border-color:${B.colors.rule};}`,
    `.gcc-doc .sect-div{display:flex;align-items:center;gap:10pt;margin:18pt 0 8pt;color:${B.colors.warmGold};}`,
    `.gcc-doc .sect-div:before,.gcc-doc .sect-div:after{content:"";flex:1;height:1pt;background:linear-gradient(90deg,transparent,${B.colors.warmGold},transparent);}`,
    '.gcc-doc .sect-div span{font-size:8pt;font-weight:900;text-transform:uppercase;letter-spacing:0.25em;}',
    // Pagination + footer
    '.gcc-doc .pg-break{page-break-before:always;}',
    '.gcc-doc .avoid-break{page-break-inside:avoid;}',
    `.gcc-footer{margin-top:18pt;padding-top:6pt;border-top:0.5pt solid ${B.colors.rule};font-size:8pt;color:${B.colors.slate};display:flex;justify-content:space-between;gap:14pt;}`,
    '.gcc-footer .center{text-align:center;flex:1;}',
    // Print-color fix
    '@media print{.gcc-doc{max-width:none;}.gcc-ribbon{print-color-adjust:exact;-webkit-print-color-adjust:exact;}.gcc-letterhead,.gcc-footer,.gcc-doc th,.gcc-doc .total-row td,.gcc-meta{print-color-adjust:exact;-webkit-print-color-adjust:exact;}}'
  ].join('\n');

  const classificationSuffix = isInternal ? ' · DO NOT DISTRIBUTE' : '';
  const ribbonHtml = `<div class="gcc-ribbon-row"><span class="gcc-ribbon ${isInternal ? 'internal' : 'client'}">${escapeHtml(classification)}${escapeHtml(classificationSuffix)}</span></div>`;

  const letterhead =
    '<div class="gcc-letterhead">' +
      '<div class="lh-left">' +
        (logoSrc ? `<img class="${escapeHtml(logoKey)}" src="${logoSrc}" alt="GCC">` : '') +
        (logoKey === 'emblem'
          ? `<div class="wordmark"><span class="n1">Green Communications</span><span class="n2">Contracting LLC</span></div>`
          : '') +
      '</div>' +
      '<div class="lh-right">' +
        `<div class="tag">${escapeHtml(B.company.tagline)}</div>` +
        `<div class="contact">${escapeHtml(B.company.main_phone)} · ${escapeHtml(B.company.main_email)} · ${escapeHtml(B.company.service_area)}</div>` +
      '</div>' +
    '</div>';

  const titleBand = opts.suppressTitle
    ? ''
    : (
        '<div class="gcc-title-band">' +
          (docKind ? `<div class="kind">${escapeHtml(docKind)}</div>` : '') +
          `<h1>${escapeHtml(title)}</h1>` +
          (opts.subline ? `<div class="subline">${escapeHtml(opts.subline)}</div>` : '') +
        '</div>'
      );

  const footer =
    '<div class="gcc-footer">' +
      `<span>${escapeHtml(project)}</span>` +
      `<span class="center">${escapeHtml(isInternal ? B.footerBand.replace('Proprietary & Confidential', 'INTERNAL · Proprietary & Confidential') : B.footerBand)}</span>` +
      `<span>${escapeHtml(generatedAt)}</span>` +
    '</div>';

  // Mermaid lazy loader — escapes </script> to avoid the in-string-tag trap.
  const mermaidLoader =
    '<scr' + 'ipt>(function(){' +
      'var hasMermaid = document.querySelector("pre.mermaid, code.language-mermaid");' +
      'if (!hasMermaid) return;' +
      'var s = document.createElement("script");' +
      's.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";' +
      's.onload = function(){' +
        `try { window.mermaid.initialize({ startOnLoad: false, theme: "default", themeVariables: { primaryColor: "${B.colors.greenTint}", primaryTextColor: "${B.colors.forestDark}", primaryBorderColor: "${B.colors.forestGreen}", lineColor: "${B.colors.slate}", fontFamily: "Calibri, Inter, sans-serif" } }); window.mermaid.run({ querySelector: "pre.mermaid, code.language-mermaid" }); } catch(e){}` +
      '};' +
      'document.head.appendChild(s);' +
    '})();<\/scr' + 'ipt>';

  return [
    '<!doctype html>',
    '<html lang="en"><head><meta charset="utf-8">',
    `<title>${escapeHtml(title)} — ${escapeHtml(project)}</title>`,
    `<style>${css}</style>`,
    '</head><body>',
    '<div class="gcc-doc">',
    ribbonHtml,
    letterhead,
    titleBand,
    innerHtml,
    footer,
    '</div>',
    mermaidLoader,
    '</body></html>'
  ].join('\n');
}

/** Modern hero title block — use when opts.suppressTitle=true. */
export interface DocHeroMetaItem { label: string; value: string; }
export interface DocHeroOptions {
  kind?: string;
  sub?: string;
  meta?: readonly DocHeroMetaItem[];
}
export function docHero(title: string, opts: DocHeroOptions = {}): string {
  const metaHtml = opts.meta && opts.meta.length > 0
    ? '<dl class="h-meta">' + opts.meta.map(m =>
        `<div><dt>${escapeHtml(m.label)}</dt><dd>${escapeHtml(m.value)}</dd></div>`
      ).join('') + '</dl>'
    : '';
  return '<div class="doc-hero">' +
    (opts.kind ? `<div class="h-kind">${escapeHtml(opts.kind)}</div>` : '') +
    `<h1 class="h-title">${escapeHtml(title)}</h1>` +
    (opts.sub ? `<div class="h-sub">${escapeHtml(opts.sub)}</div>` : '') +
    metaHtml +
  '</div>';
}
