# GCC Proposal Templates

Source-of-truth `.docx` templates and rendered `.pdf` previews used by the
GCC bid / proposal pipeline.

The merge pipeline pulls the rendered `.pdf` from each subdirectory and
assembles a per-project proposal package. The `.docx` is the editable
source — the `.pdf` is regenerated from it via `docx2pdf` (Word automation
on the build host).

## Layout

```
Templates/
├── Standard/          # Bundler-rendered sections (Cover Letter, Bid Overview,
│                      # Bid Proposal, SOW, Qualifications, Standards, Letterhead)
├── Conditional/       # Sections that only ship when triggered by job context
│                      # (Prevailing Wage Cert, EMR Letter, Safety Program, etc.)
├── Internal-Only/     # Cable Schedule, Finance Summary, Project Schedule —
│                      # never sent outside GCC
├── Scripts/           # Automation around template rendering / merging
└── Archive/           # Older snapshots kept for reference
```

## Editing a template

1. Open the `.docx` in Word (or LibreOffice — but Word renders cleanest).
2. Save.
3. Re-render to PDF:
   ```powershell
   python -c "from docx2pdf import convert; convert('Conditional/Prevailing Wage Certification.docx', 'Conditional/Prevailing Wage Certification.pdf')"
   ```
   Or batch-render a whole folder:
   ```powershell
   python -c "from docx2pdf import convert; convert('Conditional', 'Conditional')"
   ```
4. `git add` both the `.docx` and the `.pdf`, commit.

Both files are committed because the merge pipeline reads the `.pdf` directly.
Don't commit just the `.docx` and let downstream re-render — preview drift
breaks the deterministic builds.

## Brand consistency

Every template uses:
- **Header**: GCC emblem (left) + `Low-Voltage Div 27/28 Contractor` tagline (right, italic forest green) + horizontal rule. Matches `Standard/Letterhead.docx` and the bundler's `gccHtmlShell` letterhead band.
- **Footer**: `GCC LLC · Proprietary & Confidential · Licensed & Insured · KCMO & STL` + page X of Y.
- **Owner title**: "CEO" (not "President" or "President / CEO").
- **Contact phone**: `636-224-8192` (the legacy `816-808-8323` was removed from the embedded logo PNG in 2026-04).

## Mirror

A working mirror of these templates also lives at
`C:\Users\nmorr\Downloads\proposal system\3-Intake\1-Bids\Templates\`.
The mirror is convenience-only and not authoritative — when the two diverge,
this repo wins.

## Related repos

- **Bundler HTML source**: see `gcc-proposal-bundler` (separate repo)
- **Python proposal engine**: see `gcc-proposal-engine` (separate repo)
- **Monorepo TS proposal app**: `greencommllc/apps/proposal/` (in
  `Particles816/greencommllc`)
