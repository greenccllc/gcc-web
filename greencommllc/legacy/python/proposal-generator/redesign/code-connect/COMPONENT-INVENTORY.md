# Component Inventory — GCC Proposal System

32 components, organized by category. Every entry includes React name,
Jinja macro name, used-by (which proposal types), and Figma placeholder.

Fill the Figma column once the Figma file exists.

## Legend

- **Type key**: FB=formal-bid · DQ=direct-quote · RQ=residential-quote · CO=change-order
- **Figma**: `TBD-<NAME>` placeholder — find-and-replace with real node ID.

---

## 1. Chrome (page furniture)

| # | React | Jinja macro | Used by | Figma |
|---|-------|-------------|---------|-------|
| 1 | `BrandLine` | `brand_line` | DQ, RQ, CO | `TBD-BRAND_LINE` |
| 2 | `ForestCoverBand` | `forest_cover_band` | FB | `TBD-FOREST_COVER_BAND` |
| 3 | `RunningFooter` | `running_footer` | all | `TBD-RUNNING_FOOTER` |
| 4 | `SectionRule` | `section_rule` | all | `TBD-SECTION_RULE` |

## 2. Cover heroes

| # | React | Jinja macro | Used by | Figma |
|---|-------|-------------|---------|-------|
| 5 | `PriceHeroBand` | `price_hero_band` | DQ | `TBD-PRICE_HERO_BAND` |
| 6 | `LoyaltyLedger` | `loyalty_ledger` | DQ | `TBD-LOYALTY_LEDGER` |
| 7 | `SummaryStrip4` | `summary_strip_4` | RQ, FB | `TBD-SUMMARY_STRIP_4` |
| 8 | `MathPanel3Cell` | `math_panel_3cell` | CO | `TBD-MATH_PANEL_3CELL` |
| 9 | `StampRow4` | `stamp_row_4` | CO | `TBD-STAMP_ROW_4` |
| 10 | `FamilyDear` | `family_dear` | RQ | `TBD-FAMILY_DEAR` |
| 11 | `CoverIdTriple` | `cover_id_triple` | FB | `TBD-COVER_ID_TRIPLE` |
| 12 | `CoverFoot` | `cover_foot` | DQ, RQ, CO | `TBD-COVER_FOOT` |

## 3. Transmittal / commitments

| # | React | Jinja macro | Used by | Figma |
|---|-------|-------------|---------|-------|
| 13 | `CommitmentsGrid4` | `commitments_grid_4` | FB | `TBD-COMMITMENTS_GRID_4` |
| 14 | `ToFromPair` | `to_from_pair` | FB | `TBD-TO_FROM_PAIR` |

## 4. Room plan (residential)

| # | React | Jinja macro | Used by | Figma |
|---|-------|-------------|---------|-------|
| 15 | `RoomCard` | `room_card` | RQ | `TBD-ROOM_CARD` |
| 16 | `RoomGrid` | `room_grid` | RQ | `TBD-ROOM_GRID` |

## 5. Scope

| # | React | Jinja macro | Used by | Figma |
|---|-------|-------------|---------|-------|
| 17 | `ScopeTable` | `scope_table` | all | `TBD-SCOPE_TABLE` |
| 18 | `CategoryBand` | `category_band` | all | `TBD-CATEGORY_BAND` |
| 19 | `ScopeFootStandard` | `scope_foot_standard` | FB, RQ, CO | `TBD-SCOPE_FOOT_STANDARD` |
| 20 | `ScopeFootLoyalty` | `scope_foot_loyalty` | DQ | `TBD-SCOPE_FOOT_LOYALTY` |

## 6. Financial / price

| # | React | Jinja macro | Used by | Figma |
|---|-------|-------------|---------|-------|
| 21 | `FinancialHero` | `financial_hero` | FB | `TBD-FINANCIAL_HERO` |
| 22 | `PriceCard` | `price_card` | RQ | `TBD-PRICE_CARD` |
| 23 | `SubStrip` | `sub_strip` | CO | `TBD-SUB_STRIP` |
| 24 | `MSPCard` | `msp_card` | FB, DQ, RQ | `TBD-MSP_CARD` |

## 7. Warranty / exclusions

| # | React | Jinja macro | Used by | Figma |
|---|-------|-------------|---------|-------|
| 25 | `WarrantyCallout` | `warranty_callout` | FB, DQ, RQ | `TBD-WARRANTY_CALLOUT` |
| 26 | `ExclusionsList` | `exclusions_list` | FB, DQ, RQ | `TBD-EXCLUSIONS_LIST` |

## 8. Timeline

| # | React | Jinja macro | Used by | Figma |
|---|-------|-------------|---------|-------|
| 27 | `Timeline4Dot` | `timeline_4_dot` | DQ | `TBD-TIMELINE_4_DOT` |
| 28 | `TimelineCard` | `timeline_card` | RQ | `TBD-TIMELINE_CARD` |

## 9. Change-order specific

| # | React | Jinja macro | Used by | Figma |
|---|-------|-------------|---------|-------|
| 29 | `WhyCallout` | `why_callout` | CO | `TBD-WHY_CALLOUT` |
| 30 | `CarryCard` | `carry_card` | CO | `TBD-CARRY_CARD` |

## 10. Close (terms + acceptance + reassure)

| # | React | Jinja macro | Used by | Figma |
|---|-------|-------------|---------|-------|
| 31 | `TermsGrid` | `terms_grid` | all | `TBD-TERMS_GRID` |
| 32 | `AcceptanceBlock` | `acceptance_block` | all | `TBD-ACCEPTANCE_BLOCK` |
| 33 | `NotesBox` | `notes_box` | FB, CO | `TBD-NOTES_BOX` |
| 34 | `ReassureStrip` | `reassure_strip` | all | `TBD-REASSURE_STRIP` |

---

## Total

**34 components** (grew during inventory from my original 32 estimate —
`CoverIdTriple`, `CoverFoot`, and `NotesBox` got promoted from inline
usage to reusable components).

## Consumer patterns

A proposal page is composed of ~4–8 components plus inline content.
Example — direct-quote page 1:

```jinja
{% import "macros/all.html" as c %}
{{ c.brand_line(brand="GCC LLC", tag="Quote for repeat client · AdHoc Center") }}
<div class="cover-setup">
  <div class="kicker">A quote from Green Communications</div>
  <h1>East Wing CCTV expansion — 24 added cameras, head-end re-zoned.</h1>
  <div class="sub">Rachel, this one's scoped for off-hours…</div>
</div>
{{ c.price_hero_band(
     subtotal="$9,948.00",
     loyalty_row={"label": "Loyalty discount · 3%", "amount": "−$298.44"},
     final="$9,649.56",
     show_loyalty_badge=true
) }}
{{ c.cover_foot(left_rows=[…], right_rows=[…]) }}
{{ c.running_footer(proposal_no="GCC-2026-0102", issue_date="2026-04-20", page=1) }}
```

The same page in React:

```tsx
<BrandLine brand="GCC LLC" tag="Quote for repeat client · AdHoc Center" />
<CoverSetup kicker="A quote from Green Communications" h1="…" sub="Rachel, …" />
<PriceHeroBand
  subtotal="$9,948.00"
  loyalty={{ label: "Loyalty discount · 3%", amount: "−$298.44" }}
  final="$9,649.56"
  showLoyaltyBadge
/>
<CoverFoot leftRows={…} rightRows={…} />
<RunningFooter proposalNo="GCC-2026-0102" issueDate="2026-04-20" page={1} />
```

Props are identical in both (snake_case in Jinja, camelCase in React).
Code Connect's `props` block handles the name translation automatically.
