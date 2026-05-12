/**
 * Tests for the Decision-Score engine.
 *
 * This is the first unit test in the TS migration — every rule in
 * _computeDecisionScore() gets a named test so future refactors stay
 * pinned to the legacy behavior.
 */

import { describe, it, expect } from 'vitest';
import {
  computeDecisionScore,
  defaultDecisionInputs
} from '@/pricing/decisionScore';
import type { DecisionInputs } from '@models/pricing';

const deps = { baseSellTotal: 100_000, baseCost: 60_000 };

describe('computeDecisionScore', () => {
  it('returns a balanced recommendation for the default inputs', () => {
    const r = computeDecisionScore(defaultDecisionInputs(), deps);
    expect(r.reco).toBe('balanced');
    expect(r.score).toBeGreaterThanOrEqual(35);
    expect(r.score).toBeLessThanOrEqual(65);
  });

  it('recommends Aggressive when the position is somewhat weak', () => {
    const inp: DecisionInputs = {
      ...defaultDecisionInputs(),
      clientStrategicValue: 'grow',
      pipelineStrength:     'balanced',
      competitiveBidders:   3,
      cashUrgency:          'normal',
      teamUtilization:      50
    };
    const r = computeDecisionScore(inp, deps);
    // Aggressive band is (15..35]
    expect(r.reco).toBe('aggressive');
    expect(r.score).toBeGreaterThan(15);
    expect(r.score).toBeLessThanOrEqual(35);
  });

  it('recommends Floor when the position is untenable (walk-away zone)', () => {
    const inp: DecisionInputs = {
      ...defaultDecisionInputs(),
      clientStrategicValue: 'new',
      pipelineStrength:     'weak',
      competitiveBidders:   20,
      cashUrgency:          'critical',
      teamUtilization:      20,
      scheduleRisk:         'low'
    };
    const r = computeDecisionScore(inp, deps);
    expect(r.reco).toBe('floor');
    expect(r.score).toBeLessThanOrEqual(15);
  });

  it('recommends Conservative when the position is strong', () => {
    const inp: DecisionInputs = {
      ...defaultDecisionInputs(),
      clientStrategicValue: 'farewell',
      pipelineStrength:     'balanced',
      competitiveBidders:   0,          // sole source
      scopeClarity:         'clear',
      teamUtilization:      70,
      scheduleRisk:         'low',
      cashUrgency:          'normal'
    };
    const r = computeDecisionScore(inp, deps);
    // Score should land in (65..82]
    expect(r.reco).toBe('conservative');
    expect(r.score).toBeGreaterThan(65);
    expect(r.score).toBeLessThanOrEqual(82);
  });

  it('recommends Premium when the position is a stretch-win anchor', () => {
    const inp: DecisionInputs = {
      ...defaultDecisionInputs(),
      clientStrategicValue: 'farewell',
      pipelineStrength:     'strong',
      competitiveBidders:   0,
      scopeClarity:         'vague',
      teamUtilization:      95,
      scheduleRisk:         'high'
    };
    const r = computeDecisionScore(inp, deps);
    expect(r.reco).toBe('premium');
    expect(r.score).toBeGreaterThan(82);
  });

  it('computes break-even from cost basis and margin target', () => {
    const inp = { ...defaultDecisionInputs(), marginTarget: 25 };
    const r = computeDecisionScore(inp, { baseSellTotal: 0, baseCost: 75_000 });
    // Break-even = cost / (1 - 0.25) = 75000 / 0.75 = 100000
    expect(r.breakEven).toBeCloseTo(100_000, 2);
    expect(r.marginTargetPct).toBeCloseTo(0.25);
  });

  it('falls back to cost when margin target is absurd (>=99%)', () => {
    const inp = { ...defaultDecisionInputs(), marginTarget: 99.5 };
    const r = computeDecisionScore(inp, { baseSellTotal: 0, baseCost: 50_000 });
    expect(r.breakEven).toBe(50_000);
  });

  it('clamps the score to [0, 100]', () => {
    const weakest: DecisionInputs = {
      clientStrategicValue: 'new',
      pipelineStrength:     'weak',
      competitiveBidders:   20,
      scheduleRisk:         'low',
      teamUtilization:      0,
      cashUrgency:          'critical',
      scopeClarity:         'clear',
      marginTarget:         22,
      scoreSnapshot:        null
    };
    const r = computeDecisionScore(weakest, deps);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});
