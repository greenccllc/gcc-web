/**
 * Default 5-tier pricing ladder — seeded from the base sell total.
 *
 * Each tier has a relative multiplier and a subjective win-probability.
 * `floor` computes off baseCost + the estimator's margin floor, not the
 * base sell, so it stays honest as a walk-away line.
 */

import type { PricingTiers, PricingStrategyKey, PricingTier } from '@models/pricing';

const MULT: Record<Exclude<PricingStrategyKey, 'floor'>, number> = {
  aggressive:   0.92,
  balanced:     1.00,
  conservative: 1.10,
  premium:      1.22
};

/** Break-even at the margin-floor percentage. */
function floorPrice(baseCost: number, marginFloorPct: number): number {
  const pct = Math.max(0, Math.min(99, marginFloorPct)) / 100;
  if (pct >= 0.99) return Math.round(baseCost);
  return Math.round(baseCost / (1 - pct));
}

export function tierDefault(key: PricingStrategyKey, base: number, baseCost = 0, marginFloor = 22): number {
  if (key === 'floor') return floorPrice(baseCost, marginFloor);
  return Math.round(base * MULT[key]);
}

const TIER_META: Record<PricingStrategyKey, { label: string; winProb: number; note: string }> = {
  floor: {
    label:   'Floor',
    winProb: 85,
    note:    'Break-even + your margin floor. Walk-away line \u2014 never actually submit this.'
  },
  aggressive: {
    label:   'Aggressive',
    winProb: 70,
    note:    'Win-price, thin margin. Submit when pipeline is weak or client is strategic.'
  },
  balanced: {
    label:   'Balanced',
    winProb: 45,
    note:    'Target margin. Priced honestly to the takeoff. Default stance.'
  },
  conservative: {
    label:   'Conservative',
    winProb: 25,
    note:    'Padded for risk. Use when scope is vague, schedule is messy, or client is new.'
  },
  premium: {
    label:   'Premium',
    winProb: 12,
    note:    'High anchor. Submit when competition is crowded or this is a stretch-win.'
  }
};

export function defaultPricingTiers(base: number, baseCost = 0, marginFloor = 22): PricingTiers {
  const mk = (k: PricingStrategyKey): PricingTier => ({
    label:   TIER_META[k].label,
    price:   tierDefault(k, base, baseCost, marginFloor),
    winProb: TIER_META[k].winProb,
    note:    TIER_META[k].note
  });
  return {
    floor:        mk('floor'),
    aggressive:   mk('aggressive'),
    balanced:     mk('balanced'),
    conservative: mk('conservative'),
    premium:      mk('premium'),
    chosenKey:    'balanced',
    baseSnapshot: base
  };
}
