<script lang="ts">
  import { getTheme, themePromptSpec, type Theme } from '@/themes/themes';
  import { store } from '@/store/intakeStore.svelte';
  import * as styledStorage from '@/themes/styledStorage';

  interface Props {
    originalHtml: string | null;
    themeIds: string[];
    deliverableKey?: string;
    onClose?: () => void;
    onPick?: (themeId: string, html: string) => void;
  }
  let { originalHtml, themeIds, deliverableKey, onClose, onPick }: Props = $props();

  type PaneState =
    | { status: 'pending' }
    | { status: 'loading' }
    | { status: 'done'; html: string; blobUrl: string }
    | { status: 'error'; message: string };

  let panes = $state<Record<string, PaneState>>({});
  // Track blob URLs in a non-reactive ref so the cleanup doesn't subscribe
  // to `panes` and create a re-run loop.
  const createdUrls: string[] = [];
  let runId = 0;

  function urlFor(html: string): string {
    const u = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    createdUrls.push(u);
    return u;
  }

  async function stylizeOne(theme: Theme, ownRunId: number) {
    panes[theme.id] = { status: 'loading' };
    try {
      const res = await fetch('/api/gemini/stylize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: originalHtml,
          instructions:
            'Restyle the supplied HTML using the theme spec. Preserve every fact, number, name, and section verbatim. Replace inline styles with theme-appropriate ones. Apply the heading/body fonts and color palette consistently. Return a complete standalone HTML document with an embedded ' + '<' + 'style> block — HTML only, no commentary, no markdown fences.',
          voice: themePromptSpec(theme)
        })
      });
      if (ownRunId !== runId) return; // superseded by a newer run
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `stylize failed: ${res.status}`);
      }
      const data = await res.json();
      if (ownRunId !== runId) return;
      const blobUrl = urlFor(data.html);
      panes[theme.id] = { status: 'done', html: data.html, blobUrl };
    } catch (e) {
      if (ownRunId !== runId) return;
      panes[theme.id] = { status: 'error', message: String((e as Error)?.message ?? e) };
    }
  }

  async function stylizeAll() {
    if (!originalHtml) return;
    const ownRunId = ++runId;
    const themes = themeIds.map((id) => getTheme(id)).filter(Boolean) as Theme[];
    panes = Object.fromEntries(themes.map((t) => [t.id, { status: 'pending' as const }]));
    await Promise.all(themes.map((t) => stylizeOne(t, ownRunId)));
  }

  // Kick off exactly once on mount. The empty-arg root effect runs once
  // on mount and the cleanup runs once on unmount — no reactive tracking.
  $effect.root(() => {
    stylizeAll();
    return () => {
      runId++;
      for (const u of createdUrls) URL.revokeObjectURL(u);
    };
  });

  function download(theme: Theme) {
    const pane = panes[theme.id];
    if (!pane || pane.status !== 'done') return;
    const a = document.createElement('a');
    a.href = pane.blobUrl;
    a.download = `proposal-${theme.id}.html`;
    a.click();
  }

  function pickWinner(theme: Theme) {
    const pane = panes[theme.id];
    if (!pane || pane.status !== 'done') return;
    // Move chosen theme to position 0 (primary) in the selected list.
    const list = store.intake.selectedThemeIds ?? [];
    const filtered = list.filter((id) => id !== theme.id);
    store.intake.selectedThemeIds = [theme.id, ...filtered];
    // Cache the styled HTML so DocPreviewModal restores it on next open.
    if (deliverableKey) styledStorage.save(deliverableKey, theme.id, pane.html);
    onPick?.(theme.id, pane.html);
    onClose?.();
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose?.();
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose?.();
  }

  const themes = $derived(themeIds.map((id) => getTheme(id)).filter(Boolean) as Theme[]);
</script>

<svelte:window onkeydown={handleKey} />

<div class="cmp-backdrop" onclick={handleBackdropClick} role="presentation">
  <div class="cmp-panel" role="dialog" aria-modal="true" aria-labelledby="cmp-title">
    <header>
      <div class="cmp-title">
        <span class="cmp-kind">VERSION COMPARISON</span>
        <span class="cmp-file" id="cmp-title">
          {themes.length} theme{themes.length === 1 ? '' : 's'} stylized via Gemini
        </span>
      </div>
      <div class="cmp-actions">
        <button type="button" class="cmp-btn" onclick={stylizeAll}>Re-run all</button>
        <button type="button" class="cmp-close" onclick={() => onClose?.()}>Close</button>
      </div>
    </header>
    <div class="cmp-grid" style="grid-template-columns: repeat({Math.min(themes.length, 3)}, 1fr);">
      {#each themes as t (t.id)}
        {@const pane = panes[t.id]}
        <div class="cmp-pane">
          <div class="cmp-pane-hdr">
            <div class="cmp-pane-name">{t.name}</div>
            <div class="cmp-pane-swatches">
              {#each t.colors as c}
                <span class="cmp-pane-swatch" style="background:{c.hex}"></span>
              {/each}
            </div>
            <button
              type="button"
              class="cmp-btn cmp-btn-sm cmp-btn-pick"
              onclick={() => pickWinner(t)}
              disabled={!pane || pane.status !== 'done'}
              title="Use this theme as primary"
            >
              Pick
            </button>
            <button
              type="button"
              class="cmp-btn cmp-btn-sm"
              onclick={() => download(t)}
              disabled={!pane || pane.status !== 'done'}
              title="Download styled HTML"
            >
              ↓
            </button>
          </div>
          <div class="cmp-pane-body">
            {#if !pane || pane.status === 'pending'}
              <div class="cmp-empty">Queued…</div>
            {:else if pane.status === 'loading'}
              <div class="cmp-empty">Stylizing with Gemini…</div>
            {:else if pane.status === 'error'}
              <div class="cmp-error">Error: {pane.message}</div>
            {:else}
              <iframe title={t.name} src={pane.blobUrl} sandbox="allow-same-origin"></iframe>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .cmp-backdrop {
    position: fixed; inset: 0;
    background: rgba(20, 24, 28, 0.65);
    z-index: 200;
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
  }
  .cmp-panel {
    background: white;
    width: min(1600px, 100%);
    height: calc(100vh - 48px);
    border-radius: 6px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.4);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  header {
    background: #1B5E20;
    color: white;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .cmp-title { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .cmp-kind { font-size: 10px; font-weight: 800; letter-spacing: 0.06em; color: rgba(255,255,255,0.8); text-transform: uppercase; }
  .cmp-file { font-size: 13px; font-weight: 700; }
  .cmp-actions { display: flex; gap: 6px; }
  .cmp-btn {
    padding: 4px 10px;
    background: transparent; color: white;
    border: 1px solid rgba(255,255,255,0.4);
    border-radius: 3px;
    font-size: 12px; font-weight: 700; cursor: pointer;
    font-family: inherit;
  }
  .cmp-btn:hover { background: rgba(255,255,255,0.15); }
  .cmp-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .cmp-btn-sm { padding: 2px 8px; }
  .cmp-btn-pick {
    background: #D4AF37;
    color: #14181C;
    border-color: #D4AF37;
    font-weight: 800;
  }
  .cmp-btn-pick:hover:not(:disabled) {
    background: #B8951F;
    color: white;
  }
  .cmp-close {
    background: transparent; color: white;
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 2px;
    padding: 2px 10px; cursor: pointer; font-size: 12px;
    font-family: inherit;
  }
  .cmp-grid {
    flex: 1;
    display: grid;
    gap: 1px;
    background: #CFD7D0;
    overflow: hidden;
  }
  .cmp-pane {
    display: flex;
    flex-direction: column;
    background: white;
    overflow: hidden;
  }
  .cmp-pane-hdr {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #F1F8F1;
    border-bottom: 1px solid #CFD7D0;
  }
  .cmp-pane-name {
    font-size: 12px;
    font-weight: 800;
    color: #1B5E20;
    flex: 1;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .cmp-pane-swatches {
    display: flex;
    gap: 1px;
  }
  .cmp-pane-swatch {
    width: 10px;
    height: 10px;
    border-radius: 1px;
    border: 1px solid rgba(0,0,0,0.05);
  }
  .cmp-pane-body { flex: 1; display: flex; }
  .cmp-pane-body iframe {
    flex: 1;
    border: none;
    width: 100%;
    background: white;
  }
  .cmp-empty, .cmp-error {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6A726E;
    font-style: italic;
    font-size: 13px;
    padding: 20px;
    text-align: center;
  }
  .cmp-error { color: #B71C1C; font-style: normal; }
</style>
