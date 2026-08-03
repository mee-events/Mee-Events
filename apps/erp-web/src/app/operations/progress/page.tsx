"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { EventProgressSummary } from "@me-event/api-contracts";
import {
  clearStoredSession,
  EmployeeApiError,
  type EmployeeSession,
  listOperationsProgress,
  readStoredSession,
} from "@/lib/employee-api";

export default function OperationsProgressPage() {
  const router = useRouter();
  const [rows, setRows] = useState<readonly EventProgressSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (active: EmployeeSession) => {
      try {
        setRows((await listOperationsProgress(active)).progress);
      } catch (cause) {
        if (cause instanceof EmployeeApiError && cause.status === 401) {
          clearStoredSession();
          router.replace("/login");
          return;
        }
        setError(
          cause instanceof EmployeeApiError
            ? cause.message
            : "Could not load progress.",
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
            <Link href={"/operations" as never}>Operations</Link> / Progress
          </p>
          <h1>Event progress</h1>
        </div>
      </header>
      {error !== null ? <p className="leads-error">{error}</p> : null}
      <section className="quote-panel">
        {rows.length === 0 ? (
          <p>No progress records yet.</p>
        ) : (
          <ul className="leads-list">
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/operations/events?id=${row.eventRecordId}` as never}
                >
                  {row.eventNumber ?? row.eventRecordId}
                </Link>
                {row.eventName !== undefined ? ` — ${row.eventName}` : ""} ·{" "}
                {row.status} · {row.overallCompletionPercent}% ·{" "}
                {row.completedTasks}/{row.totalTasks} done · {row.pendingTasks}{" "}
                pending
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
