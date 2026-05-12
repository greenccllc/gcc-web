/**
 * Customization — Stage 4 knobs that affect the generated output packet.
 *
 *   length            : which deliverables are in scope (TOC filter)
 *   laborRateOverride : null = rate card default ($125/hr)
 *   overallDiscount   : % off final sell (0..15)
 *   generatedAt       : ISO ts of last regenerate
 *   staleReason       : short description of what changed since last regen;
 *                       null when packet is fresh
 */

export type ProposalLength =
  | 'flyer'    // 1-page infographic
  | 'short'    // 3-4 pages: exec summary + scope + pricing
  | 'normal'   // 8-12 pages: standard §1-§8 bid packet
  | 'long'     // 15-20 pages: full packet + quals + standards + SOW
  | 'formal';  // 22-28 pages: RFP-grade with acceptance block

export interface LengthDef {
  key: ProposalLength;
  label: string;
  desc: string;
  pages: number;
}

export const LENGTH_DEFS: readonly LengthDef[] = [
  { key: 'flyer',  label: 'Flyer',  desc: '1-page infographic: KPIs, visuals, CTA.',                              pages: 1  },
  { key: 'short',  label: 'Short',  desc: 'Exec summary + scope overview + pricing. 3-4 pages.',                  pages: 4  },
  { key: 'normal', label: 'Normal', desc: 'Standard \u00a71-\u00a78 bid packet. 8-12 pages.',                    pages: 10 },
  { key: 'long',   label: 'Long',   desc: 'Full packet + qualifications + standards + SOW detail. 15-20 pages.', pages: 18 },
  { key: 'formal', label: 'Formal', desc: 'RFP-grade: everything + acceptance + signature pages. 22-28 pages.',   pages: 25 }
] as const;

export interface Customization {
  length: ProposalLength;
  /** null = use rate-card default. */
  laborRateOverride: number | null;
  /** 0..15 percentage off the final sell price. */
  overallDiscount: number;
  /** ISO timestamp of last regenerate. */
  generatedAt: string | null;
  /** Description of what changed since last regen. null when packet is fresh. */
  staleReason: string | null;
}

export function defaultCustomization(): Customization {
  return {
    length:            'normal',
    laborRateOverride: null,
    overallDiscount:   0,
    generatedAt:       null,
    staleReason:       null
  };
}
