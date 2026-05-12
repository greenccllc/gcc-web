/**
 * Token crosswalk — the core data model. Every piece of extracted /
 * confirmed intake data lands here, keyed by a token name defined in
 * TOKEN_DEFS. Values carry confidence, source, and a final/edited flag.
 */

export type CrosswalkValue = string | number | string[] | boolean | null;

export interface CrosswalkEntry {
  value: CrosswalkValue;
  /** 0..1 — estimator confidence in this value. 1.0 = confirmed by human. */
  confidence: number;
  /** Which document / run / user action produced this value. */
  src: string;
  /** True when a human has accepted or edited the value. Protects from overwrite. */
  final: boolean;
  /** Short reason string for low-confidence or derived values. */
  reason?: string;
}

export type Crosswalk = Record<string, CrosswalkEntry>;

/** Category groupings that drive "required-for-phase" gating. */
export type TokenCategory =
  | 'Identity'
  | 'Parties'
  | 'Dates'
  | 'GCC Project'
  | 'GCC Drop Counts'
  | 'GCC Infrastructure'
  | 'GCC Commercial'
  | 'GC Pricing'
  | 'Owner Pricing'
  | 'Scope';

export interface TokenDef {
  token: string;
  category: TokenCategory;
  label: string;
  type: 'text' | 'number' | 'date' | 'list' | 'bool';
  /** Optional validator — returns error string when the value is invalid. */
  validate?: (v: CrosswalkValue) => string | null;
}

/**
 * Which token categories are required BEFORE each downstream phase can proceed.
 * Mirrors `PHASE_REQUIRED_CATS` from the legacy single-file app.
 * @see bundle-builder.html ~line 12480
 */
export const PHASE_REQUIRED_CATS: Record<number, readonly TokenCategory[]> = {
  0: ['Identity', 'Parties', 'Dates'],
  1: ['Identity', 'Parties', 'Dates', 'GCC Project'],
  2: ['Identity', 'Parties', 'Dates', 'GCC Project', 'GCC Drop Counts', 'GCC Infrastructure'],
  3: ['Identity', 'Parties', 'Dates', 'GCC Project', 'GCC Drop Counts', 'GCC Infrastructure', 'GCC Commercial', 'GC Pricing'],
  4: ['Identity', 'Parties', 'Dates', 'GCC Project', 'GCC Drop Counts', 'GCC Infrastructure', 'GCC Commercial', 'GC Pricing', 'Owner Pricing', 'Scope']
} as const;
