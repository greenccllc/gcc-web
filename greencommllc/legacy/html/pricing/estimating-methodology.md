# Estimating Methodology

**Audience:** Nathan / Kaitlyn / Taylor — reference when building a proposal estimate.
**NOT a client-facing document.** This is internal. Client-facing summary pricing goes into the proposal Investment Summary section.

---

## Buildup order

1. **Count the work** — drops, devices, fiber strands, racks, doors, cameras, speakers. Use the density tables in each scope file when design drawings aren't complete.
2. **Apply unit prices from `rate-card.md`.** If a unit price isn't in the rate card for what you need, compute as: material cost × markup + labor hours × rate + consumables (rolled into labor).
3. **Add direct labor for scope not captured by unit pricing** — pathway prep, rack dress, closeout documentation. Use hours × labor rate.
4. **Mobilization / demobilization** — 2 hours standard labor per crew per site. Round up to the next half-day if the job requires more than one site visit.
5. **Apply the conservative labor rule** — use the higher BICSI rate when choice exists, round mob/demob up, add 10% buffer on 50–500 endpoint jobs, 15% on complex-access jobs.
6. **Stack overhead + G&A + profit** on the cost basis. Overhead compounds on direct cost; G&A compounds on (direct + overhead); profit compounds on (direct + overhead + G&A). Or use the simpler additive approach — pick one and document which on the bid.
7. **Exclusions check** — walk the Hard Rules exclusion list. Confirm nothing in the base price maps to an excluded trade.
8. **Alternates**
   - **Managed Services alternate** — always present on whole-building bids. Priced month-to-month, no lock-in.
   - **Weekend / after-hours DEDUCT D1** — compute labor-surplus credit if weekend crew were used. Never an ADD premium.
9. **Loyalty Discount** — if this is a repeat client or has active Managed Services, apply 5%+5% as a single line at the bottom.
10. **Round the final number** to the nearest $100 for bids < $25K, nearest $500 for bids $25K–$250K, nearest $1K for bids > $250K. Don't round to "marketing-friendly" numbers — precise-looking numbers read as more credible.

## Density-based bidding (when design is incomplete)

When the GC sends an RFP without finalized design drawings:

1. **Compute area** by space type using the density tables (e.g., 35,000 sqft open office + 8,000 sqft private office + 6,000 sqft conference + 4,000 sqft support = 53,000 total).
2. **Apply density** per scope file: e.g., 10 drops/1,000 sqft open office × 35,000 = 350 drops; 5 drops/1,000 × 8,000 = 40 drops; etc.
3. **Sum** and round up to the nearest 25 drops.
4. **Document the assumption** in the Cover Letter and the Exclusions section: "Pricing assumes approximately 420 data drops across the building, based on density tables for office, conference, and support spaces. Final count per issued drawings at a mutually agreed unit rate."

## Prevailing-wage projects

- Workers' Comp base rate doesn't change — WC is statutory regardless of PW classification.
- Labor rates increase per the applicable wage determination (Davis-Bacon on federally-funded; state prevailing wage on Missouri public works).
- G&A markup stays the same; profit margin can compress slightly due to competitive pressure on PW bids.
- Certified payroll required — add 0.5% to overhead for PW admin burden.

## Change-order pricing

- Use the same rate card.
- Standard change-order markup: labor rate + material × markup + 10% on top of the subtotal (covers additional PM, re-scheduling, re-mobilization).
- Owner / GC approval must be in writing before work starts. No verbal-approval exceptions.

## Red flags in estimating

- If the RFP description and the floor plan disagree by more than 20% on drop count, flag it in the Cover Letter as a density-based assumption and don't RFI.
- If the schedule window is <50% of what you'd normally need, price as after-hours / accelerated — but show that as an alternate, not in the base.
- If bonding capacity isn't stated, assume no bond and note "Bonding available at cost, per-project." Don't bury a bond premium in the base.

## When to walk

- The RFP requires an RFI to price correctly, and you know we won't send one.
- The scope pulls us across the Hard Rules exclusion list.
- The GC has a history of non-payment or contested change orders (check with Kaitlyn before deciding).
- The risk-weighted profit on a large bid is below target after mod-ordinates labor buffer and expected change-order dispute.
