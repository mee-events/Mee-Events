"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type {
  InventoryItemSummary,
  InventoryMaintenanceSummary,
} from "@me-event/api-contracts";
import {
  clearStoredSession,
  EmployeeApiError,
  type EmployeeSession,
  listInventory,
  listInventoryMaintenance,
  readStoredSession,
  startInventoryMaintenance,
} from "@/lib/employee-api";

export default function InventoryMaintenancePage() {
  const router = useRouter();
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [rows, setRows] = useState<readonly InventoryMaintenanceSummary[]>([]);
  const [items, setItems] = useState<readonly InventoryItemSummary[]>([]);
  const [itemId, setItemId] = useState("");
  const [summary, setSummary] = useState("Routine maintenance");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: EmployeeSession) => {
      setError(null);
      try {
        const [maintenance, inventory] = await Promise.all([
          listInventoryMaintenance(active),
          listInventory(active),
        ]);
        setRows(maintenance.maintenance);
        setItems(inventory.items);
        if (itemId === "" && inventory.items[0] !== undefined) {
          setItemId(inventory.items[0].id);
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
            : "Could not load maintenance.",
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

  async function handleStart() {
    if (session === null || itemId === "") return;
    try {
      await startInventoryMaintenance(session, {
        itemId,
        summary: summary.trim(),
      });
      await load(session);
    } catch (cause) {
      setError(
        cause instanceof EmployeeApiError
          ? cause.message
          : "Could not start maintenance.",
      );
    }
  }

  if (session === null) {
    return (
      <main className="leads-shell">
        <p className="leads-loading">{error ?? "Loading maintenance…"}</p>
      </main>
    );
  }

  return (
    <main className="leads-shell">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href={"/inventory" as never}>Inventory</Link>{" "}
            <span aria-hidden="true">/</span> Maintenance
          </p>
          <h1>Maintenance</h1>
        </div>
      </header>

      {error !== null ? <p className="leads-error">{error}</p> : null}

      <section className="quote-panel">
        <h2>Start maintenance</h2>
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
          Summary
          <input value={summary} onChange={(e) => setSummary(e.target.value)} />
        </label>
        <button
          type="button"
          className="claim-button"
          onClick={() => void handleStart()}
        >
          Start
        </button>
      </section>

      <section className="quote-panel">
        <h2>Records</h2>
        {rows.length === 0 ? (
          <p>No maintenance records.</p>
        ) : (
          <ul className="leads-list">
            {rows.map((row) => (
              <li key={row.id}>
                <strong>{row.itemName ?? row.itemId}</strong> — {row.status} ·{" "}
                {row.summary}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
