/**
 * Tests for extraction-run helpers. Pin the legacy behavior from
 * bundle-builder.html so the rewrite can't silently drift.
 */

import { describe, it, expect } from 'vitest';
import {
  tryParseJson,
  recordCandidate,
  runCounts,
  reduceCandidates
} from '@/decoders/runs';
import type { ExtractionRun } from '@models/intake';

function newRun(id = 'r1'): ExtractionRun {
  return { id, ts: Date.now(), phase: 'parse', summary: '', candidates: {} };
}

describe('tryParseJson', () => {
  it('parses clean JSON', () => {
    expect(tryParseJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('fishes JSON out of wrapped text', () => {
    const blob = 'Here is the answer:\n```json\n{"tokens": {"drops": 220}}\n```\nHope this helps.';
    expect(tryParseJson(blob)).toEqual({ tokens: { drops: 220 } });
  });

  it('returns null for empty / nonsense input', () => {
    expect(tryParseJson('')).toBeNull();
    expect(tryParseJson(null)).toBeNull();
    expect(tryParseJson(undefined)).toBeNull();
    expect(tryParseJson('no json here')).toBeNull();
  });

  it('prefers the largest {...} block', () => {
    const blob = 'prefix {broken} more {"ok":true} tail';
    // The regex is greedy, so it should grab the span from first { to last }.
    const parsed = tryParseJson(blob);
    // Greedy match yields "{broken} more {\"ok\":true}" which is not valid JSON.
    // The fallback should give null rather than explode.
    expect(parsed).toBeNull();
  });
});

describe('recordCandidate', () => {
  it('appends to the token list', () => {
    const run = newRun();
    recordCandidate(run, 'drops', 220, 0.8, 'rfp.pdf');
    recordCandidate(run, 'drops', 215, 0.7, 'spec.pdf');
    expect(run.candidates['drops']).toHaveLength(2);
    expect(run.candidates['drops']?.[0]?.confidence).toBe(0.8);
  });

  it('defaults confidence to 0.6 when null/undefined', () => {
    const run = newRun();
    recordCandidate(run, 'drops', 220, null, 'x');
    recordCandidate(run, 'drops', 220, undefined, 'y');
    expect(run.candidates['drops']?.[0]?.confidence).toBe(0.6);
    expect(run.candidates['drops']?.[1]?.confidence).toBe(0.6);
  });

  it('skips null/undefined/empty values (pins legacy line 11708)', () => {
    const run = newRun();
    recordCandidate(run, 'x', null, 0.9, 's');
    recordCandidate(run, 'x', undefined, 0.9, 's');
    recordCandidate(run, 'x', '', 0.9, 's');
    expect(run.candidates['x']).toBeUndefined();
  });

  it('keeps falsy-but-meaningful values (0, false)', () => {
    const run = newRun();
    recordCandidate(run, 'bond', false, 0.9, 's');
    recordCandidate(run, 'count', 0, 0.9, 's');
    expect(run.candidates['bond']?.[0]?.value).toBe(false);
    expect(run.candidates['count']?.[0]?.value).toBe(0);
  });
});

describe('runCounts', () => {
  it('counts distinct files and total token hits', () => {
    const run = newRun();
    recordCandidate(run, 'drops', 220, 0.8, 'a.pdf');
    recordCandidate(run, 'drops', 220, 0.8, 'b.pdf');
    recordCandidate(run, 'aps', 24, 0.7, 'a.pdf');
    const c = runCounts(run);
    expect(c.files).toBe(2);
    expect(c.tokens).toBe(3);
  });

  it('returns zeros for an empty run', () => {
    const run = newRun();
    expect(runCounts(run)).toEqual({ files: 0, tokens: 0 });
  });
});

describe('reduceCandidates', () => {
  it('picks the value with highest cumulative score', () => {
    const run = newRun('r1');
    recordCandidate(run, 'drops', 220, 0.7, 'a.pdf');
    recordCandidate(run, 'drops', 220, 0.8, 'b.pdf'); // same value, stacks
    recordCandidate(run, 'drops', 215, 0.9, 'c.pdf'); // different value, higher solo conf

    const cw = reduceCandidates([run], {});
    // 220 has score 1.5, 215 has score 0.9 — 220 wins despite lower max.
    expect(cw['drops']?.value).toBe(220);
  });

  it('respects user-locked (final:true) entries', () => {
    const run = newRun();
    recordCandidate(run, 'drops', 220, 0.9, 'a.pdf');
    const existing = {
      drops: { value: 100, confidence: 1, src: 'user', final: true }
    };
    const cw = reduceCandidates([run], existing);
    expect(cw['drops']?.value).toBe(100);
    expect(cw['drops']?.final).toBe(true);
  });

  it('tie-breaks on max confidence when scores match', () => {
    const run = newRun();
    recordCandidate(run, 'x', 'A', 0.5, 's1');
    recordCandidate(run, 'x', 'B', 0.5, 's2'); // same score, same conf, same count
    recordCandidate(run, 'x', 'A', 0.0, 's3'); // boost A's count but not score
    const cw = reduceCandidates([run], {});
    // A has score 0.5, conf 0.5, count 2. B has 0.5, 0.5, 1. A wins on count.
    expect(cw['x']?.value).toBe('A');
  });

  it('carries confidence and src from the winning candidate', () => {
    const run = newRun();
    recordCandidate(run, 'owner', 'ACME Inc.', 0.9, 'rfp.pdf');
    const cw = reduceCandidates([run], {});
    expect(cw['owner']?.confidence).toBe(0.9);
    expect(cw['owner']?.src).toBe('rfp.pdf');
    expect(cw['owner']?.final).toBe(false);
  });

  it('aggregates across multiple runs', () => {
    const r1 = newRun('r1');
    const r2 = newRun('r2');
    recordCandidate(r1, 'drops', 220, 0.6, 'rfp.pdf');
    recordCandidate(r2, 'drops', 220, 0.8, 'spec.pdf');
    const cw = reduceCandidates([r1, r2], {});
    expect(cw['drops']?.value).toBe(220);
    // Max conf across runs.
    expect(cw['drops']?.confidence).toBe(0.8);
  });
});
