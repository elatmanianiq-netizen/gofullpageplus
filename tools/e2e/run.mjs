/**
 * End-to-end check for the Full Page Screen Capture extension.
 *
 * Drives a real Chrome over the DevTools Protocol (no test framework, no
 * dependencies) and exercises the actual extension pipeline:
 *
 *   popup page -> START_CAPTURE -> background scroll & stitch -> IndexedDB
 *   -> editor tab
 *
 * It then reads pixels out of the stitched image in the editor tab and checks
 * them against the fixture's known colour bands. That is what proves the
 * segments are aligned, the page tail is not duplicated, and the fixed header
 * is only captured once.
 *
 * Usage: node tools/e2e/run.mjs
 */

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const EXTENSION_DIR = path.join(REPO, "extension");
/**
 * Branded Google Chrome ignores --load-extension (it logs
 * "--disable-extensions-except is not allowed in Google Chrome"), so an
 * unbranded Chrome for Testing build is required. Fetch it with:
 *   node tools/e2e/install-browser.mjs
 */
const CHROME_CANDIDATES = [
  process.env.CHROME_BIN,
  path.join(
    HERE,
    ".browser/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
  ),
  path.join(
    HERE,
    ".browser/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
  ),
].filter(Boolean);

const CHROME = CHROME_CANDIDATES.find(candidate => existsSync(candidate));

const VIEWPORT = { width: 1200, height: 800 };
const PAGE_HEIGHT = 2500;

const failures = [];
const notes = [];

function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) {
    console.log(
      `         expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
    failures.push(label);
  }
}

function checkThat(label, condition, detail = "") {
  console.log(`  ${condition ? "PASS" : "FAIL"}  ${label}`);
  if (!condition) {
    if (detail) console.log(`         ${detail}`);
    failures.push(label);
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Minimal CDP client ──────────────────────────────────────────────────────

class CDP {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.nextId = 0;
    this.pending = new Map();
    this.listeners = [];
  }

  async ready() {
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });

    this.ws.addEventListener("message", event => {
      const message = JSON.parse(event.data);

      if (message.id != null && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
        return;
      }

      this.listeners.forEach(fn => fn(message));
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.nextId;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) =>
      this.pending.set(id, { resolve, reject })
    );
  }

  onEvent(fn) {
    this.listeners.push(fn);
  }

  close() {
    try {
      this.ws.close();
    } catch {
      /* ignore */
    }
  }
}

/** Evaluate an async expression in a target and return its value. */
async function evaluate(cdp, sessionId, expression) {
  const result = await cdp.send(
    "Runtime.evaluate",
    { expression, awaitPromise: true, returnByValue: true },
    sessionId
  );

  if (result.exceptionDetails) {
    const text =
      result.exceptionDetails.exception?.description ||
      result.exceptionDetails.text ||
      "evaluation failed";
    throw new Error(text);
  }

  return result.result.value;
}

/**
 * Attach to a target and wait until it can actually run script. A freshly
 * attached page has no default execution context for a moment.
 */
async function attach(cdp, targetId) {
  const { sessionId } = await cdp.send("Target.attachToTarget", {
    targetId,
    flatten: true,
  });
  await cdp.send("Runtime.enable", {}, sessionId).catch(() => {});

  const deadline = Date.now() + 20000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      await evaluate(cdp, sessionId, "1");
      return sessionId;
    } catch (err) {
      lastError = err;
      await sleep(150);
    }
  }

  throw new Error(
    `Target ${targetId} never became evaluable: ${lastError?.message}`
  );
}

/**
 * Target.createTarget resolves before navigation, and the initial about:blank
 * document already reports readyState 'complete'. Wait for the real URL.
 */
async function waitForDocument(cdp, sessionId, urlFragment) {
  return waitFor(`document ${urlFragment}`, async () => {
    try {
      const info = await evaluate(
        cdp,
        sessionId,
        "({ href: location.href, ready: document.readyState })"
      );
      if (
        !info ||
        !info.href.includes(urlFragment) ||
        info.ready !== "complete"
      )
        return null;
      return info;
    } catch {
      return null; // context swapped mid-navigation
    }
  });
}

async function waitFor(
  label,
  predicate,
  { timeout = 30000, interval = 250 } = {}
) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const value = await predicate();
    if (value) return value;
    await sleep(interval);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

let chrome;
let server;
let userDataDir;
let downloadDir;
let cdp;

try {
  if (!CHROME) {
    throw new Error(
      "No Chrome for Testing build found. Run: node tools/e2e/install-browser.mjs\n" +
        "(Branded Google Chrome cannot be used: it ignores --load-extension.)"
    );
  }
  console.log(`Using browser: ${CHROME}`);

  // Serve the fixture over http: captures on file:// URLs require the user to
  // grant file access, which unpacked extensions do not have by default.
  const fixture = await readFile(path.join(HERE, "fixture.html"));
  server = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(fixture);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const fixtureUrl = `http://127.0.0.1:${server.address().port}/fixture.html`;
  console.log(`\nFixture served at ${fixtureUrl}`);

  userDataDir = await mkdtemp(path.join(tmpdir(), "fpc-e2e-"));
  downloadDir = await mkdtemp(path.join(tmpdir(), "fpc-dl-"));

  chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${userDataDir}`,
      `--load-extension=${EXTENSION_DIR}`,
      `--disable-extensions-except=${EXTENSION_DIR}`,
      `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
      `--download-default-directory=${downloadDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "about:blank",
    ],
    { stdio: ["ignore", "pipe", "pipe"] }
  );

  let chromeStderr = "";
  chrome.stderr.on("data", chunk => {
    chromeStderr += chunk.toString();
  });

  // Chrome writes the chosen debugging port here once it is listening.
  const portFile = path.join(userDataDir, "DevToolsActivePort");
  const port = await waitFor(
    "Chrome debugging port",
    () => {
      if (!existsSync(portFile)) return null;
      const line = readFileSync(portFile, "utf8").split("\n")[0].trim();
      return line || null;
    },
    { timeout: 30000 }
  ).catch(err => {
    throw new Error(`${err.message}\nChrome stderr:\n${chromeStderr}`);
  });

  const version = await (
    await fetch(`http://127.0.0.1:${port}/json/version`)
  ).json();
  cdp = new CDP(version.webSocketDebuggerUrl);
  await cdp.ready();
  console.log(`Connected to ${version.Browser}`);

  await cdp.send("Target.setDiscoverTargets", { discover: true });

  // ── Find OUR service worker ───────────────────────────────────────────────
  // Chrome bundles component extensions (Google Hangouts, Contextual Tasks…)
  // that also have a background.js, so match on the manifest name rather than
  // the worker filename.
  const swTarget = await waitFor("extension service worker", async () => {
    const { targetInfos } = await cdp.send("Target.getTargets");
    const candidates = targetInfos.filter(
      t =>
        t.type === "service_worker" && t.url.startsWith("chrome-extension://")
    );

    for (const candidate of candidates) {
      try {
        const { sessionId } = await cdp.send("Target.attachToTarget", {
          targetId: candidate.targetId,
          flatten: true,
        });
        const name = await evaluate(
          cdp,
          sessionId,
          "chrome.runtime.getManifest().name"
        );
        if (name === "Full Page Screen Capture")
          return { ...candidate, sessionId };
      } catch {
        /* not evaluable yet */
      }
    }
    return null;
  });

  const extensionId = new URL(swTarget.url).host;
  console.log(`Extension loaded: ${extensionId}`);

  const workerApis = await evaluate(
    cdp,
    swTarget.sessionId,
    `JSON.stringify({
       scripting: typeof chrome.scripting,
       downloads: typeof chrome.downloads,
       storage: typeof chrome.storage,
       offscreenCanvas: typeof OffscreenCanvas,
       createImageBitmap: typeof createImageBitmap,
       indexedDB: typeof indexedDB
     })`
  );

  console.log(`Worker APIs: ${workerApis}\n`);
  check(
    "service worker has every API the pipeline needs",
    JSON.parse(workerApis),
    {
      scripting: "object",
      downloads: "object",
      storage: "object",
      offscreenCanvas: "function",
      createImageBitmap: "function",
      indexedDB: "object",
    }
  );

  // ── Open the fixture ──────────────────────────────────────────────────────
  const { targetId: fixtureTargetId } = await cdp.send("Target.createTarget", {
    url: fixtureUrl,
  });
  const fixtureSession = await attach(cdp, fixtureTargetId);

  await waitForDocument(cdp, fixtureSession, "fixture.html");

  const pageInfo = await evaluate(
    cdp,
    fixtureSession,
    `({
       dpr: window.devicePixelRatio,
       innerWidth: window.innerWidth,
       clientWidth: document.documentElement.clientWidth,
       innerHeight: window.innerHeight,
       scrollHeight: document.documentElement.scrollHeight
     })`
  );

  console.log("Fixture metrics:", JSON.stringify(pageInfo));
  checkThat(
    "fixture is taller than the viewport (multi-segment capture)",
    pageInfo.scrollHeight === PAGE_HEIGHT && pageInfo.innerHeight < PAGE_HEIGHT,
    `scrollHeight=${pageInfo.scrollHeight} innerHeight=${pageInfo.innerHeight}`
  );

  // ── Drive the real pipeline from an extension page ────────────────────────
  // The popup runs in its own window so the fixture stays the visible tab in
  // its window, which is what captureVisibleTab photographs.
  const { targetId: popupTargetId } = await cdp.send("Target.createTarget", {
    url: `chrome-extension://${extensionId}/popup/popup.html`,
    newWindow: true,
  });
  const popupSession = await attach(cdp, popupTargetId);

  await waitForDocument(cdp, popupSession, "popup/popup.html");
  const popupHasApis = await evaluate(cdp, popupSession, "typeof chrome.tabs");
  checkThat(
    "popup page has extension API access",
    popupHasApis === "object",
    popupHasApis
  );

  console.log("\nStarting capture through the extension…");
  const captureResult = await evaluate(
    cdp,
    popupSession,
    `(async () => {
       const tabs = await chrome.tabs.query({ url: ${JSON.stringify(fixtureUrl)} });
       if (!tabs.length) return { error: 'fixture tab not found' };

       const done = new Promise((resolve) => {
         chrome.runtime.onMessage.addListener(function handler(msg) {
           if (msg.type === 'CAPTURE_DONE' || msg.type === 'CAPTURE_ERROR' || msg.type === 'CAPTURE_CANCELLED') {
             chrome.runtime.onMessage.removeListener(handler);
             resolve(msg);
           }
         });
       });

       const ack = await chrome.runtime.sendMessage({ type: 'START_CAPTURE', tabId: tabs[0].id });
       if (ack && ack.ok === false) return { error: ack.error };

       const timeout = new Promise((r) => setTimeout(() => r({ error: 'timed out' }), 90000));
       return await Promise.race([done, timeout]);
     })()`
  );

  console.log("Capture result:", JSON.stringify(captureResult));
  checkThat(
    "capture completed without error",
    captureResult && captureResult.type === "CAPTURE_DONE",
    JSON.stringify(captureResult)
  );

  const expectedWidth = Math.round(pageInfo.clientWidth * pageInfo.dpr);
  const expectedHeight = Math.round(PAGE_HEIGHT * pageInfo.dpr);

  check(
    "stitched width matches content width (scrollbar trimmed)",
    captureResult?.width,
    expectedWidth
  );
  check(
    "stitched height matches full page height",
    captureResult?.height,
    expectedHeight
  );

  // ── The editor tab should have opened with the capture ─────────────────────
  const editorTarget = await waitFor("editor tab", async () => {
    const { targetInfos } = await cdp.send("Target.getTargets");
    return targetInfos.find(
      t => t.type === "page" && t.url.includes("/editor/editor.html?id=")
    );
  });

  console.log(
    `\nEditor opened: ${editorTarget.url.replace(`chrome-extension://${extensionId}`, "")}`
  );
  checkThat("editor tab opened automatically", true);

  const editorSession = await attach(cdp, editorTarget.targetId);

  // Wait for the editor to pull the blob out of IndexedDB and decode it.
  const editorState = await waitFor(
    "editor image ready",
    async () => {
      const value = await evaluate(
        cdp,
        editorSession,
        `(() => {
           const img = document.getElementById('shot');
           const failure = document.getElementById('failure');
           if (failure && !failure.hidden) return { failed: failure.textContent };
           if (!img || !img.complete || !img.naturalWidth) return null;
           return {
             width: img.naturalWidth,
             height: img.naturalHeight,
             dims: document.getElementById('meta-dims').textContent,
             loadingHidden: document.getElementById('loading').hidden
           };
         })()`
      );
      return value;
    },
    { timeout: 30000 }
  );

  if (editorState.failed) {
    checkThat(
      "editor loaded the capture from IndexedDB",
      false,
      editorState.failed
    );
  } else {
    checkThat("editor loaded the capture from IndexedDB", true);
    check("editor image width", editorState.width, expectedWidth);
    check("editor image height", editorState.height, expectedHeight);
    check(
      "editor reports dimensions",
      editorState.dims,
      `${expectedWidth} × ${expectedHeight} px`
    );
  }

  // ── Sample the stitched pixels ────────────────────────────────────────────
  // Colour bands sit at known offsets, so a mis-stitched image shows up as a
  // wrong colour at a sampled row.
  const samples = await evaluate(
    cdp,
    editorSession,
    `(() => {
       const img = document.getElementById('shot');
       const canvas = document.createElement('canvas');
       canvas.width = img.naturalWidth;
       canvas.height = img.naturalHeight;
       const ctx = canvas.getContext('2d');
       ctx.drawImage(img, 0, 0);

       const dpr = ${pageInfo.dpr};
       const cx = Math.floor(img.naturalWidth / 2);
       const at = (cssY) => {
         const y = Math.min(img.naturalHeight - 1, Math.round(cssY * dpr));
         const [r, g, b] = ctx.getImageData(cx, y, 1, 1).data;
         return r + ',' + g + ',' + b;
       };

       return {
         header_30: at(30),
         band1_250: at(250),
         band2_750: at(750),
         afterHeader_830: at(830),
         band3_1250: at(1250),
         segment3Top_1630: at(1630),
         band4_1750: at(1750),
         band5_2250: at(2250),
         tail_2495: at(2495)
       };
     })()`
  );

  console.log("\nPixel samples (r,g,b):");
  Object.entries(samples).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log("");

  check("fixed header captured once at the top", samples.header_30, "0,0,0");
  check("band 1 (red) at y=250", samples.band1_250, "255,0,0");
  check("band 2 (green) at y=750", samples.band2_750, "0,128,0");
  check(
    "fixed header NOT stamped onto segment 2 (y=830 is page content)",
    samples.afterHeader_830,
    "0,128,0"
  );
  check("band 3 (blue) at y=1250", samples.band3_1250, "0,0,255");
  check(
    "fixed header NOT stamped onto segment 3 (y=1630 is page content)",
    samples.segment3Top_1630,
    "255,255,0"
  );
  check("band 4 (yellow) at y=1750", samples.band4_1750, "255,255,0");
  check("band 5 (magenta) at y=2250", samples.band5_2250, "255,0,255");
  check(
    "page tail is correct, not duplicated content (y=2495 is the last band)",
    samples.tail_2495,
    "255,0,255"
  );

  // ── The fixture page must be left exactly as we found it ──────────────────
  const restored = await evaluate(
    cdp,
    fixtureSession,
    `({
       scrollY: window.scrollY,
       headerVisibility: getComputedStyle(document.getElementById('fixed-header')).visibility,
       stickyPosition: getComputedStyle(document.getElementById('sticky-chip')).position,
       scrollBehavior: document.documentElement.style.scrollBehavior,
       lazyLoading: document.getElementById('lazy-image').getAttribute('loading'),
       height: document.documentElement.scrollHeight
     })`
  );

  console.log("Fixture after capture:", JSON.stringify(restored), "\n");
  check("page scrolled back to the top", restored.scrollY, 0);
  check(
    "fixed header made visible again",
    restored.headerVisibility,
    "visible"
  );
  check("sticky element restored", restored.stickyPosition, "sticky");
  check("inline scroll-behavior override removed", restored.scrollBehavior, "");
  check("lazy loading restored", restored.lazyLoading, "lazy");
  check("page height unchanged", restored.height, PAGE_HEIGHT);

  // ── Crop path ─────────────────────────────────────────────────────────────
  console.log("Exercising the crop path…");
  const cropResult = await evaluate(
    cdp,
    editorSession,
    `(async () => {
       const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
       document.getElementById('btn-crop').click();
       await sleep(100);

       const barVisible = !document.getElementById('crop-bar').hidden;

       // Crop to the blue band: natural px, dpr-aware.
       const dpr = ${pageInfo.dpr};
       const set = (id, v) => {
         const input = document.getElementById(id);
         input.value = String(Math.round(v * dpr));
         input.dispatchEvent(new Event('change'));
       };
       set('crop-x', 0);
       set('crop-y', 1000);
       set('crop-w', 400);
       set('crop-h', 500);
       await sleep(100);

       const applyDisabled = document.getElementById('btn-crop-apply').disabled;
       document.getElementById('btn-crop-apply').click();

       // Wait for the re-encode and reload of the working image.
       for (let i = 0; i < 60; i++) {
         await sleep(100);
         const img = document.getElementById('shot');
         if (img.complete && img.naturalWidth === Math.round(400 * dpr)) break;
       }

       const img = document.getElementById('shot');
       const canvas = document.createElement('canvas');
       canvas.width = img.naturalWidth;
       canvas.height = img.naturalHeight;
       canvas.getContext('2d').drawImage(img, 0, 0);
       const [r, g, b] = canvas
         .getContext('2d')
         .getImageData(Math.floor(img.naturalWidth / 2), Math.floor(img.naturalHeight / 2), 1, 1)
         .data;

       return {
         barVisible,
         applyDisabled,
         width: img.naturalWidth,
         height: img.naturalHeight,
         centreColour: r + ',' + g + ',' + b,
         revertShown: !document.getElementById('btn-revert').hidden,
         dims: document.getElementById('meta-dims').textContent
       };
     })()`
  );

  console.log("Crop result:", JSON.stringify(cropResult), "\n");
  check("crop bar appears when Crop is pressed", cropResult.barVisible, true);
  check(
    "Apply is enabled for a valid selection",
    cropResult.applyDisabled,
    false
  );
  check("cropped width", cropResult.width, Math.round(400 * pageInfo.dpr));
  check("cropped height", cropResult.height, Math.round(500 * pageInfo.dpr));
  check(
    "crop took the requested region (blue band)",
    cropResult.centreColour,
    "0,0,255"
  );
  check("revert control offered after cropping", cropResult.revertShown, true);

  // ── Revert path ───────────────────────────────────────────────────────────
  const revertResult = await evaluate(
    cdp,
    editorSession,
    `(async () => {
       const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
       document.getElementById('btn-revert').click();
       for (let i = 0; i < 60; i++) {
         await sleep(100);
         const img = document.getElementById('shot');
         if (img.complete && img.naturalHeight === ${expectedHeight}) break;
       }
       const img = document.getElementById('shot');
       return { width: img.naturalWidth, height: img.naturalHeight };
     })()`
  );

  check("revert restores the full capture", revertResult, {
    width: expectedWidth,
    height: expectedHeight,
  });

  // ── Exports actually land on disk ─────────────────────────────────────────
  console.log("\nExporting PNG, JPG and PDF…");

  // Headless Chrome does not honour --download-default-directory reliably, so
  // set the download path over CDP as well.
  await cdp
    .send("Browser.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: downloadDir,
      eventsEnabled: true,
    })
    .catch(err => console.log(`  (setDownloadBehavior: ${err.message})`));

  for (const format of ["png", "jpg", "pdf"]) {
    await evaluate(
      cdp,
      editorSession,
      `document.getElementById('btn-${format}').click()`
    );
    await sleep(2000);

    const diagnostic = await evaluate(
      cdp,
      editorSession,
      `(async () => {
         const toast = document.getElementById('toast');
         const items = await chrome.downloads.search({ limit: 5 });
         return JSON.stringify({
           toast: toast.hidden ? null : toast.textContent,
           downloads: items.map((d) => ({ state: d.state, error: d.error, file: d.filename }))
         });
       })()`
    );
    console.log(`  ${format}: ${diagnostic}`);
  }

  const files = await waitFor(
    "three exported files",
    async () => {
      const found = (await readdir(downloadDir)).filter(
        f => !f.endsWith(".crdownload")
      );
      return found.length >= 3 ? found : null;
    },
    { timeout: 30000 }
  ).catch(async () =>
    (await readdir(downloadDir)).filter(f => !f.endsWith(".crdownload"))
  );

  console.log(`Downloads: ${JSON.stringify(files)}`);

  const byExt = {};
  for (const file of files) {
    // Browser.setDownloadBehavior assigns GUID filenames, and Chrome normalises
    // the JPEG extension, so key on the normalised extension only.
    const ext = path
      .extname(file)
      .slice(1)
      .toLowerCase()
      .replace("jpeg", "jpg");
    byExt[ext] = await readFile(path.join(downloadDir, file));
  }

  const signatures = {
    png: b =>
      b.length > 8 &&
      b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    jpg: b => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
    pdf: b => b.length > 5 && b.subarray(0, 5).toString() === "%PDF-",
  };

  for (const ext of ["png", "jpg", "pdf"]) {
    const bytes = byExt[ext];
    checkThat(
      `${ext.toUpperCase()} export written and well formed`,
      Boolean(bytes) && bytes.length > 1000 && signatures[ext](bytes),
      bytes ? `${bytes.length} bytes, bad signature` : "no file produced"
    );
    if (bytes) console.log(`  ${ext}: ${(bytes.length / 1024).toFixed(1)} KiB`);
  }

  // ── Guard rails ───────────────────────────────────────────────────────────
  const guard = await evaluate(
    cdp,
    popupSession,
    `(async () => {
       const tabs = await chrome.tabs.query({});
       const extensionTab = tabs.find((t) => t.url.startsWith('chrome-extension://'));
       const ack = await chrome.runtime.sendMessage({
         type: 'START_CAPTURE',
         tabId: extensionTab.id
       });
       return ack;
     })()`
  );

  console.log("");
  checkThat(
    "refuses to capture a non-http page with a clear message",
    guard && guard.ok === false && /http/i.test(guard.error),
    JSON.stringify(guard)
  );

  notes.push(
    "Lazy-image behaviour is only weakly covered: the fixture uses a data: URL, which decodes regardless of the loading attribute."
  );
  notes.push(
    "Export filenames are not asserted: Browser.setDownloadBehavior replaces them with GUIDs. File contents and formats are verified."
  );
  notes.push(
    "Clipboard copy is not covered: headless Chrome has no system clipboard to read back."
  );
} catch (err) {
  console.error(`\nHARNESS ERROR: ${err.stack || err.message}`);
  failures.push(`harness: ${err.message}`);
} finally {
  cdp?.close();
  if (chrome) {
    chrome.kill("SIGKILL");
  }
  await new Promise(resolve => (server ? server.close(resolve) : resolve()));
  if (userDataDir)
    await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  if (downloadDir)
    await rm(downloadDir, { recursive: true, force: true }).catch(() => {});
}

console.log("─".repeat(64));
if (notes.length) {
  console.log("Notes:");
  notes.forEach(n => console.log(`  - ${n}`));
}

if (failures.length) {
  console.log(`\n${failures.length} check(s) FAILED:`);
  failures.forEach(f => console.log(`  - ${f}`));
  process.exit(1);
}

console.log("\nAll end-to-end checks passed.");
process.exit(0);
