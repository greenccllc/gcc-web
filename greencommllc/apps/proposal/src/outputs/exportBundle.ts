import JSZip from 'jszip';
import { tocInScope, type TocDef } from '@models/toc';
import { defaultCustomization } from '@models/customization';
import type { IntakeState, SessionState } from '@models/intake';
import { GCC_BRAND } from '@brand/gcc';
import { renderDeliverable } from './render';
import * as styledStorage from '@/themes/styledStorage';

export interface ExportItem {
  def: TocDef;
  filename: string;
  html: string;
  styled: boolean;
}

const placeholderLogos = {
  emblem: 'data:image/png;base64,',
  stacked: 'data:image/png;base64,',
  letterhead: 'data:image/png;base64,'
};

function renderOriginal(def: TocDef, intake: IntakeState, session: SessionState) {
  return renderDeliverable(def, {
    intake, session, brand: GCC_BRAND, logos: placeholderLogos
  });
}

/** Build the list of items to export — uses cached styled HTML where available. */
export function buildItems(intake: IntakeState, session: SessionState): ExportItem[] {
  const length = intake.customization?.length ?? defaultCustomization().length;
  const scope = tocInScope(length);
  const primaryThemeId = (intake.selectedThemeIds ?? [])[0];

  return scope.map((def) => {
    const original = renderOriginal(def, intake, session);
    const cached = primaryThemeId ? styledStorage.load(def.key, primaryThemeId) : null;
    return {
      def,
      filename: original.filename,
      html: cached ?? original.html,
      styled: !!cached
    };
  });
}

/** Build a ZIP blob containing every in-scope deliverable. */
export async function buildZip(intake: IntakeState, session: SessionState): Promise<Blob> {
  const zip = new JSZip();
  const items = buildItems(intake, session);
  const folder = zip.folder('proposal') ?? zip;

  for (const item of items) {
    const name = item.def.number + ' - ' + item.def.label + (item.styled ? ' (styled).html' : '.html');
    folder.file(name, item.html);
  }

  const manifest = {
    generated: new Date().toISOString(),
    primaryTheme: (intake.selectedThemeIds ?? [])[0] ?? null,
    deliverables: items.map((i) => ({
      key: i.def.key,
      label: i.def.label,
      number: i.def.number,
      styled: i.styled,
      handler: i.def.handler
    }))
  };
  folder.file('manifest.json', JSON.stringify(manifest, null, 2));

  return zip.generateAsync({ type: 'blob' });
}

export function downloadZip(blob: Blob, filename = 'proposal-bundle.zip') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
