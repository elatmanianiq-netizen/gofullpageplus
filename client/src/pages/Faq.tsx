/**
 * Public FAQ and troubleshooting page.
 *
 * Doubles as the "support documentation" a Chrome Web Store reviewer looks for,
 * and as genuine self-service: the answers below are written from the actual
 * behaviour of extension/background.js, so they resolve real tickets rather than
 * restating marketing copy.
 */
import type { ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import { Link } from "wouter";

import SiteShell from "@/components/SiteShell";
import { siteConfig } from "@/site-config";

interface FaqEntry {
  question: string;
  answer: ReactNode;
}

interface FaqGroup {
  id: string;
  title: string;
  entries: FaqEntry[];
}

const groups: FaqGroup[] = [
  {
    id: "getting-started",
    title: "Getting started",
    entries: [
      {
        question: "What does a full page capture actually do?",
        answer: (
          <p>
            A normal screenshot records only the part of the page you can see. A full
            page capture records the whole document from top to bottom, including
            everything below the fold, and saves it as one continuous image. The
            extension does that by scrolling the page one screen at a time,
            photographing each screen, and joining the results together.
          </p>
        ),
      },
      {
        question: "How do I take a capture?",
        answer: (
          <>
            <p>
              Open the page you want, click the {siteConfig.productName} icon in your
              browser toolbar, and start the capture. The page scrolls by itself, and
              the finished image opens in an editor tab where you can crop, annotate,
              and export it.
            </p>
            <p>
              There is also a keyboard shortcut, <kbd>Alt</kbd> + <kbd>Shift</kbd> +{" "}
              <kbd>P</kbd> by default.
            </p>
          </>
        ),
      },
      {
        question: "I cannot find the extension icon.",
        answer: (
          <p>
            Chrome hides newly installed extensions behind the puzzle-piece icon to
            the right of the address bar. Click it, find{" "}
            {siteConfig.productName} in the list, and click the pin so the icon stays
            on the toolbar. If it is not in that list either, open{" "}
            <code>chrome://extensions</code> and check that the extension is enabled.
          </p>
        ),
      },
      {
        question: "Which browsers does it work in?",
        answer: (
          <p>
            Any recent Chromium-based desktop browser, which includes Google Chrome,
            Microsoft Edge, Brave, Vivaldi, and Opera. Browser extensions of this
            kind cannot run on Chrome for Android or iOS, which is a platform
            limitation rather than a missing feature.
          </p>
        ),
      },
      {
        question: "Can I change the keyboard shortcut?",
        answer: (
          <p>
            Yes. Open <code>chrome://extensions/shortcuts</code> and set whatever
            combination you prefer. This is also where to look if the default does
            nothing: another extension or a desktop application may already have
            claimed <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>.
          </p>
        ),
      },
    ],
  },
  {
    id: "captures",
    title: "Captures and troubleshooting",
    entries: [
      {
        question: "Nothing happens on a particular page. Why?",
        answer: (
          <>
            <p>
              Browsers forbid extensions from reading their own internal pages, and
              the extension respects that rather than failing halfway through. It will
              not run on:
            </p>
            <ul>
              <li>
                <code>chrome://</code> and <code>edge://</code> pages, including the
                settings and extensions screens
              </li>
              <li>the Chrome Web Store</li>
              <li>other extensions' pages</li>
            </ul>
            <p>
              On an ordinary <code>http://</code> or <code>https://</code> page, the
              usual cause is that the tab was already open when you installed the
              extension. Reload the tab once and try again.
            </p>
          </>
        ),
      },
      {
        question: "The image is cut off, repeated, or has gaps.",
        answer: (
          <>
            <p>Three things reliably improve the result:</p>
            <ul>
              <li>
                Scroll the page from top to bottom once before capturing, so images
                that only load when they come into view are actually present.
              </li>
              <li>
                Dismiss cookie banners, chat widgets, and pop-ups. Anything pinned to
                the screen can otherwise appear repeatedly down the image.
              </li>
              <li>Wait for the page to finish loading before you start.</li>
            </ul>
            <p>
              Some layouts genuinely cannot be measured, in particular pages that
              scroll inside an inner panel rather than the browser window, and content
              inside an embedded frame from another site. If a page still comes out
              wrong after the steps above, please{" "}
              <Link href="/support">send us the address</Link> and we will look at it.
            </p>
          </>
        ),
      },
      {
        question: "Is there a limit to how long a page can be?",
        answer: (
          <p>
            There is a safety ceiling of 200 screens, which exists so a page with
            endless scrolling cannot capture forever. Extremely tall captures are also
            scaled down where necessary to stay within the largest image your browser
            can produce. If a capture stops early, it has almost always hit an
            infinite-scroll feed rather than a real page end.
          </p>
        ),
      },
      {
        question: "Why does capturing take a few seconds?",
        answer: (
          <p>
            Browsers rate-limit how often an extension may photograph a tab, at
            roughly two frames per second, and the extension waits a moment after each
            scroll so the page can finish repainting. A long page therefore takes
            longer. The work continues even if you close the popup.
          </p>
        ),
      },
      {
        question: "Can I export to PDF?",
        answer: (
          <p>
            Yes. The editor exports PNG, JPG, and PDF. PDF is produced on your own
            machine by a library bundled inside the extension, so no upload or
            conversion service is involved.
          </p>
        ),
      },
      {
        question: "I reopened the editor tab and the image is gone.",
        answer: (
          <p>
            Captures are deliberately temporary. They are held in your browser's local
            storage and cleared automatically once they are about six hours old, so
            the extension does not quietly accumulate images of everything you have
            ever captured. Export anything you want to keep, and it is saved to your
            download folder as a normal file.
          </p>
        ),
      },
    ],
  },
  {
    id: "privacy",
    title: "Privacy and permissions",
    entries: [
      {
        question: "Are my screenshots uploaded anywhere?",
        answer: (
          <p>
            No. The extension makes no network requests at all, and there is no
            server behind it to receive anything. Captures are created, edited, and
            exported entirely on your device. You can verify this yourself: open your
            browser's developer tools on the Network tab while capturing, and you will
            see no outbound traffic from the extension.
          </p>
        ),
      },
      {
        question: "Why does it ask to read data on all websites?",
        answer: (
          <p>
            Because a capture has to read the page you are looking at, and you can
            start one anywhere, so the extension cannot know in advance which site you
            will choose. The permission is broad by necessity, but it is used only
            while a capture you started is running, and only to photograph and measure
            that one tab. Our{" "}
            <Link href="/privacy#permissions">Privacy Policy</Link> explains each
            permission line by line.
          </p>
        ),
      },
      {
        question: "Is there an account, or any tracking?",
        answer: (
          <p>
            None. There is no sign-in, no analytics, no telemetry, no advertising, and
            no fingerprinting inside the extension. Nothing you capture is associated
            with an identity, because no identity exists.
          </p>
        ),
      },
      {
        question: "How do I delete everything the extension has stored?",
        answer: (
          <p>
            Uninstalling the extension removes its local storage with it. You can also
            clear it at any time through your browser's "Clear browsing data" screen
            by including cached and site data. Any files you already exported are
            ordinary files in your download folder and are unaffected.
          </p>
        ),
      },
      {
        question: "Does it cost anything?",
        answer: (
          <p>
            No. {siteConfig.productName} version {siteConfig.extensionVersion} is free
            to use, with no paid tier, no subscription, and no in-extension purchases.
          </p>
        ),
      },
    ],
  },
];

export default function Faq() {
  return (
    <SiteShell>
      <article className="gfp-doc">
        <header className="gfp-doc-header">
          <span className="eyebrow">
            <HelpCircle size={14} /> Help centre
          </span>
          <h1>Frequently asked questions</h1>
          <p className="gfp-doc-lead">
            How {siteConfig.productName} works, what to do when a page misbehaves, and
            exactly what happens to your data.
          </p>
        </header>

        {groups.map((group) => (
          <section key={group.id} aria-labelledby={group.id}>
            <h2 id={group.id}>{group.title}</h2>
            <div className="capture-faq-list">
              {group.entries.map((entry) => (
                <details key={entry.question}>
                  <summary>{entry.question}</summary>
                  <div className="faq-answer">{entry.answer}</div>
                </details>
              ))}
            </div>
          </section>
        ))}

        <section className="gfp-doc-callout" aria-labelledby="still-stuck">
          <h2 id="still-stuck">Still stuck?</h2>
          <p>
            Send us the page address and what you saw, and we will reproduce it.
            Reports that name a specific URL get fixed fastest.
          </p>
          <p>
            <Link href="/support" className="coral-button">
              Contact support
            </Link>
          </p>
        </section>
      </article>
    </SiteShell>
  );
}
