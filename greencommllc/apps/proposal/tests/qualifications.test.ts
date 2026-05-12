/**
 * renderQualifications — structure tests + brand-derived list coverage.
 */

import { describe, it, expect } from 'vitest';
import { renderQualifications, type QualificationsInput } from '@/outputs/qualifications';
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

function input(): QualificationsInput {
  return {
    intake: mkIntake(),
    session,
    brand: GCC_BRAND,
    logos: fakeLogos,
    projectLabel: 'Demo Office Build'
  };
}

describe('renderQualifications', () => {
  it('returns a CLIENT-classification PDF filename + full HTML', () => {
    const out = renderQualifications(input());
    expect(out.filename).toBe('05 Qualifications - Demo Office Build.pdf');
    expect(out.html).toContain('<!doctype html>');
    expect(out.html).toContain('class="gcc-ribbon client">CLIENT');
    expect(out.html).toContain('05 · Contractor Qualifications');
  });

  it('names the owner from brand.owner.full_name', () => {
    const out = renderQualifications(input());
    expect(out.html).toContain(GCC_BRAND.owner.full_name);
    expect(out.html).toContain(GCC_BRAND.owner.title);
  });

  it('lists every included-upgrades entry from the brand record', () => {
    const out = renderQualifications(input());
    for (const item of GCC_BRAND.includedUpgrades) {
      // each item may have &-escaped characters so compare on the first 40 chars only
      const probe = item.slice(0, 40);
      expect(out.html).toContain(
        probe
          .replace(/&/g, '&amp;')
          .replace(/'/g, '&#39;')
      );
    }
  });

  it('lists every standard-exclusions entry + the 7 hard-coded extras', () => {
    const out = renderQualifications(input());
    for (const item of GCC_BRAND.standardExclusions) {
      const probe = item.slice(0, 30)
        .replace(/&/g, '&amp;')
        .replace(/'/g, '&#39;');
      expect(out.html).toContain(probe);
    }
    expect(out.html).toContain('Concrete cutting, coring');
    expect(out.html).toContain('Asbestos');
    expect(out.html).toContain('Network active equipment');
    expect(out.html).toContain('Removal or reuse of existing cabling');
  });

  it('includes the qualifications table with entity + insurance + test equipment rows', () => {
    const out = renderQualifications(input());
    expect(out.html).toContain('GreenComm LLC, Missouri LLC');
    expect(out.html).toContain('$1M / $2M GL');
    expect(out.html).toContain('Fluke DSX-8000');
    expect(out.html).toContain('Panduit Certified Installer');
  });

  it('includes the differentiators section naming the owner', () => {
    const out = renderQualifications(input());
    const diffBlock = out.html.split('<h2>Differentiators</h2>')[1] ?? '';
    expect(diffBlock).toContain('Cat 6A baseline');
    expect(diffBlock).toContain('100% certification');
    expect(diffBlock).toContain(GCC_BRAND.owner.full_name);
  });
});
