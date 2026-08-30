/**
 * Support inbox — the "admin side" that form submissions land in.
 *
 * Access model: a single shared bearer token, set as ADMIN_TOKEN in the server
 * environment and typed in here. It is held in sessionStorage, so it is gone
 * when the tab closes and is never written to disk.
 *
 * That is a deliberate trade-off, and its limits should be understood:
 *   • one shared secret for everyone, with no individual accounts
 *   • no audit trail of who read or changed a ticket
 *   • anyone with the token has full access to every message
 * It is proportionate for a one-person extension inbox. If more than a couple
 * of people need access, or you begin handling sensitive reports, replace this
 * with real per-user accounts.
 *
 * The page is excluded from search engines by robots.txt and by the noindex tag
 * applied below.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Inbox,
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  RefreshCw,
  Search,
} from "lucide-react";

import { siteConfig } from "@/site-config";
import { TICKET_STATUSES, type SupportTicket, type TicketStatus } from "@shared/support";

const TOKEN_STORAGE_KEY = "gfp-admin-token";

type StatusFilter = TicketStatus | "all";

function readToken(): string {
  try {
    return window.sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Admin() {
  const [token, setToken] = useState<string>(readToken);
  const [tokenDraft, setTokenDraft] = useState("");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Belt and braces alongside robots.txt: a support inbox must never be indexed.
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    const previousTitle = document.title;
    document.title = `Support inbox — ${siteConfig.productName}`;
    return () => {
      meta.remove();
      document.title = previousTitle;
    };
  }, []);

  const signOut = useCallback(() => {
    try {
      window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // Nothing to clean up if storage is unavailable.
    }
    setToken("");
    setTickets([]);
    setSelectedId("");
  }, []);

  const loadTickets = useCallback(
    async (authToken: string) => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/admin/tickets", {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          tickets?: SupportTicket[];
          error?: string;
        };

        if (response.status === 401) {
          setError(payload.error ?? "That token was not accepted.");
          signOut();
          return;
        }
        if (!response.ok || !payload.ok) {
          setError(payload.error ?? "Could not load tickets.");
          return;
        }

        setTickets(payload.tickets ?? []);
      } catch {
        setError("Could not reach the support API. Is the server running?");
      } finally {
        setLoading(false);
      }
    },
    [signOut],
  );

  useEffect(() => {
    if (token) void loadTickets(token);
  }, [token, loadTickets]);

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const candidate = tokenDraft.trim();
    if (!candidate) return;

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/tickets", {
        headers: { Authorization: `Bearer ${candidate}` },
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        tickets?: SupportTicket[];
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "That token was not accepted.");
        return;
      }

      try {
        window.sessionStorage.setItem(TOKEN_STORAGE_KEY, candidate);
      } catch {
        // Access still works for this render even if storage is blocked.
      }
      setToken(candidate);
      setTokenDraft("");
      setTickets(payload.tickets ?? []);
    } catch {
      setError("Could not reach the support API. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  const patchTicket = async (id: string, body: Record<string, unknown>) => {
    const response = await fetch(`/api/admin/tickets/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      ticket?: SupportTicket;
      error?: string;
    };

    if (!response.ok || !payload.ok || !payload.ticket) {
      setError(payload.error ?? "Update failed.");
      return;
    }

    setTickets((current) =>
      current.map((ticket) => (ticket.id === id ? payload.ticket! : ticket)),
    );
    setError("");
  };

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (filter !== "all" && ticket.status !== filter) return false;
      if (!needle) return true;
      return [
        ticket.reference,
        ticket.subject,
        ticket.message,
        ticket.email,
        ticket.name,
        ticket.categoryLabel,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [tickets, filter, query]);

  const selected = tickets.find((ticket) => ticket.id === selectedId);
  const counts = useMemo(() => {
    return {
      all: tickets.length,
      new: tickets.filter((ticket) => ticket.status === "new").length,
      open: tickets.filter((ticket) => ticket.status === "open").length,
      resolved: tickets.filter((ticket) => ticket.status === "resolved").length,
    };
  }, [tickets]);

  // ── Sign-in ───────────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="gfp-app">
        <div className="admin-gate">
          <form className="admin-gate-card" onSubmit={handleSignIn}>
            <span className="admin-gate-icon">
              <KeyRound size={22} />
            </span>
            <h1>Support inbox</h1>
            <p>
              Enter the admin token to read messages sent through the support form.
            </p>

            {error && (
              <p className="admin-error" role="alert">
                <AlertCircle size={15} /> {error}
              </p>
            )}

            <label htmlFor="admin-token">Admin token</label>
            <input
              id="admin-token"
              type="password"
              autoComplete="current-password"
              value={tokenDraft}
              onChange={(event) => setTokenDraft(event.target.value)}
              required
            />
            <button type="submit" className="coral-button" disabled={loading}>
              {loading ? "Checking…" : "Open inbox"}
            </button>
            <p className="admin-gate-note">
              The token is the <code>ADMIN_TOKEN</code> value set in the server
              environment. It is kept for this browser tab only and is cleared when
              you close it.
            </p>
          </form>
        </div>
      </div>
    );
  }

  // ── Inbox ─────────────────────────────────────────────────────────────────
  return (
    <div className="gfp-app">
      <div className="admin-shell">
        <header className="admin-header">
          <div>
            <h1>
              <Inbox size={19} /> Support inbox
            </h1>
            <p>
              {counts.all} message{counts.all === 1 ? "" : "s"} · {counts.new} new ·{" "}
              {counts.open} open · {counts.resolved} resolved
            </p>
          </div>
          <div className="admin-header-actions">
            <button
              type="button"
              className="admin-button"
              onClick={() => void loadTickets(token)}
              disabled={loading}
            >
              {loading ? <Loader2 size={15} className="admin-spin" /> : <RefreshCw size={15} />}
              Refresh
            </button>
            <button type="button" className="admin-button" onClick={signOut}>
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </header>

        {error && (
          <p className="admin-error admin-error-bar" role="alert">
            <AlertCircle size={15} /> {error}
          </p>
        )}

        <div className="admin-toolbar">
          <div className="admin-filters" role="group" aria-label="Filter by status">
            {(["all", ...TICKET_STATUSES] as StatusFilter[]).map((status) => (
              <button
                type="button"
                key={status}
                className={filter === status ? "admin-chip admin-chip-on" : "admin-chip"}
                onClick={() => setFilter(status)}
                aria-pressed={filter === status}
              >
                {status} ({counts[status]})
              </button>
            ))}
          </div>
          <div className="admin-search">
            <Search size={15} />
            <label className="admin-visually-hidden" htmlFor="admin-search">
              Search messages
            </label>
            <input
              id="admin-search"
              type="search"
              placeholder="Search reference, subject, email…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="admin-body">
          <ul className="admin-list">
            {visible.length === 0 && !loading && (
              <li className="admin-empty">
                {tickets.length === 0
                  ? "No messages yet. Submissions from the support form appear here."
                  : "No messages match this filter."}
              </li>
            )}
            {visible.map((ticket) => (
              <li key={ticket.id}>
                <button
                  type="button"
                  className={
                    ticket.id === selectedId
                      ? "admin-list-item admin-list-item-on"
                      : "admin-list-item"
                  }
                  onClick={() => {
                    setSelectedId(ticket.id);
                    setNotesDraft(ticket.adminNotes);
                    if (ticket.status === "new") void patchTicket(ticket.id, { status: "open" });
                  }}
                >
                  <span className="admin-list-top">
                    <strong>{ticket.subject}</strong>
                    <span className={`admin-status admin-status-${ticket.status}`}>
                      {ticket.status}
                    </span>
                  </span>
                  <span className="admin-list-meta">
                    {ticket.reference} · {ticket.categoryLabel}
                  </span>
                  <span className="admin-list-meta">
                    {formatDate(ticket.createdAt)}
                    {ticket.email ? ` · ${ticket.email}` : " · no reply address"}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <section className="admin-detail" aria-live="polite">
            {!selected ? (
              <p className="admin-detail-empty">
                Select a message to read it.
              </p>
            ) : (
              <>
                <h2>{selected.subject}</h2>
                <dl className="admin-meta-grid">
                  <div>
                    <dt>Reference</dt>
                    <dd>{selected.reference}</dd>
                  </div>
                  <div>
                    <dt>Received</dt>
                    <dd>{formatDate(selected.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Category</dt>
                    <dd>{selected.categoryLabel}</dd>
                  </div>
                  <div>
                    <dt>From</dt>
                    <dd>
                      {selected.name || "Anonymous"}
                      {selected.email ? ` · ${selected.email}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Extension</dt>
                    <dd>{selected.extensionVersion || "not given"}</dd>
                  </div>
                  <div>
                    <dt>Browser</dt>
                    <dd>{selected.browser || "not given"}</dd>
                  </div>
                  <div>
                    <dt>Submitted from</dt>
                    <dd className="admin-break">{selected.sourcePage || "not given"}</dd>
                  </div>
                  <div>
                    <dt>Network</dt>
                    <dd>{selected.ipPrefix}</dd>
                  </div>
                </dl>

                <h3>Message</h3>
                <p className="admin-message">{selected.message}</p>

                <div className="admin-actions">
                  {TICKET_STATUSES.map((status) => (
                    <button
                      type="button"
                      key={status}
                      className={
                        selected.status === status
                          ? "admin-chip admin-chip-on"
                          : "admin-chip"
                      }
                      onClick={() => void patchTicket(selected.id, { status })}
                    >
                      Mark {status}
                    </button>
                  ))}
                  {selected.email && (
                    <a
                      className="admin-button"
                      href={`mailto:${selected.email}?subject=${encodeURIComponent(
                        `Re: ${selected.subject} [${selected.reference}]`,
                      )}`}
                    >
                      <Mail size={15} /> Reply by email
                    </a>
                  )}
                </div>

                <h3>Internal notes</h3>
                <textarea
                  className="admin-notes"
                  rows={4}
                  value={notesDraft}
                  onChange={(event) => setNotesDraft(event.target.value)}
                  placeholder="Only visible here. Never sent to the user."
                />
                <button
                  type="button"
                  className="admin-button"
                  disabled={savingNotes || notesDraft === selected.adminNotes}
                  onClick={async () => {
                    setSavingNotes(true);
                    await patchTicket(selected.id, { adminNotes: notesDraft });
                    setSavingNotes(false);
                  }}
                >
                  {savingNotes ? "Saving…" : "Save notes"}
                </button>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
