/**
 * Pricing Strategy (Stage 4) — estimator-facing tiers.
 * NOT shown to the customer. These are Kaitlyn's levers for deciding how
 * aggressive to be with this bid.
 *
 * Five-tier ladder (legacy 3-tier is auto-migrated):
 *   floor        - break-even + margin floor; walk-away line
 *   aggressive   - win-price, thin margin
 *   balanced     - target margin (the baseline)
 *   conservative - padded for risk
 *   premium      - high anchor, stretch-win
 */

export type PricingStrategyKey =
  | 'floor'
  | 'aggressive'
  | 'balanced'
  | 'conservative'
  | 'premium';

export const TIER_KEYS: readonly PricingStrategyKey[] = [
  'floor',
  'aggressive',
  'balanced',
  'conservative',
  'premium'
] as const;

export interface PricingTier {
  label: string;
  price: number;
  /** Subjective win-probability at this price. Heuristic, not fit. */
  winProb: number;
  /** Rationale shown on the card + in the Finance Summary export. */
  note: string;
}

export interface PricingTiers {
  floor: PricingTier;
  aggressive: PricingTier;
  balanced: PricingTier;
  conservative: PricingTier;
  premium: PricingTier;
  /** Which tier the estimator chose for this bid. */
  chosenKey: PricingStrategyKey;
  /** Base sell total at the moment tiers were seeded. Used for drift detection. */
  baseSnapshot: number;
}

/**
 * Decision Inputs — what drives the estimator's tier choice. Weighted into
 * a score (0..100) which recommends a tier.
 */
export type ClientStrategicValue = 'new' | 'grow' | 'keep' | 'farewell';
export type PipelineStrength     = 'weak' | 'balanced' | 'strong';
export type ScheduleRisk         = 'low'  | 'med' | 'high';
export type CashUrgency          = 'normal' | 'urgent' | 'critical';
export type ScopeClarity         = 'clear' | 'some-gaps' | 'vague';

export interface DecisionInputs {
  clientStrategicValue: ClientStrategicValue;
  pipelineStrength: PipelineStrength;
  /** 0 = sole source, higher = more bidders. */
  competitiveBidders: number;
  scheduleRisk: ScheduleRisk;
  /** % booked in the next 60 days. 0..100. */
  teamUtilization: number;
  cashUrgency: CashUrgency;
  scopeClarity: ScopeClarity;
  /** Margin floor below which GCC will walk. 0..100. */
  marginTarget: number;
  /** Last computed score 0..100. Recomputed on every change. */
  scoreSnapshot: number | null;
}

export interface DecisionResult {
  /** Weighted score 0..100. Higher = more leverage → Conservative. */
  score: number;
  /** Recommended tier based on the score bands. */
  reco: PricingStrategyKey;
  /** Base sell total (from line items). */
  base: number;
  /** Base cost (what GCC pays). */
  cost: number;
  /** Price at which we hit the margin floor. Below this we lose money. */
  breakEven: number;
  /** Margin floor as a fraction (e.g. 0.22 for 22%). */
  marginTargetPct: number;
}
