/**
 * Top-level intake state — the single source of truth for the whole app.
 * Mirrors the legacy `intake` global in bundle-builder.html, but every
 * field is typed and every sub-model lives in its own module.
 */

import type { Crosswalk } from './crosswalk';
import type { LineItem } from './lineItem';
import type { PricingTiers, DecisionInputs } from './pricing';
import type { RedFlag } from './risk';
import type { Customization } from './customization';
import type { AltDeductsState } from './altDeducts';

export type StageName = 'intake' | 'products' | 'review-lines' | 'final';

/** Phase of the extraction pipeline (within Stage 1). */
export type ExtractionPhaseName = 'parse' | 'dict' | 'conf' | 'synth';

/** Narrow set of classifier outputs. Legacy uses these exact strings. */
export type FileClass = 'plan' | 'spec' | 'rfp' | 'notes' | 'other';

export interface IntakeFile {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  /** Human-readable classification (plan / spec / rfp / notes / other). */
  class: FileClass;
  /** Sheet code extracted from the filename (e.g. "T-100", "E-401"), if any. */
  sheetCode?: string | null;
  /** Scale extracted from the filename (e.g. "1/8\"=1'-0\""), if any. */
  scale?: string | null;
  /** Page count after decode. null until parsed. */
  pages?: number | null;
  /** File-system lastModified timestamp (ms) as provided by the browser. */
  lastModified?: number | null;
  status: 'pending' | 'parsing' | 'parsed' | 'error';
  /** 0..1 progress during decode. 0 until started, 1 when done. */
  progress?: number;
  text?: string | null;
  error?: string | null;
  /** Run IDs that have consumed this file (so reruns can skip stable inputs). */
  contributedToRuns?: string[];
}

export interface ExtractionRun {
  id: string;
  ts: number;
  phase: ExtractionPhaseName;
  summary: string;
  /** Candidate values keyed by token → list of {value, confidence, src}. */
  candidates: Record<string, Array<{ value: unknown; confidence: number; src: string }>>;
}

export type OpenItemKind = 'TBD' | 'Question' | 'Unknown';

export interface OpenItem {
  id: string;
  kind: OpenItemKind;
  text: string;
  owner: string;
  source: 'auto' | 'user';
  resolved: boolean;
}

export interface IntakeState {
  files: IntakeFile[];
  runs: ExtractionRun[];
  /** 0 = nothing run yet; 1..4 = phase completed. */
  currentPhase: number;
  phases: readonly ExtractionPhaseName[];
  stage: StageName;

  crosswalk: Crosswalk;

  /** User-entered labor plan overrides. */
  laborPlan?: Array<{ week: number; hours: number }>;

  /** Stage 3 center — Open Items / TBD / Questions / Unknowns. */
  openItems: OpenItem[];

  /** Stage 3 right + Stage 4 left — conditional + asked-for scope add-ins. */
  supplements: Record<string, boolean>;

  /** Stage 4 left — closeout deliverable checklist. */
  closeoutItems: Record<string, boolean>;

  /** Stage 4 center — 5-tier pricing strategy (floor/aggressive/balanced/conservative/premium). */
  pricingTiers: PricingTiers | null;

  /** Stage 4 center — decision inputs that drive the tier recommendation. */
  decisionInputs: DecisionInputs | null;

  /** Stage 4 center — alts & deducts checklist state. Hard-locked items always ON. */
  altDeducts: AltDeductsState;

  /** Stage 4 top — packet length + labor-rate override + discount + regen timestamps. */
  customization: Customization | null;

  /** Stage 4 right — risk flags. Auto-seeded + user-added. */
  redFlags: RedFlag[];

  /** Map: TOC key → ISO timestamp of last regenerate. Used to flag stale deliverables. */
  generatedAt: Record<string, string>;

  /** Stage 4 left — closeout sort key ('due' | 'owner' | 'alpha'). */
  closeoutSort: 'due' | 'owner' | 'alpha';

  /** Stage 4 — selected themes for client-facing output (Gemini stylize).
   *  First entry is the "primary" used by single-stylize. ≥2 enables comparison view. */
  selectedThemeIds?: string[];
}

/** Transient in-memory state that doesn't get persisted with the intake. */
export interface SessionState {
  lines: LineItem[];
  meta: {
    propnum?: string;
    mobilization?: string;
    substantial?: string;
  };
}
