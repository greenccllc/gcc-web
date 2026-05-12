/**
 * Red Flag Catalog — declarative rules for auto-detecting risks to GCC.
 *
 * Each rule fires when its `test` returns true. Rules run against a
 * merged text blob of relevant intake tokens plus a small pre-computed
 * context (low-confidence counts, bid deadline, etc.).
 *
 * Ported from RED_FLAG_CATALOG in bundle-builder.html ~line 12800.
 */

import type { RedFlagRule } from '@models/risk';

export const RED_FLAG_CATALOG: readonly RedFlagRule[] = [
  {
    id: 'rf-occupied',
    severity: 'med',
    category: 'Schedule',
    text: 'Occupied facility / after-hours work implied by scope',
    test: (txt) => /occupied|after hours?|weekend|night shift|off hours|24\/7|phased/i.test(txt)
  },
  {
    id: 'rf-prev-wage',
    severity: 'high',
    category: 'Commercial',
    text: 'Prevailing wage / Davis-Bacon applies — verify labor rates in estimate',
    test: (txt) => /prevailing wage|davis[-\s]?bacon|public works|municipal|school district|federal/i.test(txt)
  },
  {
    id: 'rf-short-bid',
    severity: 'high',
    category: 'Schedule',
    text: 'Short bid window — less time to vet scope & pricing',
    test: (_, ctx) => ctx.bidDaysRemaining !== null && ctx.bidDaysRemaining < 5
  },
  {
    id: 'rf-low-conf',
    severity: 'med',
    category: 'Scope',
    text: 'Several tokens extracted at low confidence (<60%)',
    test: (_, ctx) => ctx.lowConfCount >= 5
  },
  {
    id: 'rf-blank-req',
    severity: 'high',
    category: 'Scope',
    text: 'Required-category tokens still blank — scope not fully defined',
    test: (_, ctx) => ctx.blankRequiredCount >= 3
  },
  {
    id: 'rf-gc-new',
    severity: 'med',
    category: 'Contractor',
    text: 'GC / Prime contractor we have no prior AR history with',
    test: (_, ctx) => ctx.gcIsNew === true
  },
  {
    id: 'rf-bond',
    severity: 'med',
    category: 'Commercial',
    text: 'Bond required — confirm with surety before submitting',
    test: (txt) => /bond required\s*[:=]\s*yes|performance bond|payment bond|p\s*&\s*p bond/i.test(txt)
  },
  {
    id: 'rf-travel',
    severity: 'info',
    category: 'Schedule',
    text: 'Project address outside KCMO / STL — travel cost + lodging may apply',
    test: (_, ctx) => ctx.outOfArea === true
  },
  {
    id: 'rf-icra',
    severity: 'high',
    category: 'Schedule',
    text: 'Healthcare scope — ICRA barriers, infection control add cost',
    test: (txt) => /hospital|clinic|medical center|nursing|surger|patient|healthcare/i.test(txt)
  },
  {
    id: 'rf-retainage',
    severity: 'med',
    category: 'Commercial',
    text: 'Retainage > 10% — affects cash flow on this job',
    test: (txt) => /retainage.{0,10}1[5-9]%|retainage.{0,10}2\d%/i.test(txt)
  },
  {
    id: 'rf-fed',
    severity: 'med',
    category: 'Commercial',
    text: 'Federal project — BICSI RCDD QA/QC, DBE/SDB compliance requirements',
    test: (txt) => /federal|dod|gsa|va hospital|tia[-\s]?942/i.test(txt)
  }
] as const;
