/**
 * SVG chart generators — pure functions that produce SVG strings.
 *
 * These power the output documents (Finance Summary, Bid Overview, etc.).
 * SVG is the portable viz choice: it renders in Word, Excel, PDF viewers,
 * and browsers identically. Mermaid is available separately for browser-
 * only interactive diagrams.
 *
 * Ported from the inline helpers in bundle-builder.html ~line 8900.
 */

import type { BrandColors } from '@models/brand';

// ──────────────────────────────────────────────────────────────────────
// Shared primitives
// ──────────────────────────────────────────────────────────────────────

export interface ChartColorPalette {
  /** Required — single-file app passes GCC_BRAND.colors. */
  colors: BrandColors;
  /** Optional extended palette for donut slices. */
  extendedPalette?: readonly string[];
}

function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtInt(n: number): string {
  return Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '0';
}

function fmtCurrency(n: number): string {
  if (!Number.isFinite(n)) return '$0';
  return '$' + Math.round(n).toLocaleString('en-US');
}

// ──────────────────────────────────────────────────────────────────────
// Horizontal bar chart
// ──────────────────────────────────────────────────────────────────────

export interface BarDatum {
  label: string;
  value: number;
  /** Optional per-row color. Falls back to opts.color or palette.forestGreen. */
  color?: string;
}

export interface BarChartOptions {
  width?: number;
  rowHeight?: number;
  gap?: number;
  labelWidth?: number;
  valueWidth?: number;
  /** Default bar color. */
  color?: string;
  /** Value formatter. Defaults to `fmtInt`. */
  fmt?: (v: number) => string;
  /** Accessibility label. */
  aria?: string;
}

export function svgBarChart(
  data: readonly BarDatum[],
  palette: ChartColorPalette,
  opts: BarChartOptions = {}
): string {
  const { colors } = palette;
  const w = opts.width ?? 620;
  const rowH = opts.rowHeight ?? 26;
  const gap = opts.gap ?? 6;
  const labelW = opts.labelWidth ?? 150;
  const valueW = opts.valueWidth ?? 90;
  const barMax = w - labelW - valueW - 10;
  const max = Math.max(1, ...data.map((d) => d.value));
  const h = data.length * (rowH + gap) + 10;
  const fmt = opts.fmt ?? fmtInt;
  const defaultColor = opts.color ?? colors.forestGreen;

  const rows = data
    .map((d, i) => {
      const v = Math.max(0, d.value);
      const barW = max > 0 ? Math.round((v / max) * barMax) : 0;
      const y = i * (rowH + gap) + 6;
      const color = d.color ?? defaultColor;
      return (
        '<g>' +
        `<text x="${labelW - 6}" y="${y + rowH * 0.68}" text-anchor="end" fill="${colors.slate}" font-size="10" font-weight="600">${escapeXml(d.label)}</text>` +
        `<rect x="${labelW}" y="${y}" width="${barMax}" height="${rowH}" fill="${colors.greenTint}" rx="2" ry="2"/>` +
        `<rect x="${labelW}" y="${y}" width="${barW}" height="${rowH}" fill="${color}" rx="2" ry="2"/>` +
        `<text x="${w - 4}" y="${y + rowH * 0.68}" text-anchor="end" fill="${colors.forestDark}" font-size="10" font-weight="800" font-family="Calibri,Inter,sans-serif">${escapeXml(fmt(v))}</text>` +
        '</g>'
      );
    })
    .join('');

  return (
    `<svg viewBox="0 0 ${w} ${h}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeXml(opts.aria ?? 'Bar chart')}" style="font-family:Calibri,Inter,sans-serif;">` +
    rows +
    '</svg>'
  );
}

// ──────────────────────────────────────────────────────────────────────
// Donut chart with right-side legend
// ──────────────────────────────────────────────────────────────────────

export interface DonutDatum {
  label: string;
  value: number;
  color?: string;
}

export interface DonutOptions {
  size?: number;
  centerLabel?: string;
  centerSub?: string;
  legendWidth?: number;
}

export function svgDonut(
  data: readonly DonutDatum[],
  palette: ChartColorPalette,
  opts: DonutOptions = {}
): string {
  const { colors } = palette;
  const size = opts.size ?? 220;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.45;
  const innerR = outerR * 0.62;
  const total = data.reduce((s, d) => s + d.value, 0);

  if (total <= 0) {
    return (
      `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">` +
      `<circle cx="${cx}" cy="${cy}" r="${outerR}" fill="none" stroke="${colors.rule}" stroke-width="${outerR - innerR}"/>` +
      `<text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="${colors.slate}" font-size="12">no data</text>` +
      '</svg>'
    );
  }

  const defaultPalette: readonly string[] = palette.extendedPalette ?? [
    colors.forestGreen,
    colors.warmGold,
    colors.forestDark,
    colors.slate,
    '#6B8F6E',
    '#C79A3A',
    '#3E5E40',
    '#778F92'
  ];

  let start = -Math.PI / 2;
  let arcs = '';
  const legendItems: Array<{ label: string; value: number; color: string; pct: string }> = [];

  data.forEach((d, i) => {
    const v = Math.max(0, d.value);
    if (v <= 0) return;
    const frac = v / total;
    const end = start + frac * Math.PI * 2;
    const color = d.color ?? defaultPalette[i % defaultPalette.length]!;
    const large = (end - start) > Math.PI ? 1 : 0;
    const x1 = cx + outerR * Math.cos(start);
    const y1 = cy + outerR * Math.sin(start);
    const x2 = cx + outerR * Math.cos(end);
    const y2 = cy + outerR * Math.sin(end);
    const xi2 = cx + innerR * Math.cos(end);
    const yi2 = cy + innerR * Math.sin(end);
    const xi1 = cx + innerR * Math.cos(start);
    const yi1 = cy + innerR * Math.sin(start);
    arcs +=
      `<path d="M ${x1} ${y1} A ${outerR} ${outerR} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${innerR} ${innerR} 0 ${large} 0 ${xi1} ${yi1} Z" fill="${color}" stroke="#fff" stroke-width="1"/>`;
    legendItems.push({ label: d.label, value: v, color, pct: (frac * 100).toFixed(1) });
    start = end;
  });

  const center = opts.centerLabel ?? fmtInt(total);
  const centerSub = (opts.centerSub ?? 'total').toUpperCase();
  const centerSvg =
    `<text x="${cx}" y="${cy - 3}" text-anchor="middle" fill="${colors.forestDark}" font-size="18" font-weight="800" font-family="Calibri,Inter,sans-serif">${escapeXml(center)}</text>` +
    `<text x="${cx}" y="${cy + 14}" text-anchor="middle" fill="${colors.slate}" font-size="9" letter-spacing="1.2" font-family="Calibri,Inter,sans-serif">${escapeXml(centerSub)}</text>`;

  const legendX = size + 14;
  const legendW = opts.legendWidth ?? 240;
  const legend = legendItems
    .map((it, i) => {
      const ly = 12 + i * 18;
      return (
        '<g>' +
        `<rect x="${legendX}" y="${ly - 8}" width="10" height="10" fill="${it.color}" rx="1"/>` +
        `<text x="${legendX + 16}" y="${ly}" fill="${colors.ink}" font-size="10" font-weight="600">${escapeXml(it.label)}</text>` +
        `<text x="${legendX + legendW - 4}" y="${ly}" fill="${colors.slate}" font-size="10" font-variant-numeric="tabular-nums" text-anchor="end">${fmtInt(it.value)} · ${it.pct}%</text>` +
        '</g>'
      );
    })
    .join('');

  const totalW = size + legendW + 20;
  const totalH = Math.max(size, 12 + legendItems.length * 18 + 6);
  return (
    `<svg viewBox="0 0 ${totalW} ${totalH}" width="100%" xmlns="http://www.w3.org/2000/svg" style="font-family:Calibri,Inter,sans-serif;">` +
    arcs +
    centerSvg +
    legend +
    '</svg>'
  );
}

// ──────────────────────────────────────────────────────────────────────
// Waterfall chart — price build-up visualisation
// ──────────────────────────────────────────────────────────────────────

export interface WaterfallStep {
  label: string;
  /** For non-anchor bars: additive delta (+ or −). */
  delta?: number;
  /** True when this step is an anchor bar drawn from 0 (e.g. the final "Sell"). */
  isTotal?: boolean;
  /** Absolute value for anchor bars. */
  value?: number;
}

export interface WaterfallOptions {
  width?: number;
  height?: number;
  fmt?: (v: number) => string;
}

export function svgWaterfall(
  steps: readonly WaterfallStep[],
  palette: ChartColorPalette,
  opts: WaterfallOptions = {}
): string {
  const { colors } = palette;
  const w = opts.width ?? 640;
  const h = opts.height ?? 220;
  const padL = 70;
  const padR = 10;
  const padT = 14;
  const padB = 36;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  let running = 0;
  let max = 0;
  const positions: Array<{
    start: number;
    end: number;
    label: string;
    delta?: number;
    isTotal: boolean;
  }> = steps.map((s) => {
    const start = running;
    if (s.isTotal) {
      running = s.value ?? running;
      return { start: 0, end: running, label: s.label, isTotal: true };
    }
    running += s.delta ?? 0;
    if (running > max) max = running;
    if (start > max) max = start;
    return { start, end: running, label: s.label, delta: s.delta ?? 0, isTotal: false };
  });
  max = Math.max(max, running, 1);

  const yFor = (v: number) => padT + plotH - Math.round((v / max) * plotH);
  const colW = Math.floor(plotW / steps.length) - 8;
  const fmt = opts.fmt ?? fmtCurrency;

  let bars = '';
  let connectors = '';
  let labels = '';

  positions.forEach((p, i) => {
    const x = padL + i * Math.floor(plotW / steps.length) + 4;
    const yTop = yFor(Math.max(p.start, p.end));
    const yBot = yFor(Math.min(p.start, p.end));
    const barH = Math.max(1, yBot - yTop);
    const positive = p.isTotal ? true : (p.delta ?? 0) >= 0;
    const color = p.isTotal ? colors.warmGold : (positive ? colors.forestGreen : '#B71C1C');
    bars += `<rect x="${x}" y="${yTop}" width="${colW}" height="${barH}" fill="${color}" rx="2"/>`;

    const labelY = yTop - 4;
    const shown = p.isTotal
      ? fmt(p.end)
      : ((positive ? '+' : '') + fmt(p.delta ?? 0));
    bars += `<text x="${x + colW / 2}" y="${labelY}" text-anchor="middle" fill="${colors.forestDark}" font-size="9" font-weight="800">${escapeXml(shown)}</text>`;

    labels += `<text x="${x + colW / 2}" y="${h - 18}" text-anchor="middle" fill="${colors.slate}" font-size="9">${escapeXml(p.label)}</text>`;

    if (i > 0) {
      const prev = positions[i - 1]!;
      const prevX2 = padL + (i - 1) * Math.floor(plotW / steps.length) + 4 + colW;
      const ly = yFor(prev.end);
      connectors += `<line x1="${prevX2}" y1="${ly}" x2="${x}" y2="${ly}" stroke="${colors.rule}" stroke-width="0.7" stroke-dasharray="2 2"/>`;
    }
  });

  const baseY = yFor(0);
  const axis =
    `<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${h - padB}" stroke="${colors.rule}" stroke-width="0.5"/>` +
    `<line x1="${padL}" y1="${baseY}" x2="${w - padR}" y2="${baseY}" stroke="${colors.rule}" stroke-width="0.5"/>`;

  return (
    `<svg viewBox="0 0 ${w} ${h}" width="100%" xmlns="http://www.w3.org/2000/svg" style="font-family:Calibri,Inter,sans-serif;">` +
    axis +
    connectors +
    bars +
    labels +
    '</svg>'
  );
}

// ──────────────────────────────────────────────────────────────────────
// Gauge — semi-circle margin gauge with 3 zones
// ──────────────────────────────────────────────────────────────────────

export interface GaugeOptions {
  width?: number;
  height?: number;
  /** Zone thresholds as fractions 0..1. Defaults to [0.12, 0.22]. */
  zones?: readonly [number, number];
  label?: string;
}

export function svgGauge(
  valuePct: number,
  palette: ChartColorPalette,
  opts: GaugeOptions = {}
): string {
  const { colors } = palette;
  const w = opts.width ?? 220;
  const h = opts.height ?? 130;
  const cx = w / 2;
  const cy = h - 18;
  const r = Math.min(w, h * 1.6) * 0.38;
  const [zLow, zMid] = opts.zones ?? [0.12, 0.22];
  const label = (opts.label ?? 'MARGIN').toUpperCase();
  const v = Math.max(0, Math.min(100, valuePct));

  const arc = (startFrac: number, endFrac: number, color: string): string => {
    const s = Math.PI + startFrac * Math.PI;
    const e = Math.PI + endFrac * Math.PI;
    const x1 = cx + r * Math.cos(s);
    const y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e);
    const y2 = cy + r * Math.sin(e);
    const large = (e - s) > Math.PI ? 1 : 0;
    return `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}" stroke="${color}" stroke-width="14" fill="none" stroke-linecap="butt"/>`;
  };

  const needleAngle = Math.PI + (v / 100) * Math.PI;
  const nx = cx + (r - 6) * Math.cos(needleAngle);
  const ny = cy + (r - 6) * Math.sin(needleAngle);
  const color = v >= zMid * 100 ? colors.forestGreen : (v >= zLow * 100 ? colors.warmGold : '#B71C1C');

  return (
    `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" style="font-family:Calibri,Inter,sans-serif;">` +
    arc(0,       zLow,   '#B71C1C') +
    arc(zLow,    zMid,   colors.warmGold) +
    arc(zMid,    1.0,    colors.forestGreen) +
    `<line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="${colors.ink}" stroke-width="2.5" stroke-linecap="round"/>` +
    `<circle cx="${cx}" cy="${cy}" r="5" fill="${colors.ink}"/>` +
    `<text x="${cx}" y="${cy - r - 4}" text-anchor="middle" fill="${color}" font-size="20" font-weight="800">${v.toFixed(1)}%</text>` +
    `<text x="${cx}" y="${h - 4}" text-anchor="middle" fill="${colors.slate}" font-size="9" letter-spacing="1">${escapeXml(label)}</text>` +
    '</svg>'
  );
}
