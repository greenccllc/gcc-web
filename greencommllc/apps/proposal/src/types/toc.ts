/**
 * Proposal TOC — tree of deliverables in the packet.
 * Length setting filters which nodes are "in-scope".
 */

import type { ProposalLength } from './customization';

export interface TocDef {
  key: string;
  label: string;
  /** Display number, e.g. "01", "02". */
  number: string;
  /** Which ProposalLength tiers include this deliverable. */
  lengths: readonly ProposalLength[];
  /** Name of the legacy handler function, or null when there's no generator. */
  handler: string | null;
}

export type TocStatus = 'generated' | 'stale' | 'pending';

export const TOC_DEFS: readonly TocDef[] = [
  { key:'cover',    label:'Cover Letter',          number:'01', lengths:['short','normal','long','formal'],        handler:'onExportCoverLetter'   },
  { key:'overview', label:'Bid Overview',          number:'02', lengths:['flyer','short','normal','long','formal'], handler:'onExportBidOverview'   },
  { key:'proposal', label:'Bid Proposal (\u00a71-\u00a78)', number:'03', lengths:['normal','long','formal'],        handler:'onExportBidProposal'   },
  { key:'sow',      label:'Statement of Work',     number:'04', lengths:['long','formal'],                         handler:'onExportSOW'           },
  { key:'quals',    label:'Qualifications',        number:'05', lengths:['long','formal'],                         handler:'onExportQualifications'},
  { key:'stds',     label:'Standards Compliance',  number:'06', lengths:['long','formal'],                         handler:'onExportStandards'     },
  { key:'sov',      label:'Schedule of Values',    number:'07', lengths:['normal','long','formal'],                handler:'onExportBidProposal'   },
  { key:'closeout', label:'Closeout Requirements', number:'08', lengths:['formal'],                                handler:null                    }
] as const;

/** Return the TOC defs that are in scope for the given length. */
export function tocInScope(length: ProposalLength): TocDef[] {
  return TOC_DEFS.filter(t => t.lengths.includes(length));
}
