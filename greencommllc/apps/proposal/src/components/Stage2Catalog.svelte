<!--
  Stage 2 Catalog & Line Items — editable editor.
  First meaningful Phase-2 port of Stage 2. The catalog PICKER (drag-in
  from the master catalog tree) still runs in the legacy bundle, but
  this tab now supports inline edit of qty + saleEach, plus an "add
  line" action and per-row delete. Totals and margin colour live-update.
-->
<script lang="ts">
  import { store, baseCostFromLines, baseSaleFromLines } from '@/store/intakeStore.svelte';
  import type { LineItem, LineSource } from '@models/lineItem';

  let lines = $derived(store.session.lines);
  let baseCost = $derived(baseCostFromLines());
  let baseSale = $derived(baseSaleFromLines());
  let laborHours = $derived(lines.reduce((s, l) => s + l.qty * l.laborHours, 0));
  let marginPct = $derived(baseSale > 0 ? ((baseSale - baseCost) / baseSale) * 100 : 0);

  // Group labels — mirror legacy SRC_LABEL.
  const SRC_LABEL: Record<LineSource, string> = {
    eq: 'Equipment',
    ma: 'Materials',
    sv: 'Services'
  };

  // Group lines by source while preserving original indices (for edits/deletes).
  let grouped = $derived.by(() => {
    const out: Record<LineSource, { line: LineItem; idx: number }[]> = { eq: [], ma: [], sv: [] };
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l) continue;
      out[l.src].push({ line: l, idx: i });
    }
    return out;
  });

  // Inline editors mutate the reactive array in place so $derived totals track.
  function setQty(idx: number, raw: string) {
    const n = Math.max(0, parseFloat(raw) || 0);
    const target = store.session.lines[idx];
    if (target) target.qty = n;
  }
  function setSale(idx: number, raw: string) {
    const n = Math.max(0, parseFloat(raw) || 0);
    const target = store.session.lines[idx];
    if (target) target.saleEach = n;
  }
  function setCost(idx: number, raw: string) {
    const n = Math.max(0, parseFloat(raw) || 0);
    const target = store.session.lines[idx];
    if (target) target.costEach = n;
  }
  function setHours(idx: number, raw: string) {
    const n = Math.max(0, parseFloat(raw) || 0);
    const target = store.session.lines[idx];
    if (target) target.laborHours = n;
  }
  function removeAt(idx: number) {
    store.session.lines = store.session.lines.filter((_, i) => i !== idx);
  }
  function addLine(src: LineSource) {
    const blank: LineItem = {
      src,
      name: 'New item',
      category: src === 'sv' ? 'Services' : src === 'ma' ? 'Materials' : 'Equipment',
      unit: 'EA',
      qty: 1,
      costEach: 0,
      saleEach: 0,
      laborHours: 0
    };
    store.session.lines = [...store.session.lines, blank];
  }

  function fmt$(n: number): string {
    return '$' + Math.round(n).toLocaleString('en-US');
  }
  function extSale(l: LineItem): number { return l.qty * l.saleEach; }
  function extCost(l: LineItem): number { return l.qty * l.costEach; }
  function lineMarginPct(l: LineItem): number {
    return l.saleEach > 0 ? ((l.saleEach - l.costEach) / l.saleEach) * 100 : 0;
  }
</script>

<section class="s2">
  <header class="s2-head">
    <div>
      <h2>Stage 2 — Catalog &amp; Line Items</h2>
      <p class="s2-sub">
        Edit qty / price / cost / hours inline. Totals, margin, and labor all update live.
        The catalog picker (drag-in from master tree) still runs in the legacy app.
      </p>
    </div>
  </header>

  <div class="s2-stats">
    <div><span class="k">Lines</span><span class="v">{lines.length}</span></div>
    <div><span class="k">Base cost</span><span class="v">{fmt$(baseCost)}</span></div>
    <div><span class="k">Base sell</span><span class="v">{fmt$(baseSale)}</span></div>
    <div><span class="k">Gross margin</span><span class="v" class:v-low={marginPct < 25}>{marginPct.toFixed(1)}%</span></div>
    <div><span class="k">Labor hrs</span><span class="v">{Math.round(laborHours).toLocaleString('en-US')}</span></div>
  </div>

  {#if lines.length === 0}
    <div class="s2-empty">
      No line items yet. Use <em>Add line</em> below, or import from the legacy bundle-builder.
      <div class="s2-empty-actions">
        <button type="button" class="s2-btn" onclick={() => addLine('eq')}>+ Equipment line</button>
        <button type="button" class="s2-btn" onclick={() => addLine('ma')}>+ Materials line</button>
        <button type="button" class="s2-btn" onclick={() => addLine('sv')}>+ Services line</button>
      </div>
    </div>
  {:else}
    {#each (['eq', 'ma', 'sv'] as LineSource[]) as src (src)}
      {#if grouped[src].length > 0}
        <div class="s2-group">
          <div class="s2-group-head">
            <h3>{SRC_LABEL[src]} <span class="s2-count">({grouped[src].length})</span></h3>
            <button type="button" class="s2-btn s2-btn-ghost" onclick={() => addLine(src)}>+ Add line</button>
          </div>
          <table class="s2-tbl">
            <thead>
              <tr>
                <th scope="col" style="width: 14%">Category</th>
                <th scope="col">Name</th>
                <th scope="col" class="n">Qty</th>
                <th scope="col" class="n">Cost ea</th>
                <th scope="col" class="n">Sale ea</th>
                <th scope="col" class="n">Hrs ea</th>
                <th scope="col" class="n">Ext cost</th>
                <th scope="col" class="n">Ext sale</th>
                <th scope="col" class="n">Margin</th>
                <th scope="col" aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {#each grouped[src] as row (row.idx)}
                <tr>
                  <td>{row.line.category}</td>
                  <td>{row.line.name}</td>
                  <td class="n">
                    <input
                      type="number" step="0.25" min="0"
                      value={row.line.qty}
                      oninput={(e) => setQty(row.idx, (e.currentTarget as HTMLInputElement).value)}
                    />
                  </td>
                  <td class="n">
                    <input
                      type="number" step="0.01" min="0"
                      value={row.line.costEach}
                      oninput={(e) => setCost(row.idx, (e.currentTarget as HTMLInputElement).value)}
                    />
                  </td>
                  <td class="n">
                    <input
                      type="number" step="0.01" min="0"
                      value={row.line.saleEach}
                      oninput={(e) => setSale(row.idx, (e.currentTarget as HTMLInputElement).value)}
                    />
                  </td>
                  <td class="n">
                    <input
                      type="number" step="0.25" min="0"
                      value={row.line.laborHours}
                      oninput={(e) => setHours(row.idx, (e.currentTarget as HTMLInputElement).value)}
                    />
                  </td>
                  <td class="n mono">{fmt$(extCost(row.line))}</td>
                  <td class="n mono">{fmt$(extSale(row.line))}</td>
                  <td class="n mono" class:m-low={lineMarginPct(row.line) < 25}>
                    {lineMarginPct(row.line).toFixed(1)}%
                  </td>
                  <td>
                    <button
                      type="button"
                      class="s2-row-del"
                      aria-label={'Delete ' + row.line.name}
                      onclick={() => removeAt(row.idx)}
                    >×</button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    {/each}
  {/if}

  <footer class="s2-foot">
    Catalog picker (drag-in from master tree) still pending — see <code>MIGRATION.md</code> Phase 2 · item 3.
  </footer>
</section>

<style>
  .s2 { padding: 14px 0 24px; }
  .s2-head h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 800;
    color: #1B5E20;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .s2-sub { margin: 4px 0 0; font-size: 13px; color: #374850; max-width: 720px; }

  .s2-stats {
    display: flex;
    gap: 14px;
    margin: 14px 0;
    flex-wrap: wrap;
  }
  .s2-stats > div {
    background: #FAFAF8;
    border: 1px solid #CFD7D0;
    border-radius: 3px;
    padding: 8px 14px;
    display: flex;
    flex-direction: column;
    min-width: 120px;
  }
  .k { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #6A726E; font-weight: 700; }
  .v { font-size: 18px; font-weight: 800; color: #1B5E20; font-variant-numeric: tabular-nums; }
  .v-low { color: #B71C1C; }

  .s2-group {
    margin: 18px 0;
    border: 1px solid #CFD7D0;
    border-radius: 3px;
    background: white;
  }
  .s2-group-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px;
    background: #F1F8F1;
    border-bottom: 1px solid #CFD7D0;
  }
  .s2-group-head h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 800;
    color: #1B5E20;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .s2-count { color: #6A726E; font-weight: 500; margin-left: 4px; }

  .s2-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
  .s2-tbl th, .s2-tbl td { padding: 6px 8px; border-bottom: 1px solid #ECECEC; text-align: left; }
  .s2-tbl th {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #6A726E;
    background: #FAFAF8;
    font-weight: 700;
  }
  .s2-tbl td.n, .s2-tbl th.n { text-align: right; font-variant-numeric: tabular-nums; }
  .s2-tbl input[type=number] {
    width: 100%; max-width: 80px; text-align: right;
    font-size: 12px; padding: 3px 6px;
    border: 1px solid #CFD7D0; border-radius: 3px;
    font-variant-numeric: tabular-nums;
    font-family: inherit;
    background: white;
  }
  .s2-tbl input[type=number]:focus {
    outline: none; border-color: #2E7D32; box-shadow: 0 0 0 1px #2E7D32;
  }
  .s2-tbl td.mono { font-variant-numeric: tabular-nums; }
  .s2-tbl .m-low { color: #B71C1C; font-weight: 700; }

  .s2-row-del {
    background: transparent;
    border: 1px solid transparent;
    color: #B71C1C;
    font-size: 16px;
    line-height: 1;
    width: 24px; height: 24px;
    border-radius: 3px;
    cursor: pointer;
    font-family: inherit;
  }
  .s2-row-del:hover { background: #FAE5E5; border-color: #B71C1C; }

  .s2-btn {
    font-size: 12px;
    padding: 4px 10px;
    background: #2E7D32; color: white;
    border: none; border-radius: 3px;
    cursor: pointer; font-weight: 600;
    font-family: inherit;
  }
  .s2-btn:hover { background: #1B5E20; }
  .s2-btn-ghost {
    background: transparent; color: #1B5E20;
    border: 1px solid #2E7D32;
  }
  .s2-btn-ghost:hover { background: #F1F8F1; }

  .s2-empty {
    margin-top: 14px;
    padding: 20px;
    text-align: center;
    color: #6A726E;
    background: #FAFAF8;
    border: 1px dashed #CFD7D0;
    border-radius: 3px;
  }
  .s2-empty em { color: #1B5E20; font-style: normal; font-weight: 700; }
  .s2-empty-actions {
    display: flex; justify-content: center; gap: 8px;
    margin-top: 12px; flex-wrap: wrap;
  }

  .s2-foot { margin-top: 18px; font-size: 11px; color: #374850; font-style: italic; }
  code { background: #FAF5E6; padding: 1px 5px; border-radius: 2px; font-size: 11px; }
</style>
