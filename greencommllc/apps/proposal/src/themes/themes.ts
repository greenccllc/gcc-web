// 10 preset themes from the theme-factory toolkit. Used by Stage 4
// stylize-with-Gemini flow to generate version options of the proposal.

export interface ThemeColor {
  name: string;
  hex: string;
  role: string; // e.g. "Primary background", "Accent"
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  bestFor: string;
  colors: ThemeColor[];
  fonts: {
    heading: string;
    body: string;
  };
}

export const THEMES: Theme[] = [
  {
    id: 'ocean-depths',
    name: 'Ocean Depths',
    description: 'Professional and calming maritime theme.',
    bestFor: 'Corporate, financial, consulting, trust-building.',
    colors: [
      { name: 'Deep Navy', hex: '#1a2332', role: 'Primary background' },
      { name: 'Teal', hex: '#2d8b8b', role: 'Accent' },
      { name: 'Seafoam', hex: '#a8dadc', role: 'Secondary accent' },
      { name: 'Cream', hex: '#f1faee', role: 'Text / light backgrounds' },
    ],
    fonts: { heading: 'DejaVu Sans Bold', body: 'DejaVu Sans' },
  },
  {
    id: 'sunset-boulevard',
    name: 'Sunset Boulevard',
    description: 'Warm and vibrant golden-hour palette.',
    bestFor: 'Creative pitches, marketing, lifestyle, events.',
    colors: [
      { name: 'Burnt Orange', hex: '#e76f51', role: 'Primary accent' },
      { name: 'Coral', hex: '#f4a261', role: 'Secondary accent' },
      { name: 'Warm Sand', hex: '#e9c46a', role: 'Highlighting / backgrounds' },
      { name: 'Deep Purple', hex: '#264653', role: 'Dark contrast / text' },
    ],
    fonts: { heading: 'DejaVu Serif Bold', body: 'DejaVu Sans' },
  },
  {
    id: 'forest-canopy',
    name: 'Forest Canopy',
    description: 'Natural and grounded forest earth tones.',
    bestFor: 'Environmental, sustainability, outdoor brands, organic.',
    colors: [
      { name: 'Forest Green', hex: '#2d4a2b', role: 'Primary dark green' },
      { name: 'Sage', hex: '#7d8471', role: 'Muted green accent' },
      { name: 'Olive', hex: '#a4ac86', role: 'Light accent' },
      { name: 'Ivory', hex: '#faf9f6', role: 'Backgrounds / text' },
    ],
    fonts: { heading: 'FreeSerif Bold', body: 'FreeSans' },
  },
  {
    id: 'modern-minimalist',
    name: 'Modern Minimalist',
    description: 'Clean and contemporary grayscale.',
    bestFor: 'Tech, architecture, design, modern business proposals.',
    colors: [
      { name: 'Charcoal', hex: '#36454f', role: 'Primary dark' },
      { name: 'Slate Gray', hex: '#708090', role: 'Medium accent' },
      { name: 'Light Gray', hex: '#d3d3d3', role: 'Backgrounds / dividers' },
      { name: 'White', hex: '#ffffff', role: 'Text / clean backgrounds' },
    ],
    fonts: { heading: 'DejaVu Sans Bold', body: 'DejaVu Sans' },
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    description: 'Rich and warm autumnal palette.',
    bestFor: 'Restaurants, hospitality, fall campaigns, artisan products.',
    colors: [
      { name: 'Mustard Yellow', hex: '#f4a900', role: 'Bold primary accent' },
      { name: 'Terracotta', hex: '#c1666b', role: 'Warm secondary' },
      { name: 'Warm Beige', hex: '#d4b896', role: 'Neutral backgrounds' },
      { name: 'Chocolate Brown', hex: '#4a403a', role: 'Dark text / anchors' },
    ],
    fonts: { heading: 'FreeSans Bold', body: 'FreeSans' },
  },
  {
    id: 'arctic-frost',
    name: 'Arctic Frost',
    description: 'Cool and crisp winter-inspired theme.',
    bestFor: 'Healthcare, technology, clean tech, pharmaceutical.',
    colors: [
      { name: 'Ice Blue', hex: '#d4e4f7', role: 'Light backgrounds / highlights' },
      { name: 'Steel Blue', hex: '#4a6fa5', role: 'Primary accent' },
      { name: 'Silver', hex: '#c0c0c0', role: 'Metallic accent' },
      { name: 'Crisp White', hex: '#fafafa', role: 'Clean backgrounds / text' },
    ],
    fonts: { heading: 'DejaVu Sans Bold', body: 'DejaVu Sans' },
  },
  {
    id: 'desert-rose',
    name: 'Desert Rose',
    description: 'Soft and sophisticated dusty tones.',
    bestFor: 'Fashion, beauty, weddings, interior design, boutiques.',
    colors: [
      { name: 'Dusty Rose', hex: '#d4a5a5', role: 'Soft primary' },
      { name: 'Clay', hex: '#b87d6d', role: 'Earthy accent' },
      { name: 'Sand', hex: '#e8d5c4', role: 'Warm neutral' },
      { name: 'Deep Burgundy', hex: '#5d2e46', role: 'Rich dark contrast' },
    ],
    fonts: { heading: 'FreeSans Bold', body: 'FreeSans' },
  },
  {
    id: 'tech-innovation',
    name: 'Tech Innovation',
    description: 'Bold and modern high-contrast.',
    bestFor: 'Tech startups, software launches, AI/ML, digital transformation.',
    colors: [
      { name: 'Electric Blue', hex: '#0066ff', role: 'Vibrant primary accent' },
      { name: 'Neon Cyan', hex: '#00ffff', role: 'Bright highlight' },
      { name: 'Dark Gray', hex: '#1e1e1e', role: 'Deep background' },
      { name: 'White', hex: '#ffffff', role: 'Text / contrast' },
    ],
    fonts: { heading: 'DejaVu Sans Bold', body: 'DejaVu Sans' },
  },
  {
    id: 'botanical-garden',
    name: 'Botanical Garden',
    description: 'Fresh and organic garden colors.',
    bestFor: 'Garden centers, food, farm-to-table, natural products.',
    colors: [
      { name: 'Fern Green', hex: '#4a7c59', role: 'Rich natural green' },
      { name: 'Marigold', hex: '#f9a620', role: 'Bright floral accent' },
      { name: 'Terracotta', hex: '#b7472a', role: 'Earthy warm tone' },
      { name: 'Cream', hex: '#f5f3ed', role: 'Soft neutral' },
    ],
    fonts: { heading: 'DejaVu Serif Bold', body: 'DejaVu Sans' },
  },
  {
    id: 'midnight-galaxy',
    name: 'Midnight Galaxy',
    description: 'Dramatic cosmic deep tones.',
    bestFor: 'Entertainment, gaming, luxury, creative agencies.',
    colors: [
      { name: 'Deep Purple', hex: '#2b1e3e', role: 'Rich dark base' },
      { name: 'Cosmic Blue', hex: '#4a4e8f', role: 'Mystical mid-tone' },
      { name: 'Lavender', hex: '#a490c2', role: 'Soft accent' },
      { name: 'Silver', hex: '#e6e6fa', role: 'Light highlights / text' },
    ],
    fonts: { heading: 'FreeSans Bold', body: 'FreeSans' },
  },
];

// Render a theme as a compact spec for Gemini's stylize prompt.
export function themePromptSpec(theme: Theme): string {
  const colors = theme.colors.map((c) => `  - ${c.name} (${c.hex}) — ${c.role}`).join('\n');
  return [
    `Theme: ${theme.name}`,
    `Style: ${theme.description}`,
    `Best for: ${theme.bestFor}`,
    `Colors:\n${colors}`,
    `Headings font: ${theme.fonts.heading}`,
    `Body font: ${theme.fonts.body}`,
  ].join('\n');
}

export function getTheme(id: string): Theme | undefined {
  return THEMES.find((t) => t.id === id);
}
