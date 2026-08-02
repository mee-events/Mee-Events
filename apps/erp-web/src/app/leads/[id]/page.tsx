"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { LeadSummary, QuotationSummary } from "@me-event/api-contracts";
import {
  clearStoredSession,
  createQuotation,
  EmployeeApiError,
  type EmployeeSession,
  getLead,
  listQuotations,
  readStoredSession,
  saveLeadRequirements,
} from "@/lib/employee-api";

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const leadId = params.id;
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [lead, setLead] = useState<LeadSummary | null>(null);
  const [quotes, setQuotes] = useState<readonly QuotationSummary[]>([]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"contacted" | "qualified">("contacted");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (active: EmployeeSession) => {
      setError(null);
      try {
        const [leadResponse, quoteResponse] = await Promise.all([
          getLead(active, leadId),
          listQuotations(active),
        ]);
        setLead(leadResponse);
        setQuotes(quoteResponse.quotations.filter((q) => q.leadId === leadId));
      } catch (cause) {
        if (cause instanceof EmployeeApiError && cause.status === 401) {
          clearStoredSession();
          router.replace("/login");
          return;
        }
        setError(
          cause instanceof EmployeeApiError
            ? cause.message
            : "Could not load lead.",
        );
      }
    },
    [leadId, router],
  );

  useEffect(() => {
    const stored = readStoredSession();
    if (stored === null) {
      router.replace("/login");
      return;
    }
    setSession(stored);
    void load(stored);
  }, [router, load]);

  async function handleRequirements() {
    if (session === null || notes.trim().length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await saveLeadRequirements(session, leadId, {
        notes: notes.trim(),
        status,
      });
      setLead(updated);
      setNotes("");
    } catch (cause) {
      setError(
        cause instanceof EmployeeApiError
          ? cause.message
          : "Could not save requirements.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateQuote() {
    if (session === null) return;
    setBusy(true);
    setError(null);
    try {
      const quote = await createQuotation(session, {
        leadId,
        items: [
          {
            itemType: "package",
            title: "Event package",
            quantity: 1,
            unitPrice: 25000,
            description: "Starter package — edit before sending",
          },
        ],
        gstPercent: 18,
        discountAmount: 0,
        discountPercent: 0,
        advancePercent: 30,
        terms: "Advance payment confirms booking. Balance due 7 days before event.",
        customerNotes: "Thank you for choosing Mee Events Hyderabad.",
      });
      router.push(`/quotes/${quote.id}`);
    } catch (cause) {
      setError(
        cause instanceof EmployeeApiError
          ? cause.message
          : "Could not create quotation.",
      );
      setBusy(false);
    }
  }

  if (session === null || lead === null) {
    return (
      <main className="leads-shell">
        <p className="leads-loading">
          {error ?? "Loading lead…"}
        </p>
      </main>
    );
  }

  const existingQuote = quotes[0];

  return (
    <main className="leads-shell">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href="/leads">Leads</Link> <span aria-hidden="true">/</span>{" "}
            {lead.enquiryReferenceCode ?? lead.id.slice(0, 8)}
          </p>
          <h1>Lead detail</h1>
          <p className="leads-subtitle">
            Capture requirements, then create and send a quotation.
          </p>
        </div>
      </header>

      {error !== null ? (
        <div className="leads-error" role="alert">
          {error}
        </div>
      ) : null}

      <section className="quote-panel">
        <h2>Summary</h2>
        <dl className="quote-meta">
          <div>
            <dt>Customer</dt>
            <dd>
              {lead.customerName ?? "Customer"} · {lead.customerMobile}
            </dd>
          </div>
          <div>
            <dt>Event</dt>
            <dd>
              {lead.eventTypeName ?? "—"} · {lead.eventDate ?? "TBD"}
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <span className={`lead-status lead-status-${lead.status}`}>
                {lead.status}
              </span>
            </dd>
          </div>
        </dl>
      </section>

      <section className="quote-panel">
        <h2>Requirements discussion</h2>
        <label className="quote-field">
          Status
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as "contacted" | "qualified")
            }
          >
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
          </select>
        </label>
        <label className="quote-field">
          Notes
          <textarea
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Capture guest count, venue preferences, budget…"
          />
        </label>
        <button
          className="claim-button"
          disabled={busy || notes.trim().length === 0}
          onClick={() => void handleRequirements()}
          type="button"
        >
          Save requirements
        </button>
      </section>

      <section className="quote-panel">
        <h2>Quotation</h2>
        {existingQuote !== undefined ? (
          <p>
            Existing quote{" "}
            <Link href={`/quotes/${existingQuote.id}`}>
              {existingQuote.referenceCode}
            </Link>{" "}
            · {existingQuote.status}
          </p>
        ) : (
          <button
            className="claim-button"
            disabled={busy}
            onClick={() => void handleCreateQuote()}
            type="button"
          >
            Create draft quotation
          </button>
        )}
      </section>
    </main>
  );
}
