<!--
  Stage 3 Review — editable open items + supplements + closeout edit.
  Phase-2 port upgrade from read-only placeholder to interactive.

  Still deferred to legacy app: per-file docs-review cards (sidebar
  with extracted highlights) — they need pdf.js text per file first.
-->
<script lang="ts">
  import { store } from '@/store/intakeStore.svelte';
  import type { OpenItem, OpenItemKind } from '@models/intake';

  let files = $derived(store.intake.files);
  let openItems = $derived(store.intake.openItems);
  let supplements = $derived(store.intake.supplements);
  let closeout = $derived(store.intake.closeoutItems);

  let byClass = $derived(
    files.reduce<Record<string, number>>((acc, f) => {
      acc[f.class] = (acc[f.class] ?? 0) + 1;
      return acc;
    }, {})
  );
  let supplementsActive = $derived(Object.values(supplements).filter(Boolean).length);
  let openItemsActive = $derived(openItems.filter(o => !o.resolved).length);
  let closeoutActive = $derived(Object.values(closeout).filter(Boolean).length);

  // ---- Open items editor ---------------------------------------------------
  let newKind = $state<OpenItemKind>('TBD');
  let newText = $state('');
  let newOwner = $state('');

  function mkId(): string { return 'oi_' + Math.random().toString(36).slice(2, 9); }

  function addOpenItem() {
    const text = newText.trim();
    if (!text) return;
    const oi: OpenItem = {
      id: mkId(),
      kind: newKind,
      text,
      owner: newOwner.trim() || 'Unassigned',
      source: 'user',
      resolved: false
    };
    store.intake.openItems = [...store.intake.openItems, oi];
    newText = '';
    newOwner = '';
  }

  function toggleResolved(id: string) {
    const tgt = store.intake.openItems.find(o => o.id === id);
    if (tgt) tgt.resolved = !tgt.resolved;
  }

  function removeOpenItem(id: string) {
    store.intake.openItems = store.intake.openItems.filter(o => o.id !== id);
  }

  // ---- Supplements & closeout toggles -------------------------------------
  // Default list of supplement labels. User can turn each on/off; toggles
  // persist via the store's $effect. Expanding this list is append-safe.
  const SUPPLEMENT_PRESETS: { key: string; label: string; hint: string }[] = [
    { key: 'after_hours',        label: 'After-hours work',         hint: 'Nights / weekends / occupied space' },
    { key: 'prevailing_wage',    label: 'Prevailing wage',          hint: 'State / federal PW applies' },
    { key: 'bonding',            label: 'Payment + performance bond', hint: 'Required by GC / owner' },
    { key: 'certification_scan', label: 'Fluke / DTX certification', hint: 'Per-port cert + PDF close-out' },
    { key: 'asbuilts',           label: 'As-built drawings',        hint: 'Redline on plan set at closeout' },
    { key: 'warranty_extended',  label: 'Extended warranty',        hint: 'Warranty longer than 1 year' }
  ];

  const CLOSEOUT_PRESETS: { key: string; label: string }[] = [
    { key: 'test_results',       label: 'Cable test results (Fluke/DTX)' },
    { key: 'asbuilt_dwgs',       label: 'As-built drawings' },
    { key: 'onq_docs',           label: 'O&M documentation' },
    { key: 'training',           label: 'Training session + sign-off' },
    { key: 'warranty_letter',    label: 'Warranty letter' },
    { key: 'license_transfers',  label: 'Software license transfers' }
  ];

  function toggleSupplement(key: string) {
    store.intake.supplements[key] = !store.intake.supplements[key];
  }
  function toggleCloseout(key: string) {
    store.intake.closeoutItems[key] = !store.intake.closeoutItems[key];
  }

  // UI helpers --------------------------------------------------------------
  const KIND_OPTS: OpenItemKind[] = ['TBD', 'Question', 'Unknown'];
</script>

<section class="s3">
  <header class="s3-head">
    <h2>Stage 3 — Review</h2>
    <p class="s3-sub">
      Snapshot before Stage 4. Resolve open items, tick scope supplements,
      check off closeout deliverables. Everything here persists and feeds
      Stage 4's risk dashboard + TOC tree.
    </p>
  </header>

  <div class="s3-grid">
    <!-- Files-by-class -->
    <div class="s3-card">
      <h3>Files by class</h3>
      {#if files.length === 0}
        <p class="muted">No files yet. Head to Stage 1 to upload.</p>
      {:else}
        <ul class="s3-list">
          {#each Object.entries(byClass) as [cls, n] (cls)}
            <li><span class="chip chip-{cls}">{cls}</span><span class="n">{n}</span></li>
          {/each}
        </ul>
      {/if}
    </div>

    <!-- Open items editor -->
    <div class="s3-card s3-card-wide">
      <h3>Open items <span class="badge">{openItemsActive} / {openItems.length}</span></h3>
      {#if openItems.length === 0}
        <p class="muted">No open items yet. Add the first one below.</p>
      {:else}
        <ul class="s3-list oi-list">
          {#each openItems as it (it.id)}
            <li class:oi-done={it.resolved}>
              <input
                type="checkbox"
                checked={it.resolved}
                onchange={() => toggleResolved(it.id)}
                aria-label={'Toggle ' + it.text}
              />
              <span class="chip chip-{it.kind.toLowerCase()}">{it.kind}</span>
              <span class="oitxt">{it.text}</span>
              <span class="oi-owner">{it.owner}</span>
              <button type="button" class="oi-del" onclick={() => removeOpenItem(it.id)} aria-label={'Delete ' + it.text}>×</button>
            </li>
          {/each}
        </ul>
      {/if}
      <div class="oi-add">
        <select bind:value={newKind}>
          {#each KIND_OPTS as k (k)}
            <option value={k}>{k}</option>
          {/each}
        </select>
        <input
          type="text"
          placeholder="Open-item description (e.g. 'Confirm demarc location')"
          bind:value={newText}
          onkeydown={(e) => { if (e.key === 'Enter') addOpenItem(); }}
        />
        <input
          type="text"
          class="oi-owner-input"
          placeholder="Owner"
          bind:value={newOwner}
          onkeydown={(e) => { if (e.key === 'Enter') addOpenItem(); }}
        />
        <button type="button" class="s3-btn" onclick={addOpenItem} disabled={!newText.trim()}>Add</button>
      </div>
    </div>

    <!-- Supplements -->
    <div class="s3-card">
      <h3>Scope supplements <span class="badge">{supplementsActive}</span></h3>
      <ul class="s3-toggle-list">
        {#each SUPPLEMENT_PRESETS as s (s.key)}
          <li>
            <label>
              <input type="checkbox" checked={!!supplements[s.key]} onchange={() => toggleSupplement(s.key)} />
              <span class="tgl-label">{s.label}</span>
              <span class="tgl-hint">{s.hint}</span>
            </label>
          </li>
        {/each}
      </ul>
    </div>

    <!-- Closeout items -->
    <div class="s3-card">
      <h3>Closeout deliverables <span class="badge">{closeoutActive}</span></h3>
      <ul class="s3-toggle-list">
        {#each CLOSEOUT_PRESETS as c (c.key)}
          <li>
            <label>
              <input type="checkbox" checked={!!closeout[c.key]} onchange={() => toggleCloseout(c.key)} />
              <span class="tgl-label">{c.label}</span>
            </label>
          </li>
        {/each}
      </ul>
    </div>
  </div>

  <footer class="s3-foot">
    Per-file docs-review cards (pdf.js extracted highlights) still pending — see <code>MIGRATION.md</code> Phase 2 · item 5.
  </footer>
</section>

<style>
  .s3 { padding: 14px 0 24px; }
  .s3-head h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 800;
    color: #1B5E20;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .s3-sub { margin: 4px 0 14px; font-size: 13px; color: #374850; max-width: 720px; }

  .s3-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
  .s3-card {
    background: #FAFAF8;
    border: 1px solid #CFD7D0;
    border-radius: 3px;
    padding: 10px 14px;
  }
  .s3-card-wide { grid-column: span 2; }
  @media (max-width: 720px) { .s3-card-wide { grid-column: span 1; } }

  .s3-card h3 {
    margin: 0 0 8px 0;
    font-size: 12px;
    font-weight: 800;
    color: #1B5E20;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .badge {
    font-size: 10px;
    background: #D4AF37;
    color: #14181C;
    padding: 1px 7px;
    border-radius: 10px;
    font-weight: 700;
    text-transform: none;
    letter-spacing: 0;
  }

  .s3-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
  .s3-list li { display: flex; gap: 6px; align-items: center; font-size: 12px; }
  .s3-list li .n { margin-left: auto; font-weight: 700; color: #14181C; }
  .oitxt { font-size: 12px; color: #14181C; flex: 1 1 auto; min-width: 0; }
  .muted { font-size: 11px; color: #6A726E; font-style: italic; margin: 0; }

  .oi-list li { padding: 4px 0; border-bottom: 1px solid #ECECEC; }
  .oi-list li.oi-done .oitxt { text-decoration: line-through; color: #6A726E; }
  .oi-owner { font-size: 10px; color: #374850; background: #F1F8F1; padding: 1px 6px; border-radius: 10px; font-weight: 600; }
  .oi-del {
    background: transparent; border: 1px solid transparent;
    color: #B71C1C; font-size: 14px; line-height: 1;
    width: 20px; height: 20px; border-radius: 3px;
    cursor: pointer; font-family: inherit;
  }
  .oi-del:hover { background: #FAE5E5; border-color: #B71C1C; }

  .oi-add {
    display: flex; gap: 6px; align-items: center;
    margin-top: 10px; padding-top: 8px; border-top: 1px dashed #CFD7D0;
    flex-wrap: wrap;
  }
  .oi-add select, .oi-add input {
    font-size: 12px; padding: 4px 7px;
    border: 1px solid #CFD7D0; border-radius: 3px;
    font-family: inherit; background: white;
  }
  .oi-add select { min-width: 86px; }
  .oi-add input[type=text] { flex: 1 1 180px; min-width: 120px; }
  .oi-add .oi-owner-input { flex: 0 0 90px; max-width: 110px; }
  .oi-add select:focus, .oi-add input:focus {
    outline: none; border-color: #2E7D32; box-shadow: 0 0 0 1px #2E7D32;
  }

  .s3-toggle-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
  .s3-toggle-list li { padding: 4px 0; border-bottom: 1px solid #ECECEC; }
  .s3-toggle-list label {
    display: grid;
    grid-template-columns: auto 1fr;
    column-gap: 8px;
    align-items: center;
    cursor: pointer;
  }
  .tgl-label { font-size: 12px; font-weight: 600; color: #14181C; grid-column: 2; }
  .tgl-hint { font-size: 10px; color: #6A726E; font-style: italic; grid-column: 2; margin-top: 1px; }

  .chip {
    display: inline-block;
    font-size: 10px;
    padding: 1px 8px;
    border-radius: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .chip-plan    { background: #E8F5E9; color: #1B5E20; }
  .chip-rfp     { background: #FAE5E5; color: #B71C1C; }
  .chip-spec    { background: #FAF5E6; color: #7A5A00; }
  .chip-notes   { background: #EDE7F6; color: #4527A0; }
  .chip-other   { background: #ECEFF1; color: #37474F; }
  .chip-tbd     { background: #FAE5E5; color: #B71C1C; }
  .chip-question{ background: #FAF5E6; color: #7A5A00; }
  .chip-unknown { background: #ECEFF1; color: #37474F; }

  .s3-btn {
    font-size: 12px; padding: 4px 12px;
    background: #2E7D32; color: white;
    border: none; border-radius: 3px;
    cursor: pointer; font-weight: 600; font-family: inherit;
  }
  .s3-btn:hover:not(:disabled) { background: #1B5E20; }
  .s3-btn:disabled { background: #CFD7D0; color: #6A726E; cursor: not-allowed; }

  .s3-foot { margin-top: 18px; font-size: 11px; color: #374850; font-style: italic; }
  code { background: #FAF5E6; padding: 1px 5px; border-radius: 2px; font-size: 11px; }
</style>
