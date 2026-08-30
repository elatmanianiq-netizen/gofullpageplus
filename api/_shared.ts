/**
 * Shared helpers for Vercel serverless API functions.
 * Self-contained to avoid cross-directory import issues on Vercel.
 */
import type { VercelRequest } from "@vercel/node";
import { createHash, timingSafeEqual } from "node:crypto";
import fsp from "node:fs/promises";
import path from "node:path";

// ─── Types ───────────────────────────────────────────────────────────────────

export type TicketStatus = "new" | "open" | "resolved";

export const TICKET_STATUSES: readonly TicketStatus[] = ["new", "open", "resolved"];

export interface SupportTicket {
  id: string;
  reference: string;
  createdAt: string;
  updatedAt: string;
  status: TicketStatus;
  category: string;
  categoryLabel: string;
  subject: string;
  message: string;
  email: string;
  name: string;
  extensionVersion: string;
  browser: string;
  sourcePage: string;
  ipPrefix: string;
  adminNotes: string;
}

// ─── Categories ──────────────────────────────────────────────────────────────

interface SupportCategory {
  id: string;
  group: string;
  label: string;
}

const SUPPORT_CATEGORIES: SupportCategory[] = [
  { id: "icon-missing", group: "Capturing", label: "I cannot see the extension icon" },
  { id: "capture-wrong", group: "Capturing", label: "The capture does not look how I expected" },
  { id: "shortcut", group: "Capturing", label: "The keyboard shortcut does not work" },
  { id: "blocked-page", group: "Capturing", label: "Nothing happens on a particular page" },
  { id: "export", group: "Editing and export", label: "PNG, JPG, or PDF export problem" },
  { id: "editor", group: "Editing and export", label: "Problem with the editor, cropping, or annotations" },
  { id: "privacy", group: "Other", label: "Privacy or data protection question" },
  { id: "feature-request", group: "Other", label: "Feature request" },
  { id: "other", group: "Other", label: "Something else" },
];

export function findSupportCategory(id: string): SupportCategory | undefined {
  return SUPPORT_CATEGORIES.find((c) => c.id === id);
}

// ─── Limits ──────────────────────────────────────────────────────────────────

export const SUPPORT_LIMITS = {
  subjectMax: 140,
  messageMin: 20,
  messageMax: 4000,
  emailMax: 254,
  nameMax: 80,
  versionMax: 20,
  browserMax: 200,
  sourcePageMax: 500,
} as const;

// ─── Utilities ───────────────────────────────────────────────────────────────

export function cleanString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function cleanEmail(value: unknown): string {
  const email = cleanString(value, SUPPORT_LIMITS.emailMax).toLowerCase();
  if (!email) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

export function makeReference(): string {
  const alphabet = "23456789BCDFGHJKLMNPQRSTVWXZ";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `GFP-${code}`;
}

export function ipPrefixOf(req: VercelRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  const raw =
    (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "";
  const address = raw.replace(/^::ffff:/, "");
  if (address.includes(":")) {
    return `${address.split(":").slice(0, 3).join(":")}::/48`;
  }
  const octets = address.split(".");
  if (octets.length === 4) return `${octets.slice(0, 3).join(".")}.0/24`;
  return "unknown";
}

// ─── Storage ─────────────────────────────────────────────────────────────────

const DATA_FILE = path.join("/tmp", "support-tickets.json");

export async function readTickets(): Promise<SupportTicket[]> {
  try {
    const raw = await fsp.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as SupportTicket[];
  } catch {
    return [];
  }
}

export async function writeTickets(tickets: SupportTicket[]): Promise<void> {
  await fsp.writeFile(DATA_FILE, JSON.stringify(tickets, null, 2), "utf-8");
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export function requireAdmin(req: VercelRequest): string | null {
  const adminToken = process.env.ADMIN_TOKEN ?? "";
  if (adminToken.length < 16) {
    return "Admin access is not configured. Set ADMIN_TOKEN (at least 16 characters) in the server environment.";
  }

  const header = req.headers.authorization ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!provided) return "Missing admin token.";

  const digest = (v: string) => createHash("sha256").update(v).digest();
  if (!timingSafeEqual(digest(provided), digest(adminToken))) {
    return "Invalid admin token.";
  }

  return null;
}
