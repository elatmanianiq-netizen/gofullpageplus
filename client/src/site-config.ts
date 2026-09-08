/**
 * Single source of truth for every business detail that appears on the site,
 * in the legal pages, and in the Chrome Web Store listing.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FILL THIS IN BEFORE SUBMITTING TO THE CHROME WEB STORE.
 * Every value marked `TODO` below is a placeholder. Google rejects listings
 * whose privacy policy contains placeholder text, and a policy that names the
 * wrong entity is worse than no policy at all.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Marker used by placeholder values so the UI can warn you in development. */
const TODO = "TODO:";

export const siteConfig = {
  // ── Product identity ──────────────────────────────────────────────────────
  /** Short marketing name used across the website. */
  productName: "Full Page Capture",
  /** Full name / Chrome Web Store title. Keep in sync with the manifest. */
  extensionName: "Full Page Capture - Screen Capture & Editor",
  /** Exact `version` field from extension/manifest.json. */
  extensionVersion: "1.1.0",
  /** Short product promise, reused in meta tags and the store summary. */
  tagline:
    "Capture full webpages, visible areas or selected regions, edit screenshots, and export to PNG, JPG or PDF.",

  // ── Legal entity ──────────────────────────────────────────────────────────
  /**
   * The person or company that publishes the extension and owns this site.
   * This name goes in the Privacy Policy and Terms of Service, and it must
   * match the developer name on your Chrome Web Store developer account.
   */
  legalEntity: "Full Page Capture",
  /** Postal address. Required for GDPR/CCPA notices and store verification. */
  postalAddress: `${TODO} Street, City, Postal code, Country`,
  /** Country or state whose law governs the Terms of Service. */
  governingLaw: `${TODO} Country or state, e.g. "the Netherlands"`,

  // ── Contact ───────────────────────────────────────────────────────────────
  /** Public support address. Shown on the site and in the store listing. */
  supportEmail: "support@gofullpageplus.com",
  /** Address for privacy and data-deletion requests. May equal supportEmail. */
  privacyEmail: "support@gofullpageplus.com",

  // ── URLs ──────────────────────────────────────────────────────────────────
  /**
   * Public HTTPS origin where this site is deployed, with no trailing slash.
   * The Chrome Web Store requires the privacy policy to be reachable at a
   * public URL, which will be `${siteUrl}/privacy`.
   */
  siteUrl: "https://www.gofullpageplus.com",
  /** Chrome Web Store listing URL. Empty = no install links shown anywhere. */
  chromeStoreUrl: "",
  /** Microsoft Edge Add-ons listing URL. Empty if you are not shipping there. */
  edgeStoreUrl: "",

  // ── Legal document dates ──────────────────────────────────────────────────
  /** Shown as "Last updated" on the Privacy Policy and Terms. */
  lastUpdated: "16 August 2026",
} as const;

/** True when a config value is still an unfilled placeholder. */
export function isPlaceholder(value: string): boolean {
  return value.startsWith(TODO);
}

/**
 * Returns the value, or an empty string when it is still a placeholder.
 * Use for `href` values so the site never renders a broken "TODO:" link.
 */
export function resolved(value: string): string {
  return isPlaceholder(value) ? "" : value;
}

/** Every placeholder still left in the config. Surfaced in dev builds only. */
export function pendingConfigKeys(): string[] {
  return Object.entries(siteConfig)
    .filter(([, value]) => typeof value === "string" && isPlaceholder(value))
    .map(([key]) => key);
}

/**
 * Entity name safe to print in visible UI such as the footer copyright.
 * Falls back to the product name so an unfilled placeholder never ships as
 * literal "TODO:" text in the footer of a published site.
 */
export const legalEntityDisplay = isPlaceholder(siteConfig.legalEntity)
  ? siteConfig.productName
  : siteConfig.legalEntity;

/** `mailto:` link for support, or an empty string while unconfigured. */
export const supportMailto = isPlaceholder(siteConfig.supportEmail)
  ? ""
  : `mailto:${siteConfig.supportEmail}`;

/** Canonical absolute URL for a path, e.g. absoluteUrl("/privacy"). */
export function absoluteUrl(path: string): string {
  const base = resolved(siteConfig.siteUrl).replace(/\/$/, "");
  return `${base}${path}`;
}
