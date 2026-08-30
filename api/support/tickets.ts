import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import {
  SUPPORT_LIMITS,
  cleanEmail,
  cleanString,
  findSupportCategory,
  ipPrefixOf,
  makeReference,
  readTickets,
  writeTickets,
  type SupportTicket,
} from "../_shared.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Use POST to submit a ticket." });
  }

  const body = req.body ?? {};

  // Honeypot
  if (cleanString(body.companyWebsite, 100)) {
    return res.status(200).json({ ok: true, reference: makeReference() });
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
    return res.status(400).json({ ok: false, error: "Please check the form.", errors });
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
    ipPrefix: ipPrefixOf(req),
    adminNotes: "",
  };

  const tickets = await readTickets();
  tickets.unshift(ticket);
  await writeTickets(tickets);

  // Optional webhook notification
  const webhookUrl = process.env.SUPPORT_WEBHOOK_URL;
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `New ticket ${ticket.reference}\nCategory: ${ticket.categoryLabel}\nSubject: ${ticket.subject}`,
        reference: ticket.reference,
      }),
    }).catch(() => {});
  }

  return res.status(201).json({ ok: true, reference: ticket.reference });
}
