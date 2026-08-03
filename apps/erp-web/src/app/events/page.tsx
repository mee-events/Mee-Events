"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { EventRecordSummary } from "@me-event/api-contracts";
import {
  clearStoredSession,
  EmployeeApiError,
  type EmployeeSession,
  listEvents,
  readStoredSession,
} from "@/lib/employee-api";

const statusLabels: Record<string, string> = {
  created: "Created",
  planning: "Planning",
  requirements_confirmed: "Requirements confirmed",
  quotation_approved: "Quotation approved",
  booking_confirmed: "Booking confirmed",
  manager_assigned: "Manager assigned",
  vendor_assigned: "Vendor assigned",
  worker_assigned: "Worker assigned",
  preparation: "Preparation",
  ready: "Ready",
  event_running: "Event running",
  completed: "Completed",
  settlement_pending: "Settlement pending",
  closed: "Closed",
  cancelled: "Cancelled",
};

export default function EventsPage() {
  const router = useRouter();
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [events, setEvents] = useState<readonly EventRecordSummary[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: EmployeeSession) => {
      setError(null);
      try {
        const response = await listEvents(active);
        setEvents(response.events);
      } catch (cause) {
        if (cause instanceof EmployeeApiError && cause.status === 401) {
          clearStoredSession();
          router.replace("/login");
          return;
        }
        setError(
          cause instanceof EmployeeApiError
            ? cause.message
            : "Could not load event records.",
        );
      }
    },
    [router],
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
        <p className="leads-loading">Checking your session…</p>
      </main>
    );
  }

  return (
    <main className="leads-shell">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href="/">Employee portal</Link>{" "}
            <span aria-hidden="true">/</span> Event records
          </p>
          <h1>Event operations</h1>
          <p className="leads-subtitle">
            Central Event Records created from confirmed bookings. This is the
            operations source of truth.
          </p>
        </div>
        <Link className="claim-button" href="/quotes">
          Quotations
        </Link>
      </header>

      {error !== null ? <p className="leads-error">{error}</p> : null}

      {events === null ? (
        <p className="leads-loading">Loading events…</p>
      ) : events.length === 0 ? (
        <section className="quote-panel">
          <p>
            No event records yet. Confirm an advance payment on an approved
            quotation to create the first Event Record.
          </p>
        </section>
      ) : (
        <section className="leads-table-wrap">
          <table className="leads-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Status</th>
                <th>Budget</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>
                    <strong>{event.eventNumber}</strong>
                    <div>{event.eventName}</div>
                    <small>{event.bookingNumber ?? event.bookingId}</small>
                  </td>
                  <td>{event.customerDisplayName ?? "Customer"}</td>
                  <td>{event.eventDate ?? "—"}</td>
                  <td>
                    <span className={`lead-status lead-status-${event.status}`}>
                      {statusLabels[event.status] ?? event.status}
                    </span>
                  </td>
                  <td>₹{Number(event.budgetAmount).toLocaleString("en-IN")}</td>
                  <td>
                    <Link
                      className="claim-button"
                      href={`/events/${event.id}` as never}
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
