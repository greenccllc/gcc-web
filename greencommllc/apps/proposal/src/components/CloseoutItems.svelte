<!--
  CloseoutItems — Stage 4 left pane.
  Renders the 8 GCC closeout deliverables as a checklist.
  State lives in store.intake.closeoutItems[key] = boolean.
-->
<script lang="ts">
  import { CLOSEOUT_DEFS } from '@risk/closeoutCatalog';
  import { store } from '@/store/intakeStore.svelte';

  function isChecked(key: string): boolean {
    const v = store.intake.closeoutItems[key];
    return v == null ? true : v;   // default ON
  }

  function toggle(key: string): void {
    store.intake.closeoutItems[key] = !isChecked(key);
  }
</script>

<div class="co-list">
  {#each CLOSEOUT_DEFS as def (def.key)}
    {@const checked = isChecked(def.key)}
    <label class="co-row" class:co-checked={checked}>
      <input type="checkbox" checked={checked} onchange={() => toggle(def.key)} />
      <div class="co-body">
        <div class="co-top">
          <span class="co-label">{def.label}</span>
          <span class="co-owner">{def.owner}</span>
        </div>
        <div class="co-desc">{def.desc}</div>
        <div class="co-when"><span class="co-when-k">Due:</span> {def.whenDue}</div>
      </div>
    </label>
  {/each}
</div>

<style>
  .co-list { display: flex; flex-direction: column; gap: 6px; }
  .co-row {
    display: grid; grid-template-columns: auto 1fr; gap: 8px; align-items: start;
    padding: 6px 8px;
    background: white;
    border: 1px solid #CFD7D0;
    border-left: 3px solid #CFD7D0;
    border-radius: 4px;
    cursor: pointer;
    transition: border-color 140ms ease, background 140ms ease;
  }
  .co-row:hover { background: #F1F8F1; }
  .co-row.co-checked { border-left-color: #2E7D32; background: #F1F8F1; }
  .co-row input[type="checkbox"] { margin-top: 3px; accent-color: #2E7D32; width: 14px; height: 14px; }
  .co-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .co-label { font-weight: 700; font-size: 14px; color: #1B5E20; }
  .co-owner {
    font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
    padding: 2px 6px; border-radius: 2px;
    background: #FAF5E6; color: #8A6A00; border: 1px solid #D4AF37;
  }
  .co-desc { font-size: 12px; color: #6A726E; margin-top: 2px; line-height: 1.4; }
  .co-when { font-size: 11px; color: #374850; margin-top: 3px; }
  .co-when-k { font-weight: 700; color: #14181C; }
</style>
