/**
 * GCC_BRAND — typed version of the legacy inline GCC_BRAND const.
 * Copy values from bundle-builder.html ~line 8494 when porting.
 */

export interface BrandCompany {
  legal_name: string;
  short_name: string;
  dba: string;
  tagline: string;
  address: string;
  service_area: string;
  main_phone: string;
  main_email: string;
  website: string;
}

export interface BrandOwner {
  full_name: string;
  first_name: string;
  title: string;
  phone_raw: string;
  phone_fmt: string;
  email: string;
}

export interface BrandColors {
  forestGreen: string;
  forestDark: string;
  warmGold: string;
  greenTint: string;
  goldTint: string;
  cream: string;
  ink: string;
  slate: string;
  rule: string;
}

export type LogoVariant = 'emblem' | 'stacked' | 'letterhead' | 'none';

/** Logos as base64 data URIs. Keyed by variant. */
export type LogoMap = Record<Exclude<LogoVariant, 'none'>, string>;

export interface GccBrand {
  company: BrandCompany;
  owner: BrandOwner;
  colors: BrandColors;
  standards: readonly string[];
  includedUpgrades: readonly string[];
  standardExclusions: readonly string[];
  signatureBlock: string;
  footerBand: string;
}
