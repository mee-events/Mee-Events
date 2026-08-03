"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { InventoryMovementSummary } from "@me-event/api-contracts";
import {
  clearStoredSession,
  EmployeeApiError,
  type EmployeeSession,
  listInventoryMovements,
  readStoredSession,
} from "@/lib/employee-api";

export default function InventoryMovementsPage() {
  const router = useRouter();
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [movements, setMovements] = useState<
    readonly InventoryMovementSummary[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: EmployeeSession) => {
      setError(null);
      try {
        const response = await listInventoryMovements(active);
        setMovements(response.movements);
      } catch (cause) {
        if (cause instanceof EmployeeApiError && cause.status === 401) {
          clearStoredSession();
          router.replace("/login");
          return;
        }
        setError(
          cause instanceof EmployeeApiError
            ? cause.message
            : "Could not load movements.",
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
        <p className="leads-loading">{error ?? "Loading movements…"}</p>
      </main>
    );
  }

  return (
    <main className="leads-shell">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href={"/inventory" as never}>Inventory</Link>{" "}
            <span aria-hidden="true">/</span> Movements
          </p>
          <h1>Movement history</h1>
          <p className="leads-subtitle">{movements.length} records</p>
        </div>
      </header>

      {error !== null ? <p className="leads-error">{error}</p> : null}

      <section className="quote-panel">
        {movements.length === 0 ? (
          <p>No movements yet.</p>
        ) : (
          <ul className="leads-list">
            {movements.map((row) => (
              <li key={row.id}>
                <strong>{row.itemName ?? row.itemId}</strong> —{" "}
                {row.movementType}
                {row.fromPlace !== undefined ? ` · ${row.fromPlace}` : ""}
                {row.toPlace !== undefined ? ` → ${row.toPlace}` : ""} ·{" "}
                {new Date(row.occurredAt).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
