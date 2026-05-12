/**
 * Smoke tests for the SVG chart helpers.
 * We don't visually diff the SVGs — we just verify structural invariants:
 *   - No data throws a useful "empty state"
 *   - Known values render expected numbers
 *   - Required SVG namespaces present
 */

import { describe, it, expect } from 'vitest';
import {
  svgBarChart,
  svgDonut,
  svgWaterfall,
  svgGauge
} from '@/viz/svgCharts';
import type { BrandColors } from '@models/brand';

// Fixture palette — matches GCC_BRAND colors verbatim.
const colors: BrandColors = {
  forestGreen: '#2E7D32',
  forestDark:  '#1B5E20',
  warmGold:    '#D4AF37',
  greenTint:   '#F1F8F1',
  goldTint:    '#FAF5E6',
  cream:       '#FDFBF4',
  ink:         '#14181C',
  slate:       '#374850',
  rule:        '#CFD7D0'
};
const palette = { colors };

describe('svgBarChart', () => {
  it('renders one <g> group per data row', () => {
    const data = [
      { label: 'Data',     value: 220 },
      { label: 'Wireless', value: 18 },
      { label: 'Camera',   value: 24 }
    ];
    const svg = svgBarChart(data, palette);
    expect(svg).toMatch(/<svg[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    expect((svg.match(/<g>/g) ?? []).length).toBe(3);
    expect(svg).toContain('Data');
    expect(svg).toContain('220');
  });

  it('escapes special characters in labels', () => {
    const svg = svgBarChart([{ label: 'R&D <scope>', value: 10 }], palette);
    expect(svg).toContain('R&amp;D &lt;scope&gt;');
    expect(svg).not.toContain('<scope>');
  });
});

describe('svgDonut', () => {
  it('renders an empty-state ring when total is zero', () => {
    const svg = svgDonut([{ label: 'x', value: 0 }], palette);
    expect(svg).toContain('no data');
  });

  it('renders one path per non-zero slice + legend row', () => {
    const svg = svgDonut([
      { label: 'Data',  value: 50 },
      { label: 'Video', value: 30 },
      { label: 'Wifi',  value: 20 }
    ], palette);
    expect((svg.match(/<path\s/g) ?? []).length).toBe(3);
    expect(svg).toContain('Data');
    expect(svg).toContain('Wifi');
    // Total center label
    expect(svg).toMatch(/>100</);
  });
});

describe('svgWaterfall', () => {
  it('renders one bar per step + connectors between bars', () => {
    const steps = [
      { label: 'Cost',    delta: 60000 },
      { label: '+ O&H',   delta: 8000  },
      { label: 'Sell',    isTotal: true, value: 68000 }
    ];
    const svg = svgWaterfall(steps, palette);
    expect((svg.match(/<rect/g) ?? []).length).toBe(3);
    // One connector between step 0→1 and 1→2
    expect((svg.match(/<line[^>]*stroke-dasharray/g) ?? []).length).toBe(2);
    expect(svg).toContain('Sell');
  });
});

describe('svgGauge', () => {
  it('uses green fill when margin is in the top zone', () => {
    const svg = svgGauge(35, palette);
    expect(svg).toContain(colors.forestGreen);
    expect(svg).toMatch(/>35\.0%</);
  });

  it('uses red fill for low margin', () => {
    const svg = svgGauge(5, palette);
    expect(svg).toContain('#B71C1C');
  });

  it('clamps values to 0..100', () => {
    expect(svgGauge(-10, palette)).toContain('>0.0%<');
    expect(svgGauge(500, palette)).toContain('>100.0%<');
  });
});
