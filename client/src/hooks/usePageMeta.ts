/**
 * Per-page SEO metadata.
 *
 * A single-page app serves one HTML shell for every route, so without this the
 * title bar, the text a search engine shows in results, and the preview card on
 * social media would be identical on `/privacy`, `/faq`, and the home page.
 * `usePageMeta` rewrites the document head when a page mounts, and restores the
 * defaults when it unmounts, so each route presents its own title and
 * description to crawlers and to anyone sharing the link.
 *
 * It manages: <title>, meta description, canonical link, robots directive, and
 * the Open Graph / Twitter tags that drive link previews. The prerender step
 * (see tools/prerender.mjs) then bakes the home page's values into the static
 * HTML so the very first byte a crawler receives is already correct.
 */
import { useEffect } from "react";

import { absoluteUrl, resolved, siteConfig } from "@/site-config";

export interface PageMeta {
  /** Page title. The product name is appended automatically unless `exact`. */
  title: string;
  /** ~150–160 chars. Shown under the title in search results. */
  description?: string;
  /** Route path for the canonical URL, e.g. "/privacy". Defaults to current. */
  path?: string;
  /** Set true to keep the title exactly as given (used for the home page). */
  exact?: boolean;
  /** Keep this page out of search results (used for /admin). */
  noindex?: boolean;
}

/** Fallbacks used by the HTML shell and restored when a page unmounts. */
export const DEFAULT_DESCRIPTION = `${siteConfig.productName}: ${siteConfig.tagline} Runs locally, with no account and no tracking.`;

function upsertMeta(
  selector: string,
  attr: "name" | "property",
  key: string,
  content: string,
): HTMLMetaElement {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
  return element;
}

function upsertLink(rel: string, href: string): HTMLLinkElement {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
  return element;
}

export function usePageMeta(meta: PageMeta): void {
  useEffect(() => {
    const previousTitle = document.title;

    const fullTitle = meta.exact
      ? meta.title
      : `${meta.title} | ${siteConfig.productName}`;
    const description = meta.description ?? DEFAULT_DESCRIPTION;

    // Only build absolute URLs when the site URL is configured; otherwise leave
    // canonical/og:url off rather than emit a broken "TODO:" href.
    const hasSiteUrl = Boolean(resolved(siteConfig.siteUrl));
    const path = meta.path ?? window.location.pathname;
    const canonical = hasSiteUrl ? absoluteUrl(path) : "";
    const robots = meta.noindex ? "noindex, nofollow" : "index, follow";
    const ogImage = hasSiteUrl ? absoluteUrl("/logo.png") : "";

    document.title = fullTitle;

    upsertMeta('meta[name="description"]', "name", "description", description);
    upsertMeta('meta[name="robots"]', "name", "robots", robots);

    upsertMeta('meta[property="og:title"]', "property", "og:title", fullTitle);
    upsertMeta('meta[property="og:description"]', "property", "og:description", description);
    upsertMeta('meta[property="og:type"]', "property", "og:type", "website");
    upsertMeta('meta[property="og:site_name"]', "property", "og:site_name", siteConfig.productName);

    upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", fullTitle);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", description);

    if (canonical) {
      upsertLink("canonical", canonical);
      upsertMeta('meta[property="og:url"]', "property", "og:url", canonical);
    }
    if (ogImage) {
      upsertMeta('meta[property="og:image"]', "property", "og:image", ogImage);
      upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", ogImage);
    }

    return () => {
      document.title = previousTitle;
    };
  }, [meta.title, meta.description, meta.path, meta.exact, meta.noindex]);
}
