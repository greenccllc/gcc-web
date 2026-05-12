/**
 * Risk to GCC & Red Flags — internal-only risk dashboard that replaces the
 * legacy "Standard Terms Preview" card on Stage 4.
 */

export type RiskSeverity = 'high' | 'med' | 'info';
export type RiskCategory = 'Scope' | 'Schedule' | 'Commercial' | 'Contractor' | 'Other';

export interface RedFlag {
  id: string;
  severity: RiskSeverity;
  category: RiskCategory;
  /** One-sentence description of the risk. */
  text: string;
  /** 'auto' = seeded by RED_FLAG_CATALOG rule; 'user' = manually added. */
  source: 'auto' | 'user';
  /** True when the estimator has addressed the flag (priced for it or mitigated). */
  resolved: boolean;
  /** Optional mitigation note — shown on the card and in the Finance Summary export. */
  mitigation?: string;
}

/**
 * Input context for the RED_FLAG_CATALOG `test` functions. Pre-computed
 * from the crosswalk so individual rules stay cheap.
 */
export interface RedFlagTestContext {
  /** Count of tokens in required-for-phase categories that still have low confidence. */
  lowConfCount: number;
  /** Count of tokens in required-for-phase categories that are blank. */
  blankRequiredCount: number;
  /** True when the GC / prime contractor looks like a first-time relationship. */
  gcIsNew: boolean;
  /** True when the project address is outside GCC's service area. */
  outOfArea: boolean;
  /** Days until bid due. null if no bid_due_date in crosswalk. */
  bidDaysRemaining: number | null;
}

/** A rule in the auto-seeded red-flag catalog. */
export interface RedFlagRule {
  id: string;
  severity: RiskSeverity;
  category: RiskCategory;
  text: string;
  /** Returns true if the flag should be raised for the current intake. */
  test: (textBlob: string, ctx: RedFlagTestContext) => boolean;
}
