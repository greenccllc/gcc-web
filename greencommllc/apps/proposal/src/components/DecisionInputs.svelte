<!--
  DecisionInputs — Stage 4 center-bottom.
  8 fields (5 selects + 3 numbers) that drive the pricing-strategy
  recommendation via computeDecisionScore().
-->
<script lang="ts">
  import type { DecisionInputs } from '@models/pricing';

  interface Props {
    value: DecisionInputs;
    onChange?: () => void;
  }
  let { value = $bindable(), onChange }: Props = $props();

  function touch() { onChange?.(); }
</script>

<div class="di-grid">
  <label class="di-input">
    <span class="di-input-k">Client value</span>
    <select bind:value={value.clientStrategicValue} onchange={touch}>
      <option value="new">New logo</option>
      <option value="grow">Growth account</option>
      <option value="keep">Maintenance</option>
      <option value="farewell">Low-fit / farewell</option>
    </select>
  </label>
  <label class="di-input">
    <span class="di-input-k">Pipeline strength</span>
    <select bind:value={value.pipelineStrength} onchange={touch}>
      <option value="weak">Weak</option>
      <option value="balanced">Balanced</option>
      <option value="strong">Strong</option>
    </select>
  </label>
  <label class="di-input">
    <span class="di-input-k">Schedule risk</span>
    <select bind:value={value.scheduleRisk} onchange={touch}>
      <option value="low">Low</option>
      <option value="med">Medium</option>
      <option value="high">High</option>
    </select>
  </label>
  <label class="di-input">
    <span class="di-input-k">Cash urgency</span>
    <select bind:value={value.cashUrgency} onchange={touch}>
      <option value="normal">Normal</option>
      <option value="urgent">Urgent</option>
      <option value="critical">Critical</option>
    </select>
  </label>
  <label class="di-input">
    <span class="di-input-k">Scope clarity</span>
    <select bind:value={value.scopeClarity} onchange={touch}>
      <option value="clear">Clear</option>
      <option value="some-gaps">Some gaps</option>
      <option value="vague">Vague / squishy</option>
    </select>
  </label>
  <label class="di-input">
    <span class="di-input-k">Competitive bidders</span>
    <input type="number" min="0" max="20" step="1" bind:value={value.competitiveBidders} oninput={touch} />
  </label>
  <label class="di-input">
    <span class="di-input-k">Team utilization (%)</span>
    <input type="number" min="0" max="100" step="5" bind:value={value.teamUtilization} oninput={touch} />
  </label>
  <label class="di-input">
    <span class="di-input-k">Margin floor (%)</span>
    <input type="number" min="0" max="60" step="1" bind:value={value.marginTarget} oninput={touch} />
  </label>
</div>

<style>
  .di-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; margin-bottom: 10px; }
  .di-input { display: grid; grid-template-columns: 1fr auto; gap: 6px; align-items: center; font-size: 12px; }
  .di-input-k { color: #374850; }
  .di-input select, .di-input input[type="number"] {
    min-width: 110px; font-weight: 700; padding: 3px 6px;
    border: 1px solid #CFD7D0; border-radius: 3px;
    font-size: 12px; font-variant-numeric: tabular-nums;
    font-family: inherit;
  }
  .di-input select { text-align-last: right; }
</style>
