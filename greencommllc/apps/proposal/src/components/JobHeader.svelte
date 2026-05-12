<!--
  JobHeader - sticky top bar.
  Always visible at every stage. Binds live to crosswalk + session so
  project/client/propnum/endpoints/bid-value stay current without any
  manual refresh. When fields are empty shows em-dash placeholders.
-->
<script lang="ts">
  import { store } from '@/store/intakeStore.svelte';
  import { deriveJobSummary } from '@pricing/jobSummary';

  let summary = $derived(
    deriveJobSummary({
      crosswalk: store.intake.crosswalk,
      lines:     store.session.lines,
      drops:     (() => {
        const cw = store.intake.crosswalk;
        const get = (k: string) => Number(cw[k]?.value) || 0;
        return get('data_drops_count') + get('ap_count') + get('camera_count_commercial') + get('door_positions_count');
      })()
    })
  );

  const MODE_LABEL: Record<typeof summary['mode'], { label: string; cls: string }> = {
    bid:         { label: 'SUB-BID',     cls: 'jh-mode-bid' },
    owner:       { label: 'OWNER',       cls: 'jh-mode-owner' },
    residential: { label: 'RESIDENTIAL', cls: 'jh-mode-res' },
    unknown:     { label: 'DRAFT',       cls: 'jh-mode-unk' }
  };

  // daysToBid urgency: red <=3, gold <=10, muted otherwise.
  function daysCls(n: number | null): string {
    if (n == null) return 'jh-days-empty';
    if (n <= 3)  return 'jh-days-urgent';
    if (n <= 10) return 'jh-days-warn';
    return 'jh-days-ok';
  }

  function fmtDate(iso: string): string {
    if (!iso) return '—';
    // Keep ISO for tabular compactness; tooltip has long form.
    return iso;
  }

  // Sentinel — show em-dash when field is empty.
  function em(v: string): string { return v || '—'; }
</script>

<header class="job-header">
  <div class="jh-brand">
    <span class="jh-brand-name">GCC</span>
    <span class={'jh-mode-pill ' + MODE_LABEL[summary.mode].cls}>{MODE_LABEL[summary.mode].label}</span>
  </div>

  <dl class="jh-grid">
    <div class="jh-cell">
      <dt>Project</dt>
      <dd title={summary.project}>{em(summary.project)}</dd>
    </div>
    <div class="jh-cell">
      <dt>Customer</dt>
      <dd title={summary.customer}>{em(summary.customer)}</dd>
    </div>
    <div class="jh-cell">
      <dt>Proposal #</dt>
      <dd>{em(summary.propnum)}</dd>
    </div>
    <div class="jh-cell">
      <dt>Due</dt>
      <dd class={daysCls(summary.daysToBid)}>
        {fmtDate(summary.dateIso)}
        {#if summary.daysToBid != null}
          <span class="jh-days">
            {summary.daysToBid >= 0 ? `in ${summary.daysToBid}d` : `${Math.abs(summary.daysToBid)}d past`}
          </span>
        {/if}
      </dd>
    </div>
    <div class="jh-cell">
      <dt>Endpoints</dt>
      <dd>{em(summary.endpoints)}</dd>
    </div>
    <div class="jh-cell jh-cell-bid">
      <dt>Bid value</dt>
      <dd class="jh-bidvalue">{em(summary.bidValue)}</dd>
    </div>
  </dl>
</header>

<style>
  .job-header {
    position: sticky;
    top: 0;
    z-index: 60;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 16px;
    align-items: center;
    padding: 10px 20px;
    background: #1B5E20;
    color: white;
    border-bottom: 2px solid #D4AF37;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    min-height: 52px;
  }
  @media (max-width: 900px) {
    .job-header { grid-template-columns: 1fr; gap: 8px; }
  }

  .jh-brand {
    display: flex; align-items: center; gap: 8px;
  }
  .jh-brand-name {
    font-size: 18px; font-weight: 900;
    letter-spacing: 0.02em;
  }
  .jh-mode-pill {
    font-size: 9px; font-weight: 900;
    letter-spacing: 0.08em; text-transform: uppercase;
    padding: 2px 8px; border-radius: 999px;
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.3);
  }
  .jh-mode-bid   { background: #D4AF37; color: #14181C; border-color: #D4AF37; }
  .jh-mode-owner { background: rgba(255,255,255,0.22); }
  .jh-mode-res   { background: rgba(255,255,255,0.22); }
  .jh-mode-unk   { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); }

  .jh-grid {
    display: grid;
    grid-template-columns: repeat(6, minmax(100px, 1fr));
    gap: 6px 16px;
    margin: 0;
    padding: 0;
  }
  @media (max-width: 1200px) {
    .jh-grid { grid-template-columns: repeat(3, 1fr); }
  }
  @media (max-width: 700px) {
    .jh-grid { grid-template-columns: repeat(2, 1fr); }
  }

  .jh-cell { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .jh-cell dt {
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.62);
    margin: 0;
  }
  .jh-cell dd {
    font-size: 13px;
    font-weight: 700;
    color: white;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-variant-numeric: tabular-nums;
  }
  .jh-cell-bid .jh-bidvalue { color: #FAF5E6; font-weight: 800; font-size: 14px; }

  .jh-days {
    margin-left: 4px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.04em;
    padding: 1px 5px;
    border-radius: 2px;
  }
  .jh-days-urgent .jh-days { background: #B71C1C; color: white; }
  .jh-days-warn   .jh-days { background: #D4AF37; color: #14181C; }
  .jh-days-ok     .jh-days { background: rgba(255,255,255,0.18); }
  .jh-days-empty  .jh-days { display: none; }
</style>
