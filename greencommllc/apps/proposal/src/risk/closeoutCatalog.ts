/**
 * CLOSEOUT_DEFS — the standard deliverables GCC owes the owner at project
 * close. Each item is a checkbox on Stage 4 and gets rendered in the
 * Finance Summary + closeout package.
 *
 * Ported from CLOSEOUT_DEFS in bundle-builder.html ~line 12500.
 */

export interface CloseoutDef {
  key: string;
  label: string;
  desc: string;
  /** Role that owns this deliverable. Shown on the card as a pill. */
  owner: string;
  /** Plain-English schedule anchor. Appears below the description. */
  whenDue: string;
}

export const CLOSEOUT_DEFS: readonly CloseoutDef[] = [
  {
    key: 'as-builts',
    label: 'As-Built Drawings',
    desc: 'Redlined plan set showing actual installed drop / rack / pathway locations.',
    owner: 'PM',
    whenDue: 'Substantial Completion + 10 business days'
  },
  {
    key: 'fluke-certs',
    label: 'Fluke Test Certifications',
    desc: 'Cat6A permanent-link results (Fluke DSX-8000) — one per jack, PDF bundle.',
    owner: 'Lead Tech',
    whenDue: 'Within 5 days of system cutover'
  },
  {
    key: 'om-manual',
    label: 'O&M Manual',
    desc: 'Binder/PDF: part numbers, cut sheets, MAC address list, rack elevations, warranty cards.',
    owner: 'PM',
    whenDue: 'At project closeout meeting'
  },
  {
    key: 'owner-training',
    label: 'Owner Training (2 hrs)',
    desc: 'On-site walkthrough for facilities / IT staff. Signed acknowledgement form.',
    owner: 'Lead Tech',
    whenDue: 'Within 2 weeks of Substantial Completion'
  },
  {
    key: 'warranty-reg',
    label: 'Warranty Registration',
    desc: 'Panduit / CommScope system warranty certificate issued to Owner.',
    owner: 'PM',
    whenDue: 'Within 30 days of Final Completion'
  },
  {
    key: 'punchlist',
    label: 'Punchlist Walk',
    desc: 'GC / owner walk, punchlist items captured, signed back-check.',
    owner: 'PM + GC',
    whenDue: 'Prior to Final Invoice'
  },
  {
    key: 'final-invoice',
    label: 'Final Invoice + Retainage Release',
    desc: 'Final pay app including retainage, submitted with closeout package.',
    owner: 'PM + Accounts',
    whenDue: 'After all closeout docs delivered'
  },
  {
    key: 'lien-waivers',
    label: 'Lien Waivers (Final)',
    desc: 'Unconditional final lien waivers — GCC + all subs and material suppliers.',
    owner: 'PM + Accounts',
    whenDue: 'With Final Invoice'
  }
] as const;
