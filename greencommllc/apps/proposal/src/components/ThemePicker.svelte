<script lang="ts">
  import { THEMES, type Theme } from '@/themes/themes';
  import { store } from '@/store/intakeStore.svelte';

  function ids(): string[] {
    return store.intake.selectedThemeIds ?? (store.intake.selectedThemeIds = []);
  }

  function toggle(id: string) {
    const list = ids();
    const idx = list.indexOf(id);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(id);
  }

  function isSelected(t: Theme): boolean {
    return (store.intake.selectedThemeIds ?? []).includes(t.id);
  }

  function rank(t: Theme): number {
    const list = store.intake.selectedThemeIds ?? [];
    const i = list.indexOf(t.id);
    return i < 0 ? -1 : i + 1;
  }
</script>

<div class="theme-picker">
  <div class="tp-head">
    <h3>Style / Theme</h3>
    <span class="tp-sub">
      pick 1 to stylize · pick ≥2 to compare versions side-by-side
    </span>
  </div>

  <div class="tp-grid">
    {#each THEMES as t (t.id)}
      <button
        type="button"
        class="tp-card"
        class:tp-active={isSelected(t)}
        onclick={() => toggle(t.id)}
        title={t.bestFor}
      >
        {#if rank(t) > 0}
          <span class="tp-badge" class:tp-badge-primary={rank(t) === 1}>
            {rank(t) === 1 ? 'primary' : '#' + rank(t)}
          </span>
        {/if}
        <div class="tp-swatches">
          {#each t.colors as c}
            <span class="tp-swatch" style="background:{c.hex}" title="{c.name} ({c.hex})"></span>
          {/each}
        </div>
        <div class="tp-name">{t.name}</div>
        <div class="tp-desc">{t.description}</div>
      </button>
    {/each}
  </div>
</div>

<style>
  .theme-picker { padding: 0; }
  .tp-head {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 8px;
  }
  .tp-head h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #1B5E20;
  }
  .tp-sub { font-size: 11px; color: #6A726E; font-style: italic; }
  .tp-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 8px;
  }
  .tp-card {
    position: relative;
    text-align: left;
    background: white;
    border: 1px solid #CFD7D0;
    border-radius: 4px;
    padding: 8px 10px;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.12s;
  }
  .tp-card:hover { border-color: #1B5E20; transform: translateY(-1px); }
  .tp-card.tp-active {
    border-color: #1B5E20;
    box-shadow: 0 0 0 2px rgba(27, 94, 32, 0.2);
  }
  .tp-badge {
    position: absolute;
    top: 4px;
    right: 4px;
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: #6A726E;
    color: white;
    border-radius: 2px;
    padding: 1px 5px;
  }
  .tp-badge.tp-badge-primary { background: #1B5E20; }
  .tp-swatches {
    display: flex;
    gap: 2px;
    margin-bottom: 6px;
  }
  .tp-swatch {
    width: 100%;
    height: 16px;
    border-radius: 2px;
    border: 1px solid rgba(0, 0, 0, 0.05);
  }
  .tp-name {
    font-size: 12px;
    font-weight: 700;
    color: #14181C;
    margin-bottom: 2px;
  }
  .tp-desc {
    font-size: 10px;
    color: #6A726E;
    line-height: 1.3;
  }
</style>
