/**
 * Shared chrome for every page: skip link, sticky header, footer, dark mode.
 *
 * Home used to carry its own copy of the header and footer with placeholder
 * hash links (#privacy, #terms, #contact). Those links are exactly what a
 * Chrome Web Store reviewer clicks, so they now live here once and point at
 * real routes.
 */
import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, ExternalLink, Menu, Moon, Sun, X } from "lucide-react";
import { Link, useLocation } from "wouter";

import {
  legalEntityDisplay,
  pendingConfigKeys,
  resolved,
  siteConfig,
} from "@/site-config";

const DARK_STORAGE_KEY = "gfp-theme";

function readStoredPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = window.localStorage.getItem(DARK_STORAGE_KEY);
    if (stored === "dark") return true;
    if (stored === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    // Private browsing modes can throw on localStorage access.
    return false;
  }
}

interface SiteShellProps {
  children: ReactNode;
  /**
   * Home renders its own hero straight under the header, so it opts out of the
   * default page padding that the content pages want.
   */
  variant?: "landing" | "page";
}

export default function SiteShell({ children, variant = "page" }: SiteShellProps) {
  const [dark, setDark] = useState(readStoredPreference);
  const [menuOpen, setMenuOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    try {
      window.localStorage.setItem(DARK_STORAGE_KEY, dark ? "dark" : "light");
    } catch {
      // Persisting the preference is a nicety, not a requirement.
    }
  }, [dark]);

  // wouter does not reset scroll between routes, so a visitor moving from the
  // footer to /privacy would otherwise land halfway down the policy.
  useEffect(() => {
    setMenuOpen(false);
    if (!window.location.hash) window.scrollTo(0, 0);
  }, [location]);

  const chromeStore = resolved(siteConfig.chromeStoreUrl);
  const edgeStore = resolved(siteConfig.edgeStoreUrl);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className={dark ? "gfp-app dark" : "gfp-app"}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="gfp-header">
        <nav className="gfp-nav" aria-label="Main navigation">
          <Link className="gfp-brand" href="/" aria-label={`${siteConfig.productName} home`}>
            <span className="gfp-brand-icon">
              <img
                src="/logo.png"
                alt=""
                aria-hidden="true"
                style={{ borderRadius: "6px" }}
              />
            </span>
            <span>{siteConfig.productName}</span>
          </Link>

          <div className="gfp-desktop-nav">
            <Link href="/faq">FAQ</Link>
            <Link href="/support">Contact support</Link>
            <Link href="/privacy">Privacy</Link>
          </div>

          <div className="gfp-nav-actions">
            <button
              type="button"
              className="gfp-icon-button"
              onClick={() => setDark((value) => !value)}
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {chromeStore ? (
              <a
                className="gfp-nav-cta"
                href={chromeStore}
                target="_blank"
                rel="noreferrer noopener"
              >
                Get {siteConfig.productName} <ExternalLink size={14} />
              </a>
            ) : (
              <a className="gfp-nav-cta" href="/#download">
                Get {siteConfig.productName} <ArrowRight size={15} />
              </a>
            )}

            <button
              type="button"
              className="gfp-menu-button"
              onClick={() => setMenuOpen((value) => !value)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </nav>

        {menuOpen && (
          <div className="gfp-mobile-nav">
            <Link href="/faq" onClick={closeMenu}>
              FAQ
            </Link>
            <Link href="/support" onClick={closeMenu}>
              Contact support
            </Link>
            <Link href="/privacy" onClick={closeMenu}>
              Privacy Policy
            </Link>
            <Link href="/terms" onClick={closeMenu}>
              Terms of Service
            </Link>
          </div>
        )}
      </header>

      <main id="main-content" className={variant === "page" ? "gfp-page" : undefined}>
        {children}
      </main>

      <footer className="gfp-footer">
        <div className="footer-top">
          <div>
            <Link className="gfp-brand" href="/">
              <span className="gfp-brand-icon">
                <img
                  src="/logo.png"
                  alt=""
                  aria-hidden="true"
                  style={{ borderRadius: "6px" }}
                />
              </span>
              <span>{siteConfig.productName}</span>
            </Link>
            <p className="footer-blurb">{siteConfig.tagline}</p>
            <p className="footer-version">
              Extension version {siteConfig.extensionVersion}
            </p>
          </div>

          <div className="footer-columns">
            <div>
              <h3>Product</h3>
              <a href="/#benefits">Features</a>
              <Link href="/faq">FAQ</Link>
              {chromeStore ? (
                <a href={chromeStore} target="_blank" rel="noreferrer noopener">
                  Chrome Web Store
                </a>
              ) : (
                <a href="/#download">Install</a>
              )}
              {edgeStore && (
                <a href={edgeStore} target="_blank" rel="noreferrer noopener">
                  Edge Add-ons
                </a>
              )}
            </div>

            <div>
              <h3>Support</h3>
              <Link href="/support">Contact support</Link>
              <Link href="/support">Report an issue</Link>
              <Link href="/faq">Troubleshooting</Link>
            </div>

            <div>
              <h3>Legal</h3>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms of Service</Link>
              <Link href="/privacy#permissions">Permissions explained</Link>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {legalEntityDisplay}
          </span>
          <a href="#main-content">
            Back to top <ArrowRight size={14} />
          </a>
        </div>
      </footer>
    </div>
  );
}
