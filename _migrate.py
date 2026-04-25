"""
One-shot migration to apply design-critique fixes across every gcc-site page.

For each .html file in the site root:
  - replace `<div id="gcc-header"></div>` with skip-link + static anonymous nav
  - wrap top-level <section> ... </section> ... <footer> in <main id="main">
  - swap emoji-as-icon for inline SVG sprite references
  - inject og: + LocalBusiness JSON-LD just before </head>
  - on index.html, replace homepage hero stats with concrete proof points

Idempotent: safe to re-run; checks for existing markers.
"""
from __future__ import annotations

import re
from pathlib import Path

SITE = Path(r"C:\Users\nmorr\gcc-site")

# ---- Static nav -----------------------------------------------------------

NAV_BLOCK = """\
<a href="#main" class="skip-link">Skip to content</a>
<div id="gcc-header">
  <header class="site-header">
    <div class="container">
      <a href="/" class="brand-mark" aria-label="GCC LLC home">
        <span class="monogram" aria-hidden="true">GC</span>
        <span class="brand-stack">
          <span class="brand-name">GCC LLC</span>
          <span class="brand-tag" id="hdr-tag">Div 27 / 28 Contractor</span>
        </span>
      </a>
      <button class="menu-toggle" aria-label="Toggle menu" aria-expanded="false">&#9776;</button>
      <nav class="site-nav" aria-label="Primary"><ul>
        <li><a href="/"{A_HOME}>Home</a></li>
        <li><a href="/services.html"{A_SERVICES}>Services</a></li>
        <li><a href="/estimator.html"{A_ESTIMATOR}>Estimator</a></li>
        <li><a href="/about.html"{A_ABOUT}>About</a></li>
        <li><a href="/contact.html"{A_CONTACT}>Contact</a></li>
        <li class="spacer" aria-hidden="true"></li>
        <li><a href="/clients/#signup" class="cta">Register Account</a></li>
      </ul></nav>
    </div>
  </header>
</div>
"""

PAGE_TO_ACTIVE = {
    "index.html":               "A_HOME",
    "services.html":            "A_SERVICES",
    "estimator.html":           "A_ESTIMATOR",
    "estimator-residential.html": "A_ESTIMATOR",
    "about.html":               "A_ABOUT",
    "projects.html":            "A_PROJECTS",  # no nav slot — leave none active
    "contact.html":             "A_CONTACT",
}

def render_nav(page: str) -> str:
    active_key = PAGE_TO_ACTIVE.get(page)
    out = NAV_BLOCK
    for k in ("A_HOME","A_SERVICES","A_ESTIMATOR","A_ABOUT","A_CONTACT"):
        out = out.replace("{"+k+"}", ' class="active"' if k == active_key else '')
    return out

# ---- Emoji → icon-name mapping --------------------------------------------

EMOJI_ICON = {
    "🔌": "cable",
    "🛡": "shield",      # the U+1F6E1 + variation selector form
    "🛡️": "shield",
    "🏠": "home",
    "🏥": "heart-pulse",
    "🏫": "graduation",
    "🇺🇸": "landmark",
    "⚕": "stethoscope",
    "⚕️": "stethoscope",
    "🍷": "utensils",
    "🏢": "building",
    "🏡": "home",
    "🏆": "award",
    "📐": "ruler",
    "🧰": "wrench",
    "📞": "phone",
    "⚡": "zap",
    "👤": "user",
    "🔧": "wrench",
    "📋": "clipboard",
    "⚖": "scale",
    "⚖️": "scale",
    "⏱": "timer",
    "⏱️": "timer",
    "✉": "mail",
    "✉️": "mail",
    "📍": "pin",
    "🚚": "truck",
    "🗄": "server",
    "🗄️": "server",
    "📡": "wifi",
    "🌐": "globe",
    "📊": "bar-chart",
}

ICON_TAG = '<svg class="icon" aria-hidden="true"><use href="/assets/svg/icons.svg#icon-{name}"/></svg>'

# ---- og: + JSON-LD --------------------------------------------------------

def og_block(page: str, title: str, description: str) -> str:
    canonical = f"https://greencommllc.com/{page if page != 'index.html' else ''}"
    parts = [
        f'<link rel="canonical" href="{canonical}" />',
        f'<meta property="og:type" content="website" />',
        f'<meta property="og:site_name" content="GCC LLC" />',
        f'<meta property="og:locale" content="en_US" />',
        f'<meta property="og:title" content="{title.replace(chr(34), "&quot;")}" />',
        f'<meta property="og:description" content="{description.replace(chr(34), "&quot;")}" />',
        f'<meta property="og:url" content="{canonical}" />',
        f'<meta property="og:image" content="https://greencommllc.com/assets/og/og-default.png" />',
        f'<meta property="og:image:width" content="1200" />',
        f'<meta property="og:image:height" content="630" />',
    ]
    return "\n".join(parts) + "\n"

LOCAL_BUSINESS_JSONLD = """\
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://greencommllc.com/#org",
  "name": "Green Communications Contracting LLC",
  "alternateName": "GCC LLC",
  "url": "https://greencommllc.com/",
  "logo": "https://greencommllc.com/assets/og/logo.png",
  "image": "https://greencommllc.com/assets/og/og-default.png",
  "description": "Woman-owned, minority-owned Division 27 & 28 contractor delivering structured cabling, IP surveillance, access control, AV, and smart-home integration across Kansas City and St. Louis.",
  "telephone": "+1-636-224-8192",
  "email": "info@greencommllc.com",
  "priceRange": "$$",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "603 Seib Dr",
    "addressLocality": "O'Fallon",
    "addressRegion": "MO",
    "postalCode": "63366",
    "addressCountry": "US"
  },
  "areaServed": [
    { "@type": "City", "name": "Kansas City" },
    { "@type": "City", "name": "St. Louis" },
    { "@type": "AdministrativeArea", "name": "Missouri" },
    { "@type": "AdministrativeArea", "name": "Kansas" },
    { "@type": "AdministrativeArea", "name": "Illinois" }
  ],
  "sameAs": [
    "https://www.linkedin.com/company/greencommllc",
    "https://maps.google.com/?cid=greencommllc"
  ]
}
</script>
"""

# ---- Page metadata --------------------------------------------------------

PAGE_META = {
    "index.html": (
        "GCC LLC — Low-Voltage Cabling, Security & Smart Spaces · KCMO + STL",
        "Green Communications Contracting LLC — woman-owned, minority-owned Division 27 & 28 contractor delivering structured cabling, IP surveillance, access control, AV, and smart-home integration across Kansas City and St. Louis.",
    ),
    "about.html": (
        "About — A small, sharp Missouri LLC · GCC LLC",
        "GCC LLC is a woman-owned, minority-owned Missouri LLC building structured cabling and security systems across Kansas City and St. Louis. Lean team, tight standards, direct line to ownership.",
    ),
    "services.html": (
        "Services — Structured Cabling, Security, Smart Home · GCC LLC",
        "Full Division 27 and Division 28 service catalog: structured cabling, fiber, IP cameras, access control, smart home, residential renos, and ongoing service contracts.",
    ),
    "projects.html": (
        "Projects — Senior Living, Schools, Government, Healthcare · GCC LLC",
        "Active GCC LLC project pipeline across senior living, education, government, healthcare, hospitality, commercial office, and residential — Kansas City and St. Louis.",
    ),
    "contact.html": (
        "Contact — Get a quote in 48 hours · GCC LLC",
        "Request a low-voltage quote, send plans for review, or schedule a site walk. Direct phone, email, and form — all answered by ownership.",
    ),
    "estimator.html": (
        "Estimator — Instant low-voltage budget · GCC LLC",
        "Get a quick, unitized budget for your low-voltage project. Drops, cameras, doors, AV — all the major scope categories with ranged pricing.",
    ),
    "estimator-residential.html": (
        "Residential Estimator · GCC LLC",
        "Quick budget estimator for whole-home networking, smart home, security, and renovations.",
    ),
}

# ---- Hero stats replacement (index.html only) -----------------------------

OLD_HERO_STATS = """\
      <div class="hero-stats">
        <div class="hero-stat">
          <div class="stat-num">$490K+</div>
          <div class="stat-lbl">Active Bid Pipeline</div>
        </div>
        <div class="hero-stat">
          <div class="stat-num">7</div>
          <div class="stat-lbl">Verticals Served</div>
        </div>
        <div class="hero-stat">
          <div class="stat-num">10+ yr</div>
          <div class="stat-lbl">Field Experience</div>
        </div>
      </div>"""

NEW_HERO_STATS = """\
      <div class="hero-stats">
        <div class="hero-stat">
          <div class="stat-num">48 hr</div>
          <div class="stat-lbl">Quote Turnaround</div>
        </div>
        <div class="hero-stat">
          <div class="stat-num">Same day</div>
          <div class="stat-lbl">COIs &amp; W9</div>
        </div>
        <div class="hero-stat">
          <div class="stat-num">BICSI / TIA</div>
          <div class="stat-lbl">Standards Compliant</div>
        </div>
      </div>"""

# ---- Per-file transform ---------------------------------------------------

OLD_HEADER_DIV = '<div id="gcc-header"></div>'

# Common pattern: <div id="gcc-header"></div>\n\n<section ...>...</section>\n...<footer ...>
def transform(html: str, page: str) -> str:
    title, description = PAGE_META.get(page, (None, None))

    # 1. Replace header div with skip-link + static nav (idempotent — only if simple form)
    if OLD_HEADER_DIV in html:
        html = html.replace(OLD_HEADER_DIV, render_nav(page).rstrip(), 1)

    # 2. Wrap content in <main id="main"> ... </main> just before <footer>
    if "<main id=\"main\">" not in html:
        # Insert <main> right after the closing </header> + the gcc-header div block
        html = html.replace("</header>\n</div>", "</header>\n</div>\n<main id=\"main\">", 1)
        # Insert </main> right before the first <footer
        html = re.sub(r"\n(<footer\b)", r"\n</main>\n\1", html, count=1)

    # 3. Add og: + canonical (just before </head>) and JSON-LD (just before </body>)
    if title and description and 'property="og:title"' not in html:
        html = html.replace("</head>", og_block(page, title, description) + "</head>", 1)
    if "application/ld+json" not in html and page == "index.html":
        html = html.replace("</body>", LOCAL_BUSINESS_JSONLD + "</body>", 1)

    # 4. Replace emoji icons with sprite references
    for emoji, name in EMOJI_ICON.items():
        if emoji in html:
            html = html.replace(emoji, ICON_TAG.format(name=name))

    # 5. Homepage-only: replace hero stats
    if page == "index.html" and OLD_HERO_STATS in html:
        html = html.replace(OLD_HERO_STATS, NEW_HERO_STATS)

    return html

def main():
    pages = sorted(SITE.glob("*.html"))
    for p in pages:
        original = p.read_text(encoding="utf-8")
        new = transform(original, p.name)
        if new != original:
            p.write_text(new, encoding="utf-8")
            print(f"  updated  {p.name}  ({len(original)} -> {len(new)} bytes)")
        else:
            print(f"  unchanged {p.name}")

if __name__ == "__main__":
    main()
