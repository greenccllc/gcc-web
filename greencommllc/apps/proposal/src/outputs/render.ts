/**
 * Single dispatch point for deliverable rendering. Maps a TocDef
 * (by handler name / key) to the correct render function in src/outputs.
 *
 * Returns a placeholder for any deliverable that doesn't have a real
 * renderer yet — that's no longer the common case after wiring.
 */

import type { GccBrand, LogoMap } from '@models/brand';
import type { IntakeState, SessionState } from '@models/intake';
import type { TocDef } from '@models/toc';

import { renderCoverLetter } from './coverLetter';
import { renderBidOverview } from './bidOverview';
import { renderBidProposal } from './bidProposal';
import { renderSow } from './sow';
import { renderSov } from './sov';
import { renderQualifications } from './qualifications';
import { renderStandards } from './standards';
import { renderFinanceSummary } from './financeSummary';

export interface RenderInput {
  intake: IntakeState;
  session: SessionState;
  brand: GccBrand;
  logos: LogoMap;
}

export interface RenderOutput {
  html: string;
  filename: string;
  ported: boolean; // true when a real renderer ran (vs placeholder)
}

function dropsFor(intake: IntakeState): number {
  const cw = intake.crosswalk;
  const n = (k: string) => Number(cw[k]?.value) || 0;
  return n('data_drops_count') + n('ap_count') + n('camera_count_commercial') + n('door_positions_count');
}

function placeholderHtml(label: string): string {
  return `<!doctype html>
<html><body style="font-family:Calibri,Inter,sans-serif; padding:60px; color:#14181C; background:#FAFAF8;">
  <div style="max-width:640px; margin:0 auto; background:white; border-left:6px solid #D4AF37; padding:32px 40px; border-radius:4px; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="font-size:10pt; color:#D4AF37; font-weight:800; letter-spacing:0.2em; text-transform:uppercase; margin-bottom:6pt;">Preview not yet ported</div>
    <h1 style="color:#1B5E20; font-size:22pt; font-weight:800; margin:0 0 10pt;">${label}</h1>
    <p style="color:#374850; line-height:1.55; margin:0;">
      No renderer wired up yet. Open the legacy app for now.
    </p>
  </div>
</body></html>`;
}

export function renderDeliverable(def: TocDef, input: RenderInput): RenderOutput {
  const base = { intake: input.intake, session: input.session, brand: input.brand, logos: input.logos };
  const handler = def.handler;
  const key = def.key;

  if (handler === 'onExportCoverLetter' || key === 'cover') {
    const out = renderCoverLetter(base);
    return { html: out.html, filename: out.filename, ported: true };
  }
  if (handler === 'onExportBidOverview' || key === 'overview') {
    const out = renderBidOverview(base);
    return { html: out.html, filename: out.filename, ported: true };
  }
  if (key === 'sov') {
    const out = renderSov(base);
    return { html: out.html, filename: out.filename, ported: true };
  }
  if (handler === 'onExportBidProposal' || key === 'proposal') {
    const out = renderBidProposal(base);
    return { html: out.html, filename: out.filename, ported: true };
  }
  if (handler === 'onExportSOW' || key === 'sow') {
    const out = renderSow(base);
    return { html: out.html, filename: out.filename, ported: true };
  }
  if (handler === 'onExportQualifications' || key === 'quals') {
    const out = renderQualifications(base);
    return { html: out.html, filename: out.filename, ported: true };
  }
  if (handler === 'onExportStandards' || key === 'stds') {
    const out = renderStandards(base);
    return { html: out.html, filename: out.filename, ported: true };
  }
  if (handler === 'onExportFinanceSummary' || key === 'finance') {
    const out = renderFinanceSummary({ ...base, drops: dropsFor(input.intake) });
    return { html: out.html, filename: out.filename, ported: true };
  }

  return {
    html: placeholderHtml(def.label),
    filename: def.number + ' - ' + def.label + ' (preview).html',
    ported: false
  };
}
