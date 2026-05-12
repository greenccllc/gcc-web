/**
 * gccHtmlShell output tests — structure-only assertions.
 * We don't byte-diff the HTML; we verify the shape invariants so
 * future refactors stay compatible with the legacy output shell.
 */

import { describe, it, expect } from 'vitest';
import { gccHtmlShell, docHero } from '@/outputs/shellHtml';
import { GCC_BRAND } from '@brand/gcc';
import type { LogoMap } from '@models/brand';

// Fake base64 logos — the content doesn't matter, just that the <img>
// attribute is present.
const fakeLogos: LogoMap = {
  emblem:     'data:image/png;base64,AAA=',
  stacked:    'data:image/png;base64,BBB=',
  letterhead: 'data:image/png;base64,CCC='
};
const deps = { brand: GCC_BRAND, logos: fakeLogos };

describe('gccHtmlShell', () => {
  it('produces a full HTML document with <head>, <body>, shell classes', () => {
    const html = gccHtmlShell('Test Doc', '<p>hello</p>', {}, deps);
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('<style>');
    expect(html).toContain('class="gcc-doc"');
    expect(html).toContain('class="gcc-letterhead"');
    expect(html).toContain('class="gcc-footer"');
  });

  it('renders the CLIENT ribbon when no classification is given', () => {
    const html = gccHtmlShell('Test', '', {}, deps);
    expect(html).toMatch(/<span class="gcc-ribbon client">CLIENT<\/span>/);
    expect(html).not.toContain('DO NOT DISTRIBUTE');
  });

  it('renders the INTERNAL ribbon + DO NOT DISTRIBUTE suffix', () => {
    const html = gccHtmlShell('Test', '', { classification: 'INTERNAL' }, deps);
    expect(html).toContain('class="gcc-ribbon internal"');
    expect(html).toContain('DO NOT DISTRIBUTE');
  });

  it('embeds the emblem logo by default + wordmark text', () => {
    const html = gccHtmlShell('Test', '', {}, deps);
    expect(html).toContain('class="emblem"');
    expect(html).toContain('data:image/png;base64,AAA=');
    expect(html).toContain('Green Communications');
  });

  it('embeds the letterhead logo without wordmark when logo:letterhead', () => {
    const html = gccHtmlShell('Test', '', { logo: 'letterhead' }, deps);
    expect(html).toContain('class="letterhead"');
    expect(html).toContain('data:image/png;base64,CCC=');
    // wordmark only emitted for emblem variant
    expect(html).not.toMatch(/<span class="n1">Green Communications<\/span>/);
  });

  it('suppresses the legacy title band when asked', () => {
    const html = gccHtmlShell('Test', '', { suppressTitle: true }, deps);
    expect(html).not.toContain('class="gcc-title-band"');
  });

  it('escapes HTML in title + docKind + subline', () => {
    const html = gccHtmlShell(
      '<script>evil</script>',
      '',
      { docKind: 'A & B', subline: 'x<y' },
      deps
    );
    expect(html).toContain('&lt;script&gt;evil&lt;/script&gt;');
    expect(html).toContain('A &amp; B');
    expect(html).toContain('x&lt;y');
  });

  it('injects the Mermaid lazy loader (as a split string, not a bare </script>)', () => {
    const html = gccHtmlShell('Test', '<pre class="mermaid">flowchart LR; A-->B</pre>', {}, deps);
    // The loader is there
    expect(html).toContain('cdn.jsdelivr.net/npm/mermaid');
    // The raw </script> inside the string literal is escaped
    // so the HTML parser sees only two script tags: the inner loader + anything in innerHtml.
    const scriptCount = (html.match(/<script[^>]*>/gi) ?? []).length;
    // Just the Mermaid loader itself
    expect(scriptCount).toBe(1);
  });

  it('uses landscape @page when landscape=true', () => {
    const html = gccHtmlShell('Test', '', { landscape: true }, deps);
    expect(html).toContain('Letter landscape');
  });
});

describe('docHero', () => {
  it('renders kind + title + sub + meta', () => {
    const html = docHero('Proposal Title', {
      kind: '02 · Executive Summary',
      sub: 'GCC turn-key Div 27/28',
      meta: [
        { label: 'Client', value: 'Example Inc.' },
        { label: 'Value',  value: '$145,000' }
      ]
    });
    expect(html).toContain('class="doc-hero"');
    expect(html).toContain('class="h-kind"');
    expect(html).toContain('02 · Executive Summary');
    expect(html).toContain('class="h-title"');
    expect(html).toContain('Proposal Title');
    expect(html).toContain('class="h-sub"');
    expect(html).toContain('class="h-meta"');
    expect(html).toContain('<dt>Client</dt>');
    expect(html).toContain('<dd>$145,000</dd>');
  });

  it('omits optional sections when not provided', () => {
    const html = docHero('Just a title');
    expect(html).toContain('Just a title');
    expect(html).not.toContain('class="h-kind"');
    expect(html).not.toContain('class="h-sub"');
    expect(html).not.toContain('class="h-meta"');
  });
});
