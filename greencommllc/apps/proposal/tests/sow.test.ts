/**
 * renderSow — structural tests on the 8-section Statement of Work
 * (now in the summary visual language).
 */

import { describe, it, expect } from 'vitest';
import { renderSow, type SowInput } from '@/outputs/sow';
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

function mkIntake(crosswalk: Record<string, CrosswalkEntry>): IntakeState {
  return {
    files: [], runs: [], currentPhase: 4,
    phases: ['parse', 'dict', 'conf', 'synth'],
    stage: 'final',
    crosswalk,
    openItems: [], supplements: {},
    closeoutItems: {}, pricingTiers: null, decisionInputs: null,
    altDeducts: {}, customization: null, redFlags: [], generatedAt: {},
    closeoutSort: 'due'
  };
}

const session: SessionState = { lines: [], meta: {} };

function input(crosswalk: Record<string, CrosswalkEntry>): SowInput {
  return {
    intake: mkIntake(crosswalk),
    session,
    brand: GCC_BRAND,
    logos: fakeLogos,
    projectLabel: 'Demo Office Build'
  };
}

describe('renderSow', () => {
  it('returns a CLIENT-classification PDF with summary visual language', () => {
    const out = renderSow(input({
      gc_company_name:   row('McCarthy Building'),
      gc_estimator_name: row('Jane Estimator')
    }));
    expect(out.filename).toBe('04 Statement of Work - Demo Office Build.pdf');
    expect(out.html).toContain('<!doctype html>');
    expect(out.html).toContain('class="gcc-ribbon client">CLIENT');
    expect(out.html).toContain('class="qbs-title"');
    expect(out.html).toContain('Statement of Work');
  });

  it('renders the eight SOW sections (3+4 and 6+7 combined for layout)', () => {
    const out = renderSow(input({
      gc_company_name: row('McCarthy Building')
    }));
    expect(out.html).toContain('1. Parties &amp; Definitions');
    expect(out.html).toContain('2. Scope Deliverables');
    expect(out.html).toContain('3 &amp; 4. Responsibilities');
    expect(out.html).toContain('5. Schedule');
    expect(out.html).toContain('6 &amp; 7. Commercial Terms &amp; Warranty');
    expect(out.html).toContain('8. Acceptance');
  });

  it('names the General Contractor when gc_* is set', () => {
    const out = renderSow(input({
      gc_company_name:   row('McCarthy Building'),
      gc_estimator_name: row('Jane Estimator')
    }));
    expect(out.html).toContain('McCarthy Building');
    expect(out.html).toContain('General Contractor');
  });

  it('names the Owner when only client_* is set', () => {
    const out = renderSow(input({
      client_company_name: row('Mercy Hospital'),
      client_contact_name: row('Pat Owner')
    }));
    expect(out.html).toContain('Mercy Hospital');
    expect(out.html).toContain('Owner');
  });

  it('includes the schedule table with 6 phases and an AIA G702/G703 line', () => {
    const out = renderSow(input({
      gc_company_name: row('McCarthy Building')
    }));
    expect(out.html).toContain('5. Schedule');
    expect(out.html).toContain('AIA G702/G703');
    expect(out.html).toContain('Submittals');
    expect(out.html).toContain('Mobilization');
    expect(out.html).toContain('Rough-in pull');
    expect(out.html).toContain('Termination');
    expect(out.html).toContain('Test &amp; certify');
    expect(out.html).toContain('Close-out');
  });

  it('includes the warranty triad and §8 acceptance reference', () => {
    const out = renderSow(input({
      gc_company_name: row('McCarthy Building')
    }));
    expect(out.html).toContain('Lifetime of the installed system');
    expect(out.html).toContain('25-year manufacturer warranty');
    expect(out.html).toContain('AMC revisits');
    expect(out.html).toContain('Bid Proposal Section 8 Acceptance');
  });

  it('escapes HTML in project label and recipient values', () => {
    const out = renderSow({
      ...input({ gc_company_name: row('<script>x</script>') }),
      projectLabel: '<evil>'
    });
    expect(out.html).toContain('&lt;script&gt;');
    expect(out.html).toContain('&lt;evil&gt;');
    expect(out.html).not.toContain('<script>x</script>');
  });
});
