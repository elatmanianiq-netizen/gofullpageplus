/**
 * Demo page — a short video walkthrough of how to use the extension, plus the
 * written steps for anyone who would rather read than watch.
 *
 * The video is embedded from YouTube. The iframe uses a privacy-friendly
 * youtube-nocookie host and a restrictive referrer policy so the page does not
 * quietly hand YouTube a tracking cookie before the visitor even presses play,
 * which keeps it consistent with the no-tracking promise made elsewhere.
 */
import { ArrowRight, PlayCircle } from "lucide-react";
import { Link } from "wouter";

import SiteShell from "@/components/SiteShell";
import { usePageMeta } from "@/hooks/usePageMeta";
import { resolved, siteConfig } from "@/site-config";

/** YouTube video id for the walkthrough. */
const VIDEO_ID = "sUFbfAfa9rE";

const steps = [
  {
    title: "Open the page you want to capture",
    text: "Go to any normal web page and let it finish loading. Scroll to the bottom once so images that only load when visible are present.",
  },
  {
    title: "Click the extension icon",
    text: `Click the ${siteConfig.productName} icon in your browser toolbar, or press Alt+Shift+P. The page scrolls by itself while each screen is captured.`,
  },
  {
    title: "Edit in the new tab",
    text: "When capturing finishes, the image opens in an editor tab. Crop it, add arrows or notes, and blur anything private.",
  },
  {
    title: "Export",
    text: "Save the result as PNG, JPG, or PDF. The file goes straight to your downloads — nothing is uploaded anywhere.",
  },
] as const;

export default function Demo() {
  usePageMeta({
    title: "Demo — How to Use",
    description: `Watch a short video walkthrough of ${siteConfig.productName} and follow the step-by-step guide to capture and export a full page screenshot.`,
    path: "/demo",
  });

  const chromeStore = resolved(siteConfig.chromeStoreUrl);

  return (
    <SiteShell>
      <article className="gfp-doc">
        <header className="gfp-doc-header">
          <span className="eyebrow">
            <PlayCircle size={14} /> Demo
          </span>
          <h1>How to use {siteConfig.productName}</h1>
          <p className="gfp-doc-lead">
            A quick video walkthrough, plus the written steps if you would rather
            read.
          </p>
        </header>

        <div className="demo-video">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}`}
            title={`${siteConfig.productName} video walkthrough`}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>

        <section aria-labelledby="steps-title">
          <h2 id="steps-title">Step by step</h2>
          <ol className="demo-steps">
            {steps.map((step, index) => (
              <li key={step.title}>
                <span className="demo-step-number">{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="gfp-doc-callout" aria-labelledby="demo-cta">
          <h2 id="demo-cta">Ready to try it?</h2>
          <p>
            It is free, with no account and no sign-up. Install it and capture your
            first full page in seconds.
          </p>
          <p>
            {chromeStore ? (
              <a
                href={chromeStore}
                className="coral-button"
                target="_blank"
                rel="noreferrer noopener"
              >
                Add to Chrome <ArrowRight size={16} />
              </a>
            ) : (
              <Link href="/#download" className="coral-button">
                Get {siteConfig.productName} <ArrowRight size={16} />
              </Link>
            )}
          </p>
          <p className="demo-faq-link">
            Run into trouble? See the <Link href="/faq">FAQ</Link> or{" "}
            <Link href="/support">contact support</Link>.
          </p>
        </section>
      </article>
    </SiteShell>
  );
}
