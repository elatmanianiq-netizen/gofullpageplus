/**
 * Vercel Serverless Function: POST /api/support/tickets
 *
 * Emails support form submissions to the site owner over SMTP. Nothing is
 * stored — the deployment stays stateless, which matters on Vercel's ephemeral
 * filesystem. Replies go straight back to the user via the Reply-To header.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import nodemailer from "nodemailer";

import {
  SUPPORT_LIMITS,
  cleanEmail,
  cleanString,
  findSupportCategory,
  makeReference,
} from "../_shared.js";

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Use POST to submit a ticket." });
  }

  const body = req.body ?? {};

  // Honeypot: only bots fill this hidden field. Pretend success.
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

  if (!smtpConfigured()) {
    console.error("[support] SMTP is not configured (set SMTP_HOST/SMTP_USER/SMTP_PASS).");
    return res.status(503).json({
      ok: false,
      error: "Support email is not configured yet. Please email us directly for now.",
    });
  }

  const reference = makeReference();
  const email = cleanEmail(body.email);
  const name = cleanString(body.name, SUPPORT_LIMITS.nameMax);
  const extensionVersion = cleanString(body.extensionVersion, SUPPORT_LIMITS.versionMax);
  const browser = cleanString(body.browser, SUPPORT_LIMITS.browserMax);
  const sourcePage = cleanString(body.sourcePage, SUPPORT_LIMITS.sourcePageMax);

  const rows: Array<[string, string]> = [
    ["Reference", reference],
    ["Category", category!.label],
    ["From", name ? `${name} <${email || "no email"}>` : email || "no email given"],
    ["Extension", extensionVersion || "not given"],
    ["Browser", browser || "not given"],
    ["Submitted from", sourcePage || "not given"],
  ];
  const textBody =
    rows.map(([k, v]) => `${k}: ${v}`).join("\n") + `\n\n----- Message -----\n\n${message}\n`;
  const htmlBody =
    `<table style="border-collapse:collapse;font-family:system-ui,sans-serif;font-size:14px">` +
    rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:4px 12px 4px 0;color:#667085;font-weight:600">${escapeHtml(k)}</td>` +
          `<td style="padding:4px 0">${escapeHtml(v)}</td></tr>`,
      )
      .join("") +
    `</table><hr style="border:none;border-top:1px solid #e8e6e1;margin:16px 0" />` +
    `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(
      message,
    )}</div>`;

  try {
    const port = Number(process.env.SMTP_PORT ?? 587);
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transport.sendMail({
      to: process.env.SUPPORT_TO || process.env.SMTP_USER,
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      replyTo: email || undefined,
      subject: `[Support ${reference}] ${subject}`,
      text: textBody,
      html: htmlBody,
    });
  } catch (error) {
    console.error("[support] failed to send email:", error);
    return res.status(502).json({
      ok: false,
      error: "We could not send your message right now. Please try again shortly, or email us directly.",
    });
  }

  return res.status(201).json({ ok: true, reference });
}
