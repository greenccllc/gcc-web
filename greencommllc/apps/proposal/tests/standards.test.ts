/**
 * renderStandards — structure tests on the 06 standards compliance doc.
 */

import { describe, it, expect } from 'vitest';
import { renderStandards, type StandardsInput } from '@/outputs/standards';
import { GCC_BRAND } from '@brand/gcc';
import type { LogoMap } from '@models/brand';
import type { IntakeState, SessionState } from '@models/intake';
import type { CrosswalkEntry } from '@models/crosswalk';

const fakeLogos: LogoMap = {
  emblem:     'data:image/png;base64,AAA=',
  stacked:    'data:image/png;base64,BBB=',
  letterhead: 'data:image/png;base64,CCC='
};

function row(value: string): CrosswalkEntry {
  return { value, confidence: 1.0, src: 'test', final: true };
}

function mkIntake(): IntakeState {
  return {
    files: [], runs: [], currentPhase: 4,
    phases: ['parse', 'dict', 'conf', 'synth'],
    stage: 'final',
    crosswalk: {
      project_name: row('Demo Office Build')
    },
    openItems: [], supplements: {},
    closeoutItems: {}, pricingTiers: null, decisionInputs: null,
    altDeducts: {}, customization: null, redFlags: [], generatedAt: {},
    closeoutSort: 'due'
  };
}

const session: SessionState = { lines: [], meta: {} };

function input(): StandardsInput {
  return {
    intake: mkIntake(),
    session,
    brand: GCC_BRAND,
    logos: fakeLogos,
    projectLabel: 'Demo Office Build'
  };
}

describe('renderStandards', () => {
  it('returns a CLIENT-classification PDF filename + full HTML', () => {
    const out = renderStandards(input());
    expect(out.filename).toBe('06 Standards - Demo Office Build.pdf');
    expect(out.html).toContain('<!doctype html>');
    expect(out.html).toContain('class="gcc-ribbon client">CLIENT');
    expect(out.html).toContain('06 · Standards Compliance');
  });

  it('lists all six ANSI/TIA standards in the reference table', () => {
    const out = renderStandards(input());
    const tiaIds = [
      'ANSI/TIA-568.2-D',
      'ANSI/TIA-568.3-D',
      'ANSI/TIA-569-E',
      'ANSI/TIA-606-C',
      'ANSI/TIA-607-D',
      'ANSI/TIA-942-C'
    ];
    for (const id of tiaIds) {
      expect(out.html).toContain(id);
    }
  });

  it('lists the four NEC articles in the Electrical Code section', () => {
    const out = renderStandards(input());
    const ecBlock = out.html.split('<h2>Electrical Code</h2>')[1]
      ?.split('<h2>Fire')[0] ?? '';
    for (const art of ['Article 645', 'Article 725', 'Article 770', 'Article 800']) {
      expect(ecBlock).toContain(art);
    }
  });

  it('calls out BICSI TDMM 14th Edition and ITSIMM', () => {
    const out = renderStandards(input());
    expect(out.html).toContain('BICSI TDMM 14th Edition');
    expect(out.html).toContain('BICSI ITSIMM');
  });

  it('describes the Fluke DSX-8000 / OptiFiber Pro testing protocol', () => {
    const out = renderStandards(input());
    expect(out.html).toContain('Fluke DSX-8000');
    expect(out.html).toContain('Fluke OptiFiber Pro');
    expect(out.html).toContain('Tier 1');
    expect(out.html).toContain('Tier 2 OTDR');
    expect(out.html).toContain('100% of installed terminations');
  });

  it('references NFPA 72, NFPA 75, and ADA accessibility', () => {
    const out = renderStandards(input());
    expect(out.html).toContain('NFPA 72');
    expect(out.html).toContain('NFPA 75');
    expect(out.html).toContain('ADA Standards for Accessible Design');
  });

  it('lists the 9 close-out document types including LinkWare + labeling register', () => {
    const out = renderStandards(input());
    const closeBlock = out.html.split('<h2>Submittals')[1] ?? '';
    const items = (closeBlock.match(/<li>/g) ?? []).length;
    expect(items).toBeGreaterThanOrEqual(9);
    expect(closeBlock).toContain('LinkWare test certifications');
    expect(closeBlock).toContain('TIA-606-C Class 3');
    expect(closeBlock).toContain('As-built drawings');
  });
});
