/**
 * Route → SEO metadata map.
 *
 * Shared by the prerender step (tools/prerender-entry.tsx) so the static HTML it
 * writes has the same title and description each page sets at runtime via
 * usePageMeta. Keeping them in one table stops the two from drifting apart.
 *
 * These are plain strings (no JSX, no browser APIs) so the file is safe to
 * import from Node during the build.
 */
import { siteConfig } from "@/site-config";

export interface RouteMeta {
  title: string;
  description: string;
  path: string;
}

export const PAGE_META: Record<string, RouteMeta> = {
  "/": {
    title: `${siteConfig.extensionName} for Chrome & Edge`,
    description: `${siteConfig.tagline} Free, runs entirely in your browser with no account and no tracking.`,
    path: "/",
  },
  "/privacy": {
    title: `Privacy Policy | ${siteConfig.productName}`,
    description: `How ${siteConfig.extensionName} handles your data: captures stay on your device, no tracking, no uploads. Every browser permission explained.`,
    path: "/privacy",
  },
  "/terms": {
    title: `Terms of Service | ${siteConfig.productName}`,
    description: `The terms covering your use of ${siteConfig.extensionName} and this website.`,
    path: "/terms",
  },
  "/support": {
    title: `Contact Support | ${siteConfig.productName}`,
    description: `Report an issue or ask a question about ${siteConfig.productName}. We reply by email, usually within two business days.`,
    path: "/support",
  },
  "/faq": {
    title: `FAQ & Troubleshooting | ${siteConfig.productName}`,
    description: `How ${siteConfig.productName} works, fixes for captures that look wrong, keyboard shortcuts, and exactly what happens to your data.`,
    path: "/faq",
  },
};

export function metaForRoute(route: string): RouteMeta {
  return PAGE_META[route] ?? PAGE_META["/"];
}
