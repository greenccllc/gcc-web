/**
 * Tests for filename classification. These pin the legacy behavior so
 * the rewrite can't silently drift.
 */

import { describe, it, expect } from 'vitest';
import { classifyFile, isTextyFile } from '@/decoders/classify';

describe('classifyFile', () => {
  it('rfp name wins over pdf extension', () => {
    const r = classifyFile('Parkway_North_RFP_2027.pdf');
    expect(r.class).toBe('rfp');
  });

  it('spec hint wins for specification docs', () => {
    const r = classifyFile('Division-27-Spec.pdf');
    expect(r.class).toBe('spec');
  });

  it('notes hint wins for minutes / RFI / walk-through', () => {
    expect(classifyFile('preconstruction-meeting-minutes.pdf').class).toBe('notes');
    expect(classifyFile('RFI-003.docx').class).toBe('notes');
    expect(classifyFile('site-walk-through-notes.md').class).toBe('notes');
  });

  it('plan hint wins for architectural / LV drawings', () => {
    expect(classifyFile('T-100 Low-Voltage Plan.pdf').class).toBe('plan');
    expect(classifyFile('E-401 Electrical Riser.pdf').class).toBe('plan');
    expect(classifyFile('Floor Layout.pdf').class).toBe('plan');
  });

  it('falls through to extension when no name hint', () => {
    expect(classifyFile('printout.dwg').class).toBe('plan');
    expect(classifyFile('scan.tiff').class).toBe('plan');
  });

  it('returns "other" when nothing hints at a category', () => {
    expect(classifyFile('readme.md').class).toBe('other');
    expect(classifyFile('photo.heic').class).toBe('other');
  });

  it('extracts sheet code from uppercase filenames (drawings almost always are)', () => {
    expect(classifyFile('T-101.pdf').sheetCode).toBe('T-101');
    expect(classifyFile('E401.pdf').sheetCode).toBe('E401');
    expect(classifyFile('TC-02.1 LV Riser.pdf').sheetCode).toBe('TC-02.1');
  });

  it('legacy sheet-code regex is case-sensitive — lowercase drawings are not auto-coded', () => {
    // Real drawings are uppercase; pinning this so the rewrite matches legacy behavior.
    expect(classifyFile('t-101.pdf').sheetCode).toBeNull();
  });

  it('returns null sheetCode when none is present', () => {
    expect(classifyFile('scope of work.pdf').sheetCode).toBeNull();
  });

  it('extracts drawing scale when present', () => {
    const r = classifyFile('Sheet A-100 1/8"=1\'-0".pdf');
    expect(r.scale).not.toBeNull();
    expect(r.scale).toMatch(/=/);
  });

  it('returns null scale when none is present', () => {
    expect(classifyFile('T-101.pdf').scale).toBeNull();
  });
});

describe('isTextyFile', () => {
  it('treats common text extensions as text', () => {
    expect(isTextyFile('readme.md')).toBe(true);
    expect(isTextyFile('data.csv')).toBe(true);
    expect(isTextyFile('config.json')).toBe(true);
  });

  it('treats pdfs as not texty', () => {
    expect(isTextyFile('spec.pdf')).toBe(false);
  });

  it('falls back to mime type when extension does not match', () => {
    expect(isTextyFile('notes', 'text/plain')).toBe(true);
    expect(isTextyFile('blob', 'application/json')).toBe(true);
    expect(isTextyFile('image.bin', 'image/png')).toBe(false);
  });
});
