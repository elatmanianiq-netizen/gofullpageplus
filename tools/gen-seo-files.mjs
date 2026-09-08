/**
 * Generate robots.txt and sitemap.xml into the build output with the real site
 * URL, instead of shipping the `yourdomain.com` placeholders.
 *
 * The source files in client/public/ keep the placeholder so the repo stays
 * generic; this build step overwrites the copies in dist/public with the value
 * from client/src/site-config.ts (or the SITE_URL env var, which wins so you
 * can set it in Vercel without editing code).
 *
 * If no real URL is configured, it leaves the placeholder files as-is and warns,
 * rather than emitting a broken sitemap.
 */
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "dist", "public");

/** Indexable routes with a change frequency and priority for the sitemap. */
const ROUTES = [
  { path: "/", changefreq: "monthly", priority: "1.0" },
  { path: "/faq", changefreq: "monthly", priority: "0.8" },
  { path: "/support", changefreq: "yearly", priority: "0.7" },
  { path: "/privacy", changefreq: "yearly", priority: "0.6" },
  { path: "/terms", changefreq: "yearly", priority: "0.5" },
];

async function resolveSiteUrl() {
  // SITE_URL env var wins so you can set it in Vercel without editing code.
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");

  // Otherwise read siteUrl straight out of site-config.ts. A simple regex is
  // enough and avoids bundling the TS module (which pulls in browser-oriented
  // code). The placeholder value starts with "TODO:" and is treated as unset.
  try {
    const source = await fs.readFile(
      path.join(ROOT, "client", "src", "site-config.ts"),
      "utf-8",
    );
    const match = /siteUrl:\s*`?["'`]?([^"'`,\n]+)/.exec(source);
    const value = match?.[1]?.trim() ?? "";
    if (!value || value.startsWith("TODO") || value.includes("${")) return "";
    return value.replace(/\/$/, "");
  } catch {
    return "";
  }
}

function buildSitemap(siteUrl) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = ROUTES.map(
    (route) =>
      `  <url>\n` +
      `    <loc>${siteUrl}${route.path}</loc>\n` +
      `    <lastmod>${today}</lastmod>\n` +
      `    <changefreq>${route.changefreq}</changefreq>\n` +
      `    <priority>${route.priority}</priority>\n` +
      `  </url>`,
  ).join("\n");

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${urls}\n` +
    `</urlset>\n`
  );
}

function buildRobots(siteUrl) {
  return (
    `User-agent: *\n` +
    `Allow: /\n\n` +
    `# Internal API endpoints, nothing to index.\n` +
    `Disallow: /api/\n\n` +
    `Sitemap: ${siteUrl}/sitemap.xml\n`
  );
}

async function main() {
  if (!existsSync(OUT_DIR)) {
    console.error(`[seo] ${OUT_DIR} not found. Run \`vite build\` first.`);
    process.exit(1);
  }

  const siteUrl = await resolveSiteUrl();

  if (!siteUrl) {
    console.warn(
      "[seo] No site URL configured (siteConfig.siteUrl is a placeholder and " +
        "SITE_URL is unset). Leaving robots.txt/sitemap.xml with placeholder " +
        "domains. Set SITE_URL in Vercel or fill siteUrl in site-config.ts.",
    );
    return;
  }

  await fs.writeFile(path.join(OUT_DIR, "sitemap.xml"), buildSitemap(siteUrl), "utf-8");
  await fs.writeFile(path.join(OUT_DIR, "robots.txt"), buildRobots(siteUrl), "utf-8");
  console.log(`[seo] Wrote robots.txt and sitemap.xml for ${siteUrl}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[seo] failed:", error);
    process.exit(1);
  });
