// File extensions APS Model Derivative can translate to viewable + structured outputs.
// PDFs are included here — APS gives back per-sheet + property data the raw PDF doesn't have,
// which generally improves downstream extraction.
const APS_TRANSLATABLE = new Set([
  // Drawings
  '.pdf',
  // Revit
  '.rvt', '.rfa', '.rte',
  // AutoCAD
  '.dwg', '.dxf', '.dwf', '.dwfx',
  // Navisworks
  '.nwd', '.nwc',
  // IFC / BIM
  '.ifc',
  // MicroStation
  '.dgn',
  // Inventor
  '.iam', '.ipt',
  // Solidworks
  '.sldprt', '.sldasm',
  // CATIA
  '.catpart', '.catproduct',
  // Step / IGES / STL / OBJ / FBX / 3DS
  '.step', '.stp', '.iges', '.igs', '.stl', '.obj', '.fbx', '.3ds',
  // Pro/E / Creo
  '.prt', '.asm',
]);

// Formats the regular extractor handles directly. APS doesn't help with these
// (raster images need OCR, structured office formats are already structured).
const NATIVE_EXTRACTABLE = new Set([
  '.png', '.jpg', '.jpeg', '.tif', '.tiff', '.gif', '.bmp', '.webp',
  '.txt', '.md', '.csv', '.tsv', '.xlsx', '.xls', '.docx', '.doc',
]);

function extOf(filename) {
  const i = filename.lastIndexOf('.');
  return i < 0 ? '' : filename.slice(i).toLowerCase();
}

function classify(filename) {
  const ext = extOf(filename);
  if (APS_TRANSLATABLE.has(ext)) return { route: 'aps', ext };
  if (NATIVE_EXTRACTABLE.has(ext)) return { route: 'native', ext };
  return { route: 'unknown', ext };
}

module.exports = { classify, extOf, APS_TRANSLATABLE, NATIVE_EXTRACTABLE };
