<!--
  DocPreviewModal - iframe-based preview for a deliverable.
  Calls the deliverable's generator (currently only Finance Summary is
  ported to TS) and renders the resulting HTML inside a sandboxed iframe.
  Actions: Regenerate this / Download / Close.
-->
<script lang="ts">
  import { store } from '@/store/intakeStore.svelte';
  import { GCC_BRAND } from '@brand/gcc';
  import { renderDeliverable } from '@/outputs/render';
  import type { TocDef } from '@models/toc';
  import { getTheme, themePromptSpec } from '@/themes/themes';
  import * as styledStorage from '@/themes/styledStorage';
  import ThemeComparisonModal from './ThemeComparisonModal.svelte';

  interface Props {
    def: TocDef | null;
    onClose?: () => void;
  }
  let { def = null, onClose }: Props = $props();

  let originalHtml = $state<string | null>(null);
  let styledHtml = $state<string | null>(null);
  let filename = $state('');
  let errorMsg = $state<string | null>(null);
  let generating = $state(false);
  let stylizing = $state(false);
  let isStyledView = $state(false);
  let lastDefKey = $state<string | null>(null);
  let comparing = $state(false);

  const selectedIds = $derived(store.intake.selectedThemeIds ?? []);
  const canCompare = $derived(selectedIds.length >= 2);

  const html = $derived<string | null>(isStyledView && styledHtml ? styledHtml : originalHtml);

  // Placeholder logos for the TS scaffold — outputs still look right without
  // real base64 since gccHtmlShell only embeds whatever we hand it.
  const logos = {
    emblem:     'data:image/png;base64,',
    stacked:    'data:image/png;base64,',
    letterhead: 'data:image/png;base64,'
  };

  function generate(d: TocDef) {
    generating = true;
    errorMsg = null;
    try {
      const out = renderDeliverable(d, {
        intake: store.intake,
        session: store.session,
        brand: GCC_BRAND,
        logos
      });
      originalHtml = out.html;
      filename = out.filename;
      // If we cached a styled version for this deliverable + primary theme,
      // restore it automatically so the user doesn't have to re-stylize.
      const primaryThemeId = (store.intake.selectedThemeIds ?? [])[0];
      const cached = primaryThemeId ? styledStorage.load(d.key, primaryThemeId) : null;
      if (cached) {
        styledHtml = cached;
        isStyledView = true;
      } else {
        styledHtml = null;
        isStyledView = false;
      }
      // Mark as generated so TOC badge flips to READY.
      store.intake.generatedAt[d.key] = new Date().toISOString();
    } catch (e) {
      errorMsg = String((e as Error)?.message ?? e);
      originalHtml = null;
    } finally {
      generating = false;
    }
  }

  // Generate when def opens or changes — but only once per def key, so a
  // background re-render doesn't clobber a styled view the user just made.
  $effect(() => {
    if (!def) {
      originalHtml = null;
      styledHtml = null;
      filename = '';
      isStyledView = false;
      lastDefKey = null;
      return;
    }
    if (def.key === lastDefKey) return;
    lastDefKey = def.key;
    generate(def);
  });

  // Produce a blob URL so the iframe sandbox renders isolated.
  let blobUrl = $state<string | null>(null);
  $effect(() => {
    if (!html) {
      if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
      return;
    }
    const b = new Blob([html], { type: 'text/html' });
    const u = URL.createObjectURL(b);
    blobUrl = u;
    return () => URL.revokeObjectURL(u);
  });

  function download() {
    if (!html || !filename) return;
    const b = new Blob([html], { type: 'text/html' });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = u; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(u), 2000);
  }

  function regenerate() {
    if (def) generate(def);
  }

  async function stylizeWithGemini() {
    if (!originalHtml) return;
    const themeId = (store.intake.selectedThemeIds ?? [])[0];
    if (!themeId) {
      errorMsg = 'Pick a theme in Stage 4 before stylizing.';
      return;
    }
    const theme = getTheme(themeId);
    if (!theme) {
      errorMsg = 'Selected theme not found.';
      return;
    }

    stylizing = true;
    errorMsg = null;
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
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `stylize failed: ${res.status}`);
      }
      const data = await res.json();
      styledHtml = data.html;
      isStyledView = true;
      if (def) styledStorage.save(def.key, themeId, data.html);
    } catch (e) {
      errorMsg = String((e as Error)?.message ?? e);
    } finally {
      stylizing = false;
    }
  }

  function showOriginal() {
    isStyledView = false;
  }

  function openComparison() {
    if (!canCompare || !originalHtml) return;
    comparing = true;
  }

  function closeComparison() {
    comparing = false;
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose?.();
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose?.();
  }
</script>

<svelte:window onkeydown={handleKey} />

{#if def}
  <div class="dpm-backdrop" onclick={handleBackdropClick} role="presentation">
    <div class="dpm-panel" role="dialog" aria-modal="true" aria-labelledby="dpm-title-label">
      <header>
        <div class="dpm-title">
          <span class="dpm-kind">{def.number} · {def.label}</span>
          <span class="dpm-file" id="dpm-title-label">
            {filename || (generating ? 'Generating preview…' : '')}
          </span>
        </div>
        <div class="dpm-actions">
          <button type="button" class="dpm-btn dpm-btn-primary" onclick={regenerate}>Regenerate this</button>
          {#if canCompare}
            <button type="button" class="dpm-btn" onclick={openComparison} disabled={!originalHtml}>
              Compare {selectedIds.length}
            </button>
          {/if}
          {#if isStyledView}
            <button type="button" class="dpm-btn" onclick={showOriginal} disabled={stylizing}>
              Original
            </button>
          {:else}
            <button type="button" class="dpm-btn" onclick={stylizeWithGemini} disabled={stylizing || !originalHtml}>
              {stylizing ? 'Stylizing…' : '✨ Stylize'}
            </button>
          {/if}
          <button type="button" class="dpm-btn" onclick={download} disabled={!html}>↓ Download</button>
          <button type="button" class="dpm-close" onclick={() => onClose?.()}>Close</button>
        </div>
      </header>
      {#if errorMsg}
        <div class="dpm-error">Error: {errorMsg}</div>
      {:else if blobUrl}
        <iframe title="Deliverable preview" src={blobUrl} sandbox="allow-same-origin"></iframe>
      {:else}
        <div class="dpm-empty">Generating…</div>
      {/if}
    </div>
  </div>
{/if}

{#if comparing && def}
  <ThemeComparisonModal
    originalHtml={originalHtml}
    themeIds={selectedIds}
    deliverableKey={def.key}
    onClose={closeComparison}
    onPick={(_themeId, html) => {
      styledHtml = html;
      isStyledView = true;
    }}
  />
{/if}

<style>
  .dpm-backdrop {
    position: fixed; inset: 0;
    background: rgba(20, 24, 28, 0.55);
    z-index: 180;
    display: flex; align-items: center; justify-content: center;
    padding: 32px;
  }
  .dpm-panel {
    background: white;
    width: min(1000px, 100%);
    max-width: 1000px;
    height: calc(100vh - 64px);
    border-radius: 6px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.35);
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
  .dpm-title { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .dpm-kind  { font-size: 10px; font-weight: 800; letter-spacing: 0.06em; color: rgba(255,255,255,0.8); text-transform: uppercase; }
  .dpm-file  { font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .dpm-actions { display: flex; gap: 6px; align-items: center; }
  .dpm-btn {
    padding: 4px 10px;
    background: transparent; color: white;
    border: 1px solid rgba(255,255,255,0.4);
    border-radius: 3px;
    font-size: 12px; font-weight: 700; cursor: pointer;
    font-family: inherit;
  }
  .dpm-btn:hover { background: rgba(255,255,255,0.15); }
  .dpm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .dpm-btn-primary {
    background: #D4AF37; border-color: #D4AF37; color: #14181C;
  }
  .dpm-btn-primary:hover { background: #B8951F; color: white; }
  .dpm-close {
    background: transparent; color: white;
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 2px;
    padding: 2px 10px; cursor: pointer; font-size: 12px;
    font-family: inherit;
  }
  iframe {
    flex: 1; width: 100%; border: none; background: #F7F7F5;
  }
  .dpm-empty, .dpm-error {
    flex: 1; display: flex; align-items: center; justify-content: center;
    color: #374850; font-style: italic;
  }
  .dpm-error { color: #B71C1C; }
</style>
