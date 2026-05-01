/* GCC unified footer — injects into <div id="gcc-footer"></div>.
 *
 * Every page that loads /assets/js/footer.js + has the placeholder div
 * gets the same footer chrome: 4-column nav, license/insurance line,
 * tagline, copyright, and a tiny "Admin" link gated by Cloudflare Access
 * @greencommllc.com SSO.
 *
 * The footer is intentionally rendered server-agnostic via JS so we can
 * update it in one place rather than copy-paste across 30+ HTML files.
 */
(function () {
  'use strict';

  const FOOTER_HTML = `
    <footer class="gcc-footer">
      <div class="gcc-footer-inner">
        <div class="gcc-footer-brand">
          <div class="gcc-footer-mark">
            <img src="/assets/img/gcc-logo-128.png" alt="" aria-hidden="true" />
            <div>
              <strong>GCC LLC</strong>
              <span>Low-Voltage Div&nbsp;27/28 Contractor</span>
            </div>
          </div>
          <p class="gcc-footer-tag">Let us handle IT.</p>
          <p class="gcc-footer-meta">
            Licensed &amp; Insured · KCMO + STL<br>
            Missouri · Kansas · Illinois (case-by-case)
          </p>
        </div>

        <nav class="gcc-footer-nav" aria-label="Site footer">
          <div class="gcc-footer-col">
            <h3>Services</h3>
            <ul>
              <li><a href="/services/cabling.html">Structured cabling</a></li>
              <li><a href="/services/security.html">IP security</a></li>
              <li><a href="/services/network.html">Network &amp; managed</a></li>
              <li><a href="/services/residential.html">Residential</a></li>
              <li><a href="/services/contracts.html">Service contracts</a></li>
            </ul>
          </div>
          <div class="gcc-footer-col">
            <h3>Company</h3>
            <ul>
              <li><a href="/about.html">About</a></li>
              <li><a href="/projects.html">Projects</a></li>
              <li><a href="/contact.html">Contact</a></li>
              <li><a href="tel:+16362248192">636-224-8192</a></li>
              <li><a href="mailto:info@greencommllc.com">info@greencommllc.com</a></li>
            </ul>
          </div>
          <div class="gcc-footer-col">
            <h3>Estimate</h3>
            <ul>
              <li><a href="/estimate/commercial.html">Commercial</a></li>
              <li><a href="/estimate/residential.html">Residential</a></li>
              <li><a href="/contact.html">Request a quote</a></li>
            </ul>
          </div>
          <div class="gcc-footer-col">
            <h3>Sign in</h3>
            <ul>
              <li><a href="/clients/">Client portal</a></li>
              <li><a href="/support.html">Support</a></li>
              <li><a href="/legal/privacy.html">Privacy</a></li>
              <li><a href="/legal/terms.html">Terms</a></li>
            </ul>
          </div>
        </nav>
      </div>

      <div class="gcc-footer-base">
        <div class="gcc-footer-base-left">
          <span>&copy; ${new Date().getFullYear()} Green Communications Contracting LLC</span>
          <span class="gcc-footer-base-sep" aria-hidden="true">·</span>
          <span>Proprietary &amp; Confidential</span>
          <span class="gcc-footer-base-sep" aria-hidden="true">·</span>
          <span>603 Seib Dr, O'Fallon, MO 63366</span>
        </div>
        <div class="gcc-footer-base-right">
          <a href="/admin/console/" class="gcc-footer-admin" title="Internal — Cloudflare Access SSO required">Admin</a>
        </div>
      </div>
    </footer>
  `;

  function inject() {
    const slot = document.getElementById('gcc-footer');
    if (!slot) return;
    slot.innerHTML = FOOTER_HTML;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
