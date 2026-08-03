"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type {
  EventRecordSummary,
  InventoryAllocationSummary,
  InventoryItemSummary,
} from "@me-event/api-contracts";
import {
  allocateInventory,
  clearStoredSession,
  EmployeeApiError,
  type EmployeeSession,
  listEvents,
  listInventory,
  listInventoryAllocations,
  readStoredSession,
  returnInventoryAllocation,
  updateInventoryAllocation,
} from "@/lib/employee-api";

export default function InventoryAllocationsPage() {
  const router = useRouter();
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [allocations, setAllocations] = useState<
    readonly InventoryAllocationSummary[]
  >([]);
  const [items, setItems] = useState<readonly InventoryItemSummary[]>([]);
  const [events, setEvents] = useState<readonly EventRecordSummary[]>([]);
  const [itemId, setItemId] = useState("");
  const [eventRecordId, setEventRecordId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (active: EmployeeSession) => {
      setError(null);
      try {
        const [allocList, itemList, eventList] = await Promise.all([
          listInventoryAllocations(active),
          listInventory(active),
          listEvents(active),
        ]);
        setAllocations(allocList.allocations);
        setItems(itemList.items);
        setEvents(eventList.events);
        if (itemId === "" && itemList.items[0] !== undefined) {
          setItemId(itemList.items[0].id);
        }
        if (eventRecordId === "" && eventList.events[0] !== undefined) {
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
            : "Could not load allocations.",
        );
      }
    },
    [router, itemId, eventRecordId],
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

  async function handleReserve() {
    if (session === null) return;
    setBusy(true);
    try {
      await allocateInventory(session, {
        itemId,
        eventRecordId,
        quantity: 1,
        status: "reserved",
      });
      await load(session);
    } catch (cause) {
      setError(
        cause instanceof EmployeeApiError
          ? cause.message
          : "Could not reserve inventory.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function advance(
    allocationId: string,
    status: "allocated" | "dispatched" | "on_site",
  ) {
    if (session === null) return;
    try {
      await updateInventoryAllocation(session, allocationId, { status });
      await load(session);
    } catch (cause) {
      setError(
        cause instanceof EmployeeApiError
          ? cause.message
          : "Could not update allocation.",
      );
    }
  }

  async function handleReturn(allocationId: string) {
    if (session === null) return;
    try {
      await returnInventoryAllocation(session, allocationId, {
        returnedQuantity: 1,
        conditionOnReturn: "good",
      });
      await load(session);
    } catch (cause) {
      setError(
        cause instanceof EmployeeApiError
          ? cause.message
          : "Could not return inventory.",
      );
    }
  }

  if (session === null) {
    return (
      <main className="leads-shell">
        <p className="leads-loading">{error ?? "Loading allocations…"}</p>
      </main>
    );
  }

  return (
    <main className="leads-shell">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href={"/inventory" as never}>Inventory</Link>{" "}
            <span aria-hidden="true">/</span> Allocations
          </p>
          <h1>Allocation board</h1>
        </div>
      </header>

      {error !== null ? <p className="leads-error">{error}</p> : null}

      <section className="quote-panel">
        <h2>Reserve inventory for event</h2>
        <label className="quote-field">
          Item
          <select value={itemId} onChange={(e) => setItemId(e.target.value)}>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
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
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.eventNumber} — {event.eventName}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="claim-button"
          disabled={busy || itemId === "" || eventRecordId === ""}
          onClick={() => void handleReserve()}
        >
          {busy ? "Reserving…" : "Reserve"}
        </button>
      </section>

      <section className="quote-panel">
        <h2>Allocations</h2>
        {allocations.length === 0 ? (
          <p>No allocations yet.</p>
        ) : (
          <ul className="leads-list">
            {allocations.map((row) => (
              <li key={row.id}>
                <strong>{row.itemName}</strong> →{" "}
                {row.eventNumber ?? row.eventRecordId} · {row.status}{" "}
                {row.status === "reserved" ? (
                  <button
                    type="button"
                    className="claim-button"
                    onClick={() => void advance(row.id, "allocated")}
                  >
                    Allocate
                  </button>
                ) : null}
                {row.status === "allocated" ? (
                  <button
                    type="button"
                    className="claim-button"
                    onClick={() => void advance(row.id, "dispatched")}
                  >
                    Dispatch
                  </button>
                ) : null}
                {row.status === "dispatched" ? (
                  <button
                    type="button"
                    className="claim-button"
                    onClick={() => void advance(row.id, "on_site")}
                  >
                    On site
                  </button>
                ) : null}
                {["allocated", "dispatched", "on_site"].includes(row.status) ? (
                  <button
                    type="button"
                    className="claim-button"
                    onClick={() => void handleReturn(row.id)}
                  >
                    Return
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
