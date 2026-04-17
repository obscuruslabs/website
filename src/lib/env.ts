export type SiteMode = 'coming_soon' | 'full';

export const SITE_MODE: SiteMode =
  process.env.SITE_MODE === 'full' ? 'full' : 'coming_soon';

export const NOINDEX = process.env.NOINDEX === 'true';

export const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER ?? '';
export const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD ?? '';
export const BASIC_AUTH_ENABLED = Boolean(
  BASIC_AUTH_USER && BASIC_AUTH_PASSWORD,
);

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://obscuruslabs.com';
