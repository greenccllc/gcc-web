/**
 * Alts & Deducts — checklist under each pricing tier card.
 *
 * Three lock states:
 *   hard : always checked, cannot toggle (RFP requirement or GCC standard)
 *   soft : user-togglable; can be pre-checked (suggested) or not (optional)
 *
 * Groups, in render order:
 *   1. Required           - client-requested scope (RFP items; hard-locked)
 *   2. GCC Standard Alts  - our design/config + managed services + normal-hrs (hard-locked)
 *   3. Suggested Deducts  - discount levers, off by default
 *   4. Optional Includes  - upsell adds, off by default
 */

export type AltDeductGroup =
  | 'Required'
  | 'GCC Standard Alts'
  | 'Suggested Deducts'
  | 'Optional Includes';

export type AltDeductLock = 'hard' | 'soft';

export interface AltDeductDef {
  key: string;
  group: AltDeductGroup;
  label: string;
  desc: string;
  lock: AltDeductLock;
  defaultOn: boolean;
}

export const ALTDEDUCT_DEFS: readonly AltDeductDef[] = [
  {
    key:'rfp-required',
    group:'Required',
    label:'Client-requested scope (per RFP/spec)',
    desc:'Any items the RFP or spec explicitly calls out. Auto-seeded from crosswalk.',
    lock:'hard',
    defaultOn:true
  },
  {
    key:'gcc-design',
    group:'GCC Standard Alts',
    label:'Our network design / config / hardware',
    desc:'Design, commissioning, and Panduit/CommScope hardware \u2014 shown as a value-add in the cover letter.',
    lock:'hard',
    defaultOn:true
  },
  {
    key:'gcc-managed',
    group:'GCC Standard Alts',
    label:'Managed Services attachment (-5% deduct if 3-yr signed)',
    desc:'Owner signs a 3-year AMC and we reduce the bid by 5%. Incentive is explicit in the proposal.',
    lock:'hard',
    defaultOn:true
  },
  {
    key:'gcc-normal-hrs',
    group:'GCC Standard Alts',
    label:'Evening / weekend access deduct',
    desc:'Bid assumes normal hours. If owner requires off-hours, add back via change order.',
    lock:'hard',
    defaultOn:true
  },
  {
    key:'dedct-bundle-savings',
    group:'Suggested Deducts',
    label:'Volume/bundle savings (-3%)',
    desc:'Order-in-one-shipment pricing when owner commits to the full bundle at acceptance.',
    lock:'soft',
    defaultOn:false
  },
  {
    key:'opt-fiber-capacity',
    group:'Optional Includes',
    label:'+4 extra fiber strands (backbone capacity)',
    desc:'Future-proof pull; minimal incremental labor.',
    lock:'soft',
    defaultOn:false
  },
  {
    key:'opt-ups-1u',
    group:'Optional Includes',
    label:'1U rack-mount UPS per TR',
    desc:'Short-runtime UPS on each IDF, sized to core switches.',
    lock:'soft',
    defaultOn:false
  },
  {
    key:'opt-label-cart',
    group:'Optional Includes',
    label:'Panduit label cartridge set (owner)',
    desc:'Owner gets the exact label-printer cartridges we used on the job.',
    lock:'soft',
    defaultOn:false
  },
  {
    key:'opt-fluke-print',
    group:'Optional Includes',
    label:'Extended Fluke report (printed + bound)',
    desc:'Hard-copy LinkWare PDF per jack, bound. Most owners are happy with the PDF.',
    lock:'soft',
    defaultOn:false
  },
  {
    key:'opt-spare-kit',
    group:'Optional Includes',
    label:'Owner spare kit (1 drop + 1 patch per 50)',
    desc:'Leave-behind spares sized to 2% of the installed count.',
    lock:'soft',
    defaultOn:false
  },
  {
    key:'opt-standby',
    group:'Optional Includes',
    label:'Post-install 30-day stand-by (2 hrs on-call)',
    desc:'Two hours of on-call support within 30 days of substantial completion.',
    lock:'soft',
    defaultOn:false
  }
] as const;

/** Map: key → boolean (checked state). */
export type AltDeductsState = Record<string, boolean>;

export function defaultAltDeducts(): AltDeductsState {
  const out: AltDeductsState = {};
  for (const d of ALTDEDUCT_DEFS) {
    out[d.key] = d.defaultOn;
  }
  return out;
}

/**
 * Enforce hard-locks. Any hard-locked item is always on regardless of what
 * the user tries to toggle. Call after every mutation.
 */
export function enforceAltDeductLocks(state: AltDeductsState): AltDeductsState {
  for (const d of ALTDEDUCT_DEFS) {
    if (d.lock === 'hard') state[d.key] = true;
    else if (state[d.key] == null) state[d.key] = d.defaultOn;
  }
  return state;
}
