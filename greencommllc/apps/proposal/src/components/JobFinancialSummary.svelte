<!--
  JobFinancialSummary - Stage 4 right pane top.
  Updates live whenever the chosen tier, pricing, or discount changes.
  Shows deviation from the Balanced baseline so the estimator can see
  exactly how the chosen tier changes sell / margin.
-->
<script lang="ts">
  import { store, baseCostFromLines } from '@/store/intakeStore.svelte';
  import { LENGTH_DEFS, defaultCustomization } from '@models/customization';
  import { defaultPricingTiers } from '@pricing/tierDefaults';
  import { defaultDecisionInputs } from '@pricing/decisionScore';

  // Lazy-init so this component is self-sufficient.
  if (!store.intake.pricingTiers) {
    store.intake.pricingTiers = defaultPricingTiers(0, 0, 22);
  }
  if (!store.intake.decisionInputs) {
    store.intake.decisionInputs = defaultDecisionInputs();
  }
  if (!store.intake.customization) {
    store.intake.customization = defaultCustomization();
  }

  let tiers = $derived(store.intake.pricingTiers!);
  let dec   = $derived(store.intake.decisionInputs!);
  let cust  = $derived(store.intake.customization!);

  let chosenKey = $derived(tiers.chosenKey);
  let baseline  = $derived(tiers.balanced);
  let chosen    = $derived(tiers[chosenKey] ?? baseline);

  let cost = $derived(baseCostFromLines());
  let sellChosen = $derived(chosen.price);
  let sellBase   = $derived(baseline.price);
  let discount   = $derived((cust.overallDiscount || 0) / 100);
  let sellAfterDisc = $derived(Math.round(sellChosen * (1 - discount)));

  let marginChosen = $derived(sellAfterDisc > 0 ? ((sellAfterDisc - cost) / sellAfterDisc * 100) : 0);
  let marginBase   = $derived(sellBase > 0 ? ((sellBase - cost) / sellBase * 100) : 0);

  // Drops for per-drop derived.
  let drops = $derived.by(() => {
    const cw = store.intake.crosswalk;
    const n = (k: string) => Number(cw[k]?.value) || 0;
    return n('data_drops_count') + n('ap_count') + n('camera_count_commercial') + n('door_positions_count');
  });
  let perDrop = $derived(drops > 0 ? sellAfterDisc / drops : 0);

  // Deviation
  let devSell   = $derived(sellAfterDisc - sellBase);
  let devMargin = $derived(marginChosen - marginBase);
  let devBelowFloor = $derived(marginChosen < dec.marginTarget);

  // Labor summary
  let laborRate = $derived(cust.laborRateOverride ?? 125);
  let laborHrs = $derived(
    store.session.lines.reduce((s, l) => s + l.qty * l.laborHours, 0)
  );

  let bidDays = $derived.by(() => {
    const cw = store.intake.crosswalk;
    const raw = String(cw['bid_due_date']?.value ?? '');
    if (!raw) return null;
    const t = Date.parse(raw);
    return Number.isNaN(t) ? null : Math.round((t - Date.now()) / 86_400_000);
  });

  let lengthLabel = $derived(
    LENGTH_DEFS.find(L => L.key === cust.length)?.label ?? cust.length
  );

  function fmt$(n: number): string {
    return '$' + Math.round(n).toLocaleString('en-US');
  }

  function devClass(v: number): string {
    if (Math.abs(v) < 0.05) return 'jfs-dev-flat';
    return v >= 0 ? 'jfs-dev-up' : 'jfs-dev-down';
  }

  function arrow(v: number): string {
    if (Math.abs(v) < 0.05) return '';
    return v >= 0 ? '↑' : '↓';
  }
</script>

<div class="jfs-wrap">
  <div class="jfs-banner">
    Active tier: <span class="jfs-tier-chip">{chosen.label}</span>
    {#if devSell === 0}
      <span class="jfs-dev-note">(baseline)</span>
    {:else}
      <span class="jfs-dev-note {devClass(devSell)}">
        {arrow(devSell)} ${Math.abs(devSell).toLocaleString('en-US')} vs Balanced
      </span>
    {/if}
  </div>

  <div class="jfs-kpi-grid">
    <div class="jfs-kpi">
      <span class="jfs-kpi-k">Sell (out the door)</span>
      <span class="jfs-kpi-v">{fmt$(sellAfterDisc)}</span>
      {#if devSell !== 0}
        <span class="jfs-dev {devClass(devSell)}">{arrow(devSell)} {fmt$(Math.abs(devSell))}</span>
      {:else}
        <span class="jfs-dev jfs-dev-flat">baseline</span>
      {/if}
    </div>
    <div class="jfs-kpi">
      <span class="jfs-kpi-k">Cost @ catalog</span>
      <span class="jfs-kpi-v">{fmt$(cost)}</span>
      <span class="jfs-dev jfs-dev-flat">fixed</span>
    </div>
    <div class="jfs-kpi">
      <span class="jfs-kpi-k">Margin</span>
      <span class="jfs-kpi-v" class:jfs-dev-down={devBelowFloor}>{marginChosen.toFixed(1)}%</span>
      {#if Math.abs(devMargin) > 0.05}
        <span class="jfs-dev {devClass(devMargin)}">{arrow(devMargin)} {Math.abs(devMargin).toFixed(1)}pp</span>
      {:else}
        <span class="jfs-dev jfs-dev-flat">–</span>
      {/if}
    </div>
  </div>

  <div class="jfs-rows">
    <div class="jfs-row">
      <span class="jfs-row-k">Per-drop</span>
      <span class="jfs-row-v">{drops > 0 ? fmt$(perDrop) : '—'}{drops > 0 ? ` · ${drops.toLocaleString()} endpoints` : ''}</span>
    </div>
    <div class="jfs-row">
      <span class="jfs-row-k">Labor hrs · rate</span>
      <span class="jfs-row-v">{Math.round(laborHrs).toLocaleString()} hrs · ${laborRate}/hr</span>
    </div>
    <div class="jfs-row">
      <span class="jfs-row-k">Discount applied</span>
      <span class="jfs-row-v">{(discount * 100).toFixed(1)}%{discount > 0 ? ` (${fmt$(sellChosen - sellAfterDisc)} off)` : ''}</span>
    </div>
    <div class="jfs-row">
      <span class="jfs-row-k">Days to bid</span>
      <span class="jfs-row-v">{bidDays != null ? bidDays + 'd' : '—'}</span>
    </div>
    <div class="jfs-row">
      <span class="jfs-row-k">Packet length</span>
      <span class="jfs-row-v">{lengthLabel}</span>
    </div>
  </div>
</div>

<style>
  .jfs-wrap { display: flex; flex-direction: column; gap: 8px; }
  .jfs-banner {
    font-size: 11px; color: #374850;
    display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  }
  .jfs-tier-chip {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 10px; font-weight: 800; letter-spacing: 0.04em;
    padding: 2px 6px; border-radius: 2px;
    background: #FAF5E6; color: #8A6A00;
    border: 1px solid #D4AF37;
  }
  .jfs-dev-note { font-size: 11px; font-weight: 600; }

  .jfs-kpi-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px;
  }
  .jfs-kpi {
    background: white; border: 1px solid #CFD7D0; border-radius: 3px;
    padding: 6px 8px;
    display: flex; flex-direction: column; gap: 1px;
  }
  .jfs-kpi-k {
    font-size: 9px; color: #374850;
    text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700;
  }
  .jfs-kpi-v {
    font-size: 15px; font-weight: 800;
    color: #1B5E20; font-variant-numeric: tabular-nums; line-height: 1.1;
  }
  .jfs-dev { font-size: 10px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .jfs-dev-up   { color: #2E7D32; }
  .jfs-dev-down { color: #B71C1C; }
  .jfs-dev-flat { color: #6A726E; }

  .jfs-rows { display: flex; flex-direction: column; gap: 2px; }
  .jfs-row {
    display: grid; grid-template-columns: 1fr auto;
    gap: 10px;
    padding: 3px 4px;
    font-size: 11px;
    border-bottom: 1px dashed rgba(0,0,0,0.05);
  }
  .jfs-row:last-child { border-bottom: none; }
  .jfs-row-k { color: #374850; }
  .jfs-row-v { font-weight: 700; color: #14181C; font-variant-numeric: tabular-nums; }
</style>
