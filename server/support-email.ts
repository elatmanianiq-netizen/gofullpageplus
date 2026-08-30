/**
 * Support email delivery.
 *
 * Support form submissions are emailed to the site owner over SMTP rather than
 * stored anywhere. That keeps the deployment stateless (important on Vercel,
 * whose filesystem is ephemeral) and means a reply is a normal "Reply" in your
 * inbox.
 *
 * Shared by both runtimes:
 *   • server/support-api.ts  — local dev + `pnpm start` (Express)
 *   • api/support/tickets.ts — Vercel serverless function
 *
 * Configuration (environment variables):
 *   SMTP_HOST      e.g. smtp.gmail.com
 *   SMTP_PORT      465 (SSL) or 587 (STARTTLS). Defaults to 587.
 *   SMTP_USER      the SMTP username / login
 *   SMTP_PASS      the SMTP password or app password
 *   SMTP_FROM      the From address. Defaults to SMTP_USER.
 *   SUPPORT_TO     where tickets are delivered. Defaults to SMTP_USER.
 */
import nodemailer from "nodemailer";

export interface SupportMessage {
  reference: string;
  categoryLabel: string;
  subject: string;
  message: string;
  email: string;
  name: string;
  extensionVersion: string;
  browser: string;
  sourcePage: string;
}

/** True only when the minimum SMTP settings are present. */
export function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function buildTransport() {
  const port = Number(process.env.SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // Port 465 is implicit TLS; 587 upgrades via STARTTLS.
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sends the support message to the owner. Sets Reply-To to the user's address
 * (when given) so hitting Reply in your mail client goes straight back to them.
 * Throws on failure so the caller can tell the user the message did not send.
 */
export async function sendSupportEmail(msg: SupportMessage): Promise<void> {
  const to = process.env.SUPPORT_TO || process.env.SMTP_USER!;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER!;

  const rows: Array<[string, string]> = [
    ["Reference", msg.reference],
    ["Category", msg.categoryLabel],
    ["From", msg.name ? `${msg.name} <${msg.email || "no email"}>` : msg.email || "no email given"],
    ["Extension", msg.extensionVersion || "not given"],
    ["Browser", msg.browser || "not given"],
    ["Submitted from", msg.sourcePage || "not given"],
  ];

  const textBody =
    rows.map(([k, v]) => `${k}: ${v}`).join("\n") +
    `\n\n----- Message -----\n\n${msg.message}\n`;

  const htmlBody =
    `<table style="border-collapse:collapse;font-family:system-ui,sans-serif;font-size:14px">` +
    rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:4px 12px 4px 0;color:#667085;font-weight:600">${escapeHtml(
            k,
          )}</td><td style="padding:4px 0">${escapeHtml(v)}</td></tr>`,
      )
      .join("") +
    `</table>` +
    `<hr style="border:none;border-top:1px solid #e8e6e1;margin:16px 0" />` +
    `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(
      msg.message,
    )}</div>`;

  await buildTransport().sendMail({
    to,
    from,
    replyTo: msg.email || undefined,
    subject: `[Support ${msg.reference}] ${msg.subject}`,
    text: textBody,
    html: htmlBody,
  });
}
