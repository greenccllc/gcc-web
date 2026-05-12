---
name: proposal-generator
description: |
  Generates branded GCC proposal PDFs from uploaded RFP, plans, specs, emails,
  or intake notes. Produces one of four proposal types — formal bid, direct
  quote, residential quote, or change order — with all GCC hard rules
  auto-enforced. Trigger whenever the user says "generate a proposal",
  "build a bid", "quote this job", "write up a change order", or drops a set
  of source files and asks for a proposal. Reads the uploaded source material,
  asks clarifying questions only if required, emits a PDF to /out/.
---

# Proposal Generator

This skill turns a set of uploaded source files (RFP, plans, specs, emails,
meeting notes, prior quotes) into a branded GCC proposal PDF.

## Pre-flight — read these first

Before running any step, read:

1. `rules.md` — non-negotiable hard rules. The generator enforces them but
   you still narrate scope and voice, so the rules must be loaded in memory.
2. `../3-Intake/4-Company/Knowledge Base.md` — pricing structure, service
   catalog, preferred manufacturers, leadership, verticals.
3. `../3-Intake/4-Company/Marketing/Brand Profile.md` — palette, logo rules,
   voice guidelines.
4. `../GCC LLC - Claude Project Profile.md` — compressed reference of the
   above for quick lookup.

## Workflow

### 1. Ingest source files

User will have dropped files into a project folder. Typically:
- An RFP or solicitation PDF
- Plans or drawings (PDF or image)
- Specs (PDF, docx)
- Email threads (as `.eml`, `.msg`, or exported text)
- Prior GCC quotes to the same client (for loyalty-discount detection)
- Site-walk notes or photos

Read every text-bearing file. For PDFs that don't extract well, use
`pdftotext` or OCR. Do not fabricate content — if a detail isn't in the
source, either leave it for a clarifying question or mark as TBD in the
draft and surface it to the user.

### 2. Classify the proposal type

Decide which of the four types this is:

| Signal | Likely type |
|--------|------------|
| Spec book, bid form, GC cover letter, bid due date, MasterFormat sections | **formal-bid** |
| Direct email from a facility manager / owner, no GC middle layer | **direct-quote** |
| Homeowner or custom-builder, single-family address | **residential-quote** |
| References an existing GCC project or PO number, asks for added/removed work | **change-order** |

If ambiguous, ask the user once. Never guess silently.

### 3. Extract intake

Populate a YAML intake file in `intakes/` matching the schema at
`intakes/_schema.yaml`. Required fields:

- `proposal_type`: one of formal-bid / direct-quote / residential-quote / change-order
- `proposal_no`: auto-generated (format: `GCC-YYYY-NNNN`)
- `issue_date`: today's date (ISO 8601)
- `validity_days`: 30 (default; override only with user confirmation)
- `client`: name, contact, email, address
- `project`: name, address, description (2–3 sentences), known milestones
- `scope_lines`: list of `{qty, description, unit_price, line_total, category}`
- `alternates`: list (always includes the MSP alternate — §1.2)
- `exclusions`: list (pull from rules §1.6 if any match the source)
- `loyalty_discount_pct`: 0 unless repeat client — check `prior-clients.yaml`
- `prepared_by`: Nathan Morris (default)
- `approved_by`: Kaitlyn Lim Morris (if bid > $25k or public work)
- `notes`: any call-outs for the narrative (tight schedule, unusual scope, etc.)

### 4. Run hard-rule enforcement pass

Before generating the PDF, run through `rules.md` §6 (QA Gate). If any
check fails, fix the intake, not the rendered output. Report each fix
to the user so they can track what was enforced.

### 5. Generate the PDF

```bash
python3 build_proposal.py intakes/<intake-file>.yaml
```

Output lands in `out/` named `<proposal_no>_<client-slug>_<type>.pdf`.

### 6. Surface to the user

Present the PDF with a `computer://` link. Also surface:
- The intake YAML (for editability)
- The enforcement report (what rules were applied)
- Any TBD items still unresolved

## When to ask the user

Ask only if you can't read it from the source files AND it's required by
the schema. Typical questions:

- Loyalty discount? ("Has GCC worked with [client] before? I don't see
  prior invoices in the project folder.")
- Prevailing wage? ("This looks like a public-work bid. Should I include
  the prevailing-wage compliance statement?")
- Labor-separate vs. rolled? ("Bid form usually separates labor from
  materials — do you want that split here, or rolled into scope lines?")
- Validity days? ("Default is 30 days. The RFP asks for pricing held
  90 days — override to 90?")

Do NOT ask about:
- Cat6A baseline (enforced always — §1.1)
- Whether to include MSP alternate (enforced always — §1.2)
- Warranty language (enforced always — §1.4)
- Forbidden phrases (enforced always — §2.3)

## File layout

```
proposal-generator/
├── SKILL.md                  # this file
├── rules.md                  # hard rules catalog
├── build_proposal.py         # PDF generator (unified, branches by type)
├── intakes/
│   ├── _schema.yaml         # intake schema template
│   └── <generated>.yaml     # per-project intakes
├── examples/                 # example filled intakes per type
│   ├── bid-example.yaml
│   ├── quote-example.yaml
│   ├── residential-example.yaml
│   └── change-order-example.yaml
├── templates/                # prose templates for reusable sections
│   ├── transmittal.txt
│   ├── warranty.txt
│   ├── exclusions-standard.txt
│   └── terms-standard.txt
├── prior-clients.yaml        # loyalty-discount lookup
└── out/                      # generated PDFs
```

## Common failure modes

- **Fabricating scope**: if the source files don't describe the scope, ask
  the user rather than inventing lines. This is the #1 way a generated
  proposal gets returned with corrections.
- **Missing MSP alternate**: auto-enforced by the generator, but still run
  the QA gate (§6 check 2).
- **Wrong client-facing voice**: residential quotes written in bid voice
  feel cold. Bid voice on a homeowner quote reads as condescending. Use
  §2.1 vs §2.2 correctly.
- **Forbidden phrases** slipping through narrative: always run the grep
  check in §6.7 before declaring the PDF ready.
