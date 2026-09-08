/**
 * Static prerendering.
 *
 * A client-only SPA ships an almost-empty <body> and fills it in with
 * JavaScript. Search crawlers can run that JavaScript, but slowly and
 * unreliably, which is a real handicap for a content site. This script closes
 * that gap: after `vite build`, it renders each public route to real HTML on
 * the server and writes a static file per route, so the first byte a crawler
 * (or a user on a slow connection) receives already contains the page's text,
 * headings, links, and correct <title>/meta tags.
 *
 * How it works, and why this way:
 *   • We build a second, SSR bundle of the app with esbuild (the browser bundle
 *     Vite produced cannot be imported by Node). React 19's renderToString then
 *     turns each route into HTML.
 *   • wouter renders a given path via its `ssrPath` prop, so no router changes
 *     are needed.
 *   • The components already guard browser globals during render
 *     (`typeof window === "undefined"`), but third-party modules may touch them
 *     at import time, so a tiny DOM/storage shim is installed first.
 *   • The rendered markup is injected into Vite's built index.html at the
 *     #root div, and the per-route <title>/description/canonical/OG tags are
 *     written into <head>. React then hydrates the same markup on the client.
 *
 * This is prerendering (static HTML per route at build time), not a live SSR
 * server. It suits a small marketing/legal site perfectly and deploys as plain
 * files on Vercel.
 *
 * Run automatically by `pnpm build`. Safe to re-run; it only rewrites HTML.
 */
import { build as esbuild } from "esbuild";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "dist", "public");
const TMP = path.join(ROOT, "node_modules", ".prerender");

/** Public, indexable routes. /admin is intentionally excluded. */
const ROUTES = ["/", "/privacy", "/terms", "/support", "/faq"];

// ─── Minimal browser shim ────────────────────────────────────────────────────
// Installed before the app module is imported so any module-load-time access to
// browser globals does not throw under Node. Only what render touches is faked.
function installDomShim() {
  const noop = () => {};
  const storage = {
    getItem: () => null,
    setItem: noop,
    removeItem: noop,
  };
  const element = () => ({
    setAttribute: noop,
    removeAttribute: noop,
    getAttribute: () => null,
    appendChild: noop,
    removeChild: noop,
    insertBefore: noop,
    remove: noop,
    addEventListener: noop,
    removeEventListener: noop,
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    style: {},
    sheet: { insertRule: noop, cssRules: [] },
    children: [],
    firstChild: null,
  });
  const doc = {
    documentElement: {
      classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
      getAttribute: () => null,
      setAttribute: noop,
      style: {},
      dir: "ltr",
      lang: "en",
    },
    head: { appendChild: noop, insertBefore: noop, querySelector: () => null, firstChild: null },
    body: element(),
    createElement: element,
    createTextNode: (text) => ({ textContent: text, nodeValue: text }),
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    addEventListener: noop,
    removeEventListener: noop,
    cookie: "",
  };
  const win = {
    location: { pathname: "/", href: "", hash: "", search: "" },
    localStorage: storage,
    sessionStorage: storage,
    matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }),
    addEventListener: noop,
    removeEventListener: noop,
    scrollTo: noop,
    navigator: { userAgent: "" },
    document: doc,
  };

  // Some of these globals are read-only getters in modern Node (navigator), so
  // assign defensively via defineProperty and skip any that are already present.
  const define = (key, value) => {
    if (key in globalThis && globalThis[key]) return;
    try {
      globalThis[key] = value;
    } catch {
      Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
    }
  };

  // Flag read by the app to skip browser-only, non-SEO components (e.g. the
  // toast portal) during prerender.
  globalThis.__PRERENDER__ = true;

  define("window", win);
  define("document", doc);
  define("navigator", win.navigator);
  define("localStorage", storage);
  define("sessionStorage", storage);
}

// ─── Head tag injection ──────────────────────────────────────────────────────
// Mirrors client/src/hooks/usePageMeta.ts. Kept simple: enough for crawlers to
// read correct title/description/canonical on first load; usePageMeta refines
// everything once the page hydrates.

function readSiteUrl() {
  // siteConfig is TypeScript; rather than import it we read the compiled SSR
  // bundle's value via the app export below. Fallback keeps prerender working
  // even before a real domain is set.
  return process.env.SITE_URL || "";
}

function setTag(head, regex, replacement) {
  return regex.test(head) ? head.replace(regex, replacement) : head;
}

function injectHead(html, meta, siteUrl) {
  let head = html;
  const canonical = siteUrl ? `${siteUrl.replace(/\/$/, "")}${meta.path}` : "";

  head = setTag(
    head,
    /<title>[\s\S]*?<\/title>/,
    `<title>${escapeHtml(meta.title)}</title>`,
  );
  head = setTag(
    head,
    /<meta name="description"[^>]*>/,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
  );
  head = setTag(
    head,
    /<meta property="og:title"[^>]*>/,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
  );
  head = setTag(
    head,
    /<meta property="og:description"[^>]*>/,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
  );
  head = setTag(
    head,
    /<meta name="twitter:title"[^>]*>/,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
  );
  head = setTag(
    head,
    /<meta name="twitter:description"[^>]*>/,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
  );

  if (canonical) {
    head = setTag(head, /<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${canonical}" />`);
    head = setTag(head, /<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${canonical}" />`);
  }

  return head;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const shellPath = path.join(OUT_DIR, "index.html");
  if (!existsSync(shellPath)) {
    console.error(`[prerender] ${shellPath} not found. Run \`vite build\` first.`);
    process.exit(1);
  }
  const shell = await fs.readFile(shellPath, "utf-8");

  // Bundle the SSR entry for Node. React and friends are bundled in; the CSS
  // import is ignored because we only need the HTML string.
  const entry = path.join(ROOT, "tools", "prerender-entry.tsx");
  const bundlePath = path.join(TMP, "entry.mjs");
  await fs.mkdir(TMP, { recursive: true });
  await esbuild({
    entryPoints: [entry],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: bundlePath,
    jsx: "automatic",
    loader: { ".css": "empty", ".png": "empty", ".svg": "empty" },
    alias: {
      "@": path.join(ROOT, "client", "src"),
      "@shared": path.join(ROOT, "shared"),
    },
    // Keep Node built-ins external so esbuild does not emit dynamic require()
    // calls for them (which fail under ESM).
    external: ["node:*", "util", "stream", "async_hooks"],
    logLevel: "error",
  });

  installDomShim();
  const { renderRoute, siteUrl } = await import(pathToFileURL(bundlePath).href);
  const effectiveSiteUrl = readSiteUrl() || siteUrl || "";

  for (const route of ROUTES) {
    const { html: appHtml, meta } = renderRoute(route);

    let page = shell.replace(
      /<div id="root"><\/div>/,
      `<div id="root">${appHtml}</div>`,
    );
    page = injectHead(page, meta, effectiveSiteUrl);

    // Write /about -> about.html and / -> index.html so static hosting and the
    // SPA rewrite both resolve them.
    const target =
      route === "/"
        ? path.join(OUT_DIR, "index.html")
        : path.join(OUT_DIR, `${route.replace(/^\//, "")}.html`);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, page, "utf-8");
    console.log(`[prerender] ${route} -> ${path.relative(ROOT, target)}`);
  }

  console.log(`[prerender] Done. ${ROUTES.length} routes rendered.`);
}

main()
  .then(() => {
    // esbuild keeps a background service running that would otherwise hold the
    // event loop open; exit explicitly so the chained build command proceeds.
    process.exit(0);
  })
  .catch((error) => {
    console.error("[prerender] failed:", error);
    process.exit(1);
  });
