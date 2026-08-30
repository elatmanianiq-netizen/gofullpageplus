/**
 * Support ticket API — connect-style handler shared by dev and production.
 *
 * The same handler runs in both environments:
 *   • production — mounted on the Express app in server/index.ts
 *   • development — mounted on Vite's dev server middleware stack
 *
 * It exposes one route:
 *   POST /api/support/tickets   public   submit a support message
 *
 * Submissions are emailed to the site owner over SMTP (see server/support-
 * email.ts); nothing is stored. It must not depend on Express-specific helpers
 * (`res.json`, `req.body`) because Vite's middleware provides neither, so
 * responses are written with raw node:http APIs.
 */
import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

import {
  SUPPORT_LIMITS,
  findSupportCategory,
} from "../shared/support.js";
import { sendSupportEmail, smtpConfigured } from "./support-email.js";

// ─── Configuration ───────────────────────────────────────────────────────────

/** Reject bodies larger than this outright, before parsing. */
const MAX_BODY_BYTES = 64 * 1024;

/** Submissions allowed from one network origin inside RATE_WINDOW_MS. */
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;

// ─── HTTP helpers ────────────────────────────────────────────────────────────

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(body));
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

function cleanString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

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

function ipPrefixOf(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-for"];
  const raw =
    (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "";

  const address = raw.replace(/^::ffff:/, "");
  if (address.includes(":")) {
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

  if (submissionLog.size > 10_000) {
    for (const [entryKey, times] of Array.from(submissionLog.entries())) {
      if (times.every((at: number) => now - at >= RATE_WINDOW_MS)) {
        submissionLog.delete(entryKey);
      }
    }
  }

  return false;
}

// ─── Route handler ───────────────────────────────────────────────────────────

async function createTicket(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const body = (await readBody(req)) as Record<string, unknown>;

  // Honeypot: only bots fill this hidden field. Pretend success.
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

  if (!smtpConfigured()) {
    console.error("[support] SMTP is not configured (set SMTP_HOST/SMTP_USER/SMTP_PASS).");
    throw new HttpError(
      503,
      "Support email is not configured yet. Please email us directly for now.",
    );
  }

  const reference = makeReference();

  try {
    await sendSupportEmail({
      reference,
      categoryLabel: category!.label,
      subject,
      message,
      email: cleanEmail(body.email),
      name: cleanString(body.name, SUPPORT_LIMITS.nameMax),
      extensionVersion: cleanString(body.extensionVersion, SUPPORT_LIMITS.versionMax),
      browser: cleanString(body.browser, SUPPORT_LIMITS.browserMax),
      sourcePage: cleanString(body.sourcePage, SUPPORT_LIMITS.sourcePageMax),
    });
  } catch (error) {
    console.error("[support] failed to send email:", error);
    throw new HttpError(
      502,
      "We could not send your message right now. Please try again shortly, or email us directly.",
    );
  }

  // randomUUID kept available for callers/tests that expect a unique id echoed.
  void randomUUID;

  sendJson(res, 201, { ok: true, reference });
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
