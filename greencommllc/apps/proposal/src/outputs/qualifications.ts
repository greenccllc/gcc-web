/**
 * 05 · Qualifications — contractor background, inclusions, exclusions, assumptions.
 *
 * Ported from `onExportQualifications` (bundle-builder.html line 20805).
 *
 * Pulls the canonical inclusion / exclusion lists from the GCC brand record.
 * Owner name is interpolated from `brand.owner.full_name`.
 */

import type { GccBrand, LogoMap } from '@models/brand';
import type { IntakeState, SessionState } from '@models/intake';
import {
  buildOutputFilename,
  escapeHtml,
  getProjectLabel
} from './_helpers';
import { gccHtmlShell } from './shellHtml';

export interface QualificationsInput {
  intake: IntakeState;
  session: SessionState;
  brand: GccBrand;
  logos: LogoMap;
  projectLabel?: string;
}

export interface QualificationsOutput {
  filename: string;
  html: string;
}

export function renderQualifications(inp: QualificationsInput): QualificationsOutput {
  const { intake, session, brand, logos } = inp;
  const project = inp.projectLabel ?? getProjectLabel(intake, session);

  const includedItems  = brand.includedUpgrades.map(s => '<li>' + escapeHtml(s) + '</li>').join('');
  const exclusionItems = brand.standardExclusions.map(s => '<li>' + escapeHtml(s) + '</li>').join('');

  const body =
    '<h2>About GCC LLC</h2>' +
    '<p>GreenComm LLC (d/b/a GCC LLC) is a Missouri-based specialty contractor focused exclusively on Division 27 (Communications) and Division 28 (Electronic Safety &amp; Security). We do not chase Division 26 electrical scope, Division 23 mechanical work, or low-voltage adjacencies outside our wheelhouse. When the job is low-voltage, we do it; when it is not, we stay in our lane and refer honestly.</p>' +
    '<p>The company is owner-operated by ' + escapeHtml(brand.owner.full_name) + ' (' + escapeHtml(brand.owner.title) + '). Every bid is reviewed by the owner before it leaves the office. Every callback is taken by the owner. Accountability does not get delegated.</p>' +

    '<h2>Qualifications &amp; Licensing</h2>' +
    '<table>' +
      '<tbody>' +
        '<tr><td><strong>Entity</strong></td><td>GreenComm LLC, Missouri LLC in good standing</td></tr>' +
        '<tr><td><strong>Trade registration</strong></td><td>Licensed low-voltage contractor · KCMO &amp; STL jurisdictions</td></tr>' +
        '<tr><td><strong>Insurance</strong></td><td>$1M / $2M GL · $1M Auto · $1M WC · $1M Umbrella · certificates on request</td></tr>' +
        '<tr><td><strong>Manufacturer certification</strong></td><td>Panduit Certified Installer · CommScope SYSTIMAX PartnerPRO</td></tr>' +
        '<tr><td><strong>Technical credentials</strong></td><td>BICSI-aligned technicians · RCDD consultation on request · OSHA 10 minimum, OSHA 30 for foremen</td></tr>' +
        '<tr><td><strong>Test equipment</strong></td><td>Fluke DSX-8000 (copper Tier 1) · Fluke OptiFiber Pro (fiber OTDR) · Versiv 2 platform</td></tr>' +
      '</tbody>' +
    '</table>' +

    '<h2>What We Include (Baseline)</h2>' +
    '<ul>' + includedItems + '</ul>' +

    '<h2>Standard Exclusions</h2>' +
    '<p>The following are <strong>explicitly excluded</strong> from GCC\'s scope unless separately line-itemed in the Bid Proposal Section 2 or Section 3:</p>' +
    '<ul>' +
      exclusionItems +
      '<li>Concrete cutting, coring, or sawing of existing slab</li>' +
      '<li>Asbestos, lead-paint, or hazardous-material abatement</li>' +
      '<li>Security devices not specified in contract documents</li>' +
      '<li>Network active equipment (switches, routers, firewalls) unless explicitly line-itemed</li>' +
      '<li>Network configuration, VLAN setup, DHCP scopes, firewall policy</li>' +
      '<li>Telephone service, carrier circuits, demarc extensions</li>' +
      '<li>Removal or reuse of existing cabling; all pricing assumes new install</li>' +
    '</ul>' +

    '<h2>Key Assumptions</h2>' +
    '<ul>' +
      '<li>Pricing is based on drawings and specifications listed in the Bid Proposal Section 1 Project Understanding. Addenda published after bid date are reviewable via change-order.</li>' +
      '<li>Work performed during standard business hours (7a–5p, M–F). After-hours / weekend premium is 1.5× straight time with 48-hour notice.</li>' +
      '<li>Pathways (conduit, sleeves, J-hooks above hard-lid ceilings, fire-stop) are by Electrical Contractor unless shown on T-sheets.</li>' +
      '<li>Rack location(s) are climate-controlled, dust-free, and secured before mobilization.</li>' +
      '<li>Adequate laydown area provided within 100 ft of TR; secured overnight storage available.</li>' +
      '<li>Dumpster access on site; GCC removes own packaging daily.</li>' +
      '<li>Jobsite parking available for crew vehicles and GCC service van.</li>' +
    '</ul>' +

    '<h2>Differentiators</h2>' +
    '<ul>' +
      '<li><strong>Cat 6A baseline, always.</strong> We do not price Cat 6 even when drawings allow it — the $0.15/ft delta is not worth the 10-year compromise.</li>' +
      '<li><strong>100% certification, not spot-check.</strong> Every termination gets a Fluke trace. No exceptions.</li>' +
      '<li><strong>Owner on every bid.</strong> ' + escapeHtml(brand.owner.full_name) + ' personally reviews every proposal before it is submitted.</li>' +
      '<li><strong>Responsive.</strong> RFI turnaround in hours, not days, during active construction.</li>' +
      '<li><strong>Warranty we stand behind.</strong> Lifetime workmanship. Two no-cost AMC visits. Callbacks answered by the owner.</li>' +
    '</ul>';

  const html = gccHtmlShell(
    'Qualifications',
    body,
    {
      classification: 'CLIENT',
      docKind:        '05 · Contractor Qualifications · Inclusions · Exclusions',
      projectLabel:   project
    },
    { brand, logos }
  );

  const filename = buildOutputFilename(
    { prefix: '05', baseName: 'Qualifications', ext: '.pdf' },
    project
  );

  return { filename, html };
}
