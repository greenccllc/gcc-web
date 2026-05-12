<!--
  DecisionGauge v2 — semi-circle SVG gauge. Five zones matching 5 tiers:
    dark red  0..15   → Floor
    red       15..35  → Aggressive
    gold      35..65  → Balanced
    green     65..82  → Conservative
    dark grn  82..100 → Premium
  Stateless, pure render.
-->
<script lang="ts">
  import { GCC_COLORS } from '@brand/gcc';
  import type { PricingStrategyKey } from '@models/pricing';

  interface Props { score: number; reco: PricingStrategyKey; }
  let { score, reco }: Props = $props();

  const w = 200, h = 120;
  const cx = w / 2, cy = h - 16;
  const r = 64;

  function arcPath(startFrac: number, endFrac: number): string {
    const s = Math.PI + startFrac * Math.PI;
    const e = Math.PI + endFrac * Math.PI;
    const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e);
    const large = (e - s) > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  }

  let v = $derived(Math.max(0, Math.min(100, score)));
  let angle = $derived(Math.PI + (v / 100) * Math.PI);
  let needleX = $derived(cx + (r - 4) * Math.cos(angle));
  let needleY = $derived(cy + (r - 4) * Math.sin(angle));

  const COLOR_FOR_RECO: Record<PricingStrategyKey, string> = {
    floor:        '#7B0F0F',
    aggressive:   '#B71C1C',
    balanced:     GCC_COLORS.warmGold,
    conservative: GCC_COLORS.forestGreen,
    premium:      GCC_COLORS.forestDark
  };
  let valueColor = $derived(COLOR_FOR_RECO[reco] ?? GCC_COLORS.warmGold);
</script>

<svg viewBox="0 0 {w} {h}" width={w} height={h} xmlns="http://www.w3.org/2000/svg">
  <path d={arcPath(0.00, 0.15)} stroke="#7B0F0F"                stroke-width="10" fill="none" />
  <path d={arcPath(0.15, 0.35)} stroke="#B71C1C"                stroke-width="10" fill="none" />
  <path d={arcPath(0.35, 0.65)} stroke={GCC_COLORS.warmGold}    stroke-width="10" fill="none" />
  <path d={arcPath(0.65, 0.82)} stroke={GCC_COLORS.forestGreen} stroke-width="10" fill="none" />
  <path d={arcPath(0.82, 1.00)} stroke={GCC_COLORS.forestDark}  stroke-width="10" fill="none" />
  <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke={GCC_COLORS.ink} stroke-width="2.5" stroke-linecap="round" />
  <circle cx={cx} cy={cy} r="4" fill={GCC_COLORS.ink} />
  <text x={cx} y={cy - r - 3} text-anchor="middle" fill={valueColor} font-size="20" font-weight="800">{v}</text>
  <text x={cx} y={h - 3} text-anchor="middle" fill={GCC_COLORS.slate} font-size="9" letter-spacing="1.2">DECISION SCORE</text>
</svg>

<style>
  svg { display: block; font-family: Calibri, Inter, sans-serif; }
</style>
