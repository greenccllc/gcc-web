<!--
  ProposalTocTree - Stage 4 left pane.
  One row per in-scope deliverable (filtered by packet length). Status
  badge indicates whether the last-regenerated artifact is fresh, stale
  (intake has changed since last regen), or pending (never generated).
  Click a row to emit `onSelect(def)` which the parent wires to the
  preview modal.
-->
<script lang="ts">
  import { store } from '@/store/intakeStore.svelte';
  import { tocInScope, type TocDef, type TocStatus } from '@models/toc';
  import { LENGTH_DEFS, defaultCustomization } from '@models/customization';

  interface Props {
    onSelect?: (def: TocDef) => void;
  }
  let { onSelect }: Props = $props();

  // Ensure customization exists so `.length` is always defined.
  if (!store.intake.customization) store.intake.customization = defaultCustomization();

  let cust    = $derived(store.intake.customization!);
  let inScope = $derived(tocInScope(cust.length));

  function statusOf(key: string): TocStatus {
    const ts = store.intake.generatedAt[key];
    if (!ts) return 'pending';
    return cust.staleReason ? 'stale' : 'generated';
  }

  function handleClick(def: TocDef) {
    if (onSelect) onSelect(def);
  }

  function handleKey(e: KeyboardEvent, def: TocDef) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(def);
    }
  }

  let lengthLabel = $derived(
    LENGTH_DEFS.find(L => L.key === cust.length)?.label ?? cust.length
  );
</script>

<div class="toc-scope-note">
  Packet length: <strong>{lengthLabel}</strong> &middot; {inScope.length} deliverable{inScope.length === 1 ? '' : 's'} in scope
</div>
<div class="toc-tree">
  {#each inScope as def (def.key)}
    {@const status = statusOf(def.key)}
    <div
      class="toc-node toc-{status}"
      role="button"
      tabindex="0"
      onclick={() => handleClick(def)}
      onkeydown={(e) => handleKey(e, def)}
      title={def.handler ? `Preview ${def.label}` : `No generator for ${def.label}`}
    >
      <span class="toc-num">{def.number}</span>
      <span class="toc-label">{def.label}</span>
      {#if status === 'generated'}
        <span class="toc-badge toc-badge-gen">✓ READY</span>
      {:else if status === 'stale'}
        <span class="toc-badge toc-badge-stale">⚠ STALE</span>
      {:else}
        <span class="toc-badge toc-badge-pend">PENDING</span>
      {/if}
    </div>
  {/each}
</div>

<style>
  .toc-scope-note {
    font-size: 10px; color: #6A726E; font-style: italic;
    padding: 4px 6px; margin-bottom: 4px;
  }
  .toc-tree { display: flex; flex-direction: column; gap: 3px; font-size: 12px; }
  .toc-node {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 6px;
    align-items: center;
    padding: 5px 6px;
    background: white;
    border: 1px solid #CFD7D0;
    border-left: 3px solid #CFD7D0;
    border-radius: 3px;
    cursor: pointer;
    transition: border-color 140ms ease, background 140ms ease;
  }
  .toc-node:hover { border-color: #2E7D32; background: #F1F8F1; }
  .toc-node:focus-visible { outline: 2px solid #D4AF37; outline-offset: 1px; }
  .toc-node.toc-generated { border-left-color: #2E7D32; }
  .toc-node.toc-stale     { border-left-color: #D4AF37; }
  .toc-node.toc-pending   { border-left-color: #CFD7D0; }
  .toc-num { font-size: 9px; font-weight: 800; color: #374850; letter-spacing: 0.05em; }
  .toc-label { font-weight: 700; color: #14181C; }
  .toc-badge {
    font-size: 8.5px;
    font-weight: 900;
    letter-spacing: 0.04em;
    padding: 2px 5px;
    border-radius: 2px;
    white-space: nowrap;
  }
  .toc-badge-gen   { background: #E8F2E9; color: #1B5E20; border: 1px solid #BFD9C2; }
  .toc-badge-stale { background: #FFF6D6; color: #8A6A00; border: 1px solid #F2D06B; }
  .toc-badge-pend  { background: #F3F5F4; color: #374850; border: 1px solid #CFD7D0; }
</style>
