"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { InventoryDashboardResponse } from "@me-event/api-contracts";
import {
  clearStoredSession,
  EmployeeApiError,
  type EmployeeSession,
  getInventoryDashboard,
  readStoredSession,
} from "@/lib/employee-api";

export default function InventoryPage() {
  const router = useRouter();
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [dashboard, setDashboard] = useState<InventoryDashboardResponse | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: EmployeeSession) => {
      setError(null);
      try {
        setDashboard(await getInventoryDashboard(active));
      } catch (cause) {
        if (cause instanceof EmployeeApiError && cause.status === 401) {
          clearStoredSession();
          router.replace("/login");
          return;
        }
        setError(
          cause instanceof EmployeeApiError
            ? cause.message
            : "Could not load inventory.",
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
        <p className="leads-loading">{error ?? "Loading inventory…"}</p>
      </main>
    );
  }

  return (
    <main className="leads-shell">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href={"/" as never}>Home</Link>{" "}
            <span aria-hidden="true">/</span> Inventory
          </p>
          <h1>Inventory</h1>
          <p className="leads-subtitle">
            {dashboard.totalItems} items · {dashboard.availableItems} available
            · {dashboard.openAllocations} open allocations
          </p>
        </div>
        <div className="leads-session">
          <Link className="claim-button" href={"/warehouse" as never}>
            Warehouse
          </Link>
          <Link
            className="claim-button"
            href={"/inventory/allocations" as never}
          >
            Allocations
          </Link>
          <Link className="claim-button" href={"/inventory/movements" as never}>
            Movements
          </Link>
          <Link
            className="claim-button"
            href={"/inventory/maintenance" as never}
          >
            Maintenance
          </Link>
        </div>
      </header>

      {error !== null ? <p className="leads-error">{error}</p> : null}

      <section className="leads-grid">
        {dashboard.items.map((item) => (
          <Link
            key={item.id}
            className="lead-card"
            href={`/inventory/${item.id}` as never}
          >
            <p className="lead-card-eyebrow">{item.inventoryCode}</p>
            <h2>{item.name}</h2>
            <p>
              {item.status} · {item.condition} · qty {item.quantityOnHand}
            </p>
            <p className="lead-card-meta">
              {item.warehouseName ?? "No warehouse"}
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}
