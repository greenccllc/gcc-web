// GCC brand tokens — TypeScript mirror of tokens.css.
// Mechanically regeneratable — if tokens.css changes, this changes.

export const color = {
  forest:      "#2E7D32",
  forestDark:  "#1E5622",
  slate:       "#455A64",
  slateLight:  "#788A93",
  gold:        "#D4AF37",
  goldDeep:    "#B8941E",
  goldTint:    "#FAF3DC",
  cream:       "#FDFBF4",
  greenTint:   "#F1F8F1",
  ink:         "#1A1A1A",
  rule:        "#D8D8D8",
  white:       "#FFFFFF",
} as const;

export const font = {
  sans:  '"Liberation Sans", Arial, sans-serif',
  serif: '"Liberation Serif", Georgia, serif',
} as const;

export const size = {
  display: "44pt",
  h1:      "22pt",
  h2:      "14pt",
  h3:      "11pt",
  body:    "10.5pt",
  small:   "9pt",
  caps:    "7.5pt",
  footer:  "7.5pt",
} as const;

export const line = {
  body:  "1.45",
  tight: "1.15",
} as const;

export const track = {
  caps:   "0.14em",
  capsLg: "0.18em",
} as const;

export const space = {
  pageMargin:   "0.75in",
  liveWidth:    "7in",
  colGap:       "0.5in",
  gutterSm:     "10pt",
  gutterMd:     "14pt",
  gutterLg:     "22pt",
} as const;

export const rule = {
  hair:   "0.25pt",
  thin:   "0.5pt",
  std:    "1pt",
  heavy:  "2pt",
  accent: "3pt",
} as const;

export const panel = {
  pad:   "14pt 16pt",
  padLg: "22pt 26pt",
  coverBandH: "2.8in",
} as const;

export const tokens = { color, font, size, line, track, space, rule, panel };
export default tokens;
