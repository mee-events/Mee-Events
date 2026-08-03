"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { LedgerEntrySummary } from "@me-event/api-contracts";
import {
  clearStoredSession,
  EmployeeApiError,
  type EmployeeSession,
  listFinanceLedger,
  readStoredSession,
} from "@/lib/employee-api";

export default function FinanceLedgerPage() {
  const router = useRouter();
  const [rows, setRows] = useState<readonly LedgerEntrySummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: EmployeeSession) => {
      try {
        setRows((await listFinanceLedger(active)).entries);
      } catch (cause) {
        if (cause instanceof EmployeeApiError && cause.status === 401) {
          clearStoredSession();
          router.replace("/login");
          return;
        }
        setError(
          cause instanceof EmployeeApiError
            ? cause.message
            : "Could not load ledger.",
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
            <Link href={"/finance" as never}>Finance</Link> / Ledger
          </p>
          <h1>Ledger</h1>
        </div>
      </header>
      {error !== null ? <p className="leads-error">{error}</p> : null}
      <section className="quote-panel">
        {rows.length === 0 ? (
          <p>No ledger entries yet.</p>
        ) : (
          <ul className="leads-list">
            {rows.map((row) => (
              <li key={row.id}>
                {row.entrySide} ₹{row.amount} — {row.description}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
