<!--
  Stage 1 Intake — file upload + classification.
  First increment of the Phase-2 port. This lands the UI for drag/drop
  upload + classified file list + takeoff-JSON ingest. Heavy decoders
  (pdf.js text extraction, DWG vectors, OCR) land in follow-up commits
  so the rewrite stays faithful to legacy behavior.
-->
<script lang="ts">
  import { store } from '@/store/intakeStore.svelte';
  import { classifyFile, isTextyFile } from '@/decoders/classify';
  import { parseTakeoffJson } from '@/decoders/takeoff';
  import { scanTextForCandidates } from '@/decoders/deterministicScan';
  import { recordCandidate, runCounts, reduceCandidates } from '@/decoders/runs';
  import type { IntakeFile, ExtractionRun } from '@models/intake';

  let dragOver = $state(false);
  let liveMsg = $state('');
  let takeoffMsg = $state<{ kind: 'ok' | 'error'; text: string } | null>(null);
  let scanMsg = $state<{ kind: 'ok' | 'error' | 'info'; text: string } | null>(null);
  let scanBusy = $state(false);

  function announce(msg: string) { liveMsg = msg; }

  function mkId(): string {
    return 'f_' + Math.random().toString(36).slice(2, 9);
  }

  function addFiles(list: FileList | File[] | null) {
    const files = Array.from(list ?? []);
    if (!files.length) { announce('No files added'); return; }

    let added = 0, replaced = 0, skipped = 0;
    const incoming: IntakeFile[] = [];

    for (const f of files) {
      const path = (f as unknown as { webkitRelativePath?: string }).webkitRelativePath || f.name;
      const dup = store.intake.files.find(x => x.path === path);
      if (dup) {
        if (dup.lastModified && f.lastModified && dup.lastModified !== f.lastModified) {
          const newer = f.lastModified > dup.lastModified;
          const ok = confirm(
            `"${f.name}" already uploaded.\n\n` +
            `Existing: ${new Date(dup.lastModified).toLocaleString()}\n` +
            `Incoming: ${new Date(f.lastModified).toLocaleString()} (${newer ? 'newer' : 'older'})\n\n` +
            'Replace with incoming version?'
          );
          if (ok) {
            store.intake.files = store.intake.files.filter(x => x.id !== dup.id);
            replaced++;
          } else {
            skipped++;
            continue;
          }
        } else {
          skipped++;
          continue;
        }
      }
      const cls = classifyFile(f.name);
      incoming.push({
        id: mkId(),
        name: f.name,
        path,
        size: f.size,
        type: f.type || 'application/octet-stream',
        lastModified: f.lastModified || null,
        class: cls.class,
        sheetCode: cls.sheetCode,
        scale: cls.scale,
        pages: null,
        status: 'pending',
        progress: 0,
        text: null,
        error: null,
        contributedToRuns: []
      });
      added++;
    }

    store.intake.files = store.intake.files.concat(incoming);

    // Read texty files immediately — parity with legacy readFileTexts().
    for (const entry of incoming) {
      if (isTextyFile(entry.name, entry.type)) {
        void readAsText(entry, files.find(x => x.name === entry.name && x.size === entry.size));
      }
    }

    const parts: string[] = [];
    if (added)    parts.push(`${added} added`);
    if (replaced) parts.push(`${replaced} replaced`);
    if (skipped)  parts.push(`${skipped} skipped (duplicate)`);
    announce(parts.join(', ') || 'No files added');
  }

  async function readAsText(entry: IntakeFile, file: File | undefined): Promise<void> {
    if (!file) return;
    const slot = store.intake.files.find(x => x.id === entry.id);
    if (!slot) return;
    slot.status = 'parsing';
    try {
      const text = await file.text();
      const live = store.intake.files.find(x => x.id === entry.id);
      if (!live) return;
      live.text = text;
      live.status = 'parsed';
      live.progress = 1;
    } catch (e) {
      const live = store.intake.files.find(x => x.id === entry.id);
      if (!live) return;
      live.error = String((e as Error)?.message ?? e);
      live.status = 'error';
    }
  }

  function removeFile(id: string) {
    store.intake.files = store.intake.files.filter(x => x.id !== id);
    announce('1 removed');
  }

  function resetFiles() {
    store.intake.files = [];
    store.intake.runs = [];
    announce('All files cleared');
  }

  // Drag-drop handling -----------------------------------------------------
  function onDragOver(e: DragEvent)  { e.preventDefault(); dragOver = true; }
  function onDragLeave(e: DragEvent) { e.preventDefault(); dragOver = false; }
  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    const dt = e.dataTransfer;
    if (!dt) return;
    addFiles(dt.files);
  }

  function onFilePick(e: Event) {
    const t = e.target as HTMLInputElement;
    addFiles(t.files);
    t.value = ''; // allow re-picking the same file
  }

  // Takeoff-JSON ingest ----------------------------------------------------
  async function onTakeoffPick(e: Event) {
    takeoffMsg = null;
    const t = e.target as HTMLInputElement;
    const file = t.files?.[0];
    if (!file) return;
    try {
      const raw = await file.text();
      const r = parseTakeoffJson(raw);
      if (!r.ok) {
        takeoffMsg = { kind: 'error', text: r.error ?? 'Parse failed' };
        return;
      }
      const sheetTxt = r.sheetIds && r.sheetIds.length
        ? ' (' + r.sheetIds.slice(0, 6).join(', ') + (r.sheetIds.length > 6 ? ', …' : '') + ')'
        : '';
      const sums = r.candidates!.endpointSums;
      const patch: Record<string, { value: number; confidence: number; src: string; final: boolean }> = {};
      const src = 'takeoff:' + file.name;
      for (const [tok, n] of Object.entries(sums)) {
        patch[tok] = { value: n, confidence: 0.9, src, final: false };
      }
      for (const [dev, n] of Object.entries(r.candidates!.unmapped)) {
        patch['lv_device_' + dev.toLowerCase()] = {
          value: n, confidence: 0.8, src, final: false
        };
      }
      store.mergeCrosswalk(patch);

      takeoffMsg = {
        kind: 'ok',
        text:
          `Imported ${r.deviceCount} devices across ${r.sheetIds!.length} sheet${r.sheetIds!.length === 1 ? '' : 's'}${sheetTxt}. ` +
          `Endpoints merged into crosswalk at 90% confidence.`
      };
    } catch (err) {
      takeoffMsg = { kind: 'error', text: String((err as Error)?.message ?? err) };
    } finally {
      t.value = '';
    }
  }

  // Deterministic scan -----------------------------------------------------
  // Regex-based sweep over every parsed texty file. Produces a new run
  // full of candidates, then reduces across all runs into the crosswalk.
  // This is additive — user-locked (final:true) entries are preserved.
  function runDeterministicScan() {
    scanMsg = null;
    const texty = store.intake.files.filter(f => f.status === 'parsed' && typeof f.text === 'string' && f.text.length > 0);
    if (!texty.length) {
      scanMsg = { kind: 'info', text: 'No texty files to scan. Load a .md / .txt / .csv / .json first.' };
      return;
    }
    scanBusy = true;
    try {
      const run: ExtractionRun = {
        id: 'r_' + Date.now(),
        ts: Date.now(),
        phase: 'parse',
        summary: '',
        candidates: {}
      };
      for (const f of texty) {
        const cands = scanTextForCandidates(f.text ?? '', f.path || f.name);
        for (const [tok, c] of Object.entries(cands)) {
          recordCandidate(run, tok, c.value, c.confidence, c.src);
        }
        f.contributedToRuns = [...(f.contributedToRuns ?? []), run.id];
      }
      const c = runCounts(run);
      run.summary = `Deterministic scan — ${c.files} file${c.files === 1 ? '' : 's'}, ${c.tokens} hit${c.tokens === 1 ? '' : 's'}.`;
      store.intake.runs = [...store.intake.runs, run];
      const reduced = reduceCandidates(store.intake.runs, store.intake.crosswalk);
      store.intake.crosswalk = reduced;
      scanMsg = {
        kind: c.tokens > 0 ? 'ok' : 'info',
        text:
          c.tokens > 0
            ? `Scan found ${c.tokens} token hit${c.tokens === 1 ? '' : 's'} across ${c.files} file${c.files === 1 ? '' : 's'}. Crosswalk updated.`
            : 'Scan completed — no count-patterns matched. Try loading an RFP or spec text file.'
      };
    } catch (err) {
      scanMsg = { kind: 'error', text: String((err as Error)?.message ?? err) };
    } finally {
      scanBusy = false;
    }
  }

  function fmtBytes(n: number): string {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    if (n < 1024 * 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + ' MB';
    return (n / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  let files = $derived(store.intake.files);
  let count = $derived(files.length);
</script>

<section class="s1">
  <div class="s1-head">
    <div>
      <h2>Stage 1 — Intake</h2>
      <p class="s1-sub">Drop bid docs, plans, and takeoff JSON. We classify by name, extract text from what's readable, and hand the rest to the extraction pipeline.</p>
    </div>
    <div class="s1-actions">
      <label class="s1-btn s1-btn-primary">
        + Add files
        <input type="file" multiple onchange={onFilePick} hidden />
      </label>
      <label class="s1-btn">
        Import takeoff JSON
        <input type="file" accept="application/json,.json" onchange={onTakeoffPick} hidden />
      </label>
      <button
        type="button"
        class="s1-btn"
        disabled={scanBusy || count === 0}
        onclick={runDeterministicScan}
        title="Regex sweep over texty files (no AI needed). Hunts drop / AP / camera / door / fiber / rack counts."
      >
        {scanBusy ? 'Scanning…' : 'Run scan'}
      </button>
      {#if count}
        <button type="button" class="s1-btn s1-btn-ghost" onclick={resetFiles}>Clear all</button>
      {/if}
    </div>
  </div>

  <!-- Drop zone -->
  <div
    class="s1-drop"
    class:is-over={dragOver}
    ondragover={onDragOver}
    ondragleave={onDragLeave}
    ondrop={onDrop}
    role="region"
    aria-label="File drop zone"
  >
    <div class="s1-drop-primary">
      {dragOver ? 'Release to upload' : 'Drag bid files here'}
    </div>
    <div class="s1-drop-secondary">
      Drawings (PDF/DWG), specs, RFP, transcripts, notes — all welcome.
      Name-hints like "RFP" / "T-101" get auto-classified.
    </div>
  </div>

  <!-- Takeoff ingest feedback -->
  {#if takeoffMsg}
    <div class="s1-msg" class:s1-msg-err={takeoffMsg.kind === 'error'}>
      <strong>{takeoffMsg.kind === 'error' ? 'Takeoff import failed:' : 'Takeoff imported:'}</strong>
      {takeoffMsg.text}
    </div>
  {/if}

  <!-- Deterministic-scan feedback -->
  {#if scanMsg}
    <div class="s1-msg" class:s1-msg-err={scanMsg.kind === 'error'} class:s1-msg-info={scanMsg.kind === 'info'}>
      <strong>
        {#if scanMsg.kind === 'error'}Scan error:
        {:else if scanMsg.kind === 'info'}Scan:
        {:else}Scan complete:
        {/if}
      </strong>
      {scanMsg.text}
    </div>
  {/if}

  <!-- File list -->
  {#if count === 0}
    <div class="s1-empty">No files yet. Drop or browse to start.</div>
  {:else}
    <table class="s1-files">
      <thead>
        <tr>
          <th scope="col">File</th>
          <th scope="col">Class</th>
          <th scope="col">Sheet</th>
          <th scope="col">Scale</th>
          <th scope="col">Size</th>
          <th scope="col">Status</th>
          <th scope="col" aria-label="Actions"></th>
        </tr>
      </thead>
      <tbody>
        {#each files as f (f.id)}
          <tr>
            <td>
              <div class="fn">{f.name}</div>
              {#if f.path && f.path !== f.name}
                <div class="fp">{f.path}</div>
              {/if}
            </td>
            <td><span class="chip chip-{f.class}">{f.class}</span></td>
            <td>{f.sheetCode ?? '—'}</td>
            <td>{f.scale ?? '—'}</td>
            <td>{fmtBytes(f.size)}</td>
            <td>
              <span class="st st-{f.status}">{f.status}</span>
              {#if f.status === 'error' && f.error}
                <div class="err" title={f.error}>{f.error}</div>
              {/if}
            </td>
            <td>
              <button type="button" class="s1-row-del" onclick={() => removeFile(f.id)} aria-label={'Remove ' + f.name}>×</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}

  <div class="visually-hidden" aria-live="polite">{liveMsg}</div>

  <footer class="s1-foot">
    Next: once the crosswalk is populated, Stage 2 opens the catalog and
    line-item editor. Run the extraction pipeline from Stage 1 → Stage 2
    when ready. (Extraction runs port is the next increment.)
  </footer>
</section>

<style>
  .s1 { padding: 14px 0 24px; }
  .s1-head { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 12px; align-items: flex-start; }
  .s1-head h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 800;
    color: #1B5E20;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .s1-sub { margin: 4px 0 0; font-size: 13px; color: #374850; max-width: 640px; }
  .s1-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .s1-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 3px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: #FAFAF8;
    border: 1px solid #CFD7D0;
    color: #14181C;
    cursor: pointer;
    font-family: inherit;
  }
  .s1-btn:hover { background: #F1F8F1; border-color: #2E7D32; }
  .s1-btn-primary { background: #2E7D32; color: white; border-color: #1B5E20; }
  .s1-btn-primary:hover { background: #1B5E20; }
  .s1-btn-ghost { background: transparent; color: #B71C1C; border-color: transparent; }
  .s1-btn-ghost:hover { background: #FAE5E5; border-color: #B71C1C; }

  .s1-drop {
    border: 2px dashed #2E7D32;
    border-radius: 6px;
    padding: 28px 20px;
    text-align: center;
    background: #F1F8F1;
    transition: background 0.1s ease, border-color 0.1s ease;
  }
  .s1-drop.is-over { background: #E3F2E3; border-color: #D4AF37; }
  .s1-drop-primary {
    font-size: 16px;
    font-weight: 800;
    color: #1B5E20;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .s1-drop-secondary { font-size: 12px; color: #374850; margin-top: 4px; }

  .s1-msg {
    margin-top: 10px;
    padding: 8px 12px;
    border-left: 4px solid #2E7D32;
    background: #F1F8F1;
    font-size: 13px;
    color: #14181C;
    border-radius: 0 3px 3px 0;
  }
  .s1-msg-err  { border-color: #B71C1C; background: #FAE5E5; }
  .s1-msg-info { border-color: #D4AF37; background: #FAF5E6; }

  .s1-empty {
    margin-top: 14px;
    padding: 16px;
    text-align: center;
    font-style: italic;
    color: #6A726E;
    background: #FAFAF8;
    border-radius: 3px;
  }

  .s1-files { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 13px; }
  .s1-files th, .s1-files td {
    padding: 6px 8px;
    border-bottom: 1px solid #ECECEC;
    text-align: left;
    vertical-align: top;
  }
  .s1-files th {
    background: #FAFAF8;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #6A726E;
    font-weight: 700;
  }
  .s1-files tr:hover td { background: #FAFAF5; }
  .fn { font-weight: 600; color: #14181C; }
  .fp { font-size: 10px; color: #6A726E; font-family: 'Consolas', monospace; margin-top: 1px; }
  .chip {
    display: inline-block;
    font-size: 10px;
    padding: 1px 8px;
    border-radius: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .chip-plan  { background: #E8F5E9; color: #1B5E20; }
  .chip-rfp   { background: #FAE5E5; color: #B71C1C; }
  .chip-spec  { background: #FAF5E6; color: #7A5A00; }
  .chip-notes { background: #EDE7F6; color: #4527A0; }
  .chip-other { background: #ECEFF1; color: #37474F; }

  .st {
    display: inline-block;
    font-size: 10px;
    padding: 1px 8px;
    border-radius: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .st-pending { background: #ECEFF1; color: #37474F; }
  .st-parsing { background: #FAF5E6; color: #7A5A00; }
  .st-parsed  { background: #E8F5E9; color: #1B5E20; }
  .st-error   { background: #FAE5E5; color: #B71C1C; }
  .err { font-size: 10px; color: #B71C1C; margin-top: 2px; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .s1-row-del {
    background: transparent;
    border: none;
    font-size: 18px;
    line-height: 1;
    color: #6A726E;
    cursor: pointer;
    padding: 0 4px;
    font-family: inherit;
  }
  .s1-row-del:hover { color: #B71C1C; }

  .s1-foot { margin-top: 18px; font-size: 11px; color: #374850; font-style: italic; }

  .visually-hidden {
    position: absolute; width: 1px; height: 1px;
    overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap;
  }
</style>
