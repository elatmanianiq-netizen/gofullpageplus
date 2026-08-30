import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readTickets, requireAdmin } from "../_shared.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  const authError = requireAdmin(req);
  if (authError) {
    const status = authError.includes("not configured") ? 503 : 401;
    return res.status(status).json({ ok: false, error: authError });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Use GET to list tickets." });
  }

  const tickets = await readTickets();
  tickets.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return res.status(200).json({ ok: true, tickets });
}
