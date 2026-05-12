<!--
  RiskDashboard — Stage 4 right pane.
  Auto-seeds from crosswalk via seedRedFlags(). Merges with user-added
  flags. Each flag can be marked "mitigated" (resolved) inline.
-->
<script lang="ts">
  import { store } from '@/store/intakeStore.svelte';
  import { seedRedFlags, mergeRedFlags } from '@risk/seedRedFlags';
  import { PHASE_REQUIRED_CATS } from '@models/crosswalk';
  import type { RiskSeverity, RiskCategory, RedFlag } from '@models/risk';

  // Re-seed whenever the crosswalk changes. `$derived` recomputes lazily.
  let seeded = $derived(
    seedRedFlags({
      crosswalk: store.intake.crosswalk,
      currentPhase: store.intake.currentPhase,
      tokenCategories: {},             // TODO: wire TOKEN_DEFS lookup in Phase 2
      requiredByPhase: PHASE_REQUIRED_CATS
    })
  );

  // Keep user-added flags + fresh auto-seeded set synchronized.
  $effect(() => {
    store.intake.redFlags = mergeRedFlags(store.intake.redFlags, seeded);
  });

  let flags = $derived(store.intake.redFlags);

  let groups = $derived({
    high: flags.filter(f => f.severity === 'high'),
    med:  flags.filter(f => f.severity === 'med'),
    info: flags.filter(f => f.severity === 'info')
  });

  // Local state for the "add flag" row
  let newSev:  RiskSeverity = $state('med');
  let newCat:  RiskCategory = $state('Scope');
  let newText: string       = $state('');

  function addFlag() {
    if (!newText.trim()) return;
    const flag: RedFlag = {
      id:       `u-rf-${Date.now()}`,
      severity: newSev,
      category: newCat,
      text:     newText.trim(),
      source:   'user',
      resolved: false
    };
    store.intake.redFlags = [...store.intake.redFlags, flag];
    newText = '';
  }

  function toggleResolve(id: string) {
    const flag = store.intake.redFlags.find(f => f.id === id);
    if (flag) flag.resolved = !flag.resolved;
  }

  const SEV_ORDER: readonly RiskSeverity[] = ['high', 'med', 'info'];
  const SEV_LABEL: Record<RiskSeverity, string> = { high: 'HIGH', med: 'MEDIUM', info: 'INFO' };
</script>

<div class="rf-summary">
  <div class="rf-summary-cell rf-summary-high">
    <div class="v">{groups.high.length}</div><div class="l">High</div>
  </div>
  <div class="rf-summary-cell rf-summary-med">
    <div class="v">{groups.med.length}</div><div class="l">Medium</div>
  </div>
  <div class="rf-summary-cell rf-summary-info">
    <div class="v">{groups.info.length}</div><div class="l">Info</div>
  </div>
</div>

<div class="rf-add-row">
  <select bind:value={newSev}>
    <option value="high">High</option>
    <option value="med">Medium</option>
    <option value="info">Info</option>
  </select>
  <select bind:value={newCat}>
    <option value="Scope">Scope</option>
    <option value="Schedule">Schedule</option>
    <option value="Commercial">Commercial</option>
    <option value="Contractor">Contractor</option>
    <option value="Other">Other</option>
  </select>
  <input type="text" placeholder="Describe the risk or flag..." bind:value={newText}
         onkeydown={(e) => { if (e.key === 'Enter') addFlag(); }} />
  <button type="button" class="rf-add-btn" onclick={addFlag}>+ Add Flag</button>
</div>

{#if flags.length === 0}
  <div class="rf-empty">No flags detected. Add manual flags above if you see something the system missed.</div>
{:else}
  {#each SEV_ORDER as sev (sev)}
    {@const list = groups[sev]}
    {#if list.length > 0}
      <div class="rf-sev-group">
        <div class="rf-sev-hdr rf-sev-hdr-{sev}">
          <span class="rf-sev-badge rf-sev-badge-{sev}">{SEV_LABEL[sev]}</span>
          <span class="rf-sev-count">{list.length}</span>
        </div>
        {#each list as f (f.id)}
          <div class="rf-row rf-sev-{sev}" class:rf-resolved={f.resolved}>
            <span class="rf-cat">{f.category}</span>
            <div class="rf-body">
              <div class="rf-text">{f.text}</div>
              {#if f.mitigation}<div class="rf-mitigation">{f.mitigation}</div>{/if}
            </div>
            <div class="rf-actions">
              <label class="rf-resolve" title="Mark mitigated">
                <input type="checkbox" checked={f.resolved} onchange={() => toggleResolve(f.id)} />
              </label>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/each}
{/if}

<div class="rf-foot">
  Flags surface <strong>before</strong> the bid goes out.
  Mitigate or price for it — don't discover it during construction.
</div>

<style>
  .rf-summary {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 10px;
  }
  .rf-summary-cell {
    background: white; border: 1px solid #CFD7D0; border-radius: 4px;
    padding: 8px 6px; text-align: center;
  }
  .rf-summary-cell .v {
    font-size: 22px; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1;
  }
  .rf-summary-cell .l {
    font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em;
    color: #374850; margin-top: 2px;
  }
  .rf-summary-high { border-left: 3px solid #B71C1C; }
  .rf-summary-high .v { color: #B71C1C; }
  .rf-summary-med  { border-left: 3px solid #D4AF37; }
  .rf-summary-med  .v { color: #8A6A00; }
  .rf-summary-info { border-left: 3px solid #2E7D32; }
  .rf-summary-info .v { color: #2E7D32; }

  .rf-add-row {
    display: grid; grid-template-columns: 80px 110px 1fr auto;
    gap: 6px; margin-bottom: 10px;
  }
  .rf-add-row select, .rf-add-row input {
    padding: 4px 6px; border: 1px solid #CFD7D0; border-radius: 3px;
    font-size: 12px; font-family: inherit;
  }
  .rf-add-btn {
    background: #D4AF37; color: white; border: none;
    padding: 4px 10px; border-radius: 3px;
    font-size: 12px; font-weight: 700; cursor: pointer;
  }
  .rf-add-btn:hover { background: #B8951F; }

  .rf-sev-group { margin-bottom: 10px; }
  .rf-sev-hdr {
    display: flex; align-items: center; justify-content: space-between; gap: 6px;
    padding: 3px 4px; margin-bottom: 4px;
    border-bottom: 1px dashed #CFD7D0;
  }
  .rf-sev-badge {
    font-size: 9px; font-weight: 900; letter-spacing: 0.06em;
    padding: 2px 6px; border-radius: 2px;
  }
  .rf-sev-badge-high { background: #FCE8E4; color: #B71C1C; border: 1px solid #E29090; }
  .rf-sev-badge-med  { background: #FFF6D6; color: #8A6A00; border: 1px solid #F2D06B; }
  .rf-sev-badge-info { background: #E8F2E9; color: #1B5E20; border: 1px solid #BFD9C2; }
  .rf-sev-count { font-size: 11px; color: #374850; font-weight: 700; }

  .rf-row {
    display: grid; grid-template-columns: 70px 1fr 24px; gap: 6px; align-items: start;
    padding: 6px 6px; margin-bottom: 3px;
    background: white;
    border: 1px solid #CFD7D0;
    border-left: 3px solid #CFD7D0;
    border-radius: 3px;
  }
  .rf-row.rf-sev-high { border-left-color: #B71C1C; }
  .rf-row.rf-sev-med  { border-left-color: #D4AF37; }
  .rf-row.rf-sev-info { border-left-color: #2E7D32; }
  .rf-row.rf-resolved { opacity: 0.5; }
  .rf-row.rf-resolved .rf-text { text-decoration: line-through; }
  .rf-cat {
    font-size: 9px; font-weight: 800; letter-spacing: 0.04em;
    text-transform: uppercase; color: #374850; padding-top: 2px;
  }
  .rf-body { min-width: 0; }
  .rf-text { font-size: 12px; color: #14181C; line-height: 1.3; }
  .rf-mitigation { font-size: 11px; color: #6A726E; margin-top: 2px; font-style: italic; }
  .rf-actions { display: flex; align-items: center; justify-content: center; }
  .rf-actions input[type="checkbox"] { accent-color: #2E7D32; width: 13px; height: 13px; }

  .rf-empty {
    font-size: 12px; color: #6A726E; font-style: italic;
    padding: 8px; text-align: center;
  }
  .rf-foot {
    margin-top: 8px; padding-top: 6px; border-top: 1px dashed #CFD7D0;
    font-size: 11px; color: #374850; line-height: 1.4; font-style: italic;
  }
</style>
