"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type {
  EventRecordSummary,
  InvoiceSummary,
} from "@me-event/api-contracts";
import {
  clearStoredSession,
  EmployeeApiError,
  type EmployeeSession,
  issueFinanceInvoice,
  listEvents,
  listFinanceInvoices,
  readStoredSession,
} from "@/lib/employee-api";

export default function FinanceInvoicesPage() {
  const router = useRouter();
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [rows, setRows] = useState<readonly InvoiceSummary[]>([]);
  const [events, setEvents] = useState<readonly EventRecordSummary[]>([]);
  const [eventRecordId, setEventRecordId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: EmployeeSession) => {
      try {
        const [invoices, eventList] = await Promise.all([
          listFinanceInvoices(active),
          listEvents(active),
        ]);
        setRows(invoices.invoices);
        setEvents(eventList.events);
        if (eventRecordId === "" && eventList.events[0]) {
          setEventRecordId(eventList.events[0].id);
        }
      } catch (cause) {
        if (cause instanceof EmployeeApiError && cause.status === 401) {
          clearStoredSession();
          router.replace("/login");
          return;
        }
        setError(
          cause instanceof EmployeeApiError
            ? cause.message
            : "Could not load invoices.",
        );
      }
    },
    [router, eventRecordId],
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

  if (session === null) {
    return (
      <main className="leads-shell">
        <p className="leads-loading">{error ?? "Loading…"}</p>
      </main>
    );
  }

  return (
    <main className="leads-shell">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href={"/finance" as never}>Finance</Link> / Invoices
          </p>
          <h1>Invoices</h1>
        </div>
      </header>
      {error !== null ? <p className="leads-error">{error}</p> : null}
      <section className="quote-panel">
        <label className="quote-field">
          Event
          <select
            value={eventRecordId}
            onChange={(e) => setEventRecordId(e.target.value)}
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.eventNumber}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="claim-button"
          onClick={() =>
            void issueFinanceInvoice(session, {
              eventRecordId,
              amount: 50000,
            }).then(() => load(session))
          }
        >
          Issue invoice
        </button>
      </section>
      <section className="quote-panel">
        <ul className="leads-list">
          {rows.map((row) => (
            <li key={row.id}>
              {row.invoiceNumber} · {row.status} · ₹{row.amount}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
