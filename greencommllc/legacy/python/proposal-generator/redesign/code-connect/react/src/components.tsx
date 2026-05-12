/**
 * GCC Proposal component library — React.
 * Mirror of jinja/macros/all.html. Props use camelCase.
 *
 * All styling is in ./styles.css using token custom properties from
 * ../../tokens/tokens.css. No CSS-in-JS runtime required.
 */
import * as React from "react";
import "./styles.css";

/* ───────── Shared types ───────── */

export type LedgerRow = { k: string; v: string; variant?: "disc" | "accent" };
export type LoyaltyRow = { label: string; amount: string; pct?: string };
export type KV = { k: string; v: string };
export type KVSub = KV & { sub?: string };
export type KVVariant = KVSub & { variant?: "money" | "price" | "accent" | "final" };
export type ScopeLine = {
  qty: string | number;
  unit: string;
  description: string;
  unit_price: string;
  line_total: string;
  category?: string;
};

/* ═════════════ 1. CHROME ═════════════ */

export const BrandLine: React.FC<{ brand: string; tag: string }> = ({ brand, tag }) => (
  <div className="gcc-brandline">
    <div className="gcc-brand">{brand}</div>
    <div className="gcc-tag">{tag}</div>
  </div>
);

export const ForestCoverBand: React.FC<{
  brand: string;
  classification: string;
  ids: KVSub[];
}> = ({ brand, classification, ids }) => (
  <div className="gcc-cover-band">
    <div className="gcc-cover-band__top">
      <div className="gcc-brand">{brand}</div>
      <div className="gcc-classification">{classification}</div>
    </div>
    <div className="gcc-cover-id">
      {ids.map((cell, i) => (
        <div key={i} className="gcc-cover-id__cell">
          <div className="gcc-cover-id__k">{cell.k}</div>
          <div className="gcc-cover-id__v">{cell.v}</div>
          {cell.sub && <div className="gcc-cover-id__sub">{cell.sub}</div>}
        </div>
      ))}
    </div>
  </div>
);

export const RunningFooter: React.FC<{
  proposalNo: string;
  issueDate: string;
  page: number | string;
}> = ({ proposalNo, issueDate, page }) => (
  <div className="gcc-footer">
    <span>GCC LLC · Proprietary &amp; Confidential · {proposalNo} · {issueDate}</span>
    <span>Page {page}</span>
  </div>
);

export const SectionRule: React.FC<{ title: string; pgCaption?: string }> = ({ title, pgCaption }) => (
  <div className="gcc-section-rule">
    <h1>{title}</h1>
    {pgCaption && <div className="gcc-section-rule__pg">{pgCaption}</div>}
  </div>
);

/* ═════════════ 2. COVER HEROES ═════════════ */

export const PriceHeroBand: React.FC<{
  subtotal: string;
  final: string;
  loyaltyRow?: LoyaltyRow;
  showLoyaltyBadge?: boolean;
  extras?: KV[];
}> = ({ subtotal, final, loyaltyRow, showLoyaltyBadge, extras = [] }) => (
  <div className="gcc-price-hero">
    <div className="gcc-price-hero__top">
      <div className="gcc-caps">Your price</div>
      {showLoyaltyBadge && (
        <div className="gcc-price-hero__loyal">
          ★ Repeat-client loyalty applied{loyaltyRow?.pct ? ` — ${loyaltyRow.pct}` : ""}
        </div>
      )}
    </div>
    <div className="gcc-price-hero__math">
      <div className="gcc-ledger">
        <div className="gcc-ledger__row">
          <div className="gcc-ledger__k">Scope subtotal</div>
          <div className="gcc-ledger__v gcc-num">{subtotal}</div>
        </div>
        {loyaltyRow && (
          <div className="gcc-ledger__row gcc-ledger__row--disc">
            <div className="gcc-ledger__k">{loyaltyRow.label}</div>
            <div className="gcc-ledger__v gcc-num">{loyaltyRow.amount}</div>
          </div>
        )}
        {extras.map((x, i) => (
          <div key={i} className="gcc-ledger__row">
            <div className="gcc-ledger__k">{x.k}</div>
            <div className="gcc-ledger__v">{x.v}</div>
          </div>
        ))}
      </div>
      <div className="gcc-price-hero__final">
        <div className="gcc-caps">Final investment</div>
        <div className="gcc-price-hero__val gcc-num">{final}</div>
      </div>
    </div>
  </div>
);

export const LoyaltyLedger: React.FC<{ rows: LedgerRow[] }> = ({ rows }) => (
  <div className="gcc-ledger">
    {rows.map((r, i) => (
      <div
        key={i}
        className={`gcc-ledger__row${r.variant ? ` gcc-ledger__row--${r.variant}` : ""}`}
      >
        <div className="gcc-ledger__k">{r.k}</div>
        <div className="gcc-ledger__v gcc-num">{r.v}</div>
      </div>
    ))}
  </div>
);

export const SummaryStrip4: React.FC<{ cells: KVVariant[]; goldTop?: boolean }> = ({
  cells,
  goldTop = true,
}) => (
  <div className={`gcc-summary-strip${goldTop ? " gcc-summary-strip--gold" : ""}`}>
    {cells.map((c, i) => (
      <div
        key={i}
        className={`gcc-summary-strip__cell${c.variant ? ` gcc-summary-strip__cell--${c.variant}` : ""}`}
      >
        <div className="gcc-caps">{c.k}</div>
        <div className="gcc-summary-strip__v">{c.v}</div>
        {c.sub && <div className="gcc-summary-strip__sub">{c.sub}</div>}
      </div>
    ))}
  </div>
);

export const MathPanel3Cell: React.FC<{
  original: string;
  delta: string;
  revised: string;
  kicker: string;
  title: string;
  sub: string;
}> = ({ original, delta, revised, kicker, title, sub }) => (
  <div className="gcc-math-panel">
    <div className="gcc-math-panel__kicker">{kicker}</div>
    <h1>{title}</h1>
    <div className="gcc-math-panel__sub">{sub}</div>
    <div className="gcc-math">
      <div className="gcc-math__cell">
        <div className="gcc-caps">Original contract</div>
        <div className="gcc-math__v gcc-num">{original}</div>
      </div>
      <div className="gcc-math__op">+</div>
      <div className="gcc-math__cell gcc-math__cell--accent">
        <div className="gcc-caps">This change order</div>
        <div className="gcc-math__v gcc-num">{delta}</div>
      </div>
      <div className="gcc-math__op">=</div>
      <div className="gcc-math__cell gcc-math__cell--final">
        <div className="gcc-caps">Revised contract</div>
        <div className="gcc-math__v gcc-num">{revised}</div>
      </div>
    </div>
  </div>
);

export const StampRow4: React.FC<{ stats: KV[] }> = ({ stats }) => (
  <div className="gcc-stamp-row">
    {stats.map((s, i) => (
      <div key={i} className="gcc-stamp-row__cell">
        <div className="gcc-caps">{s.k}</div>
        <div className="gcc-stamp-row__v">{s.v}</div>
      </div>
    ))}
  </div>
);

export const FamilyDear: React.FC<{ prefix: string; family: string; suffix: string }> = ({
  prefix,
  family,
  suffix,
}) => (
  <div className="gcc-dear">
    {prefix} <span className="gcc-dear__family">{family}</span>{suffix}
  </div>
);

export const CoverIdTriple: React.FC<{ cells: KVSub[] }> = ({ cells }) => (
  <ForestCoverBand brand="" classification="" ids={cells} />
);

export const CoverFoot: React.FC<{ leftRows: KV[]; rightRows: KV[] }> = ({ leftRows, rightRows }) => (
  <div className="gcc-cover-foot">
    <div>
      {leftRows.map((r, i) => (
        <div key={i} className="gcc-cover-foot__row">
          <div className="gcc-caps">{r.k}</div>
          <div className="gcc-cover-foot__v">{r.v}</div>
        </div>
      ))}
    </div>
    <div>
      {rightRows.map((r, i) => (
        <div key={i} className="gcc-cover-foot__row">
          <div className="gcc-caps">{r.k}</div>
          <div className="gcc-cover-foot__v">{r.v}</div>
        </div>
      ))}
    </div>
  </div>
);

/* ═════════════ 3. TRANSMITTAL / COMMITMENTS ═════════════ */

export type CommitmentItem = { k: string; title: string; body: React.ReactNode };

export const CommitmentsGrid4: React.FC<{ items: CommitmentItem[] }> = ({ items }) => (
  <div className="gcc-commitments">
    {items.map((item, i) => (
      <div key={i} className="gcc-cx">
        <div className="gcc-caps">{item.k}</div>
        <h3>{item.title}</h3>
        <p>{item.body}</p>
      </div>
    ))}
  </div>
);

export type Party = { org: string; meta: React.ReactNode };

export const ToFromPair: React.FC<{ to: Party; from: Party }> = ({ to, from }) => (
  <div className="gcc-to-from">
    <div className="gcc-to-from__col">
      <div className="gcc-caps">Submitted to</div>
      <h3>{to.org}</h3>
      <div className="gcc-to-from__meta">{to.meta}</div>
    </div>
    <div className="gcc-to-from__col">
      <div className="gcc-caps">Submitted by</div>
      <h3>{from.org}</h3>
      <div className="gcc-to-from__meta">{from.meta}</div>
    </div>
  </div>
);

/* ═════════════ 4. ROOM PLAN ═════════════ */

export type Room = { k: string; title: string; body: string; highlight?: boolean };

export const RoomCard: React.FC<Room> = ({ k, title, body, highlight }) => (
  <div className={`gcc-room${highlight ? " gcc-room--highlight" : ""}`}>
    <div className="gcc-caps">{k}</div>
    <h3>{title}</h3>
    <p>{body}</p>
  </div>
);

export const RoomGrid: React.FC<{ rooms: Room[] }> = ({ rooms }) => (
  <div className="gcc-rooms">
    {rooms.map((r, i) => <RoomCard key={i} {...r} />)}
  </div>
);

/* ═════════════ 5. SCOPE ═════════════ */

export const CategoryBand: React.FC<{ label: string }> = ({ label }) => (
  <tr className="gcc-scope__band"><td colSpan={5}>{label}</td></tr>
);

export const ScopeFootStandard: React.FC<{
  subtotal: string;
  final: string;
  finalLabel?: string;
}> = ({ subtotal, final, finalLabel = "Total" }) => (
  <tfoot>
    <tr><td colSpan={4}>Subtotal</td><td className="gcc-n">{subtotal}</td></tr>
    <tr><td colSpan={4} className="gcc-scope__final">{finalLabel}</td>
        <td className="gcc-n gcc-scope__final-val">{final}</td></tr>
  </tfoot>
);

export const ScopeFootLoyalty: React.FC<{
  subtotal: string;
  loyaltyRow: LoyaltyRow;
  final: string;
  finalLabel?: string;
}> = ({ subtotal, loyaltyRow, final, finalLabel = "Final investment" }) => (
  <tfoot>
    <tr><td colSpan={4}>Subtotal</td><td className="gcc-n">{subtotal}</td></tr>
    <tr><td colSpan={4} className="gcc-scope__disc">{loyaltyRow.label}</td>
        <td className="gcc-n gcc-scope__disc">{loyaltyRow.amount}</td></tr>
    <tr><td colSpan={4} className="gcc-scope__final">{finalLabel}</td>
        <td className="gcc-n gcc-scope__final-val">{final}</td></tr>
  </tfoot>
);

export const ScopeTable: React.FC<{
  lines: ScopeLine[];
  footVariant?: "standard" | "loyalty" | "none";
  subtotal?: string;
  loyaltyRow?: LoyaltyRow;
  final?: string;
  finalLabel?: string;
}> = ({ lines, footVariant = "standard", subtotal, loyaltyRow, final, finalLabel }) => {
  let lastCat = "";
  return (
    <table className="gcc-scope">
      <thead>
        <tr>
          <th>Qty</th><th>Unit</th><th>Description</th>
          <th className="gcc-n">Unit price</th><th className="gcc-n">Extended</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l, i) => {
          const showBand = l.category && l.category !== lastCat;
          if (showBand) lastCat = l.category!;
          return (
            <React.Fragment key={i}>
              {showBand && <CategoryBand label={l.category!} />}
              <tr>
                <td className="gcc-num">{l.qty}</td>
                <td>{l.unit}</td>
                <td>{l.description}</td>
                <td className="gcc-n">{l.unit_price}</td>
                <td className="gcc-n">{l.line_total}</td>
              </tr>
            </React.Fragment>
          );
        })}
      </tbody>
      {footVariant === "standard" && subtotal && final && (
        <ScopeFootStandard subtotal={subtotal} final={final} finalLabel={finalLabel} />
      )}
      {footVariant === "loyalty" && subtotal && loyaltyRow && final && (
        <ScopeFootLoyalty subtotal={subtotal} loyaltyRow={loyaltyRow} final={final} finalLabel={finalLabel} />
      )}
    </table>
  );
};

/* ═════════════ 6. FINANCIAL ═════════════ */

export const FinancialHero: React.FC<{
  caps: string;
  ledgerRows: KV[];
  finalLabel: string;
  finalValue: string;
  finalUnit?: string;
}> = ({ caps, ledgerRows, finalLabel, finalValue, finalUnit }) => (
  <div className="gcc-fin-hero">
    <div className="gcc-fin-hero__top">
      <div>
        <div className="gcc-caps">{caps}</div>
        <table className="gcc-fin-hero__ledger">
          <tbody>
            {ledgerRows.map((r, i) => (
              <tr key={i}>
                <td className="gcc-fin-hero__k">{r.k}</td>
                <td className="gcc-fin-hero__v gcc-num">{r.v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="gcc-fin-hero__final">
        <div className="gcc-caps">{finalLabel}</div>
        <div className="gcc-fin-hero__val gcc-num">{finalValue}</div>
        {finalUnit && <div className="gcc-fin-hero__unit">{finalUnit}</div>}
      </div>
    </div>
  </div>
);

export const PriceCard: React.FC<{
  kicker: string;
  title: string;
  body: string;
  price: string;
  sub: string;
}> = ({ kicker, title, body, price, sub }) => (
  <div className="gcc-price-card">
    <div className="gcc-price-card__left">
      <div className="gcc-caps">{kicker}</div>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
    <div className="gcc-price-card__right">
      <div className="gcc-price-card__v gcc-num">{price}</div>
      <div className="gcc-price-card__sub">{sub}</div>
    </div>
  </div>
);

export const SubStrip: React.FC<{ k: string; v: string }> = ({ k, v }) => (
  <div className="gcc-sub-strip">
    <div className="gcc-sub-strip__k">{k}</div>
    <div className="gcc-sub-strip__v gcc-num">{v}</div>
  </div>
);

export const MSPCard: React.FC<{
  kicker: string;
  title: string;
  body: string;
  priceDisplay: string;
  monthly: string;
  annual: string;
}> = ({ kicker, title, body, priceDisplay, monthly, annual }) => (
  <div className="gcc-msp">
    <div className="gcc-msp__left">
      <div className="gcc-caps">{kicker}</div>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
    <div className="gcc-msp__right">
      <div className="gcc-msp__price gcc-num">
        {priceDisplay}<span className="gcc-msp__price-unit">/mo</span>
      </div>
      <div className="gcc-msp__sub">Monthly · {monthly}<br />Annual · {annual}</div>
    </div>
  </div>
);

/* ═════════════ 7. WARRANTY / EXCLUSIONS ═════════════ */

export const WarrantyCallout: React.FC<{ pullQuote: string; body: string }> = ({
  pullQuote,
  body,
}) => (
  <div className="gcc-warranty">
    <div className="gcc-caps gcc-warranty__caps">Warranty</div>
    <div className="gcc-warranty__pull">&ldquo;{pullQuote}&rdquo;</div>
    <p>{body}</p>
  </div>
);

export const ExclusionsList: React.FC<{ title: string; items: string[] }> = ({ title, items }) => (
  <div className="gcc-excl">
    <h2>{title}</h2>
    <ul>{items.map((i, idx) => <li key={idx}>{i}</li>)}</ul>
  </div>
);

/* ═════════════ 8. TIMELINE ═════════════ */

export type TimelineStep = { k: string; v: string; sub?: string };

export const Timeline4Dot: React.FC<{ steps: TimelineStep[] }> = ({ steps }) => (
  <div className="gcc-timeline">
    {steps.map((s, i) => (
      <div key={i} className="gcc-timeline__step">
        <div className="gcc-caps">{s.k}</div>
        <div className="gcc-timeline__v">{s.v}</div>
        {s.sub && <div className="gcc-timeline__sub">{s.sub}</div>}
      </div>
    ))}
  </div>
);

export const TimelineCard: React.FC<{
  title: string;
  rows: KV[];
  alert?: string;
}> = ({ title, rows, alert }) => (
  <div className="gcc-timeline-card">
    <h3>{title}</h3>
    {rows.map((r, i) => (
      <div key={i} className="gcc-timeline-card__row">
        <div className="gcc-timeline-card__k">{r.k}</div>
        <div>{r.v}</div>
      </div>
    ))}
    {alert && <div className="gcc-timeline-card__alert">{alert}</div>}
  </div>
);

/* ═════════════ 9. CHANGE-ORDER SPECIFIC ═════════════ */

export const WhyCallout: React.FC<{ kicker: string; body: string }> = ({ kicker, body }) => (
  <div className="gcc-why">
    <div className="gcc-caps gcc-why__caps">{kicker}</div>
    <p>{body}</p>
  </div>
);

export const CarryCard: React.FC<{ kicker: string; items: string[] }> = ({ kicker, items }) => (
  <div className="gcc-carry">
    <div className="gcc-caps">{kicker}</div>
    <ul>{items.map((i, idx) => <li key={idx}>{i}</li>)}</ul>
  </div>
);

/* ═════════════ 10. CLOSE ═════════════ */

export const TermsGrid: React.FC<{ rows: KV[] }> = ({ rows }) => (
  <div className="gcc-terms">
    {rows.map((r, i) => (
      <div key={i} className="gcc-terms__row">
        <div className="gcc-terms__k">{r.k}</div>
        <div>{r.v}</div>
      </div>
    ))}
  </div>
);

export type AcceptParty = {
  heading: string;
  kicker?: string;
  name?: string;
  subs?: string[];
  signatures?: Array<{ left?: string; right?: string }>;
  approver?: { kicker: string; name: string; title: string };
};

export const AcceptanceBlock: React.FC<{ left: AcceptParty; right: AcceptParty }> = ({
  left,
  right,
}) => (
  <div className="gcc-accept">
    {[left, right].map((party, idx) => (
      <div key={idx}>
        <h3>{party.heading}</h3>
        {party.kicker && <div className="gcc-caps">{party.kicker}</div>}
        {party.name && <div className="gcc-accept__name">{party.name}</div>}
        {party.subs?.map((s, i) => <div key={i} className="gcc-accept__sub">{s}</div>)}
        {party.signatures?.map((sig, i) => (
          <React.Fragment key={i}>
            <div className="gcc-sig-line" />
            <div className="gcc-sig-cap">
              <span>{sig.left ?? "Signature"}</span>
              <span>{sig.right ?? "Date"}</span>
            </div>
          </React.Fragment>
        ))}
        {party.approver && (
          <>
            <div className="gcc-caps" style={{ marginTop: "16pt" }}>{party.approver.kicker}</div>
            <div className="gcc-accept__name">{party.approver.name}</div>
            <div className="gcc-accept__sub">{party.approver.title}</div>
            <div className="gcc-sig-line" />
            <div className="gcc-sig-cap"><span>Signature</span><span>Date</span></div>
          </>
        )}
      </div>
    ))}
  </div>
);

export const NotesBox: React.FC<{ kicker: string; items: string[] }> = ({ kicker, items }) => (
  <div className="gcc-notes">
    <div className="gcc-notes__k">{kicker}</div>
    <ul>{items.map((i, idx) => <li key={idx}>{i}</li>)}</ul>
  </div>
);

export const ReassureStrip: React.FC<{ body: React.ReactNode }> = ({ body }) => (
  <div className="gcc-reassure">{body}</div>
);
