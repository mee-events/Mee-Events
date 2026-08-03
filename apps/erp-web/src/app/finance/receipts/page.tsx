"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ReceiptSummary } from "@me-event/api-contracts";
import {
  clearStoredSession,
  EmployeeApiError,
  type EmployeeSession,
  listFinanceReceipts,
  readStoredSession,
} from "@/lib/employee-api";

export default function FinanceReceiptsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<readonly ReceiptSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: EmployeeSession) => {
      try {
        setRows((await listFinanceReceipts(active)).receipts);
      } catch (cause) {
        if (cause instanceof EmployeeApiError && cause.status === 401) {
          clearStoredSession();
          router.replace("/login");
          return;
        }
        setError(
          cause instanceof EmployeeApiError
            ? cause.message
            : "Could not load receipts.",
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
    void load(stored);
  }, [router, load]);

  return (
    <main className="leads-shell">
      <header className="leads-topbar">
        <div>
          <p className="breadcrumb">
            <Link href={"/finance" as never}>Finance</Link> / Receipts
          </p>
          <h1>Receipts</h1>
        </div>
      </header>
      {error !== null ? <p className="leads-error">{error}</p> : null}
      <section className="quote-panel">
        {rows.length === 0 ? (
          <p>No receipts yet.</p>
        ) : (
          <ul className="leads-list">
            {rows.map((row) => (
              <li key={row.id}>
                {row.receiptNumber} · ₹{row.amount} · {row.status}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
