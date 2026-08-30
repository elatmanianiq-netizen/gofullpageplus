/**
 * SSR entry point for the prerender step (tools/prerender.mjs).
 *
 * Bundled for Node by esbuild, then called once per route. It renders the app
 * at a given path to an HTML string using wouter's `ssrPath`, and returns the
 * markup plus that route's SEO metadata so the prerender script can inject both
 * into the built index.html.
 *
 * Not part of the browser bundle. `renderToString` (not a streaming renderer)
 * is deliberate: prerendering wants one complete HTML string per route.
 */
// Use the browser server build: its renderToString is synchronous and does not
// pull in Node's `util`/stream internals, which break when bundled to ESM.
import { renderToString } from "react-dom/server.browser";

import App from "@/App";
import { metaForRoute, type RouteMeta } from "@/page-meta-map";
import { resolved, siteConfig } from "@/site-config";

/** Exposed to the prerender script so it can build canonical URLs. */
export const siteUrl: string = resolved(siteConfig.siteUrl);

interface RenderResult {
  html: string;
  meta: RouteMeta;
}

export function renderRoute(route: string): RenderResult {
  const html = renderToString(<App ssrPath={route} />);
  return { html, meta: metaForRoute(route) };
}
