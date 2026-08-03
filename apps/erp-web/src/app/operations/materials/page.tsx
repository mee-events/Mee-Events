"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type {
  EventRecordSummary,
  MaterialUsageSummary,
} from "@me-event/api-contracts";
import {
  clearStoredSession,
  EmployeeApiError,
  type EmployeeSession,
  listEvents,
  listOperationsMaterials,
  readStoredSession,
  recordOperationsMaterial,
} from "@/lib/employee-api";

export default function OperationsMaterialsPage() {
  const router = useRouter();
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [rows, setRows] = useState<readonly MaterialUsageSummary[]>([]);
  const [events, setEvents] = useState<readonly EventRecordSummary[]>([]);
  const [eventRecordId, setEventRecordId] = useState("");
  const [itemLabel, setItemLabel] = useState("");
  const [quantityIssued, setQuantityIssued] = useState("1");
  const [quantityUsed, setQuantityUsed] = useState("0");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: EmployeeSession) => {
      try {
        const [materials, eventList] = await Promise.all([
          listOperationsMaterials(active),
          listEvents(active),
        ]);
        setRows(materials.materials);
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
            : "Could not load materials.",
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

  async function handleRecord() {
    if (session === null || eventRecordId === "" || itemLabel.trim() === "") {
      return;
    }
    await recordOperationsMaterial(session, {
      eventRecordId,
      itemLabel: itemLabel.trim(),
      quantityIssued: Number(quantityIssued) || 0,
      quantityUsed: Number(quantityUsed) || 0,
      quantityReturned: 0,
      quantityDamaged: 0,
      quantityLost: 0,
    });
    setItemLabel("");
    await load(session);
  }

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
            <Link href={"/operations" as never}>Operations</Link> / Materials
          </p>
          <h1>Material usage</h1>
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
                {e.eventNumber} — {e.eventName}
              </option>
            ))}
          </select>
        </label>
        <label className="quote-field">
          Item label
          <input
            value={itemLabel}
            onChange={(e) => setItemLabel(e.target.value)}
            placeholder="Chair / table / fabric"
          />
        </label>
        <label className="quote-field">
          Qty issued
          <input
            value={quantityIssued}
            onChange={(e) => setQuantityIssued(e.target.value)}
            type="number"
            min="0"
          />
        </label>
        <label className="quote-field">
          Qty used
          <input
            value={quantityUsed}
            onChange={(e) => setQuantityUsed(e.target.value)}
            type="number"
            min="0"
          />
        </label>
        <button
          type="button"
          className="claim-button"
          onClick={() => void handleRecord()}
        >
          Record material
        </button>
      </section>
      <section className="quote-panel">
        {rows.length === 0 ? (
          <p>No material usage yet.</p>
        ) : (
          <ul className="leads-list">
            {rows.map((row) => (
              <li key={row.id}>
                {row.itemLabel} — {row.status} · issued {row.quantityIssued} ·
                used {row.quantityUsed} · returned {row.quantityReturned} ·{" "}
                {row.eventNumber ?? row.eventRecordId}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
