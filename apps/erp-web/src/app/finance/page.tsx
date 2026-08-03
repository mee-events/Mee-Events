"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { FinanceDashboardResponse } from "@me-event/api-contracts";
import {
  clearStoredSession,
  EmployeeApiError,
  type EmployeeSession,
  getFinanceDashboard,
  readStoredSession,
} from "@/lib/employee-api";

export default function FinancePage() {
  const router = useRouter();
  const [session, setSession] = useState<EmployeeSession | null>(null);
  const [dashboard, setDashboard] = useState<FinanceDashboardResponse | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: EmployeeSession) => {
      try {
        setDashboard(await getFinanceDashboard(active));
      } catch (cause) {
        if (cause instanceof EmployeeApiError && cause.status === 401) {
          clearStoredSession();
          router.replace("/login");
          return;
        }
        setError(
          cause instanceof EmployeeApiError
            ? cause.message
            : "Could not load finance.",
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
        <p className="leads-loading">{error ?? "Loading finance…"}</p>
      </main>
    );
  }

  return (
    <main className="leads-shell">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href={"/" as never}>Home</Link> / Finance
          </p>
          <h1>Finance dashboard</h1>
          <p className="leads-subtitle">
            {dashboard.totalEvents} events · advance ₹
            {dashboard.totalAdvanceReceived} · expenses ₹
            {dashboard.totalExpenses} · profit ₹{dashboard.totalProfit}
          </p>
        </div>
        <div className="leads-session">
          <Link className="claim-button" href={"/finance/events" as never}>
            Events
          </Link>
          <Link className="claim-button" href={"/finance/vendors" as never}>
            Vendors
          </Link>
          <Link className="claim-button" href={"/finance/workers" as never}>
            Workers
          </Link>
          <Link className="claim-button" href={"/finance/expenses" as never}>
            Expenses
          </Link>
          <Link className="claim-button" href={"/finance/invoices" as never}>
            Invoices
          </Link>
          <Link className="claim-button" href={"/finance/receipts" as never}>
            Receipts
          </Link>
          <Link className="claim-button" href={"/finance/ledger" as never}>
            Ledger
          </Link>
        </div>
      </header>
      {error !== null ? <p className="leads-error">{error}</p> : null}
      <section className="quote-panel">
        <h2>Event summaries</h2>
        {dashboard.summaries.length === 0 ? (
          <p>No event finance records yet. Open Events to ensure summaries.</p>
        ) : (
          <ul className="leads-list">
            {dashboard.summaries.map((row) => (
              <li key={row.id}>
                <Link href={`/finance/events?id=${row.eventRecordId}` as never}>
                  {row.eventNumber ?? row.eventRecordId}
                </Link>{" "}
                — {row.settlementStatus} · profit ₹{row.profitAmount}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
