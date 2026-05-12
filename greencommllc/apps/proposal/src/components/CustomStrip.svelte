<!--
  CustomStrip — Stage 4 top toolbar.
  Length · Labor rate override · Overall discount · Margin floor · Regenerate.
  Every edit calls store.markStale() so the Regenerate badge lights up.
-->
<script lang="ts">
  import { store } from '@/store/intakeStore.svelte';
  import { LENGTH_DEFS, defaultCustomization } from '@models/customization';
  import { defaultDecisionInputs } from '@pricing/decisionScore';

  interface Props {
    onRegenerate?: () => void;
  }
  let { onRegenerate }: Props = $props();

  if (!store.intake.customization) store.intake.customization = defaultCustomization();
  if (!store.intake.decisionInputs) store.intake.decisionInputs = defaultDecisionInputs();

  let cust = $derived(store.intake.customization!);
  let dec  = $derived(store.intake.decisionInputs!);
  let staleReason = $derived(cust.staleReason);

  function onLengthChange(v: string) {
    store.intake.customization!.length = v as any;
    store.markStale('length changed');
  }
  function onLaborRateChange(v: string) {
    store.intake.customization!.laborRateOverride = v === '' ? null : (Number(v) || 0);
    store.markStale('labor rate changed');
  }
  function onDiscountChange(v: string) {
    store.intake.customization!.overallDiscount = Number(v) || 0;
    store.markStale('discount changed');
  }
  function onMarginFloorChange(v: string) {
    store.intake.decisionInputs!.marginTarget = Number(v) || 0;
    store.markStale('margin floor changed');
  }
</script>

<div class="custom-strip">
  <label class="cs-field">
    <span class="cs-k">Length</span>
    <select value={cust.length} onchange={(e) => onLengthChange((e.target as HTMLSelectElement).value)}>
      {#each LENGTH_DEFS as L (L.key)}
        <option value={L.key} title={L.desc}>{L.label}</option>
      {/each}
    </select>
  </label>
  <label class="cs-field">
    <span class="cs-k">Labor rate</span>
    <input
      type="number"
      value={cust.laborRateOverride ?? ''}
      placeholder="$125"
      min="0"
      step="5"
      oninput={(e) => onLaborRateChange((e.target as HTMLInputElement).value)}
    />
  </label>
  <label class="cs-field">
    <span class="cs-k">Discount</span>
    <input
      type="number"
      value={cust.overallDiscount}
      min="0"
      max="15"
      step="0.5"
      oninput={(e) => onDiscountChange((e.target as HTMLInputElement).value)}
    />
  </label>
  <label class="cs-field">
    <span class="cs-k">Margin floor</span>
    <input
      type="number"
      value={dec.marginTarget}
      min="0"
      max="60"
      step="1"
      oninput={(e) => onMarginFloorChange((e.target as HTMLInputElement).value)}
    />
  </label>
  <button type="button" class="cs-regen-btn" onclick={() => onRegenerate?.()}
          title="Re-generate all in-scope deliverables with current tier + alts + options">
    <span class="cs-regen-icn">⟳</span> Regenerate proposal
    {#if staleReason}
      <span class="cs-regen-stale">⚠ {staleReason}</span>
    {/if}
  </button>
</div>

<style>
  .custom-strip {
    display: grid;
    grid-template-columns: repeat(4, minmax(110px, 1fr)) auto;
    gap: 8px 10px;
    align-items: center;
    padding: 8px 10px;
    margin-bottom: 10px;
    background: white;
    border: 1px solid #CFD7D0;
    border-radius: 4px;
    box-shadow: 0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06);
  }
  @media (max-width: 960px) {
    .custom-strip { grid-template-columns: repeat(2, 1fr); }
    .cs-regen-btn { grid-column: 1 / -1; }
  }
  .cs-field { display: flex; flex-direction: column; gap: 2px; }
  .cs-k {
    font-size: 9px;
    font-weight: 800;
    color: #374850;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .cs-field select, .cs-field input {
    padding: 4px 6px;
    border: 1px solid #CFD7D0;
    border-radius: 3px;
    font-size: 13px;
    font-weight: 700;
    font-family: inherit;
    font-variant-numeric: tabular-nums;
  }
  .cs-regen-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 14px;
    background: #2E7D32;
    color: white;
    border: none;
    border-radius: 3px;
    font-size: 13px; font-weight: 800;
    letter-spacing: 0.03em;
    cursor: pointer;
    text-transform: uppercase;
    white-space: nowrap;
    transition: background 140ms ease, transform 140ms ease, box-shadow 140ms ease;
    box-shadow: 0 2px 4px rgba(46,125,50,0.25);
    font-family: inherit;
  }
  .cs-regen-btn:hover { background: #1B5E20; transform: translateY(-1px); box-shadow: 0 3px 8px rgba(46,125,50,0.35); }
  .cs-regen-icn { font-size: 15px; line-height: 1; }
  .cs-regen-stale {
    font-size: 9px; font-weight: 800; letter-spacing: 0.04em;
    background: rgba(255,255,255,0.15);
    padding: 2px 6px; border-radius: 2px;
    margin-left: 4px;
  }
</style>
