/**
 * Landing page for Full Page Capture.
 *
 * Everything stated here has to be true and verifiable against the extension
 * source, because the Chrome Web Store compares listing claims against the
 * manifest and the code. Two things were removed from an earlier draft of this
 * page for that reason, and should not come back:
 *
 *   • a "Featured Across" strip naming TechRadar, PC Mag, Business Insider,
 *     Fast Company and Gizmodo, none of which have covered this product
 *   • eight invented five-star testimonials, plus a "Highly Rated" badge, for
 *     an extension with no published reviews
 *
 * Fabricated endorsements and ratings breach the Chrome Web Store
 * misrepresentation policy and are grounds for removal, not just rejection.
 * If you want social proof here, wait for real store reviews and quote those.
 */
import {
  ArrowRight,
  Check,
  Chrome,
  Download,
  ExternalLink,
  FileImage,
  ImagePlus,
  Keyboard,
  LockKeyhole,
  MonitorCheck,
  MousePointerClick,
  Palette,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "wouter";

import SiteShell from "@/components/SiteShell";
import { usePageMeta } from "@/hooks/usePageMeta";
import { resolved, siteConfig } from "@/site-config";

const benefits = [
  {
    icon: MousePointerClick,
    title: "One click, whole page",
    text: "Capture a full scrolling page from top to bottom without stitching anything together yourself.",
  },
  {
    icon: LockKeyhole,
    title: "Stays on your device",
    text: "The extension makes no network requests. Captures are created, edited, and exported locally, and are never uploaded.",
  },
  {
    icon: MonitorCheck,
    title: "Handles awkward layouts",
    text: "Sticky headers are photographed once, then moved out of the way, so they do not repeat down the image.",
  },
  {
    icon: Download,
    title: "PNG, JPG, or PDF",
    text: "Export in the format that suits the job. PDF is generated on your machine, with no conversion service involved.",
  },
  {
    icon: Palette,
    title: "Crop, annotate, redact",
    text: "Trim the image, add arrows and notes, and blur out anything private before you save it.",
  },
  {
    icon: Keyboard,
    title: "Keyboard shortcut",
    text: "Press Alt+Shift+P to capture without reaching for the toolbar. Remap it whenever you like.",
  },
] as const;

const faqPreview = [
  {
    question: "What is a full page screenshot?",
    answer:
      "It records the whole document from top to bottom, including everything below the fold, and saves it as one continuous image rather than several separate screenshots.",
  },
  {
    question: "Are my captures uploaded anywhere?",
    answer:
      "No. The extension contains no code that sends data to a server, and there is no server behind it. Everything happens in your browser, and captures are cleared from local storage after about six hours.",
  },
  {
    question: "Why does it need access to the sites I visit?",
    answer:
      "A capture has to read the page you are looking at, and you can start one on any site, so the permission cannot be narrowed in advance. It is used only while a capture you started is running.",
  },
  {
    question: "Does it cost anything?",
    answer:
      "No. There is no paid tier, no subscription, and no account to create.",
  },
] as const;

export default function Home() {
  usePageMeta({
    title: `${siteConfig.extensionName} for Chrome & Edge`,
    description: `${siteConfig.tagline} Free, runs entirely in your browser with no account and no tracking.`,
    path: "/",
    exact: true,
  });

  const chromeStore = resolved(siteConfig.chromeStoreUrl);
  const edgeStore = resolved(siteConfig.edgeStoreUrl);
  const published = Boolean(chromeStore || edgeStore);

  return (
    <SiteShell variant="landing">
      <section id="top" className="gfp-hero" aria-labelledby="hero-title">
        <div className="gfp-hero-inner">
          <div className="hero-rating">
            <ShieldCheck size={15} />
            <span>Runs locally · No account · No tracking</span>
          </div>

          <h1 id="hero-title">
            Capture any webpage entirely
            <br />
            <em>with just a single click</em>
          </h1>

          <p className="edge-availability">
            <MonitorCheck size={16} /> Works in Chrome, Edge, and other Chromium
            browsers
          </p>

          <div className="hero-buttons">
            {chromeStore ? (
              <a
                href={chromeStore}
                className="coral-button"
                target="_blank"
                rel="noreferrer noopener"
              >
                <Chrome size={18} /> Add to Chrome <ExternalLink size={15} />
              </a>
            ) : (
              <a href="#benefits" className="coral-button">
                See what it does <ArrowRight size={17} />
              </a>
            )}
            <Link href="/faq" className="outline-button">
              Read the FAQ <ArrowRight size={17} />
            </Link>
          </div>

          <div className="hero-device" aria-label="Capture preview">
            <div className="device-toolbar">
              <span />
              <span />
              <span />
              <div>
                example.com <LockKeyhole size={12} />
              </div>
            </div>
            <div className="device-content">
              <div className="device-side">
                <div />
                <div />
                <div />
                <div />
              </div>
              <div
                className="device-screenshot"
                aria-label="Animation showing a full page being captured"
              >
                <div className="workflow-page" aria-hidden="true">
                  <div className="workflow-banner">
                    <span>New Release</span>
                    <i />
                  </div>
                  <p className="workflow-title">The Ultimate Workflow Guide</p>
                  <p className="workflow-subtitle">
                    One sprawling page. Crystal clear capture.
                  </p>
                  <div className="workflow-heading">
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="workflow-copy">
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="workflow-cards">
                    <b>Strategize</b>
                    <b>Build</b>
                    <b>Launch</b>
                  </div>
                  <div className="workflow-section">
                    <div>
                      <i />
                      <i />
                      <i />
                    </div>
                    <div>
                      <i />
                      <i />
                      <i />
                    </div>
                  </div>
                  <div className="workflow-footer">
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="workflow-progress">
                    <span>Scanning page layout…</span>
                    <i>
                      <b />
                    </i>
                    <strong>68%</strong>
                  </div>
                </div>
                <div className="scan-mask" aria-hidden="true" />
                <div className="scan-cursor" aria-hidden="true">
                  <MousePointerClick size={15} />
                </div>
                <div className="capture-chip">
                  <span className="capture-pulse" />
                  <MousePointerClick size={15} /> Capturing…
                </div>
                <div className="capture-complete">
                  <Check size={14} /> Ready!
                </div>
              </div>
            </div>
            <div className="device-bottom">
              <span>Scrolling and stitching automatically…</span>
              <div>
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="benefits"
        className="gfp-section benefits-section"
        aria-labelledby="benefits-title"
      >
        <div className="section-intro">
          <span className="eyebrow">What it does</span>
          <h2 id="benefits-title">
            Everything you need for a clean scrolling screenshot
          </h2>
          <p>
            Simple enough for a quick grab, and reliable on the long pages that
            usually break screenshot tools.
          </p>
        </div>
        <div className="benefit-grid">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <article className="benefit-card" key={benefit.title}>
                <span className="benefit-icon">
                  <Icon size={23} />
                </span>
                <h3>{benefit.title}</h3>
                <p>{benefit.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section
        id="full-page-screen-capture"
        className="capture-explainer"
        aria-labelledby="capture-explainer-title"
      >
        <div className="capture-explainer-copy">
          <span className="eyebrow">How it works</span>
          <h2 id="capture-explainer-title">
            Don't settle for chopped images. Capture it all.
          </h2>
          <p>
            A standard screenshot leaves out exactly what matters: the context
            hidden below the fold. <strong>{siteConfig.productName}</strong>{" "}
            measures the page, scrolls it one screen at a time, photographs each
            screen, and joins the results into a single image.
          </p>
          <p>
            The page is put back exactly as it was afterwards, and the finished
            capture opens in an editor tab where you can crop it, mark it up, and
            export it.
          </p>
          <Link href="/faq" className="text-action">
            Read the details <ArrowRight size={16} />
          </Link>
        </div>
        <div className="format-board">
          <span className="format-board-label">Export formats</span>
          <div className="format-row">
            <FileImage size={21} />
            <div>
              <strong>PNG</strong>
              <span>Lossless, best for detail</span>
            </div>
          </div>
          <div className="format-row">
            <ImagePlus size={21} />
            <div>
              <strong>JPG</strong>
              <span>Smaller file, easier to send</span>
            </div>
          </div>
          <div className="format-row">
            <Download size={21} />
            <div>
              <strong>PDF</strong>
              <span>For documents and archives</span>
            </div>
          </div>
          <p>Generated on your own machine, then saved to your downloads.</p>
        </div>
      </section>

      <section className="demo-section" aria-labelledby="demo-title">
        <div className="demo-wrap">
          <div className="demo-copy">
            <span className="eyebrow">Built to be predictable</span>
            <h2 id="demo-title">Awkward pages, handled honestly</h2>
            <p>
              Sticky headers are photographed once and then hidden, so they do not
              repeat down the image. Captures continue in the background, so
              closing the popup will not interrupt one.
            </p>
            <p>
              Some layouts genuinely cannot be measured, and we would rather say so
              than pretend otherwise: pages that scroll inside an inner panel,
              content embedded from another site, and endless feeds can all produce
              an incomplete image. There is a 200-screen ceiling so a feed that
              never ends cannot capture forever.
            </p>
            <div className="demo-points">
              <span>
                <Check size={15} /> Restores the page when it finishes
              </span>
              <span>
                <Check size={15} /> Never runs until you ask it to
              </span>
            </div>
            <Link href="/faq" className="text-action">
              Troubleshooting guide <ArrowRight size={16} />
            </Link>
          </div>
          <div className="demo-frame" aria-label="Export workflow illustration">
            <div className="demo-bar">
              <span />
              <span />
              <span />
              <p>Screenshot ready</p>
            </div>
            <div className="export-workflow">
              <div className="export-page" aria-hidden="true">
                <div className="export-page-nav">
                  <i />
                  <i />
                  <i />
                </div>
                <div className="export-page-title">
                  <i />
                  <i />
                </div>
                <div className="export-page-grid">
                  <b />
                  <b />
                  <b />
                  <b />
                </div>
                <div className="export-page-copy">
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              </div>
              <div className="export-sheet">
                <span className="export-sheet-eyebrow">
                  <Check size={14} /> Ready to save
                </span>
                <h3>Save your capture</h3>
                <p>Choose a format to finish.</p>
                <div className="export-options">
                  <span>
                    <FileImage size={16} />
                    <b>PNG</b>
                    <i>Best for detail</i>
                  </span>
                  <span>
                    <ImagePlus size={16} />
                    <b>JPG</b>
                    <i>Smaller file</i>
                  </span>
                  <span>
                    <Download size={16} />
                    <b>PDF</b>
                    <i>For documents</i>
                  </span>
                </div>
                <button type="button">
                  Download <Download size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="gfp-section"
        id="privacy-summary"
        aria-labelledby="privacy-summary-title"
      >
        <div className="section-intro">
          <span className="eyebrow">Privacy</span>
          <h2 id="privacy-summary-title">
            What the extension can see, in plain terms
          </h2>
          <p>
            Your browser warns you that this extension can read the sites you
            visit, and it is right to. Here is what that actually means.
          </p>
        </div>
        <div className="benefit-grid">
          <article className="benefit-card">
            <span className="benefit-icon">
              <ShieldCheck size={23} />
            </span>
            <h3>Nothing is transmitted</h3>
            <p>
              There is no network request anywhere in the extension, no analytics,
              and no telemetry. Check it yourself on the Network tab of developer
              tools while capturing.
            </p>
          </article>
          <article className="benefit-card">
            <span className="benefit-icon">
              <MousePointerClick size={23} />
            </span>
            <h3>Only when you ask</h3>
            <p>
              Nothing happens until you click the icon or press the shortcut. The
              extension does not watch pages in the background, and refuses to run
              on browser settings pages.
            </p>
          </article>
          <article className="benefit-card">
            <span className="benefit-icon">
              <Sparkles size={23} />
            </span>
            <h3>Cleared automatically</h3>
            <p>
              A capture is held in your browser's local storage so the editor can
              open it, then deleted about six hours later. Exports you save are
              ordinary files you control.
            </p>
          </article>
        </div>
        <p className="privacy-summary-link">
          <Link href="/privacy#permissions">
            Read the permission-by-permission explanation{" "}
            <ArrowRight size={15} />
          </Link>
        </p>
      </section>

      <section
        id="faq"
        className="capture-faq-section"
        aria-labelledby="capture-faq-title"
      >
        <div className="capture-faq-intro">
          <span className="eyebrow">Frequently asked</span>
          <h2 id="capture-faq-title">Common questions</h2>
          <p>
            The short answers are below. The{" "}
            <Link href="/faq">full FAQ</Link> covers troubleshooting, limits, and
            data handling.
          </p>
        </div>
        <div className="capture-faq-list">
          {faqPreview.map((faq, index) => (
            <details key={faq.question} open={index === 0}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section
        id="download"
        className="download-section"
        aria-labelledby="download-title"
      >
        <div>
          <Sparkles size={31} />
          <h2 id="download-title">Get {siteConfig.productName}</h2>
          <p>
            Free to use, with no account and no subscription. Version{" "}
            {siteConfig.extensionVersion}.
          </p>

          {published ? (
            <div className="download-buttons">
              {chromeStore && (
                <a href={chromeStore} target="_blank" rel="noreferrer noopener">
                  <Chrome size={18} /> Add to Chrome
                </a>
              )}
              {edgeStore && (
                <a href={edgeStore} target="_blank" rel="noreferrer noopener">
                  <MonitorCheck size={18} /> Add to Edge
                </a>
              )}
            </div>
          ) : (
            <div className="download-buttons">
              <Link href="/faq">
                See how it works <ArrowRight size={16} />
              </Link>
            </div>
          )}

          <p className="download-legal">
            Your use is covered by our <Link href="/terms">Terms</Link> and{" "}
            <Link href="/privacy">Privacy Policy</Link>. Need help?{" "}
            <Link href="/support">Contact support</Link>.
          </p>
        </div>
      </section>
    </SiteShell>
  );
}
