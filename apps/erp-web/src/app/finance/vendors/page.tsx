"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type {
  EventRecordSummary,
  VendorSettlementSummary,
  VendorSummary,
} from "@me-event/api-contracts";
import {
  clearStoredSession,
  createVendorSettlement,
  EmployeeApiError,
  type EmployeeSession,
  listEvents,
  listVendors,
  listVendorSettlements,
  readStoredSession,
  updateVendorSettlement,
} from "@/lib/employee-api";

export default function FinanceVendorsPage() {
  const router = useRouter();
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [rows, setRows] = useState<readonly VendorSettlementSummary[]>([]);
  const [vendors, setVendors] = useState<readonly VendorSummary[]>([]);
  const [events, setEvents] = useState<readonly EventRecordSummary[]>([]);
  const [vendorId, setVendorId] = useState("");
  const [eventRecordId, setEventRecordId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: EmployeeSession) => {
      try {
        const [settlements, vendorList, eventList] = await Promise.all([
          listVendorSettlements(active),
          listVendors(active),
          listEvents(active),
        ]);
        setRows(settlements.settlements);
        setVendors(vendorList.vendors);
        setEvents(eventList.events);
        if (vendorId === "" && vendorList.vendors[0])
          setVendorId(vendorList.vendors[0].id);
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
            : "Could not load settlements.",
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
            <Link href={"/finance" as never}>Finance</Link> / Vendors
          </p>
          <h1>Vendor settlements</h1>
        </div>
      </header>
      {error !== null ? <p className="leads-error">{error}</p> : null}
      <section className="quote-panel">
        <label className="quote-field">
          Vendor
          <select
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
          >
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.businessName}
              </option>
            ))}
          </select>
        </label>
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
            void createVendorSettlement(session, {
              eventRecordId,
              vendorId,
              amount: 5000,
              status: "pending",
            }).then(() => load(session))
          }
        >
          Create ₹5000 settlement
        </button>
      </section>
      <section className="quote-panel">
        <ul className="leads-list">
          {rows.map((row) => (
            <li key={row.id}>
              {row.vendorBusinessName ?? row.vendorId} · {row.status} · ₹
              {row.amount}{" "}
              {row.status === "pending" ? (
                <button
                  type="button"
                  className="claim-button"
                  onClick={() =>
                    void updateVendorSettlement(session, row.id, {
                      status: "paid",
                    }).then(() => load(session))
                  }
                >
                  Mark paid
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
