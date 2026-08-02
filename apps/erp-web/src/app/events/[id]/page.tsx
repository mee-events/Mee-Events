"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type {
  EventRecordDetailResponse,
  EventRecordStatus,
} from "@me-event/api-contracts";
import {
  addEventNote,
  changeEventStatus,
  clearStoredSession,
  EmployeeApiError,
  type EmployeeSession,
  getEvent,
  readStoredSession,
  updateEvent,
} from "@/lib/employee-api";

const statusOptions: readonly EventRecordStatus[] = [
  "planning",
  "requirements_confirmed",
  "booking_confirmed",
  "manager_assigned",
  "vendor_assigned",
  "worker_assigned",
  "preparation",
  "ready",
  "event_running",
  "completed",
  "settlement_pending",
  "closed",
  "cancelled",
];

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventId = params.id;
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [event, setEvent] = useState<EventRecordDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [noteVisibility, setNoteVisibility] = useState<"internal" | "customer">(
    "internal",
  );
  const [nextStatus, setNextStatus] =
    useState<EventRecordStatus>("planning");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");

  const load = useCallback(
    async (active: EmployeeSession) => {
      setError(null);
      try {
        const detail = await getEvent(active, eventId);
        setEvent(detail);
        setNextStatus(detail.status);
        setVenueName(detail.venueName ?? "");
        setVenueAddress(detail.venueAddress ?? "");
      } catch (cause) {
        if (cause instanceof EmployeeApiError && cause.status === 401) {
          clearStoredSession();
          router.replace("/login");
          return;
        }
        setError(
          cause instanceof EmployeeApiError
            ? cause.message
            : "Could not load event record.",
        );
      }
    },
    [eventId, router],
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

  async function handleStatusChange() {
    if (session === null || event === null) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await changeEventStatus(session, event.id, {
        status: nextStatus,
      });
      setEvent(updated);
    } catch (cause) {
      setError(
        cause instanceof EmployeeApiError
          ? cause.message
          : "Could not change status.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleAddNote() {
    if (session === null || event === null || note.trim().length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await addEventNote(session, event.id, {
        content: note.trim(),
        visibility: noteVisibility,
      });
      setNote("");
      await load(session);
    } catch (cause) {
      setError(
        cause instanceof EmployeeApiError
          ? cause.message
          : "Could not add note.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveVenue() {
    if (session === null || event === null) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await updateEvent(session, event.id, {
        venueName: venueName.trim() || null,
        venueAddress: venueAddress.trim() || null,
        mapsLocationPlaceholder: venueAddress.trim()
          ? `maps://placeholder?q=${encodeURIComponent(venueAddress.trim())}`
          : null,
      });
      setEvent(updated);
    } catch (cause) {
      setError(
        cause instanceof EmployeeApiError
          ? cause.message
          : "Could not update venue.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (session === null || event === null) {
    return (
      <main className="leads-shell">
        <p className="leads-loading">{error ?? "Loading event record…"}</p>
      </main>
    );
  }

  const pending = Number(event.pendingAmount);

  return (
    <main className="leads-shell">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href={"/events" as never}>Event records</Link>{" "}
            <span aria-hidden="true">/</span> {event.eventNumber}
          </p>
          <h1>{event.eventName}</h1>
          <p className="leads-subtitle">
            Operations dashboard for booking {event.bookingNumber ?? "—"}.
            Future vendor, worker, and inventory modules attach here.
          </p>
        </div>
        <div className="leads-session">
          <Link className="claim-button" href={`/bookings/${event.bookingId}`}>
            Booking
          </Link>
          <Link className="claim-button" href={`/quotes/${event.quotationId}`}>
            Quotation
          </Link>
        </div>
      </header>

      {error !== null ? <p className="leads-error">{error}</p> : null}

      <section className="quote-panel">
        <h2>Event summary</h2>
        <dl className="quote-meta">
          <div>
            <dt>Event number</dt>
            <dd>{event.eventNumber}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <span className={`lead-status lead-status-${event.status}`}>
                {event.status.replaceAll("_", " ")}
              </span>
            </dd>
          </div>
          <div>
            <dt>Priority</dt>
            <dd>{event.priority}</dd>
          </div>
          <div>
            <dt>Event date</dt>
            <dd>{event.eventDate ?? "—"}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{event.eventTypeName}</dd>
          </div>
          <div>
            <dt>Guests</dt>
            <dd>{event.guestCount ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="quote-panel">
        <h2>Customer</h2>
        <dl className="quote-meta">
          <div>
            <dt>Name</dt>
            <dd>{event.customerDisplayName ?? "Customer"}</dd>
          </div>
          <div>
            <dt>Customer id</dt>
            <dd>{event.customerId}</dd>
          </div>
          <div>
            <dt>Assigned manager</dt>
            <dd>{event.assignedManagerUserId ?? "Not assigned (future)"}</dd>
          </div>
        </dl>
      </section>

      <section className="quote-panel">
        <h2>Venue</h2>
        <div className="quote-grid">
          <label className="quote-field">
            Venue name
            <input
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="Banquet / venue name"
            />
          </label>
          <label className="quote-field">
            Address
            <input
              value={venueAddress}
              onChange={(e) => setVenueAddress(e.target.value)}
              placeholder="Hyderabad address"
            />
          </label>
        </div>
        <p className="leads-subtitle">
          Maps placeholder:{" "}
          {event.mapsLocationPlaceholder ?? "Save address to generate"}
        </p>
        <button
          type="button"
          className="claim-button"
          disabled={busy}
          onClick={() => void handleSaveVenue()}
        >
          Save venue
        </button>
      </section>

      <section className="quote-panel">
        <h2>Budget</h2>
        <dl className="quote-meta">
          <div>
            <dt>Budget</dt>
            <dd>₹{Number(event.budgetAmount).toLocaleString("en-IN")}</dd>
          </div>
          <div>
            <dt>Advance paid</dt>
            <dd>₹{Number(event.advancePaid).toLocaleString("en-IN")}</dd>
          </div>
          <div>
            <dt>Pending amount</dt>
            <dd>₹{pending.toLocaleString("en-IN")}</dd>
          </div>
        </dl>
      </section>

      <section className="quote-panel">
        <h2>Status</h2>
        <label className="quote-field">
          Change status
          <select
            value={nextStatus}
            onChange={(e) =>
              setNextStatus(e.target.value as EventRecordStatus)
            }
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="claim-button"
          disabled={busy || nextStatus === event.status}
          onClick={() => void handleStatusChange()}
        >
          Update status
        </button>
      </section>

      <section className="quote-panel">
        <h2>Upcoming actions</h2>
        {event.upcomingActions.length === 0 ? (
          <p>No pending operational actions for this status.</p>
        ) : (
          <ul className="quote-timeline">
            {event.upcomingActions.map((action) => (
              <li key={action}>
                <strong>Next</strong>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="quote-panel">
        <h2>Notes</h2>
        <label className="quote-field">
          Visibility
          <select
            value={noteVisibility}
            onChange={(e) =>
              setNoteVisibility(e.target.value as "internal" | "customer")
            }
          >
            <option value="internal">Internal</option>
            <option value="customer">Customer visible</option>
          </select>
        </label>
        <label className="quote-field">
          Note
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Add an operational note…"
          />
        </label>
        <button
          type="button"
          className="claim-button"
          disabled={busy || note.trim().length === 0}
          onClick={() => void handleAddNote()}
        >
          Add note
        </button>
        <ul className="quote-timeline">
          {event.notes.map((item) => (
            <li key={item.id}>
              <strong>{item.visibility}</strong>
              <span>{item.content}</span>
              <small>
                {new Date(item.updatedAt).toLocaleString("en-IN")}
              </small>
            </li>
          ))}
        </ul>
      </section>

      <section className="quote-panel">
        <h2>Timeline</h2>
        <ul className="quote-timeline">
          {event.timeline.map((entry) => (
            <li key={entry.id}>
              <strong>{entry.title}</strong>
              <span>{entry.content ?? entry.entryType}</span>
              <small>
                {new Date(entry.occurredAt).toLocaleString("en-IN")}
              </small>
            </li>
          ))}
        </ul>
      </section>

      <section className="quote-panel">
        <h2>Activity feed</h2>
        <ul className="quote-timeline">
          {event.activities.map((activity) => (
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
