/**
 * 06 · Standards Compliance · Test Protocol · Submittals.
 *
 * Ported from `onExportStandards` (bundle-builder.html line 20872).
 *
 * Pure-text reference document — no charts, no tables that depend on session
 * state. The standards register is hard-coded against the current edition of
 * each cited standard; bump the table here when a new edition supersedes.
 */

import type { GccBrand, LogoMap } from '@models/brand';
import type { IntakeState, SessionState } from '@models/intake';
import {
  buildOutputFilename,
  getProjectLabel
} from './_helpers';
import { gccHtmlShell } from './shellHtml';

export interface StandardsInput {
  intake: IntakeState;
  session: SessionState;
  brand: GccBrand;
  logos: LogoMap;
  projectLabel?: string;
}

export interface StandardsOutput {
  filename: string;
  html: string;
}

export function renderStandards(inp: StandardsInput): StandardsOutput {
  const { intake, session, brand, logos } = inp;
  const project = inp.projectLabel ?? getProjectLabel(intake, session);

  const body =
    '<h2>Compliance Posture</h2>' +
    '<p>GCC designs and installs to the current applicable edition of the following standards. Where a specification calls out a different standard or edition, GCC complies with the specification; where the specification is silent, the standards below govern.</p>' +

    '<h2>ANSI / TIA Standards</h2>' +
    '<table>' +
      '<thead><tr><th>Standard</th><th>Title</th><th>Scope Applied</th></tr></thead>' +
      '<tbody>' +
        '<tr><td>ANSI/TIA-568.2-D</td><td>Balanced Twisted-Pair Telecommunications Cabling</td><td>All copper horizontal cabling</td></tr>' +
        '<tr><td>ANSI/TIA-568.3-D</td><td>Optical Fiber Cabling Components Standard</td><td>All fiber backbone runs</td></tr>' +
        '<tr><td>ANSI/TIA-569-E</td><td>Pathways and Spaces</td><td>TR sizing, conduit fill, J-hook spacing</td></tr>' +
        '<tr><td>ANSI/TIA-606-C</td><td>Administration Standard for Telecommunications Infrastructure</td><td>Labeling, documentation, drawing register</td></tr>' +
        '<tr><td>ANSI/TIA-607-D</td><td>Generic Telecommunications Bonding and Grounding</td><td>TGB/TMGB, busbar, rack bonding</td></tr>' +
        '<tr><td>ANSI/TIA-942-C</td><td>Telecommunications Infrastructure Standard for Data Centers</td><td>Applied when scope includes data center-class TR</td></tr>' +
      '</tbody>' +
    '</table>' +

    '<h2>BICSI Standards</h2>' +
    '<ul>' +
      '<li><strong>BICSI TDMM 14th Edition</strong> — Telecommunications Distribution Methods Manual, design reference.</li>' +
      '<li><strong>BICSI ITSIMM</strong> — Information Technology Systems Installation Methods Manual, field install reference.</li>' +
    '</ul>' +

    '<h2>Electrical Code</h2>' +
    '<ul>' +
      '<li><strong>NFPA 70 (NEC) Article 645</strong> — Information Technology Equipment</li>' +
      '<li><strong>NFPA 70 (NEC) Article 725</strong> — Class 1, 2, and 3 Remote-Control, Signaling, and Power-Limited Circuits</li>' +
      '<li><strong>NFPA 70 (NEC) Article 770</strong> — Optical Fiber Cables and Raceways</li>' +
      '<li><strong>NFPA 70 (NEC) Article 800</strong> — Communications Circuits</li>' +
    '</ul>' +

    '<h2>Fire &amp; Life Safety</h2>' +
    '<ul>' +
      '<li><strong>NFPA 72</strong> — National Fire Alarm and Signaling Code (when fire-alarm scope is included — typically excluded, see Section 5 Qualifications)</li>' +
      '<li><strong>NFPA 75</strong> — Protection of Information Technology Equipment</li>' +
      '<li><strong>Listed firestop assemblies</strong> — 3M CP-25WB+, Hilti CP-606, STI SpecSeal; submittals include Intertek / UL listing per penetration type</li>' +
    '</ul>' +

    '<h2>Accessibility</h2>' +
    '<ul>' +
      '<li><strong>ADA Standards for Accessible Design</strong> — outlet mounting heights, reach ranges, operable parts</li>' +
    '</ul>' +

    '<h2>Testing &amp; Certification</h2>' +
    '<ul>' +
      '<li><strong>Copper (Cat 6A):</strong> Fluke DSX-8000 permanent-link test, all pairs, all frequencies; LinkWare PDF output; 100% of installed terminations.</li>' +
      '<li><strong>Fiber (OM4 / OS2):</strong> Fluke OptiFiber Pro — Tier 1 insertion loss (both directions) and Tier 2 OTDR traces; event table and fault localization.</li>' +
      '<li><strong>Grounding:</strong> Fall-of-potential or 3-point test on TGB/TMGB; target ≤ 5 ohms to earth.</li>' +
      '<li><strong>Labeling:</strong> Verified against drawing register; photographic close-out of every TR.</li>' +
    '</ul>' +

    '<h2>Submittals &amp; Close-Out Documents</h2>' +
    '<ul>' +
      '<li>Product data sheets (Panduit/CommScope patch panels, jacks, faceplates; Berk-Tek/Corning fiber)</li>' +
      '<li>Cut sheets for racks, ladder, cable mgmt, firestop</li>' +
      '<li>Sample product (jack, cable, faceplate) on request</li>' +
      '<li>Shop drawings (RCDD-stamped on request)</li>' +
      '<li>As-built drawings (PDF + DWG)</li>' +
      '<li>LinkWare test certifications (PDF)</li>' +
      '<li>Labeling register (TIA-606-C Class 3, barcode-backed)</li>' +
      '<li>Warranty registration (Panduit / CommScope 25-year certification)</li>' +
      '<li>Operations &amp; maintenance manual</li>' +
    '</ul>';

  const html = gccHtmlShell(
    'Standards',
    body,
    {
      classification: 'CLIENT',
      docKind:        '06 · Standards Compliance · Test Protocol · Submittals',
      projectLabel:   project
    },
    { brand, logos }
  );

  const filename = buildOutputFilename(
    { prefix: '06', baseName: 'Standards', ext: '.pdf' },
    project
  );

  return { filename, html };
}
