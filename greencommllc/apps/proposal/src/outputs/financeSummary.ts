/**
 * Finance Summary — INTERNAL roll-up document.
 *
 * Composes:
 *   - Hero block (project meta + headline KPIs)
 *   - KPI tiles (cost / sale / sell / per-drop / margin %)
 *   - Price-build-up waterfall (SVG)
 *   - Margin gauge (SVG)
 *   - Labor-by-category donut (SVG)
 *   - Pricing-strategy card grid (chosen tier highlighted)
 *   - Decision inputs summary + score
 *   - Risk & red-flag table
 *   - Closeout items checklist
 *
 * Returns the full HTML string + suggested filename. The caller decides
 * whether to open it in a new tab, download it, or write it to disk.
 */

import type { GccBrand, LogoMap } from '@models/brand';
import type { IntakeState, SessionState } from '@models/intake';
import type { DecisionResult, PricingStrategyKey } from '@models/pricing';
import type { RedFlag } from '@models/risk';
import { computeTotals, DEFAULT_TOTALS_CONFIG, type ComputeTotalsConfig } from '@pricing/computeTotals';
import { computeDecisionScore, defaultDecisionInputs } from '@pricing/decisionScore';
import { defaultPricingTiers } from '@pricing/tierDefaults';
import { seedRedFlags, mergeRedFlags } from '@risk/seedRedFlags';
import { CLOSEOUT_DEFS } from '@risk/closeoutCatalog';
import { PHASE_REQUIRED_CATS } from '@models/crosswalk';
import { svgWaterfall, svgGauge, svgDonut } from '@viz/svgCharts';
import { gccHtmlShell, docHero } from './shellHtml';

function fmtCurrency(n: number): string {
  if (!Number.isFinite(n)) return '$0';
  return '$' + Math.round(n).toLocaleString('en-US');
}
function fmtInt(n: number): string {
  return Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '0';
}
function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export interface FinanceSummaryInput {
  intake: IntakeState;
  session: SessionState;
  brand: GccBrand;
  logos: LogoMap;
  /** Billable endpoints — drives the per-drop floor/ceiling band. */
  drops: number;
  /** Optional project label for hero/footer. */
  projectLabel?: string;
  /** Override totals config. Defaults to GCC_KC defaults. */
  totalsConfig?: ComputeTotalsConfig;
}

export interface FinanceSummaryOutput {
  filename: string;
  html: string;
  /** The numeric snapshot at generation time. Surfaced so UI can show toast / KPIs. */
  summary: {
    cost: number;
    saleLineItems: number;
    sell: number;
    marginPct: number;
    decision: DecisionResult;
    flagCount: { high: number; med: number; info: number };
  };
}

export function renderFinanceSummary(inp: FinanceSummaryInput): FinanceSummaryOutput {
  const project = inp.projectLabel ?? 'Untitled Project';
  const totalsCfg = inp.totalsConfig ?? DEFAULT_TOTALS_CONFIG;
  const totals = computeTotals(inp.session.lines, inp.drops, totalsCfg);
  const cost = totals.costSubtotal;
  const saleLineItems = totals.saleSubtotal;
  const sell = totals.grand;
  const marginPct = sell > 0 ? ((sell - cost) / sell) * 100 : 0;
  const perDrop = inp.drops > 0 ? (sell / inp.drops) : 0;

  // Pricing strategy + decision inputs (lazy-init matching Stage 4 UI).
  const tiers = inp.intake.pricingTiers ?? defaultPricingTiers(saleLineItems);
  const dec = computeDecisionScore(
    inp.intake.decisionInputs ?? defaultDecisionInputs(),
    { baseSellTotal: saleLineItems, baseCost: cost }
  );

  // Red flags — auto-seeded from crosswalk merged with any user-added flags.
  const auto = seedRedFlags({
    crosswalk: inp.intake.crosswalk,
    currentPhase: inp.intake.currentPhase,
    tokenCategories: {},
    requiredByPhase: PHASE_REQUIRED_CATS
  });
  const flags: RedFlag[] = mergeRedFlags(inp.intake.redFlags, auto);
  const flagCount = {
    high: flags.filter(f => f.severity === 'high').length,
    med:  flags.filter(f => f.severity === 'med' ).length,
    info: flags.filter(f => f.severity === 'info').length
  };

  // ───── Hero ─────
  const hero = docHero('Finance Summary', {
    kind: 'INTERNAL · ESTIMATOR ROLL-UP',
    sub:  `Cost + margin analysis for ${project}. Internal document — do not distribute.`,
    meta: [
      { label: 'Quoted Sell',    value: fmtCurrency(sell) },
      { label: 'Cost @ Catalog', value: fmtCurrency(cost) },
      { label: 'Blended Margin', value: marginPct.toFixed(1) + '%' },
      { label: 'Endpoints',      value: fmtInt(inp.drops) + (inp.drops > 0 ? ' · ' + fmtCurrency(perDrop) + '/drop' : '') }
    ]
  });

  // ───── KPI tiles ─────
  const kpis =
    '<div class="grid3">' +
      `<div class="kpi"><div class="v">${fmtCurrency(cost)}</div><div class="l">Cost @ catalog</div></div>` +
      `<div class="kpi"><div class="v">${fmtCurrency(saleLineItems)}</div><div class="l">Line-Item Sale</div></div>` +
      `<div class="kpi"><div class="v">${fmtCurrency(sell)}</div><div class="l">Quoted Sell Price</div></div>` +
    '</div>' +
    '<div class="grid3" style="margin-top:10px;">' +
      `<div class="kpi"><div class="v">${inp.drops > 0 ? fmtCurrency(perDrop) : '—'}</div><div class="l">$ / Drop (${inp.drops} endpoints)</div></div>` +
      `<div class="kpi"><div class="v">${fmtInt(inp.session.lines.length)}</div><div class="l">Line Items</div></div>` +
      `<div class="kpi"><div class="v">${marginPct.toFixed(1)}%</div><div class="l">Blended Margin</div></div>` +
    '</div>';

  // ───── Waterfall + Gauge ─────
  const materialsCost = inp.session.lines
    .filter(l => l.src === 'eq' || l.src === 'ma')
    .reduce((s, l) => s + l.qty * l.costEach, 0);
  const tax = materialsCost * totalsCfg.taxRate;
  const preMarkup = saleLineItems + tax;
  const ohProfit = preMarkup * totalsCfg.ohProfit;
  const contingency = preMarkup * totalsCfg.contingency;
  const bondRequired = String((inp.intake.crosswalk['bond_required']?.value) ?? '').toLowerCase() === 'yes';
  const bond = bondRequired ? (preMarkup * totalsCfg.bondRate) : 0;

  const waterfallSvg = svgWaterfall(
    [
      { label: 'Cost',          delta: cost },
      { label: '+ Sale Uplift', delta: saleLineItems - cost },
      { label: '+ Tax',         delta: tax },
      { label: '+ O&H/Profit',  delta: ohProfit },
      { label: '+ Contingency', delta: contingency },
      ...(bond > 0 ? [{ label: '+ Bond', delta: bond }] : []),
      { label: 'Sell', isTotal: true, value: sell }
    ],
    { colors: inp.brand.colors },
    { width: 640, height: 220 }
  );
  const gaugeSvg = svgGauge(marginPct, { colors: inp.brand.colors }, { width: 240, height: 140 });

  const topVizRow =
    '<div class="grid2" style="grid-template-columns: 2fr 1fr;">' +
      '<div class="diagram-card dc-accent">' +
        '<div class="dc-title">Price Build-Up Waterfall</div>' +
        '<div class="dc-sub">Cost → markups → final turnkey sell. Gold bar is the quoted value.</div>' +
        waterfallSvg +
      '</div>' +
      '<div class="diagram-card">' +
        '<div class="dc-title">Margin Health</div>' +
        '<div class="dc-sub">Red < 12% · Gold 12-22% · Green ≥ 22%</div>' +
        gaugeSvg +
      '</div>' +
    '</div>';

  // ───── Labor donut ─────
  const laborByCat = new Map<string, number>();
  for (const ln of inp.session.lines) {
    const h = ln.qty * ln.laborHours;
    if (h <= 0) continue;
    laborByCat.set(ln.category, (laborByCat.get(ln.category) ?? 0) + h);
  }
  const laborSlices = [...laborByCat.entries()]
    .map(([label, value]) => ({ label, value: Math.round(value * 10) / 10 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const laborDonut = laborSlices.length > 0
    ? (
      '<div class="diagram-card">' +
        '<div class="dc-title">Labor Hours by Category</div>' +
        `<div class="dc-sub">${fmtInt(totals.hoursSubtotal)} total labor hours across ${laborSlices.length} categories.</div>` +
        svgDonut(laborSlices, { colors: inp.brand.colors }, { size: 180, centerLabel: fmtInt(totals.hoursSubtotal), centerSub: 'hours', legendWidth: 260 }) +
      '</div>'
    )
    : '';

  // ───── Category roll-up table ─────
  const catBuckets = new Map<string, { cost: number; sale: number; hrs: number; count: number }>();
  for (const ln of inp.session.lines) {
    const b = catBuckets.get(ln.category) ?? { cost: 0, sale: 0, hrs: 0, count: 0 };
    b.cost  += ln.qty * ln.costEach;
    b.sale  += ln.qty * ln.saleEach;
    b.hrs   += ln.qty * ln.laborHours;
    b.count += ln.qty;
    catBuckets.set(ln.category, b);
  }
  const catRows = [...catBuckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, b]) =>
      '<tr>' +
        `<td>${escapeHtml(k)}</td>` +
        `<td class="num">${fmtInt(b.count)}</td>` +
        `<td class="num">${b.hrs.toFixed(1)}</td>` +
        `<td class="money">${fmtCurrency(b.cost)}</td>` +
        `<td class="money">${fmtCurrency(b.sale)}</td>` +
        `<td class="money">${fmtCurrency(b.sale - b.cost)}</td>` +
      '</tr>'
    ).join('');
  const categoryTable =
    '<h2>Roll-up by Category</h2>' +
    '<table>' +
      '<thead><tr><th>Category</th><th class="num">Qty</th><th class="num">Labor hrs</th><th class="money">Cost</th><th class="money">Sale</th><th class="money">Contribution</th></tr></thead>' +
      '<tbody>' + (catRows || '<tr><td colspan="6" style="text-align:center;color:#999;">No line items yet.</td></tr>') + '</tbody>' +
    '</table>';

  // ───── Pricing Strategy tier grid ─────
  const tierCards = (['aggressive', 'balanced', 'conservative'] satisfies readonly PricingStrategyKey[])
    .map(k => {
      const t = tiers[k];
      const isChosen = tiers.chosenKey === k;
      const price = t.price;
      const mpct = price > 0 ? ((price - cost) / price) * 100 : 0;
      return '<div class="pt-out-card' + (isChosen ? ' pt-out-reco' : '') + '">' +
        (isChosen ? '<div class="pt-out-ribbon">★ Chosen</div>' : '') +
        `<div class="pt-out-label">${escapeHtml(t.label)}</div>` +
        `<div class="pt-out-price">${fmtCurrency(price)}</div>` +
        `<div class="pt-out-note"><strong>Margin:</strong> ${mpct.toFixed(1)}% · <strong>Win prob:</strong> ${t.winProb}%<br>${escapeHtml(t.note)}</div>` +
      '</div>';
    })
    .join('');
  const tiersBlock =
    '<h2>Pricing Strategy (Stage 4 Configurator)</h2>' +
    `<div class="pt-out-grid">${tierCards}</div>`;

  // ───── Decision Inputs summary ─────
  const d = inp.intake.decisionInputs ?? defaultDecisionInputs();
  const decisionTable =
    '<h2>Decision Inputs (Stage 4 Configurator)</h2>' +
    '<div class="grid2" style="gap:12pt;"><div><table><tbody>' +
      `<tr><td>Client value</td><td>${escapeHtml(d.clientStrategicValue)}</td></tr>` +
      `<tr><td>Pipeline strength</td><td>${escapeHtml(d.pipelineStrength)}</td></tr>` +
      `<tr><td>Competitive bidders</td><td>${fmtInt(d.competitiveBidders)}</td></tr>` +
      `<tr><td>Schedule risk</td><td>${escapeHtml(d.scheduleRisk)}</td></tr>` +
      `<tr><td>Team utilization</td><td>${d.teamUtilization}%</td></tr>` +
      `<tr><td>Cash urgency</td><td>${escapeHtml(d.cashUrgency)}</td></tr>` +
      `<tr><td>Scope clarity</td><td>${escapeHtml(d.scopeClarity)}</td></tr>` +
      `<tr><td>Margin floor</td><td>${d.marginTarget}%</td></tr>` +
    '</tbody></table></div><div><table style="max-width:320px;"><tbody>' +
      `<tr class="total-row"><td>Decision Score</td><td class="num">${dec.score} / 100</td></tr>` +
      `<tr><td>Recommended Strategy</td><td><strong>${escapeHtml(tiers[dec.reco].label)}</strong></td></tr>` +
      `<tr><td>Break-even (at ${(dec.marginTargetPct * 100).toFixed(0)}% floor)</td><td class="money">${fmtCurrency(dec.breakEven)}</td></tr>` +
      `<tr><td>Cost basis</td><td class="money">${fmtCurrency(dec.cost)}</td></tr>` +
    '</tbody></table></div></div>';

  // ───── Risk & Red Flags ─────
  const sevOrder = { high: 0, med: 1, info: 2 } as const;
  flags.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);
  const riskSummary =
    '<div class="grid3" style="gap:10pt;">' +
      `<div class="kpi" style="border-color:#B71C1C;"><div class="v" style="color:#B71C1C;">${flagCount.high}</div><div class="l">High Risk</div></div>` +
      `<div class="kpi" style="border-color:${inp.brand.colors.warmGold};"><div class="v" style="color:#8A6A00;">${flagCount.med}</div><div class="l">Medium</div></div>` +
      `<div class="kpi"><div class="v">${flagCount.info}</div><div class="l">Info</div></div>` +
    '</div>';
  const riskRows = flags.length > 0
    ? flags.map(f => {
        const sevLabel = f.severity === 'high' ? 'HIGH' : (f.severity === 'med' ? 'MED' : 'INFO');
        const sevBg    = f.severity === 'high' ? '#FCE8E4' : (f.severity === 'med' ? '#FFF6D6' : '#E8F2E9');
        const sevFg    = f.severity === 'high' ? '#B71C1C' : (f.severity === 'med' ? '#8A6A00' : inp.brand.colors.forestDark);
        return '<tr>' +
          `<td style="background:${sevBg};color:${sevFg};font-weight:700;text-align:center;">${sevLabel}</td>` +
          `<td>${escapeHtml(f.category)}</td>` +
          `<td>${escapeHtml(f.text)}${f.mitigation ? `<br><em style="color:${inp.brand.colors.slate};">${escapeHtml(f.mitigation)}</em>` : ''}</td>` +
          `<td style="text-align:center;">${f.resolved ? '✓' : '—'}</td>` +
        '</tr>';
      }).join('')
    : '<tr><td colspan="4" style="text-align:center;color:#999;">No flags detected.</td></tr>';
  const riskBlock =
    '<h2>Risk to GCC &amp; Red Flags (Stage 4 Configurator)</h2>' +
    riskSummary +
    '<table style="margin-top:10pt;">' +
      '<thead><tr><th style="width:50px;">Sev</th><th style="width:120px;">Category</th><th>Flag / Mitigation</th><th style="width:70px;">Mitigated</th></tr></thead>' +
      `<tbody>${riskRows}</tbody>` +
    '</table>';

  // ───── Closeout ─────
  const closeoutRows = CLOSEOUT_DEFS.map(c => {
    const checked = inp.intake.closeoutItems[c.key] !== false; // default ON
    return '<tr>' +
      `<td>${checked ? '✓' : '—'}</td>` +
      `<td>${escapeHtml(c.label)}</td>` +
      `<td>${escapeHtml(c.owner)}</td>` +
      `<td>${escapeHtml(c.whenDue)}</td>` +
    '</tr>';
  }).join('');
  const closeoutBlock =
    '<h2>Closeout Items (Stage 4 Configurator)</h2>' +
    '<table>' +
      '<thead><tr><th style="width:28px;">✓</th><th>Deliverable</th><th>Owner</th><th>Due</th></tr></thead>' +
      `<tbody>${closeoutRows}</tbody>` +
    '</table>';

  // ───── Assemble ─────
  const body = hero + kpis + topVizRow + laborDonut + categoryTable + tiersBlock + decisionTable + riskBlock + closeoutBlock;
  const html = gccHtmlShell(
    'Finance Summary',
    body,
    {
      classification: 'INTERNAL',
      docKind: 'Estimator Roll-up · Cost + Margin · DO NOT DISTRIBUTE',
      suppressTitle: true,
      projectLabel: project
    },
    { brand: inp.brand, logos: inp.logos }
  );

  const safeProject = project.replace(/[^a-z0-9 \-]/gi, '').trim();
  const filename = `INTERNAL - Finance Summary - ${safeProject || 'Untitled'}.xlsx`;

  return {
    filename,
    html,
    summary: {
      cost, saleLineItems, sell, marginPct,
      decision: dec,
      flagCount
    }
  };
}
