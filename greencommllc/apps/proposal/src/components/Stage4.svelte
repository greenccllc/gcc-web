<!--
  Stage4 v2 - Proposal Configurator 3-pane layout.
    LEFT   : TOC tree + Closeout Items
    CENTER : Pricing Strategy (5 tiers) + Alts/Deducts + Decision & Risk
    RIGHT  : Job Financial Summary + Labor Plan
  Clicking a TOC node opens the doc preview modal. Hitting Regenerate
  runs all in-scope deliverables and clears the stale reason.
-->
<script lang="ts">
  import CloseoutItems from './CloseoutItems.svelte';
  import PricingStrategy from './PricingStrategy.svelte';
  import JobFinancialSummary from './JobFinancialSummary.svelte';
  import LaborPlan from './LaborPlan.svelte';
  import ProposalTocTree from './ProposalTocTree.svelte';
  import DocPreviewModal from './DocPreviewModal.svelte';
  import ThemePicker from './ThemePicker.svelte';
  import { store } from '@/store/intakeStore.svelte';
  import { tocInScope, type TocDef } from '@models/toc';
  import { defaultCustomization } from '@models/customization';
  import { buildItems, buildZip, downloadZip } from '@/outputs/exportBundle';

  let previewDef = $state<TocDef | null>(null);
  let exporting = $state(false);

  function openPreview(def: TocDef) { previewDef = def; }
  function closePreview() { previewDef = null; }

  function regenerateAll() {
    if (!store.intake.customization) store.intake.customization = defaultCustomization();
    const scope = tocInScope(store.intake.customization.length);
    // Stamp each in-scope deliverable as generated NOW. Actual document
    // generation happens lazily when the user opens the preview; this
    // keeps regenerate fast while still marking status badges fresh.
    const now = new Date().toISOString();
    for (const t of scope) store.intake.generatedAt[t.key] = now;
    store.markFresh();
  }

  async function exportBundle() {
    exporting = true;
    try {
      const blob = await buildZip(store.intake, store.session);
      const date = new Date().toISOString().slice(0, 10);
      downloadZip(blob, `gcc-proposal-${date}.zip`);
    } finally {
      exporting = false;
    }
  }

  const exportSummary = $derived.by(() => {
    const items = buildItems(store.intake, store.session);
    const styled = items.filter((i) => i.styled).length;
    return { total: items.length, styled };
  });
</script>

<div class="final-configurator-v2">
  <div class="fcfg-head">
    <div class="fcfg-head-left">
      <h2>Proposal Configurator</h2>
      <span class="fcfg-note">Pick a tier to see the financial impact. Regenerate to rebuild the proposal.</span>
    </div>
    <div class="fcfg-head-actions">
      <span class="fcfg-export-summary">
        {exportSummary.styled}/{exportSummary.total} styled
      </span>
      <button type="button" class="fcfg-export-btn" onclick={exportBundle} disabled={exporting}>
        {exporting ? 'Bundling…' : '↓ Export bundle'}
      </button>
    </div>
  </div>

  <div class="fcfg-theme-row">
    <ThemePicker />
  </div>

  <div class="fcfg-grid-v2">
    <!-- LEFT: TOC + Closeout -->
    <section class="fcfg-panel fcfg-panel-left">
      <div class="fcfg-panel-hdr">
        <h3>Proposal Packet</h3>
        <span class="fcfg-panel-sub">deliverables · click to preview</span>
      </div>
      <ProposalTocTree onSelect={openPreview} />
      <div class="fcfg-panel-hdr fcfg-panel-hdr-second">
        <h3>Closeout</h3>
        <span class="fcfg-panel-sub">what we owe the owner at close</span>
      </div>
      <CloseoutItems />
    </section>

    <!-- CENTER: Pricing / Alts / Decision & Risk -->
    <section class="fcfg-panel fcfg-panel-center">
      <PricingStrategy onRegenerate={regenerateAll} />
    </section>

    <!-- RIGHT: Financial Summary + Labor Plan -->
    <section class="fcfg-panel fcfg-panel-right">
      <div class="fcfg-panel-hdr">
        <h3>Job Financial Summary</h3>
        <span class="fcfg-panel-sub">chosen tier · deviation from Balanced</span>
      </div>
      <JobFinancialSummary />
      <div class="fcfg-panel-hdr fcfg-panel-hdr-second">
        <h3>Labor Plan</h3>
        <span class="fcfg-panel-sub">weekly hours · per-cable detail</span>
      </div>
      <LaborPlan />
    </section>
  </div>
</div>

<DocPreviewModal def={previewDef} onClose={closePreview} />

<style>
  .final-configurator-v2 {
    margin: 0 auto 16px auto;
    background: white;
    border: 1px solid #CFD7D0;
    border-radius: 4px;
    padding: 14px 18px 18px;
    box-shadow: 0 2px 6px rgba(16,24,40,0.04);
  }
  .fcfg-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid #CFD7D0;
    padding-bottom: 8px;
    margin-bottom: 12px;
  }
  .fcfg-head h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 800;
    color: #1B5E20;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .fcfg-note { font-size: 12px; color: #6A726E; font-style: italic; }
  .fcfg-head-left { display: flex; flex-direction: column; gap: 2px; }
  .fcfg-head-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .fcfg-export-summary {
    font-size: 11px;
    color: #6A726E;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 700;
  }
  .fcfg-export-btn {
    background: #1B5E20;
    color: white;
    border: 0;
    padding: 6px 14px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
  }
  .fcfg-export-btn:hover:not(:disabled) { background: #144017; }
  .fcfg-export-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .fcfg-theme-row {
    background: #F1F8F1;
    border: 1px solid #CFD7D0;
    border-radius: 4px;
    padding: 10px 12px;
    margin-bottom: 12px;
  }
  .fcfg-grid-v2 {
    display: grid;
    grid-template-columns: minmax(240px, 280px) minmax(500px, 1.8fr) minmax(280px, 360px);
    gap: 14px;
    align-items: start;
  }
  @media (max-width: 1400px) {
    .fcfg-grid-v2 {
      grid-template-columns: minmax(220px, 260px) 1fr minmax(260px, 320px);
      gap: 10px;
    }
  }
  @media (max-width: 1100px) {
    .fcfg-grid-v2 { grid-template-columns: 1fr; }
  }
  .fcfg-panel {
    background: #FAFAF8;
    border: 1px solid #CFD7D0;
    border-radius: 4px;
    padding: 10px 12px;
    min-height: 120px;
  }
  .fcfg-panel-center { background: white; padding: 12px; }
  .fcfg-panel-right  { background: #F1F8F1; }
  .fcfg-panel-hdr {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 1px dashed #CFD7D0;
  }
  .fcfg-panel-hdr-second {
    margin-top: 14px;
    padding-top: 10px;
    border-top: 1px solid #CFD7D0;
    border-bottom: 1px dashed #CFD7D0;
  }
  .fcfg-panel-hdr h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #1B5E20;
  }
  .fcfg-panel-sub {
    font-size: 11px;
    color: #6A726E;
    font-style: italic;
  }
</style>
