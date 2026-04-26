// ============================================================
// GCC LLC — Estimator PDF export
//
// Opens a print-styled HTML document in a new window with the
// estimate's line items + range, then auto-triggers the print
// dialog so the user saves it as PDF (or prints it).
//
// Used by client-estimator.js (commercial) and
// client-estimator-residential.js (residential). The shape of the
// data is what compute() in each script returns:
//   { lines: [{name, min, mid, max, ...}], minTotal, midTotal, maxTotal }
// plus an optional `inputs` snapshot for the brief at the top.
// ============================================================
(function () {
  'use strict';

  function money(n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function brief(inputs) {
    if (!inputs) return '';
    var rows = [];
    function add(label, value) {
      if (value == null || value === '' || value === 0) return;
      rows.push('<dt>' + escapeHtml(label) + '</dt><dd>' + escapeHtml(String(value)) + '</dd>');
    }
    add('Project type',   inputs.projectType || inputs.type);
    add('Square footage', inputs.sqft ? inputs.sqft.toLocaleString() + ' sq ft' : null);
    add('Bedrooms',       inputs.bedrooms);
    add('Bathrooms',      inputs.bathrooms);
    add('Story count',    inputs.stories);
    add('Drops',          inputs.drops);
    add('Cameras',        inputs.cameras);
    add('Wi-Fi APs',      inputs.aps);
    add('Doors (access)', inputs.doors);
    if (rows.length === 0) return '';
    return '<dl class="brief">' + rows.join('') + '</dl>';
  }

  function buildHtml(estimate, opts) {
    opts = opts || {};
    var title    = opts.title || 'Estimator handoff';
    var inputs   = opts.inputs || {};
    var subtitle = opts.subtitle || (inputs.projectType ? ('Project: ' + inputs.projectType) : '');

    var dateStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

    var lines = (estimate.lines || []).filter(function (l) { return (l.mid || l.min || l.max) > 0; });

    var lineRows = lines.map(function (l) {
      var name = escapeHtml(l.name || l.label || '');
      var note = l.note ? '<div class="ln-note">' + escapeHtml(l.note) + '</div>' : '';
      return (
        '<tr>' +
          '<td><strong>' + name + '</strong>' + note + '</td>' +
          '<td class="num">' + money(l.min) + '</td>' +
          '<td class="num strong">' + money(l.mid) + '</td>' +
          '<td class="num">' + money(l.max) + '</td>' +
        '</tr>'
      );
    }).join('');

    var totalsRow = (
      '<tr class="totals">' +
        '<td><strong>Total</strong></td>' +
        '<td class="num">' + money(estimate.minTotal) + '</td>' +
        '<td class="num strong forest">' + money(estimate.midTotal) + '</td>' +
        '<td class="num">' + money(estimate.maxTotal) + '</td>' +
      '</tr>'
    );

    return (
      '<!DOCTYPE html>' +
      '<html lang="en"><head>' +
        '<meta charset="UTF-8" />' +
        '<title>' + escapeHtml(title) + ' — GCC LLC</title>' +
        '<style>' +
          'body { font-family: Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 32px 40px; line-height: 1.5; }' +
          '.hdr { display: flex; align-items: center; justify-content: space-between; padding-bottom: 16px; border-bottom: 2px solid #1E4D2B; margin-bottom: 20px; }' +
          '.hdr .brand { font-size: 22px; font-weight: 800; color: #1E4D2B; letter-spacing: -0.01em; }' +
          '.hdr .brand .acc { color: #D4AF37; }' +
          '.hdr .meta { font-size: 11px; color: #64748b; text-align: right; line-height: 1.4; }' +
          'h1 { font-size: 22px; margin: 0 0 4px; color: #1E4D2B; }' +
          '.subtitle { color: #475569; font-size: 14px; margin: 0 0 22px; }' +
          'dl.brief { display: grid; grid-template-columns: max-content 1fr; column-gap: 20px; row-gap: 4px; margin: 0 0 22px; padding: 14px 16px; background: #F8FAF8; border: 1px solid #E2E8F0; border-radius: 6px; font-size: 13px; }' +
          'dl.brief dt { font-weight: 600; color: #475569; }' +
          'dl.brief dd { margin: 0; color: #0f172a; }' +
          'table.lines { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }' +
          'table.lines th { text-align: left; padding: 8px 10px; background: #F1F5F9; border-bottom: 1px solid #CBD5E0; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #475569; }' +
          'table.lines th.num { text-align: right; }' +
          'table.lines td { padding: 9px 10px; border-bottom: 1px solid #E2E8F0; vertical-align: top; }' +
          'table.lines td.num { text-align: right; font-variant-numeric: tabular-nums; }' +
          'table.lines td.strong { font-weight: 700; }' +
          'table.lines td .ln-note { color: #64748b; font-size: 11px; margin-top: 2px; }' +
          'table.lines tr.totals td { border-top: 2px solid #1E4D2B; padding-top: 12px; font-size: 14px; }' +
          'table.lines td.forest { color: #1E4D2B; }' +
          '.disclaimer { margin-top: 24px; font-size: 11px; color: #64748b; line-height: 1.55; padding: 10px 14px; background: #FFF8E1; border-left: 3px solid #D4AF37; }' +
          '.footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid #E2E8F0; font-size: 11px; color: #64748b; display: flex; justify-content: space-between; }' +
          '@media print { body { padding: 24px 32px; } .hdr { page-break-after: avoid; } table.lines { page-break-inside: avoid; } }' +
        '</style>' +
      '</head><body>' +
        '<div class="hdr">' +
          '<div class="brand">GCC <span class="acc">LLC</span></div>' +
          '<div class="meta">Green Communications Contracting LLC<br/>' +
            '603 Seib Dr · O\'Fallon, MO 63366<br/>' +
            '636-224-8192 · info@greencommllc.com</div>' +
        '</div>' +
        '<h1>' + escapeHtml(title) + '</h1>' +
        '<p class="subtitle">' + escapeHtml(subtitle || ('Generated ' + dateStr)) + '</p>' +
        brief(inputs) +
        '<table class="lines">' +
          '<thead><tr><th>Line item</th><th class="num">Low</th><th class="num">Midpoint</th><th class="num">High</th></tr></thead>' +
          '<tbody>' + lineRows + totalsRow + '</tbody>' +
        '</table>' +
        '<div class="disclaimer"><strong>Estimator output</strong> — these are budgetary ranges only, intended for early planning. Final pricing is delivered as an itemized bid after we review plans / scope and walk the site. Numbers exclude tax, permitting, and out-of-area travel unless noted.</div>' +
        '<div class="footer"><div>Prepared ' + escapeHtml(dateStr) + '</div><div>greencommllc.com</div></div>' +
      '</body></html>'
    );
  }

  // Public entry point. Opens a new window, writes the HTML, triggers print.
  // The user picks "Save as PDF" from their browser's print dialog.
  function exportToPDF(estimate, opts) {
    if (!estimate || !estimate.lines) {
      alert('Estimator data not ready yet. Adjust an input first.');
      return;
    }
    var w = window.open('', '_blank', 'width=900,height=1200');
    if (!w) {
      alert('Could not open print window. Check your browser pop-up settings.');
      return;
    }
    w.document.open();
    w.document.write(buildHtml(estimate, opts));
    w.document.close();
    // Give the new window a beat to render before showing the print dialog.
    w.onload = function () { setTimeout(function () { try { w.focus(); w.print(); } catch (_) {} }, 200); };
    // Fallback if onload never fires (some browsers w/ document.write):
    setTimeout(function () { try { w.focus(); w.print(); } catch (_) {} }, 600);
  }

  window.gccEstimatorPDF = { exportToPDF: exportToPDF };
})();
