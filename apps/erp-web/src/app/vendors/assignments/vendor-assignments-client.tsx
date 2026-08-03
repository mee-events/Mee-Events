"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type {
  EventRecordSummary,
  VendorAssignmentSummary,
  VendorSummary,
} from "@me-event/api-contracts";
import {
  assignVendor,
  clearStoredSession,
  EmployeeApiError,
  type EmployeeSession,
  listEvents,
  listVendorAssignments,
  listVendors,
  readStoredSession,
} from "@/lib/employee-api";

export function VendorAssignmentsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetVendorId = searchParams.get("vendorId") ?? "";
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [assignments, setAssignments] = useState<
    readonly VendorAssignmentSummary[]
  >([]);
  const [vendors, setVendors] = useState<readonly VendorSummary[]>([]);
  const [events, setEvents] = useState<readonly EventRecordSummary[]>([]);
  const [vendorId, setVendorId] = useState(presetVendorId);
  const [eventRecordId, setEventRecordId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (active: EmployeeSession) => {
      setError(null);
      try {
        const [assignmentList, vendorList, eventList] = await Promise.all([
          listVendorAssignments(active),
          listVendors(active),
          listEvents(active),
        ]);
        setAssignments(assignmentList.assignments);
        setVendors(vendorList.vendors);
        setEvents(eventList.events);
        if (vendorId.length === 0 && vendorList.vendors[0] !== undefined) {
          setVendorId(vendorList.vendors[0].id);
        }
        if (eventList.events[0] !== undefined && eventRecordId.length === 0) {
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
            : "Could not load assignments.",
        );
      }
    },
    [router, vendorId, eventRecordId],
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

  async function handleAssign() {
    if (
      session === null ||
      vendorId.length === 0 ||
      eventRecordId.length === 0
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await assignVendor(session, {
        vendorId,
        eventRecordId,
        status: "assigned",
      });
      router.push(`/vendors/assignments/${created.id}` as never);
    } catch (cause) {
      setError(
        cause instanceof EmployeeApiError
          ? cause.message
          : "Could not assign vendor.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (session === null) {
    return (
      <main className="leads-shell">
        <p className="leads-loading">{error ?? "Loading assignments…"}</p>
      </main>
    );
  }

  return (
    <main className="leads-shell">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href={"/vendors" as never}>Vendors</Link>{" "}
            <span aria-hidden="true">/</span> Assignments
          </p>
          <h1>Vendor assignments</h1>
        </div>
      </header>

      {error !== null ? <p className="leads-error">{error}</p> : null}

      <section className="quote-panel">
        <h2>Assign vendor</h2>
        <label className="quote-field">
          Vendor
          <select
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
          >
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.businessName}
              </option>
            ))}
          </select>
        </label>
        <label className="quote-field">
          Event record
          <select
            value={eventRecordId}
            onChange={(e) => setEventRecordId(e.target.value)}
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.eventNumber} · {event.eventName}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="claim-button"
          disabled={busy || vendorId.length === 0 || eventRecordId.length === 0}
          onClick={() => void handleAssign()}
        >
          Assign vendor
        </button>
      </section>

      <section className="quote-panel">
        <h2>All assignments</h2>
        <ul className="quote-timeline">
          {assignments.map((item) => (
            <li key={item.id}>
              <strong>
                <Link href={`/vendors/assignments/${item.id}` as never}>
                  {item.vendorBusinessName ?? item.vendorId}
                </Link>
              </strong>
              <span>
                {item.eventNumber ?? item.eventRecordId} ·{" "}
                {item.status.replaceAll("_", " ")}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
