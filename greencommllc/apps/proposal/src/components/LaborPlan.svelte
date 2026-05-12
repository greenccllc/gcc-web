<!--
  LaborPlan - Stage 4 right pane bottom.
  Weekly bars (crew @ 80 hrs/wk) + expandable per-cable table.
-->
<script lang="ts">
  import { store } from '@/store/intakeStore.svelte';
  import { buildLaborPlan, perCableDetail } from '@pricing/laborPlan';

  let plan = $derived(buildLaborPlan(store.session.lines));
  let rows = $derived(perCableDetail(store.session.lines));
  let expanded = $state(false);
  let rate = $derived(store.intake.customization?.laborRateOverride ?? 125);

  function fmtNum(n: number): string { return Math.round(n).toLocaleString('en-US'); }
</script>

<div class="lp-wrap">
  {#if plan.totalHours <= 0}
    <div class="lp-empty">No labor plan yet. Add line items in Stage 2 to see weekly hours.</div>
  {:else}
    <div class="lp-summary">
      Total: <strong>{fmtNum(plan.totalHours)} hrs</strong>
      · {plan.weeks.length} week{plan.weeks.length === 1 ? '' : 's'}
      at {plan.crewHoursPerWeek} hrs/wk crew
      · ${rate}/hr
      {#if plan.truncated}<span class="lp-warn">⚠ truncated at {plan.maxWeeks} wks</span>{/if}
    </div>

    <div class="lp-weekly">
      {#each plan.weeks as w (w.week)}
        <div class="lp-week-row">
          <span class="lp-week-k">Week {w.week}</span>
          <span class="lp-week-bar-wrap">
            <span class="lp-week-bar-fill" style="width:{(w.hours / plan.crewHoursPerWeek * 100).toFixed(1)}%;"></span>
          </span>
          <span class="lp-week-hrs">{w.hours.toFixed(1)}</span>
        </div>
      {/each}
    </div>

    <button type="button" class="lp-detail-toggle" onclick={() => expanded = !expanded}>
      {expanded ? '▾ Hide per-cable detail' : `▸ Show per-cable detail (${rows.length} items)`}
    </button>

    {#if expanded}
      <table class="lp-cable-table">
        <thead>
          <tr>
            <th>Item</th>
            <th class="num">Qty</th>
            <th class="num">Hrs/ea</th>
            <th class="num">Total hrs</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as r (r.name + r.category)}
            <tr>
              <td>{r.name}</td>
              <td class="num">{fmtNum(r.qty)}</td>
              <td class="num">{r.hoursEach.toFixed(2)}</td>
              <td class="num">{r.totalHours.toFixed(1)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  {/if}
</div>

<style>
  .lp-wrap { display: flex; flex-direction: column; gap: 6px; font-size: 11px; }
  .lp-empty {
    color: #6A726E; font-style: italic; padding: 8px;
    font-size: 11px;
  }
  .lp-summary { font-size: 11px; color: #374850; margin-bottom: 2px; }
  .lp-warn { color: #B71C1C; font-weight: 700; margin-left: 6px; }

  .lp-weekly { display: flex; flex-direction: column; gap: 2px; }
  .lp-week-row {
    display: grid;
    grid-template-columns: 50px 1fr 50px;
    gap: 6px;
    align-items: center;
  }
  .lp-week-k { font-size: 10px; color: #374850; font-weight: 700; }
  .lp-week-bar-wrap {
    background: white;
    border: 1px solid #CFD7D0;
    height: 10px;
    border-radius: 2px;
    position: relative;
    overflow: hidden;
  }
  .lp-week-bar-fill {
    position: absolute; top: 0; left: 0; bottom: 0;
    background: linear-gradient(90deg, #2E7D32, #1B5E20);
    border-radius: 2px;
  }
  .lp-week-hrs {
    font-weight: 700; color: #14181C;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  .lp-detail-toggle {
    background: transparent;
    border: 1px dashed #CFD7D0;
    color: #374850;
    font-size: 10px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
    padding: 4px 8px; border-radius: 3px;
    cursor: pointer; margin-top: 6px;
    font-family: inherit;
  }
  .lp-detail-toggle:hover { border-color: #2E7D32; color: #1B5E20; }

  .lp-cable-table {
    width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 6px;
  }
  .lp-cable-table th {
    background: #2E7D32; color: white;
    padding: 3px 6px; text-align: left; font-size: 9px;
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .lp-cable-table th.num { text-align: right; }
  .lp-cable-table td { padding: 3px 6px; border-bottom: 1px solid #CFD7D0; vertical-align: top; }
  .lp-cable-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
</style>
