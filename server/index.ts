import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

import { createSupportApi } from "./support-api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Behind a reverse proxy (nginx, Cloudflare, Fly, Render), trust the first
  // hop so the support API rate limiter sees the real caller rather than the
  // proxy's address.
  app.set("trust proxy", 1);

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  // The API must be mounted before the static handler and before the SPA
  // catch-all below, otherwise every /api/* call would return index.html.
  app.use(createSupportApi());

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
