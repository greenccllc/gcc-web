/**
 * renderCoverLetter — structure-only assertions across the three recipient modes.
 */

import { describe, it, expect } from 'vitest';
import { renderCoverLetter, type CoverLetterInput } from '@/outputs/coverLetter';
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

const session: SessionState = { lines: [], meta: { propnum: 'GCC-BID-2026-001' } };

function input(crosswalk: Record<string, CrosswalkEntry>): CoverLetterInput {
  return {
    intake: mkIntake(crosswalk),
    session,
    brand: GCC_BRAND,
    logos: fakeLogos,
    projectLabel: 'Test Project'
  };
}

describe('renderCoverLetter', () => {
  it('returns a CLIENT-classification PDF filename + full HTML', () => {
    const out = renderCoverLetter(input({
      gc_company_name:   row('McCarthy Building'),
      gc_estimator_name: row('Jane Estimator')
    }));
    expect(out.filename).toBe('01 Cover Letter - Test Project.pdf');
    expect(out.html).toContain('<!doctype html>');
    expect(out.html).toContain('class="gcc-ribbon client">CLIENT');
    expect(out.html).toContain('01 · Cover Letter');
  });

  it('uses the letterhead logo variant', () => {
    const out = renderCoverLetter(input({
      gc_company_name: row('McCarthy Building')
    }));
    expect(out.html).toContain('class="letterhead"');
  });

  it('renders the bid (GC) salutation, headline, and Panduit warranty paragraph', () => {
    const out = renderCoverLetter(input({
      gc_company_name:   row('McCarthy Building'),
      gc_estimator_name: row('Jane Estimator'),
      bid_due_date:      row('2026-05-15')
    }));
    expect(out.html).toContain('Dear Jane Estimator,');
    expect(out.html).toContain('Low-Voltage Div 27/28 Subcontractor Bid');
    expect(out.html).toContain('Panduit / CommScope');
    expect(out.html).toContain('Bid due:');
    expect(out.html).toContain('2026-05-15');
  });

  it('renders the residential homeowner mode when only homeowner_* is set', () => {
    const out = renderCoverLetter(input({
      homeowner_name:  row('Alex Homeowner'),
      homeowner_phone: row('314-555-0100')
    }));
    expect(out.html).toContain('Dear Alex Homeowner,');
    expect(out.html).toContain('Residential Low-Voltage Installation Proposal');
    expect(out.html).toContain('whole-home coverage');
    expect(out.html).toContain('Pricing holds for 30 days');
  });

  it('falls back to owner-direct mode for client_* (no GC, no homeowner)', () => {
    const out = renderCoverLetter(input({
      client_company_name: row('Mercy Hospital'),
      client_contact_name: row('Pat Owner')
    }));
    expect(out.html).toContain('Dear Pat Owner,');
    expect(out.html).toContain('Direct-to-Owner Low-Voltage Proposal');
    expect(out.html).toContain('Pricing holds for 60 days');
  });

  it('embeds the proposal number from session.meta.propnum', () => {
    const out = renderCoverLetter(input({
      gc_company_name: row('McCarthy Building')
    }));
    expect(out.html).toContain('GCC-BID-2026-001');
  });

  it('includes the project-phases Mermaid Gantt', () => {
    const out = renderCoverLetter(input({
      gc_company_name: row('McCarthy Building')
    }));
    expect(out.html).toContain('class="mermaid"');
    expect(out.html).toContain('gantt');
    expect(out.html).toContain('Project Phase Timeline');
  });

  it('escapes HTML in project labels and recipient values', () => {
    const dangerous = renderCoverLetter({
      ...input({ gc_company_name: row('<script>x</script>') }),
      projectLabel: '<evil>'
    });
    expect(dangerous.html).toContain('&lt;script&gt;');
    expect(dangerous.html).toContain('&lt;evil&gt;');
    expect(dangerous.html).not.toContain('<script>x</script>');
  });
});
