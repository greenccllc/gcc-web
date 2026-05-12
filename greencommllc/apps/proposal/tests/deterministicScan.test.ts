/**
 * Tests for the deterministic (regex-based) scanner. This is the TS-app
 * replacement for the Claude-powered parse phase — it finds obvious
 * count-patterns in texty source files without needing a backend.
 */

import { describe, it, expect } from 'vitest';
import {
  scanText,
  hitsToCandidates,
  scanTextForCandidates,
  DETERMINISTIC_RULES
} from '@/decoders/deterministicScan';

describe('scanText — core count patterns', () => {
  it('finds data drop counts', () => {
    const text = 'The scope includes 220 Cat6A data drops distributed across three floors.';
    const hits = scanText(text);
    const drop = hits.find(h => h.token === 'data_drops_count');
    expect(drop?.value).toBe(220);
  });

  it('finds plain "drops" without the cat-cable prefix', () => {
    const text = 'Install 48 drops on the main floor.';
    const hits = scanText(text);
    expect(hits.find(h => h.token === 'data_drops_count')?.value).toBe(48);
  });

  it('finds access-point counts in multiple forms', () => {
    expect(scanText('24 wireless access points required.').find(h => h.token === 'ap_count')?.value).toBe(24);
    expect(scanText('Install 18 APs across the campus.').find(h => h.token === 'ap_count')?.value).toBe(18);
    expect(scanText('Deploy 12 WAPs per floor.').find(h => h.token === 'ap_count')?.value).toBe(12);
  });

  it('finds camera counts', () => {
    expect(scanText('Install 32 IP cameras on perimeter.').find(h => h.token === 'camera_count_commercial')?.value).toBe(32);
    expect(scanText('Provide 24 surveillance cameras at all entries.').find(h => h.token === 'camera_count_commercial')?.value).toBe(24);
  });

  it('finds door-position counts via reader / access-controlled patterns', () => {
    expect(scanText('Install 12 card readers.').find(h => h.token === 'door_positions_count')?.value).toBe(12);
    expect(scanText('Secure 8 access-controlled doors.').find(h => h.token === 'door_positions_count')?.value).toBe(8);
    expect(scanText('Provide 16 door positions with badge access.').find(h => h.token === 'door_positions_count')?.value).toBe(16);
  });

  it('finds fiber-strand counts (bare and hyphenated)', () => {
    expect(scanText('Pull a 48-strand OS2 fiber trunk.').find(h => h.token === 'fiber_strands_count')?.value).toBe(48);
    expect(scanText('Provide 24 strand bundle to MDF.').find(h => h.token === 'fiber_strands_count')?.value).toBe(24);
  });

  it('finds rack counts', () => {
    expect(scanText('4 network racks per IDF closet.').find(h => h.token === 'rack_count')?.value).toBe(4);
    expect(scanText('Install 2 server racks in main.').find(h => h.token === 'rack_count')?.value).toBe(2);
  });

  it('returns empty array for empty input', () => {
    expect(scanText('')).toEqual([]);
    expect(scanText(null as unknown as string)).toEqual([]);
  });

  it('does not match unrelated numbers', () => {
    const text = 'The building is 12 stories tall with 1200 occupants.';
    const hits = scanText(text);
    expect(hits).toHaveLength(0);
  });

  it('captures an evidence window around each hit', () => {
    const text = 'Section 27-15: install 220 Cat6A data drops per sheet E-401.';
    const hits = scanText(text);
    const drop = hits.find(h => h.token === 'data_drops_count');
    expect(drop?.evidence).toContain('220');
    expect(drop?.evidence).toContain('drops');
  });
});

describe('hitsToCandidates', () => {
  it('collapses multiple hits per token to the max value', () => {
    const text = '4 drops in the breakroom. Main scope: 220 data drops.';
    const hits = scanText(text);
    const cands = hitsToCandidates(hits, 'rfp.pdf');
    expect(cands['data_drops_count']?.value).toBe(220);
  });

  it('attaches the source filename and evidence snippet', () => {
    const text = 'Install 24 IP cameras at main lobby.';
    const cands = scanTextForCandidates(text, 'spec.pdf');
    expect(cands['camera_count_commercial']?.src).toContain('spec.pdf');
    expect(cands['camera_count_commercial']?.src).toContain('cameras');
  });
});

describe('DETERMINISTIC_RULES — sanity', () => {
  it('covers the core endpoint tokens required for Stage 2', () => {
    const tokens = DETERMINISTIC_RULES.map(r => r.token);
    expect(tokens).toContain('data_drops_count');
    expect(tokens).toContain('ap_count');
    expect(tokens).toContain('camera_count_commercial');
    expect(tokens).toContain('door_positions_count');
    expect(tokens).toContain('fiber_strands_count');
  });

  it('every rule has a single-digit or larger numeric capture group', () => {
    for (const r of DETERMINISTIC_RULES) {
      expect(r.re.source).toMatch(/\\d/);
      // All rules should have the 'g' flag so exec() loops find all hits.
      expect(r.re.flags).toContain('g');
    }
  });
});
