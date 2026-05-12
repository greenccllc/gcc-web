/**
 * Pure helpers for the Stage-1 extraction pipeline.
 *
 * The legacy app's four run-phases (parse/dict/conf/synth) are wrappers
 * around Claude API calls — they can't be ported 1:1 until a backend
 * ships. What IS portable today is the data-manipulation layer:
 * candidate recording, run counting, merging.
 *
 * Legacy source (bundle-builder.html):
 *   - tryParseJson      → line 12825
 *   - recordCandidate   → line 11707
 *   - runCounts         → line 11551
 *   - mergeCrosswalk    → line 11713 (reducer portion only; rendering split out)
 */

import type { Crosswalk, CrosswalkValue } from '@models/crosswalk';
import type { ExtractionRun } from '@models/intake';

/** A candidate is a single {value, confidence, src} proposed for a token. */
export interface Candidate {
  value: unknown;
  confidence: number;
  src: string;
}

/**
 * Try to parse JSON from model output. Handles direct parses and
 * fishes out the largest {...} block as a fallback.
 */
export function tryParseJson(text: string | null | undefined): unknown {
  if (!text) return null;
  try { return JSON.parse(text); } catch (_) { /* fall through */ }
  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    try { return JSON.parse(m[0]); } catch (_) { /* fall through */ }
  }
  return null;
}

/**
 * Append a candidate to a run in-place. Skips null/undefined/empty values.
 * Mirrors legacy bundle-builder.html line 11707 — same default conf (0.6).
 */
export function recordCandidate(
  run: ExtractionRun,
  token: string,
  value: unknown,
  confidence: number | null | undefined,
  src: string
): void {
  if (value === null || value === undefined || value === '') return;
  const list = run.candidates[token] ?? (run.candidates[token] = []);
  list.push({ value, confidence: confidence == null ? 0.6 : confidence, src });
}

/**
 * Count distinct source-files and total token hits in a run. Mirrors the
 * legacy `runCounts()` helper — used in the run-tab summary text.
 */
export function runCounts(run: ExtractionRun): { files: number; tokens: number } {
  const files = new Set<string>();
  let tokens = 0;
  for (const tok of Object.keys(run.candidates)) {
    for (const c of run.candidates[tok] ?? []) {
      files.add(c.src);
      tokens++;
    }
  }
  return { files: files.size, tokens };
}

/**
 * Reduce all candidates across all runs into a best-supported crosswalk.
 * Preserves any token marked `final: true` (user-locked).
 *
 * Ranking per legacy line 11735:
 *   score desc → conf desc → count desc
 * where score = sum of confidences for identical values.
 */
export function reduceCandidates(
  runs: readonly ExtractionRun[],
  existing: Crosswalk
): Crosswalk {
  // First, tally all candidates by token.
  const tally: Record<string, Candidate[]> = {};
  for (const run of runs) {
    for (const tok of Object.keys(run.candidates)) {
      const list = tally[tok] ?? (tally[tok] = []);
      for (const c of run.candidates[tok] ?? []) list.push(c);
    }
  }

  const out: Crosswalk = { ...existing };
  for (const tok of Object.keys(tally)) {
    const priorEntry = out[tok];
    if (priorEntry && priorEntry.final) continue; // respect user-locked

    // Group identical values — String() so numeric + string equal-by-value collapse.
    const groups = new Map<string, { value: unknown; score: number; conf: number; count: number; src: string }>();
    for (const c of tally[tok] ?? []) {
      const key = String(c.value);
      const g = groups.get(key) ?? { value: c.value, score: 0, conf: 0, count: 0, src: c.src };
      g.count += 1;
      g.conf = Math.max(g.conf, c.confidence);
      g.score += c.confidence;
      groups.set(key, g);
    }

    const ranked = [...groups.values()].sort(
      (a, b) => (b.score - a.score) || (b.conf - a.conf) || (b.count - a.count)
    );
    const winner = ranked[0];
    if (!winner) continue;
    out[tok] = {
      value: winner.value as CrosswalkValue,
      confidence: winner.conf,
      src: winner.src,
      final: false
    };
  }
  return out;
}
