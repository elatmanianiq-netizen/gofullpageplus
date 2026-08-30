import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  TICKET_STATUSES,
  cleanString,
  readTickets,
  requireAdmin,
  writeTickets,
  type TicketStatus,
} from "../../_shared.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  const authError = requireAdmin(req);
  if (authError) {
    const status = authError.includes("not configured") ? 503 : 401;
    return res.status(status).json({ ok: false, error: authError });
  }

  if (req.method !== "PATCH") {
    return res.status(405).json({ ok: false, error: "Use PATCH to update a ticket." });
  }

  const { id } = req.query;
  const ticketId = Array.isArray(id) ? id[0] : id;
  if (!ticketId) {
    return res.status(400).json({ ok: false, error: "Missing ticket ID." });
  }

  const body = req.body ?? {};
  const status = cleanString(body.status, 20) as TicketStatus;
  const hasStatus = TICKET_STATUSES.includes(status);
  const hasNotes = typeof body.adminNotes === "string";

  if (!hasStatus && !hasNotes) {
    return res.status(400).json({ ok: false, error: "Provide a status or admin notes." });
  }

  const tickets = await readTickets();
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) {
    return res.status(404).json({ ok: false, error: "Ticket not found." });
  }

  if (hasStatus) ticket.status = status;
  if (hasNotes) ticket.adminNotes = cleanString(body.adminNotes, 4000);
  ticket.updatedAt = new Date().toISOString();

  await writeTickets(tickets);

  return res.status(200).json({ ok: true, ticket });
}
