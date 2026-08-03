"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { InventoryItemDetailResponse } from "@me-event/api-contracts";
import {
  addInventoryNote,
  clearStoredSession,
  EmployeeApiError,
  type EmployeeSession,
  getInventoryItem,
  readStoredSession,
} from "@/lib/employee-api";

export default function InventoryDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const itemId = params.id;
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [item, setItem] = useState<InventoryItemDetailResponse | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: EmployeeSession) => {
      setError(null);
      try {
        setItem(await getInventoryItem(active, itemId));
      } catch (cause) {
        if (cause instanceof EmployeeApiError && cause.status === 401) {
          clearStoredSession();
          router.replace("/login");
          return;
        }
        setError(
          cause instanceof EmployeeApiError
            ? cause.message
            : "Could not load item.",
        );
      }
    },
    [router, itemId],
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

  async function handleNote() {
    if (session === null || note.trim().length === 0) return;
    try {
      await addInventoryNote(session, itemId, {
        content: note.trim(),
        noteType: "internal",
      });
      setNote("");
      await load(session);
    } catch (cause) {
      setError(
        cause instanceof EmployeeApiError
          ? cause.message
          : "Could not add note.",
      );
    }
  }

  if (session === null || item === null) {
    return (
      <main className="leads-shell">
        <p className="leads-loading">{error ?? "Loading item…"}</p>
      </main>
    );
  }

  return (
    <main className="leads-shell">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href={"/inventory" as never}>Inventory</Link>{" "}
            <span aria-hidden="true">/</span> {item.inventoryCode}
          </p>
          <h1>{item.name}</h1>
          <p className="leads-subtitle">
            {item.status} · {item.condition} · {item.ownershipType}
          </p>
        </div>
      </header>

      {error !== null ? <p className="leads-error">{error}</p> : null}

      <section className="quote-panel">
        <h2>Details</h2>
        <p>SKU: {item.sku ?? "—"}</p>
        <p>Warehouse: {item.warehouseName ?? "—"}</p>
        <p>Location: {item.locationName ?? "—"}</p>
        <p>Qty on hand: {item.quantityOnHand}</p>
        <p>Purchase cost: {item.purchaseCost ?? "—"}</p>
        <p>Rental cost: {item.rentalCost ?? "—"}</p>
        <p>Current value: {item.currentValue ?? "—"}</p>
        <p>{item.description ?? "No description."}</p>
      </section>

      <section className="quote-panel">
        <h2>Add note</h2>
        <textarea
          className="quote-field"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          type="button"
          className="claim-button"
          onClick={() => void handleNote()}
        >
          Save note
        </button>
      </section>
    </main>
  );
}
