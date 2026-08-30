/**
 * Terms of Service.
 *
 * Not strictly required by the Chrome Web Store, but reviewers and users both
 * expect a published set of terms alongside the privacy policy, and it is where
 * the "capture only what you are allowed to capture" expectation is set.
 */
import { Scale } from "lucide-react";
import { Link } from "wouter";

import SiteShell from "@/components/SiteShell";
import { siteConfig, supportMailto } from "@/site-config";

export default function Terms() {
  return (
    <SiteShell>
      <article className="gfp-doc">
        <header className="gfp-doc-header">
          <span className="eyebrow">
            <Scale size={14} /> Legal
          </span>
          <h1>Terms of Service</h1>
          <p className="gfp-doc-lead">
            The agreement between you and {siteConfig.legalEntity} covering{" "}
            {siteConfig.extensionName} and this website.
          </p>
          <p className="gfp-doc-meta">Last updated: {siteConfig.lastUpdated}</p>
        </header>

        <section aria-labelledby="acceptance">
          <h2 id="acceptance">1. Agreement</h2>
          <p>
            These terms form an agreement between you and{" "}
            {siteConfig.legalEntity} ("we", "us"). By installing or using{" "}
            {siteConfig.extensionName} (the "extension") or by using this website,
            you accept them. If you do not accept them, please uninstall the
            extension and stop using the site.
          </p>
        </section>

        <section aria-labelledby="what">
          <h2 id="what">2. What the extension does</h2>
          <p>
            The extension captures a full-length image of a web page you are viewing,
            lets you crop and annotate it, and exports it as a PNG, JPG, or PDF file.
            All processing happens in your browser on your own device, as described
            in our <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </section>

        <section aria-labelledby="licence">
          <h2 id="licence">3. Your licence to use it</h2>
          <p>
            We grant you a personal, non-exclusive, revocable licence to install and
            use the extension for its intended purpose, whether personally or at
            work. You may not:
          </p>
          <ul>
            <li>
              redistribute, resell, sublicense, or republish the extension or a
              modified version of it as your own product;
            </li>
            <li>
              remove or obscure any notice of ownership contained in the extension;
            </li>
            <li>
              use the extension to break the law, to infringe anyone's rights, or to
              circumvent a technical restriction on a website;
            </li>
            <li>
              attempt to interfere with the extension's operation for other users, or
              use it to attack, overload, or probe any system.
            </li>
          </ul>
          <p>
            We keep all intellectual property rights in the extension, this website,
            and their content. Your captures are yours; we claim no rights over them
            and never receive them.
          </p>
        </section>

        <section aria-labelledby="responsible">
          <h2 id="responsible">4. What you are responsible for</h2>
          <p>
            You decide what to capture, and you are responsible for that choice. A
            screenshot can contain other people's personal information, an employer's
            confidential material, or content protected by copyright. Before you
            capture, share, or publish an image, make sure you are entitled to do so
            under the law that applies to you, the terms of the website concerned,
            and any policy your employer has. Where a page shows other people's
            personal data, redacting it with the editor before sharing is a sensible
            precaution.
          </p>
          <p>
            You are also responsible for keeping files you export safe once they are
            saved to your device. We have no access to them and cannot recover them.
          </p>
        </section>

        <section aria-labelledby="availability">
          <h2 id="availability">5. Availability and changes</h2>
          <p>
            We may update, change, or discontinue the extension or any of its
            features, and we may update these terms. When a change is significant we
            will update the date at the top of this page. Because the extension is
            distributed through browser extension stores, updates reach you through
            those stores under their own terms, and the store operator, not us,
            controls that distribution.
          </p>
          <p>
            Browsers change too. A future browser release may alter or restrict what
            an extension is permitted to do, which can affect features here. We
            cannot guarantee indefinite compatibility.
          </p>
        </section>

        <section aria-labelledby="third-party">
          <h2 id="third-party">6. Websites you capture</h2>
          <p>
            The extension works on third-party websites that we do not control and are
            not responsible for. Capturing a site does not imply any relationship
            between us and that site, nor any endorsement in either direction.
          </p>
        </section>

        <section aria-labelledby="warranty">
          <h2 id="warranty">7. No warranty</h2>
          <p>
            The extension is provided "as is" and "as available", without warranty of
            any kind, whether express or implied, including any implied warranty of
            merchantability, fitness for a particular purpose, or non-infringement.
            We do not warrant that every page will capture perfectly: pages that load
            content as you scroll, that scroll inside an inner panel, that embed
            other documents, or that restrict what extensions may read can produce an
            incomplete image. Do not rely on the extension as the sole record of
            something you cannot afford to lose or misread.
          </p>
        </section>

        <section aria-labelledby="liability">
          <h2 id="liability">8. Limitation of liability</h2>
          <p>
            To the fullest extent the law allows, we are not liable for indirect,
            incidental, special, consequential, or punitive damages, nor for lost
            profits, lost data, or business interruption, arising out of your use of
            the extension or this website. Where liability cannot be excluded, our
            total liability is limited to the greater of the amount you paid us in the
            twelve months before the claim, or ten euros.
          </p>
          <p>
            Nothing in these terms excludes or limits liability that cannot lawfully
            be excluded, including liability for death or personal injury caused by
            negligence, or for fraud. If you are a consumer, you keep all mandatory
            rights given to you by the law of your country of residence, and nothing
            here overrides them.
          </p>
        </section>

        <section aria-labelledby="termination">
          <h2 id="termination">9. Ending the agreement</h2>
          <p>
            You may end this agreement at any time by uninstalling the extension. We
            may suspend or end your licence if you breach these terms. Sections 7, 8,
            and 10 survive termination.
          </p>
        </section>

        <section aria-labelledby="law">
          <h2 id="law">10. Governing law</h2>
          <p>
            These terms are governed by the law of {siteConfig.governingLaw}, and its
            courts have non-exclusive jurisdiction over any dispute. If you are a
            consumer resident elsewhere, you may also bring proceedings in your own
            country where the law gives you that right.
          </p>
        </section>

        <section aria-labelledby="contact">
          <h2 id="contact">11. Contact</h2>
          <p>
            Questions about these terms? Write to{" "}
            {supportMailto ? (
              <a href={supportMailto}>{siteConfig.supportEmail}</a>
            ) : (
              siteConfig.supportEmail
            )}{" "}
            or use the <Link href="/support">support page</Link>.
          </p>
          <p>
            {siteConfig.legalEntity}
            <br />
            {siteConfig.postalAddress}
          </p>
        </section>
      </article>
    </SiteShell>
  );
}
