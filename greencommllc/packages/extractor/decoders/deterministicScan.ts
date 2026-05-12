/**
 * Deterministic (regex-based) token scanner. Runs over texty source
 * files and produces Candidates without needing an LLM.
 *
 * This is a pragmatic complement to the legacy parse-phase, which is
 * Claude-API-driven. Until a backend ships, the TS app can still
 * extract real value from RFPs / spec PDFs by spotting obvious
 * count-patterns like "220 data drops", "24 cameras", "fiber bundle
 * of 48 strands".
 *
 * Returns Candidates rather than writing to the crosswalk directly so
 * the caller can pipe them into a run and use the same merge/reduce
 * path as any other phase.
 */

import type { Candidate } from './runs';

/** One pattern → token binding. */
interface ScanRule {
  token: string;
  /**
   * Regex with one capture group that returns a numeric value. Pair
   * with a unit label so false-positives (e.g. "12 kids") can't hit.
   */
  re: RegExp;
  /** Base confidence for any hit from this rule (0..1). */
  confidence: number;
  /** Optional post-processing: transform the captured number. */
  transform?: (n: number) => number;
}

/** Snapshot of the counts we can detect without domain-specific lexing. */
export const DETERMINISTIC_RULES: readonly ScanRule[] = [
  // Drop counts — "220 drops", "220 data drops", "220 Cat6 drops"
  {
    token: 'data_drops_count',
    re: /\b(\d{1,4})\s+(?:cat\s?[56][ae]?\s+)?(?:data\s+)?drops?\b/gi,
    confidence: 0.72
  },
  // AP / WAP counts — "24 wireless access points", "24 APs", "24 WAPs"
  {
    token: 'ap_count',
    re: /\b(\d{1,3})\s+(?:wireless\s+)?(?:access\s+points?|a\.?p\.?s?|w\.?a\.?p\.?s?)\b/gi,
    confidence: 0.70
  },
  // Cameras — "24 cameras", "24 IP cameras", "24 surveillance cameras"
  {
    token: 'camera_count_commercial',
    re: /\b(\d{1,4})\s+(?:ip\s+|surveillance\s+|security\s+|network\s+)?cameras?\b/gi,
    confidence: 0.68
  },
  // Doors — "12 card readers", "12 access-controlled doors", "12 door positions"
  {
    token: 'door_positions_count',
    re: /\b(\d{1,3})\s+(?:card\s+readers?|access[-\s]controlled\s+doors?|door\s+positions?)\b/gi,
    confidence: 0.70
  },
  // Fiber strands — "48 strands", "48-strand", "48 strand bundle"
  {
    token: 'fiber_strands_count',
    re: /\b(\d{1,4})[-\s]strands?\b|\b(\d{1,4})\s+strand\s+(?:bundle|cable|trunk)?/gi,
    confidence: 0.72
  },
  // Racks — "4 racks", "4 server racks", "4 network racks"
  {
    token: 'rack_count',
    re: /\b(\d{1,2})\s+(?:network\s+|server\s+|equipment\s+|data\s+)?racks?\b/gi,
    confidence: 0.65
  }
] as const;

/** Match metadata returned per hit — useful for evidence trails. */
export interface ScanHit {
  token: string;
  value: number;
  confidence: number;
  /** Matched substring, including a short context window. */
  evidence: string;
}

/**
 * Run every rule against a single blob of text. Returns raw hits —
 * caller is responsible for deduping / summing across files.
 */
export function scanText(text: string): ScanHit[] {
  if (!text) return [];
  const hits: ScanHit[] = [];
  for (const rule of DETERMINISTIC_RULES) {
    // Reset lastIndex — the global regex is shared across calls.
    rule.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.re.exec(text)) !== null) {
      // Capture group may be group 1 or 2 depending on rule (fiber has alternation).
      const captured = m[1] ?? m[2];
      if (!captured) continue;
      const raw = parseInt(captured, 10);
      if (!Number.isFinite(raw)) continue;
      const value = rule.transform ? rule.transform(raw) : raw;
      const start = Math.max(0, m.index - 24);
      const end = Math.min(text.length, m.index + m[0].length + 24);
      hits.push({
        token: rule.token,
        value,
        confidence: rule.confidence,
        evidence: text.slice(start, end).replace(/\s+/g, ' ').trim()
      });
    }
  }
  return hits;
}

/**
 * Collapse multiple hits per token into a single best candidate per file.
 * Strategy: pick the MAX numeric value per token (a "48 strands" mention
 * overrides a spurious "4 strands" in a footer). This mirrors the way a
 * human reviewer treats spec documents — the biggest number is usually
 * the authoritative total.
 */
export function hitsToCandidates(hits: readonly ScanHit[], src: string): Record<string, Candidate> {
  const best: Record<string, ScanHit> = {};
  for (const h of hits) {
    const cur = best[h.token];
    if (!cur || h.value > cur.value) best[h.token] = h;
  }
  const out: Record<string, Candidate> = {};
  for (const [tok, h] of Object.entries(best)) {
    out[tok] = {
      value: h.value,
      confidence: h.confidence,
      src: `${src}: "${h.evidence}"`
    };
  }
  return out;
}

/** Convenience wrapper: scan a text blob, return ready-to-record candidates. */
export function scanTextForCandidates(text: string, src: string): Record<string, Candidate> {
  return hitsToCandidates(scanText(text), src);
}
