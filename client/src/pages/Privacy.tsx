/**
 * Privacy Policy.
 *
 * This is the single most scrutinised page in a Chrome Web Store review. Every
 * factual claim here was checked against the extension source, so it must be
 * updated whenever the extension's data handling changes:
 *
 *   • extension/manifest.json      — the permission list in "Permissions"
 *   • extension/shared/store.js    — MAX_AGE_MS, the six-hour retention claim
 *   • extension/background.js      — the "no network requests" claim
 *   • server/support-api.ts        — what the support form sends by email
 */
import { Database, Download, FileCode2, Globe, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

import SiteShell from "@/components/SiteShell";
import { usePageMeta } from "@/hooks/usePageMeta";
import { resolved, siteConfig, supportMailto } from "@/site-config";

/** Only render address text when it is actually filled in (not a TODO). */
const postalAddress = resolved(siteConfig.postalAddress);

/** Mirrors extension/manifest.json. Keep the two in step. */
const permissions = [
  {
    icon: Globe,
    name: "host access to the sites you capture",
    manifest: "host_permissions: <all_urls>",
    why: "A capture has to read the page you are looking at, and you can start one on any site. The permission is broad because the extension cannot know in advance which page you will choose. It is used only while a capture you started is running.",
  },
  {
    icon: FileCode2,
    name: "tabs",
    manifest: "permissions: tabs",
    why: "Needed to photograph the visible area of the tab you are on, to check the page can be captured at all, and to open the editor in a tab next to it. The extension reads the address of the current tab for that check. It does not read, collect, or store your browsing history.",
  },
  {
    icon: Database,
    name: "scripting",
    manifest: "permissions: scripting",
    why: "A capture works by measuring the page height, scrolling one screen at a time, and putting the page back exactly as it was. That requires running small measuring and scrolling routines in the page. They are part of the installed extension, run in an isolated context, and read no page content beyond geometry.",
  },
  {
    icon: Download,
    name: "downloads",
    manifest: "permissions: downloads",
    why: "Used only when you press Save in the editor, to write the finished PNG, JPG, or PDF to your download folder.",
  },
] as const;

export default function Privacy() {
  usePageMeta({
    title: "Privacy Policy",
    description: `How ${siteConfig.extensionName} handles your data: captures stay on your device, no tracking, no uploads. Every browser permission explained.`,
    path: "/privacy",
  });

  return (
    <SiteShell>
      <article className="gfp-doc">
        <header className="gfp-doc-header">
          <span className="eyebrow">
            <ShieldCheck size={14} /> Legal
          </span>
          <h1>Privacy Policy</h1>
          <p className="gfp-doc-lead">
            How {siteConfig.extensionName} and this website handle your
            information.
          </p>
          <p className="gfp-doc-meta">Last updated: {siteConfig.lastUpdated}</p>
        </header>

        <section className="gfp-doc-callout" aria-labelledby="summary">
          <h2 id="summary">The short version</h2>
          <ul>
            <li>
              Your screenshots never leave your device. The extension makes no
              network requests and has no server to send them to.
            </li>
            <li>
              There is no account, no sign-in, no advertising, no tracking, and no
              analytics inside the extension.
            </li>
            <li>
              A capture is held in your browser's own local storage so the editor
              can open it, and is deleted automatically about six hours later.
            </li>
            <li>
              We only ever receive personal information if you choose to send it,
              by writing to us through the{" "}
              <Link href="/support">support form</Link> or by email.
            </li>
            <li>We do not sell your data, and we never have.</li>
          </ul>
        </section>

        <section aria-labelledby="who">
          <h2 id="who">1. Who is responsible for your data</h2>
          <p>
            {siteConfig.extensionName} (the "extension") and this website are
            published by {siteConfig.legalEntity} ("we", "us")
            {postalAddress ? `, at ${postalAddress}` : ""}. For any question about
            this policy, or to exercise the rights described in section 9, contact
            us at{" "}
            {supportMailto ? (
              <a href={`mailto:${siteConfig.privacyEmail}`}>
                {siteConfig.privacyEmail}
              </a>
            ) : (
              siteConfig.privacyEmail
            )}
            .
          </p>
        </section>

        <section aria-labelledby="extension-data">
          <h2 id="extension-data">2. What the extension does with your data</h2>
          <p>
            The extension has one job: capture the page you are looking at and let
            you crop, annotate, and export it. All of that happens inside your own
            browser.
          </p>

          <h3>What is processed</h3>
          <p>
            While a capture you started is running, the extension reads the visible
            content of that tab, screen by screen, and measures the page's
            dimensions so it can join the pieces together. The finished image is
            stored locally with three pieces of context: the image itself, the
            page's title, and the page's address. The title and address are kept so
            the editor can label your capture and suggest a sensible file name.
          </p>

          <h3>Where it is stored</h3>
          <p>
            In IndexedDB, a storage area your browser keeps on your own computer,
            in a database named <code>fpc-store</code>. This is local storage. It is
            not synced to any account, and it is not readable by us or by any
            website.
          </p>

          <h3>How long it is kept</h3>
          <p>
            Captures are removed automatically once they are more than six hours
            old. Clearing your browsing data, or removing the extension, deletes
            them immediately. Nothing is retained after that.
          </p>

          <h3>What is never done</h3>
          <ul>
            <li>
              No image, page address, or page content is transmitted anywhere. The
              extension contains no code that sends data to a server, and no
              server exists to receive it.
            </li>
            <li>
              No browsing history, form input, password, cookie, or keystroke is
              collected.
            </li>
            <li>
              No analytics, telemetry, crash reporting, advertising, or
              fingerprinting is present in the extension.
            </li>
            <li>
              No code is downloaded and run at runtime. Everything the extension
              executes, including the PDF library used for PDF export, ships inside
              the installed package and is reviewable in the source.
            </li>
            <li>
              No data is sold, rented, or shared with data brokers, advertisers, or
              any other third party.
            </li>
          </ul>
        </section>

        <section aria-labelledby="permissions">
          <h2 id="permissions">3. Permissions, and why each one is needed</h2>
          <p>
            Your browser shows a warning when you install the extension, and it is
            right to ask. Here is exactly what each permission is for. None of them
            is used for any purpose other than producing the capture you asked for.
          </p>

          <div className="permission-list">
            {permissions.map((permission) => {
              const Icon = permission.icon;
              return (
                <div className="permission-item" key={permission.manifest}>
                  <span className="permission-icon">
                    <Icon size={19} />
                  </span>
                  <div>
                    <h3>{permission.name}</h3>
                    <code>{permission.manifest}</code>
                    <p>{permission.why}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="gfp-doc-note">
            The extension deliberately refuses to run on your browser's internal
            pages, on the Chrome Web Store, and on other extensions' pages. On any
            other page, nothing happens until you click the extension's icon or
            press its keyboard shortcut.
          </p>
        </section>

        <section aria-labelledby="limited-use">
          <h2 id="limited-use">4. Limited use of data</h2>
          <p>
            Our use of information obtained through the extension complies with the{" "}
            <a
              href="https://developer.chrome.com/docs/webstore/program-policies/limited-use/"
              target="_blank"
              rel="noreferrer noopener"
            >
              Chrome Web Store User Data Policy
            </a>
            , including its Limited Use requirements. Specifically: data handled by
            the extension is used only to provide the capture and export features
            you invoke; it is not transferred to anyone except as required by law;
            it is not used for advertising, credit assessment, or lending; and it is
            not sold. Because captures never leave your device, no human at our
            organisation can read them.
          </p>
        </section>

        <section aria-labelledby="website-data">
          <h2 id="website-data">5. What this website collects</h2>

          <h3>Support form and email</h3>
          <p>
            If you contact us through the{" "}
            <Link href="/support">support form</Link>, what you submit is sent to us
            as an email: the issue category, your summary and description, and, if you
            chose to provide them, your name and email address. The form also
            attaches the extension version you reported, a short description of your
            browser and operating system, and the address of the page you submitted
            from, because those details are usually what make a bug reproducible. We
            do not keep a separate database of submissions; the message simply
            arrives in our support mailbox like any other email.
          </p>
          <p>
            We use this only to answer you and to fix the problem you reported, and
            we retain it in our mailbox no longer than we need to for that purpose.
            The website itself stores nothing about your submission after the email
            is sent, and we briefly process a shortened form of your network
            address, with the final part removed, only to stop automated abuse of
            the form; it is not precise enough to identify you.
          </p>

          <h3>Website analytics</h3>
          <p>
            This site may use a privacy-focused, cookie-free analytics service to
            count page views and referring sites in aggregate. It does not set
            cookies, does not build a profile of you, and does not follow you across
            other websites. If you use a tracker blocker, nothing on this site will
            break.
          </p>

          <h3>Hosting</h3>
          <p>
            Like any website, our host processes the requests needed to deliver these
            pages to you. We do not combine that with anything else.
          </p>
        </section>

        <section aria-labelledby="legal-basis">
          <h2 id="legal-basis">6. Why we are allowed to process this</h2>
          <p>
            For readers in the United Kingdom and the European Economic Area, our
            lawful bases under the UK GDPR and EU GDPR are:
          </p>
          <ul>
            <li>
              <strong>Your consent</strong>, when you choose to send us a support
              message. You can withdraw it at any time by asking us to delete the
              message.
            </li>
            <li>
              <strong>Our legitimate interests</strong>, in keeping the support form
              free of automated abuse and in keeping this website available and
              secure.
            </li>
          </ul>
          <p>
            The extension itself processes nothing on our behalf, so no lawful basis
            is required for it.
          </p>
        </section>

        <section aria-labelledby="sharing">
          <h2 id="sharing">7. Who else sees your data</h2>
          <p>
            We do not sell or rent personal information, and we do not share it for
            advertising. The only third parties involved are the service providers
            needed to run this website, such as our hosting provider and, if
            enabled, our analytics provider. They act on our instructions and may
            not use your data for their own purposes. We may disclose information
            where the law requires it, or to protect our rights or someone's safety.
          </p>
        </section>

        <section aria-labelledby="transfers">
          <h2 id="transfers">8. International transfers</h2>
          <p>
            Our service providers may process data in countries other than yours.
            Where that involves a transfer out of the UK or EEA, we rely on
            transfer mechanisms recognised under applicable data protection law,
            such as an adequacy decision or standard contractual clauses.
          </p>
        </section>

        <section aria-labelledby="rights">
          <h2 id="rights">9. Your rights</h2>
          <p>
            Depending on where you live, you may have the right to ask us for a copy
            of the personal information we hold about you, to correct it, to delete
            it, to restrict or object to how we use it, and to receive it in a
            portable form. Residents of California and other US states with
            comparable laws have equivalent rights, including the right not to be
            discriminated against for exercising them. We do not sell or share
            personal information as those terms are defined in that legislation.
          </p>
          <p>
            To exercise any of these, email{" "}
            {supportMailto ? (
              <a href={`mailto:${siteConfig.privacyEmail}`}>
                {siteConfig.privacyEmail}
              </a>
            ) : (
              siteConfig.privacyEmail
            )}
            . If your request concerns a support message, quoting its reference code
            helps us find it. In practice the only personal information we are ever
            likely to hold is the content of a message you sent us. You may also
            complain to your local data protection authority.
          </p>
        </section>

        <section aria-labelledby="children">
          <h2 id="children">10. Children</h2>
          <p>
            The extension is a general-purpose utility and is not directed at
            children. We do not knowingly collect personal information from
            children. If you believe a child has sent us personal information,
            contact us and we will delete it.
          </p>
        </section>

        <section aria-labelledby="security">
          <h2 id="security">11. Security</h2>
          <p>
            The extension's strongest security property is architectural: what is
            never transmitted cannot be intercepted or breached. For this website,
            we serve everything over HTTPS and store no payment details of any
            kind. No system is perfectly secure, but the amount of data we hold is
            deliberately small.
          </p>
        </section>

        <section aria-labelledby="changes">
          <h2 id="changes">12. Changes to this policy</h2>
          <p>
            If we change how data is handled, we will update this page and change
            the date at the top. Continuing to use the extension after a change
            means you accept the updated policy.
          </p>
        </section>

        <section aria-labelledby="contact">
          <h2 id="contact">13. Contact us</h2>
          <p>
            {siteConfig.legalEntity}
            <br />
            {postalAddress && (
              <>
                {postalAddress}
                <br />
              </>
            )}
            {supportMailto ? (
              <a href={`mailto:${siteConfig.privacyEmail}`}>
                {siteConfig.privacyEmail}
              </a>
            ) : (
              siteConfig.privacyEmail
            )}
          </p>
          <p>
            Prefer a form? Use the <Link href="/support">support page</Link>.
          </p>
        </section>
      </article>
    </SiteShell>
  );
}
