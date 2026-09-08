# Chrome Web Store submission package

Everything needed to fill in the Chrome Web Store developer dashboard for this
extension, written to be pasted field by field.

## Read this first

**[05-policy-risk-review.md](./05-policy-risk-review.md) — read before you
submit anything.** There is one blocking issue (the product name) that no amount
of good paperwork will get past a reviewer. Fix that first; the rest is routine.

## Files

| File | What it covers |
| --- | --- |
| [01-listing-copy.md](./01-listing-copy.md) | Store listing tab: name, summary, description, category |
| [02-privacy-practices.md](./02-privacy-practices.md) | Privacy practices tab: single purpose, permission justifications, remote code, data disclosures, certifications |
| [03-assets-checklist.md](./03-assets-checklist.md) | Icon, screenshots, promo tiles, and what each must show |
| [04-reviewer-test-notes.md](./04-reviewer-test-notes.md) | Steps a reviewer can follow to verify the extension works |
| [05-policy-risk-review.md](./05-policy-risk-review.md) | Honest assessment of what is likely to get this rejected |

## Order of operations

1. Resolve the naming issue in `05-policy-risk-review.md`.
2. Fill in every `TODO` in `client/src/site-config.ts` (business name, address,
   support email, deployed site URL).
3. Deploy this site so `https://yourdomain.com/privacy` returns a real page.
   Google will not accept a privacy policy URL that 404s, sits behind a login,
   or still contains placeholder text.
4. Create a developer account and pay the one-time registration fee, then verify
   your contact email in the dashboard. Publishing is blocked until the email is
   verified.
5. Upload the extension package, then complete the four dashboard tabs using
   files 01 to 03 in this folder.
6. Paste the reviewer notes from file 04 into the field for private notes to the
   reviewer.
7. Submit. First reviews commonly take a few days; broad host permissions push
   an item into deeper manual review, so expect longer rather than shorter.

## Facts a reviewer will check against your code

These come from the source in this repository, not from marketing copy. Keep
them accurate if the extension changes.

| Item | Value |
| --- | --- |
| Extension name | `Full Page Capture - Screen Capture & Editor` (`extension/manifest.json`) |
| Version | `1.1.0` |
| Manifest version | 3 |
| Permissions | `tabs`, `scripting`, `downloads` |
| Host permissions | `<all_urls>` |
| Content scripts | none declared; injection is dynamic via `chrome.scripting` |
| Remote code | none. jsPDF is bundled locally at `extension/libs/jspdf.umd.min.js` |
| Network requests | none. The only `fetch` is against a local `data:` URL while stitching |
| Storage | IndexedDB `fpc-store`, store `captures`; records pruned after 6 hours |
| Stored per capture | image blob, width, height, scale, page title, page URL |
| `chrome.storage` use | none |
| Analytics or telemetry | none |
| Account or login | none |
| Payment | none; no paid tier |

## Where the published pages live

Set these URLs in the dashboard once the site is deployed:

- Privacy policy: `https://yourdomain.com/privacy`
- Support / contact: `https://yourdomain.com/support`
- Homepage: `https://yourdomain.com/`

The support form on `/support` emails submissions to the site owner over SMTP.
Set `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` (and optionally `SMTP_PORT`,
`SMTP_FROM`, `SUPPORT_TO`) in the server environment. See `.env.example`.

## Sources

Chrome Web Store requirements referenced in these documents come from Google's
developer documentation, in particular
[Fill out the privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
and the
[Limited Use policy](https://developer.chrome.com/docs/webstore/program-policies/limited-use).
Dashboard field limits and asset dimensions change from time to time; the
dashboard itself is the authority, so confirm against it as you paste.
