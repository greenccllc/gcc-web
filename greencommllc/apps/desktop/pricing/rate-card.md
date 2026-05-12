# GCC LLC — Rate Card

**Last updated:** 2026-04-20
**Status:** ⚠ **TBD values require Nathan's input before first use.** Placeholders are marked `$TBD` and include reasonable starting ranges from Division 27/28 contractor benchmarks in the KCMO/STL metro. Override before any live proposal.

**Rule:** Every proposal pulls labor and material pricing from THIS file. If you see a rate hard-coded into a template or scope file, it's a bug — delete and reference this file instead.

---

## Labor rates (hourly, billable to client)

| Role | Standard | Prevailing Wage | After-Hours (1.5×) |
|---|---:|---:|---:|
| Project Manager | `$TBD` (benchmark: $95–120) | `$TBD` | `$TBD` |
| RCDD / Lead Engineer | `$TBD` (benchmark: $120–150) | `$TBD` | `$TBD` |
| BICSI Installer / Foreman | `$TBD` (benchmark: $85–105) | `$TBD` | `$TBD` |
| Technician (Journey level) | `$TBD` (benchmark: $70–90) | `$TBD` | `$TBD` |
| Technician (Apprentice / Helper) | `$TBD` (benchmark: $45–60) | `$TBD` | `$TBD` |
| CAD / Documentation | `$TBD` (benchmark: $80–100) | `$TBD` | `$TBD` |

**Minimum billable per visit:** 4 hours (half-day) for service calls and punch-list visits.
**Mobilization / demobilization:** 2 hours standard labor per site (includes truck-stock reload, travel).

## Material markup

| Category | Markup over actual cost |
|---|---:|
| Cable (bulk reel) | `$TBD` (benchmark: 25–35%) |
| Connectors, jacks, patch panels | `$TBD` (benchmark: 30–40%) |
| Active hardware (switches, APs, cameras) | `$TBD` (benchmark: 20–30%) |
| Specialty items (fusion splices, enclosures) | `$TBD` (benchmark: 35–50%) |
| Tools / consumables (zip ties, firestop, labels) | Rolled into labor as overhead |

**Purchased-service passthrough:** 10% (e.g., rented lift rental, specialty core-drill, OTDR calibration cert if outsourced).

## Unit prices — turnkey installed

Used for density-based bidding. Each unit price is **fully loaded** — cable, termination, testing, certification, labeling, and the associated share of mobilization.

### Cabling (per drop, installed + certified)

| Item | Unit Price |
|---:|---:|
| Cat6A plenum data drop, standard run (≤ 295 ft) | `$TBD` (benchmark: $185–245) |
| Cat6A plenum data drop, extended run (295–400 ft, requires IDF) | `$TBD` (benchmark: $235–300) |
| Composite drop (Cat6A + power + camera bracket) | `$TBD` (benchmark: $225–285) |
| Fiber strand, single-mode OS2, fusion-spliced + OTDR + LSPM | `$TBD` per strand (benchmark: $85–125) |
| Fiber strand, multi-mode OM4, mechanical splice + OTDR + LSPM | `$TBD` per strand (benchmark: $95–135) |
| RG6 coax TV drop, swept-tested | `$TBD` (benchmark: $145–195) |

### Security devices (per device, installed + commissioned)

| Item | Unit Price |
|---:|---:|
| IP camera, standard bullet/dome 4MP | `$TBD` (benchmark: $225–325 labor; + camera cost) |
| IP camera, premium 8MP or PTZ | `$TBD` (benchmark: $325–450 labor; + camera cost) |
| Card reader + strike + DPS + REX (full door) | `$TBD` (benchmark: $650–900 labor; + hardware cost) |
| Motion detector, door/window contact | `$TBD` (benchmark: $125–175 labor) |
| Intercom entry station | `$TBD` (benchmark: $475–650 labor) |

### Rack buildout (per rack)

| Item | Unit Price |
|---:|---:|
| 42U rack install, ground-bonded, blanking, wire managers | `$TBD` (benchmark: $1,400–2,200) |
| Plywood backboard (3/4" fire-rated, painted, mounted) | `$TBD` (benchmark: $385–525 per 4'×8') |
| TMGB install with conductor bonding | `$TBD` (benchmark: $475–725) |

## Estimating buffers (applied to labor hours)

- **10% buffer** on jobs with 50–500 endpoints
- **15% buffer** on complex-access jobs (occupied healthcare, historic buildings, above-ceiling hazmat)
- **Round mobilization/demobilization UP to the next half-day**
- Use the **higher BICSI rate** when choice exists between two labor assumptions

## Overhead, G&A, and profit

| Component | % of Cost Basis |
|---|---:|
| Overhead | `$TBD` (benchmark: 12–18%) |
| G&A | `$TBD` (benchmark: 6–10%) |
| Profit | `$TBD` (benchmark: 8–15% on commercial; 15–25% on residential) |

## Discounts (standard, applied at top-level)

- **Loyalty Discount** — 5% on future bids + 5% on active Managed Services = 10% stacked. Shown as a single "Loyalty Discount" line. Never broken out into components.
- **Weekend / after-hours work** — **DEDUCT alternate D1** (labor-surplus credit). Never an ADD premium. Amount case-by-case.
- **Volume** — Negotiated only on multi-site master agreements; not offered as a line on a single-project bid.

## Payment terms (standard on all commercial)

- **Progress billing** — monthly, pay-when-paid language accepted if GC contract requires it
- **Retainage** — 5% standard, 10% if required by GC contract, released upon substantial completion + punch clearance
- **Net 30** from invoice date on monthly progress bills

## Residential payment terms

- **30% deposit at contract signing**
- **40% on material delivery to site**
- **30% on substantial completion + homeowner walkthrough**
- Credit-card (Stripe) surcharge 3% or ACH free; checks free
