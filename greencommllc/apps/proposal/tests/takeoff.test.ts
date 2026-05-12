/**
 * Tests for the takeoff-JSON decoder. Pins the endpoint math
 * ("2D" device = 2 drops, fiber strand mark = 12-strand bundle)
 * so the rewrite matches the legacy app byte-for-byte.
 */

import { describe, it, expect } from 'vitest';
import {
  takeoffToCandidates,
  parseTakeoffJson,
  classifyDeviceWord,
  DEVICE_LEXICON,
  TAKEOFF_MAP
} from '@/decoders/takeoff';

describe('classifyDeviceWord', () => {
  it('normalizes AP / WAP to the same canonical form', () => {
    expect(classifyDeviceWord('ap')).toBe('WAP');
    expect(classifyDeviceWord('WAP')).toBe('WAP');
  });

  it('ignores trailing punctuation', () => {
    expect(classifyDeviceWord('CAM.')).toBe('CAMERA');
    expect(classifyDeviceWord('2D-')).toBe('DATA_OUTLET_2');
  });

  it('returns null for unknown words', () => {
    expect(classifyDeviceWord('XYZ123')).toBeNull();
    expect(classifyDeviceWord('')).toBeNull();
    expect(classifyDeviceWord(null as unknown as string)).toBeNull();
  });
});

describe('takeoffToCandidates', () => {
  it('sums endpoint counts with the legacy multipliers', () => {
    const t = takeoffToCandidates({
      DATA_OUTLET_1: 10,
      DATA_OUTLET_2: 20,
      WAP: 8,
      CAMERA: 6
    });
    expect(t.endpointSums).toEqual({
      data_drops_count: 10 * 1 + 20 * 2,
      ap_count: 8,
      camera_count_commercial: 6
    });
    expect(t.unmapped).toEqual({});
  });

  it('accepts raw lexicon keys like "2D" and "WAP"', () => {
    const t = takeoffToCandidates({ '2D': 5, AP: 2 });
    expect(t.endpointSums['data_drops_count']).toBe(10);
    expect(t.endpointSums['ap_count']).toBe(2);
  });

  it('maps fiber strand marks to a 12-strand bundle', () => {
    const t = takeoffToCandidates({ FIBER: 4 });
    expect(t.endpointSums['fiber_strands_count']).toBe(48);
  });

  it('bubbles unknown devices into unmapped', () => {
    const t = takeoffToCandidates({ DISPLAY: 3, AUDIO: 1 });
    expect(t.endpointSums).toEqual({});
    expect(t.unmapped).toEqual({ DISPLAY: 3, AUDIO: 1 });
  });

  it('is safe against missing/undefined totals', () => {
    const t = takeoffToCandidates(undefined);
    expect(t.endpointSums).toEqual({});
    expect(t.unmapped).toEqual({});
  });
});

describe('parseTakeoffJson', () => {
  it('errors on invalid JSON', () => {
    const r = parseTakeoffJson('not json');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Invalid JSON/);
  });

  it('errors when the shape is wrong', () => {
    const r = parseTakeoffJson('{"job":"x"}');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Unrecognized/);
  });

  it('derives sheetIds, deviceCount, and candidates from a valid file', () => {
    const payload = JSON.stringify({
      job: 'Parkway',
      pages: [
        { sheet_id: 'T-100', page: 1 },
        { sheet_id: 'T-101', page: 2 },
        { sheet_id: 'T-100', page: 3 } // dupe, should collapse
      ],
      totals: { '2D': 50, WAP: 4, CAMERA: 2 }
    });
    const r = parseTakeoffJson(payload);
    expect(r.ok).toBe(true);
    expect(r.sheetIds).toEqual(['T-100', 'T-101']);
    expect(r.deviceCount).toBe(56);
    expect(r.candidates?.endpointSums['data_drops_count']).toBe(100);
    expect(r.candidates?.endpointSums['ap_count']).toBe(4);
    expect(r.candidates?.endpointSums['camera_count_commercial']).toBe(2);
  });
});

describe('lexicon / map integrity', () => {
  it('every mapped canonical device has a lexicon entry too', () => {
    // Every TAKEOFF_MAP key should be something DEVICE_LEXICON can produce
    // (either directly as a value, or as a known alias).
    const lexValues = new Set(Object.values(DEVICE_LEXICON));
    for (const canonical of Object.keys(TAKEOFF_MAP)) {
      // CARD_READER lives only in TAKEOFF_MAP historically (DEVICE_LEXICON maps
      // CR -> CARD_READER), so CR must resolve here.
      if (canonical === 'CARD_READER') {
        expect(DEVICE_LEXICON['CR']).toBe('CARD_READER');
      } else {
        expect(lexValues.has(canonical)).toBe(true);
      }
    }
  });
});
