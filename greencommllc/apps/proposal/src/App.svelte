<!--
  GCC Proposal Generator — Phase 2 root.
  Mounts JobHeader + StageNav and routes between the four stages
  based on store.intake.stage. Stage 4 is the fully-ported config;
  Stages 1-3 are progressive ports from bundle-builder.html.
-->
<script lang="ts">
  import JobHeader from './components/JobHeader.svelte';
  import StageNav from './components/StageNav.svelte';
  import Stage1Intake from './components/Stage1Intake.svelte';
  import Stage2Catalog from './components/Stage2Catalog.svelte';
  import Stage3Review from './components/Stage3Review.svelte';
  import Stage4 from './components/Stage4.svelte';
  import { store } from '@/store/intakeStore.svelte';

  // Seed demo data on first load. Noop on subsequent loads (localStorage has it).
  if (Object.keys(store.intake.crosswalk).length === 0) {
    const demo: [string, string][] = [
      ['project_name',      'Parkway North HS — LV Refresh 2027'],
      ['project_type',      'K-12 public school district'],
      ['project_address',   '12046 Barrett Station Rd, St. Louis, MO'],
      ['gc_company_name',   'McCarthy Building Companies'],
      ['scope_notes',       'After-hours work required. Prevailing wage applies. Occupied summer session.'],
      ['bid_due_date',      new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10)],
      ['bond_required',     'Yes'],
      ['data_drops_count',  '220']
    ];
    for (const [k, v] of demo) {
      store.intake.crosswalk[k] = { value: v, confidence: 0.9, src: 'demo-seed', final: true };
    }
    store.session.lines = [
      { qty: 220, costEach: 12,   saleEach: 28,   laborHours: 0.75, category: 'Structured Cabling',  name: 'Cat6A Drop', unit: 'EA',  src: 'eq' },
      { qty: 18,  costEach: 320,  saleEach: 680,  laborHours: 2.5,  category: 'Wireless Access',     name: 'MR46 AP',   unit: 'EA',  src: 'eq' },
      { qty: 24,  costEach: 260,  saleEach: 540,  laborHours: 3,    category: 'Video Surveillance',  name: 'P3245-LVE', unit: 'EA',  src: 'eq' },
      { qty: 12,  costEach: 450,  saleEach: 950,  laborHours: 6,    category: 'Access Control',      name: 'Door Kit',  unit: 'EA',  src: 'eq' },
      { qty: 1,   costEach: 0,    saleEach: 8500, laborHours: 40,   category: 'Commissioning',       name: 'Fluke Cert',unit: 'LOT', src: 'sv' }
    ];
  }

  function resetDemo() {
    store.reset();
    location.reload();
  }

  let stage = $derived(store.intake.stage);
</script>

<!-- Sticky top job header - always visible, driven by the crosswalk. -->
<JobHeader />

<!-- 4-stage stepper — sticky directly under the JobHeader. -->
<StageNav />

<main>
  <header class="sub-header">
    <div class="brand">
      <span class="brand-tag">TS/Svelte · Phase 2 · 4-stage router</span>
    </div>
    <nav>
      <a href="./MIGRATION.md">Migration plan</a>
      <button type="button" onclick={resetDemo} class="reset-btn">Reset demo</button>
    </nav>
  </header>

  {#if stage === 'intake'}
    <Stage1Intake />
  {:else if stage === 'products'}
    <Stage2Catalog />
  {:else if stage === 'review-lines'}
    <Stage3Review />
  {:else}
    <Stage4 />
  {/if}

  <footer>
    Stage 4 is fully ported. Stages 1–3 are progressive ports — the
    legacy <code>bundle-builder.html</code> still runs the full pipeline
    until all four are green. See <a href="./MIGRATION.md">MIGRATION.md</a>.
  </footer>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: 'Inter', Calibri, -apple-system, system-ui, sans-serif;
    background: #FAFAF8;
    color: #14181C;
    line-height: 1.45;
  }
  main { margin: 0 auto; padding: 12px clamp(10px, 2vw, 24px) 40px; max-width: 1440px; }
  .sub-header {
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px; padding-bottom: 10px; margin-bottom: 14px;
    border-bottom: 1px dashed #CFD7D0;
  }
  .brand { display: flex; flex-direction: column; gap: 2px; }
  .brand-tag {
    font-size: 10px; color: #374850;
    text-transform: uppercase; letter-spacing: 0.06em;
  }
  nav { display: flex; gap: 10px; align-items: center; }
  nav a {
    font-size: 13px; color: #1B5E20; text-decoration: none;
    border-bottom: 1px dashed #2E7D32;
  }
  nav a:hover { color: #D4AF37; border-bottom-color: #D4AF37; }
  .reset-btn {
    font-size: 12px; padding: 4px 10px;
    background: #374850; color: white; border: none;
    border-radius: 3px; cursor: pointer; font-weight: 600;
    font-family: inherit;
  }
  .reset-btn:hover { background: #14181C; }
  footer {
    margin-top: 24px; padding-top: 12px;
    border-top: 1px solid #CFD7D0;
    font-size: 12px; color: #374850;
  }
  code { background: #FAF5E6; padding: 1px 5px; border-radius: 2px; font-size: 11px; }
</style>
