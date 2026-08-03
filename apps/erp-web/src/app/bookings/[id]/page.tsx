"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { BookingDetailResponse } from "@me-event/api-contracts";
import {
  clearStoredSession,
  EmployeeApiError,
  type EmployeeSession,
  getBooking,
  readStoredSession,
} from "@/lib/employee-api";

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const bookingId = params.id;
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [booking, setBooking] = useState<BookingDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: EmployeeSession) => {
      setError(null);
      try {
        const detail = await getBooking(active, bookingId);
        setBooking(detail);
      } catch (cause) {
        if (cause instanceof EmployeeApiError && cause.status === 401) {
          clearStoredSession();
          router.replace("/login");
          return;
        }
        setError(
          cause instanceof EmployeeApiError
            ? cause.message
            : "Could not load booking.",
        );
      }
    },
    [bookingId, router],
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

  if (session === null || booking === null) {
    return (
      <main className="leads-shell">
        <p className="leads-loading">{error ?? "Loading booking…"}</p>
      </main>
    );
  }

  return (
    <main className="leads-shell">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href="/quotes">Quotations</Link>{" "}
            <span aria-hidden="true">/</span> Booking
          </p>
          <h1>{booking.bookingNumber}</h1>
          <p className="leads-subtitle">
            Booking confirmed after approved quotation and advance payment.
          </p>
        </div>
        <div className="leads-session">
          {booking.eventRecordId !== undefined ? (
            <Link
              className="claim-button"
              href={`/events/${booking.eventRecordId}` as never}
            >
              Event record
            </Link>
          ) : null}
          <Link
            className="claim-button"
            href={`/quotes/${booking.quotationId}`}
          >
            Quotation
          </Link>
        </div>
      </header>

      <section className="quote-panel">
        <dl className="quote-meta">
          <div>
            <dt>Status</dt>
            <dd>
              <span className={`lead-status lead-status-${booking.status}`}>
                {booking.status}
              </span>
            </dd>
          </div>
          {booking.eventNumber !== undefined ? (
            <div>
              <dt>Event number</dt>
              <dd>{booking.eventNumber}</dd>
            </div>
          ) : null}
          <div>
            <dt>Final amount</dt>
            <dd>₹{Number(booking.finalAmount).toLocaleString("en-IN")}</dd>
          </div>
          <div>
            <dt>Advance paid</dt>
            <dd>₹{Number(booking.advancePaid).toLocaleString("en-IN")}</dd>
          </div>
          <div>
            <dt>Confirmed</dt>
            <dd>
              {booking.confirmedAt === undefined
                ? "—"
                : new Date(booking.confirmedAt).toLocaleString("en-IN")}
            </dd>
          </div>
        </dl>
      </section>

      <section className="quote-panel">
        <h2>Timeline</h2>
        <ul className="quote-timeline">
          {booking.activities.map((activity) => (
            <li key={activity.id}>
              <strong>{activity.activityType}</strong>
              <span>{activity.content ?? ""}</span>
              <small>
                {new Date(activity.occurredAt).toLocaleString("en-IN")}
              </small>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
