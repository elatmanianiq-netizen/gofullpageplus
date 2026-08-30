/**
 * Support ticket API — deliberately framework-free.
 *
 * This module exports a single connect-style `(req, res, next)` handler, which
 * lets the exact same code serve both environments:
 *   • production — mounted on the Express app in server/index.ts
 *   • development — mounted on Vite's dev server middleware stack
 *
 * Because of that dual use it must not depend on Express-specific helpers
 * (`res.json`, `req.body`), so responses are written with raw node:http APIs.
 *
 * Routes
 *   POST   /api/support/tickets      public   submit a ticket
 *   GET    /api/admin/tickets        private  list tickets, newest first
 *   PATCH  /api/admin/tickets/:id    private  update status / admin notes
 *
 * Storage is a single JSON file. That is the right call at this scale: a
 * support inbox for a browser extension receives a handful of messages a day,
 * and a file keeps deployment to "copy the folder" with no database to run.
 * Writes are serialised through one promise chain and committed atomically via
 * rename, so a crash mid-write cannot corrupt the file.
 */

import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import fsp from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";

import {
  SUPPORT_LIMITS,
  TICKET_STATUSES,
  findSupportCategory,
  type SupportTicket,
  type TicketStatus,
} from "../shared/support.js";

// ─── Configuration ───────────────────────────────────────────────────────────

/** Reject bodies larger than this outright, before parsing. */
const MAX_BODY_BYTES = 64 * 1024;

/** Submissions allowed from one network origin inside RATE_WINDOW_MS. */
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;

/** Tickets older than this are pruned on the next write. */
const RETENTION_DAYS = Number(process.env.SUPPORT_RETENTION_DAYS ?? 365);

/** Hard ceiling on stored tickets, so the file cannot grow without bound. */
const MAX_STORED_TICKETS = 5000;

function dataDir(): string {
  return process.env.SUPPORT_DATA_DIR
    ? path.resolve(process.env.SUPPORT_DATA_DIR)
    : path.resolve(process.cwd(), "data");
}

function dataFile(): string {
  return path.join(dataDir(), "support-tickets.json");
}

// ─── Storage ─────────────────────────────────────────────────────────────────

/**
 * All mutations queue on this chain. Two concurrent submissions would
 * otherwise read the same array and one would overwrite the other.
 */
let writeChain: Promise<unknown> = Promise.resolve();

function serialise<T>(operation: () => Promise<T>): Promise<T> {
  const result = writeChain.then(operation, operation);
  // Keep the chain alive even when an operation rejects.
  writeChain = result.catch(() => undefined);
  return result;
}

async function readTickets(): Promise<SupportTicket[]> {
  try {
    const raw = await fsp.readFile(dataFile(), "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SupportTicket[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    // A corrupt file must not take the whole site down; log and start clean.
    console.error("[support-api] could not read ticket store:", error);
    return [];
  }
}

async function writeTickets(tickets: SupportTicket[]): Promise<void> {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const retained = tickets
    .filter((ticket) => {
      const created = Date.parse(ticket.createdAt);
      return Number.isNaN(created) ? true : created >= cutoff;
    })
    .slice(0, MAX_STORED_TICKETS);

  await fsp.mkdir(dataDir(), { recursive: true });

  // Write to a sibling temp file, then rename: rename is atomic on POSIX, so a
  // reader never observes a half-written file.
  const target = dataFile();
  const temp = `${target}.${process.pid}.tmp`;
  await fsp.writeFile(temp, JSON.stringify(retained, null, 2), "utf-8");
  await fsp.rename(temp, target);
}

// ─── HTTP helpers ────────────────────────────────────────────────────────────

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  // Ticket data must never be embedded or sniffed into another content type.
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(payload);
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of req) {
    const buffer = chunk as Buffer;
    total += buffer.length;
    if (total > MAX_BODY_BYTES) throw new HttpError(413, "Request body too large.");
    chunks.push(buffer);
  }

  if (total === 0) return {};

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf-8"));
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// ─── Field handling ──────────────────────────────────────────────────────────

/**
 * Normalises any untrusted value into a bounded single-line-safe string.
 * Control characters are stripped so a ticket can never inject terminal escape
 * sequences or break the admin table layout; tabs and newlines survive.
 */
function cleanString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

/**
 * Deliberately permissive: an over-strict pattern that rejects a valid address
 * costs a real support conversation. Replies are sent by a human anyway.
 */
function cleanEmail(value: unknown): string {
  const email = cleanString(value, SUPPORT_LIMITS.emailMax).toLowerCase();
  if (!email) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

/** Unambiguous reference code: no vowels, no 0/O or 1/I confusion. */
function makeReference(): string {
  const alphabet = "23456789BCDFGHJKLMNPQRSTVWXZ";
  let code = "";
  for (let index = 0; index < 6; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `GFP-${code}`;
}

/**
 * Reduces a caller address to a coarse prefix. Storing a full IP alongside a
 * support message is personal data we have no use for; a prefix is enough to
 * rate limit abuse.
 */
function ipPrefixOf(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-for"];
  const raw =
    (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "";

  const address = raw.replace(/^::ffff:/, "");
  if (address.includes(":")) {
    // IPv6: keep the /48 routing prefix only.
    return `${address.split(":").slice(0, 3).join(":")}::/48`;
  }
  const octets = address.split(".");
  if (octets.length === 4) return `${octets.slice(0, 3).join(".")}.0/24`;
  return "unknown";
}

// ─── Rate limiting ───────────────────────────────────────────────────────────

const submissionLog = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (submissionLog.get(key) ?? []).filter(
    (at) => now - at < RATE_WINDOW_MS,
  );

  if (recent.length >= RATE_LIMIT) {
    submissionLog.set(key, recent);
    return true;
  }

  recent.push(now);
  submissionLog.set(key, recent);

  // Opportunistic cleanup so the map cannot grow forever.
  if (submissionLog.size > 10_000) {
    for (const [entryKey, times] of Array.from(submissionLog.entries())) {
      if (times.every((at: number) => now - at >= RATE_WINDOW_MS)) {
        submissionLog.delete(entryKey);
      }
    }
  }

  return false;
}

// ─── Admin authentication ────────────────────────────────────────────────────

/**
 * A single shared bearer token, read from ADMIN_TOKEN.
 *
 * When the variable is absent the admin routes report 503 rather than allowing
 * access: an inbox that opens itself because configuration is missing is the
 * classic way support data leaks.
 */
function adminTokenConfigured(): boolean {
  const token = process.env.ADMIN_TOKEN ?? "";
  return token.length >= 16;
}

function requireAdmin(req: IncomingMessage): void {
  if (!adminTokenConfigured()) {
    throw new HttpError(
      503,
      "Admin access is not configured. Set ADMIN_TOKEN (at least 16 characters) in the server environment.",
    );
  }

  const header = req.headers.authorization ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!provided) throw new HttpError(401, "Missing admin token.");

  // Hash both sides first so timingSafeEqual always receives equal lengths and
  // cannot leak the expected token's length.
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (!timingSafeEqual(digest(provided), digest(process.env.ADMIN_TOKEN ?? ""))) {
    throw new HttpError(401, "Invalid admin token.");
  }
}

// ─── Outbound notification ───────────────────────────────────────────────────

/**
 * Optional ping to a webhook you control (Slack, Discord, Zapier, your own
 * endpoint) so a new ticket reaches you without polling the admin page.
 *
 * Off unless SUPPORT_WEBHOOK_URL is set. The message body is never included —
 * only the reference, category, and subject — so a third-party webhook does not
 * become a copy of every user's support history.
 */
function notifyWebhook(ticket: SupportTicket): void {
  const url = process.env.SUPPORT_WEBHOOK_URL;
  if (!url) return;

  const summary =
    `New support ticket ${ticket.reference}\n` +
    `Category: ${ticket.categoryLabel}\n` +
    `Subject: ${ticket.subject}\n` +
    `Reply to: ${ticket.email || "(no address given)"}`;

  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: summary,
      reference: ticket.reference,
      category: ticket.category,
      subject: ticket.subject,
      hasEmail: Boolean(ticket.email),
      createdAt: ticket.createdAt,
    }),
  }).catch((error: unknown) => {
    // A failed notification must never fail the user's submission.
    console.error("[support-api] webhook notification failed:", error);
  });
}

// ─── Route handlers ──────────────────────────────────────────────────────────

async function createTicket(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const body = (await readBody(req)) as Record<string, unknown>;

  // Honeypot: the form renders this field off-screen, so only a bot fills it.
  // Answer 200 so the bot has no signal that it was rejected.
  if (cleanString(body.companyWebsite, 100)) {
    sendJson(res, 200, { ok: true, reference: makeReference() });
    return;
  }

  const ipPrefix = ipPrefixOf(req);
  if (rateLimited(ipPrefix)) {
    throw new HttpError(
      429,
      "Too many messages sent from this network. Please try again in a few minutes, or email us directly.",
    );
  }

  const category = findSupportCategory(cleanString(body.category, 60));
  const subject = cleanString(body.subject, SUPPORT_LIMITS.subjectMax);
  const message = cleanString(body.message, SUPPORT_LIMITS.messageMax);

  const errors: Record<string, string> = {};
  if (!category) errors.category = "Choose the option that best matches your issue.";
  if (!subject) errors.subject = "Add a short summary.";
  if (message.length < SUPPORT_LIMITS.messageMin) {
    errors.message = `Please describe the issue in at least ${SUPPORT_LIMITS.messageMin} characters.`;
  }
  if (Object.keys(errors).length > 0) {
    sendJson(res, 400, { ok: false, error: "Please check the form.", errors });
    return;
  }

  const now = new Date().toISOString();
  const ticket: SupportTicket = {
    id: randomUUID(),
    reference: makeReference(),
    createdAt: now,
    updatedAt: now,
    status: "new",
    category: category!.id,
    categoryLabel: category!.label,
    subject,
    message,
    email: cleanEmail(body.email),
    name: cleanString(body.name, SUPPORT_LIMITS.nameMax),
    extensionVersion: cleanString(body.extensionVersion, SUPPORT_LIMITS.versionMax),
    browser: cleanString(body.browser, SUPPORT_LIMITS.browserMax),
    sourcePage: cleanString(body.sourcePage, SUPPORT_LIMITS.sourcePageMax),
    ipPrefix,
    adminNotes: "",
  };

  await serialise(async () => {
    const tickets = await readTickets();
    tickets.unshift(ticket);
    await writeTickets(tickets);
  });

  notifyWebhook(ticket);

  sendJson(res, 201, { ok: true, reference: ticket.reference });
}

async function listTickets(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  requireAdmin(req);
  const tickets = await readTickets();
  tickets.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  sendJson(res, 200, { ok: true, tickets });
}

async function updateTicket(
  req: IncomingMessage,
  res: ServerResponse,
  id: string,
): Promise<void> {
  requireAdmin(req);
  const body = (await readBody(req)) as Record<string, unknown>;

  const status = cleanString(body.status, 20) as TicketStatus;
  const hasStatus = TICKET_STATUSES.includes(status);
  const hasNotes = typeof body.adminNotes === "string";

  if (!hasStatus && !hasNotes) {
    throw new HttpError(400, "Provide a status or admin notes to update.");
  }

  const updated = await serialise(async () => {
    const tickets = await readTickets();
    const ticket = tickets.find((candidate) => candidate.id === id);
    if (!ticket) return undefined;

    if (hasStatus) ticket.status = status;
    if (hasNotes) ticket.adminNotes = cleanString(body.adminNotes, 4000);
    ticket.updatedAt = new Date().toISOString();

    await writeTickets(tickets);
    return ticket;
  });

  if (!updated) throw new HttpError(404, "Ticket not found.");
  sendJson(res, 200, { ok: true, ticket: updated });
}

// ─── Middleware entry point ──────────────────────────────────────────────────

type NextFunction = (error?: unknown) => void;

export function createSupportApi() {
  return function supportApi(
    req: IncomingMessage,
    res: ServerResponse,
    next: NextFunction,
  ): void {
    const url = new URL(req.url ?? "/", "http://localhost");
    const pathname = url.pathname.replace(/\/+$/, "") || "/";

    // Anything outside the API surface belongs to the static site.
    if (!pathname.startsWith("/api/")) {
      next();
      return;
    }

    const method = (req.method ?? "GET").toUpperCase();

    const route = async (): Promise<void> => {
      if (pathname === "/api/support/tickets") {
        if (method === "POST") return createTicket(req, res);
        throw new HttpError(405, "Use POST to submit a ticket.");
      }

      if (pathname === "/api/admin/tickets") {
        if (method === "GET") return listTickets(req, res);
        throw new HttpError(405, "Use GET to list tickets.");
      }

      const updateMatch = /^\/api\/admin\/tickets\/([A-Za-z0-9-]{1,64})$/.exec(
        pathname,
      );
      if (updateMatch) {
        if (method === "PATCH") return updateTicket(req, res, updateMatch[1]);
        throw new HttpError(405, "Use PATCH to update a ticket.");
      }

      throw new HttpError(404, "Unknown API endpoint.");
    };

    route().catch((error: unknown) => {
      if (res.headersSent) return;

      if (error instanceof HttpError) {
        sendJson(res, error.status, { ok: false, error: error.message });
        return;
      }

      console.error("[support-api] unhandled error:", error);
      sendJson(res, 500, {
        ok: false,
        error: "Something went wrong on our side. Please try again shortly.",
      });
    });
  };
}
