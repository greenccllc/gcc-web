<!--
  PricingStrategy v2 — Stage 4 center pane.
  Five tier cards (Floor / Aggressive / Balanced / Conservative / Premium)
  + Customization strip at the top + Alts & Deducts checklist + combined
  Decision & Risk pane below. Any edit auto-marks the packet stale via
  store.markStale().
-->
<script lang="ts">
  import { store, baseCostFromLines, baseSaleFromLines } from '@/store/intakeStore.svelte';
  import { computeDecisionScore, defaultDecisionInputs } from '@pricing/decisionScore';
  import { defaultPricingTiers } from '@pricing/tierDefaults';
  import DecisionInputs from './DecisionInputs.svelte';
  import DecisionGauge from './DecisionGauge.svelte';
  import CustomStrip from './CustomStrip.svelte';
  import AltsDeducts from './AltsDeducts.svelte';
  import { TIER_KEYS, type PricingStrategyKey } from '@models/pricing';
  import { defaultCustomization } from '@models/customization';
  import { defaultAltDeducts, enforceAltDeductLocks } from '@models/altDeducts';

  interface Props {
    onRegenerate?: () => void;
  }
  let { onRegenerate }: Props = $props();

  // Lazy-init all four Stage-4 models. Migrate legacy 3-tier data from
  // any older localStorage payload that lacks `floor` or `premium`.
  const needsMigration =
    !store.intake.pricingTiers ||
    !store.intake.pricingTiers.floor ||
    !store.intake.pricingTiers.premium;
  if (needsMigration) {
    const floor = store.intake.decisionInputs?.marginTarget ?? 22;
    store.intake.pricingTiers = defaultPricingTiers(baseSaleFromLines(), baseCostFromLines(), floor);
  }
  if (!store.intake.decisionInputs) {
    store.intake.decisionInputs = defaultDecisionInputs();
  }
  if (!store.intake.customization) {
    store.intake.customization = defaultCustomization();
  }
  if (!store.intake.altDeducts || Object.keys(store.intake.altDeducts).length === 0) {
    store.intake.altDeducts = defaultAltDeducts();
  }
  // Enforce locks on every render.
  enforceAltDeductLocks(store.intake.altDeducts);

  let tiers     = $derived(store.intake.pricingTiers!);
  let decInputs = $derived(store.intake.decisionInputs!);

  let decision = $derived(
    computeDecisionScore(decInputs, {
      baseSellTotal: baseSaleFromLines(),
      baseCost: baseCostFromLines()
    })
  );

  function marginPctFor(price: number): number {
    const cost = baseCostFromLines();
    return price > 0 ? ((price - cost) / price) * 100 : 0;
  }

  function chooseTier(k: PricingStrategyKey) {
    store.intake.pricingTiers!.chosenKey = k;
    store.markStale('tier changed');
  }

  function onPriceInput(k: PricingStrategyKey, v: number) {
    store.intake.pricingTiers![k].price = v;
    store.markStale('price changed');
  }

  function onDecisionChange() {
    store.markStale('decision inputs changed');
  }

  function handleRegenerate() {
    if (onRegenerate) onRegenerate();
  }

  function fmt$(n: number): string {
    return '$' + Math.round(n).toLocaleString('en-US');
  }
</script>

<!-- Top customization strip -->
<CustomStrip onRegenerate={handleRegenerate} />

<div class="pt-wrap">
  <div class="pt-section-hdr">
    Pricing Strategy <span class="pt-sub">which price am I submitting?</span>
  </div>
  <div class="pt-grid-5">
    {#each TIER_KEYS as k (k)}
      {@const t = tiers[k]}
      {@const chosen = tiers.chosenKey === k}
      {@const suggested = decision.reco === k && !chosen}
      {@const mpct = marginPctFor(t.price)}
      {@const below = mpct < decInputs.marginTarget}
      <div
        class="pt-card"
        class:pt-reco={chosen}
        class:pt-suggested={suggested}
        onclick={() => chooseTier(k)}
        role="button"
        tabindex="0"
        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') chooseTier(k); }}
      >
        {#if chosen}<div class="pt-ribbon">YOUR CHOICE</div>{/if}
        {#if suggested}<div class="pt-ribbon pt-ribbon-suggest">☞ SUGGESTED</div>{/if}
        <div class="pt-label">{t.label}</div>
        <div class="pt-price-row">
          <span class="pt-price-k">$</span>
          <input
            type="number"
            class="pt-price-input"
            value={t.price}
            min="0"
            step="100"
            onclick={(e) => e.stopPropagation()}
            oninput={(e) => onPriceInput(k, Number((e.target as HTMLInputElement).value) || 0)}
          />
        </div>
        <div class="pt-tier-stats">
          <span class="pt-stat">
            <span class="pt-stat-k">margin</span>
            <span class="pt-stat-v" class:pt-stat-warn={below}>{mpct.toFixed(1)}%</span>
          </span>
          <span class="pt-stat">
            <span class="pt-stat-k">win prob</span>
            <span class="pt-stat-v">{t.winProb}%</span>
          </span>
        </div>
        <div class="pt-note">{t.note}</div>
      </div>
    {/each}
  </div>
</div>

<!-- Alts & Deducts checklist -->
<AltsDeducts />

<!-- Combined Decision & Risk (kept inline for now; RiskDashboard handles flags) -->
<div class="di-wrap">
  <div class="pt-section-hdr">
    Decision Inputs <span class="pt-sub">what drives my choice?</span>
  </div>
  <DecisionInputs bind:value={store.intake.decisionInputs!} onChange={onDecisionChange} />
  <div class="di-output-row">
    <div class="di-gauge">
      <DecisionGauge score={decision.score} reco={decision.reco} />
    </div>
    <div class="di-outputs">
      <div class="di-out">
        <span class="di-out-k">Recommendation</span>
        <span class="di-out-v di-reco-{decision.reco}">{tiers[decision.reco].label}</span>
      </div>
      <div class="di-out">
        <span class="di-out-k">Break-even (at {(decision.marginTargetPct * 100).toFixed(0)}% floor)</span>
        <span class="di-out-v">{fmt$(decision.breakEven)}</span>
      </div>
      <div class="di-out">
        <span class="di-out-k">Cost basis</span>
        <span class="di-out-v">{fmt$(decision.cost)}</span>
      </div>
    </div>
  </div>
</div>

<style>
  .pt-wrap, .di-wrap {
    background: white;
    border: 1px solid #CFD7D0;
    border-radius: 4px;
    padding: 10px;
    margin-bottom: 10px;
  }
  .pt-section-hdr {
    font-size: 12px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.04em; color: #1B5E20; margin: 0 0 8px;
  }
  .pt-sub {
    font-size: 10px; font-weight: 500; color: #6A726E;
    letter-spacing: 0; text-transform: none; margin-left: 8px; font-style: italic;
  }
  .pt-grid-5 {
    display: grid;
    grid-template-columns: repeat(5, minmax(130px, 1fr));
    gap: 8px;
  }
  @media (max-width: 1200px) { .pt-grid-5 { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 760px)  { .pt-grid-5 { grid-template-columns: repeat(2, 1fr); } }
  .pt-card {
    position: relative;
    border: 1px solid #CFD7D0;
    border-radius: 4px;
    padding: 8px 9px;
    background: #FAFAF8;
    cursor: pointer;
    transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
  }
  .pt-card:hover { border-color: #2E7D32; box-shadow: 0 2px 6px rgba(16,24,40,0.08); }
  .pt-card.pt-reco {
    border: 2px solid #D4AF37;
    background: #FAF5E6;
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(16,24,40,0.10);
  }
  .pt-card.pt-suggested {
    border: 1.5px dashed #2E7D32;
    background: #F1F8F1;
  }
  .pt-ribbon {
    position: absolute; top: -8px; right: 8px;
    font-size: 9px; font-weight: 900; letter-spacing: 0.08em;
    background: #D4AF37; color: white;
    padding: 2px 6px; border-radius: 2px;
    text-transform: uppercase;
  }
  .pt-ribbon-suggest { background: #2E7D32; right: auto; left: 8px; }
  .pt-label {
    font-weight: 800; font-size: 12px; color: #1B5E20;
    text-transform: uppercase; letter-spacing: 0.03em;
  }
  .pt-price-row { display: flex; align-items: baseline; gap: 2px; margin: 6px 0 4px; }
  .pt-price-k { font-weight: 800; color: #2E7D32; font-size: 14px; }
  .pt-price-input {
    font-weight: 800; font-size: 18px; color: #14181C;
    border: none; background: transparent; width: 100%;
    outline: none;
    font-variant-numeric: tabular-nums;
    font-family: inherit;
  }
  .pt-price-input:focus { background: white; border-radius: 2px; }
  .pt-note { font-size: 10px; color: #6A726E; line-height: 1.3; margin-top: 4px; }
  .pt-tier-stats {
    display: flex; gap: 4px;
    padding: 4px 0;
    border-top: 1px dashed #CFD7D0;
    margin: 4px 0 0;
  }
  .pt-stat { display: flex; flex-direction: column; gap: 1px; flex: 1; }
  .pt-stat-k { font-size: 9px; color: #374850; text-transform: uppercase; letter-spacing: 0.04em; }
  .pt-stat-v { font-weight: 800; font-size: 11px; color: #1B5E20; font-variant-numeric: tabular-nums; }
  .pt-stat-v.pt-stat-warn { color: #B71C1C; }

  .di-output-row {
    display: grid; grid-template-columns: 210px 1fr; gap: 12px;
    padding-top: 8px; border-top: 1px dashed #CFD7D0;
    align-items: center;
  }
  @media (max-width: 760px) { .di-output-row { grid-template-columns: 1fr; } }
  .di-gauge { display: flex; justify-content: center; align-items: center; }
  .di-outputs { display: flex; flex-direction: column; gap: 4px; }
  .di-out {
    background: #FAFAF8;
    border: 1px solid #CFD7D0;
    border-radius: 3px;
    padding: 6px 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }
  .di-out-k { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #374850; }
  .di-out-v { font-weight: 800; font-variant-numeric: tabular-nums; color: #1B5E20; }
  .di-out-v.di-reco-floor        { color: #7B0F0F; }
  .di-out-v.di-reco-aggressive   { color: #B71C1C; }
  .di-out-v.di-reco-balanced     { color: #8A6A00; }
  .di-out-v.di-reco-conservative { color: #2E7D32; }
  .di-out-v.di-reco-premium      { color: #1B5E20; }
</style>
