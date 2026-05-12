<!--
  StageNav — 4-stage stepper. Sits under JobHeader.
  Current stage reads/writes store.intake.stage. Clicking any step
  jumps directly — the stages are linear but not gated at the UI level.
-->
<script lang="ts">
  import { store } from '@/store/intakeStore.svelte';
  import type { StageName } from '@models/intake';

  interface StepDef {
    key: StageName;
    n: number;
    title: string;
    sub: string;
  }

  const steps: readonly StepDef[] = [
    { key: 'intake',       n: 1, title: 'Intake',       sub: 'files · extraction · crosswalk' },
    { key: 'products',     n: 2, title: 'Catalog',      sub: 'line items · scope · labor'     },
    { key: 'review-lines', n: 3, title: 'Review',       sub: 'docs · open items · supplements' },
    { key: 'final',        n: 4, title: 'Proposal',     sub: 'pricing · risk · deliverables'  }
  ];

  function go(s: StageName) {
    store.setStage(s);
  }

  let active = $derived(store.intake.stage);
</script>

<nav class="stage-nav" aria-label="Workflow stages">
  {#each steps as s, i (s.key)}
    <button
      type="button"
      class="stage-step"
      class:is-active={active === s.key}
      class:is-done={steps.findIndex(x => x.key === active) > i}
      onclick={() => go(s.key)}
      aria-current={active === s.key ? 'step' : undefined}
    >
      <span class="stage-n">{s.n}</span>
      <span class="stage-body">
        <span class="stage-title">{s.title}</span>
        <span class="stage-sub">{s.sub}</span>
      </span>
    </button>
    {#if i < steps.length - 1}
      <span class="stage-sep" aria-hidden="true"></span>
    {/if}
  {/each}
</nav>

<style>
  .stage-nav {
    display: flex;
    align-items: stretch;
    gap: 0;
    padding: 6px clamp(10px, 2vw, 24px);
    background: #F1F8F1;
    border-bottom: 1px solid #CFD7D0;
    position: sticky;
    top: 0;
    z-index: 50;
  }
  .stage-step {
    display: flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    padding: 6px 10px;
    cursor: pointer;
    font-family: inherit;
    color: #374850;
    text-align: left;
    min-width: 0;
  }
  .stage-step:hover { background: rgba(27,94,32,0.08); color: #1B5E20; }
  .stage-step.is-active {
    background: white;
    border-color: #2E7D32;
    box-shadow: 0 1px 3px rgba(27,94,32,0.18);
    color: #1B5E20;
  }
  .stage-step.is-done .stage-n {
    background: #2E7D32;
    color: white;
  }
  .stage-n {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #CFD7D0;
    color: #14181C;
    font-size: 11px;
    font-weight: 800;
    flex: 0 0 auto;
  }
  .stage-step.is-active .stage-n {
    background: #D4AF37;
    color: #14181C;
  }
  .stage-body { display: flex; flex-direction: column; min-width: 0; line-height: 1.1; }
  .stage-title {
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .stage-sub {
    font-size: 10px;
    color: #6A726E;
    font-style: italic;
  }
  .stage-sep {
    flex: 0 0 18px;
    align-self: center;
    height: 1px;
    background: #CFD7D0;
    margin: 0 4px;
  }
  @media (max-width: 800px) {
    .stage-sub { display: none; }
    .stage-sep { flex-basis: 10px; }
  }
</style>
