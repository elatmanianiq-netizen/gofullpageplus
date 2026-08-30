/**
 * Fetch an unbranded Chrome for Testing build into tools/e2e/.browser/
 *
 * Needed because branded Google Chrome ignores --load-extension, so it cannot
 * run the extension integration test.
 *
 * Usage: node tools/e2e/install-browser.mjs
 */

import { execFile } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { arch } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEST = path.join(HERE, ".browser");

const platform = arch() === "arm64" ? "mac-arm64" : "mac-x64";
const binary = path.join(
  DEST,
  `chrome-${platform}`,
  "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
);

if (existsSync(binary)) {
  console.log(`Already installed: ${binary}`);
  process.exit(0);
}

const manifestUrl =
  "https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json";

console.log("Resolving latest stable Chrome for Testing…");
const manifest = await (await fetch(manifestUrl)).json();
const stable = manifest.channels.Stable;
const download = stable.downloads.chrome.find(
  entry => entry.platform === platform
);

if (!download)
  throw new Error(`No Chrome for Testing build for platform ${platform}`);

console.log(`Downloading ${stable.version} (${platform})…`);
await mkdir(DEST, { recursive: true });

const zipPath = path.join(DEST, "chrome.zip");
const response = await fetch(download.url);
if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
await writeFile(zipPath, Buffer.from(await response.arrayBuffer()));

console.log("Extracting…");
await run("unzip", ["-q", "-o", zipPath, "-d", DEST]);
await rm(zipPath, { force: true });

// Gatekeeper would otherwise refuse to launch the downloaded bundle.
await run("xattr", [
  "-dr",
  "com.apple.quarantine",
  path.join(DEST, `chrome-${platform}`),
]).catch(() => {});

if (!existsSync(binary))
  throw new Error(`Expected binary missing after extract: ${binary}`);
console.log(`Installed: ${binary}`);
