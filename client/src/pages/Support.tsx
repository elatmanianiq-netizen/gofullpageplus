/**
 * Support / "Report an issue" page.
 *
 * The Chrome Web Store listing points its support URL here, so this page has to
 * stand on its own: a reviewer following the link must find a working way to
 * reach a human without installing anything.
 *
 * Submissions go to POST /api/support/tickets, which emails them to the site
 * owner over SMTP. A direct email address is always offered as a fallback,
 * because a form that fails silently is worse than no form.
 */
import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Info,
  LifeBuoy,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { Link } from "wouter";

import SiteShell from "@/components/SiteShell";
import { usePageMeta } from "@/hooks/usePageMeta";
import { siteConfig, supportMailto } from "@/site-config";
import {
  SUPPORT_CATEGORIES,
  SUPPORT_CATEGORY_GROUPS,
  SUPPORT_LIMITS,
  findSupportCategory,
} from "@shared/support";

interface FormState {
  category: string;
  subject: string;
  message: string;
  email: string;
  name: string;
  extensionVersion: string;
  /** Honeypot. Visually hidden, so only automated submissions fill it. */
  companyWebsite: string;
}

const EMPTY_FORM: FormState = {
  category: SUPPORT_CATEGORIES[0].id,
  subject: "",
  message: "",
  email: "",
  name: "",
  extensionVersion: siteConfig.extensionVersion,
  companyWebsite: "",
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

/**
 * A short, readable browser descriptor for the ticket. The full user-agent
 * string is long and noisy; the browser and major version answer almost every
 * "which build are you on" question.
 */
function describeBrowser(): string {
  if (typeof navigator === "undefined") return "";

  const ua = navigator.userAgent;
  const platform =
    /Windows/.test(ua) ? "Windows"
    : /Mac OS X/.test(ua) ? "macOS"
    : /Linux/.test(ua) ? "Linux"
    : /Android/.test(ua) ? "Android"
    : /iPhone|iPad/.test(ua) ? "iOS"
    : "unknown platform";

  const edge = /Edg\/(\d+)/.exec(ua);
  const chrome = /Chrome\/(\d+)/.exec(ua);
  const firefox = /Firefox\/(\d+)/.exec(ua);
  const browser =
    edge ? `Edge ${edge[1]}`
    : chrome ? `Chrome ${chrome[1]}`
    : firefox ? `Firefox ${firefox[1]}`
    : "unknown browser";

  return `${browser} on ${platform}`;
}

export default function Support() {
  usePageMeta({
    title: "Contact Support",
    description: `Report an issue or ask a question about ${siteConfig.productName}. We reply by email, usually within two business days.`,
    path: "/support",
  });

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string>("");

  const browser = useMemo(describeBrowser, []);
  const activeCategory = findSupportCategory(form.category);

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  /** Mirror of the server's rules, so mistakes surface without a round trip. */
  const validate = (): FieldErrors => {
    const found: FieldErrors = {};
    if (!findSupportCategory(form.category)) {
      found.category = "Choose the option that best matches your issue.";
    }
    if (!form.subject.trim()) {
      found.subject = "Add a short summary so we can triage quickly.";
    }
    if (form.message.trim().length < SUPPORT_LIMITS.messageMin) {
      found.message = `Please use at least ${SUPPORT_LIMITS.messageMin} characters so we can understand the problem.`;
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      found.email = "That email address does not look right.";
    }
    return found;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBanner("");

    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          browser,
          sourcePage: window.location.href,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        reference?: string;
        error?: string;
        errors?: FieldErrors;
      };

      if (!response.ok || !payload.ok) {
        if (payload.errors) setErrors(payload.errors);
        setBanner(
          payload.error ??
            "We could not send your message. Please try again, or email us directly.",
        );
        return;
      }

      setReference(payload.reference ?? "");
      setForm(EMPTY_FORM);
    } catch {
      setBanner(
        "We could not reach the support service. Please check your connection or email us directly.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (reference) {
    return (
      <SiteShell>
        <article className="gfp-doc gfp-doc-narrow">
          <div className="support-success" role="status">
            <span className="support-success-icon">
              <CheckCircle2 size={28} />
            </span>
            <h1>Thank you, your message was received</h1>
            <p>
              Your reference is <strong>{reference}</strong>. Please quote it in any
              follow-up so we can find the conversation.
            </p>
            <p className="support-success-note">
              {form.email
                ? "We reply to the address you provided, usually within two business days."
                : "If you left an email address we will reply to it, usually within two business days. Without one we can read your report but cannot respond."}
            </p>
            <div className="support-success-actions">
              <button
                type="button"
                className="coral-button"
                onClick={() => {
                  setReference("");
                  setBanner("");
                }}
              >
                Send another message
              </button>
              <Link href="/faq" className="outline-button">
                Read the FAQ <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </article>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <article className="gfp-doc gfp-doc-narrow">
        <header className="gfp-doc-header">
          <span className="eyebrow">
            <LifeBuoy size={14} /> Support
          </span>
          <h1>Contact support</h1>
          <p className="gfp-doc-lead">
            Tell us what went wrong with {siteConfig.productName} and we will help.
            Fill in the form below, or email us directly if you prefer.
          </p>
        </header>

        <div className="support-quick-links">
          <Link href="/faq">
            <Info size={15} /> Check the FAQ first
          </Link>
          {supportMailto && (
            <a href={supportMailto}>
              <Mail size={15} /> {siteConfig.supportEmail}
            </a>
          )}
        </div>

        {banner && (
          <div className="support-banner support-banner-error" role="alert">
            <AlertCircle size={17} />
            <p>
              {banner}
              {supportMailto && (
                <>
                  {" "}
                  You can always write to{" "}
                  <a href={supportMailto}>{siteConfig.supportEmail}</a>.
                </>
              )}
            </p>
          </div>
        )}

        <form className="support-form" onSubmit={handleSubmit} noValidate>
          <div className="support-field">
            <label htmlFor="category">
              What do you need help with? <span aria-hidden="true">*</span>
            </label>
            <select
              id="category"
              name="category"
              value={form.category}
              onChange={(event) => update("category", event.target.value)}
              aria-invalid={Boolean(errors.category)}
              aria-describedby={errors.category ? "category-error" : undefined}
              required
            >
              {SUPPORT_CATEGORY_GROUPS.map((group) => (
                <optgroup key={group} label={group}>
                  {SUPPORT_CATEGORIES.filter(
                    (category) => category.group === group,
                  ).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {errors.category && (
              <p className="support-error" id="category-error" role="alert">
                {errors.category}
              </p>
            )}
          </div>

          {activeCategory && (
            <aside className="support-hint" aria-live="polite">
              <p>{activeCategory.hint}</p>
              <p className="support-hint-footer">
                Still stuck? Carry on with the form below and we will take a look.
              </p>
            </aside>
          )}

          <div className="support-field">
            <label htmlFor="subject">
              Summary <span aria-hidden="true">*</span>
            </label>
            <p className="support-help" id="subject-help">
              In a few words, what went wrong?
            </p>
            <input
              id="subject"
              name="subject"
              type="text"
              value={form.subject}
              maxLength={SUPPORT_LIMITS.subjectMax}
              onChange={(event) => update("subject", event.target.value)}
              aria-describedby={
                errors.subject ? "subject-help subject-error" : "subject-help"
              }
              aria-invalid={Boolean(errors.subject)}
              required
            />
            {errors.subject && (
              <p className="support-error" id="subject-error" role="alert">
                {errors.subject}
              </p>
            )}
          </div>

          <div className="support-field">
            <label htmlFor="message">
              What happened? <span aria-hidden="true">*</span>
            </label>
            <p className="support-help" id="message-help">
              What did you do, what did you expect, and what happened instead?
              Include the page address if you can share it, and any exact error
              text.
            </p>
            <textarea
              id="message"
              name="message"
              rows={7}
              value={form.message}
              maxLength={SUPPORT_LIMITS.messageMax}
              onChange={(event) => update("message", event.target.value)}
              aria-describedby={
                errors.message ? "message-help message-error" : "message-help"
              }
              aria-invalid={Boolean(errors.message)}
              required
            />
            <p className="support-counter">
              {form.message.length} / {SUPPORT_LIMITS.messageMax}
            </p>
            {errors.message && (
              <p className="support-error" id="message-error" role="alert">
                {errors.message}
              </p>
            )}
          </div>

          <div className="support-row">
            <div className="support-field">
              <label htmlFor="email">Email</label>
              <p className="support-help" id="email-help">
                Optional, but we cannot reply without it.
              </p>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                maxLength={SUPPORT_LIMITS.emailMax}
                onChange={(event) => update("email", event.target.value)}
                aria-describedby={
                  errors.email ? "email-help email-error" : "email-help"
                }
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email && (
                <p className="support-error" id="email-error" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="support-field">
              <label htmlFor="name">Name</label>
              <p className="support-help" id="name-help">
                Optional. Only used to address our reply.
              </p>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                value={form.name}
                maxLength={SUPPORT_LIMITS.nameMax}
                onChange={(event) => update("name", event.target.value)}
                aria-describedby="name-help"
              />
            </div>
          </div>

          <div className="support-field support-field-compact">
            <label htmlFor="extensionVersion">Extension version</label>
            <p className="support-help" id="version-help">
              Shown on chrome://extensions. Pre-filled with the current release.
            </p>
            <input
              id="extensionVersion"
              name="extensionVersion"
              type="text"
              value={form.extensionVersion}
              maxLength={SUPPORT_LIMITS.versionMax}
              onChange={(event) => update("extensionVersion", event.target.value)}
              aria-describedby="version-help"
            />
          </div>

          {/*
            Honeypot. Kept out of the accessibility tree and off screen rather
            than display:none, which some bots detect and skip.
          */}
          <div className="support-honeypot" aria-hidden="true">
            <label htmlFor="companyWebsite">Company website</label>
            <input
              id="companyWebsite"
              name="companyWebsite"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={form.companyWebsite}
              onChange={(event) => update("companyWebsite", event.target.value)}
            />
          </div>

          <div className="support-disclosure">
            <ShieldCheck size={16} />
            <p>
              Sending this form stores what you typed above, plus{" "}
              <strong>{browser || "your browser version"}</strong> and the address
              of this page, so we can reproduce the problem. This is emailed to our
              support team and used only to answer you. Your screenshots are never
              included: they stay on your device. See the{" "}
              <Link href="/privacy">Privacy Policy</Link>.
            </p>
          </div>

          <div className="support-actions">
            <button type="submit" className="coral-button" disabled={submitting}>
              {submitting ? "Sending…" : "Send message"}
              {!submitting && <ArrowRight size={17} />}
            </button>
            {supportMailto && (
              <span className="support-alt">
                or email <a href={supportMailto}>{siteConfig.supportEmail}</a>
              </span>
            )}
          </div>
        </form>
      </article>
    </SiteShell>
  );
}
