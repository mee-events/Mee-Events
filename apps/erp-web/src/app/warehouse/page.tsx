"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { WarehouseDashboardResponse } from "@me-event/api-contracts";
import {
  clearStoredSession,
  EmployeeApiError,
  type EmployeeSession,
  getWarehouseDashboard,
  readStoredSession,
} from "@/lib/employee-api";

export default function WarehousePage() {
  const router = useRouter();
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [dashboard, setDashboard] = useState<WarehouseDashboardResponse | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: EmployeeSession) => {
      setError(null);
      try {
        setDashboard(await getWarehouseDashboard(active));
      } catch (cause) {
        if (cause instanceof EmployeeApiError && cause.status === 401) {
          clearStoredSession();
          router.replace("/login");
          return;
        }
        setError(
          cause instanceof EmployeeApiError
            ? cause.message
            : "Could not load warehouse dashboard.",
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

  if (session === null || dashboard === null) {
    return (
      <main className="leads-shell">
        <p className="leads-loading">{error ?? "Loading warehouse…"}</p>
      </main>
    );
  }

  return (
    <main className="leads-shell">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href={"/" as never}>Home</Link>{" "}
            <span aria-hidden="true">/</span> Warehouse
          </p>
          <h1>Warehouse dashboard</h1>
          <p className="leads-subtitle">
            {dashboard.activeWarehouses} active · {dashboard.totalItems} items ·{" "}
            {dashboard.availableItems} available
          </p>
        </div>
        <div className="leads-session">
          <Link className="claim-button" href={"/inventory" as never}>
            Inventory
          </Link>
        </div>
      </header>

      {error !== null ? <p className="leads-error">{error}</p> : null}

      <section className="leads-grid">
        {dashboard.warehouses.map((warehouse) => (
          <article key={warehouse.id} className="lead-card">
            <p className="lead-card-eyebrow">{warehouse.warehouseCode}</p>
            <h2>{warehouse.name}</h2>
            <p>
              {warehouse.warehouseType} · {warehouse.city} · {warehouse.status}
            </p>
          </article>
        ))}
      </section>

      <section className="quote-panel" style={{ marginTop: "1.5rem" }}>
        <h2>Stock highlights</h2>
        {dashboard.stockHighlights.length === 0 ? (
          <p>No inventory yet.</p>
        ) : (
          <ul className="leads-list">
            {dashboard.stockHighlights.map((item) => (
              <li key={item.id}>
                <Link href={`/inventory/${item.id}` as never}>{item.name}</Link>{" "}
                — {item.status} · qty {item.quantityOnHand}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
