/**
 * Takeoff JSON decoder — maps devices detected by an external takeoff tool
 * (typically the Python vector extractor in `../estimator/`) to crosswalk
 * endpoint tokens.
 *
 * Ported from `DEVICE_LEXICON`, `TAKEOFF_MAP`, `takeoffToCandidates`, and
 * `handleTakeoffJson` at lines 10232–10300 + 10520 of bundle-builder.html.
 */

/** Raw device code → canonical device type. Legacy aliases preserved. */
export const DEVICE_LEXICON: Readonly<Record<string, string>> = {
  '1D': 'DATA_OUTLET_1', '2D': 'DATA_OUTLET_2', '3D': 'DATA_OUTLET_3', '4D': 'DATA_OUTLET_4',
  'D1': 'DATA_OUTLET_1', 'D2': 'DATA_OUTLET_2',
  WAP: 'WAP', AP: 'WAP',
  CAM: 'CAMERA', CAMERA: 'CAMERA',
  CR: 'CARD_READER', REX: 'REX', ACS: 'ACS', DOOR: 'ACS_DOOR',
  IFP: 'INTERACTIVE_PANEL', TV: 'DISPLAY', SPEAKER: 'AUDIO',
  PA: 'PAGING', CLOCK: 'CLOCK', INTERCOM: 'INTERCOM',
  ELEV: 'ELEVATOR_PHONE', ETR: 'EMERGENCY_RESPONDER', CALL: 'CALL_STATION',
  RACK: 'RACK', RISER: 'RISER', FIBER: 'FIBER'
};

export interface TakeoffMapEntry {
  /** Crosswalk token this canonical device rolls into. */
  token: string;
  /** Endpoint multiplier — `2D` device = 2 data drops. */
  mult: number;
}

/**
 * Canonical-device → crosswalk-token map. Only devices with a real
 * endpoint meaning live here — interactive panels, displays, audio,
 * paging, etc. count as hardware but don't inflate endpoint totals.
 */
export const TAKEOFF_MAP: Readonly<Record<string, TakeoffMapEntry>> = {
  DATA_OUTLET_1: { token: 'data_drops_count', mult: 1 },
  DATA_OUTLET_2: { token: 'data_drops_count', mult: 2 },
  DATA_OUTLET_3: { token: 'data_drops_count', mult: 3 },
  DATA_OUTLET_4: { token: 'data_drops_count', mult: 4 },
  WAP:           { token: 'ap_count', mult: 1 },
  CAMERA:        { token: 'camera_count_commercial', mult: 1 },
  CARD_READER:   { token: 'door_positions_count', mult: 1 },
  ACS_DOOR:      { token: 'door_positions_count', mult: 1 },
  RACK:          { token: 'rack_count', mult: 1 },
  // One strand mark typically = 12-strand bundle. Legacy-documented.
  FIBER:         { token: 'fiber_strands_count', mult: 12 }
};

/** Normalize a raw device label into something the lexicon understands. */
export function classifyDeviceWord(raw: unknown): string | null {
  const w = String(raw ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+$/, '')
    .trim();
  return DEVICE_LEXICON[w] ?? null;
}

export interface TakeoffTotals {
  /** Raw device code or canonical name → count. */
  [device: string]: number | string;
}

export interface TakeoffPage {
  sheet_id?: string | null;
  page?: number;
  [k: string]: unknown;
}

export interface TakeoffFile {
  job?: string;
  pages?: TakeoffPage[];
  totals?: TakeoffTotals;
  [k: string]: unknown;
}

export interface TakeoffCandidates {
  /** crosswalk-token → summed count. */
  endpointSums: Record<string, number>;
  /** devices with no TAKEOFF_MAP entry — bubble up as open items. */
  unmapped: Record<string, number>;
}

/** Convert raw takeoff totals into a crosswalk patch. Pure. */
export function takeoffToCandidates(totals: TakeoffTotals | undefined): TakeoffCandidates {
  const endpointSums: Record<string, number> = {};
  const unmapped: Record<string, number> = {};
  for (const [rawDev, n] of Object.entries(totals ?? {})) {
    const count = Number(n) || 0;
    // Accept both normalized names ("DATA_OUTLET_2") and raw lexicon keys ("2D").
    const dev = TAKEOFF_MAP[rawDev]
      ? rawDev
      : DEVICE_LEXICON[rawDev] && TAKEOFF_MAP[DEVICE_LEXICON[rawDev]]
      ? DEVICE_LEXICON[rawDev]
      : rawDev;
    const m = dev ? TAKEOFF_MAP[dev] : undefined;
    if (m) {
      endpointSums[m.token] = (endpointSums[m.token] || 0) + count * m.mult;
    } else {
      unmapped[dev ?? rawDev] = (unmapped[dev ?? rawDev] || 0) + count;
    }
  }
  return { endpointSums, unmapped };
}

export interface ParseTakeoffResult {
  ok: boolean;
  error?: string;
  data?: TakeoffFile;
  candidates?: TakeoffCandidates;
  /** Deduped sheet IDs surfaced by the takeoff. */
  sheetIds?: string[];
  /** Total device count across the pages. */
  deviceCount?: number;
}

/**
 * Parse + validate raw takeoff text. Returns a structured result rather
 * than throwing so callers can surface errors in the UI.
 */
export function parseTakeoffJson(raw: string): ParseTakeoffResult {
  let data: TakeoffFile;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: 'Invalid JSON: ' + (e as Error).message };
  }
  if (!data || typeof data !== 'object' || !data.totals || typeof data.totals !== 'object') {
    return {
      ok: false,
      error: 'Unrecognized takeoff file. Expected keys: { job, pages, totals }.'
    };
  }
  const candidates = takeoffToCandidates(data.totals);
  const pages = Array.isArray(data.pages) ? data.pages : [];
  const sheets = pages
    .map((p) => p && (typeof p === 'object' ? p.sheet_id : null))
    .filter((s): s is string => typeof s === 'string' && s.length > 0);
  const sheetIds = Array.from(new Set(sheets));
  const deviceCount = Object.values(data.totals).reduce(
    (a: number, b) => a + (Number(b) || 0),
    0
  );
  return { ok: true, data, candidates, sheetIds, deviceCount };
}
