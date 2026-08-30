import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";

import { createSupportApi } from "./server/support-api.js";

// Load .env into process.env for server-side middleware (Vite only exposes
// VITE_* prefixed vars to the client; the support API needs ADMIN_TOKEN etc.)
function loadEnvFile() {
  const envPath = path.resolve(import.meta.dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    // Don't overwrite existing env vars (e.g. from the shell)
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
loadEnvFile();

/**
 * Serves the support ticket API from the dev server.
 *
 * The same handler runs in production inside Express (server/index.ts), so the
 * support form and admin inbox behave identically with `pnpm dev` and with
 * `pnpm build && pnpm start`. No proxy or second process is required.
 */
function vitePluginSupportApi(): Plugin {
  return {
    name: "support-api",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(createSupportApi());
    },
  };
}

const plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginSupportApi()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    strictPort: false, // Will find next available port if 3000 is busy
    host: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
