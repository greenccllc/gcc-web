/**
 * Intake store — single source of truth for the entire app.
 * Built on Svelte 5 runes so any component can read + write
 * reactively via `store.intake.foo = bar`.
 *
 * localStorage persistence mirrors the legacy app's key so both
 * the old HTML file and the new app can share the same data during
 * migration.
 */

import type { IntakeState, SessionState, StageName } from '@models/intake';
import type { LineItem } from '@models/lineItem';
import type { Crosswalk } from '@models/crosswalk';
import type { RedFlag } from '@models/risk';

const INTAKE_KEY  = 'gcc-intake-v1';
const SESSION_KEY = 'gcc-session-v1';

function defaultIntake(): IntakeState {
  return {
    files: [],
    runs: [],
    currentPhase: 0,
    phases: ['parse', 'dict', 'conf', 'synth'],
    stage: 'intake',
    crosswalk: {},
    openItems: [],
    supplements: {},
    closeoutItems: {},
    pricingTiers: null,
    decisionInputs: null,
    altDeducts: {},
    customization: null,
    redFlags: [],
    generatedAt: {},
    closeoutSort: 'due',
    selectedThemeIds: []
  };
}

function defaultSession(): SessionState {
  return {
    lines: [],
    meta: {}
  };
}

/** Safely parse JSON from localStorage. Falls back to default on any error. */
function loadJson<T>(key: string, fallback: () => T): T {
  if (typeof localStorage === 'undefined') return fallback();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback();
    return { ...fallback(), ...JSON.parse(raw) } as T;
  } catch {
    return fallback();
  }
}

function saveJson(key: string, value: unknown): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota, ignore */ }
}

/**
 * Creates the reactive store. Call once in the app.
 * Returns an object whose properties are deeply reactive.
 */
function createIntakeStore() {
  const intake = $state<IntakeState>(loadJson(INTAKE_KEY, defaultIntake));
  const session = $state<SessionState>(loadJson(SESSION_KEY, defaultSession));

  // Auto-persist on any mutation. The runes runtime will trigger the
  // effect whenever any reachable property changes.
  $effect.root(() => {
    $effect(() => {
      saveJson(INTAKE_KEY, $state.snapshot(intake));
    });
    $effect(() => {
      saveJson(SESSION_KEY, $state.snapshot(session));
    });
  });

  /** Convenience setter for the active stage. */
  function setStage(s: StageName): void { intake.stage = s; }

  /** Replace the entire line-item list (used when the catalog editor commits). */
  function setLines(lines: LineItem[]): void { session.lines = lines; }

  /** Merge a partial crosswalk into the existing one. Preserves user-edited (final:true) entries. */
  function mergeCrosswalk(patch: Crosswalk): void {
    for (const [tok, entry] of Object.entries(patch)) {
      const existing = intake.crosswalk[tok];
      if (existing && existing.final) continue; // don't overwrite confirmed values
      intake.crosswalk[tok] = entry;
    }
  }

  /** Replace the red-flag list (auto + user merged). */
  function setRedFlags(flags: RedFlag[]): void { intake.redFlags = flags; }

  /**
   * Mark the proposal packet as stale. Called automatically whenever a
   * Stage-4 input changes (tier / price / decision / alts / customization /
   * closeout). Triggers the "\u26a0 Regenerate" badge on the regen button.
   */
  function markStale(reason: string): void {
    if (!intake.customization) return;                 // never generated yet
    if (!intake.customization.generatedAt) return;     // still nothing to stale
    intake.customization.staleReason = reason;
  }

  /**
   * Clear the staleReason — call after a successful regenerate.
   * Leaves generatedAt set so we know "something was generated once".
   */
  function markFresh(): void {
    if (!intake.customization) return;
    intake.customization.staleReason = null;
    intake.customization.generatedAt = new Date().toISOString();
  }

  /** Wipe all state and return to defaults. Used by the Reset button. */
  function reset(): void {
    Object.assign(intake, defaultIntake());
    Object.assign(session, defaultSession());
  }

  return {
    intake,
    session,
    setStage,
    setLines,
    mergeCrosswalk,
    setRedFlags,
    markStale,
    markFresh,
    reset
  };
}

// Singleton. Access via `store.intake.xxx`.
export const store = createIntakeStore();

/** Derived convenience — base cost from line items. */
export function baseCostFromLines(): number {
  return store.session.lines.reduce((s, l) => s + l.qty * l.costEach, 0);
}

/** Derived convenience — base sell from line items. */
export function baseSaleFromLines(): number {
  return store.session.lines.reduce((s, l) => s + l.qty * l.saleEach, 0);
}
