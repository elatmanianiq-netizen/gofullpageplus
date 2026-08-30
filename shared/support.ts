/**
 * Contract shared by the support form (client) and the ticket API (server).
 *
 * Both sides import from here so a category can never be added to the form
 * without the server accepting it, and so field limits are enforced twice:
 * once for fast feedback in the browser, once for real in the API.
 */

/** A support category, grouped for the `<optgroup>` in the form. */
export interface SupportCategory {
  /** Stable identifier stored on the ticket. Never rename these. */
  id: string;
  /** Group heading in the dropdown. */
  group: string;
  /** Option label. */
  label: string;
  /**
   * Self-help shown above the form when this category is selected. Resolves a
   * good share of tickets before they are ever submitted.
   */
  hint: string;
}

export const SUPPORT_CATEGORIES: readonly SupportCategory[] = [
  {
    id: "icon-missing",
    group: "Capturing",
    label: "I cannot see the extension icon",
    hint: "Chrome hides new extensions behind the puzzle-piece icon in the toolbar. Open it, find the extension, and click the pin so the icon stays visible. If it is missing from that list too, check chrome://extensions and confirm the extension is enabled.",
  },
  {
    id: "capture-wrong",
    group: "Capturing",
    label: "The capture does not look how I expected",
    hint: "For the cleanest result, close cookie banners and pop-ups, scroll the full length of the page once so lazy-loaded images are present, and let the page finish loading before you start the capture. Pages that scroll inside their own inner panel rather than the browser window cannot always be measured.",
  },
  {
    id: "shortcut",
    group: "Capturing",
    label: "The keyboard shortcut does not work",
    hint: "The default shortcut is Alt+Shift+P. Another extension or application may already own that combination. Open chrome://extensions/shortcuts to see the current assignment and set a different one.",
  },
  {
    id: "blocked-page",
    group: "Capturing",
    label: "Nothing happens on a particular page",
    hint: "Browsers forbid extensions from reading their own internal pages. Captures cannot run on chrome:// or edge:// URLs, the Chrome Web Store, or other extensions' pages. On a normal http:// or https:// page, reload the tab once after installing and try again.",
  },
  {
    id: "export",
    group: "Editing and export",
    label: "PNG, JPG, or PDF export problem",
    hint: "Exports are produced on your own machine, so a failure is usually a very large image running out of memory or the browser's download location being unwritable. Tell us the page height and the format you picked and we can reproduce it.",
  },
  {
    id: "editor",
    group: "Editing and export",
    label: "Problem with the editor, cropping, or annotations",
    hint: "The editor opens in a new tab straight after a capture and reads the image from local browser storage. Captures are cleared automatically after six hours, so an editor tab reopened the next day will no longer find its image.",
  },
  {
    id: "privacy",
    group: "Other",
    label: "Privacy or data protection question",
    hint: "Captures never leave your device: the extension makes no network requests, and images are held in local browser storage that is cleared after six hours. Our Privacy Policy explains each browser permission and why it is needed.",
  },
  {
    id: "feature-request",
    group: "Other",
    label: "Feature request",
    hint: "Tell us the outcome you want rather than the button you expect, and describe how often you hit the limitation. That context decides what gets built next.",
  },
  {
    id: "other",
    group: "Other",
    label: "Something else",
    hint: "Describe what you did, what you expected, and what happened instead. Any exact error text helps a great deal.",
  },
] as const;

export const SUPPORT_CATEGORY_IDS: readonly string[] = SUPPORT_CATEGORIES.map(
  (category) => category.id,
);

/** Ordered group names, for rendering `<optgroup>` elements. */
export const SUPPORT_CATEGORY_GROUPS: readonly string[] = Array.from(
  new Set(SUPPORT_CATEGORIES.map((category) => category.group)),
);

export function findSupportCategory(id: string): SupportCategory | undefined {
  return SUPPORT_CATEGORIES.find((category) => category.id === id);
}

/** Field limits, enforced in the browser and again in the API. */
export const SUPPORT_LIMITS = {
  subjectMax: 140,
  messageMin: 20,
  messageMax: 4000,
  emailMax: 254,
  nameMax: 80,
  versionMax: 20,
  browserMax: 200,
  sourcePageMax: 500,
} as const;

/** Triage state of a ticket in the admin inbox. */
export type TicketStatus = "new" | "open" | "resolved";

export const TICKET_STATUSES: readonly TicketStatus[] = [
  "new",
  "open",
  "resolved",
];

/** Exactly what the browser sends to `POST /api/support/tickets`. */
export interface SupportTicketInput {
  category: string;
  subject: string;
  message: string;
  email?: string;
  name?: string;
  extensionVersion?: string;
  browser?: string;
  sourcePage?: string;
  /** Anti-spam honeypot. Real users never see or fill this. */
  companyWebsite?: string;
}

/** A stored ticket, as returned to the admin inbox. */
export interface SupportTicket {
  id: string;
  /** Short human-readable code given to the user, e.g. `GFP-7QK2M4`. */
  reference: string;
  createdAt: string;
  updatedAt: string;
  status: TicketStatus;
  category: string;
  categoryLabel: string;
  subject: string;
  message: string;
  email: string;
  name: string;
  extensionVersion: string;
  browser: string;
  sourcePage: string;
  /**
   * Coarse network origin kept only for abuse rate limiting. The final octet of
   * an IPv4 address, and everything after the network prefix of an IPv6
   * address, is discarded before storage.
   */
  ipPrefix: string;
  adminNotes: string;
}
