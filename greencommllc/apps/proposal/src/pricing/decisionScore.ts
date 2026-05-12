/**
 * Decision-Score engine.
 *
 * Pure function. Takes the estimator's Decision Inputs and returns a
 * 0..100 score plus a recommended Pricing Strategy tier.
 *
 * Score bands:
 *   < 35  → Aggressive   (weak position, need to win the bid)
 *   35..65 → Balanced     (typical posture)
 *   > 65  → Conservative (strong position, pad for risk)
 *
 * Ported verbatim from `_computeDecisionScore()` in bundle-builder.html.
 * Kept pure so it can be unit-tested without a DOM.
 */

import type {
  DecisionInputs,
  DecisionResult,
  PricingStrategyKey
} from '@models/pricing';

const WEIGHT_CLIENT: Record<DecisionInputs['clientStrategicValue'], number> = {
  farewell: +15,
  keep:     +5,
  grow:     -5,
  new:      -10
};

const WEIGHT_PIPELINE: Record<DecisionInputs['pipelineStrength'], number> = {
  strong:   +15,
  balanced: 0,
  weak:     -15
};

const WEIGHT_SCHED: Record<DecisionInputs['scheduleRisk'], number> = {
  low:  -3,
  med:  +5,
  high: +12
};

const WEIGHT_CASH: Record<DecisionInputs['cashUrgency'], number> = {
  normal:   0,
  urgent:   -8,
  critical: -16
};

const WEIGHT_SCOPE: Record<DecisionInputs['scopeClarity'], number> = {
  clear:       -3,
  'some-gaps': +5,
  vague:       +15
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function recommendationFor(score: number): PricingStrategyKey {
  // Five-band recommendation aligned to the five pricing tiers.
  //   0..15   - Floor       (walk-away; position is untenable)
  //   16..35  - Aggressive  (weak - need to win)
  //   36..65  - Balanced    (typical stance)
  //   66..82  - Conservative (strong - pad for risk)
  //   83..100 - Premium     (anchor high - stretch-win)
  if (score <= 15) return 'floor';
  if (score <= 35) return 'aggressive';
  if (score <= 65) return 'balanced';
  if (score <= 82) return 'conservative';
  return 'premium';
}

export interface DecisionScoreDeps {
  /** Current base sell total from `computeTotals().grand`. */
  baseSellTotal: number;
  /** Current base cost (sum of qty × costEach across line items). */
  baseCost: number;
}

/**
 * Compute the decision score and recommendation for the given inputs.
 * @returns {@link DecisionResult}
 */
export function computeDecisionScore(
  inputs: DecisionInputs,
  deps: DecisionScoreDeps
): DecisionResult {
  let s = 50;

  s += WEIGHT_CLIENT[inputs.clientStrategicValue] ?? 0;
  s += WEIGHT_PIPELINE[inputs.pipelineStrength] ?? 0;

  // Competitive bidders: sole-source = huge leverage; crowded = none.
  const b = Math.max(0, inputs.competitiveBidders);
  s += (b === 0 ? +15 : (b <= 2 ? +5 : (b <= 4 ? -5 : -15)));

  s += WEIGHT_SCHED[inputs.scheduleRisk] ?? 0;

  // Team utilization: >=85% = can afford to lose; <60% = need to win.
  const u = clamp(inputs.teamUtilization, 0, 100);
  s += u >= 85 ? +12 : (u >= 60 ? +3 : -10);

  s += WEIGHT_CASH[inputs.cashUrgency] ?? 0;
  s += WEIGHT_SCOPE[inputs.scopeClarity] ?? 0;

  const score = clamp(Math.round(s), 0, 100);
  const reco  = recommendationFor(score);

  // Break-even at margin floor. If floor is absurd (>=100%), fall back to cost.
  const marginTargetPct = clamp(inputs.marginTarget, 0, 100) / 100;
  const breakEven = marginTargetPct >= 0.99
    ? deps.baseCost
    : deps.baseCost / (1 - marginTargetPct);

  return {
    score,
    reco,
    base: deps.baseSellTotal,
    cost: deps.baseCost,
    breakEven,
    marginTargetPct
  };
}

/** Default inputs used when the Stage-4 renderer first initializes. */
export function defaultDecisionInputs(): DecisionInputs {
  return {
    clientStrategicValue: 'grow',
    pipelineStrength:     'balanced',
    competitiveBidders:   3,
    scheduleRisk:         'low',
    teamUtilization:      70,
    cashUrgency:          'normal',
    scopeClarity:         'clear',
    marginTarget:         22,
    scoreSnapshot:        null
  };
}
