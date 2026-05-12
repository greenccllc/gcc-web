/**
 * GCC_BRAND — typed brand constants. Ported verbatim from
 * bundle-builder.html line ~8494. Edit in one place; imported by every
 * renderer that needs it.
 */

import type { GccBrand, BrandColors } from '@models/brand';

export const GCC_COLORS: BrandColors = {
  forestGreen: '#2E7D32',
  forestDark:  '#1B5E20',
  warmGold:    '#D4AF37',
  greenTint:   '#F1F8F1',
  goldTint:    '#FAF5E6',
  cream:       '#FDFBF4',
  ink:         '#14181C',
  slate:       '#374850',
  rule:        '#CFD7D0'
};

export const GCC_BRAND: GccBrand = {
  company: {
    legal_name:   'Green Communications Contracting LLC',
    short_name:   'GCC',
    dba:          'GCC LLC',
    tagline:      'Low-Voltage Div 27/28 Contractor',
    address:      'Greater Kansas City & St. Louis Metro Service Areas',
    service_area: 'KCMO & STL',
    main_phone:   '(636) 224-8192',
    main_email:   'kmorris@greencommllc.com',
    website:      'greencommllc.com'
  },
  owner: {
    full_name:  'Kaitlyn Lim Morris',
    first_name: 'Kaitlyn',
    title:      'CEO',
    phone_raw:  '6362248192',
    phone_fmt:  '(636) 224-8192',
    email:      'kmorris@greencommllc.com'
  },
  colors: GCC_COLORS,
  standards: [
    'ANSI/TIA-568.2-D (Balanced Twisted-Pair)',
    'ANSI/TIA-568.3-D (Optical Fiber)',
    'ANSI/TIA-569-E (Pathways & Spaces)',
    'ANSI/TIA-606-C (Administration)',
    'ANSI/TIA-607-D (Bonding/Grounding)',
    'ANSI/TIA-942-C (Data Centers, where applicable)',
    'BICSI TDMM 14th Edition',
    'NFPA 70 (NEC) Art. 645, 725, 770, 800'
  ],
  includedUpgrades: [
    'Cat 6A Plenum (CMP) baseline on all horizontal data',
    'Fluke DSX-8000 certification on 100% of installed terminations',
    'TIA-606-C CLASS 3 labeling, both ends, machine-printed',
    'Lifetime Panduit/CommScope manufacturer warranty on cabling',
    'Service loops: 12 ft above TR, 3 ft at outlet',
    'Firestop at every penetration — documented with photos',
    'As-built drawings delivered within 10 business days of substantial',
    'Two AMC revisits within 90 days of substantial completion'
  ],
  standardExclusions: [
    'Division 26 (electrical power) — by others',
    'Ceiling tile / floor tile replacement — by GC',
    'Patching, painting, or cosmetic finish work',
    'Fire-alarm primary circuits (Div 28 scope limited to low-voltage)',
    'Wireless RF survey beyond provided drawing coverage',
    'Infrastructure in hazardous-classified locations'
  ],
  signatureBlock:
    'Kaitlyn Lim Morris\nCEO · GCC LLC\n(636) 224-8192 · kmorris@greencommllc.com',
  footerBand: 'GCC LLC · Proprietary & Confidential · Licensed & Insured · KCMO & STL'
};
