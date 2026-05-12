/**
 * File classification — name-based hints that decide how each uploaded
 * file feeds the extraction pipeline.
 *
 * Ported 1:1 from the regexes at lines 10109–10116 of
 * bundle-builder.html so behavior matches the legacy app.
 */

import type { FileClass } from '@models/intake';

/** Files we can pull text out of via FileReader without a specialized decoder. */
export const TEXTY_RX = /\.(txt|md|markdown|csv|tsv|json|xml|yaml|yml|html|htm|rtf|log|docx-txt)$/i;

/** File extensions that are always treated as drawings/plans regardless of name. */
export const PLAN_EXT = /\.(pdf|dwg|dxf|dwf|rvt|ifc|png|jpg|jpeg|tif|tiff)$/i;

/** Filename hints for plan/drawing documents. */
export const PLAN_NAME =
  /(plan|drawing|sheet|floor|layout|riser|one[-\s]?line|single[-\s]?line|arch|electrical|low[-\s]?voltage|lv|tele|security|mech|struct|civil|e-?\d|t-?\d|a-?\d|ls-?\d)/i;

/** Filename hints for RFP / RFQ / bid solicitations. */
export const RFP_NAME =
  /(rfp|rfq|itb|bid[-\s]?invite|invitation[-\s]?to[-\s]?bid|solicitation|scope[-\s]?of[-\s]?work|sow)/i;

/** Filename hints for specification documents. */
export const SPEC_NAME =
  /(spec|specification|division[-\s]?\d{2}|csi|basis[-\s]?of[-\s]?design|submittal)/i;

/** Filename hints for notes / minutes / RFIs. */
export const NOTES_NAME = /(note|memo|meeting|minutes|walk[-\s]?through|kickoff|rfi)/i;

/** Sheet-code pattern: letter-prefix + digits (e.g. "T-100", "E401", "TC-02.1"). */
export const SHEET_CODE_RX =
  /(?:^|[\s_\-\/\[\(])([A-Z]{1,3}-?\d{2,4}(?:\.\d{1,2})?)(?=[\s_\-\.\)\]]|$)/;

/** Drawing-scale pattern: "1/8\"=1'-0\"", "1\"=50'", etc. */
export const SCALE_RX =
  /(\d+(?:\/\d+)?["'\u2019\u201D]?\s*=\s*\d+['\u2019]?(?:\s*-\s*\d+["\u201D]?)?)/;

export interface FileClassification {
  class: FileClass;
  /** Uppercased sheet code if the filename contained one. */
  sheetCode: string | null;
  /** Raw scale string if the filename contained one. */
  scale: string | null;
}

/**
 * Classify a filename. Pure — no I/O, no globals.
 * Name-based hints win over extension: "RFP.pdf" is an RFP, not a plan.
 */
export function classifyFile(name: string): FileClassification {
  const cls: FileClass = RFP_NAME.test(name)
    ? 'rfp'
    : SPEC_NAME.test(name)
    ? 'spec'
    : NOTES_NAME.test(name)
    ? 'notes'
    : PLAN_NAME.test(name)
    ? 'plan'
    : PLAN_EXT.test(name)
    ? 'plan'
    : 'other';
  const sheetMatch = name.match(SHEET_CODE_RX);
  const sheetCode = sheetMatch ? sheetMatch[1]!.toUpperCase() : null;
  const scaleMatch = name.match(SCALE_RX);
  const scale = scaleMatch ? scaleMatch[1]! : null;
  return { class: cls, sheetCode, scale };
}

/**
 * True if the file can be read as text without a binary decoder.
 * (PDFs/XLSX/DWGs are NOT texty — they need their own decoder.)
 */
export function isTextyFile(name: string, mimeType?: string): boolean {
  if (TEXTY_RX.test(name)) return true;
  if (!mimeType) return false;
  return mimeType.startsWith('text/') || mimeType === 'application/json';
}
