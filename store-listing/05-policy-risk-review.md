# Policy risk review

An honest assessment of what stands between this extension and an approval.
Ordered by how likely each item is to cause a rejection.

---

## 1. RESOLVED — the product name

**Name:** `Full Page Capture - Screen Capture & Editor`, marketed as
"Full Page Capture".

The name describes the function rather than borrowing from any other product,
does not imply affiliation with another extension, and is used consistently
across the site, metadata, and (when you ship it) the manifest. Keep it that
way: do not add another product's brand as a prefix or suffix, and do not copy
another extension's listing artwork or support-page layout. The support form at
`/support` uses this site's own design, wording, and categories.

The site pulls its branding from one file, so future name changes are a
one-place edit:

| Location | Field |
| --- | --- |
| `client/src/site-config.ts` | `productName`, `extensionName` |
| `extension/manifest.json` | `name`, `short_name`, `author` |
| `client/index.html` | `<title>`, meta description, JSON-LD `name` |
| `store-listing/01-listing-copy.md` | listing name and description |

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
