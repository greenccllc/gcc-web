/**
 * GCC Proposal Library — Figma Code Connect manifest.
 *
 * Maps each React component (react/src/components.tsx) to its Figma node.
 *
 * Node URLs are placeholders until the Figma file exists. The pattern is:
 *   https://www.figma.com/design/TBD_FILE_KEY/GCC-Proposals?node-id=TBD-<COMPONENT>
 *
 * To swap in real Figma refs later:
 *   1. grep TBD_FILE_KEY  — replace with the Figma file key
 *   2. grep TBD-          — replace each node id with the real node-id (e.g. 42-117)
 *
 * Both are unique, grep-safe strings by design.
 *
 * Publish:
 *   cd react && npm run cc:publish
 */

import figma from "@figma/code-connect";
import {
  BrandLine,
  ForestCoverBand,
  RunningFooter,
  SectionRule,
  PriceHeroBand,
  LoyaltyLedger,
  SummaryStrip4,
  MathPanel3Cell,
  StampRow4,
  FamilyDear,
  CoverIdTriple,
  CoverFoot,
  CommitmentsGrid4,
  ToFromPair,
  RoomCard,
  RoomGrid,
  CategoryBand,
  ScopeFootStandard,
  ScopeFootLoyalty,
  ScopeTable,
  FinancialHero,
  PriceCard,
  SubStrip,
  MSPCard,
  WarrantyCallout,
  ExclusionsList,
  Timeline4Dot,
  TimelineCard,
  WhyCallout,
  CarryCard,
  TermsGrid,
  AcceptanceBlock,
  NotesBox,
  ReassureStrip,
} from "./react/src/components";

const NODE = (slug: string) =>
  `https://www.figma.com/design/TBD_FILE_KEY/GCC-Proposals?node-id=TBD-${slug}`;

/* ═════════════ 1. CHROME ═════════════ */

figma.connect(BrandLine, NODE("BRAND-LINE"), {
  props: {
    brand: figma.string("brand"),
    tag:   figma.string("tag"),
  },
  example: ({ brand, tag }) => <BrandLine brand={brand} tag={tag} />,
});

figma.connect(ForestCoverBand, NODE("FOREST-COVER-BAND"), {
  props: {
    brand:          figma.string("brand"),
    classification: figma.string("classification"),
    // ids is a 3-cell array — Figma will likely expose as children instances;
    // swap to figma.children("ids") once the Figma file models it that way.
  },
  example: ({ brand, classification }) => (
    <ForestCoverBand
      brand={brand}
      classification={classification}
      ids={[
        { k: "Proposal #", v: "GCC-2026-0101" },
        { k: "Issued",     v: "2026-04-22" },
        { k: "Valid thru", v: "2026-05-22", sub: "30 days" },
      ]}
    />
  ),
});

figma.connect(RunningFooter, NODE("RUNNING-FOOTER"), {
  props: {
    proposalNo: figma.string("proposalNo"),
    issueDate:  figma.string("issueDate"),
    page:       figma.string("page"),
  },
  example: ({ proposalNo, issueDate, page }) => (
    <RunningFooter proposalNo={proposalNo} issueDate={issueDate} page={page} />
  ),
});

figma.connect(SectionRule, NODE("SECTION-RULE"), {
  props: {
    title:     figma.string("title"),
    pgCaption: figma.string("pgCaption"),
  },
  example: ({ title, pgCaption }) => <SectionRule title={title} pgCaption={pgCaption} />,
});

/* ═════════════ 2. COVER HEROES ═════════════ */

figma.connect(PriceHeroBand, NODE("PRICE-HERO-BAND"), {
  props: {
    subtotal:         figma.string("subtotal"),
    final:            figma.string("final"),
    showLoyaltyBadge: figma.boolean("showLoyaltyBadge"),
  },
  example: ({ subtotal, final, showLoyaltyBadge }) => (
    <PriceHeroBand
      subtotal={subtotal}
      final={final}
      showLoyaltyBadge={showLoyaltyBadge}
      loyaltyRow={{ label: "Loyalty (−3% repeat client)", amount: "−$298.44", pct: "−3%" }}
    />
  ),
});

figma.connect(LoyaltyLedger, NODE("LOYALTY-LEDGER"), {
  example: () => (
    <LoyaltyLedger
      rows={[
        { k: "Scope subtotal",              v: "$9,948.00" },
        { k: "Loyalty (−3% repeat client)", v: "−$298.44", variant: "disc" },
        { k: "Final investment",            v: "$9,649.56", variant: "accent" },
      ]}
    />
  ),
});

figma.connect(SummaryStrip4, NODE("SUMMARY-STRIP-4"), {
  props: {
    goldTop: figma.boolean("goldTop"),
  },
  example: ({ goldTop }) => (
    <SummaryStrip4
      goldTop={goldTop}
      cells={[
        { k: "Rooms covered", v: "10", sub: "single-family" },
        { k: "APs planned",   v: "8",  sub: "Wi-Fi 6" },
        { k: "Your price",    v: "$6,446", variant: "price" },
        { k: "Install window", v: "May 4–15", sub: "pre-drywall" },
      ]}
    />
  ),
});

figma.connect(MathPanel3Cell, NODE("MATH-PANEL-3CELL"), {
  props: {
    original: figma.string("original"),
    delta:    figma.string("delta"),
    revised:  figma.string("revised"),
    kicker:   figma.string("kicker"),
    title:    figma.string("title"),
    sub:      figma.string("sub"),
  },
  example: ({ original, delta, revised, kicker, title, sub }) => (
    <MathPanel3Cell
      original={original}
      delta={delta}
      revised={revised}
      kicker={kicker}
      title={title}
      sub={sub}
    />
  ),
});

figma.connect(StampRow4, NODE("STAMP-ROW-4"), {
  example: () => (
    <StampRow4
      stats={[
        { k: "Change",         v: "+5.4%" },
        { k: "Schedule impact", v: "0 days" },
        { k: "Status",         v: "Issued" },
        { k: "Valid through",   v: "2026-05-22" },
      ]}
    />
  ),
});

figma.connect(FamilyDear, NODE("FAMILY-DEAR"), {
  props: {
    prefix: figma.string("prefix"),
    family: figma.string("family"),
    suffix: figma.string("suffix"),
  },
  example: ({ prefix, family, suffix }) => (
    <FamilyDear prefix={prefix} family={family} suffix={suffix} />
  ),
});

figma.connect(CoverIdTriple, NODE("COVER-ID-TRIPLE"), {
  example: () => (
    <CoverIdTriple
      cells={[
        { k: "Proposal #", v: "GCC-2026-0101" },
        { k: "Issued",     v: "2026-04-22" },
        { k: "Valid thru", v: "2026-05-22", sub: "30 days" },
      ]}
    />
  ),
});

figma.connect(CoverFoot, NODE("COVER-FOOT"), {
  example: () => (
    <CoverFoot
      leftRows={[
        { k: "Prepared for", v: "Rachel Ortiz · AdHoc Center" },
        { k: "Address",      v: "1450 Oak St, Springfield" },
      ]}
      rightRows={[
        { k: "Prepared by", v: "Nathan Morris · GCC LLC" },
        { k: "Contact",     v: "nmorris@greencommllc.com" },
      ]}
    />
  ),
});

/* ═════════════ 3. TRANSMITTAL / COMMITMENTS ═════════════ */

figma.connect(CommitmentsGrid4, NODE("COMMITMENTS-GRID-4"), {
  example: () => (
    <CommitmentsGrid4
      items={[
        { k: "Schedule",  title: "On-site 2026-06-09",    body: "Substantial completion by 2026-08-15." },
        { k: "Compliance", title: "Prevailing wage + DBE", body: "Davis-Bacon rates, certified payroll weekly." },
        { k: "Closeout",   title: "As-builts + warranty",  body: "Redlines, test results, warranty letter at PF." },
        { k: "Warranty",   title: "1 year labor · mfr parts", body: "GCC-performed labor warrantied 12 months." },
      ]}
    />
  ),
});

figma.connect(ToFromPair, NODE("TO-FROM-PAIR"), {
  example: () => (
    <ToFromPair
      to={{ org: "Springfield ISD",      meta: <>Attn: Procurement<br />1401 W Grand, Springfield</> }}
      from={{ org: "Green Communications Contracting LLC", meta: <>Nathan Morris, Estimator<br />nmorris@greencommllc.com</> }}
    />
  ),
});

/* ═════════════ 4. ROOM PLAN ═════════════ */

figma.connect(RoomCard, NODE("ROOM-CARD"), {
  props: {
    k:         figma.string("k"),
    title:     figma.string("title"),
    body:      figma.string("body"),
    highlight: figma.boolean("highlight"),
  },
  example: ({ k, title, body, highlight }) => (
    <RoomCard k={k} title={title} body={body} highlight={highlight} />
  ),
});

figma.connect(RoomGrid, NODE("ROOM-GRID"), {
  example: () => (
    <RoomGrid
      rooms={[
        { k: "Priority · whole-home WiFi", title: "Mesh coverage", body: "8 APs · Wi-Fi 6 · zero dead spots", highlight: true },
        { k: "Bedroom · primary",   title: "Jack + AP",    body: "1 CAT6A drop · ceiling AP" },
        { k: "Bedroom · 2",         title: "Jack",         body: "1 CAT6A drop" },
        { k: "Bedroom · 3",         title: "Jack",         body: "1 CAT6A drop" },
        { k: "Great room",          title: "TV + AP",      body: "2 CAT6A drops · ceiling AP" },
        { k: "Kitchen",             title: "Jack",         body: "1 CAT6A drop · under-counter" },
        { k: "Office",              title: "Dual jack",    body: "2 CAT6A drops · ceiling AP" },
        { k: "Garage",              title: "Jack + AP",    body: "1 CAT6A drop · wall AP" },
        { k: "Patio",               title: "Outdoor AP",   body: "1 weatherized AP" },
        { k: "Utility",              title: "Panel",       body: "24-port patch · UPS" },
      ]}
    />
  ),
});

/* ═════════════ 5. SCOPE ═════════════ */

figma.connect(CategoryBand, NODE("CATEGORY-BAND"), {
  props: {
    label: figma.string("label"),
  },
  example: ({ label }) => (
    <table><tbody><CategoryBand label={label} /></tbody></table>
  ),
});

figma.connect(ScopeFootStandard, NODE("SCOPE-FOOT-STANDARD"), {
  props: {
    subtotal:   figma.string("subtotal"),
    final:      figma.string("final"),
    finalLabel: figma.string("finalLabel"),
  },
  example: ({ subtotal, final, finalLabel }) => (
    <table><ScopeFootStandard subtotal={subtotal} final={final} finalLabel={finalLabel} /></table>
  ),
});

figma.connect(ScopeFootLoyalty, NODE("SCOPE-FOOT-LOYALTY"), {
  props: {
    subtotal:   figma.string("subtotal"),
    final:      figma.string("final"),
    finalLabel: figma.string("finalLabel"),
  },
  example: ({ subtotal, final, finalLabel }) => (
    <table>
      <ScopeFootLoyalty
        subtotal={subtotal}
        final={final}
        finalLabel={finalLabel}
        loyaltyRow={{ label: "Loyalty (−3% repeat client)", amount: "−$298.44" }}
      />
    </table>
  ),
});

figma.connect(ScopeTable, NODE("SCOPE-TABLE"), {
  props: {
    footVariant: figma.enum("footVariant", {
      Standard: "standard",
      Loyalty:  "loyalty",
      None:     "none",
    }),
    subtotal:   figma.string("subtotal"),
    final:      figma.string("final"),
    finalLabel: figma.string("finalLabel"),
  },
  example: ({ footVariant, subtotal, final, finalLabel }) => (
    <ScopeTable
      footVariant={footVariant as "standard" | "loyalty" | "none"}
      subtotal={subtotal}
      final={final}
      finalLabel={finalLabel}
      loyaltyRow={{ label: "Loyalty (−3% repeat client)", amount: "−$298.44" }}
      lines={[
        { category: "Cabling",     qty: 24, unit: "ea", description: "CAT6A drop, terminated both ends", unit_price: "$165.00", line_total: "$3,960.00" },
        { category: "Cabling",     qty: 1,  unit: "ls", description: "24-port patch panel + rack install",  unit_price: "$420.00", line_total: "$420.00" },
        { category: "Network",     qty: 8,  unit: "ea", description: "Wi-Fi 6 AP — ceiling, POE",        unit_price: "$285.00", line_total: "$2,280.00" },
        { category: "Labor",       qty: 16, unit: "hr", description: "Low-voltage installer",            unit_price: "$92.00",  line_total: "$1,472.00" },
      ]}
    />
  ),
});

/* ═════════════ 6. FINANCIAL ═════════════ */

figma.connect(FinancialHero, NODE("FINANCIAL-HERO"), {
  props: {
    caps:       figma.string("caps"),
    finalLabel: figma.string("finalLabel"),
    finalValue: figma.string("finalValue"),
    finalUnit:  figma.string("finalUnit"),
  },
  example: ({ caps, finalLabel, finalValue, finalUnit }) => (
    <FinancialHero
      caps={caps}
      finalLabel={finalLabel}
      finalValue={finalValue}
      finalUnit={finalUnit}
      ledgerRows={[
        { k: "Base bid",        v: "$180,400.00" },
        { k: "Contingency 5%",  v: "$9,020.00" },
        { k: "Mobilization",    v: "$2,460.00" },
      ]}
    />
  ),
});

figma.connect(PriceCard, NODE("PRICE-CARD"), {
  props: {
    kicker: figma.string("kicker"),
    title:  figma.string("title"),
    body:   figma.string("body"),
    price:  figma.string("price"),
    sub:    figma.string("sub"),
  },
  example: ({ kicker, title, body, price, sub }) => (
    <PriceCard kicker={kicker} title={title} body={body} price={price} sub={sub} />
  ),
});

figma.connect(SubStrip, NODE("SUB-STRIP"), {
  props: {
    k: figma.string("k"),
    v: figma.string("v"),
  },
  example: ({ k, v }) => <SubStrip k={k} v={v} />,
});

figma.connect(MSPCard, NODE("MSP-CARD"), {
  props: {
    kicker:       figma.string("kicker"),
    title:        figma.string("title"),
    body:         figma.string("body"),
    priceDisplay: figma.string("priceDisplay"),
    monthly:      figma.string("monthly"),
    annual:       figma.string("annual"),
  },
  example: ({ kicker, title, body, priceDisplay, monthly, annual }) => (
    <MSPCard
      kicker={kicker}
      title={title}
      body={body}
      priceDisplay={priceDisplay}
      monthly={monthly}
      annual={annual}
    />
  ),
});

/* ═════════════ 7. WARRANTY / EXCLUSIONS ═════════════ */

figma.connect(WarrantyCallout, NODE("WARRANTY-CALLOUT"), {
  props: {
    pullQuote: figma.string("pullQuote"),
    body:      figma.string("body"),
  },
  example: ({ pullQuote, body }) => <WarrantyCallout pullQuote={pullQuote} body={body} />,
});

figma.connect(ExclusionsList, NODE("EXCLUSIONS-LIST"), {
  props: {
    title: figma.string("title"),
  },
  example: ({ title }) => (
    <ExclusionsList
      title={title}
      items={[
        "Permit fees (by GC)",
        "Low-voltage backboxes in drywall after close",
        "After-hours or weekend labor unless scheduled",
        "ISP circuit termination and activation",
      ]}
    />
  ),
});

/* ═════════════ 8. TIMELINE ═════════════ */

figma.connect(Timeline4Dot, NODE("TIMELINE-4-DOT"), {
  example: () => (
    <Timeline4Dot
      steps={[
        { k: "Accept",     v: "Today",         sub: "Sign + 25% deposit" },
        { k: "Mobilize",   v: "Within 5 days", sub: "Schedule confirmed" },
        { k: "Install",    v: "Days 6–14",     sub: "On-site crew" },
        { k: "Close out",  v: "Day 15",        sub: "As-builts + warranty" },
      ]}
    />
  ),
});

figma.connect(TimelineCard, NODE("TIMELINE-CARD"), {
  props: {
    title: figma.string("title"),
    alert: figma.string("alert"),
  },
  example: ({ title, alert }) => (
    <TimelineCard
      title={title}
      alert={alert}
      rows={[
        { k: "Pre-drywall",     v: "2026-05-04" },
        { k: "Rough-in",        v: "2026-05-04 – 2026-05-08" },
        { k: "Trim / finish",    v: "2026-05-12 – 2026-05-15" },
        { k: "Walkthrough",      v: "2026-05-15" },
      ]}
    />
  ),
});

/* ═════════════ 9. CHANGE-ORDER SPECIFIC ═════════════ */

figma.connect(WhyCallout, NODE("WHY-CALLOUT"), {
  props: {
    kicker: figma.string("kicker"),
    body:   figma.string("body"),
  },
  example: ({ kicker, body }) => <WhyCallout kicker={kicker} body={body} />,
});

figma.connect(CarryCard, NODE("CARRY-CARD"), {
  props: {
    kicker: figma.string("kicker"),
  },
  example: ({ kicker }) => (
    <CarryCard
      kicker={kicker}
      items={[
        "Exclusions carry from original contract",
        "MSP terms unchanged",
        "Loyalty pricing unchanged",
        "Insurance certificates on file",
      ]}
    />
  ),
});

/* ═════════════ 10. CLOSE ═════════════ */

figma.connect(TermsGrid, NODE("TERMS-GRID"), {
  example: () => (
    <TermsGrid
      rows={[
        { k: "Payment",    v: "25% deposit · 50% at rough-in · 25% at closeout" },
        { k: "Valid thru",  v: "30 days from issue date" },
        { k: "Changes",     v: "Written change orders only" },
        { k: "Warranty",    v: "12 months GCC labor · manufacturer parts" },
      ]}
    />
  ),
});

figma.connect(AcceptanceBlock, NODE("ACCEPTANCE-BLOCK"), {
  example: () => (
    <AcceptanceBlock
      left={{
        heading: "Accepted by — Client",
        kicker:  "Signatory",
        name:    "Rachel Ortiz",
        subs:    ["AdHoc Center · Authorized"],
        signatures: [{ left: "Signature", right: "Date" }],
      }}
      right={{
        heading: "Offered by — GCC",
        kicker:  "Estimator",
        name:    "Nathan Morris",
        subs:    ["Green Communications Contracting LLC"],
        signatures: [{ left: "Signature", right: "Date" }],
        approver: { kicker: "Approver", name: "Kaitlyn Harris", title: "Principal · GCC" },
      }}
    />
  ),
});

figma.connect(NotesBox, NODE("NOTES-BOX"), {
  props: {
    kicker: figma.string("kicker"),
  },
  example: ({ kicker }) => (
    <NotesBox
      kicker={kicker}
      items={[
        "Prices hold for 30 days from issue",
        "Permits by GC unless noted",
        "Site access weekdays 7a–5p",
      ]}
    />
  ),
});

figma.connect(ReassureStrip, NODE("REASSURE-STRIP"), {
  example: () => (
    <ReassureStrip body="Thank you for trusting GCC with your project. We look forward to earning your recommendation." />
  ),
});
