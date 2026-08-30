# Policy risk review

An honest assessment of what stands between this extension and an approval.
Ordered by how likely each item is to cause a rejection.

---

## 1. BLOCKING — the product name

**Current name:** `GoFullPage Plus Capture`, marketed as "GoFullPage Plus".

**Why this fails.** `GoFullPage` is an established, separately owned Chrome
extension for full-page screenshots with a very large user base. Naming a
competing product `GoFullPage Plus` reads as an official companion or upgrade to
that product. The Chrome Web Store prohibits listings that impersonate another
product or mislead users about who publishes them, and reviewers reject
lookalike naming of well-known extensions routinely. Adding a word like "Plus"
to someone else's brand makes the problem worse, not better, because it implies
an affiliation.

**Why the timing makes it worse.** As reported by
[Android Authority on 14 August 2026](https://www.androidauthority.com/chrome-gofullpage-extension-unsafe-3698292/),
GoFullPage was pulled from the Chrome Web Store that week and Chromium browsers
began warning users that it violated store policy. Its developer said the
takedown related to a copyright dispute rather than any security compromise, and
that they were working with Google to restore the listing.
*Content rephrased from the source for licensing compliance.*

That means a reviewer looking at your submission right now is seeing a new
extension using the name of a product just removed over an intellectual property
complaint, offering the same functionality, published by a different developer.
The most favourable reading available to them is "trying to capture the displaced
users of a suspended brand". Expect rejection, and be aware that the trademark
owner could file a complaint against your listing independently of Google.

**What to do.** Choose a name that is yours. It should not contain
"GoFullPage", and should not be a near-miss of another screenshot extension's
name. Describe the function, not a competitor:

- Fullpage Snap
- ScrollShot
- PageArchive Capture
- Longshot Capture
- Tallgrab

Once you pick one, these are the places to change it. The site pulls almost
everything from one file:

| Location | Field |
| --- | --- |
| `client/src/site-config.ts` | `productName`, `extensionName` |
| `extension/manifest.json` | `name`, `short_name`, `author` |
| `client/index.html` | `<title>`, meta description, JSON-LD `name` |
| `client/public/logo.png` and `extension/icons/*` | artwork, if it echoes the old brand |
| `store-listing/01-listing-copy.md` | listing name and description |

Also remove anything that imitates the other product's presentation. The support
form design you supplied as a reference is GoFullPage's own support page; the
form built at `/support` deliberately uses this site's own layout, wording, and
categories rather than copying theirs. Keep it that way.

**Do not skip this one.** Everything else in this folder is paperwork you can
iterate on after a rejection. A name-based rejection can escalate to an
enforcement action against your developer account, which is much harder to undo.

---

## 2. FIXED — fabricated endorsements and reviews

**What was there.** The landing page carried a "Featured Across" strip naming
TechRadar, PC Mag, Business Insider, Fast Company, and Gizmodo, plus eight
five-star testimonials with invented names and dates from 2019 to 2026, and a
"Highly Rated Screen Capture" badge — for an extension at version 1.1.0 with no
published reviews.

**Why it mattered.** Fabricated press coverage, testimonials, and ratings breach
the store's policies on misleading content and misrepresentation. Reviewers open
the website linked from a listing. Invented press logos are also a false
advertising exposure independent of Google, and using publishers' names implies
an endorsement they never gave.

**Status.** Removed from `client/src/pages/Home.tsx`, and a comment at the top of
that file explains why so it does not come back. If you want social proof, wait
for genuine store reviews and quote those with attribution.

---

## 3. FIXED — listing copy that contradicted the manifest

**What was there.** A benefit card reading "Runs entirely locally in your
browser. **No extra permissions needed.**" while `manifest.json` requests
`<all_urls>` plus `tabs`, `scripting`, and `downloads`.

**Why it mattered.** Reviewers compare listing claims against the manifest, and a
privacy claim contradicted by the permission list undermines every other claim
you make. It also erodes user trust the first time Chrome shows the "read your
data on all websites" warning.

**Status.** Rewritten. The site now explains the permissions plainly on the home
page and permission by permission at `/privacy#permissions`.

---

## 4. NEEDS A DECISION — `<all_urls>` versus `activeTab`

**Current state.** `manifest.json` declares `host_permissions: ["<all_urls>"]`
and `permissions: ["tabs", "scripting", "downloads"]`. This produces the
strongest install-time warning Chrome shows, guarantees deeper manual review, and
is the most common cause of long review times and permission-related rejections
for screenshot extensions.

**Why it might not be necessary.** Both ways a capture starts are user gestures:
clicking the toolbar icon, and running the `capture-full-page` keyboard command.
`activeTab` grants exactly the host access this extension needs, for the tab in
question, when triggered by a gesture of that kind. On paper the pipeline in
`extension/background.js` — `chrome.tabs.captureVisibleTab`, then
`chrome.scripting.executeScript` into the same tab — is compatible with it.

**Why I have not changed it.** Switching permissions is a behavioural change to
your extension, not a copy edit, and it needs testing rather than reasoning:

- `beginCapture(explicitTabId)` accepts an explicit tab id, and the e2e harness
  in `tools/e2e/` uses it. Under `activeTab` a non-gesture path to an arbitrary
  tab will fail.
- Reading `tab.url` for the capturability check behaves differently without the
  broad host grant.
- Re-injection after the popup closes needs verifying against a live grant.

**Recommendation.** Try `permissions: ["activeTab", "scripting", "downloads"]`
with `host_permissions` removed, on a scratch branch, and run a real capture from
both the toolbar icon and the keyboard shortcut on a long page. If both work, ship
that: it removes the scariest install warning, shortens review, and is a genuine
privacy improvement rather than a claim about one. If either breaks, keep
`<all_urls>` and submit the justification in
[02-privacy-practices.md](./02-privacy-practices.md), which is written to make the
case honestly.

Say the word and I will make that change and test it.

---

## 5. WORTH DOING — dev scaffolding still in the repository

Not a policy problem, since none of it ships inside the extension package, but
worth cleaning before you point a reviewer at the site:

- `client/public/__manus__/debug-collector.js` is a development log collector
  that gets copied into the production build. It is only injected in dev, but the
  file is publicly served. Delete the folder if you are not using it.
- `.manus-logs/` holds captured browser console output. Not needed in the repo.
- The storage proxy and debug plugins in `vite.config.ts` are dev-only Manus
  scaffolding and can go once you are off that platform.

## 6. WORTH DOING — verify before you claim

Two claims on the site are strong, valuable, and true today. They are also the
first things a sceptical reviewer or user will test, so re-verify them after any
change to the extension:

- **No network requests.** Open developer tools on the Network tab, run a
  capture, confirm nothing outbound. The only `fetch` in `background.js` targets
  a local `data:` URL.
- **Six-hour retention.** `MAX_AGE_MS` in `extension/shared/store.js` is what the
  privacy policy and FAQ promise users. If you change it, change both pages.
