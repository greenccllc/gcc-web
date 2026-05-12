<!--
  AltsDeducts — Stage 4 checklist under the tier cards.
  Groups: Required / GCC Standard Alts / Suggested Deducts / Optional Includes.
  Required + GCC Standard Alts are hard-locked (always ON). User can toggle
  the other two groups; toggles mark the packet stale.
-->
<script lang="ts">
  import { store } from '@/store/intakeStore.svelte';
  import {
    ALTDEDUCT_DEFS,
    defaultAltDeducts,
    enforceAltDeductLocks,
    type AltDeductGroup
  } from '@models/altDeducts';

  if (!store.intake.altDeducts || Object.keys(store.intake.altDeducts).length === 0) {
    store.intake.altDeducts = defaultAltDeducts();
  }
  enforceAltDeductLocks(store.intake.altDeducts);

  const GROUP_META: Record<AltDeductGroup, { title: string; sub: string; cls: string }> = {
    'Required':          { title: 'Required (per RFP)',      sub: 'Client-requested — locked in',   cls: 'ad-group-required' },
    'GCC Standard Alts': { title: 'GCC Standard Alts',       sub: 'Always included',                 cls: 'ad-group-gcc-standard-alts' },
    'Suggested Deducts': { title: 'Suggested Deducts',       sub: 'Pull down price; off by default', cls: 'ad-group-suggested-deducts' },
    'Optional Includes': { title: 'Optional Includes',       sub: 'Upsell adds; off by default',     cls: 'ad-group-optional-includes' }
  };

  const GROUP_ORDER: readonly AltDeductGroup[] = [
    'Required', 'GCC Standard Alts', 'Suggested Deducts', 'Optional Includes'
  ];

  // Build { group: def[] }
  let grouped = $derived(() => {
    const g: Record<string, typeof ALTDEDUCT_DEFS[number][]> = {};
    for (const d of ALTDEDUCT_DEFS) {
      (g[d.group] ||= []).push(d);
    }
    return g;
  });

  function toggle(key: string, checked: boolean, lock: 'hard' | 'soft') {
    if (lock === 'hard') return;          // hard locks ignore toggles
    store.intake.altDeducts[key] = checked;
    store.markStale('alt/deduct toggled');
  }
</script>

<div class="ad-wrap">
  <div class="pt-section-hdr">
    Alts &amp; Deducts <span class="pt-sub">included with the chosen tier</span>
  </div>
  <div class="ad-grid">
    {#each GROUP_ORDER as g (g)}
      {@const defs = grouped()[g] ?? []}
      {#if defs.length > 0}
        <div class="ad-group {GROUP_META[g].cls}">
          <div class="ad-group-hdr">
            <span class="ad-group-title">{GROUP_META[g].title}</span>
            <span class="ad-group-sub">{GROUP_META[g].sub}</span>
          </div>
          {#each defs as d (d.key)}
            {@const on = !!store.intake.altDeducts[d.key]}
            {@const hard = d.lock === 'hard'}
            <label class="ad-row" class:ad-on={on} class:ad-hard={hard}>
              <input
                type="checkbox"
                checked={on}
                disabled={hard}
                onchange={(e) => toggle(d.key, (e.target as HTMLInputElement).checked, d.lock)}
              />
              <div class="ad-body">
                <div class="ad-label">{hard ? '🔒 ' : ''}{d.label}</div>
                <div class="ad-desc">{d.desc}</div>
              </div>
            </label>
          {/each}
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .ad-wrap {
    background: white;
    border: 1px solid #CFD7D0;
    border-radius: 4px;
    padding: 10px;
    margin-top: 10px;
    margin-bottom: 10px;
  }
  .pt-section-hdr {
    font-size: 12px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.04em; color: #1B5E20; margin: 0 0 8px;
  }
  .pt-sub { font-size: 10px; font-weight: 500; color: #6A726E; letter-spacing: 0; text-transform: none; margin-left: 8px; font-style: italic; }
  .ad-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  @media (max-width: 900px) { .ad-grid { grid-template-columns: 1fr; } }
  .ad-group-required { grid-column: 1 / -1; border-left: 3px solid #B71C1C; padding: 6px 0 6px 8px; background: #FCE8E4; border-radius: 3px; }
  .ad-group-gcc-standard-alts { border-left: 3px solid #D4AF37; padding: 6px 0 6px 8px; background: #FAF5E6; border-radius: 3px; }
  .ad-group-suggested-deducts { border-left: 3px solid #2E7D32; padding: 6px 0 6px 8px; }
  .ad-group-optional-includes { border-left: 3px solid #CFD7D0; padding: 6px 0 6px 8px; }
  .ad-group-hdr {
    display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px;
  }
  .ad-group-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #1B5E20; }
  .ad-group-sub   { font-size: 10px; color: #6A726E; font-style: italic; }
  .ad-row {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 6px;
    align-items: start;
    padding: 4px 4px;
    border-radius: 3px;
    cursor: pointer;
    transition: background 120ms ease;
  }
  .ad-row:hover:not(.ad-hard) { background: rgba(46,125,50,0.05); }
  .ad-row.ad-hard { cursor: not-allowed; }
  .ad-row input[type="checkbox"] { margin-top: 2px; accent-color: #2E7D32; width: 13px; height: 13px; }
  .ad-row.ad-hard input[type="checkbox"] { accent-color: #D4AF37; }
  .ad-label { font-size: 12px; font-weight: 700; color: #14181C; line-height: 1.3; }
  .ad-desc { font-size: 11px; color: #6A726E; margin-top: 1px; line-height: 1.35; }
  .ad-row.ad-on .ad-label { color: #1B5E20; }
</style>
